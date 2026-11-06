import { safeHttps } from "@/shared/lib/workspace";
export const DICTIONARY_KINDS = [
  "character",
  "word",
  "idiom",
  "english",
] as const;
export type DictionaryKind = (typeof DICTIONARY_KINDS)[number];
export type DictionarySource = "online" | "local";
export interface DictionaryEntry {
  term: string;
  pronunciation: string;
  definition: string;
  sourceName?: string;
  radical?: string;
  strokes?: string;
  structure?: string;
  strokeAnimation?: string;
  characterImage?: string;
  synonyms?: string[];
  antonyms?: string[];
  extraInfo?: string;
  encyclopedia?: string;
  example?: string;
  origin?: string;
  english?: string;
  forms?: string;
  audio?: string;
  related?: string[];
  source?: string;
  license?: string;
  licenseUrl?: string;
}
export interface DictionaryResult {
  query: string;
  entries: DictionaryEntry[];
  exact: number;
  source: DictionarySource;
  notice: string;
}
export const isDictionaryKind = (value: unknown): value is DictionaryKind =>
  DICTIONARY_KINDS.includes(value as DictionaryKind);
export const supportsOnline = (kind: DictionaryKind) =>
  kind === "character" || kind === "english";
export function dictionaryQuery(kind: DictionaryKind, raw: string) {
  if (!isDictionaryKind(kind)) throw new Error("请选择有效词典。");
  const query = raw.trim().normalize("NFC");
  if (kind === "english") {
    if (!/^[a-zA-Z][a-zA-Z' -]{0,79}$/.test(query))
      throw new Error("请输入英文单词或短语，最多 80 个字符。");
    return query.toLowerCase();
  }
  if (
    !/^[\p{Script=Han}]+$/u.test(query) ||
    [...query].length > (kind === "character" ? 1 : 20)
  )
    throw new Error(
      kind === "character"
        ? "请输入一个汉字。"
        : "请输入 1～20 个汉字，可按词语开头查找。",
    );
  return query;
}
const checkCancelled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException("已取消", "AbortError");
};
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
const optionalText = (value: unknown, limit: number) =>
  typeof value === "string"
    ? value.trim().slice(0, limit) || undefined
    : undefined;
function dictionaryUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 4096) return undefined;
  // 旧响应可能带 HTTP 图片或百科地址，统一使用 HTTPS，避免混合内容。
  return (
    safeHttps(value.trim().replace(/^http:\/\//i, "https://")) || undefined
  );
}
const wordList = (value: unknown) =>
  [
    ...new Set(
      strings(value)
        .map((word) => word.trim().slice(0, 80))
        .filter(Boolean),
    ),
  ].slice(0, 30);
async function requestJson(
  url: string,
  label: string,
  timeout: number,
  signal?: AbortSignal,
  emptyOn404 = false,
): Promise<unknown> {
  checkCancelled(signal);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = window.setTimeout(abort, timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: "omit",
    });
    checkCancelled(controller.signal);
    if (emptyOn404 && response.status === 404) return [];
    if (!response.ok)
      throw new Error(`${label}请求失败（${response.status}）。`);
    const payload: unknown = await response.json();
    checkCancelled(controller.signal);
    return payload;
  } catch (cause) {
    checkCancelled(signal);
    const detail = controller.signal.aborted
      ? `${label}查询超时。`
      : cause instanceof TypeError
        ? `${label}暂不可达，请检查网络。`
        : cause instanceof SyntaxError
          ? `${label}返回格式不正确。`
          : "";
    if (detail) throw Object.assign(new Error(detail), { cause });
    throw cause;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export function matchEntries(entries: DictionaryEntry[], query: string) {
  const exact = entries.filter((entry) => entry.term === query);
  return {
    entries: [
      ...exact,
      ...entries.filter(
        (entry) => entry.term !== query && entry.term.startsWith(query),
      ),
    ],
    exact: exact.length,
  };
}
const cache = new Map<string, DictionaryEntry[]>();
function validEntry(raw: unknown): raw is DictionaryEntry {
  const entry = object(raw);
  return (
    typeof entry.term === "string" &&
    entry.term.length > 0 &&
    entry.term.length <= 200 &&
    typeof entry.definition === "string" &&
    typeof entry.pronunciation === "string" &&
    [
      "radical",
      "strokes",
      "structure",
      "strokeAnimation",
      "characterImage",
      "extraInfo",
      "encyclopedia",
      "example",
      "origin",
      "english",
      "forms",
      "sourceName",
    ].every(
      (key) => entry[key] === undefined || typeof entry[key] === "string",
    ) &&
    ["synonyms", "antonyms"].every((key) => {
      const words = entry[key];
      return (
        words === undefined ||
        (Array.isArray(words) &&
          words.every((word) => typeof word === "string"))
      );
    })
  );
}
export async function lookupLocal(
  kind: DictionaryKind,
  raw: string,
  signal?: AbortSignal,
) {
  const query = dictionaryQuery(kind, raw);
  checkCancelled(signal);
  const key = `${kind}/${query.codePointAt(0)! % 128}`;
  let entries = cache.get(key);
  if (entries) {
    cache.delete(key);
    cache.set(key, entries);
  } else {
    const payload = object(
      await requestJson(
        `${import.meta.env.BASE_URL}dictionaries/v1/${key}.json`,
        "本地词库",
        12000,
        signal,
      ),
    );
    if (
      payload.version !== 1 ||
      payload.kind !== kind ||
      !Array.isArray(payload.entries) ||
      !payload.entries.every(validEntry)
    )
      throw new Error("本地词库格式不正确，请刷新重试。");
    checkCancelled(signal);
    entries = payload.entries as DictionaryEntry[];
    // 手机端仅保留最近 8 个分片，避免不断查询后把整库留在内存。
    if (cache.size >= 8) cache.delete(cache.keys().next().value!);
    cache.set(key, entries);
  }
  checkCancelled(signal);
  return { query, ...matchEntries(entries, query) };
}
export function normalizeCharacterEntries(
  payload: unknown,
  query: string,
): DictionaryEntry[] {
  const response = object(payload);
  if (response.code !== 200) throw new Error("在线汉字接口暂时无法完成查询。");
  const data = object(response.data),
    definitions = data["释义"],
    pinyin = data["拼音"];
  if (
    !Array.isArray(pinyin) ||
    !pinyin.length ||
    pinyin.length > 10 ||
    !pinyin.every((item) => typeof item === "string" && item.trim()) ||
    !Array.isArray(definitions) ||
    definitions.length !== pinyin.length ||
    !definitions.every(
      (item) =>
        Array.isArray(item) &&
        item.some((line) => typeof line === "string" && line.trim()),
    )
  )
    throw new Error("在线汉字接口返回的词条不完整。");
  const audio = Array.isArray(data["读音"]) ? data["读音"] : [];
  const related = Array.isArray(data["组词"]) ? data["组词"] : [];
  // 同一索引对应同一读音，不能把多音字的释义、发音和组词混在一起。
  return pinyin.map((pronunciation: string, index) => ({
    term: query,
    pronunciation: pronunciation.slice(0, 150),
    definition: strings(definitions[index]).join("\n").slice(0, 20000),
    radical: strings(data["部首"]).join("、").slice(0, 50),
    strokes:
      Number.isInteger(data["笔画"]) && Number(data["笔画"]) > 0
        ? String(data["笔画"])
        : undefined,
    structure: optionalText(data["结构"], 80),
    strokeAnimation: dictionaryUrl(data.GIF),
    characterImage: dictionaryUrl(data.PNG),
    synonyms: wordList(data["近义词"]),
    antonyms: wordList(data["反义词"]),
    extraInfo: optionalText(data["更多"], 10000),
    encyclopedia: dictionaryUrl(data["百科"]),
    related: strings(related[index])
      .slice(0, 30)
      .map((word) => word.slice(0, 80)),
    audio: safeHttps(audio[index]) || undefined,
    sourceName: "慕名 API · 在线汉字字典",
  }));
}
export function normalizeOnlineEntries(payload: unknown): DictionaryEntry[] {
  if (!Array.isArray(payload)) throw new Error("在线字典返回格式不正确。");
  const entries = payload.slice(0, 8).flatMap((raw): DictionaryEntry[] => {
    const value = object(raw);
    if (typeof value.word !== "string" || !Array.isArray(value.meanings))
      return [];
    const definitions = value.meanings.slice(0, 10).flatMap((rawMeaning) => {
      const meaning = object(rawMeaning);
      return Array.isArray(meaning.definitions)
        ? meaning.definitions.slice(0, 10).flatMap((rawDefinition) => {
            const d = object(rawDefinition);
            return typeof d.definition === "string" && d.definition.trim()
              ? [
                  `${typeof meaning.partOfSpeech === "string" ? `${meaning.partOfSpeech}. ` : ""}${d.definition}${typeof d.example === "string" ? `\n例句：${d.example}` : ""}`,
                ]
              : [];
          })
        : [];
    });
    if (!definitions.length) return [];
    const phonetics = Array.isArray(value.phonetics)
      ? value.phonetics.map(object)
      : [];
    const phonetic =
      typeof value.phonetic === "string" && value.phonetic.trim()
        ? value.phonetic
        : phonetics.map((p) => p.text).find((text) => typeof text === "string");
    const audio = phonetics
      .map((p) =>
        typeof p.audio === "string"
          ? safeHttps(p.audio.startsWith("//") ? `https:${p.audio}` : p.audio)
          : "",
      )
      .find(Boolean);
    const license = object(value.license);
    return [
      {
        term: value.word.slice(0, 80),
        pronunciation:
          typeof phonetic === "string" ? phonetic.slice(0, 150) : "",
        definition: definitions.join("\n\n").slice(0, 20000),
        audio,
        source: Array.isArray(value.sourceUrls)
          ? value.sourceUrls.map(safeHttps).find(Boolean)
          : undefined,
        license:
          typeof license.name === "string"
            ? license.name.slice(0, 100)
            : undefined,
        licenseUrl: safeHttps(license.url) || undefined,
        sourceName: "Free Dictionary API · 在线英文释义",
      },
    ];
  });
  if (payload.length && !entries.length)
    throw new Error("在线字典返回的词条不完整。");
  return entries;
}
export async function lookupEnglishOnline(raw: string, signal?: AbortSignal) {
  const query = dictionaryQuery("english", raw);
  const entries = normalizeOnlineEntries(
    await requestJson(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`,
      "在线字典",
      8000,
      signal,
      true,
    ),
  );
  if (entries.some((entry) => entry.term.toLowerCase() !== query))
    throw new Error("在线字典返回了不匹配的词条。");
  return entries.map((entry) => ({ ...entry, term: query }));
}
export async function lookupCharacterOnline(raw: string, signal?: AbortSignal) {
  const query = dictionaryQuery("character", raw);
  return normalizeCharacterEntries(
    await requestJson(
      `https://xiaoapi.cn/v1/hanzi.php?msg=${encodeURIComponent(query)}`,
      "在线汉字字典",
      8000,
      signal,
    ),
    query,
  );
}
export async function lookupDictionary(
  kind: DictionaryKind,
  raw: string,
  signal?: AbortSignal,
  onStage?: (stage: DictionarySource) => void,
  options: { onlineFirst?: boolean } = {},
): Promise<DictionaryResult> {
  const query = dictionaryQuery(kind, raw);
  checkCancelled(signal);
  // 在线英语接口只有英文解释，英汉查询默认使用已有中文词库。
  const onlineFirst =
    supportsOnline(kind) && (options.onlineFirst ?? kind === "character");
  let notice =
    kind === "english"
      ? "当前使用英汉词库，显示中文释义，支持完整单词、短语和开头匹配。"
      : "当前使用本地词库，支持完整词条和开头匹配。";
  if (onlineFirst) {
    onStage?.("online");
    try {
      const entries = await (kind === "character"
        ? lookupCharacterOnline(query, signal)
        : lookupEnglishOnline(query, signal));
      checkCancelled(signal);
      if (entries.length)
        return {
          query,
          ...matchEntries(entries, query),
          source: "online",
          notice:
            kind === "english"
              ? "当前查看在线英文释义与发音，可切回英汉释义查看中文解释。"
              : "",
        };
      notice = "在线词典未收录，已改用本地词库查询。";
    } catch (cause) {
      // 取消不是网络故障：切换词典和离开页面后不再触发本地请求。
      checkCancelled(signal);
      notice = `${cause instanceof Error ? cause.message : "在线查询失败。"}已自动切换到本地词库。`;
    }
  }
  checkCancelled(signal);
  onStage?.("local");
  try {
    return {
      ...(await lookupLocal(kind, query, signal)),
      source: "local",
      notice,
    };
  } catch (cause) {
    checkCancelled(signal);
    const detail =
      cause instanceof Error ? cause.message : "本地词库加载失败。";
    throw Object.assign(
      new Error(
        onlineFirst
          ? `在线查询未取得结果，本地查询也未完成：${detail}`
          : detail,
      ),
      { cause },
    );
  }
}
