<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";
import { showConfirmDialog, showToast } from "vant";
import { checkAudioFile, readLocal } from "../services/localFiles";
import { encodeAudio } from "../services/encode";
import { validateClip } from "../domain/audio";
import { formatTime } from "../domain/lyrics";
import { usePlayerStore } from "../stores/player";
import { message } from "@/shared/lib/feedback";
import { downloadBlob } from "@/shared/services/download";
import AppSelect from "@/shared/components/AppSelect.vue";
const formatOptions = [
  { value: "mp3", label: "MP3", description: "通用音频" },
  { value: "wav", label: "WAV", description: "未压缩 PCM" },
];
const bitrateOptions = [
  { value: 128, label: "128 kbps", description: "较小文件" },
  { value: 192, label: "192 kbps", description: "日常推荐" },
  { value: 320, label: "320 kbps", description: "较高码率" },
];
const route = useRoute();
const player = usePlayerStore();
const fileInput = ref<HTMLInputElement>();
const file = ref<File>();
const sourceUrl = ref("");
const sourceAudio = ref<HTMLAudioElement>();
const outputAudio = ref<HTMLAudioElement>();
const duration = ref(0);
const start = ref(0);
const end = ref(0);
const bitrate = ref(192);
const fade = ref(true);
const format = ref<"mp3" | "wav">("mp3");
const outputUrl = ref("");
const output = ref<Blob>();
const busy = ref(false);
const progress = ref(0);
const error = ref("");
const audition = ref(false);
const name = ref("");
let controller: AbortController | undefined;
let token = 0;
let disposed = false;
const clipLength = computed(() =>
  Math.max(0, Number(end.value) - Number(start.value)),
);
function clearOutput() {
  outputAudio.value?.pause();
  if (outputUrl.value) URL.revokeObjectURL(outputUrl.value);
  outputUrl.value = "";
  output.value = undefined;
}
function choose(chosen: File) {
  try {
    checkAudioFile(chosen);
    cancel();
    token++;
    sourceAudio.value?.pause();
    if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value);
    clearOutput();
    duration.value = 0;
    file.value = chosen;
    sourceUrl.value = URL.createObjectURL(chosen);
    start.value = 0;
    end.value = 0;
    error.value = "";
    name.value = chosen.name.replace(/\.[^.]+$/, "");
  } catch (cause) {
    showToast(message(cause));
  }
}
function select(event: Event) {
  const input = event.target as HTMLInputElement;
  const chosen = input.files?.[0];
  input.value = "";
  if (chosen) choose(chosen);
}
function metadata() {
  const seconds = sourceAudio.value?.duration || 0;
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600) {
    error.value = "请选择总时长不超过 10 分钟的音频。";
    duration.value = 0;
    return;
  }
  duration.value = seconds;
  end.value = Math.min(30, Math.floor(seconds * 1000) / 1000);
}
function options() {
  return {
    start: Number(start.value),
    end: Number(end.value),
    bitrate: bitrate.value,
    fade: fade.value,
  };
}
async function preview() {
  try {
    validateClip(duration.value, options());
    if (!sourceAudio.value) return;
    outputAudio.value?.pause();
    player.pause();
    sourceAudio.value.currentTime = Number(start.value);
    audition.value = true;
    await sourceAudio.value.play();
  } catch (cause) {
    showToast(message(cause));
  }
}
function sourcePlaying() {
  player.pause();
  outputAudio.value?.pause();
}
function timeupdate() {
  if (
    audition.value &&
    sourceAudio.value &&
    sourceAudio.value.currentTime >= Number(end.value)
  ) {
    sourceAudio.value.pause();
    audition.value = false;
  }
}
function shortcut(seconds: number) {
  start.value = Math.min(
    Number(start.value),
    Math.max(0, duration.value - 0.1),
  );
  end.value = Math.min(duration.value, Number(start.value) + seconds);
}
function useCurrent(edge: "start" | "end") {
  const value = Math.round((sourceAudio.value?.currentTime || 0) * 100) / 100;
  if (edge === "start") start.value = value;
  else end.value = value;
}
async function process() {
  if (!file.value || busy.value) return;
  try {
    validateClip(duration.value, options());
  } catch (cause) {
    error.value = message(cause);
    return;
  }
  const active = ++token;
  controller = new AbortController();
  busy.value = true;
  progress.value = 0;
  error.value = "";
  clearOutput();
  sourceAudio.value?.pause();
  player.pause();
  try {
    const blob = await encodeAudio(
      file.value,
      options(),
      format.value,
      controller.signal,
      (n) => {
        if (active === token) progress.value = n;
      },
    );
    if (active !== token || disposed) return;
    output.value = blob;
    outputUrl.value = URL.createObjectURL(blob);
    progress.value = 100;
  } catch (cause) {
    if (
      active === token &&
      !disposed &&
      !(cause instanceof DOMException && cause.name === "AbortError")
    )
      error.value = message(cause);
  } finally {
    if (active === token) busy.value = false;
  }
}
function cancel() {
  controller?.abort();
  if (busy.value) {
    error.value = "任务已取消，文件和选区已保留。";
  }
  busy.value = false;
  token++;
}
function save() {
  if (!output.value) return;
  if (!name.value.trim()) {
    showToast("请填写输出文件名。");
    return;
  }
  downloadBlob(
    output.value,
    `${name.value.trim()}-${Number(start.value)}-${Number(end.value)}.${format.value}`,
  );
}
watch([start, end, bitrate, fade, format], clearOutput);
onBeforeRouteLeave(async () => {
  if (!busy.value) return true;
  return showConfirmDialog({
    title: "离开音频工具？",
    message: "当前处理会取消，未下载的结果不会保存。",
  }).then(
    () => {
      cancel();
      return true;
    },
    () => false,
  );
});
onBeforeUnmount(() => {
  disposed = true;
  cancel();
  sourceAudio.value?.pause();
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value);
  clearOutput();
});
// 从本机音乐库进入时复用持久文件，不把临时 Blob URL 放进路由。
if (typeof route.query.local === "string")
  void readLocal(route.query.local).then(
    (blob) => {
      if (!disposed)
        choose(
          new File(
            [blob],
            typeof route.query.name === "string"
              ? route.query.name
              : "本机音乐",
            { type: blob.type },
          ),
        );
    },
    (cause) => {
      if (!disposed) error.value = message(cause);
    },
  );
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">KEEP THE PART YOU LOVE</p>
      <h1>音频小工作台</h1>
      <p class="muted">截一段喜欢的旋律，或转换为真正的 MP3。</p>
    </div>
    <router-link class="button" to="/music">返回音乐</router-link>
  </div>
  <div class="audio-layout">
    <section class="card stack">
      <div class="section-head">
        <h2><span class="step">01</span> 选择与试听</h2>
        <button :disabled="busy" @click="fileInput?.click()">
          {{ file ? "更换文件" : "选择音频" }}
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="audio/*,.flac,.m4a,.ogg,.wav,.mp3"
        hidden
        style="display: none"
        @change="select"
      />
      <div v-if="!file" class="file-drop">
        <van-icon name="service-o" />
        <h3>让喜欢的片段，独一无二</h3>
        <p class="muted">选择手机里的音频文件，所有处理在本机完成。</p>
        <button class="primary" @click="fileInput?.click()">
          选择一个音频文件</button
        ><small>单个文件 ≤ 40MB，总时长 ≤ 10 分钟</small>
      </div>
      <template v-else
        ><strong class="file-name">{{ file.name }}</strong>
        <p class="muted">
          {{ (file.size / 1024 / 1024).toFixed(1) }} MB ·
          {{ formatTime(duration) }}
        </p>
        <audio
          ref="sourceAudio"
          :src="sourceUrl"
          controls
          preload="metadata"
          @loadedmetadata="metadata"
          @timeupdate="timeupdate"
          @play="sourcePlaying"
          @error="
            error = '当前浏览器无法读取这个格式，请尝试 MP3、WAV 或 M4A。'
          "
        />
        <div v-if="duration" class="stack">
          <div class="section-head">
            <h2><span class="step">02</span> 选出喜欢的片段</h2>
            <span class="badge">{{ clipLength.toFixed(1) }} 秒</span>
          </div>
          <div class="grid-two">
            <label
              >开始时间（秒）<input
                v-model.number="start"
                type="number"
                min="0"
                :max="duration"
                step="0.1"
                :disabled="busy"
              /><input
                v-model.number="start"
                type="range"
                min="0"
                :max="duration"
                step="0.1"
                :disabled="busy"
              /><button :disabled="busy" @click="useCurrent('start')">
                当前位置为起点
              </button></label
            ><label
              >结束时间（秒）<input
                v-model.number="end"
                type="number"
                min="0"
                :max="duration"
                step="0.1"
                :disabled="busy"
              /><input
                v-model.number="end"
                type="range"
                min="0"
                :max="duration"
                step="0.1"
                :disabled="busy"
              /><button :disabled="busy" @click="useCurrent('end')">
                当前位置为终点
              </button></label
            >
          </div>
          <div class="row-actions">
            <button :disabled="busy" @click="shortcut(15)">15 秒</button
            ><button :disabled="busy" @click="shortcut(30)">30 秒</button
            ><button
              :disabled="busy"
              @click="
                start = 0;
                end = duration;
              "
            >
              整首</button
            ><button class="primary" :disabled="busy" @click="preview">
              <van-icon name="play" />试听选区
            </button>
          </div>
        </div></template
      >
    </section>
    <section class="card stack">
      <h2><span class="step">03</span> 导出设置</h2>
      <AppSelect
        :model-value="format"
        label="输出格式"
        :options="formatOptions"
        :disabled="busy"
        @update:model-value="format = $event as 'mp3' | 'wav'"
      />
      <AppSelect
        v-if="format === 'mp3'"
        :model-value="bitrate"
        label="MP3 编码质量"
        :options="bitrateOptions"
        :disabled="busy"
        @update:model-value="bitrate = Number($event)"
      />
      <label class="fade-option"
        ><input
          v-model="fade"
          type="checkbox"
          :disabled="busy"
        />淡入淡出（最长各 0.5 秒）</label
      ><label
        >文件名<input
          v-model="name"
          maxlength="100"
          :disabled="busy"
          placeholder="为这段声音起个名字"
      /></label>
      <p class="muted">
        提高输出码率不会恢复原文件已丢失的音质。输入格式由当前浏览器的解码能力决定，每次最多导出
        5 分钟。
      </p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div v-if="busy" aria-live="polite">
        <p class="muted">
          {{
            progress < 20
              ? "正在解码和准备选区…"
              : `正在编码 ${Math.round(progress)}%`
          }}
        </p>
        <div class="progress-track">
          <span :style="{ width: `${progress}%` }"></span>
        </div>
        <button style="margin-top: 16px" @click="cancel">取消处理</button>
      </div>
      <button v-else class="primary" :disabled="!duration" @click="process">
        {{ output ? "重新生成" : "生成音频" }}
      </button>
      <div v-if="outputUrl" class="output-box stack">
        <strong>片段已生成，先试听一下</strong>
        <p class="muted">
          {{ format.toUpperCase() }} · {{ (output!.size / 1024).toFixed(0) }} KB
        </p>
        <audio
          ref="outputAudio"
          :src="outputUrl"
          controls
          @play="
            player.pause();
            sourceAudio?.pause();
          "
        /><button class="primary" @click="save">
          <van-icon name="down" />下载到设备
        </button>
        <p class="muted">
          手机保存位置由浏览器决定；导出文件后，可按设备操作设置铃声
        </p>
      </div>
    </section>
  </div>
</template>
<style scoped>
.audio-layout {
  display: grid;
  gap: 20px;
  align-items: start;
}
.step {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--pale);
  font-size: 12px;
  color: var(--green);
  margin-right: 6px;
}
.file-drop {
  text-align: center;
  display: grid;
  justify-items: center;
  gap: 18px;
  padding: 35px 10px;
  border: 1px dashed #bfcbb6;
  border-radius: 18px;
  background: #f7f9f2;
}
.file-drop > .van-icon {
  font-size: 55px;
  color: #77946d;
}
.file-drop small {
  color: var(--muted);
  font-size: 11px;
}
.file-name {
  overflow-wrap: anywhere;
}
.audio-layout audio {
  width: 100%;
  min-width: 0;
}
.fade-option {
  display: flex;
  align-items: center;
  gap: 10px;
}
.output-box {
  padding: 18px;
  background: #edf3e7;
  border-radius: 16px;
}
.page-heading > .button {
  font-size: 12px;
  flex-shrink: 0;
}
@media (min-width: 800px) {
  .audio-layout {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  }
}
</style>
