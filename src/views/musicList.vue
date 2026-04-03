<template>
  <div class="music-list-page">
    <!-- 播放区域 - 复用首页的 AudioView -->
    <div class="player-area" v-if="showPlayer">
      <!-- <AudioView @close="closePlayer" /> -->
    </div>

    <!-- 控制区域 -->
    <div class="control-area">
      <van-button 
        :type="showPlayer ? 'default' : 'primary'"
        size="small" 
        plain 
        @click="togglePlayer"
        :icon="showPlayer ? 'play-circle-o' : 'plus'"
        class="control-btn"
        :class="{ active: !showPlayer }"
      >
        {{ showPlayer ? '查看列表' : '添加歌曲' }}
      </van-button>
      <van-button 
        type="danger" 
        size="small" 
        plain 
        @click="handleClearAll"
        icon="delete-o"
        class="control-btn"
      >
        清空列表
      </van-button>
    </div>

    <!-- 播放列表 -->
    <div class="playlist-area" v-show="!showPlayer">
      <h3 class="section-title">
        播放列表 
        <span class="count">({{ playlist.length }}首)</span>
      </h3>
      
      <van-empty 
        v-if="playlist.length === 0" 
        description="暂无歌曲，请添加"
        :image-size="80"
      />
      
      <div v-else class="playlist">
        <!-- <MusicItem 
          v-for="track in playlist" 
          :key="track.id" 
          :track="track"
          @play="playTrack"
          @download="downloadTrack"
          @delete="deleteTrack"
        /> -->
      </div>
    </div>

    <!-- 上传弹窗 -->
    <van-dialog
      v-model:show="showUpload"
      title="添加歌曲"
      show-cancel-button
      @confirm="handleAddMusic"
    >
      <van-field
        v-model="newTrack.name"
        label="歌曲名"
        placeholder="请输入歌曲名称"
        clearable
      />
      <van-field
        v-model="newTrack.artist"
        label="歌手"
        placeholder="请输入歌手名称"
        clearable
      />
      <van-field
        v-model="newTrack.url"
        label="地址"
        placeholder="请输入音频文件 URL 或点击上传"
        clearable
        readonly
        @click="inputFile?.click()"
      />
      <input
        ref="inputFile"
        type="file"
        accept="audio/*"
        style="display: none"
        @change="handleFileSelect"
      />
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMusicStore, MusicTrack } from '@/pinia/modules/music';
import { generateId } from '@/utils/music';
import { showToast, showConfirmDialog } from 'vant';

const musicStore = useMusicStore();
const showUpload = ref(false);
const inputFile = ref<HTMLInputElement | null>(null);
const showPlayer = ref(false);

// 新建歌曲表单
const newTrack = ref<{
  name: string;
  artist: string;
  url: string;
}>({
  name: '',
  artist: '',
  url: '',
});

// 播放列表
const playlist = computed(() => musicStore.playlist);

// 切换播放器显示
const togglePlayer = () => {
  showPlayer.value = !showPlayer.value;
};

// 关闭播放器
const closePlayer = () => {
  showPlayer.value = false;
};

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;
  
  // 验证文件类型
  if (!file.type.startsWith('audio/')) {
    showToast('请选择音频文件');
    return;
  }
  
  // 创建临时 URL
  const url = URL.createObjectURL(file);
  newTrack.value.url = url;
  newTrack.value.name = file.name.replace(/\.[^/.]+$/, ''); // 移除扩展名作为歌名
  
  showToast('文件已选择');
};

// 添加歌曲
const handleAddMusic = () => {
  const { name, artist, url } = newTrack.value;
  
  if (!name) {
    showToast('请输入歌曲名称');
    return;
  }
  
  if (!url) {
    showToast('请选择或输入音频文件地址');
    return;
  }
  
  const track: MusicTrack = {
    id: generateId(),
    name,
    url,
    artist: artist || undefined,
  };
  
  musicStore.addToPlaylist(track);
  showToast('添加成功');
  
  // 重置表单
  newTrack.value = {
    name: '',
    artist: '',
    url: '',
  };
  
  // 重置文件输入
  if (inputFile.value) {
    inputFile.value.value = '';
  }
};

// 播放歌曲
const playTrack = (track: MusicTrack) => {
  musicStore.playTrack(track);
  showToast(`正在播放：${track.name}`);
};

// 下载歌曲
const downloadTrack = (track: MusicTrack) => {
  const link = document.createElement('a');
  link.href = track.url;
  link.download = track.name;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('开始下载');
};

// 删除歌曲
const deleteTrack = async (track: MusicTrack) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除"${track.name}"吗？`,
    });
    musicStore.removeFromPlaylist(track.id);
    showToast('删除成功');
  } catch {
    // 取消操作
  }
};

// 清空列表
const handleClearAll = async () => {
  try {
    await showConfirmDialog({
      title: '确认清空',
      message: '确定要清空整个播放列表吗？',
    });
    
    musicStore.clearPlaylist();
    showToast('已清空播放列表');
  } catch {
    // 取消操作
  }
};
</script>

<style scoped lang="less">
.music-list-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(180deg, #f5f7fa 0%, #c3cfe2 100%);

  .player-area {
    margin-bottom: 20px;
  }

  .control-area {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    justify-content: center;

    .control-btn {
      transition: all 0.3s ease;
      border-radius: 20px;
      padding: 0 16px;
      
      &.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        
        &:active {
          transform: scale(0.95);
        }
      }

      &:not(.active) {
        &:active {
          transform: scale(0.95);
        }
      }
    }
  }

  .playlist-area {
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
      text-align: center;
      
      .count {
        font-size: 14px;
        font-weight: 400;
        color: #999;
      }
    }

    .playlist {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  }
}
</style>
