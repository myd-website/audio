import type { Subject } from "@/shared/lib/workspace";
import { randomInt, shuffle } from "@/shared/lib/random";
import { supplementalQuestions } from "./supplemental";
export interface Question {
  id: string;
  subject: Subject;
  grade: number;
  prompt: string;
  expected: string;
  explanation: string;
  options?: string[];
  topic: string;
}
type Entry = [string, string, string, string[], string];
// 首批内容为基础专项，按难度带组织，不声称覆盖某个版本的整册教材。
const chinese: Entry[][] = [
  [
    [
      "“山”的声母是什么？",
      "sh",
      "山读 shān，声母是 sh，韵母是 an。",
      ["s", "sh", "x"],
      "拼音",
    ],
    [
      "“明”字共有多少画？",
      "8",
      "明由日和月组成，日 4 画，月 4 画，共 8 画。",
      ["6", "8", "9"],
      "汉字",
    ],
    [
      "“大”的反义词是？",
      "小",
      "大与小表示相反的大小。",
      ["小", "多", "高"],
      "字词",
    ],
    [
      "“床前明月光”的下一句是？",
      "疑是地上霜",
      "李白《静夜思》：床前明月光，疑是地上霜。",
      ["疑是地上霜", "低头思故乡", "处处闻啼鸟"],
      "古诗",
    ],
    [
      "“一（ ）牛”应填哪个量词？",
      "头",
      "牛常用量词“头”，例如一头牛。",
      ["条", "只", "头"],
      "字词",
    ],
    [
      "“春眠不觉晓”的下一句是？",
      "处处闻啼鸟",
      "孟浩然《春晓》：春眠不觉晓，处处闻啼鸟。",
      ["处处闻啼鸟", "花落知多少", "夜来风雨声"],
      "古诗",
    ],
  ],
  [
    [
      "“遥知兄弟登高处”的下一句是？",
      "遍插茱萸少一人",
      "王维《九月九日忆山东兄弟》，表达重阳节思念亲人的感情。",
      ["遍插茱萸少一人", "每逢佳节倍思亲", "独在异乡为异客"],
      "古诗",
    ],
    [
      "“欲穷千里目”的下一句是？",
      "更上一层楼",
      "王之涣《登鹳雀楼》：欲穷千里目，更上一层楼。",
      ["更上一层楼", "黄河入海流", "白日依山尽"],
      "古诗",
    ],
    [
      "哪一个词语书写正确？",
      "再接再厉",
      "“再接再厉”指一次又一次地继续努力，不能把“厉”写成“力”。",
      ["再接再力", "再接再厉", "再接再励"],
      "易错字",
    ],
    [
      "“海底的岩石上生长着各种各样的珊瑚。”缩句后是？",
      "岩石上生长着珊瑚。",
      "保留主要意思，去掉修饰语“海底的”和“各种各样的”。",
      ["岩石上生长着珊瑚。", "海底各种各样。", "珊瑚的岩石。"],
      "句子",
    ],
    [
      "“宁静”的近义词是？",
      "安静",
      "“宁静”和“安静”都有平静、没有喧闹的意思。",
      ["安静", "热闹", "匆忙"],
      "字词",
    ],
    [
      "“秋天到了，树叶像蝴蝶一样飘落。”用了什么修辞？",
      "比喻",
      "把飘落的树叶比作蝴蝶，是比喻。",
      ["比喻", "反问", "排比"],
      "句子",
    ],
  ],
  [
    [
      "“纸上得来终觉浅”的下一句是？",
      "绝知此事要躬行",
      "陆游《冬夜读书示子聿》强调亲身实践的重要。",
      ["绝知此事要躬行", "为有源头活水来", "不拘一格降人材"],
      "古诗",
    ],
    [
      "“谁言寸草心，报得三春晖”出自哪位诗人？",
      "孟郊",
      "孟郊《游子吟》，借小草和春光比喻子女与母亲。",
      ["李白", "孟郊", "杜甫"],
      "古诗",
    ],
    [
      "“他难道没有帮助过你吗？”改为陈述句是？",
      "他帮助过你。",
      "原句用反问表达肯定，改为陈述句要保留肯定含义。",
      ["他没有帮助过你。", "他帮助过你。", "他会帮助你吗？"],
      "句子",
    ],
    [
      "“精卫填海”最能体现哪种精神？",
      "坚持不懈",
      "精卫不断衔来石子和树枝填海，体现坚持不懈。",
      ["坚持不懈", "自相矛盾", "随遇而安"],
      "成语",
    ],
    [
      "哪一个词语书写正确？",
      "迫不及待",
      "“迫不及待”指急迫得不能再等待，应写“及”，不能写“急”。",
      ["迫不急待", "迫不及待", "破不及待"],
      "易错字",
    ],
    [
      "“山重水复疑无路”的下一句是？",
      "柳暗花明又一村",
      "陆游《游山西村》：山重水复疑无路，柳暗花明又一村。",
      ["柳暗花明又一村", "丰年留客足鸡豚", "衣冠简朴古风存"],
      "古诗",
    ],
  ],
];
const english: Entry[][] = [
  [
    [
      "“苹果”用英语怎么说？",
      "apple",
      "apple 表示苹果，an apple 表示一个苹果。",
      ["apple", "book", "dog"],
      "单词",
    ],
    [
      "“红色”对应哪个单词？",
      "red",
      "red 表示红色，a red bag 表示一个红色书包。",
      ["blue", "red", "green"],
      "单词",
    ],
    [
      "见面打招呼可以说？",
      "Hello!",
      "Hello! 用于见面问好。",
      ["Goodbye!", "Hello!", "Good night!"],
      "日常表达",
    ],
    [
      "“猫”对应哪个单词？",
      "cat",
      "cat 表示猫，dog 表示狗。",
      ["cat", "dog", "bird"],
      "单词",
    ],
    [
      "one, two, ___, four",
      "three",
      "依次是一、二、三、四，three 表示三。",
      ["five", "three", "ten"],
      "数字",
    ],
    [
      "“谢谢你”可以说？",
      "Thank you.",
      "Thank you. 是感谢对方的常用表达。",
      ["Thank you.", "Goodbye.", "I'm sorry."],
      "日常表达",
    ],
  ],
  [
    [
      "I ___ a student.",
      "am",
      "主语是 I 时用 am：I am a student. 我是一名学生。",
      ["am", "is", "are"],
      "句型",
    ],
    [
      "“她”对应哪个代词？",
      "she",
      "she 表示她，he 表示他，they 表示他们。",
      ["he", "she", "they"],
      "单词",
    ],
    [
      "This is ___ orange.",
      "an",
      "orange 以元音音素开头，前面用 an。",
      ["a", "an", "two"],
      "句型",
    ],
    [
      "“星期一”用英语怎么说？",
      "Monday",
      "Monday 表示星期一，星期名称的首字母要大写。",
      ["Monday", "Friday", "Sunday"],
      "单词",
    ],
    [
      "“我喜欢音乐。”应选哪个句子？",
      "I like music.",
      "I like ... 表示我喜欢……，music 表示音乐。",
      ["I like music.", "I am music.", "I likes music."],
      "句型",
    ],
    [
      "book 的复数形式是？",
      "books",
      "一般名词变复数在末尾加 s：book → books。",
      ["books", "bookes", "bookies"],
      "词形",
    ],
  ],
  [
    [
      "She ___ to school every day.",
      "goes",
      "一般现在时，主语 she 是第三人称单数，go 变为 goes。",
      ["go", "goes", "going"],
      "时态",
    ],
    [
      "I ___ a film yesterday.",
      "watched",
      "yesterday 表示昨天，应用一般过去时，watch 的过去式是 watched。",
      ["watch", "watches", "watched"],
      "时态",
    ],
    [
      "child 的复数形式是？",
      "children",
      "child 的复数是不规则变化：children。",
      ["childs", "children", "childes"],
      "词形",
    ],
    [
      "“图书馆”用英语怎么说？",
      "library",
      "library 表示图书馆，library card 表示借书证。",
      ["library", "hospital", "kitchen"],
      "单词",
    ],
    [
      "There ___ some water in the bottle.",
      "is",
      "water 是不可数名词，这里用 There is。",
      ["is", "are", "am"],
      "句型",
    ],
    [
      "“更高的”应选哪个词？",
      "taller",
      "tall 的比较级是 taller，表示更高的。",
      ["tallest", "taller", "more tall"],
      "比较级",
    ],
  ],
];
function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}
function fraction(a: number, b: number): string {
  const n = gcd(a, b);
  return `${a / n}/${b / n}`;
}
export function mathQuestion(grade: number, variant = randomInt(4)): Question {
  let a = 1 + randomInt(9),
    b = 1 + randomInt(9),
    prompt = "",
    expected = "",
    explanation = "",
    topic = "";
  if (grade === 1) {
    const subtract = randomInt(2) === 0;
    if (a < b) [a, b] = [b, a];
    prompt = `${a} ${subtract ? "−" : "+"} ${b} = ?`;
    expected = String(subtract ? a - b : a + b);
    explanation = subtract
      ? `从 ${a} 里去掉 ${b}，还剩 ${expected}。`
      : `把 ${a} 和 ${b} 合起来，一共是 ${expected}。`;
    topic = "20 以内加减";
  } else if (grade === 2) {
    prompt = `${a} × ${b} = ?`;
    expected = String(a * b);
    explanation = `${a} 个 ${b} 相加，结果是 ${a * b}。也可以用乘法口诀计算。`;
    topic = "乘法口诀";
  } else if (grade === 3) {
    prompt = `${a * b} ÷ ${b} = ?`;
    expected = String(a);
    explanation = `因为 ${a} × ${b} = ${a * b}，所以 ${a * b} ÷ ${b} = ${a}。`;
    topic = "表内除法";
  } else if (grade === 4) {
    const c = 1 + randomInt(9);
    prompt = `${a} + ${b} × ${c} = ?`;
    expected = String(a + b * c);
    explanation = `先算乘法：${b} × ${c} = ${b * c}，再算加法：${a} + ${b * c} = ${expected}。`;
    topic = "运算顺序";
  } else if (grade === 5) {
    a = 1 + randomInt(99);
    b = 1 + randomInt(99);
    prompt = `${(a / 10).toFixed(1)} + ${(b / 10).toFixed(1)} = ?`;
    expected = ((a + b) / 10).toFixed(1);
    explanation = `小数点对齐，按整数加法计算 ${a} + ${b} = ${a + b}，再把结果缩小到十分之一，得到 ${expected}。`;
    topic = "小数加法";
  } else {
    const denominator = 3 + randomInt(10);
    a = 1 + randomInt(denominator - 1);
    b = 1 + randomInt(denominator - 1);
    prompt = `${a}/${denominator} + ${b}/${denominator} = ?（分数形式）`;
    expected = fraction(a + b, denominator);
    explanation = `同分母分数相加，分母不变，分子相加，得到 ${a + b}/${denominator}；约分后是 ${expected}。`;
    topic = "同分母分数加法";
  }
  // 同一年级交替使用口算、填空、应用题与基础量感，避免整轮重复同一题型。
  if (variant === 1) {
    const total = a + b;
    prompt = `（  ）+ ${b} = ${total}，括号里填多少？`;
    expected = String(a);
    explanation = `用和减去已知加数：${total} − ${b} = ${a}`;
    topic = "找未知数";
    if (grade >= 2) {
      prompt = `${a} ×（  ）= ${a * b}，括号里填多少？`;
      expected = String(b);
      explanation = `用积除以已知因数：${a * b} ÷ ${a} = ${b}`;
    }
  } else if (variant === 2) {
    prompt = `小林有 ${a} 本书，又借来 ${b} 本，现在共有多少本？（填数字）`;
    expected = String(a + b);
    explanation = `原有的加上借来的：${a} + ${b} = ${expected}（本）`;
    topic = "生活应用";
    if (grade >= 2) {
      prompt = `每盒彩笔 ${b} 支，${a} 盒共有多少支？（填数字）`;
      expected = String(a * b);
      explanation = `${a} 个 ${b} 相加，用乘法：${a} × ${b} = ${expected}（支）`;
    }
  } else if (variant === 3) {
    if (grade === 1) {
      prompt = `${a} 和 ${b} 中较大的数是多少？`;
      expected = String(Math.max(a, b));
      explanation = `${a === b ? "两个数相等，都是" : "比较大小，较大的数是"}${expected}`;
      topic = "比较大小";
    } else if (grade === 2) {
      prompt = `${a} 米 ${b} 厘米 = 多少厘米？（填数字）`;
      expected = String(a * 100 + b);
      explanation = `1 米 = 100 厘米，${a} × 100 + ${b} = ${expected}（厘米）`;
      topic = "长度换算";
    } else if (grade === 3) {
      prompt = `一个长方形长 ${a} 厘米、宽 ${b} 厘米，周长是多少厘米？（填数字）`;
      expected = String(2 * (a + b));
      explanation = `长方形周长 =（长 + 宽）× 2 =（${a} + ${b}）× 2 = ${expected}（厘米）`;
      topic = "长方形周长";
    } else if (grade === 4) {
      prompt = `${a} 千克 ${b} 克 = 多少克？（填数字）`;
      expected = String(a * 1000 + b);
      explanation = `1 千克 = 1000 克，${a} × 1000 + ${b} = ${expected}（克）`;
      topic = "质量换算";
    } else if (grade === 5) {
      prompt = `一个长方形长 ${(a / 10).toFixed(1)} 米、宽 ${b} 米，面积是多少平方米？（填数字）`;
      expected = ((a * b) / 10).toFixed(1);
      explanation = `长方形面积 = 长 × 宽 = ${(a / 10).toFixed(1)} × ${b} = ${expected}（平方米）`;
      topic = "小数与面积";
    } else {
      prompt = `${a * 10}% 化成小数是多少？`;
      expected = (a / 10).toFixed(1);
      explanation = `百分数化小数除以 100：${a * 10} ÷ 100 = ${expected}`;
      topic = "百分数转换";
    }
  }
  return {
    id: `math:${variant === 0 ? "v1" : "v2"}:${grade}:${prompt}`,
    subject: "math",
    grade,
    prompt,
    expected,
    explanation,
    topic,
  };
}
export function questions(subject: Subject, grade: number): Question[] {
  if (subject === "math") {
    const map = new Map<string, Question>();
    for (let i = 0; i < 100 && map.size < 10; i++) {
      const q = mathQuestion(grade, i % 4);
      map.set(q.id, q);
    }
    return [...map.values()];
  }
  const band = Math.floor((grade - 1) / 2);
  const base = shuffle(
    (subject === "chinese" ? chinese : english)[band].map(
      ([prompt, expected, explanation, options, topic], i) => ({
        id: `${subject}:v1:${band}:${i}`,
        subject,
        grade,
        prompt,
        expected,
        explanation,
        options: shuffle(options),
        topic,
      }),
    ),
  );
  return shuffle([
    ...base.slice(0, 5),
    ...shuffle(supplementalQuestions(subject, grade)).slice(0, 5),
  ]);
}
export function correctAnswer(
  answer: string,
  expected: string,
  subject: Subject,
): boolean {
  const clean = (s: string) => s.normalize("NFKC").trim().replace(/\s+/g, " ");
  const a = clean(answer),
    b = clean(expected);
  if (subject === "english") return a.toLowerCase() === b.toLowerCase();
  if (subject === "math") {
    const parse = (s: string) => {
      const m = s.match(/^(\d+)\/(\d+)$/);
      return m && Number(m[2]) > 0
        ? Number(m[1]) / Number(m[2])
        : /^-?\d+(?:\.\d+)?$/.test(s)
          ? Number(s)
          : NaN;
    };
    return Number.isFinite(parse(a)) && parse(a) === parse(b);
  }
  return a === b;
}
