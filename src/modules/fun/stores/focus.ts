import { onScopeDispose, ref } from "vue";
import { defineStore } from "pinia";
import { showToast } from "vant";
export const useFocusStore = defineStore("focus", () => {
  const minutes = ref(25);
  const remaining = ref(25 * 60000);
  const state = ref<"ready" | "running" | "paused" | "done">("ready");
  let deadline = 0;
  const timer = window.setInterval(() => {
    if (state.value !== "running") return;
    remaining.value = Math.max(0, deadline - Date.now());
    if (remaining.value === 0) {
      state.value = "done";
      showToast("专注时间结束，休息一下吧。");
    }
  }, 500);
  function start() {
    if (state.value !== "paused") remaining.value = minutes.value * 60000;
    deadline = Date.now() + remaining.value;
    state.value = "running";
  }
  function pause() {
    remaining.value = Math.max(0, deadline - Date.now());
    state.value = "paused";
  }
  function reset(value = minutes.value) {
    minutes.value = value;
    remaining.value = value * 60000;
    state.value = "ready";
  }
  onScopeDispose(() => clearInterval(timer));
  return { minutes, remaining, state, start, pause, reset };
});
