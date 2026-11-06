import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const kinds = ["character", "word", "idiom", "english"];
const hashes = [
  "8ae3453eacc5b0f3fdfba47eac8bb686cd73914d278e8b851ae6ef81082f80e7",
  "739e086d61dc9b95cd1df92095720e6391f952a41c476d3281ef95ebed869a09",
  "1d4b4f454ce1c416d6a1ab2369d6e66c0ff99e04390172eef70790499e21ce19",
  "d1ecbdf9ee2b920afb6f430ca6b6bb9f559588cf0dff86e04bd255f9390843cc",
];
const [wordPath, ciPath, idiomPath, englishPath, output] =
  process.argv.slice(2);
if (![wordPath, ciPath, idiomPath, englishPath].every(Boolean))
  throw new Error(
    "用法：node scripts/prepare-dictionaries.mjs word.json ci.json idiom.json ecdict.csv [输出目录]",
  );
const root = fileURLToPath(new URL("../", import.meta.url));
const target = output
  ? resolve(output)
  : resolve(root, "public/dictionaries/v1");
for (const [index, path] of [
  wordPath,
  ciPath,
  idiomPath,
  englishPath,
].entries()) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest("hex") !== hashes[index])
    throw new Error(
      `${kinds[index]} 源文件 SHA-256 不符，请使用 README 中的固定版本。`,
    );
}
const clean = (value) =>
  typeof value === "string" ? value.replace(/\\+n/g, "\n").trim() : "";
const datasets = Object.fromEntries(kinds.map((kind) => [kind, []]));
for (const value of JSON.parse(await readFile(wordPath, "utf8"))) {
  const term = clean(value.word),
    definition = clean(value.explanation);
  if (term && definition)
    datasets.character.push({
      term,
      pronunciation: clean(value.pinyin),
      definition,
      radical: clean(value.radicals),
      strokes: clean(value.strokes),
    });
}
const supplements = JSON.parse(
  await readFile(
    resolve(root, "src/modules/study/data/primary-words.json"),
    "utf8",
  ),
);
const replaced = new Set(supplements.map((entry) => entry.term));
for (const value of JSON.parse(await readFile(ciPath, "utf8"))) {
  const term = clean(value.ci),
    definition = clean(value.explanation);
  if (term && definition && !replaced.has(term))
    datasets.word.push({ term, pronunciation: "", definition });
}
datasets.word.push(...supplements);
for (const value of JSON.parse(await readFile(idiomPath, "utf8"))) {
  const term = clean(value.word),
    definition = clean(value.explanation);
  if (term && definition)
    datasets.idiom.push({
      term,
      pronunciation: clean(value.pinyin),
      definition,
      origin: clean(value.derivation),
      example: clean(value.example),
    });
}
function parseCsv(record) {
  const row = [];
  let field = "",
    quoted = false;
  for (let index = 0; index < record.length; index++) {
    const char = record[index];
    if (char === '"') {
      if (quoted && record[index + 1] === '"') {
        field += '"';
        index++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else field += char;
  }
  row.push(field);
  return row;
}
// CSV 逐行读取并保留引号内换行，避免同时载入完整 ECDICT 与所有原始行。
const lines = createInterface({
  input: createReadStream(englishPath),
  crlfDelay: Infinity,
});
let record = "",
  quotes = 0,
  header;
for await (const line of lines) {
  record += (record ? "\n" : "") + line;
  quotes += (line.match(/"/g) || []).length;
  if (quotes % 2) continue;
  const values = parseCsv(record);
  record = "";
  quotes = 0;
  if (!header) {
    header = values;
    continue;
  }
  const value = Object.fromEntries(
    header.map((key, index) => [key, values[index] || ""]),
  );
  const term = clean(value.word).toLowerCase(),
    rank = (number) => Number(number) > 0 && Number(number) <= 30000;
  const core =
    Number(value.oxford) > 0 ||
    Number(value.collins) > 0 ||
    value.tag
      .split(/\s+/)
      .some((tag) => ["zk", "gk", "cet4", "cet6"].includes(tag)) ||
    rank(value.bnc) ||
    rank(value.frq);
  const translation = clean(value.translation),
    definition = translation || clean(value.definition);
  if (core && /^[a-z][a-z' -]{0,79}$/.test(term) && definition)
    datasets.english.push({
      term,
      pronunciation: clean(value.phonetic),
      definition,
      english: translation ? clean(value.definition) : "",
      forms: clean(value.exchange),
    });
}
if (record) throw new Error("CSV 引号不匹配，未写入输出。");
const manifest = {
  version: 1,
  buckets: 128,
  sources: {
    chinese: {
      repository: "pwxcoo/chinese-xinhua",
      revision: "fe6d6c2e8baa82187f4c96bbe042e43f96c05666",
    },
    english: {
      repository: "skywind3000/ECDICT",
      revision: "39cfb9672c0906b63569e0453c2e6abfb9ab182a",
    },
  },
  datasets: {},
};
for (const [index, kind] of kinds.entries()) {
  const buckets = Array.from({ length: 128 }, () => []);
  for (const entry of datasets[kind])
    buckets[entry.term.codePointAt(0) % 128].push(entry);
  const directory = resolve(target, kind);
  await mkdir(directory, { recursive: true });
  let bytes = 0,
    maxShardBytes = 0;
  for (let bucket = 0; bucket < 128; bucket++) {
    const content = JSON.stringify({
      version: 1,
      kind,
      entries: buckets[bucket],
    });
    const size = Buffer.byteLength(content);
    bytes += size;
    maxShardBytes = Math.max(maxShardBytes, size);
    await writeFile(resolve(directory, `${bucket}.json`), content);
  }
  manifest.datasets[kind] = {
    entries: datasets[kind].length,
    bytes,
    maxShardBytes,
    sourceSha256: hashes[index],
  };
}
await writeFile(
  resolve(target, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(JSON.stringify(manifest.datasets, null, 2));
