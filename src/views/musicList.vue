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
      <div class="playlist-header">
        <h3 class="section-title">
          <van-icon name="music-o" class="title-icon" />
          播放列表
        </h3>
        <span class="count">({{ playlist.length }}首)</span>
      </div>

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
      confirm-button-text="确认添加"
      cancel-button-text="取消"
      @confirm="handleAddMusic"
    >
      <!-- 搜索区域 -->
      <div class="search-section">
        <div class="section-label">
          <van-icon name="search" />
          <span>搜索歌曲</span>
        </div>
        <div class="search-input-wrapper">
          <van-field
            v-model="searchKeyword"
            placeholder="输入歌名搜索"
            clearable
          />
          <van-icon name="search" class="search-icon" @click="handleSearch" />
        </div>
      </div>

      <!-- 分割线 -->
      <div class="divider"></div>

      <!-- 上传表单 -->
      <div class="upload-form">
        <div class="section-label">
          <van-icon name="add-o" />
          <span>添加歌曲</span>
        </div>

        <div class="form-item">
          <label class="form-label">
            <van-icon name="music-o" />
            歌曲名称
          </label>
          <div class="input-wrapper">
            <van-field
              v-model="newTrack.name"
              placeholder="请输入歌曲名称"
              clearable
              readonly
            />
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">
            <van-icon name="user-o" />
            歌手名称
          </label>
          <div class="input-wrapper">
            <van-field
              v-model="newTrack.artist"
              placeholder="请输入歌手名称"
              clearable
              readonly
            />
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">
            <van-icon name="link" />
            音频地址
          </label>
          <div class="input-wrapper" @click="handleUrlClick">
            <van-field
              v-model="newTrack.url"
              placeholder="点击上传或输入 URL"
              readonly
            />
            <van-icon name="upload" class="upload-icon" />
          </div>
        </div>
      </div>

      <!-- 文件输入 -->
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
import { musicAPI } from "@/services/music";

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
  newTrack.value.artist = file.name.split("-")[0] || "未知艺术家"; // 默认艺术家

  showToast("文件已选择");
};

// 搜索歌曲
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    showToast("请输入搜索关键词");
    return;
  }

  try {
    showToast("正在搜索...");

    const keyword = searchKeyword.value.trim();
    console.log("搜索关键词:", keyword);

    // 调用封装的 API
    const result = await musicAPI.searchSongs(keyword);

    console.log("搜索结果:", result);

    if (result && result.data && result.data.length > 0) {
      // 处理搜索结果
      const tracks = result.data
        .map((item) => ({
          id: item.id || Date.now().toString(),
          name: item.name || item.title || "未知歌曲",
          artist: item.artist || item.singer || "未知歌手",
          url: item.url || item.pic,
          cover: item.cover,
        }))
        .filter((track) => track.url); // 只保留有 URL 的歌曲

      console.log("处理后的歌曲数据:", tracks);

      if (tracks.length > 0) {
        // 添加到播放列表
        tracks.forEach((track) => {
          musicStore.addToPlaylist(track);
        });
        showToast(`成功添加 ${tracks.length} 首歌曲`);
        // 关闭弹窗
        showUpload.value = false;
        // 清空搜索
        searchKeyword.value = "";
      } else {
        showToast("未找到可播放的歌曲");
      }
    } else {
      showToast("未找到相关歌曲");
    }
  } catch (error) {
    console.error("搜索失败:", error);
    // 错误提示已在拦截器中处理
  }
};

// 处理 URL 输入框点击
const handleUrlClick = () => {
  if (inputFile.value) {
    inputFile.value.click();
  }
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
  background: linear-gradient(180deg, #0f0f0f 0%, #1a1a2e 100%);

  .player-area {
    margin-bottom: 24px;
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
      border-color: #333;
      background: #1a1a1a;
      color: #fff;

      &:active {
        transform: scale(0.95);
        background: #252525;
      }
    }
  }

  .playlist-area {
    background: #1a1a1a;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #333;

    .playlist-header {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #333;

      .section-title {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
        margin: 0;
        display: flex;
        align-items: center;

        .title-icon {
          margin-right: 8px;
          color: #1db954;
          font-size: 20px;
        }
      }

      .count {
        font-size: 14px;
        font-weight: 400;
        color: #999;
        margin-left: 8px;
      }
    }

    .playlist {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  }
}

// 弹窗样式覆盖
:deep(.van-dialog) {
  background: #1a1a1a !important;
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
  max-width: 90% !important;
  width: auto !important;

  .van-dialog__header {
    background: #1db954;
    padding: 10px 20px !important;
    text-align: center !important;
    position: relative;

    .van-dialog__title {
      color: #fff !important;
      font-weight: 600 !important;
      font-size: 20px !important;
      letter-spacing: 1px !important;
    }

    // 添加光晕效果
    // &::before {
    //   content: '';
    //   position: absolute;
    //   top: -50%;
    //   left: -50%;
    //   width: 200%;
    //   height: 200%;
    //   background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    //   animation: shimmer 3s infinite;
    // }
  }

  .van-dialog__content {
    padding: 10px 20px !important;
    background: #5d5c5c !important;
    color: #fff !important;
    max-height: 60vh;
    overflow-y: auto;

    // 搜索区域
    .search-section {
      margin-bottom: 8px;

      .section-label {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        color: #1db954;
        font-size: 14px;
        font-weight: 600;

        .van-icon {
          font-size: 16px;
        }
      }

      .search-input-wrapper {
        position: relative;

        .van-field {
          background: #4f4d4d;
          border-radius: 12px !important;
          padding: 0 40px 0 16px !important;
          border: 1px solid #333 !important;
          transition: all 0.3s ease;

          &:focus-within {
            border-color: #1db954 !important;
            box-shadow: 0 0 0 2px rgba(29, 185, 84, 0.1) !important;
          }

          :deep(.van-field__control) {
            color: #fff;
            font-size: 14px;
          }

          :deep(.van-field__placeholder) {
            color: #666;
            font-size: 14px;
          }

          :deep(.van-field__clear) {
            color: #666;
          }
        }

        .search-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #1db954;
          font-size: 18px;
          pointer-events: auto;
          cursor: pointer;
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-50%) scale(1.1);
            color: #1ed760;
          }

          &:active {
            transform: translateY(-50%) scale(0.95);
          }
        }
      }
    }

    // 分割线
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #333, transparent);
      margin: 20px 0;
    }

    // 上传表单
    .upload-form {
      .section-label {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        color: #1db954;
        font-size: 14px;
        font-weight: 600;

        .van-icon {
          font-size: 16px;
        }
      }

      .form-item {
        margin-bottom: 16px;

        .form-label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          color: #fff;
          font-size: 13px;
          font-weight: 500;

          .van-icon {
            color: #1db954;
            font-size: 14px;
          }
        }

        .input-wrapper {
          position: relative;
          cursor: pointer;

          .van-field {
            background: #4f4d4d;
            border-radius: 12px !important;
            padding: 0 40px 0 16px !important;
            border: 1px solid #333 !important;
            transition: all 0.3s ease;

            &:focus-within {
              border-color: #1db954 !important;
              box-shadow: 0 0 0 2px rgba(29, 185, 84, 0.1) !important;
            }

            :deep(.van-field__control) {
              color: #c8c9cc;
              font-size: 14px;
            }

            :deep(.van-field__placeholder) {
              color: #666;
              font-size: 14px;
            }

            :deep(.van-field__control) {
              color: #fff;
            }

            &[readonly] {
              cursor: pointer;
              background: linear-gradient(135deg, #2a2a2a 0%, #242424 100%);
            }
          }

          .upload-icon {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #1db954;
            font-size: 18px;
            transition: all 0.3s ease;
          }

          &:hover .upload-icon {
            transform: translateY(-50%) scale(1.1);
          }
        }
      }
    }
  }

  .van-dialog__footer {
    padding: 16px 20px 20px !important;
    background: #5d5c5c !important;
    border-top: 1px solid #333 !important;
    display: flex;
    gap: 12px;

    .van-button {
      flex: 1;
      border-radius: 10px !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      padding: 12px 0 !important;
      transition: all 0.3s ease;

      &--default {
        background: #1db954;
        border: 1px solid #333 !important;
        color: #fff !important;

        &:hover {
          background: linear-gradient(
            135deg,
            #2a2a2a 0%,
            #242424 100%
          ) !important;
          border-color: #444 !important;
        }

        &:active {
          transform: scale(0.98);
          background: #333 !important;
        }
      }

      &--primary {
        background: linear-gradient(
          135deg,
          #1db954 0%,
          #1ed760 100%
        ) !important;
        border: none !important;
        color: #fff !important;
        box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3) !important;

        &:hover {
          box-shadow: 0 6px 16px rgba(29, 185, 84, 0.4) !important;
        }

        &:active {
          transform: scale(0.98);
          opacity: 0.9;
        }
      }
    }
  }
}

:deep(.van-field__control) {
  color: #c8c9cc !important;
}

@keyframes shimmer {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
