<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { usePlayerStore } from "../stores/player";
import { formatTime } from "../domain/lyrics";
const player = usePlayerStore();
const panel = ref("lyrics");
const follow = ref(true);
const lyricsBox = ref<HTMLElement>();
const statusText = {
  idle: "未播放",
  resolving: "解析资源中…",
  loading: "正在缓冲…",
  playing: "正在播放",
  paused: "已暂停",
  ended: "播放结束",
  error: "播放失败",
};
watch(
  () => [player.lyricIndex, player.expanded, panel.value],
  async () => {
    if (!player.expanded || panel.value !== "lyrics" || !follow.value) return;
    await nextTick();
    const line = lyricsBox.value?.querySelector<HTMLElement>(".current-line");
    if (line && lyricsBox.value)
      lyricsBox.value.scrollTo({
        top:
          line.offsetTop -
          lyricsBox.value.offsetTop -
          lyricsBox.value.clientHeight / 2 +
          line.clientHeight / 2,
        behavior: "smooth",
      });
  },
);
function seek(event: Event) {
  player.seek(Number((event.target as HTMLInputElement).value));
}
</script>
<template>
  <aside v-if="player.current" class="mini-player" aria-label="正在播放">
    <button class="mini-title" @click="player.expanded = true">
      <span class="disc"><van-icon name="music-o" /></span
      ><span
        ><strong>{{ player.current.name }}</strong
        ><small>{{
          player.error
            ? "播放遇到问题，点击查看"
            : statusText[player.status] + " · " + player.current.artist
        }}</small></span
      ></button
    ><button
      class="icon-button"
      :disabled="player.status === 'resolving'"
      :aria-label="player.status === 'playing' ? '暂停' : '播放'"
      @click="player.toggle"
    >
      <van-icon
        :name="player.status === 'playing' ? 'pause-circle-o' : 'play-circle-o'"
      /></button
    ><button class="icon-button" aria-label="下一首" @click="player.next(1)">
      <van-icon name="arrow" />
    </button>
  </aside>
  <van-popup
    v-model:show="player.expanded"
    position="bottom"
    round
    teleport=".aide-app"
    ><section class="sheet player-sheet" v-if="player.current">
      <div class="section-head">
        <span class="eyebrow">YOUR SOUNDTRACK</span
        ><button
          class="icon-button"
          aria-label="收起播放器"
          @click="player.expanded = false"
        >
          <van-icon name="arrow-down" />
        </button>
      </div>
      <div class="record-art">
        <img
          v-if="player.current.cover"
          :src="player.current.cover"
          alt=""
          referrerpolicy="no-referrer"
        /><van-icon v-else name="music-o" />
      </div>
      <h2>{{ player.current.name }}</h2>
      <p class="muted">
        {{ player.current.artist }} · {{ statusText[player.status] }}
      </p>
      <p v-if="player.error" class="error" role="alert">
        {{ player.error }}
        <button
          v-if="player.status === 'error'"
          @click="player.play(player.current)"
        >
          重试解析
        </button>
      </p>
      <label class="sr-only" for="music-progress">播放进度</label
      ><input
        id="music-progress"
        type="range"
        min="0"
        :max="player.duration || 1"
        step="0.1"
        :value="player.time"
        :disabled="!player.duration"
        @input="seek"
      />
      <div class="time-labels">
        <span>{{ formatTime(player.time) }}</span
        ><span>{{ formatTime(player.duration) }}</span>
      </div>
      <div class="player-buttons">
        <button
          class="subtle"
          @click="player.repeat = player.repeat === 'one' ? 'all' : 'one'"
          :aria-label="
            player.repeat === 'one' ? '切换列表循环' : '切换单曲循环'
          "
        >
          {{ player.repeat === "one" ? "单曲" : "列表" }}</button
        ><button
          class="icon-button"
          aria-label="上一首"
          @click="player.next(-1)"
        >
          <van-icon name="arrow-left" /></button
        ><button
          class="primary main-play"
          :aria-label="player.status === 'playing' ? '暂停' : '播放'"
          :disabled="player.status === 'resolving'"
          @click="player.toggle"
        >
          <van-icon
            :name="player.status === 'playing' ? 'pause' : 'play'"
          /></button
        ><button
          class="icon-button"
          aria-label="下一首"
          @click="player.next(1)"
        >
          <van-icon name="arrow" /></button
        ><button
          class="subtle"
          @click="panel = panel === 'queue' ? 'lyrics' : 'queue'"
        >
          {{ panel === "queue" ? "歌词" : "队列" }}
        </button>
      </div>
      <div v-if="panel === 'lyrics'">
        <div class="section-head">
          <h3>歌词</h3>
          <button
            class="subtle"
            :aria-pressed="follow"
            @click="follow = !follow"
          >
            {{ follow ? "跟随中" : "自由滚动" }}
          </button>
        </div>
        <div ref="lyricsBox" class="lyrics-box">
          <button
            v-for="(line, i) in player.lyrics.lines"
            :key="`${line.time}-${i}`"
            :class="{ 'current-line': i === player.lyricIndex }"
            @click="player.seek(line.time)"
          >
            {{ line.text }}
          </button>
          <p v-if="!player.lyrics.lines.length" class="plain-lyrics">
            {{ player.lyrics.plain || "这首歌暂时没有歌词，享受音乐吧。" }}
          </p>
        </div>
      </div>
      <div v-else class="queue-box">
        <div class="section-head">
          <h3>接下来播放 · {{ player.queue.length }} 首</h3>
        </div>
        <div v-for="track in player.queue" :key="track.id" class="queue-row">
          <button
            class="subtle"
            :class="{ 'current-line': track.id === player.current.id }"
            @click="player.play(track)"
          >
            {{ track.name }}</button
          ><button
            class="icon-button"
            :aria-label="`从队列移除${track.name}`"
            @click="player.remove(track.id)"
          >
            <van-icon name="cross" />
          </button>
        </div>
      </div>
      <button
        class="subtle"
        @click="
          player.stop();
          player.expanded = false;
        "
      >
        停止播放并关闭
      </button>
    </section></van-popup
  >
</template>
<style scoped>
.mini-player {
  position: fixed;
  z-index: 39;
  left: max(12px, calc((100vw - 720px) / 2));
  right: max(12px, calc((100vw - 720px) / 2));
  bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  padding: 8px 10px;
  background: #263f35;
  color: #fff;
  border-radius: 18px;
  display: flex;
  align-items: center;
  box-shadow: 0 6px 25px #1f3c3322;
}
.mini-player .icon-button {
  color: #fff;
  font-size: 28px;
}
.mini-player .mini-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  background: transparent;
  color: #fff;
  padding: 0;
  text-align: left;
  justify-content: flex-start;
}
.mini-title > span:last-child {
  min-width: 0;
}
.mini-title strong,
.mini-title small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mini-title strong {
  font-size: 14px;
  font-weight: 550;
}
.mini-title small {
  font-size: 10px;
  color: #b4c7b7;
}
.disc {
  display: grid;
  place-items: center;
  background: #d8e7c8;
  color: #395343;
  flex: 0 0 42px;
  height: 42px;
  border-radius: 50%;
  font-size: 23px;
}
.player-sheet {
  text-align: center;
}
.player-sheet h2 {
  margin: 18px 0 4px;
  overflow-wrap: anywhere;
}
.record-art {
  margin: 8px auto 20px;
  width: 140px;
  height: 140px;
  border: 10px solid #263f35;
  border-radius: 50%;
  background: conic-gradient(#536c58, #2d4034, #536c58);
  display: grid;
  place-items: center;
  color: #e2e8c9;
  font-size: 50px;
  overflow: hidden;
}
.record-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.time-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
  margin-top: -8px;
}
.player-buttons {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin: 16px 0;
}
.player-buttons .main-play {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  font-size: 28px;
}
.player-buttons .subtle {
  font-size: 12px;
  padding: 8px;
}
.lyrics-box {
  height: 220px;
  overflow: auto;
  position: relative;
  padding: 65px 0;
}
.lyrics-box button {
  display: block;
  width: 100%;
  background: transparent;
  font-size: 15px;
  opacity: 0.6;
}
.lyrics-box button.current-line,
.current-line {
  color: var(--green) !important;
  opacity: 1 !important;
  font-weight: 650 !important;
}
.plain-lyrics {
  white-space: pre-wrap;
  font-size: 14px;
  color: var(--muted);
}
.queue-box {
  max-height: 260px;
  overflow: auto;
}
.queue-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  border-bottom: 1px solid var(--line);
}
.queue-row > button:first-child {
  flex: 1;
  justify-content: flex-start;
  overflow-wrap: anywhere;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
