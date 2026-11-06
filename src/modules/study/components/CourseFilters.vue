<script setup lang="ts">
import { computed } from "vue";
import AppSelect from "@/shared/components/AppSelect.vue";
import SourceBadge from "@/shared/components/SourceBadge.vue";
import type { Subject } from "@/shared/lib/workspace";
import type {
  CourseBook,
  CourseChapter,
  CourseVolume,
} from "../services/courses";

const props = defineProps<{
  grade: number;
  volume: CourseVolume;
  subject: Subject;
  books: CourseBook[];
  bookId: string;
  units: CourseChapter[];
  chapterId: string;
  busy: boolean;
  updatedAt: string;
}>();
defineEmits<{
  (event: "change", patch: Record<string, string>): void;
  (event: "update:chapterId", value: string): void;
}>();
const grades = Array.from({ length: 6 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1} 年级`,
}));
const editions = computed(() =>
  props.books.map((book) => ({
    value: book.id,
    label: `${book.title.includes("PEP") ? "PEP · " : ""}${book.edition}`,
    description: `${book.revision} · ${book.lessonCount} 节课程`,
  })),
);
const chapters = computed(() => [
  { value: "", label: "全部单元", description: "浏览本册所有课程" },
  ...props.units.map((unit) => ({
    value: unit.id,
    label: unit.title,
    description: unit.parentId ? "课文 / 子章节" : "单元",
  })),
]);
</script>

<template>
  <aside class="card course-filters" aria-label="教材筛选">
    <header class="filter-heading">
      <span class="filter-icon" aria-hidden="true"
        ><van-icon name="description-o"
      /></span>
      <div>
        <p class="eyebrow">YOUR TEXTBOOK</p>
        <h2>选择你的课本</h2>
      </div>
    </header>
    <div class="filter-basics">
      <AppSelect
        :model-value="grade"
        label="年级"
        :options="grades"
        @update:model-value="$emit('change', { grade: String($event) })"
      />
      <div>
        <p class="filter-label">册次</p>
        <div class="volume-switch" aria-label="课程册次">
          <button
            v-for="item in ['upper', 'lower'] as const"
            :key="item"
            type="button"
            :class="{ selected: volume === item }"
            :aria-pressed="volume === item"
            @click="$emit('change', { volume: item })"
          >
            {{ item === "upper" ? "上册" : "下册" }}
          </button>
        </div>
      </div>
    </div>
    <AppSelect
      :model-value="bookId"
      label="教材与版本"
      :options="editions"
      placeholder="这一册暂未收录"
      @update:model-value="$emit('change', { book: String($event) })"
    />
    <AppSelect
      :model-value="chapterId"
      label="单元 / 章节"
      :options="chapters"
      :disabled="busy || !books.length"
      @update:model-value="$emit('update:chapterId', String($event))"
    />
    <p class="filter-note">
      <van-icon name="info-o" aria-hidden="true" />
      {{
        subject === "english"
          ? "PEP、精通及一年级起点内容不同，请按课本选择"
          : "新旧教材沿用官方标注，请对照课本目录选择"
      }}
    </p>
    <div class="filter-source">
      <SourceBadge source="local" label="官方目录快照" /><span
        >更新于 {{ updatedAt }}</span
      >
    </div>
  </aside>
</template>

<style scoped>
.course-filters {
  display: grid;
  gap: 20px;
}
.filter-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}
.filter-heading h2 {
  font-size: 19px;
  margin-top: 3px;
}
.filter-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 44px;
  border-radius: 12px;
  background: var(--pale);
  color: var(--green);
  font-size: 22px;
}
.filter-basics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.filter-label {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #65736a;
}
.volume-switch {
  display: flex;
  gap: 3px;
  padding: 4px;
  min-height: 58px;
  background: #eff2e9;
  border-radius: 14px;
}
.aide-app .volume-switch button {
  flex: 1;
  min-height: 48px;
  padding: 8px 4px;
  font-size: 14px;
  border-radius: 10px;
  background: transparent;
}
.aide-app .volume-switch button.selected {
  color: var(--green);
  background: #fffefa;
  box-shadow: 0 2px 5px #344f3110;
  font-weight: 650;
}
.filter-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.8;
}
.filter-note .van-icon {
  margin-top: 4px;
  flex-shrink: 0;
}
.filter-source {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.filter-source > span:last-child {
  color: var(--muted);
  font-size: 11px;
}
</style>
