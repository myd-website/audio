<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showToast } from "vant";
import { useWorkspaceStore } from "@/shared/stores/workspace";
import { act, message } from "@/shared/lib/feedback";
import type { Subject } from "@/shared/lib/workspace";
import SourceBadge from "@/shared/components/SourceBadge.vue";
import CourseFilters from "../components/CourseFilters.vue";
import CourseLessonDetails from "../components/CourseLessonDetails.vue";
import LearningResources from "../components/LearningResources.vue";
import {
  SMARTEDU_HOME,
  bookUrl,
  coursePlan,
  filterLessons,
  lessonUrl,
  loadCourseCatalog,
  loadCourseDetails,
  selectBooks,
} from "../services/courses";
import type {
  CourseCatalog,
  CourseDetails,
  CourseLesson,
  CourseVolume,
} from "../services/courses";

const route = useRoute(),
  router = useRouter(),
  store = useWorkspaceStore();
const subjects = [
  {
    id: "chinese" as const,
    name: "语文",
    mark: "文",
    hint: "统编版",
    color: "#f4e7ce",
  },
  {
    id: "math" as const,
    name: "数学",
    mark: "数",
    hint: "人教版",
    color: "#e3ecd9",
  },
  {
    id: "english" as const,
    name: "英语",
    mark: "En",
    hint: "人教各版本",
    color: "#e0e9f1",
  },
];
const subject = computed<Subject>(() =>
  subjects.some((item) => item.id === route.query.subject)
    ? (route.query.subject as Subject)
    : "chinese",
);
const grade = computed(() =>
  typeof route.query.grade === "string" && /^[1-6]$/.test(route.query.grade)
    ? Number(route.query.grade)
    : store.data.preferences.grade,
);
const volume = computed<CourseVolume>(() =>
  route.query.volume === "lower" ? "lower" : "upper",
);
const catalog = ref<CourseCatalog>(),
  details = ref<CourseDetails>();
const catalogBusy = ref(false),
  detailsBusy = ref(false);
const catalogError = ref(""),
  detailsError = ref("");
const selectedLesson = ref<CourseLesson>();
const searchInput = ref<HTMLInputElement>();
const chapterId = ref(""),
  keyword = ref(""),
  visible = ref(20);
let catalogController: AbortController | undefined,
  detailController: AbortController | undefined;
let catalogSequence = 0,
  detailSequence = 0;
const books = computed(() =>
  catalog.value
    ? selectBooks(catalog.value, subject.value, grade.value, volume.value)
    : [],
);
const selectedBook = computed(
  () =>
    books.value.find((book) => book.id === route.query.book) ?? books.value[0],
);
const units = computed(() => details.value?.chapters ?? []);
const lessons = computed(() =>
  details.value
    ? filterLessons(details.value, chapterId.value, keyword.value)
    : [],
);
const subjectName = computed(
  () => subjects.find((item) => item.id === subject.value)!.name,
);
const updatedAt = computed(() =>
  catalog.value
    ? new Date(catalog.value.syncedAt).toLocaleDateString("zh-CN", {
        timeZone: "Asia/Shanghai",
      })
    : "",
);
const resourceNames = {
  national_lesson: "同步课堂",
  elite_lesson: "精品课程",
  teaching_lesson: "教学课程",
};

function changeFilter(patch: Record<string, string | undefined>) {
  const query = { ...route.query, ...patch };
  if ("subject" in patch || "grade" in patch || "volume" in patch)
    delete query.book;
  void router.replace({ path: "/study/courses", query });
}
async function loadCatalog() {
  catalogController?.abort();
  const token = ++catalogSequence;
  catalogController = new AbortController();
  catalogBusy.value = true;
  catalogError.value = "";
  try {
    const next = await loadCourseCatalog(catalogController.signal);
    if (token === catalogSequence) catalog.value = next;
  } catch (cause) {
    if (token === catalogSequence) catalogError.value = message(cause);
  } finally {
    if (token === catalogSequence) catalogBusy.value = false;
  }
}
async function loadDetails() {
  detailController?.abort();
  const token = ++detailSequence,
    book = selectedBook.value;
  details.value = undefined;
  selectedLesson.value = undefined;
  detailsError.value = "";
  detailsBusy.value = false;
  chapterId.value = "";
  keyword.value = "";
  visible.value = 20;
  if (!book) return;
  detailController = new AbortController();
  detailsBusy.value = true;
  try {
    const next = await loadCourseDetails(book, detailController.signal);
    // 切换教材或离开页面后，迟到响应不得覆盖当前的课程目录。
    if (token === detailSequence) details.value = next;
  } catch (cause) {
    if (token === detailSequence) detailsError.value = message(cause);
  } finally {
    if (token === detailSequence) detailsBusy.value = false;
  }
}
function chapterLabel(lesson: CourseLesson) {
  return (
    details.value?.chapters.find((chapter) =>
      lesson.chapterIds.includes(chapter.id),
    )?.title || "本册课程"
  );
}
function addPlan(lesson: CourseLesson) {
  const book = selectedBook.value;
  if (!book || !details.value?.lessons.some((item) => item.id === lesson.id))
    return;
  if (
    act(() =>
      store.commit((next) =>
        next.tasks.unshift(coursePlan(book, lesson, next.tasks)),
      ),
    )
  )
    showToast("已加入今天的学习计划");
}
watch(() => selectedBook.value?.file, loadDetails);
watch([chapterId, keyword], () => {
  visible.value = 20;
});
onMounted(loadCatalog);
onBeforeUnmount(() => {
  catalogSequence++;
  detailSequence++;
  catalogController?.abort();
  detailController?.abort();
});
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">FOLLOW YOUR BOOK, FIND YOUR LESSON</p>
      <h1>跟着课本，一课一课学</h1>
      <p class="muted">选好年级与教材，把课堂上的知识再听懂一点</p>
    </div>
    <router-link class="button" to="/study">返回学习</router-link>
  </div>
  <section class="course-hero">
    <div>
      <SourceBadge source="online" label="国家中小学智慧教育平台" />
      <h2>找到和课本对应的课程</h2>
      <p>
        选课本、找章节，打开对应课程开始学
        <span class="hero-description"
          >语文统编版 · 数学人教版 · 英语保留各人教版本</span
        >
      </p>
      <a
        class="button"
        :href="SMARTEDU_HOME"
        target="_blank"
        rel="noopener noreferrer"
        referrerpolicy="no-referrer"
        >打开官方课程平台 <van-icon name="share-o"
      /></a>
    </div>
    <span class="hero-book" aria-hidden="true">书<span>一课一收获</span></span>
  </section>
  <nav class="course-subjects" aria-label="课程学科">
    <button
      v-for="item in subjects"
      :key="item.id"
      :aria-pressed="subject === item.id"
      :class="{ selected: subject === item.id }"
      @click="changeFilter({ subject: item.id })"
    >
      <span class="subject-mark" :style="{ background: item.color }">{{
        item.mark
      }}</span>
      <span
        ><strong>{{ item.name }}</strong
        ><small>{{ item.hint }}</small></span
      >
      <van-icon v-if="subject === item.id" name="checked" />
    </button>
  </nav>
  <div v-if="catalogError" class="card load-error" role="alert">
    <p>{{ catalogError }}</p>
    <button @click="loadCatalog" :disabled="catalogBusy">重新加载目录</button>
  </div>
  <p v-if="catalogBusy" class="empty" role="status">正在准备课程目录…</p>
  <div v-if="catalog" class="course-layout">
    <CourseFilters
      :grade="grade"
      :volume="volume"
      :subject="subject"
      :books="books"
      :book-id="selectedBook?.id || ''"
      :units="units"
      v-model:chapter-id="chapterId"
      :busy="detailsBusy"
      :updated-at="updatedAt"
      @change="changeFilter"
    />
    <main class="course-results" :aria-busy="detailsBusy">
      <div class="results-heading">
        <div>
          <p class="eyebrow">
            {{ grade }} 年级 · {{ volume === "upper" ? "上册" : "下册" }} ·
            {{ subjectName }}
          </p>
          <h2>{{ selectedBook?.title || "这一册暂未收录" }}</h2>
          <p v-if="details" class="muted" aria-live="polite">
            找到 {{ lessons.length }} 节课程<span v-if="chapterId || keyword">
              · 本册共 {{ details.lessons.length }} 节</span
            >
          </p>
        </div>
        <a
          v-if="selectedBook"
          class="button subtle"
          :href="bookUrl(selectedBook)"
          target="_blank"
          rel="noopener noreferrer"
          referrerpolicy="no-referrer"
          >官网查看本册 <van-icon name="arrow"
        /></a>
      </div>
      <form
        v-if="selectedBook"
        class="course-search"
        role="search"
        aria-label="课程搜索"
        @submit.prevent="searchInput?.blur()"
        @keydown.enter="if ($event.isComposing) $event.preventDefault();"
      >
        <input
          ref="searchInput"
          v-model="keyword"
          type="search"
          maxlength="80"
          enterkeyhint="search"
          placeholder="搜课文、知识点或课程名称"
          aria-label="搜索当前教材的课程"
          :disabled="detailsBusy"
        />
        <button class="primary" type="submit" :disabled="detailsBusy">
          <van-icon name="search" aria-hidden="true" />搜索
        </button>
      </form>
      <p class="muted learning-note">
        查看课程可读站内笔记、重点与自测 · 官方视频仍在官网学习
      </p>
      <details v-if="details?.chapters.length" class="book-outline card">
        <summary>
          查看本册教材目录 <span>{{ details.chapters.length }} 个章节</span
          ><van-icon name="arrow-down" />
        </summary>
        <div class="outline-list">
          <button
            v-for="chapter in details.chapters"
            :key="chapter.id"
            type="button"
            :class="{
              child: chapter.parentId,
              chosen: chapterId === chapter.id,
            }"
            :aria-pressed="chapterId === chapter.id"
            @click="chapterId = chapterId === chapter.id ? '' : chapter.id"
          >
            <span>{{ chapter.title }}</span
            ><van-icon :name="chapterId === chapter.id ? 'checked' : 'arrow'" />
          </button>
        </div>
      </details>
      <div v-if="detailsError" class="card load-error" role="alert">
        <p>{{ detailsError }}</p>
        <button @click="loadDetails">重试加载本册</button>
      </div>
      <div v-else-if="detailsBusy" class="course-skeleton" role="status">
        <span>正在整理本册课程…</span>
        <div v-for="n in 3" :key="n"></div>
      </div>
      <div
        v-else-if="!selectedBook || (details && !lessons.length)"
        class="card empty course-empty"
      >
        <van-icon name="notes-o" />
        <h3>
          {{
            keyword || chapterId
              ? "换个关键词或单元试试"
              : "这本书暂时没有可展示的课程"
          }}
        </h3>
        <p>
          {{
            keyword || chapterId
              ? "当前筛选条件下没有匹配课程"
              : "可以调整教材版本，或前往官方平台查找完整资源"
          }}
        </p>
        <button
          v-if="keyword || chapterId"
          @click="
            keyword = '';
            chapterId = '';
          "
        >
          查看本册全部课程
        </button>
      </div>
      <div v-else-if="details" class="lesson-list">
        <article
          v-for="(lesson, index) in lessons.slice(0, visible)"
          :key="lesson.id"
          class="card lesson-card"
        >
          <span class="lesson-number" aria-hidden="true">{{
            String(index + 1).padStart(2, "0")
          }}</span>
          <div class="lesson-content">
            <div class="lesson-meta">
              <SourceBadge
                source="local"
                :label="resourceNames[lesson.type]"
              /><span>{{ chapterLabel(lesson) }}</span>
            </div>
            <h3>{{ lesson.title }}</h3>
            <div class="row-actions">
              <button
                class="primary"
                type="button"
                @click="selectedLesson = lesson"
              >
                查看课程
              </button>
              <a
                class="button"
                :href="lessonUrl(lesson)"
                target="_blank"
                rel="noopener noreferrer"
                referrerpolicy="no-referrer"
                ><van-icon name="play-circle-o" />在线学习
                <van-icon name="share-o"
              /></a>
              <button :disabled="!store.ready" @click="addPlan(lesson)">
                <van-icon name="calendar-o" />加入今天计划
              </button>
            </div>
          </div>
        </article>
        <button
          v-if="visible < lessons.length"
          class="show-more"
          @click="visible += 20"
        >
          再看 {{ Math.min(20, lessons.length - visible) }} 节课程
          <van-icon name="arrow-down" />
        </button>
      </div>
    </main>
  </div>
  <LearningResources />
  <van-popup
    :show="!!selectedLesson"
    position="bottom"
    round
    closeable
    teleport=".aide-app"
    aria-labelledby="course-detail-title"
    @update:show="if (!$event) selectedLesson = undefined;"
  >
    <CourseLessonDetails
      v-if="selectedLesson && selectedBook"
      :lesson="selectedLesson"
      :book="selectedBook"
      :chapter="chapterLabel(selectedLesson)"
      :can-plan="store.ready"
      @plan="addPlan(selectedLesson)"
    />
  </van-popup>
</template>

<style scoped>
.page-heading {
  flex-wrap: wrap;
}
.page-heading > .button {
  flex-shrink: 0;
  white-space: nowrap;
}
.course-hero {
  display: flex;
  align-items: center;
  gap: 24px;
  justify-content: space-between;
  padding: 28px 32px;
  border-radius: 24px;
  background: linear-gradient(120deg, #edf2e4, #f5ecd9);
  margin-bottom: 22px;
  overflow: hidden;
}
.hero-description {
  display: block;
  font-size: 12px;
  margin-top: 6px;
}
.course-hero > div {
  max-width: 650px;
}
.course-hero h2 {
  font-size: 26px;
  margin: 14px 0 10px;
}
.course-hero p {
  line-height: 1.9;
  color: var(--muted);
  margin-bottom: 18px;
}
.hero-book {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  width: 136px;
  height: 158px;
  flex-shrink: 0;
  border: 1px solid #c6d4b8;
  border-left: 8px solid #9cb58d;
  border-radius: 6px 18px 18px 6px;
  color: var(--green);
  font-size: 42px;
  background: #f9fbf4;
  box-shadow: 6px 8px 0 #dce5d2;
  transform: rotate(7deg);
}
.hero-book span {
  font-size: 12px;
  letter-spacing: 2px;
}
.course-subjects {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.course-subjects button {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  padding: 16px;
  text-align: left;
  min-width: 0;
}
.course-subjects button.selected {
  border-color: var(--green);
  background: var(--pale);
}
.subject-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  font-size: 22px;
  flex-shrink: 0;
  color: var(--green);
}
.course-subjects strong,
.course-subjects small {
  display: block;
}
.course-subjects small {
  font-size: 11px;
  color: var(--muted);
  margin-top: 4px;
}
.course-subjects .van-icon {
  margin-left: auto;
  color: var(--green);
}
.course-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  align-items: start;
  gap: 22px;
}
.course-results {
  min-width: 0;
}
.results-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}
.results-heading h2 {
  font-size: 22px;
  line-height: 1.5;
  margin: 6px 0;
  overflow-wrap: anywhere;
}
.results-heading > .button {
  flex-shrink: 0;
  font-size: 12px;
}
.course-search {
  /* 输入框独占可收缩列，按钮不再叠在文字上。 */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}
.course-search input {
  width: 100%;
  min-width: 0;
}
.course-search button {
  white-space: nowrap;
}
.learning-note {
  font-size: 12px;
  line-height: 1.8;
  margin: 12px 0 20px;
}
.lesson-list {
  display: grid;
  gap: 14px;
}
.lesson-card {
  display: flex;
  gap: 16px;
  padding: 22px;
  animation: course-enter 0.28s ease-out;
}
.lesson-number {
  padding-top: 4px;
  font-size: 23px;
  color: #9aac90;
  font-variant-numeric: tabular-nums;
}
.lesson-content {
  flex: 1;
  min-width: 0;
}
.lesson-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 11px;
}
.lesson-meta > span:last-child {
  overflow-wrap: anywhere;
}
.lesson-card h3 {
  font-size: 18px;
  line-height: 1.7;
  margin: 12px 0 16px;
  overflow-wrap: anywhere;
}
.lesson-card .row-actions {
  gap: 10px;
}
.lesson-card .button,
.lesson-card button {
  font-size: 12px;
}
.show-more {
  width: 100%;
  background: transparent;
}
.load-error {
  margin: 18px 0;
}
.load-error p {
  color: #a14b3c;
  margin-bottom: 14px;
}
.course-empty h3 {
  color: var(--green);
  margin-bottom: 10px;
}
.course-empty p {
  font-size: 13px;
  line-height: 1.8;
}
.course-skeleton {
  display: grid;
  gap: 14px;
  color: var(--muted);
}
.course-skeleton > div {
  height: 160px;
  border-radius: 18px;
  background: linear-gradient(100deg, #edf0e6 25%, #f8faf4 50%, #edf0e6 75%);
  background-size: 200% 100%;
  animation: course-loading 1.5s linear infinite;
}
@keyframes course-enter {
  from {
    opacity: 0;
    transform: translateY(7px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes course-loading {
  to {
    background-position: -200% 0;
  }
}
@media (max-width: 760px) {
  .course-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .course-hero {
    padding: 24px;
  }
  .hero-book {
    width: 100px;
    height: 130px;
  }
  .results-heading {
    flex-wrap: wrap;
  }
}
@media (max-width: 480px) {
  .hero-book {
    display: none;
  }
  .course-hero h2 {
    font-size: 23px;
  }
  .course-subjects {
    gap: 8px;
  }
  .course-subjects button {
    padding: 12px 6px;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }
  .course-subjects .van-icon {
    display: none;
  }
  .lesson-card {
    padding: 18px 14px;
    gap: 10px;
  }
  .lesson-number {
    font-size: 18px;
  }
  .lesson-card h3 {
    font-size: 17px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lesson-card,
  .course-skeleton > div {
    animation: none;
  }
}
.book-outline {
  margin-bottom: 18px;
  padding: 16px;
}
.book-outline summary {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  list-style: none;
}
.book-outline summary::-webkit-details-marker {
  display: none;
}
.book-outline summary > span {
  color: var(--muted);
  font-size: 11px;
  margin-left: auto;
}
.outline-list {
  display: grid;
  gap: 4px;
  margin-top: 14px;
  max-height: 340px;
  overflow: auto;
}
.aide-app .outline-list button {
  justify-content: space-between;
  text-align: left;
  background: transparent;
  padding: 10px;
  font-size: 13px;
}
.aide-app .outline-list button.child {
  padding-left: 24px;
  color: var(--muted);
  font-size: 12px;
}
.aide-app .outline-list button.chosen {
  color: var(--green);
  background: var(--pale);
}
.outline-list .van-icon {
  flex-shrink: 0;
}
@media (max-width: 760px) {
  .course-layout {
    gap: 24px;
  }
}
</style>
