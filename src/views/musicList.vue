<template>
  <div class="music-list-page">
    <!-- 播放区域 - 使用 audioPlay 组件 -->
    <div class="player-area" v-if="currentTrack">
      <AudioPlay
        :audioUrl="currentTrack.url"
        :aduioName="currentTrack.name"
        ref="audioPlayerRef"
      />
    </div>

    <!-- 控制区域 -->
    <div class="control-area">
      <van-button
        type="primary"
        size="small"
        plain
        @click="showUpload = true"
        icon="plus"
        class="control-btn"
      >
        添加歌曲
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
    <div class="playlist-area">
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
        <MusicItem
          v-for="track in playlist"
          :key="track.id"
          :track="track"
          @download="handleDownload"
        />
      </div>
    </div>

    <!-- 添加歌曲弹窗 -->
    <van-dialog
      :show="showUpload"
      @update:show="showUpload = $event"
      title="添加歌曲"
      show-cancel-button
      @confirm="handleAddMusic"
    >
      <!-- 搜索框 -->
      <van-field
        v-model="searchKeyword"
        label=""
        placeholder="搜索歌曲（接口待实现）"
        clearable
        right-icon="search"
        @click-right-icon="handleSearch"
      />

      <!-- 上传表单 -->
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
        @click="handleUrlClick"
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

<script setup>
import { ref, computed } from "vue";
import AudioPlay from "./audioPlay.vue";
import MusicItem from "@/components/MusicItem.vue";
import { useMusicStore } from "@/pinia/modules/music";
import { showToast, showConfirmDialog } from "vant";

const musicStore = useMusicStore();
const audioPlayerRef = ref(null);
const showUpload = ref(false);
const inputFile = ref(null);
const searchKeyword = ref("");

// 新建歌曲表单
const newTrack = ref({
  name: "",
  artist: "",
  url: "",
});

// 播放列表
const playlist = computed(() => musicStore.playlist);

// 当前播放的歌曲
const currentTrack = computed(() => musicStore.currentTrack);

// 处理文件选择
const handleFileSelect = (event) => {
  const target = event.target;
  const file = target.files?.[0];

  if (!file) return;

  // 验证文件类型
  if (!file.type.startsWith("audio/")) {
    showToast("请选择音频文件");
    return;
  }

  // 创建临时 URL
  const url = URL.createObjectURL(file);
  newTrack.value.url = url;
  newTrack.value.name = file.name.replace(/\.[^/.]+$/, ""); // 移除扩展名作为歌名

  showToast("文件已选择");
};

// 处理 URL 输入框点击
const handleUrlClick = () => {
  if (inputFile.value) {
    inputFile.value.click();
  }
};

// 搜索歌曲（预留接口）
const handleSearch = () => {
  if (!searchKeyword.value.trim()) {
    showToast("请输入搜索关键词");
    return;
  }

  // TODO: 调用搜索接口
  showToast(`搜索：${searchKeyword.value}（接口待实现）`);
  console.log("搜索歌曲:", searchKeyword.value);
};

// 添加歌曲
const handleAddMusic = () => {
  const { name, artist, url } = newTrack.value;

  if (!name) {
    showToast("请输入歌曲名称");
    return;
  }

  if (!url) {
    showToast("请选择或输入音频文件地址");
    return;
  }

  const track = {
    id: Date.now().toString(),
    name,
    url,
    artist: artist || undefined,
  };

  musicStore.addToPlaylist(track);
  showToast("添加成功");

  // 重置表单
  newTrack.value = {
    name: "",
    artist: "",
    url: "",
  };

  // 重置文件输入
  if (inputFile.value) {
    inputFile.value.value = "";
  }
};

// 下载歌曲
const handleDownload = (track) => {
  showToast(`正在下载：${track.name}`);
};

// 清空列表
const handleClearAll = async () => {
  try {
    await showConfirmDialog({
      title: "确认清空",
      message: "确定要清空整个播放列表吗？",
    });

    musicStore.clearPlaylist();
    showToast("已清空播放列表");
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

      &:active {
        transform: scale(0.95);
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
      gap: 12px;
    }
  }
}
</style>
