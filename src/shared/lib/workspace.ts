export type Subject = "chinese" | "math" | "english";
export interface Task {
  id: string;
  title: string;
  note: string;
  date: string;
  time: string;
  priority: "normal" | "high";
  category: "life" | "study";
  completed: boolean;
  createdAt: string | null;
  completedAt: string | null;
}
export interface Attempt {
  id: string;
  questionId: string;
  subject: Subject;
  grade: number;
  question: string;
  answer: string;
  expected: string;
  explanation: string;
  correct: boolean;
  at: string;
}
export interface Track {
  id: string;
  rid?: string;
  name: string;
  artist: string;
  cover?: string;
  downloads?: { title: string; url: string }[];
  local?: boolean;
}
export interface Workspace {
  version: 1;
  tasks: Task[];
  attempts: Attempt[];
  favorites: Track[];
  templates: { id: string; name: string; options: string[] }[];
  preferences: { name: string; grade: number };
}
export const WORKSPACE_KEY = "aide:workspace:v1";
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function uid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // 手机通过局域网 HTTP 调试时，randomUUID 可能不可用，仍使用安全随机字节生成标识。
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function emptyWorkspace(): Workspace {
  return {
    version: 1,
    tasks: [],
    attempts: [],
    favorites: [],
    templates: [],
    preferences: { name: "", grade: 1 },
  };
}
const text = (
  value: unknown,
  max: number,
  allowEmpty = false,
): value is string =>
  typeof value === "string" &&
  value.length <= max &&
  (allowEmpty || value.trim().length > 0);
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDate(date) === value;
}
const stamp = (value: unknown) =>
  value === null ||
  (typeof value === "string" &&
    value.length < 40 &&
    Number.isFinite(Date.parse(value)));
export function safeHttps(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export function validTrack(t: Track): boolean {
  return (
    !!t &&
    text(t.id, 180) &&
    text(t.rid, 100) &&
    t.id === `qqmp3:${t.rid}` &&
    text(t.name, 300) &&
    text(t.artist, 300) &&
    !t.local &&
    (t.cover === undefined || safeHttps(t.cover) === t.cover) &&
    (t.downloads === undefined ||
      (Array.isArray(t.downloads) &&
        t.downloads.length <= 20 &&
        t.downloads.every((d) => text(d.title, 100) && !!safeHttps(d.url))))
  );
}
function unique(items: { id: string }[]) {
  return new Set(items.map((item) => item.id)).size === items.length;
}

/** 导入、读取和写入共用校验，损坏或不兼容的数据不能覆盖原记录。 */
export function decodeWorkspace(raw: string): Workspace {
  if (raw.length > 8_000_000) throw new Error("备份过大，请控制在 8MB 以内。");
  const d = JSON.parse(raw) as Workspace;
  if (
    d?.version !== 1 ||
    !Array.isArray(d.tasks) ||
    d.tasks.length > 5000 ||
    !Array.isArray(d.attempts) ||
    d.attempts.length > 10000 ||
    !Array.isArray(d.favorites) ||
    d.favorites.length > 1000 ||
    !Array.isArray(d.templates) ||
    d.templates.length > 100 ||
    !d.preferences ||
    !text(d.preferences.name, 30, true) ||
    !Number.isInteger(d.preferences.grade) ||
    d.preferences.grade < 1 ||
    d.preferences.grade > 6
  )
    throw new Error("备份格式不正确或超过容量限制。");
  if (
    !d.tasks.every(
      (t) =>
        t &&
        text(t.id, 180) &&
        text(t.title, 120) &&
        text(t.note, 1000, true) &&
        (t.date === "" || validDate(t.date)) &&
        (t.time === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)) &&
        ["normal", "high"].includes(t.priority) &&
        ["life", "study"].includes(t.category) &&
        typeof t.completed === "boolean" &&
        stamp(t.createdAt) &&
        stamp(t.completedAt) &&
        (t.completed || t.completedAt === null),
    )
  )
    throw new Error("待办数据不完整。");
  if (
    !d.attempts.every(
      (a) =>
        a &&
        text(a.id, 180) &&
        text(a.questionId, 180) &&
        ["chinese", "math", "english"].includes(a.subject) &&
        Number.isInteger(a.grade) &&
        a.grade >= 1 &&
        a.grade <= 6 &&
        text(a.question, 1000) &&
        text(a.answer, 200, true) &&
        text(a.expected, 200) &&
        text(a.explanation, 2000) &&
        typeof a.correct === "boolean" &&
        a.at !== null &&
        stamp(a.at),
    )
  )
    throw new Error("学习记录不完整。");
  if (
    !d.favorites.every(validTrack) ||
    !d.templates.every(
      (t) =>
        t &&
        text(t.id, 180) &&
        text(t.name, 30) &&
        Array.isArray(t.options) &&
        t.options.length >= 2 &&
        t.options.length <= 30 &&
        t.options.every((o) => text(o, 40)),
    )
  )
    throw new Error("音乐或娱乐数据格式不正确。");
  if (![d.tasks, d.attempts, d.favorites, d.templates].every(unique))
    throw new Error("备份包含重复记录。");
  // 只保留约定字段，避免导入未知的运行状态或临时文件地址。
  return {
    version: 1,
    tasks: d.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      note: t.note,
      date: t.date,
      time: t.time,
      priority: t.priority,
      category: t.category,
      completed: t.completed,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    })),
    attempts: d.attempts.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      subject: a.subject,
      grade: a.grade,
      question: a.question,
      answer: a.answer,
      expected: a.expected,
      explanation: a.explanation,
      correct: a.correct,
      at: a.at,
    })),
    favorites: d.favorites.map((t) => ({
      id: t.id,
      rid: t.rid,
      name: t.name,
      artist: t.artist,
      cover: t.cover,
      downloads: t.downloads?.map((d) => ({ title: d.title, url: d.url })),
    })),
    templates: d.templates.map((t) => ({
      id: t.id,
      name: t.name,
      options: [...t.options],
    })),
    preferences: { name: d.preferences.name, grade: d.preferences.grade },
  };
}
