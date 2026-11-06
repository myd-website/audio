import { computed, onScopeDispose, ref } from "vue";
import { defineStore } from "pinia";
import type { Track } from "@/shared/lib/workspace";
import { resolveMusic } from "../services/source";
import { readLocal } from "../services/localFiles";
import { parseLyrics } from "../domain/lyrics";
import { message } from "@/shared/lib/feedback";
export const usePlayerStore = defineStore("global-player", () => {
  const current = ref<Track | null>(null);
  const queue = ref<Track[]>([]);
  const status = ref<
    "idle" | "resolving" | "loading" | "playing" | "paused" | "ended" | "error"
  >("idle");
  const error = ref("");
  const time = ref(0);
  const duration = ref(0);
  const lyrics = ref(parseLyrics(""));
  const expanded = ref(false);
  const repeat = ref<"all" | "one">("all");
  // store 生命周期内只有一个媒体实例，切换路由不会创建第二个播放器。
  const audio = new Audio();
  audio.preload = "metadata";
  let sequence = 0;
  let controller: AbortController | undefined;
  let objectUrl = "";
  const listeners: { name: string; handler: () => void }[] = [];
  function listen(name: string, handler: () => void) {
    audio.addEventListener(name, handler);
    listeners.push({ name, handler });
  }
  listen("playing", () => {
    status.value = "playing";
    error.value = "";
  });
  listen("pause", () => {
    if (status.value === "playing" || status.value === "loading")
      status.value = "paused";
  });
  listen("waiting", () => {
    if (status.value !== "resolving") status.value = "loading";
  });
  listen("timeupdate", () => {
    time.value = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  });
  listen("loadedmetadata", () => {
    duration.value = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (status.value === "loading" && audio.paused) status.value = "paused";
  });
  listen("error", () => {
    if (status.value !== "resolving" && audio.getAttribute("src")) {
      status.value = "error";
      error.value =
        "音频加载失败，可能是格式不支持或资源已失效。请重试或换一首。";
    }
  });
  listen("ended", () => {
    status.value = "ended";
    if (repeat.value === "one") {
      audio.currentTime = 0;
      void resume();
    } else void next(1);
  });
  async function resume() {
    if (!audio.getAttribute("src")) {
      if (current.value) await play(current.value);
      return;
    }
    const token = sequence;
    try {
      await audio.play();
      if (token !== sequence) return;
    } catch (cause) {
      if (token !== sequence) return;
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      status.value = "paused";
      error.value =
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "歌曲已就绪，请再点一次播放。"
          : message(cause);
    }
  }
  function add(track: Track) {
    if (!queue.value.some((t) => t.id === track.id)) queue.value.push(track);
  }
  async function play(track: Track) {
    const token = ++sequence;
    controller?.abort();
    controller = new AbortController();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
    current.value = { ...track };
    add(track);
    status.value = "resolving";
    error.value = "";
    time.value = 0;
    duration.value = 0;
    lyrics.value = parseLyrics("");
    try {
      let url = "";
      let lrc = "";
      if (track.local) {
        const file = await readLocal(track.id);
        if (token !== sequence) return;
        objectUrl = URL.createObjectURL(file);
        url = objectUrl;
      } else {
        if (!track.rid) throw new Error("缺少歌曲标识。");
        const resource = await resolveMusic(track.rid, controller.signal);
        url = resource.url;
        lrc = resource.lrc;
      }
      if (token !== sequence) return;
      audio.src = url;
      lyrics.value = parseLyrics(lrc);
      status.value = "loading";
      audio.load();
      await resume();
    } catch (cause) {
      if (token !== sequence) return;
      status.value = "error";
      error.value = message(cause);
    }
  }
  function pause() {
    if (status.value === "resolving") {
      sequence++;
      controller?.abort();
    }
    audio.pause();
    if (status.value !== "error") status.value = "paused";
  }
  function toggle() {
    if (status.value === "playing" || status.value === "loading") pause();
    else if (status.value !== "resolving") void resume();
  }
  function seek(value: number) {
    if (Number.isFinite(value) && duration.value > 0) {
      audio.currentTime = Math.max(0, Math.min(value, duration.value));
      time.value = audio.currentTime;
    }
  }
  async function next(direction: number) {
    const index = queue.value.findIndex((t) => t.id === current.value?.id);
    if (queue.value.length)
      await play(
        queue.value[
          (index + direction + queue.value.length) % queue.value.length
        ],
      );
  }
  function stop() {
    sequence++;
    controller?.abort();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = "";
    current.value = null;
    status.value = "idle";
    error.value = "";
    time.value = 0;
    duration.value = 0;
    lyrics.value = parseLyrics("");
  }
  function remove(id: string) {
    queue.value = queue.value.filter((t) => t.id !== id);
    if (current.value?.id === id) stop();
  }
  const lyricIndex = computed(() => {
    let index = -1;
    for (let i = 0; i < lyrics.value.lines.length; i++) {
      if (lyrics.value.lines[i].time <= time.value) index = i;
      else break;
    }
    return index;
  });
  onScopeDispose(() => {
    stop();
    listeners.forEach((l) => audio.removeEventListener(l.name, l.handler));
  });
  return {
    current,
    queue,
    status,
    error,
    time,
    duration,
    lyrics,
    expanded,
    repeat,
    lyricIndex,
    play,
    add,
    pause,
    toggle,
    seek,
    next,
    stop,
    remove,
  };
});
