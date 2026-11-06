import primaryWords from "../data/primary-words.json";
import { randomInt, shuffle } from "@/shared/lib/random";
import type { Question } from "./questions";

// 本地自编词汇专项；不声称覆盖教材或精确对应某册教学进度。
const vocabulary: [string, string][][] = [
  [
    ["dog", "狗"],
    ["bird", "鸟"],
    ["fish", "鱼"],
    ["milk", "牛奶"],
    ["water", "水"],
    ["sun", "太阳"],
    ["moon", "月亮"],
    ["hand", "手"],
    ["eye", "眼睛"],
    ["pen", "钢笔"],
    ["bag", "包"],
    ["tree", "树"],
  ],
  [
    ["breakfast", "早餐"],
    ["dinner", "晚餐"],
    ["weather", "天气"],
    ["cloudy", "多云的"],
    ["sunny", "晴朗的"],
    ["teacher", "教师"],
    ["classroom", "教室"],
    ["homework", "家庭作业"],
    ["family", "家庭"],
    ["sister", "姐妹"],
    ["brother", "兄弟"],
    ["window", "窗户"],
  ],
  [
    ["healthy", "健康的"],
    ["exercise", "锻炼"],
    ["holiday", "假期"],
    ["museum", "博物馆"],
    ["science", "科学"],
    ["dictionary", "词典"],
    ["environment", "环境"],
    ["important", "重要的"],
    ["carefully", "仔细地"],
    ["different", "不同的"],
    ["tomorrow", "明天"],
    ["yesterday", "昨天"],
  ],
];

export function supplementalQuestions(
  subject: "chinese" | "english",
  grade: number,
): Question[] {
  if (subject === "chinese")
    return primaryWords.map((entry) => {
      const pronunciation = randomInt(2) === 0;
      const expected = pronunciation ? entry.pronunciation : entry.term;
      const distractors = shuffle(
        primaryWords.filter((word) => word.term !== entry.term),
      )
        .slice(0, 3)
        .map((word) => (pronunciation ? word.pronunciation : word.term));
      return {
        id: `chinese:v2:${entry.term}:${pronunciation ? "sound" : "meaning"}`,
        subject,
        grade,
        prompt: pronunciation
          ? `“${entry.term}”的正确读音是？`
          : `哪个词语符合下面的意思？\n${entry.definition}`,
        expected,
        explanation: `${entry.term}（${entry.pronunciation}）：${entry.definition}\n例句：${entry.example}`,
        options: shuffle([expected, ...distractors]),
        topic: pronunciation ? "拼音积累" : "词义积累",
      };
    });
  const band = Math.floor((grade - 1) / 2);
  return vocabulary[band].map(([word, meaning]) => {
    const reverse = randomInt(2) === 0;
    const expected = reverse ? meaning : word;
    const distractors = shuffle(
      vocabulary[band].filter(([term]) => term !== word),
    )
      .slice(0, 3)
      .map(([term, translation]) => (reverse ? translation : term));
    return {
      id: `english:v2:${band}:${word}:${reverse ? "meaning" : "word"}`,
      subject,
      grade,
      prompt: reverse
        ? `“${word}”在这里对应的中文意思是？`
        : `“${meaning}”对应哪个英文单词？`,
      expected,
      explanation: `${word} 在本题中表示“${meaning}”`,
      options: shuffle([expected, ...distractors]),
      topic: reverse ? "英译汉" : "汉译英",
    };
  });
}
