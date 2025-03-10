<template>
  <div class="audio-player">
    <span class="audio-name">{{ aduioName }}</span>
    <!-- 音频播放器 -->
    <audio
      ref="audioPlayer"
      :src="audioUrl"
      @timeupdate="onTimeUpdate"
      @ended="onTimeEnded"
      @loadedmetadata="onLoadedMetadata"
    />

    <!-- 播放/暂停按钮 -->
    <div class="play-btn" @click="togglePlay">
      <!-- {{ isPlaying ? "暂停" : "播放" }} -->
      <van-icon v-if="!isPlaying" name="play-circle" />
      <van-icon v-else name="pause-circle" />
    </div>

    <!-- 进度条 -->
    <!-- <div
      class="progress-bar"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div
        class="progress"
        :style="{ width: progress + '%', '--after-width': progress + '%' }"
      ></div>
    </div> -->

    <!-- 滑块用于调整播放进度 -->
    <div class="progress-bar">
      <van-slider
        v-model="progress"
        bar-height="6px"
        button-size="15px"
        active-color="#fff"
        inactive-color="#7b8458"
        @change="onSliderChange"
      />
    </div>

    <!-- 播放时间 -->
    <div class="time-display">
      {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
    </div>

    <!-- 音量控制 -->
    <div class="volume-control">
      <span @click="setMute"><van-icon name="volume" /></span>
      <input
        type="range"
        v-model="volume"
        min="0"
        max="1"
        step="0.1"
        @input="setVolume"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";

defineProps({
  audioUrl: String,
  aduioName: String,
});

const audioPlayer = ref(null); // 音频元素
const isPlaying = ref(false); // 是否正在播放
const currentTime = ref(0); // 当前播放时间
const duration = ref(0); // 音频总时长
const progress = ref(0); // 播放进度百分比
const volume = ref(1); // 音量
const isDragging = ref(false); // 是否正在拖动进度条
const afterWidth = ref(progress.value); // 进度值的宽度
const storageVolume = ref(1); // 默认为1

// 播放/暂停
const togglePlay = () => {
  if (isPlaying.value) {
    audioPlayer.value.pause();
  } else {
    audioPlayer.value.play();
  }
  isPlaying.value = !isPlaying.value;
};

// 更新播放时间和进度
const onTimeUpdate = () => {
  if (!isDragging.value) {
    currentTime.value = audioPlayer.value?.currentTime;
    progress.value = (currentTime.value / duration.value) * 100;
  }
};

// 音频播放结束
const onTimeEnded = () => {
  console.log("播放完");
  isPlaying.value = true; // 更新播放状态
  togglePlay();
  // currentTime.value = 0; // 重置播放时间
  // progress.value = 0; // 重置进度条
};

// 加载音频元数据
const onLoadedMetadata = () => {
  duration.value = audioPlayer.value.duration;
};

// 格式化时间（MM:SS）
const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// 设置音量
const setVolume = (event) => {
  storageVolume.value = event.target.value;
  audioPlayer.value.volume = event.target.value;
};

// 设置静音/回复音量
const setMute = () => {
  if (volume.value === 0) {
    audioPlayer.value.volume = storageVolume.value;
    volume.value = storageVolume.value;
  } else {
    audioPlayer.value.volume = 0;
    volume.value = 0;
  }
};

// 拖动滑块时更新播放时间
const onSliderChange = (value) => {
  isPlaying.value = true;
  togglePlay();
  audioPlayer.value.currentTime = (value / 100) * duration.value;
  progress.value = value; // 更新滑块位置
};

// 触摸事件处理
let startX = 0;
let startProgress = 0;

const onTouchStart = (event) => {
  isDragging.value = true;
  startX = event.touches[0].clientX;
  startProgress = progress.value;
};

const onTouchMove = (event) => {
  event.preventDefault();
  if (event.target.clientWidth === 0) return;

  if (isDragging.value) {
    requestAnimationFrame(() => {
      const deltaX = event.touches[0].clientX - startX;
      const progressDelta = (deltaX / event.target.clientWidth) * 100;
      progress.value = Math.min(
        100,
        Math.max(0, startProgress + progressDelta)
      );
    });
  }
};

const onTouchEnd = () => {
  isDragging.value = false;
  audioPlayer.value.currentTime = (progress.value / 100) * duration.value;
};

onMounted(() => {
  audioPlayer.value.volume = volume.value;
});
</script>

<style scoped lang="less">
.audio-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-radius: 10px;
  max-width: 400px;
  margin: 0 auto;
  background: linear-gradient(to right top, #ecfe56aa, #f2ff8a94);
  backdrop-filter: blur(12px);
  border: 1px solid #f0f0f025;
  .audio-name {
    margin: 0 0 0.1rem;
  }

  .play-btn {
    font-size: 0.7rem;
    color: #d2f2c5;
    border: none;
    border-radius: 50%;
    cursor: pointer;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background-color: #33333355;
    border-radius: 0.1rem;
    margin: 20px 0;
    position: relative;
    cursor: pointer;
  }

  .progress::after {
    content: "";
    background: #fff;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    left: calc(var(--after-width, 0%) - 1px);
    z-index: 1000;
    display: block;
    position: absolute;
    top: 50%;
    transform: translatey(-50%);
    transition: left 0.1sease-in-out;
    flex-shrink: 0px;
  }

  .progress {
    height: 100%;
    background-color: #fff;
    border-radius: 0.1rem 0 0 0.1rem;
  }

  .time-display {
    font-size: 14px;
    color: #333;
    margin-bottom: 20px;
  }

  .volume-control {
    width: 100%;
  }

  input[type="range"] {
    width: 100%;
    height: 6px;
  }
}
</style>
