<script setup lang="ts">
defineOptions({ name: "TodayPage" });
import { computed, onBeforeUnmount, ref } from "vue";
import { useWorkspaceStore } from "@/shared/stores/workspace";
import { localDate } from "@/shared/lib/workspace";
import { act } from "@/shared/lib/feedback";
const store = useWorkspaceStore();
const today = ref(localDate());
const clock = window.setInterval(() => {
  today.value = localDate();
}, 30000);
onBeforeUnmount(() => clearInterval(clock));
const tasks = computed(() =>
  store.data.tasks.filter((t) => t.date === today.value),
);
const done = computed(() => tasks.value.filter((t) => t.completed).length);
const attempts = computed(() =>
  store.data.attempts.filter((a) => localDate(new Date(a.at)) === today.value),
);
const dateLabel = computed(() =>
  new Date(`${today.value}T12:00:00`).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }),
);
const links = [
  {
    to: "/calculator",
    icon: "apps-o",
    title: "日常计算器",
    text: "括号、小数与四则运算",
    color: "#e3ecd9",
  },
  {
    to: "/calculator?mode=vertical",
    icon: "orders-o",
    title: "竖式与计算过程",
    text: "对齐竖式，看懂每一步",
    color: "#f3ead8",
  },
  {
    to: "/study/dictionary",
    icon: "search",
    title: "随手查字词",
    text: "汉字、词语、成语与英语",
    color: "#e0e9f1",
  },
  {
    to: "/study",
    icon: "notes-o",
    title: "每天学一点",
    text: "语文 · 数学 · 英语",
    color: "#f3ead8",
  },
  {
    to: "/music/tools",
    icon: "service-o",
    title: "做一段专属铃声",
    text: "裁剪音乐，留住喜欢的片段",
    color: "#e7edf5",
  },
  {
    to: "/fun",
    icon: "smile-o",
    title: "给生活一点随机",
    text: "转盘、骰子和记忆翻牌",
    color: "#f2e4db",
  },
  {
    to: "/planner",
    icon: "calendar-o",
    title: "把计划写下来",
    text: "日历、待办和每日回顾",
    color: "#e8edde",
  },
];
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">A LITTLE BETTER, EVERY DAY</p>
      <h1>
        {{
          store.data.preferences.name
            ? `${store.data.preferences.name}，你好`
            : "今天，也要好好过"
        }}
      </h1>
      <p class="muted">{{ dateLabel }}</p>
    </div>
  </div>
  <div class="dashboard-grid stack">
    <section class="hero wide">
      <span class="eyebrow">YOUR DAILY COMPANION</span>
      <h2>学一点新知识，<br />留一点时间给自己。</h2>
      <p>从一项小计划开始，学习、音乐和生活，都在这里。</p>
      <div class="row-actions">
        <router-link class="button primary" to="/study"
          >开始今日学习 <van-icon name="arrow" /></router-link
        ><router-link class="button" to="/planner">安排今天</router-link>
      </div>
      <van-icon class="hero-doodle" name="flower-o" />
    </section>
    <section class="card">
      <div class="section-head">
        <h2>
          今天的小计划 <span class="badge">{{ done }}/{{ tasks.length }}</span>
        </h2>
        <router-link to="/planner"
          >查看日历 <van-icon name="arrow"
        /></router-link>
      </div>
      <div class="progress-track">
        <span
          :style="{
            width: tasks.length ? `${(done / tasks.length) * 100}%` : '0%',
          }"
        ></span>
      </div>
      <div v-if="!tasks.length" class="empty">
        <van-icon
          name="todo-list-o"
        />还没有安排，给今天加一件小事吧。<br /><router-link
          class="button subtle"
          to="/planner"
          >添加今天的计划 ＋</router-link
        >
      </div>
      <div v-for="task in tasks.slice(0, 5)" :key="task.id" class="task-row">
        <button
          class="task-check"
          :aria-label="task.completed ? '恢复任务' : '完成任务'"
          :aria-pressed="task.completed"
          @click="act(() => store.toggleTask(task.id))"
        >
          <van-icon :name="task.completed ? 'checked' : 'circle'" />
        </button>
        <div class="task-info" :class="{ done: task.completed }">
          <strong>{{ task.title }}</strong
          ><small
            >{{ task.time || "全天" }} ·
            {{ task.category === "study" ? "学习" : "生活" }}</small
          >
        </div>
      </div>
    </section>
    <div class="stack">
      <section class="card">
        <div class="section-head">
          <h2>一点点，也算进步</h2>
          <router-link to="/study?mode=review"
            >去复习 <van-icon name="arrow"
          /></router-link>
        </div>
        <div class="stat-grid">
          <div class="stat">
            <strong>{{ attempts.length }}</strong
            ><span>今天练习</span>
          </div>
          <div class="stat">
            <strong>{{ attempts.filter((a) => a.correct).length }}</strong
            ><span>答对题目</span>
          </div>
          <div class="stat">
            <strong>{{ done }}</strong
            ><span>完成计划</span>
          </div>
        </div>
      </section>
      <section class="card">
        <h2>留一点专注时间</h2>
        <p class="muted">专心做一件事，再好好休息。</p>
        <router-link
          class="button primary"
          style="margin-top: 16px"
          to="/fun?tool=focus"
          ><van-icon name="clock-o" />开始专注</router-link
        >
      </section>
    </div>
    <section class="wide">
      <div class="section-head">
        <h2 class="section-title">随手打开，就能用</h2>
        <span class="muted">你的日常工具箱</span>
      </div>
      <div class="grid-two">
        <router-link
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="quick-card"
          ><span class="quick-icon" :style="{ background: link.color }"
            ><van-icon :name="link.icon" /></span
          ><span
            ><strong>{{ link.title }}</strong
            ><small>{{ link.text }}</small></span
          ><van-icon name="arrow"
        /></router-link>
      </div>
    </section>
  </div>
</template>
<style scoped>
.quick-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--paper);
  min-width: 0;
}
.quick-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: 25px;
}
.quick-card > span:nth-child(2) {
  flex: 1;
  min-width: 0;
}
.quick-card strong {
  font-size: 15px;
  display: block;
  font-weight: 550;
}
.quick-card small {
  display: block;
  color: var(--muted);
  font-size: 11px;
  margin-top: 3px;
}
@media (max-width: 480px) {
  .quick-card {
    flex-wrap: wrap;
    padding: 16px;
    gap: 10px;
  }
  .quick-card > span:nth-child(2) {
    flex-basis: 100%;
    order: 2;
  }
  .quick-card > .van-icon {
    margin-left: auto;
  }
}
</style>
