<script setup lang="ts">
import { computed, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { showConfirmDialog, showToast } from "vant";
import { useWorkspaceStore } from "@/shared/stores/workspace";
import { localDate, uid, validDate } from "@/shared/lib/workspace";
import type { Task } from "@/shared/lib/workspace";
import { act } from "@/shared/lib/feedback";
import AppSelect from "@/shared/components/AppSelect.vue";
const categoryOptions = [
  { value: "life", label: "生活" },
  { value: "study", label: "学习" },
];
const priorityOptions = [
  { value: "normal", label: "普通" },
  { value: "high", label: "重要" },
];
const store = useWorkspaceStore();
const selected = ref(localDate());
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const calendarMode = ref("week");
const scope = ref("day");
const filter = ref("all");
const search = ref("");
const perspective = ref("plan");
const showEditor = ref(false);
const editing = ref(false);
const draft = ref<Task>();
const original = ref("");
const days = computed(() => {
  const start =
    calendarMode.value === "month"
      ? new Date(month.value)
      : new Date(`${selected.value}T12:00:00`);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return Array.from(
    { length: calendarMode.value === "month" ? 42 : 7 },
    (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return {
        date: localDate(day),
        day: day.getDate(),
        outside: day.getMonth() !== month.value.getMonth(),
      };
    },
  );
});
const dateCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const task of store.data.tasks) {
    const date =
      perspective.value === "plan"
        ? task.date
        : task.completedAt
          ? localDate(new Date(task.completedAt))
          : "";
    if (date) counts[date] = (counts[date] || 0) + 1;
  }
  return counts;
});
const tasks = computed(() =>
  store.data.tasks
    .filter((t) => {
      const matchesDate =
        perspective.value === "plan"
          ? t.date === selected.value
          : t.completed &&
            !!t.completedAt &&
            localDate(new Date(t.completedAt)) === selected.value;
      return (
        (scope.value === "all" ||
          (scope.value === "unscheduled"
            ? !t.date
            : scope.value === "overdue"
              ? !!t.date && t.date < localDate() && !t.completed
              : matchesDate)) &&
        (filter.value === "all" ||
          (filter.value === "done" ? t.completed : !t.completed)) &&
        `${t.title} ${t.note}`
          .toLowerCase()
          .includes(search.value.trim().toLowerCase())
      );
    })
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        Number(b.priority === "high") - Number(a.priority === "high") ||
        a.time.localeCompare(b.time),
    ),
);
const completed = computed(() => tasks.value.filter((t) => t.completed).length);
function selectDate(date: string) {
  selected.value = date;
  month.value = new Date(`${date.slice(0, 7)}-01T12:00:00`);
  scope.value = "day";
}
function move(direction: number) {
  if (calendarMode.value === "month") {
    const d = new Date(month.value);
    d.setMonth(d.getMonth() + direction);
    month.value = d;
  } else {
    const d = new Date(`${selected.value}T12:00:00`);
    d.setDate(d.getDate() + direction * 7);
    selectDate(localDate(d));
  }
}
function open(task?: Readonly<Task>) {
  editing.value = !!task;
  draft.value = task
    ? { ...task }
    : {
        id: uid(),
        title: "",
        note: "",
        date: scope.value === "unscheduled" ? "" : selected.value,
        time: "",
        priority: "normal",
        category: "life",
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
  original.value = JSON.stringify(draft.value);
  showEditor.value = true;
}
function save() {
  if (!draft.value) return;
  const task = {
    ...draft.value,
    title: draft.value.title.trim(),
    note: draft.value.note.trim(),
  };
  if (
    editing.value &&
    JSON.stringify(store.data.tasks.find((t) => t.id === task.id)) !==
      original.value
  ) {
    showToast(
      "这项任务已在其他页面变更，当前草稿已保留。请复制内容后取消并重新打开最新任务。",
    );
    return;
  }
  if (
    !task.title ||
    task.title.length > 120 ||
    (task.date && !validDate(task.date)) ||
    (task.time && !task.date)
  ) {
    showToast("请填写任务标题，指定时间时也需要选择日期。");
    return;
  }
  if (act(() => store.saveTask(task))) showEditor.value = false;
}
async function close() {
  if (JSON.stringify(draft.value) !== original.value) {
    const yes = await showConfirmDialog({
      title: "放弃本次编辑？",
      message: "尚未保存的内容会丢失。",
      confirmButtonText: "放弃编辑",
    }).then(
      () => true,
      () => false,
    );
    if (!yes) return;
  }
  showEditor.value = false;
}
async function remove() {
  const task = draft.value;
  if (!task) return;
  const yes = await showConfirmDialog({
    title: "删除这项任务？",
    message: task.title,
    confirmButtonText: "删除",
  }).then(
    () => true,
    () => false,
  );
  if (yes && act(() => store.removeTask(task.id))) showEditor.value = false;
}
onBeforeRouteLeave(async () => {
  if (!showEditor.value || JSON.stringify(draft.value) === original.value)
    return true;
  return showConfirmDialog({
    title: "离开日程页面？",
    message: "尚未保存的任务草稿会丢失。",
    confirmButtonText: "放弃草稿并离开",
  }).then(
    () => true,
    () => false,
  );
});
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">MAKE ROOM FOR YOUR DAY</p>
      <h1>日程与小计划</h1>
      <p class="muted">计划慢慢做，每一步都有记录。</p>
    </div>
    <button class="primary" @click="open()" :disabled="!store.ready">
      <van-icon name="plus" />新建
    </button>
  </div>
  <div class="planner-layout">
    <section class="card calendar">
      <div class="section-head">
        <button class="icon-button" aria-label="上一周期" @click="move(-1)">
          <van-icon name="arrow-left" />
        </button>
        <h2>{{ month.getFullYear() }} 年 {{ month.getMonth() + 1 }} 月</h2>
        <button class="icon-button" aria-label="下一周期" @click="move(1)">
          <van-icon name="arrow" />
        </button>
      </div>
      <div class="calendar-tools">
        <button @click="selectDate(localDate())">今天</button>
        <div class="row-actions">
          <button
            :aria-pressed="calendarMode === 'week'"
            :class="{ selected: calendarMode === 'week' }"
            @click="calendarMode = 'week'"
          >
            周</button
          ><button
            :aria-pressed="calendarMode === 'month'"
            :class="{ selected: calendarMode === 'month' }"
            @click="calendarMode = 'month'"
          >
            月
          </button>
        </div>
      </div>
      <div class="calendar-grid">
        <span
          v-for="day in ['一', '二', '三', '四', '五', '六', '日']"
          :key="day"
          class="weekday"
          >{{ day }}</span
        ><button
          v-for="day in days"
          :key="day.date"
          :class="{
            chosen: day.date === selected,
            outside: day.outside,
            today: day.date === localDate(),
          }"
          :aria-label="`${day.date}，${dateCounts[day.date] || 0}项记录`"
          :aria-pressed="selected === day.date"
          @click="selectDate(day.date)"
        >
          <span>{{ day.day }}</span
          ><i v-if="dateCounts[day.date]"></i>
        </button>
      </div>
      <p class="muted calendar-note">
        圆点表示有{{
          perspective === "plan" ? "安排" : "完成记录"
        }}，点选日期查看。
      </p>
    </section>
    <section class="card">
      <div class="section-head">
        <div>
          <p class="eyebrow">YOUR DAILY LIST</p>
          <h2>
            {{
              scope === "all"
                ? "全部任务"
                : scope === "unscheduled"
                  ? "未安排日期"
                  : scope === "overdue"
                    ? "逾期未完成"
                    : selected
            }}
          </h2>
        </div>
        <span class="badge">{{ completed }}/{{ tasks.length }} 已完成</span>
      </div>
      <div class="chips">
        <button
          v-for="item in [
            { id: 'day', name: '按日期' },
            { id: 'all', name: '全部' },
            { id: 'unscheduled', name: '未安排' },
            { id: 'overdue', name: '逾期' },
          ]"
          :key="item.id"
          :class="{ selected: scope === item.id }"
          @click="scope = item.id"
        >
          {{ item.name }}
        </button>
      </div>
      <div v-if="scope === 'day'" class="perspective">
        <button
          :class="{ selected: perspective === 'plan' }"
          @click="perspective = 'plan'"
        >
          这天的计划</button
        ><button
          :class="{ selected: perspective === 'completed' }"
          @click="perspective = 'completed'"
        >
          这天实际完成
        </button>
      </div>
      <input
        v-model="search"
        type="search"
        placeholder="查找任务或备注"
        aria-label="查找任务"
        maxlength="120"
      />
      <div class="chips">
        <button
          v-for="item in [
            { id: 'all', name: '全部状态' },
            { id: 'todo', name: '待完成' },
            { id: 'done', name: '已完成' },
          ]"
          :key="item.id"
          :class="{ selected: filter === item.id }"
          @click="filter = item.id"
        >
          {{ item.name }}
        </button>
      </div>
      <div v-if="!tasks.length" class="empty">
        <van-icon name="calendar-o" />{{
          search ? "没有匹配的任务" : "这里还没有记录，给生活留一个小目标。"
        }}
      </div>
      <div v-for="task in tasks" :key="task.id" class="task-row">
        <button
          class="task-check"
          :aria-label="task.completed ? '恢复任务' : '完成任务'"
          :aria-pressed="task.completed"
          @click="act(() => store.toggleTask(task.id))"
        >
          <van-icon :name="task.completed ? 'checked' : 'circle'" />
        </button>
        <div class="task-info" :class="{ done: task.completed }">
          <strong
            ><span v-if="task.priority === 'high'" class="priority"
              >重要 · </span
            >{{ task.title }}</strong
          ><small
            >{{ task.date || "未安排日期" }} {{ task.time }} ·
            {{ task.category === "study" ? "学习" : "生活" }}</small
          ><small v-if="task.note">{{ task.note }}</small
          ><small v-if="task.completed">{{
            task.completedAt
              ? `完成于 ${new Date(task.completedAt).toLocaleString("zh-CN")}`
              : "历史已完成，完成时间未知"
          }}</small>
        </div>
        <button
          class="icon-button"
          :aria-label="`编辑${task.title}`"
          @click="open(task)"
        >
          <van-icon name="ellipsis" />
        </button>
      </div>
      <p v-if="scope === 'day' && perspective === 'completed'" class="muted">
        按实际完成时间统计；旧版已完成任务因缺少时间，不计入某一天
      </p>
    </section>
  </div>
  <van-popup
    v-model:show="showEditor"
    position="bottom"
    round
    :close-on-click-overlay="false"
    teleport=".aide-app"
    ><div class="sheet" v-if="draft">
      <h2>{{ editing ? "编辑计划" : "添加一个小计划" }}</h2>
      <form
        @submit.prevent="save"
        @keydown.enter="if ($event.isComposing) $event.preventDefault();"
      >
        <label
          >要做什么<input
            v-model="draft.title"
            maxlength="120"
            required
            placeholder="例如：读 20 分钟课外书"
        /></label>
        <div class="grid-two">
          <label
            >日期（留空表示未安排）<input
              v-model="draft.date"
              type="date" /></label
          ><label>时间（选填）<input v-model="draft.time" type="time" /></label>
        </div>
        <div class="grid-two">
          <AppSelect
            :model-value="draft.category"
            label="分类"
            :options="categoryOptions"
            @update:model-value="draft.category = $event as Task['category']"
          />
          <AppSelect
            :model-value="draft.priority"
            label="优先级"
            :options="priorityOptions"
            @update:model-value="draft.priority = $event as Task['priority']"
          />
        </div>
        <label
          >备注<textarea
            v-model="draft.note"
            maxlength="1000"
            placeholder="写下细节，让开始更容易"
          ></textarea>
        </label>
        <div class="row-actions">
          <button type="button" @click="close">取消</button
          ><button type="submit" class="primary">保存计划</button>
        </div>
        <button v-if="editing" class="danger" type="button" @click="remove">
          删除任务
        </button>
      </form>
    </div></van-popup
  >
</template>
<style scoped>
.planner-layout {
  display: grid;
  gap: 20px;
  align-items: start;
}
.calendar-tools,
.perspective {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 6px;
}
.perspective button {
  flex: 1;
  font-size: 13px;
}
.selected {
  background: var(--pale) !important;
  color: var(--green) !important;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}
.weekday {
  text-align: center;
  color: var(--muted);
  padding: 8px 0;
  font-size: 12px;
}
.calendar-grid button {
  position: relative;
  border-radius: 12px;
  padding: 8px 0;
  min-width: 0;
  background: transparent;
  min-height: 48px;
  flex-direction: column;
  gap: 1px;
}
.calendar-grid button.chosen {
  background: var(--green);
  color: white;
}
.calendar-grid button.today:not(.chosen) {
  color: var(--green);
  box-shadow: inset 0 0 0 1px #93b8a1;
}
.calendar-grid .outside {
  opacity: 0.35;
}
.calendar-grid i {
  width: 4px;
  height: 4px;
  background: currentColor;
  border-radius: 50%;
  position: absolute;
  bottom: 5px;
}
.calendar-note {
  margin-top: 18px;
  text-align: center;
}
.priority {
  color: #b57639;
}
@media (min-width: 800px) {
  .planner-layout {
    grid-template-columns: minmax(300px, 0.85fr) minmax(0, 1.25fr);
  }
}
</style>
