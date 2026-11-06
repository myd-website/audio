import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = resolve(process.argv[2] || ".");
const hashes = {
  "poetry-tang.json":
    "8423b65d938d0327e369972e790549b42609fa7ac4a2a72df59f4cb5a49c08f8",
  "skill-read-mark-content.json":
    "c35f78be18f81d93500a4fe98a2413aa8f4bab366f5751fa5f309cf9eb2f178f",
};
const data = {};
const poetryLicense = await readFile(resolve(input, "poetry-license.txt"));
for (const [name, expected] of Object.entries(hashes)) {
  const bytes = await readFile(resolve(input, name));
  if (createHash("sha256").update(bytes).digest("hex") !== expected)
    throw new Error(`${name} 校验和不一致`);
  data[name] = JSON.parse(bytes);
}
const selections = [
  ["静夜思", "靜夜思", "李白"],
  ["春晓", "春曉", "孟浩然"],
  ["登鹳雀楼", "登鸛雀樓", "王之渙"],
  ["鹿柴", "鹿柴", "王維"],
  ["江雪", "江雪", "柳宗元"],
  ["寻隐者不遇", "尋隱者不遇", "賈島"],
  ["九月九日忆山东兄弟", "九月九日憶山東兄弟", "王維"],
  ["早发白帝城", "早發白帝城", "李白"],
  ["黄鹤楼送孟浩然之广陵", "黃鶴樓送孟浩然之廣陵", "李白"],
  ["芙蓉楼送辛渐", "芙蓉樓送辛漸", "王昌齡"],
  ["送元二使安西", "渭城曲", "王維"],
];
const all = data["poetry-tang.json"].content.flatMap(
  (section) => section.content,
);
const poems = selections.map(([title, original, author]) => {
  const matches = all.filter(
    (poem) => poem.chapter === original && poem.author === author,
  );
  if (matches.length !== 1) throw new Error(`${title} 不是唯一匹配`);
  return { title, author, paragraphs: matches[0].paragraphs };
});
// 课件仅提取可阅读文字；转换基础排版标签，不把来源 HTML/脚本交给浏览器执行。
const plain = (value) =>
  typeof value === "string"
    ? value
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<\/?(?:b|strong|em|i|p)>/gi, "")
        .replaceAll("\\u3000", " ")
    : "";
const course = data["skill-read-mark-content.json"];
const slides = course.steps.map((step) => {
  const body = step.body || {};
  const lines = [
    step.lead,
    step.question,
    ...(step.bullets || []).map((item) => item.text),
    body.text,
    body.sample,
  ];
  if (step.type === "annotate")
    lines.push(
      "请在纸上标记关键词、人物、好句和疑问，再对照下面的参考批注",
      ...(body.marks || []).map((mark) => `${mark.t}：${mark.why}`),
    );
  if (step.type === "choice")
    lines.push(
      ...step.options.map((option, index) => `${index + 1}. ${option}`),
      `参考：${step.answer}`,
      step.hint,
      ...Object.values(step.misconception || {}),
    );
  if (step.type === "draft")
    lines.push(
      "挑一个词，在纸上写一行旁批，再对照示例",
      ...(body.rowHints || []),
      body.sampleNote,
    );
  if (step.type === "rubric")
    lines.push(
      ...(body.dimensions || []).map(
        (item) =>
          `${item.name}\n${item.levels.map((level) => `${level.k}：${level.d}`).join("\n")}`,
      ),
      body.advice,
    );
  lines.push(...(step.points || []), step.advice, step.note, body.after);
  return {
    title: step.title,
    body: lines
      .filter((value) => typeof value === "string" && value)
      .map(plain)
      .join("\n\n"),
  };
});
await writeFile(
  resolve("src/modules/study/domain/openReadings.json"),
  `${JSON.stringify({ poems, courseware: { topicId: course.topicId, title: course.title, slides } })}\n`,
);
const output = resolve("public/courses/notes/v1");
await mkdir(output, { recursive: true });
await writeFile(resolve(output, "POETRY-LICENSE.txt"), poetryLicense);
await writeFile(
  resolve(output, "OPEN-READINGS.md"),
  `# 古诗与课件阅读版来源\n\n古诗：chinese-poetry / chinese-poetry，JackeyGao 等贡献者，MIT；所选唐代作者原作已进入公有领域，保留来源资料的原字形、标点和异文，不能据此断言与某版教材完全一致。\n\n固定版本：https://github.com/chinese-poetry/chinese-poetry/tree/b8594f81a89752241442f2ce267d6f66f96704ee\n\n文件：蒙学/tangshisanbaishou.json；筛选 11 首小学常见古诗。仅将题名设为简体检索别名，作者与正文不改写，许可见 POETRY-LICENSE.txt。\n\n开源课件阅读版：goralcao / China Skill Taxonomy contributors，CC BY-SA 4.0；固定提交 337c515f32b043d0658bcf9d29e8f963404c5988 的 courses/mt_read-mark/content.json。保留九步内容，将互动指令改成纸面练习说明，提取正文、问题、参考批注、答案与自查文本并去除基础 HTML 排版标签，原样顺序不执行脚本。该阅读版按 CC BY-SA 4.0 分发，不是本课教材 PPT。\n\n复现：scripts/prepare-open-readings.mjs 中保存两个 JSON 的 SHA-256，将对应源文件及诗词仓库 LICENSE（命名 poetry-license.txt）放在同一目录后运行 node scripts/prepare-open-readings.mjs /path/to/source-files。\n`,
);
console.log({ poems: poems.length, coursewareSlides: slides.length });
