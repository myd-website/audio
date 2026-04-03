<template>
  <div class="music-item">
    <div class="track-info" @click="handlePlayToggle">
      <div class="track-icon">
        <van-icon
          :name="
            isCurrentTrack && isPlaying ? 'pause-circle-o' : 'play-circle-o'
          "
          :class="{ playing: isCurrentTrack && isPlaying }"
        />
      </div>
      <div class="track-detail">
        <div class="track-name-wrapper">
          <div class="track-name">{{ track.name }}</div>
        </div>
        <div class="track-artist" v-if="track.artist">{{ track.artist }}</div>
      </div>
    </div>

    <div class="track-actions">
      <van-button
        size="mini"
        icon="download-o"
        plain
        type="primary"
        @click="handleDownload"
        :disabled="!props.track.rid"
      >
        下载
      </van-button>
      <!-- <van-icon 
        v-if="!props.track.rid" 
        name="info-o" 
        style="color: #999; margin-left: 8px; font-size: 14px;"
      /> -->
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useMusicStore } from "@/pinia/modules/music";
import { musicAPI } from "@/services/music";
import { showToast } from "vant";

const props = defineProps({
  track: {
    type: Object,
    required: true,
  },
});

const musicStore = useMusicStore();

// 计算当前播放的歌曲
const currentTrack = computed(() => musicStore.currentTrack);
const isPlaying = computed(() => musicStore.isPlaying);

// 是否是当前播放的歌曲
const isCurrentTrack = computed(() => {
  return currentTrack.value?.rid === props.track.rid;
});

// 处理播放/暂停
const handlePlayToggle = async () => {
  try {
    // 如果有 rid，先获取歌曲详情
    if (props.track.rid) {
      showToast("正在加载...");
      const result = await musicAPI.getSongDetail(props.track.rid);

      console.log("歌曲详情:", result);

      if (result && result.data) {
        const songData = result.data;

        // 构建完整的歌曲数据对象
        const updatedTrack = {
          ...props.track,
          name: songData.name || props.track.name,
          artist: songData.artist || props.track.artist,
          url: songData.url || songData.src || songData.file || props.track.url,
          cover: songData.cover || songData.pic || props.track.cover,
          duration: songData.duration,
          album: songData.album,
        };

        // 通过 store 播放歌曲，确保数据统一管理
        musicStore.setCurrentTrack(updatedTrack);
        musicStore.playTrack(updatedTrack);
        showToast(`正在播放：${updatedTrack.name}`);
      }
    } else {
      // 没有 rid，直接通过 store 播放
      musicStore.playTrack(props.track);
      if (props.track.name) {
        showToast(`正在播放：${props.track.name}`);
      }
    }
  } catch (error) {
    console.error("获取歌曲详情失败:", error);
    // 如果获取详情失败，尝试直接播放
    musicStore.playTrack(props.track);
  }
};

// 暴露事件
const emit = defineEmits(["download"]);

// 处理下载
const handleDownload = () => {
  // 从 store 获取当前最新的歌曲数据（如果是当前播放的歌曲）
  const isCurrent = currentTrack.value?.rid === props.track.rid;
  const trackToDownload = isCurrent ? currentTrack.value : props.track;

  if (!trackToDownload.url) {
    showToast("本地音频无法下载或暂无可下载的音频地址");
    return;
  }

  const link = document.createElement("a");
  link.href = trackToDownload.url;
  link.download = trackToDownload.name;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`正在下载：${trackToDownload.name}`);

  // 触发 download 事件
  emit("download", trackToDownload);
};
</script>

<style scoped lang="less">
.music-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1a1a1a;
  border-radius: 8px;
  border: 1px solid #333;
  transition: all 0.3s ease;

  &:active {
    background: #252525;
  }

  .track-info {
    display: flex;
    align-items: center;
    // flex: 1;
    cursor: pointer;
    min-width: 0; // 允许 flex 子项收缩

    .track-icon {
      font-size: 20px;
      margin-right: 12px;
      color: #666;
      flex-shrink: 0;

      .playing {
        color: #1db954;
        animation: pulse 1.5s infinite;
      }
    }

    .track-detail {
      flex: 1;
      min-width: 0; // 允许文本溢出
      overflow: hidden;

      .track-name-wrapper {
        position: relative;
        overflow: hidden;
        margin-bottom: 4px;

        .track-name {
          font-size: 15px;
          font-weight: 500;
          color: #fff;
          white-space: nowrap;
          overflow-x: auto;
          overflow-y: hidden;
          text-overflow: clip;
          scrollbar-width: none; // Firefox 隐藏滚动条
          -webkit-overflow-scrolling: touch;

          &::-webkit-scrollbar {
            display: none; // Chrome/Safari 隐藏滚动条
          }

          // 添加渐变遮罩提示可滚动
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 5%,
            black 95%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 5%,
            black 95%,
            transparent 100%
          );
        }
      }

      .track-artist {
        font-size: 13px;
        color: #999;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .track-actions {
    margin-left: 12px;
    flex-shrink: 0;
    display: flex;
    align-items: center;

    .van-button {
      padding: 0 12px;
      height: 28px;
      font-size: 12px;
      border-color: #444;
      color: #1db954;
      background: transparent;

      &:active {
        background: rgba(29, 185, 84, 0.1);
        border-color: #1db954;
      }

      &[disabled] {
        opacity: 0.5;
        cursor: not-allowed;

        &:active {
          background: transparent;
        }
      }
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
</style>
