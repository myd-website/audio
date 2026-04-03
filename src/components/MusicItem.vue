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
    flex: 1;
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
          mask-image: linear-gradient(to right, 
            transparent 0%, 
            black 5%, 
            black 95%, 
            transparent 100%);
          -webkit-mask-image: linear-gradient(to right, 
            transparent 0%, 
            black 5%, 
            black 95%, 
            transparent 100%);
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
