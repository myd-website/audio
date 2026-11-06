import { computed, onScopeDispose, readonly, ref } from "vue";
import { defineStore } from "pinia";
import {
  decodeWorkspace,
  emptyWorkspace,
  localDate,
  uid,
  WORKSPACE_KEY,
} from "../lib/workspace";
import type { Attempt, Task, Track, Workspace } from "../lib/workspace";
import { profileWorkspaceKey } from "../lib/profiles";
import { useProfileStore } from "./profile";

export const useWorkspaceStore = defineStore("workspace", () => {
  const profile = useProfileStore();
  const storageKey = profile.current
    ? profileWorkspaceKey(profile.current)
    : "";
  const data = ref<Workspace>(emptyWorkspace());
  const error = ref("");
  const ready = ref(false);
  let snapshot: string | null = null;
  function load() {
    data.value = emptyWorkspace();
    if (!storageKey) {
      ready.value = false;
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      snapshot = raw;
      data.value = raw === null ? emptyWorkspace() : decodeWorkspace(raw);
      ready.value = true;
      error.value = "";
    } catch {
      ready.value = false;
      error.value =
        "无法读取本机数据，原记录已保留。请先导出原始数据，或恢复浏览器存储后重新读取。";
    }
  }
  function commit(change: (next: Workspace) => void) {
    if (!ready.value) throw new Error(error.value);
    try {
      if (localStorage.getItem(storageKey) !== snapshot) {
        load();
        throw new Error(
          "其他页面已更新数据，已重新读取；请检查后重试本次操作。",
        );
      }
      const next = decodeWorkspace(JSON.stringify(data.value));
      change(next);
      const checked = decodeWorkspace(JSON.stringify(next));
      const raw = JSON.stringify(checked);
      localStorage.setItem(storageKey, raw);
      snapshot = raw;
      data.value = checked;
      error.value = "";
    } catch (cause) {
      error.value =
        cause instanceof Error
          ? cause.message
          : "保存失败，请检查存储空间后重试。";
      throw new Error(error.value);
    }
  }
  function saveTask(task: Task) {
    commit((next) => {
      const index = next.tasks.findIndex((t) => t.id === task.id);
      if (index < 0) next.tasks.unshift(task);
      else next.tasks[index] = task;
    });
  }
  function toggleTask(id: string) {
    commit((next) => {
      const task = next.tasks.find((t) => t.id === id);
      if (!task) throw new Error("任务已不存在。");
      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
    });
  }
  function removeTask(id: string) {
    commit((next) => {
      if (!next.tasks.some((t) => t.id === id))
        throw new Error("任务已不存在，请查看最新列表。");
      next.tasks = next.tasks.filter((t) => t.id !== id);
    });
  }
  function addAttempt(attempt: Attempt) {
    commit((next) => {
      if (!next.attempts.some((a) => a.id === attempt.id))
        next.attempts.push(attempt);
    });
  }
  function favorite(track: Track) {
    commit((next) => {
      if (next.favorites.some((t) => t.id === track.id))
        next.favorites = next.favorites.filter((t) => t.id !== track.id);
      else next.favorites.unshift(track);
    });
  }
  function importLegacy() {
    const raw = localStorage.getItem("audio:todos:v1");
    if (!raw) return 0;
    const old = JSON.parse(raw);
    if (
      old?.version !== 1 ||
      !Array.isArray(old.items) ||
      old.items.length > 5000 ||
      !old.items.every(
        (t) =>
          t &&
          typeof t.id === "string" &&
          t.id.length > 0 &&
          t.id.length <= 160 &&
          typeof t.title === "string" &&
          typeof t.completed === "boolean",
      )
    )
      throw new Error("旧待办格式不正确，未修改原数据。");
    if (new Set(old.items.map((t) => t.id)).size !== old.items.length)
      throw new Error("旧待办包含重复标识，原数据未修改。");
    let count = 0;
    commit((next) => {
      for (const t of old.items) {
        const id = `legacy:${t.id}`;
        if (!next.tasks.some((item) => item.id === id)) {
          next.tasks.push({
            id,
            title: t.title,
            note: "",
            date: "",
            time: "",
            priority: "normal",
            category: "life",
            completed: t.completed,
            createdAt: null,
            completedAt: null,
          });
          count++;
        }
      }
    });
    return count;
  }
  function addStudyPlan(subject: string) {
    const title = `${subject}练习 10 分钟`;
    if (
      data.value.tasks.some(
        (t) => t.date === localDate() && t.title === title && !t.completed,
      )
    )
      throw new Error("今天已有这项学习计划。");
    saveTask({
      id: uid(),
      title,
      note: "完成练习后，再勾选这项计划。",
      date: localDate(),
      time: "",
      priority: "normal",
      category: "study",
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    });
  }
  function restore(raw: string) {
    profile.requireCurrent();
    const incoming = decodeWorkspace(raw);
    if (ready.value) {
      commit((next) => {
        Object.assign(next, incoming);
      });
      return;
    }
    // 仅用户明确选择恢复备份时允许替换损坏数据，普通业务写入仍受 ready 限制。
    if (localStorage.getItem(storageKey) !== snapshot)
      throw new Error("本机数据已变化，请重新读取后再恢复备份。");
    const serialized = JSON.stringify(incoming);
    localStorage.setItem(storageKey, serialized);
    snapshot = serialized;
    data.value = incoming;
    ready.value = true;
    error.value = "";
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) load();
  };
  function importShared() {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (raw === null) throw new Error("没有找到改造前的共享记录。");
    const incoming = decodeWorkspace(raw);
    commit((next) => {
      if (JSON.stringify(next) !== JSON.stringify(emptyWorkspace()))
        throw new Error(
          "当前档案已有记录，请导出共享记录后使用备份恢复，避免覆盖现有内容。",
        );
      Object.assign(next, incoming);
    });
  }
  window.addEventListener("storage", onStorage);
  onScopeDispose(() => window.removeEventListener("storage", onStorage));
  load();
  return {
    data: readonly(data),
    storageKey,
    ready: readonly(ready),
    error: readonly(error),
    todayTasks: computed(() =>
      data.value.tasks.filter((t) => t.date === localDate()),
    ),
    load,
    commit,
    saveTask,
    toggleTask,
    removeTask,
    addAttempt,
    favorite,
    importLegacy,
    addStudyPlan,
    restore,
    importShared,
  };
});
