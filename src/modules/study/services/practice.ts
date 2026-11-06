import { questions } from "../domain/questions";
import type { Question } from "../domain/questions";
import type { Subject } from "@/shared/lib/workspace";

// 来源文档公开的共享 ID / KEY，无需也不应把个人私密密钥放进静态站点。
const MATH_API =
  "https://cn.apihz.cn/api/zici/shuxuex.php?id=88888888&key=88888888";
export const ONLINE_MATH_PREFIX = "math:apihz:v1:";
let nextRequestAt = 0;

export interface PracticeResult {
  questions: Question[];
  source: "local" | "mixed";
  notice: string;
}
export function isSelfCheckQuestion(question: Pick<Question, "id">) {
  // 规则保留在稳定题号中，错题和 JSON 备份无需迁移也能恢复自评方式。
  return question.id.startsWith(ONLINE_MATH_PREFIX);
}
function checkCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("已取消", "AbortError");
}
function requiredText(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("在线题目不完整或超出保存范围。");
  return value.trim();
}
function questionId(prompt: string, expected: string) {
  // 双哈希仅用于本机题目去重，不承担安全用途；相同题目和答案在复习时沿用题号。
  let first = 2166136261,
    second = 5381;
  for (const char of `${prompt}\0${expected}`) {
    const code = char.codePointAt(0)!;
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second, 33) ^ code;
  }
  return `${ONLINE_MATH_PREFIX}${(first >>> 0).toString(16)}-${(second >>> 0).toString(16)}`;
}
export function normalizeMathQuestion(
  payload: unknown,
  grade: number,
): Question {
  if (!payload || typeof payload !== "object")
    throw new Error("在线题库返回格式不正确。");
  const data = payload as Record<string, unknown>;
  if (data.code !== 200)
    throw new Error("在线题库暂不可用或已达到共享调用频次。");
  // 与现有学习记录的字段上限保持一致，不截断答案和解析后冒充完整题目。
  const prompt = requiredText(data.timu, 1000);
  const expected = requiredText(data.daan, 200);
  const explanation = requiredText(data.jiexi, 2000);
  return {
    id: questionId(prompt, expected),
    subject: "math",
    // 这里只记录本轮练习所选年级，接口本身没有年级筛选，界面单独标明。
    grade,
    prompt,
    expected,
    explanation,
    topic: "在线综合应用题 · 不分年级",
  };
}
async function loadOnlineMath(grade: number, signal?: AbortSignal) {
  checkCancelled(signal);
  if (Date.now() < nextRequestAt)
    throw new Error("在线题库请求较频繁，请稍后再试。");
  // 每轮仅请求一道补充题，避免一口气请求十题耗尽共享频次并拖慢练习。
  nextRequestAt = Date.now() + 6500;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = window.setTimeout(abort, 5000);
  try {
    const response = await fetch(MATH_API, {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    checkCancelled(controller.signal);
    if (!response.ok)
      throw new Error(`在线题库请求失败（${response.status}）。`);
    const payload: unknown = await response.json();
    checkCancelled(controller.signal);
    return normalizeMathQuestion(payload, grade);
  } catch (cause) {
    checkCancelled(signal);
    if (controller.signal.aborted) throw new Error("在线题库查询超时。");
    if (cause instanceof TypeError)
      throw new Error("在线题库暂不可达，请检查网络。");
    if (cause instanceof SyntaxError)
      throw new Error("在线题库返回格式不正确。");
    throw cause;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export async function loadPracticeQuestions(
  subject: Subject,
  grade: number,
  signal?: AbortSignal,
): Promise<PracticeResult> {
  checkCancelled(signal);
  if (
    !["chinese", "math", "english"].includes(subject) ||
    !Number.isInteger(grade) ||
    grade < 1 ||
    grade > 6
  )
    throw new Error("请选择有效学科和 1～6 年级。");
  if (subject !== "math")
    return {
      questions: questions(subject, grade),
      source: "local",
      notice: "本轮使用本地基础题库。",
    };
  try {
    const online = await loadOnlineMath(grade, signal);
    checkCancelled(signal);
    const local = questions(subject, grade).slice(0, 9);
    return {
      questions: [online, ...local],
      source: "mixed",
      notice: `本轮包含 1 道在线综合题（不分年级，自行核对答案）和 ${local.length} 道所选年级基础题。`,
    };
  } catch (cause) {
    checkCancelled(signal);
    return {
      questions: questions(subject, grade),
      source: "local",
      notice: `${cause instanceof Error ? cause.message : "在线题库查询失败。"}已自动使用本地基础题。`,
    };
  }
}
