<script setup lang="ts">
import SourceBadge from "@/shared/components/SourceBadge.vue";
import CourseLearningNotes from "./CourseLearningNotes.vue";
import { lessonUrl } from "../services/courses";
import type { CourseBook, CourseLesson } from "../services/courses";

defineProps<{
  lesson: CourseLesson;
  book: CourseBook;
  chapter: string;
  canPlan: boolean;
}>();
defineEmits<{ (event: "plan"): void }>();
</script>

<template>
  <section class="lesson-details">
    <p class="eyebrow">ONE LESSON AT A TIME</p>
    <h2 id="course-detail-title">{{ lesson.title }}</h2>
    <div class="detail-sources">
      <SourceBadge source="local" label="课程信息" /><SourceBadge
        source="online"
        label="官网学习"
      />
    </div>
    <CourseLearningNotes :book="book" :lesson="lesson" :chapter="chapter" />
    <dl>
      <div>
        <dt>所属教材</dt>
        <dd>{{ book.title }}</dd>
      </div>
      <div>
        <dt>教材版本</dt>
        <dd>{{ book.edition }} · {{ book.revision }}</dd>
      </div>
      <div>
        <dt>单元章节</dt>
        <dd>{{ chapter }}</dd>
      </div>
      <div>
        <dt>课程来源</dt>
        <dd>国家中小学智慧教育平台</dd>
      </div>
    </dl>
    <div class="learning-guide">
      <van-icon name="play-circle-o" aria-hidden="true" />
      <div>
        <strong>到官网看这节课</strong>
        <p>官方视频和原版课件以官网实际提供为准，部分课程需要登录官方账号</p>
      </div>
    </div>
    <div class="row-actions">
      <a
        class="button primary"
        :href="lessonUrl(lesson)"
        target="_blank"
        rel="noopener noreferrer"
        referrerpolicy="no-referrer"
        >在线学习这节课 <van-icon name="share-o"
      /></a>
      <button :disabled="!canPlan" @click="$emit('plan')">
        <van-icon name="calendar-o" />加入今天计划
      </button>
    </div>
    <p class="detail-note">
      课程信息来自已同步的本地目录快照，本站不嵌入官方视频；学完后可回到日程勾选完成
    </p>
  </section>
</template>

<style scoped>
.lesson-details {
  max-width: 680px;
  max-height: min(85dvh, calc(var(--aide-visible-height, 100dvh) - 24px));
  overflow: auto;
  margin: auto;
  padding: 28px 22px calc(26px + env(safe-area-inset-bottom, 0px));
}
.lesson-details h2 {
  font-size: 24px;
  line-height: 1.6;
  margin: 12px 30px 14px 0;
  overflow-wrap: anywhere;
}
.detail-sources {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
dl {
  margin: 22px 0;
}
dl > div {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
dt {
  color: var(--muted);
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.learning-guide {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--pale);
  border-radius: 14px;
  margin-bottom: 20px;
}
.learning-guide > .van-icon {
  font-size: 24px;
  color: var(--green);
}
.learning-guide strong {
  font-size: 14px;
}
.learning-guide p,
.detail-note {
  font-size: 12px;
  line-height: 1.9;
  color: var(--muted);
}
.learning-guide p {
  margin-top: 6px;
}
.detail-note {
  margin-top: 16px;
}
.row-actions > * {
  flex: 1;
  font-size: 13px;
}
@media (max-width: 400px) {
  .row-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
