<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import AppSelect from "@/shared/components/AppSelect.vue";
import SourceBadge from "@/shared/components/SourceBadge.vue";
import type { CourseBook, CourseLesson } from "../services/courses";
import { findLessonGuide } from "../domain/lessonGuides";
import { openCourseSlides, poemsForLesson } from "../domain/openReadings";
import {
  loadNotesPack,
  loadOnlineNotes,
  NOTES_SOURCE,
  relatedTopics,
  type NotesPack,
  type ResearchNote,
} from "../services/learningNotes";

const props = defineProps<{
  book: CourseBook;
  lesson: CourseLesson;
  chapter: string;
}>();
const baseUrl = import.meta.env.BASE_URL;
const pack = ref<NotesPack>();
const busy = ref(false);
const error = ref("");
const onlineBusy = ref(false);
const onlineError = ref("");
const online = ref(new Map<string, ResearchNote>());
const selectedId = ref<string | number>("");
const tab = ref("notes");
const slideIndex = ref(0);
let localController: AbortController | undefined;
let onlineController: AbortController | undefined;
let localSequence = 0;
let onlineSequence = 0;
const guide = computed(() => findLessonGuide(props.book, props.lesson));
const poems = computed(() =>
  poemsForLesson(props.book, props.lesson, props.chapter, pack.value),
);
const related = computed(() =>
  pack.value
    ? relatedTopics(pack.value, props.book, props.lesson, props.chapter)
    : { label: "", topics: [] },
);
const options = computed(() =>
  [...(pack.value?.topics || [])]
    .sort((a, b) => {
      const score = (id: string, start: number, end: number) =>
        related.value.topics.some((topic) => topic.id === id)
          ? 0
          : props.book.grade >= start && props.book.grade <= end
            ? 1
            : 2;
      return (
        score(a.id, a.gradeStart, a.gradeEnd) -
        score(b.id, b.gradeStart, b.gradeEnd)
      );
    })
    .map((topic) => ({
      value: topic.id,
      label: topic.title,
      description: `${topic.gradeStart === topic.gradeEnd ? topic.gradeStart : `${topic.gradeStart}～${topic.gradeEnd}`} 年级${related.value.topics.some((item) => item.id === topic.id) ? " · 当前课程相关参考" : " · 自选拓展"}`,
    })),
);
const selected = computed(() =>
  pack.value?.topics.find((topic) => topic.id === selectedId.value),
);
const note = computed(
  () =>
    selected.value &&
    (online.value.get(selected.value.id) || selected.value.note),
);
const source = computed(() =>
  selected.value && online.value.has(selected.value.id) ? "online" : "local",
);
const tabs = [
  { id: "notes", label: "学习笔记" },
  { id: "points", label: "重点易错" },
  { id: "practice", label: "课后自测" },
  { id: "slides", label: "演示卡片" },
];
const courseSlides = computed(
  () => selected.value && openCourseSlides(selected.value.id),
);
const slides = computed(
  () =>
    courseSlides.value ||
    (selected.value
      ? [
          {
            title: selected.value.title,
            body: note.value?.summary || selected.value.description,
          },
          {
            title: "学习目标",
            body: (
              selected.value.course?.objectives || selected.value.goals
            ).join("\n"),
          },
          ...(note.value?.activities || []).map((activity, index) => ({
            title: `动手学习 ${index + 1}`,
            body: `${activity.action}\n\n${activity.insight}`,
          })),
          ...(note.value?.errors.length
            ? [{ title: "提醒自己", body: note.value.errors.join("\n") }]
            : []),
          ...(note.value
            ? [{ title: "试着独立完成", body: note.value.task }]
            : []),
        ]
      : []),
);

async function load() {
  localController?.abort();
  onlineController?.abort();
  onlineSequence++;
  onlineBusy.value = false;
  onlineError.value = "";
  online.value = new Map();
  const token = ++localSequence;
  localController = new AbortController();
  pack.value = undefined;
  busy.value = true;
  error.value = "";
  try {
    const next = await loadNotesPack(
      props.book.subject,
      localController.signal,
    );
    if (token === localSequence) pack.value = next;
  } catch (cause) {
    if (token === localSequence)
      error.value =
        cause instanceof Error ? cause.message : "学习笔记暂时无法读取";
  } finally {
    if (token === localSequence) busy.value = false;
  }
}
async function fetchOnline() {
  if (!pack.value || onlineBusy.value) return;
  const current = pack.value;
  const token = ++onlineSequence;
  onlineController?.abort();
  onlineController = new AbortController();
  onlineBusy.value = true;
  onlineError.value = "";
  try {
    const next = await loadOnlineNotes(current, onlineController.signal);
    if (token === onlineSequence && pack.value === current) online.value = next;
  } catch (cause) {
    if (token === onlineSequence)
      onlineError.value = `${cause instanceof Error ? cause.message : "在线读取失败"}，继续显示本地快照`;
  } finally {
    if (token === onlineSequence) onlineBusy.value = false;
  }
}
watch(() => props.book.subject, load, { immediate: true });
watch([() => props.book.id, () => props.lesson.id, pack], () => {
  selectedId.value = related.value.topics[0]?.id || "";
  tab.value = "notes";
});
watch([selectedId, tab], () => (slideIndex.value = 0));
onBeforeUnmount(() => {
  localSequence++;
  onlineSequence++;
  localController?.abort();
  onlineController?.abort();
});
</script>

<template>
  <section class="learning-notes" aria-label="课后笔记与重点">
    <div class="notes-heading">
      <div>
        <p class="eyebrow">READ & REVIEW</p>
        <h3>课后笔记与重点</h3>
      </div>
      <SourceBadge source="local" label="知识点索引" />
    </div>
    <article v-if="guide" class="lesson-guide">
      <div class="guide-title">
        <h4>《{{ guide.title }}》复习提纲</h4>
        <SourceBadge source="local" label="本站整理" />
      </div>
      <p>{{ guide.summary }}</p>
      <ol>
        <li v-for="point in guide.points" :key="point">{{ point }}</li>
      </ol>
      <p class="guide-task"><strong>课后试一试</strong>{{ guide.task }}</p>
      <small
        >辅助复习提纲，请结合当前课本核对；不是官方讲义，也不包含课文全文</small
      >
    </article>
    <details v-if="poems.length" class="poem-readings" open>
      <summary>古诗原文 · 已匹配 {{ poems.length }} 首</summary>
      <article v-for="poem in poems" :key="poem.title">
        <div class="guide-title">
          <h4>{{ poem.title }}</h4>
          <SourceBadge source="local" label="古诗原作" />
        </div>
        <p class="poem-author">{{ poem.author }}</p>
        <p
          v-for="(paragraph, index) in poem.paragraphs"
          :key="index"
          class="poem-line"
        >
          {{ paragraph }}
        </p>
      </article>
      <p class="notes-credit">
        来自 chinese-poetry（JackeyGao
        等贡献者，MIT），唐代原作已进入公有领域；保留资料原字形、标点与异文，可能与课本不同。仅显示已匹配的古诗，不代表整课全文<br /><a
          :href="`${baseUrl}courses/notes/v1/OPEN-READINGS.md`"
          target="_blank"
          rel="noopener noreferrer"
          >古诗与开源课件来源</a
        >
      </p>
    </details>
    <p v-if="busy" class="empty" role="status">正在打开学习笔记…</p>
    <div v-else-if="error" class="notes-error" role="alert">
      {{ error }} <button type="button" @click="load">重试读取</button>
    </div>
    <template v-else-if="pack">
      <p class="match-note">{{ related.label }}</p>
      <AppSelect
        v-model="selectedId"
        label="选择知识点"
        :options="options"
        placeholder="选择要阅读的知识点"
      />
      <template v-if="selected">
        <div class="topic-source">
          <SourceBadge :source="source" label="学阶图谱笔记" /><span
            >{{
              selected.gradeStart === selected.gradeEnd
                ? selected.gradeStart
                : `${selected.gradeStart}～${selected.gradeEnd}`
            }}
            年级参考</span
          >
        </div>
        <p class="research-notice">
          开放知识点笔记由上游 AI
          撰写、未经实证验证，部分内容面向家长；不代表本课官方解析，请结合教材核对
        </p>
        <div class="notes-tabs" role="group" aria-label="笔记内容">
          <button
            v-for="item in tabs"
            :key="item.id"
            type="button"
            :aria-pressed="tab === item.id"
            :class="{ active: tab === item.id }"
            @click="tab = item.id"
          >
            {{ item.label }}
          </button>
        </div>
        <article class="topic-content" aria-live="polite">
          <template v-if="tab === 'notes'"
            ><h4>{{ selected.title }}</h4>
            <p>{{ note?.summary || selected.description }}</p>
            <h5>怎么理解</h5>
            <p>{{ note?.explanation || selected.description }}</p></template
          >
          <template v-else-if="tab === 'points'"
            ><h4>学习重点 <SourceBadge source="local" label="学习目标" /></h4>
            <ul>
              <li v-for="goal in selected.goals" :key="goal">{{ goal }}</li>
            </ul>
            <template v-if="note?.errors.length"
              ><h5>容易出错的地方</h5>
              <ul>
                <li v-for="item in note.errors" :key="item">{{ item }}</li>
              </ul></template
            ></template
          >
          <template v-else-if="tab === 'practice'"
            ><template v-if="note"
              ><h4>课后自测</h4>
              <p>{{ note.task }}</p>
              <details>
                <summary>展开自查提示</summary>
                <ul>
                  <li v-for="item in note.checks" :key="item">{{ item }}</li>
                </ul>
              </details>
              <h5>接下来可以练什么</h5>
              <ul>
                <li v-for="item in note.next" :key="item">{{ item }}</li>
              </ul></template
            >
            <p v-else>该知识点暂无补充自测，可先按学习重点回顾</p></template
          >
          <template v-else-if="slides[slideIndex]"
            ><p class="slide-caption">
              {{
                courseSlides
                  ? "学阶图谱开源课件阅读版 · 互动内容改为纸面练习"
                  : "根据开放笔记整理的演示卡片 · 非教材原版 PPT"
              }}
              <SourceBadge
                v-if="courseSlides"
                source="local"
                label="课件内容"
              />
            </p>
            <div class="note-slide">
              <small>{{ slideIndex + 1 }} / {{ slides.length }}</small>
              <h4>{{ slides[slideIndex].title }}</h4>
              <p>{{ slides[slideIndex].body }}</p>
            </div>
            <div class="slide-controls">
              <button
                type="button"
                :disabled="slideIndex === 0"
                @click="slideIndex--"
              >
                上一页</button
              ><button
                type="button"
                :disabled="slideIndex === slides.length - 1"
                @click="slideIndex++"
              >
                下一页
              </button>
            </div></template
          >
        </article>
        <div class="online-actions">
          <button
            type="button"
            :disabled="onlineBusy || !!online.size"
            @click="fetchOnline"
          >
            {{
              onlineBusy
                ? "正在在线读取…"
                : online.size
                  ? "已读取在线笔记"
                  : "在线读取同版笔记"
            }}</button
          ><span>主动读取上游约 3 MB 数据，最多等待 10 秒</span>
        </div>
        <p v-if="onlineError" class="notes-error" role="status">
          {{ onlineError }}
        </p>
      </template>
      <p class="notes-credit">
        资料来自
        <a :href="NOTES_SOURCE" target="_blank" rel="noopener noreferrer"
          >学阶图谱</a
        >（goralcao 等贡献者） · 原创文字 CC BY-SA 4.0 · 数据结构 ODbL 1.0<br />本站按小学学科拆分并整理演示卡片，保留同许可；<a
          :href="`${baseUrl}courses/notes/v1/SOURCE.md`"
          target="_blank"
          rel="noopener noreferrer"
          >来源、版本与许可证</a
        >
      </p>
    </template>
    <p v-if="!poems.length" class="fulltext-note">
      该开放资料源未提供《{{
        lesson.title
      }}》的教材全文或原版课件，不能将这些知识点笔记当作课文原文
    </p>
  </section>
</template>

<style scoped>
.learning-notes {
  margin: 22px 0;
  padding-top: 22px;
  border-top: 1px solid var(--line);
}
.notes-heading,
.guide-title,
.topic-source {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}
.notes-heading h3 {
  font-size: 20px;
  margin-top: 3px;
}
.lesson-guide {
  margin: 18px 0;
  padding: 18px;
  border: 1px solid #dbe7d7;
  border-radius: 16px;
  background: #f2f6eb;
}
.lesson-guide h4,
.topic-content h4 {
  font-size: 17px;
  line-height: 1.6;
}
.lesson-guide p {
  margin-top: 12px;
}
.lesson-guide,
.topic-content {
  font-size: 14px;
  line-height: 1.9;
  overflow-wrap: anywhere;
}
.lesson-guide small {
  display: block;
  color: var(--muted);
  font-size: 11px;
  margin-top: 14px;
}
.guide-task {
  padding-top: 14px;
  border-top: 1px dashed #ccd9c3;
}
.guide-task strong {
  display: block;
  color: var(--green);
  margin-bottom: 4px;
}
ul,
ol {
  padding-left: 22px;
  margin: 12px 0;
}
li + li {
  margin-top: 8px;
}
.match-note {
  color: var(--muted);
  font-size: 12px;
  margin: 18px 0 12px;
}
.topic-source {
  justify-content: flex-start;
  margin: 14px 0 10px;
  color: var(--muted);
  font-size: 12px;
}
.research-notice {
  font-size: 12px;
  color: #846234;
  background: #faf5e9;
  border-radius: 10px;
  padding: 12px;
}
.notes-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
  padding: 5px;
  margin: 16px 0;
  background: #edf1e8;
  border-radius: 12px;
}
.aide-app .notes-tabs button {
  min-width: 0;
  padding: 8px 2px;
  border-radius: 8px;
  font-size: 12px;
  background: transparent;
}
.aide-app .notes-tabs button.active {
  background: var(--paper);
  color: var(--green);
  box-shadow: 0 2px 6px #25412b0a;
}
.topic-content {
  padding: 18px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
}
.topic-content p {
  margin-top: 12px;
  white-space: pre-line;
}
.topic-content h5 {
  font-size: 14px;
  margin-top: 20px;
  color: var(--green);
}
.topic-content summary {
  cursor: pointer;
  padding: 14px 0;
  color: var(--green);
}
.slide-caption {
  color: var(--muted);
  font-size: 11px;
  margin: 0 0 12px !important;
}
.note-slide {
  min-height: 230px;
  padding: 22px;
  background: linear-gradient(140deg, #edf4e4, #fff8e8);
  border-radius: 12px;
}
.note-slide small {
  color: var(--muted);
}
.note-slide h4 {
  margin-top: 16px;
}
.slide-controls {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}
.online-actions {
  margin-top: 16px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.online-actions button {
  font-size: 12px;
}
.online-actions span,
.notes-credit,
.fulltext-note {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.9;
}
.notes-credit,
.fulltext-note {
  margin-top: 16px;
}
.notes-credit a {
  text-decoration: underline;
}
.poem-readings {
  margin: 18px 0;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fffdf7;
}
.poem-readings summary {
  cursor: pointer;
  color: var(--green);
  font-size: 14px;
  font-weight: 600;
}
.poem-readings article {
  padding-top: 18px;
}
.poem-readings article + article {
  border-top: 1px solid var(--line);
  margin-top: 18px;
}
.poem-author {
  margin: 8px 0 14px;
  font-size: 12px;
  color: var(--muted);
}
.poem-line {
  font-size: 16px;
  line-height: 2;
  overflow-wrap: anywhere;
}
.notes-error {
  margin-top: 14px;
  color: #9c553e;
  font-size: 12px;
  line-height: 1.8;
}
@media (max-width: 360px) {
  .notes-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .lesson-guide,
  .topic-content {
    padding: 14px;
  }
}
</style>
