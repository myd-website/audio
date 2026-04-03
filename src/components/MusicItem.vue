<template>
  <div class="music-item">
    <div class="track-info" @click="handlePlayToggle">
      <div class="track-icon">
        <van-icon 
          :name="isCurrentTrack && isPlaying ? 'pause-circle-o' : 'play-circle-o'" 
          :class="{ playing: isCurrentTrack && isPlaying }"
        />
      </div>
      <div class="track-detail">
        <div class="track-name">{{ track.name }}</div>
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
      >
        下载
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMusicStore } from '@/pinia/modules/music';

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
  return currentTrack.value?.id === props.track.id;
});

// 处理播放/暂停
const handlePlayToggle = () => {
  musicStore.playTrack(props.track);
};

// 暴露事件
const emit = defineEmits(['download']);

// 处理下载
const handleDownload = () => {
  const link = document.createElement('a');
  link.href = props.track.url;
  link.download = props.track.name;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 触发 download 事件
  emit('download', props.track);
  
  if (props.onDownload) {
    props.onDownload(props.track);
  }
};
</script>

<style scoped lang="less">
.music-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }

  .track-info {
    display: flex;
    align-items: center;
    flex: 1;
    cursor: pointer;
    
    .track-icon {
      font-size: 24px;
      margin-right: 12px;
      color: #667eea;
      
      .playing {
        color: #f57c5e;
        animation: pulse 1.5s infinite;
      }
    }
    
    .track-detail {
      flex: 1;
      
      .track-name {
        font-size: 16px;
        font-weight: 500;
        color: #333;
        margin-bottom: 4px;
      }
      
      .track-artist {
        font-size: 13px;
        color: #999;
      }
    }
  }
  
  .track-actions {
    .van-button {
      padding: 0 12px;
      height: 28px;
      font-size: 12px;
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
