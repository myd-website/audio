import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 固定上游提交与校验和，避免在线更新后把新版单元套到旧教材。
export const NOTES_COMMIT = "337c515f32b043d0658bcf9d29e8f963404c5988";
const files = {
  "topics.json":
    "87988dd4e8afa5366686072a34b1e49bd3df8b334e6923ff2e4657c9886f95c1",
  "textbooks.json":
    "f7e06029116ed27255bed666f44ea2851253dcc93ef0bd73aef68fd1f54069de",
  "teaching-research.json":
    "a7102298b468489448e8fc830d438fc963d4acc4574cfcb7929bda99d5a38b94",
  "courses.json":
    "eb14c49a6bef39658c2a00cf3d8d8290ad77cff3db13c413320fb8d77496a55c",
};
const subjects = { chinese: "语文", math: "数学", english: "英语" };
const slugs = {
  chinese: "tongbian-chinese",
  math: "pep-math",
  english: "pep-english",
};

export function researchNote(record) {
  return record
    ? {
        summary: record.learn.summary,
        explanation: record.pedagogy,
        errors: record.assess.errors,
        task: record.assess.task,
        checks: record.assess.levels,
        next: record.assess.nextMoves,
        activities: record.learn.activities.map(({ action, insight }) => ({
          action,
          insight,
        })),
      }
    : undefined;
}

export async function prepareNotes(inputDirectory, outputDirectory) {
  const data = {};
  // 所有输入核验完成才写产物，输入校验失败时不覆盖已有快照。
  for (const [name, expected] of Object.entries(files)) {
    const bytes = await readFile(resolve(inputDirectory, name));
    if (createHash("sha256").update(bytes).digest("hex") !== expected)
      throw new Error(`${name} 与固定上游版本不一致`);
    data[name] = JSON.parse(bytes);
  }
  const notices = await Promise.all(
    ["LICENSE", "LICENSE-CONTENT", "PROVENANCE.md"].map(async (name) => [
      name,
      await readFile(resolve(inputDirectory, name)),
    ]),
  );
  const research = new Map(
    data["teaching-research.json"].records.map((record) => [
      record.topicId,
      record,
    ]),
  );
  const courses = new Map(
    data["courses.json"].courses.map((course) => [course.topicId, course]),
  );
  const packs = Object.entries(subjects).map(([subject, name]) => {
    const topics = data["topics.json"].topics
      .filter((topic) => topic.subject === name && topic.gradeRangeEnd <= 6)
      .map((topic) => {
        const course = courses.get(topic.id);
        return {
          id: topic.id,
          title: topic.name,
          description: topic.description,
          gradeStart: topic.gradeRangeStart,
          gradeEnd: topic.gradeRangeEnd,
          refs: [...topic.textbooks, ...(topic.textbooks2024 || [])],
          goals: topic.evidence,
          note: researchNote(research.get(topic.id)),
          ...(course?.license === "CC-BY-SA-4.0"
            ? { course: { title: course.title, objectives: course.objectives } }
            : {}),
        };
      });
    const books = data["textbooks.json"].versions
      .filter((version) =>
        [slugs[subject], `${slugs[subject]}-2024`].includes(version.slug),
      )
      .flatMap((version) =>
        version.books
          .filter((book) => book.grade <= 6)
          .map((book) => ({
            id: `${version.slug}:${book.slug}`,
            grade: book.grade,
            volume: book.semester === "上" ? "upper" : "lower",
            revision: version.slug.endsWith("-2024") ? "新教材" : "旧教材",
            units: (book.units || []).map((unit, index) =>
              typeof unit === "string"
                ? {
                    ref: `${version.slug}:${book.slug}:u${index + 1}`,
                    title: unit,
                    lessons: [],
                  }
                : {
                    ref: `${version.slug}:${book.slug}:u${unit.no ?? index + 1}`,
                    title: unit.name || `第${unit.no ?? index + 1}单元`,
                    lessons: unit.lessons || [],
                  },
            ),
          })),
      );
    return [
      subject,
      { version: 1, commit: NOTES_COMMIT, subject, topics, books },
    ];
  });
  await mkdir(outputDirectory, { recursive: true });
  for (const [subject, pack] of packs)
    await writeFile(
      resolve(outputDirectory, `${subject}.json`),
      `${JSON.stringify(pack)}\n`,
    );
  for (const [name, bytes] of notices)
    await writeFile(resolve(outputDirectory, name), bytes);
  await writeFile(
    resolve(outputDirectory, "SOURCE.md"),
    `# 学阶图谱资料快照\n\n来源：https://github.com/goralcao/china-skill-taxonomy\n\n作者：goralcao / China Skill Taxonomy contributors\n\n固定提交：${NOTES_COMMIT}\n\n数据库集合与结构适用 ODbL 1.0；原创文字与互动课件适用 CC BY-SA 4.0。仅上述派生数据适用这些许可，不改变本站应用代码的许可。\n\n处理：只保留小学语数英主题及相应教材结构，按学科拆分、选择展示字段；不改写上游笔记正文。教学研究笔记由 AI 撰写，未经实证验证，来源引用未逐条重新核实，不是官方教材或教师讲义。\n\n复现：从固定提交取得 ${Object.keys(files).join("、")} 及三个许可证/来源说明文件，运行 node scripts/prepare-learning-notes.mjs /path/to/source-data；脚本包含每个输入文件的 SHA-256。本站额外整理的课次提纲不属于上游资料。\n`,
  );
  return Object.fromEntries(
    packs.map(([subject, pack]) => [subject, pack.topics.length]),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (!process.argv[2]) throw new Error("请提供固定版本源文件目录");
  console.log(
    await prepareNotes(
      resolve(process.argv[2]),
      resolve(process.argv[3] || "public/courses/notes/v1"),
    ),
  );
}
