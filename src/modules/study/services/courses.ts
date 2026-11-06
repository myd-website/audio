import type { Subject, Task } from "@/shared/lib/workspace";
import { localDate, uid } from "@/shared/lib/workspace";

export const SMARTEDU_HOME = "https://basic.smartedu.cn/syncClassroom";
export type CourseVolume = "upper" | "lower";
export type LessonType = "national_lesson" | "elite_lesson" | "teaching_lesson";
export interface CourseBook {
  id: string;
  title: string;
  subject: Subject;
  grade: number;
  volume: CourseVolume;
  edition: string;
  revision: string;
  tagPath: string[];
  file: string;
  lessonCount: number;
  chapterCount: number;
}
export interface CourseCatalog {
  version: 1;
  syncedAt: string;
  sourceVersion: string;
  books: CourseBook[];
}
export interface CourseChapter {
  id: string;
  title: string;
  parentId: string;
}
export interface CourseLesson {
  id: string;
  title: string;
  type: LessonType;
  chapterIds: string[];
}
export interface CourseDetails {
  version: 1;
  bookId: string;
  chapters: CourseChapter[];
  lessons: CourseLesson[];
}
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const validText = (value: unknown, max = 300): value is string =>
  typeof value === "string" && !!value.trim() && value.length <= max;
const validId = (value: unknown): value is string =>
  typeof value === "string" && uuid.test(value);
export function decodeCatalog(value: unknown): CourseCatalog {
  const data = value as CourseCatalog;
  if (
    data?.version !== 1 ||
    !validText(data.syncedAt, 40) ||
    !Number.isFinite(Date.parse(data.syncedAt)) ||
    !validText(data.sourceVersion, 100) ||
    !Array.isArray(data.books) ||
    !data.books.length ||
    data.books.length > 200
  )
    throw new Error("课程目录格式异常，请重新同步官方目录。");
  const seen = new Set<string>();
  for (const book of data.books) {
    if (
      !book ||
      !validId(book.id) ||
      seen.has(book.id) ||
      !validText(book.title) ||
      !["chinese", "math", "english"].includes(book.subject) ||
      !Number.isInteger(book.grade) ||
      book.grade < 1 ||
      book.grade > 6 ||
      !["upper", "lower"].includes(book.volume) ||
      !validText(book.edition, 100) ||
      !validText(book.revision, 40) ||
      !Array.isArray(book.tagPath) ||
      book.tagPath.length < 5 ||
      book.tagPath.length > 6 ||
      !book.tagPath.every(
        (tag) => typeof tag === "string" && /^[\w-]{1,100}$/.test(tag),
      ) ||
      !new RegExp(`^${book.id}-[0-9a-f]{16}\\.json$`).test(book.file) ||
      !Number.isInteger(book.lessonCount) ||
      book.lessonCount < 0 ||
      book.lessonCount > 10000 ||
      !Number.isInteger(book.chapterCount) ||
      book.chapterCount < 0 ||
      book.chapterCount > 2000
    )
      throw new Error("课程教材信息不完整，请重新同步官方目录。");
    seen.add(book.id);
  }
  return data;
}
export function decodeDetails(value: unknown, book: CourseBook): CourseDetails {
  const data = value as CourseDetails;
  if (
    data?.version !== 1 ||
    data.bookId !== book.id ||
    !Array.isArray(data.chapters) ||
    data.chapters.length !== book.chapterCount ||
    !Array.isArray(data.lessons) ||
    data.lessons.length !== book.lessonCount
  )
    throw new Error("课程内容与所选教材不匹配，请重试。");
  const chapters = new Set<string>(),
    lessons = new Set<string>();
  for (const chapter of data.chapters) {
    if (
      !chapter ||
      !validId(chapter.id) ||
      chapters.has(chapter.id) ||
      !validText(chapter.title) ||
      (chapter.parentId !== "" && !chapters.has(chapter.parentId))
    )
      throw new Error("课程章节数据不完整。");
    chapters.add(chapter.id);
  }
  for (const lesson of data.lessons) {
    if (
      !lesson ||
      !validId(lesson.id) ||
      lessons.has(lesson.id) ||
      !validText(lesson.title) ||
      !["national_lesson", "elite_lesson", "teaching_lesson"].includes(
        lesson.type,
      ) ||
      !Array.isArray(lesson.chapterIds) ||
      !lesson.chapterIds.every((chapter) => chapters.has(chapter))
    )
      throw new Error("课程条目数据不完整。");
    lessons.add(lesson.id);
  }
  return data;
}
async function readJson(file: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) throw new DOMException("已取消", "AbortError");
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 8000);
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}courses/smartedu/v1/${file}`,
      {
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      },
    );
    if (!response.ok)
      throw new Error(`课程目录加载失败（${response.status}），请重试。`);
    if (!response.headers.get("content-type")?.includes("json"))
      throw new Error("课程目录未正确发布，请重新构建后重试。");
    const data: unknown = await response.json();
    if (controller.signal.aborted)
      throw new DOMException("已取消", "AbortError");
    return data;
  } catch (cause) {
    if (signal?.aborted) throw new DOMException("已取消", "AbortError");
    if (controller.signal.aborted)
      throw new Error("课程目录加载超时，请重试。");
    if (cause instanceof TypeError)
      throw new Error("课程目录暂时无法加载，请检查网络后重试。");
    if (cause instanceof SyntaxError)
      throw new Error("课程目录文件损坏，请重新发布。");
    throw cause;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export async function loadCourseCatalog(signal?: AbortSignal) {
  return decodeCatalog(await readJson("index.json", signal));
}
export async function loadCourseDetails(
  book: CourseBook,
  signal?: AbortSignal,
) {
  if (
    !validId(book.id) ||
    !new RegExp(`^${book.id}-[0-9a-f]{16}\\.json$`).test(book.file)
  )
    throw new Error("教材标识无效。");
  return decodeDetails(await readJson(book.file, signal), book);
}
export function selectBooks(
  catalog: CourseCatalog,
  subject: Subject,
  grade: number,
  volume: CourseVolume,
) {
  const rank = (book: CourseBook) =>
    (book.revision === "新教材" ? 0 : book.revision === "旧教材" ? 2 : 1) +
    (subject === "english" && !book.title.includes("PEP") ? 10 : 0);
  return catalog.books
    .filter(
      (book) =>
        book.subject === subject &&
        book.grade === grade &&
        book.volume === volume,
    )
    .sort(
      (a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, "zh-CN"),
    );
}
export function filterLessons(
  details: CourseDetails,
  chapterId: string,
  keyword: string,
) {
  const descendants = new Set(chapterId ? [chapterId] : []);
  if (chapterId)
    for (const chapter of details.chapters)
      if (descendants.has(chapter.parentId)) descendants.add(chapter.id);
  const query = keyword.trim().toLocaleLowerCase();
  return details.lessons.filter(
    (lesson) =>
      (!chapterId || lesson.chapterIds.some((id) => descendants.has(id))) &&
      (!query || lesson.title.toLocaleLowerCase().includes(query)),
  );
}
export function lessonUrl(lesson: Pick<CourseLesson, "id" | "type">) {
  if (!validId(lesson.id)) throw new Error("课程标识无效。");
  // 路由来自官网当前公开脚本；固定官方域名，绝不使用外部数据提供的任意跳转地址。
  const routes = {
    national_lesson: ["/syncClassroom/classActivity", "activityId"],
    elite_lesson: ["/qualityCourse", "courseId"],
    teaching_lesson: ["/syncClassroom/teachingLesson", "courseId"],
  } as const;
  const route = routes[lesson.type];
  if (!route) throw new Error("暂不支持这类课程。");
  const url = new URL(route[0], "https://basic.smartedu.cn");
  url.searchParams.set(route[1], lesson.id);
  return url.href;
}
export function bookUrl(book: CourseBook) {
  const url = new URL(SMARTEDU_HOME);
  url.searchParams.set("defaultTag", book.tagPath.join("/"));
  return url.href;
}
export function coursePlan(
  book: CourseBook,
  lesson: CourseLesson,
  tasks: readonly Readonly<Task>[],
): Task {
  const url = lessonUrl(lesson),
    date = localDate();
  if (
    tasks.some(
      (task) => task.date === date && task.note.split("\n").includes(url),
    )
  )
    throw new Error("今天已经安排过这节课了。");
  return {
    id: uid(),
    title: `学习课程：${lesson.title}`.slice(0, 120),
    note: `${book.title}\n${book.edition} · ${book.revision}\n国家中小学智慧教育平台\n${url}\n学完后请手动勾选完成。`,
    date,
    time: "",
    priority: "normal",
    category: "study",
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}
