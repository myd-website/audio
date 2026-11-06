import type { Subject } from "@/shared/lib/workspace";
import type { CourseBook, CourseLesson } from "./courses";
import { findLessonGuide, lessonTitle } from "../domain/lessonGuides";

export const NOTES_COMMIT = "337c515f32b043d0658bcf9d29e8f963404c5988";
export const NOTES_SOURCE = "https://github.com/goralcao/china-skill-taxonomy";
export const NOTES_ONLINE = `https://raw.githubusercontent.com/goralcao/china-skill-taxonomy/${NOTES_COMMIT}/data/teaching-research.json`;
const researchHash =
  "a7102298b468489448e8fc830d438fc963d4acc4574cfcb7929bda99d5a38b94";
export interface ResearchNote {
  summary: string;
  explanation: string;
  errors: string[];
  task: string;
  checks: string[];
  next: string[];
  activities: { action: string; insight: string }[];
}
export interface NoteTopic {
  id: string;
  title: string;
  description: string;
  gradeStart: number;
  gradeEnd: number;
  refs: string[];
  goals: string[];
  note?: ResearchNote;
  course?: { title: string; objectives: string[] };
}
interface NoteBook {
  id: string;
  grade: number;
  volume: string;
  revision: string;
  units: { ref: string; title: string; lessons: string[] }[];
}
export interface NotesPack {
  version: 1;
  commit: string;
  subject: Subject;
  topics: NoteTopic[];
  books: NoteBook[];
}
const cache = new Map<Subject, NotesPack>();
const slugs = {
  chinese: "tongbian-chinese",
  math: "pep-math",
  english: "pep-english",
};
const text = (value: unknown, limit = 2000): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= limit;
const texts = (value: unknown, max = 30): value is string[] =>
  Array.isArray(value) &&
  value.length <= max &&
  value.every((item) => text(item));
const topicId = (value: unknown): value is string =>
  typeof value === "string" && /^mt_[a-z0-9-]{1,80}$/.test(value);
const grade = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 6;
function validNote(value: unknown): value is ResearchNote {
  const note = value as ResearchNote;
  return (
    !!note &&
    text(note.summary) &&
    text(note.explanation) &&
    text(note.task) &&
    texts(note.errors) &&
    texts(note.checks) &&
    texts(note.next) &&
    Array.isArray(note.activities) &&
    note.activities.length <= 12 &&
    note.activities.every(
      (activity) => activity && text(activity.action) && text(activity.insight),
    )
  );
}
export function decodeNotesPack(value: unknown, subject: Subject): NotesPack {
  const pack = value as NotesPack;
  if (
    !pack ||
    pack.version !== 1 ||
    pack.commit !== NOTES_COMMIT ||
    pack.subject !== subject ||
    !Array.isArray(pack.topics) ||
    !pack.topics.length ||
    pack.topics.length > 250 ||
    !Array.isArray(pack.books) ||
    pack.books.length > 24
  )
    throw new Error("学习笔记格式或版本不匹配");
  const ids = new Set<string>();
  for (const topic of pack.topics) {
    if (
      !topic ||
      !topicId(topic.id) ||
      ids.has(topic.id) ||
      !text(topic.title, 120) ||
      !text(topic.description) ||
      !grade(topic.gradeStart) ||
      !grade(topic.gradeEnd) ||
      topic.gradeStart > topic.gradeEnd ||
      !texts(topic.refs, 100) ||
      !texts(topic.goals) ||
      (topic.note !== undefined && !validNote(topic.note)) ||
      (topic.course !== undefined &&
        (!topic.course ||
          !text(topic.course.title) ||
          !texts(topic.course.objectives)))
    )
      throw new Error("学习知识点内容不完整");
    ids.add(topic.id);
  }
  const bookIds = new Set<string>();
  for (const book of pack.books) {
    if (
      !book ||
      !grade(book.grade) ||
      !["upper", "lower"].includes(book.volume) ||
      !["新教材", "旧教材"].includes(book.revision) ||
      book.id !==
        `${slugs[subject]}${book.revision === "新教材" ? "-2024" : ""}:${book.grade}${book.volume === "upper" ? "a" : "b"}` ||
      bookIds.has(book.id) ||
      !Array.isArray(book.units) ||
      book.units.length > 40 ||
      !book.units.every(
        (unit) =>
          unit &&
          new RegExp(`^${book.id}:u[1-9][0-9]?$`).test(unit.ref) &&
          text(unit.title, 200) &&
          texts(unit.lessons, 120),
      )
    )
      throw new Error("学习笔记教材映射不完整");
    bookIds.add(book.id);
  }
  return pack;
}

async function readJson(
  url: string,
  signal: AbortSignal | undefined,
  maxBytes: number,
  hash?: string,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) throw new DOMException("已取消", "AbortError");
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 10000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
    });
    if (!response.ok) throw new Error(`学习笔记读取失败（${response.status}）`);
    if (
      !response.headers.get("content-type")?.includes("json") &&
      !response.headers.get("content-type")?.includes("text/plain")
    )
      throw new Error("学习笔记地址未返回 JSON 数据");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("学习笔记响应为空");
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          controller.abort();
          throw new Error("学习笔记超过大小上限");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    if (hash) {
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      if (
        Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("") !== hash
      )
        throw new Error("在线笔记与固定版本不一致");
    }
    if (controller.signal.aborted) throw new Error("学习笔记读取超时");
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch (cause) {
    if (signal?.aborted) throw new DOMException("已取消", "AbortError");
    if (cause instanceof SyntaxError) throw new Error("学习笔记数据损坏");
    if (cause instanceof TypeError) throw new Error("学习笔记暂时无法联网读取");
    if (controller.signal.aborted && cause instanceof DOMException)
      throw new Error("学习笔记读取超时");
    throw cause;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
export async function loadNotesPack(subject: Subject, signal?: AbortSignal) {
  if (!["chinese", "math", "english"].includes(subject))
    throw new Error("不支持的笔记学科");
  if (signal?.aborted) throw new DOMException("已取消", "AbortError");
  if (cache.has(subject)) return cache.get(subject)!;
  const pack = decodeNotesPack(
    await readJson(
      `${import.meta.env.BASE_URL}courses/notes/v1/${subject}.json`,
      signal,
      2000000,
    ),
    subject,
  );
  if (signal?.aborted) throw new DOMException("已取消", "AbortError");
  cache.set(subject, pack);
  return pack;
}
export async function loadOnlineNotes(pack: NotesPack, signal?: AbortSignal) {
  // 在线读取相同固定提交，仅替换教学研究正文；教材映射与课程归属不随网络响应改变。
  const data = await readJson(NOTES_ONLINE, signal, 4500000, researchHash);
  return decodeOnlineNotes(data, pack);
}
export function decodeOnlineNotes(value: unknown, pack: NotesPack) {
  const data = value as { schemaVersion?: number; records?: unknown[] };
  if (
    data?.schemaVersion !== 1 ||
    !Array.isArray(data.records) ||
    data.records.length > 2000
  )
    throw new Error("在线教学笔记格式异常");
  const relevant = new Set(pack.topics.map((topic) => topic.id));
  const notes = new Map<string, ResearchNote>();
  for (const value of data.records) {
    const record = value as {
      topicId?: string;
      pedagogy?: unknown;
      learn?: { summary?: unknown; activities?: unknown };
      assess?: {
        task?: unknown;
        errors?: unknown;
        levels?: unknown;
        nextMoves?: unknown;
      };
    };
    if (!record?.topicId || !relevant.has(record.topicId)) continue;
    const activities = record.learn?.activities;
    const note = {
      summary: record.learn?.summary,
      explanation: record.pedagogy,
      errors: record.assess?.errors,
      task: record.assess?.task,
      checks: record.assess?.levels,
      next: record.assess?.nextMoves,
      activities: Array.isArray(activities)
        ? activities.map((activity) => ({
            action: activity?.action,
            insight: activity?.insight,
          }))
        : activities,
    };
    if (notes.has(record.topicId) || !validNote(note))
      throw new Error("在线教学笔记内容不完整");
    notes.set(record.topicId, note);
  }
  if (!notes.size) throw new Error("在线资料没有当前学科的教学笔记");
  return notes;
}

function supportedEdition(book: CourseBook) {
  return book.subject === "chinese"
    ? book.edition === "统编版"
    : book.subject === "math"
      ? book.edition.includes("人教版")
      : book.title.includes("PEP");
}
const normalize = (title: string) =>
  lessonTitle(title)
    .replace(/[（）()]/g, "")
    .replace(/[：:、，,。.!！?？·*]/g, "")
    .toLocaleLowerCase();
function chapterUnit(chapter: string) {
  const number =
    chapter.match(/^(?:第)?([一二三四五六七八九十\d]+)单元/)?.[1] ||
    chapter.match(/^unit\s+(\d+)\b/i)?.[1];
  if (!number) return 0;
  return /^\d+$/.test(number)
    ? Number(number)
    : ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"].indexOf(
        number,
      );
}
function referenceBook(pack: NotesPack, book: CourseBook) {
  if (pack.subject !== book.subject || !supportedEdition(book))
    return undefined;
  return pack.books.find(
    (item) =>
      item.grade === book.grade &&
      item.volume === book.volume &&
      item.revision === book.revision,
  );
}
function referenceUnit(
  textbook: NoteBook,
  lesson: CourseLesson,
  chapter: string,
) {
  const chapterMatch = textbook.units.find(
    (item) =>
      normalize(item.title) === normalize(chapter) ||
      (chapterUnit(chapter) > 0 &&
        item.ref.endsWith(`:u${chapterUnit(chapter)}`)),
  );
  const titleMatches = textbook.units.filter((item) =>
    item.lessons.some((title) => normalize(title) === normalize(lesson.title)),
  );
  // “语文园地”等课名在多个单元重复，优先官方章节；仅凭课名时必须唯一。
  return (
    chapterMatch || (titleMatches.length === 1 ? titleMatches[0] : undefined)
  );
}
export function lessonReadingTitles(
  pack: NotesPack,
  book: CourseBook,
  lesson: CourseLesson,
  chapter: string,
) {
  const textbook = referenceBook(pack, book);
  const unit = textbook && referenceUnit(textbook, lesson, chapter);
  if (!unit) return [];
  const title = normalize(lesson.title);
  const candidates = unit.lessons.filter(
    (item) =>
      normalize(item) === title ||
      (/^古诗(?:词)?[二三四]首$/.test(title) &&
        normalize(item.replace(/[（(][^）)]*[）)]/g, "")) === title),
  );
  return candidates.length === 1 ? candidates : [];
}
export function relatedTopics(
  pack: NotesPack,
  book: CourseBook,
  lesson: CourseLesson,
  chapter: string,
): { label: string; topics: NoteTopic[] } {
  if (pack.subject !== book.subject || !supportedEdition(book))
    return { label: "该教材版本尚无对应资料，可自行查找知识点", topics: [] };
  const guide = findLessonGuide(book, lesson);
  if (guide)
    return {
      label: "与本课阅读方法相关的知识点参考",
      topics: guide.topicIds.flatMap(
        (id) => pack.topics.find((topic) => topic.id === id) || [],
      ),
    };
  const textbook = referenceBook(pack, book);
  if (!textbook)
    return { label: "该册次尚无对应资料，可自行查找知识点", topics: [] };
  const unit = referenceUnit(textbook, lesson, chapter);
  const unitTopics = unit
    ? pack.topics.filter((topic) => topic.refs.includes(unit.ref))
    : [];
  if (unitTopics.length)
    return { label: "本单元知识点参考，不是逐课配套讲义", topics: unitTopics };
  const bookTopics = pack.topics.filter((topic) =>
    topic.refs.includes(textbook.id),
  );
  return {
    label: bookTopics.length
      ? "本册通用方法参考，不是本课专属笔记"
      : "暂未匹配到本课知识点，可自行查找",
    topics: bookTopics,
  };
}
