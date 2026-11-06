import type { CourseBook, CourseLesson } from "../services/courses";

export interface LessonGuide {
  title: string;
  summary: string;
  points: string[];
  task: string;
  topicIds: string[];
}

// 明确标为本站整理，不伪装成接口返回的官方讲义；不复制现代课文全文。
const guides: LessonGuide[] = [
  {
    title: "观潮",
    summary:
      "围绕钱塘江大潮，整理景物变化、观察顺序和语言表达，复习时用课本中的具体语句支持自己的理解",
    points: [
      "按潮来前、潮来时、潮过后的顺序梳理内容，比较三个阶段的景象和人群反应",
      "潮来时重点比较声音与形态的变化，说明作者怎样表现大潮由远及近的过程",
      "找出一处比喻，先说明把什么比作什么，再说这种写法让你感受到什么",
      "朗读时根据景象变化调整节奏，用文中的依据说明自己感受到的大潮气势",
    ],
    task: "画一条大潮变化的时间线，每个阶段写下声音、样子和自己的感受；再用一段话介绍最震撼你的画面",
    topicIds: ["mt_read-mark", "mt_read-feel", "mt_sent-rhetoric"],
  },
  {
    title: "繁星",
    summary:
      "这份提纲针对巴金的散文《繁星》，围绕不同时间和地点的观星经历，体会观察、联想与情感的联系",
    points: [
      "分别整理家乡、南京、海上三个观星场景，记录时间、地点和观察到的特点",
      "区分眼睛看到的景象与作者产生的联想，思考两者怎样共同构成画面",
      "结合具体语句体会作者对星空的亲近和喜爱，避免只用套话概括感情",
      "比较不同观星经历带来的感受，联系自己看星空或观察自然的经历进行表达",
    ],
    task: "选一个观星场景，用“看到的景象—产生的联想—心里的感受”做三栏笔记，再写一段自己的自然观察记录",
    topicIds: ["mt_read-feel", "mt_read-mark", "mt_write-observe"],
  },
];

export function lessonTitle(title: string) {
  return title
    .trim()
    .replace(/^\d+(?:\s+|[.*、．]\s*)\*?\s*/, "")
    .replace(/[《》\s]/g, "");
}
export function findLessonGuide(book: CourseBook, lesson: CourseLesson) {
  if (
    book.subject !== "chinese" ||
    book.grade !== 4 ||
    book.volume !== "upper" ||
    book.edition !== "统编版"
  )
    return undefined;
  return guides.find((guide) => guide.title === lessonTitle(lesson.title));
}
