import readings from "./openReadings.json";
import type { CourseBook, CourseLesson } from "../services/courses";
import { lessonReadingTitles, type NotesPack } from "../services/learningNotes";
import { lessonTitle } from "./lessonGuides";

/** 只在明确题名或已匹配单元的诗题清单中取原文，不凭关键词推荐同名现代作品。 */
export function poemsForLesson(
  book: CourseBook,
  lesson: CourseLesson,
  chapter: string,
  pack?: NotesPack,
) {
  if (book.subject !== "chinese" || book.edition !== "统编版") return [];
  const title = lessonTitle(lesson.title);
  const direct = readings.poems.filter((poem) => poem.title === title);
  if (direct.length) return direct;
  if (!pack || !/^古诗(?:词)?[二三四]首$/.test(title)) return [];
  const expanded = lessonReadingTitles(pack, book, lesson, chapter).join("");
  return readings.poems.filter((poem) => expanded.includes(poem.title));
}
export function openCourseSlides(topicId: string) {
  return topicId === readings.courseware.topicId
    ? readings.courseware.slides
    : undefined;
}
