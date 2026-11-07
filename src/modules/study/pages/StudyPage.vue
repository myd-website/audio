<script setup lang="ts">
defineOptions({ name: "StudyPage" });
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";
import { showConfirmDialog, showToast } from "vant";
import { correctAnswer } from "../domain/questions";
import {
  isSelfCheckQuestion,
  loadPracticeQuestions,
} from "../services/practice";
import type { Question } from "../domain/questions";
import type { Attempt, Subject } from "@/shared/lib/workspace";
import { uid } from "@/shared/lib/workspace";
import { useWorkspaceStore } from "@/shared/stores/workspace";
import { act, message } from "@/shared/lib/feedback";
import AppSelect from "@/shared/components/AppSelect.vue";
import SourceBadge from "@/shared/components/SourceBadge.vue";
const route = useRoute();
const store = useWorkspaceStore();
const subject = ref<Subject>("chinese");
const tools = [
  { to: "/calculator", name: "日常计算器", hint: "算式、括号与小数" },
  { to: "/calculator?mode=vertical", name: "竖式计算", hint: "看懂每一步过程" },
  {
    to: "/study/dictionary?kind=character",
    name: "汉语字典",
    hint: "拼音、笔画与释义",
  },
  {
    to: "/study/dictionary?kind=word",
    name: "汉语词典",
    hint: "词语意思与用法",
  },
  {
    to: "/study/dictionary?kind=idiom",
    name: "成语大全",
    hint: "解释、出处与例句",
  },
  {
    to: "/study/dictionary?kind=english",
    name: "英汉词典",
    hint: "中文释义、音标与词形",
  },
];
const grade = ref(store.data.preferences.grade);
const gradeOptions = Array.from({ length: 6 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1} 年级`,
}));
const subjects = [
  {
    id: "chinese" as const,
    name: "语文",
    letter: "文",
    description: "字词积累 · 古诗 · 句子",
    color: "#f4e7ce",
  },
  {
    id: "math" as const,
    name: "数学",
    letter: "数",
    description: "口算专项 · 运算规律",
    color: "#e3ecd9",
  },
  {
    id: "english" as const,
    name: "英语",
    letter: "En",
    description: "单词 · 句型 · 日常表达",
    color: "#e0e9f1",
  },
];
const mode = ref(route.query.mode === "review" ? "review" : "practice");
const quiz = ref<Question[]>([]);
const position = ref(0);
const answer = ref("");
const submitted = ref<Attempt | null>(null);
const results = ref<Attempt[]>([]);
const finished = ref(false);
const loading = ref(false);
const loadNotice = ref("");
const loadError = ref("");
const selfCheckRevealed = ref(false);
let loadController: AbortController | undefined;
let loadSequence = 0;
const current = computed(() => quiz.value[position.value]);
const selfCheck = computed(() =>
  Boolean(current.value && isSelfCheckQuestion(current.value)),
);
const selfCheckedCount = computed(
  () =>
    results.value.filter((attempt) =>
      isSelfCheckQuestion({ id: attempt.questionId }),
    ).length,
);
const active = computed(() => quiz.value.length > 0 && !finished.value);
const subjectName = computed(
  () => subjects.find((s) => s.id === subject.value)!.name,
);
const wrong = computed(() => {
  const latest = new Map<string, Readonly<Attempt>>();
  for (const a of store.data.attempts)
    if (a.grade === grade.value && a.subject === subject.value)
      latest.set(a.questionId, a);
  return [...latest.values()].filter((a) => !a.correct);
});
function cancelLoading() {
  loadSequence++;
  loadController?.abort();
  loading.value = false;
}
watch([subject, grade, mode], () => {
  cancelLoading();
  loadNotice.value = "";
  loadError.value = "";
});
onBeforeUnmount(cancelLoading);
async function start() {
  if (loading.value || active.value || !store.ready) return;
  cancelLoading();
  const token = loadSequence;
  loadController = new AbortController();
  loading.value = true;
  loadNotice.value = "";
  loadError.value = "";
  try {
    let list: Question[];
    if (mode.value === "review") {
      list = wrong.value.map((a) => ({
        id: a.questionId,
        subject: a.subject,
        grade: a.grade,
        prompt: a.question,
        expected: a.expected,
        explanation: a.explanation,
        topic: "错题复习",
      }));
    } else {
      const result = await loadPracticeQuestions(
        subject.value,
        grade.value,
        loadController.signal,
      );
      if (token !== loadSequence) return;
      list = result.questions;
      loadNotice.value = result.notice;
    }
    if (token !== loadSequence) return;
    if (!list.length) {
      showToast("这个年级和学科还没有待复习错题");
      return;
    }
    quiz.value = list.slice(0, 10);
    position.value = 0;
    answer.value = "";
    submitted.value = null;
    results.value = [];
    finished.value = false;
    selfCheckRevealed.value = false;
  } catch (cause) {
    if (token === loadSequence) loadError.value = message(cause);
  } finally {
    if (token === loadSequence) loading.value = false;
  }
}
function submit() {
  const q = current.value;
  if (!q || submitted.value || !answer.value.trim()) return;
  if (selfCheck.value) {
    selfCheckRevealed.value = true;
    return;
  }
  saveAnswer(correctAnswer(answer.value, q.expected, q.subject));
}
function saveAnswer(correct: boolean) {
  const q = current.value;
  if (!q || submitted.value || !answer.value.trim()) return;
  if (selfCheck.value && !selfCheckRevealed.value) return;
  const attempt: Attempt = {
    id: uid(),
    questionId: q.id,
    subject: q.subject,
    grade: q.grade,
    question: q.prompt,
    answer: answer.value.trim(),
    expected: q.expected,
    explanation: q.explanation,
    correct,
    at: new Date().toISOString(),
  };
  if (act(() => store.addAttempt(attempt))) {
    submitted.value = attempt;
    results.value.push(attempt);
  }
}
function next() {
  if (!submitted.value) return;
  if (position.value >= quiz.value.length - 1) {
    finished.value = true;
    return;
  }
  position.value++;
  answer.value = "";
  submitted.value = null;
  selfCheckRevealed.value = false;
}
async function end() {
  const yes = await showConfirmDialog({
    title: "结束本轮练习？",
    message: "已提交的题目会保留，未提交的答案不会保存",
  }).then(
    () => true,
    () => false,
  );
  if (yes) {
    quiz.value = [];
    submitted.value = null;
    finished.value = false;
  }
}
onBeforeRouteLeave(async () => {
  if (!active.value) {
    cancelLoading();
    return true;
  }
  const confirmed = await showConfirmDialog({
    title: "离开本轮练习？",
    message: "已提交的记录会保留，当前未提交答案不会保存",
  }).then(
    () => true,
    () => false,
  );
  if (confirmed) cancelLoading();
  return confirmed;
});
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">GROW A LITTLE, EVERY DAY</p>
      <h1>学习，也可以很有趣</h1>
      <p class="muted">每天练一点，把知识慢慢变成自己的</p>
    </div>
    <AppSelect
      class="grade-select"
      :model-value="grade"
      label="练习年级"
      :options="gradeOptions"
      :disabled="active"
      @update:model-value="grade = Number($event)"
    />
  </div>
  <router-link
    class="card course-entry"
    :to="{ path: '/study/courses', query: { grade, subject } }"
  >
    <span class="course-entry-icon"><van-icon name="description-o" /></span>
    <span
      ><strong>跟着课本看同步课程</strong
      ><small>国家中小学智慧教育平台 · 按年级、上下册与单元查找</small
      ><SourceBadge source="local" label="目录快照 · 在线学习"
    /></span>
    <van-icon name="arrow" />
  </router-link>
  <section class="card study-tools">
    <h2>随手用的学习工具</h2>
    <div class="tools-grid">
      <router-link
        v-for="tool in tools"
        :key="tool.to"
        :to="tool.to"
        class="button"
        ><strong>{{ tool.name }}</strong
        ><small>{{ tool.hint }}</small></router-link
      >
    </div>
  </section>
  <div class="subject-grid">
    <button
      v-for="s in subjects"
      :key="s.id"
      class="subject-card"
      :class="{ chosen: subject === s.id }"
      :disabled="active"
      :aria-pressed="subject === s.id"
      @click="
        subject = s.id;
        finished = false;
        quiz = [];
      "
    >
      <span class="subject-letter" :style="{ background: s.color }">{{
        s.letter
      }}</span
      ><strong>{{ s.name }}</strong
      ><small>{{ s.description }}</small>
    </button>
  </div>
  <template v-if="!active && !finished"
    ><section class="card study-start">
      <div>
        <p class="eyebrow">SMALL STEPS, REAL PROGRESS</p>
        <h2>{{ subjectName }} · {{ grade }} 年级基础专项</h2>
        <div class="practice-sources">
          <SourceBadge source="local" label="自编基础练习" /><SourceBadge
            v-if="subject === 'math'"
            source="online"
            label="接口盒子 · 随机补充"
          />
        </div>
        <p class="muted">
          {{
            subject === "math"
              ? "优先获取 1 道在线综合题，其余按所选年级生成；在线题不分年级，答案看解析后自行核对，接口不可用时全部使用本地题"
              : "每轮混合基础题与词汇专项，包含拼音、词义或双向翻译；内容为本地自编，语文词汇为通用积累，英语按难度带组织，请结合课本练习"
          }}
        </p>
        <div class="chips">
          <button
            :class="{ selected: mode === 'practice' }"
            @click="mode = 'practice'"
          >
            基础练习</button
          ><button
            :class="{ selected: mode === 'review' }"
            @click="mode = 'review'"
          >
            错题复习 <span class="badge">{{ wrong.length }}</span>
          </button>
        </div>
        <div class="row-actions">
          <button
            class="primary"
            @click="start"
            :disabled="!store.ready || loading"
          >
            {{
              loading
                ? "正在准备题目…"
                : mode === "review"
                  ? "开始复习"
                  : "开始一组练习"
            }}
            <van-icon name="arrow" /></button
          ><button
            @click="
              act(() => {
                store.addStudyPlan(subjectName);
                showToast('已加入今日日程');
              })
            "
          >
            加入今天计划
          </button>
        </div>
      </div>
      <span class="study-decoration" aria-hidden="true">✦</span>
    </section>
  </template>
  <p v-if="loading" class="practice-notice muted" role="status">
    正在准备题目，在线查询最多等待 5 秒…
  </p>
  <p v-if="loadError" class="practice-notice error" role="alert">
    {{ loadError }}
  </p>
  <p v-if="loadNotice && !loading" class="practice-notice muted" role="status">
    {{ loadNotice }}
  </p>
  <section v-if="active && current" class="card quiz">
    <div class="section-head">
      <span class="badge">{{ current.topic }}</span
      ><button class="subtle" @click="end">结束本轮</button>
    </div>
    <div class="question-meta">
      <p class="muted">第 {{ position + 1 }} / {{ quiz.length }} 题</p>
      <SourceBadge
        :source="mode === 'review' ? 'local' : selfCheck ? 'online' : 'local'"
        :label="
          mode === 'review'
            ? selfCheck
              ? '错题记录 · 原题来自接口盒子'
              : '错题记录'
            : selfCheck
              ? '接口盒子'
              : '自编基础题'
        "
      />
    </div>
    <div class="progress-track">
      <span :style="{ width: `${(position / quiz.length) * 100}%` }"></span>
    </div>
    <h2>{{ current.prompt }}</h2>
    <p v-if="selfCheck" class="muted question-source">
      小学综合题，未按年级分级；请先作答，再参考答案与解析自行核对
    </p>
    <form
      @submit.prevent="submit()"
      @keydown.enter="if ($event.isComposing) $event.preventDefault();"
    >
      <div v-if="current.options" class="answer-options">
        <button
          v-for="(option, i) in current.options"
          :key="option"
          type="button"
          :class="{ chosen: answer === option }"
          :aria-pressed="answer === option"
          :disabled="!!submitted || selfCheckRevealed"
          @click="answer = option"
        >
          <span>{{ String.fromCharCode(65 + i) }}</span
          >{{ option }}
        </button>
      </div>
      <label v-else
        >你的答案<input
          v-model="answer"
          :disabled="!!submitted || selfCheckRevealed"
          :inputmode="subject === 'math' ? 'text' : 'text'"
          maxlength="200"
          autocomplete="off"
          placeholder="输入答案"
          enterkeyhint="done" /></label
      ><button
        v-if="!submitted && !selfCheckRevealed"
        type="submit"
        class="primary"
        :disabled="!answer.trim()"
      >
        {{ selfCheck ? "查看参考答案" : "提交答案" }}
      </button>
    </form>
    <div
      v-if="selfCheckRevealed && !submitted"
      class="feedback"
      aria-live="polite"
    >
      <strong>参考答案：{{ current.expected }}</strong>
      <p class="answer-explanation">{{ current.explanation }}</p>
      <p class="muted">核对自己的答案后记录结果；仅查看解析不会保存作答记录</p>
      <div class="row-actions">
        <button type="button" class="primary" @click="saveAnswer(true)">
          我答对了
        </button>
        <button type="button" @click="saveAnswer(false)">需要复习</button>
      </div>
    </div>
    <div
      v-if="submitted"
      class="feedback"
      :class="{ incorrect: !submitted.correct }"
      aria-live="polite"
    >
      <strong>{{
        selfCheck
          ? submitted.correct
            ? "已记录：自行核对答对"
            : "已加入错题复习"
          : submitted.correct
            ? "答对了，继续保持！"
            : "没关系，弄懂就有收获"
      }}</strong>
      <p>{{ selfCheck ? "参考答案" : "正确答案" }}：{{ current.expected }}</p>
      <p class="muted answer-explanation">{{ current.explanation }}</p>
      <button class="primary" @click="next">
        {{ position === quiz.length - 1 ? "查看本轮收获" : "下一题" }}
        <van-icon name="arrow" />
      </button>
    </div>
  </section>
  <section v-if="finished" class="card summary">
    <span class="summary-icon">✦</span>
    <h2>又积累了一点进步</h2>
    <p class="muted">
      本轮已保存 {{ results.length }} 条作答记录，答错的题会进入错题复习
    </p>
    <p v-if="selfCheckedCount" class="muted">
      其中 {{ selfCheckedCount }} 道在线题按自行核对结果统计
    </p>
    <div class="stat-grid">
      <div class="stat">
        <strong>{{ results.length }}</strong
        ><span>完成题目</span>
      </div>
      <div class="stat">
        <strong>{{ results.filter((a) => a.correct).length }}</strong
        ><span>答对题目</span>
      </div>
      <div class="stat">
        <strong
          >{{
            Math.round(
              (results.filter((a) => a.correct).length /
                Math.max(1, results.length)) *
                100,
            )
          }}%</strong
        ><span>本轮正确率</span>
      </div>
    </div>
    <div class="row-actions">
      <button
        @click="
          finished = false;
          quiz = [];
          cancelLoading();
        "
      >
        返回学科</button
      ><button class="primary" @click="start" :disabled="loading">
        {{ loading ? "正在准备题目…" : "再练一组" }}
      </button>
    </div>
  </section>
  <section v-if="!active && wrong.length" class="card" style="margin-top: 20px">
    <div class="section-head">
      <h2>这些题，再想一想</h2>
      <span class="badge">{{ wrong.length }} 道待复习</span>
    </div>
    <div v-for="a in wrong.slice(0, 5)" :key="a.questionId" class="review-row">
      <SourceBadge source="local" label="错题记录" /><strong>{{
        a.question
      }}</strong>
      <p class="muted">上次答案：{{ a.answer }}</p>
    </div>
  </section>
</template>
<style scoped>
.course-entry {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  color: var(--green);
  background: linear-gradient(110deg, #edf2e4, #f6efdf);
}
.course-entry > span:nth-child(2) {
  flex: 1;
  min-width: 0;
}
.course-entry strong,
.course-entry small {
  display: block;
}
.course-entry strong {
  font-size: 18px;
}
.course-entry small {
  margin-top: 6px;
  color: var(--muted);
  line-height: 1.7;
}
.course-entry-icon {
  font-size: 30px;
  flex-shrink: 0;
}
.practice-notice {
  margin: 16px 0;
  line-height: 1.8;
}
.question-source {
  margin-bottom: 16px;
  line-height: 1.8;
}
.answer-explanation {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.9;
}
.feedback {
  overflow-wrap: anywhere;
}
.study-tools {
  margin-bottom: 20px;
}
.tools-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}
.tools-grid .button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 14px;
  min-width: 0;
}
.tools-grid strong {
  font-size: 15px;
}
.tools-grid small {
  font-size: 12px;
  color: var(--muted);
}
@media (max-width: 600px) {
  .tools-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.grade-select {
  min-width: 130px;
}
.subject-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 22px;
}
.subject-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start !important;
  gap: 8px !important;
  padding: 22px !important;
  border: 1px solid var(--line) !important;
  background: var(--paper) !important;
  min-width: 0;
  text-align: left !important;
}
.subject-card.chosen {
  border-color: #6e9d83 !important;
  box-shadow: 0 0 0 2px #b9d1bc45;
}
.subject-letter {
  display: grid;
  place-items: center;
  font-size: 25px;
  width: 50px;
  height: 50px;
  border-radius: 15px;
  font-weight: 650;
}
.subject-card strong {
  font-size: 19px;
}
.subject-card small {
  font-size: 11px;
  color: var(--muted);
}
.study-start {
  position: relative;
  overflow: hidden;
  padding: 30px;
}
.study-start h2 {
  font-size: 24px;
  margin: 12px 0;
}
.study-start p {
  max-width: 500px;
}
.study-decoration {
  position: absolute;
  font-size: 140px;
  color: #e4ebd7;
  right: 20px;
  top: 20px;
  pointer-events: none;
  z-index: 0;
}
.study-start > div {
  position: relative;
  z-index: 1;
}
.calculator-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}
.calculator-link small {
  display: block;
  color: var(--muted);
  font-size: 12px;
}
.quiz {
  max-width: 750px;
  margin: auto;
}
.quiz h2 {
  font-size: 24px;
  margin: 28px 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.quiz form {
  display: grid;
  gap: 18px;
}
.answer-options {
  display: grid;
  gap: 10px;
}
.answer-options button {
  justify-content: flex-start;
  text-align: left;
  background: #f4f5ee;
  border: 1px solid transparent;
}
.answer-options button span {
  background: white;
  padding: 3px 10px;
  border-radius: 6px;
}
.answer-options button.chosen {
  border-color: var(--green);
  background: var(--pale);
}
.feedback {
  margin-top: 20px;
  border-radius: 16px;
  padding: 20px;
  background: #edf4e7;
  display: grid;
  gap: 12px;
}
.feedback.incorrect {
  background: #fff1df;
}
.summary {
  text-align: center;
  display: grid;
  gap: 22px;
  max-width: 750px;
  margin: auto;
}
.summary .row-actions {
  justify-content: center;
}
.summary-icon {
  font-size: 55px;
  color: #c6a568;
}
.review-row {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}
.review-row strong {
  font-size: 15px;
  font-weight: 500;
}
@media (max-width: 480px) {
  .subject-grid {
    gap: 8px;
  }
  .subject-card {
    padding: 14px 10px !important;
    gap: 6px !important;
  }
  .subject-card strong {
    font-size: 17px;
  }
  .subject-letter {
    height: 42px;
    width: 42px;
    font-size: 22px;
  }
  .subject-card small {
    font-size: 10px;
  }
  .study-start {
    padding: 22px;
  }
  .study-start h2 {
    font-size: 21px;
  }
  .study-decoration {
    opacity: 0.4;
  }
}
.practice-sources,
.question-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.practice-sources {
  margin: 12px 0;
}
.question-meta {
  justify-content: space-between;
  margin-bottom: 10px;
}
.course-entry .source-badge {
  margin-top: 8px;
}
.review-row > strong {
  display: block;
  margin-top: 8px;
}
@media (max-width: 480px) {
  .page-heading {
    flex-wrap: wrap;
  }
  .grade-select {
    width: 100%;
  }
}
</style>
