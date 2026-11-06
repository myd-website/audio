<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { showConfirmDialog, showToast } from "vant";
import { usePlayerStore } from "../stores/player";
import { getDownloads, searchMusic, SOURCE_SITE } from "../services/source";
import {
  checkAudioFile,
  listLocal,
  readLocal,
  removeLocal,
  saveLocal,
} from "../services/localFiles";
import type { Track } from "@/shared/lib/workspace";
import { useWorkspaceStore } from "@/shared/stores/workspace";
import { act, message } from "@/shared/lib/feedback";
import { downloadBlob } from "@/shared/services/download";
const player = usePlayerStore();
const router = useRouter();
const workspace = useWorkspaceStore();
const tab = ref("online");
const sourceLoading = ref(true);
const sourceVisible = ref(false);
const searchMode = ref<"source" | "api">("source");
const sourceSearchTerm = ref("");
const sourceSearchFailure = ref("");
watch(tab, (value) => {
  if (value !== "search") cancelSearch();
  if (value === "online") {
    player.stop();
    if (sourceVisible.value) sourceLoading.value = true;
  }
});
watch(searchMode, () => {
  cancelSearch();
});
const keyword = ref("");
const results = ref<Track[]>([]);
const searched = ref(false);
const busy = ref(false);
const local = ref<Track[]>([]);
const localError = ref("");
const fileInput = ref<HTMLInputElement>();
const importing = ref(false);
const file = ref<File>();
const previewUrl = ref("");
const previewOpen = ref(false);
const downloadsOpen = ref(false);
const downloading = ref(false);
const downloadTitle = ref("");
const downloadError = ref("");
const downloads = ref<{ title: string; url: string }[]>([]);
let controller: AbortController | undefined;
let downloadController: AbortController | undefined;
let requestNumber = 0;
let disposed = false;
const tracks = computed<Track[]>(() =>
  tab.value === "search"
    ? results.value
    : tab.value === "favorites"
      ? JSON.parse(JSON.stringify(workspace.data.favorites))
      : tab.value === "local"
        ? local.value
        : player.queue,
);
function cancelSearch() {
  requestNumber++;
  controller?.abort();
  busy.value = false;
}
function useSourceSearch() {
  const term = keyword.value.trim();
  if (!term) {
    showToast("请输入歌名或歌手");
    return;
  }
  openSourceSearch(term);
}
function openSourceSearch(term: string, failure = "") {
  cancelSearch();
  searchMode.value = "source";
  sourceSearchTerm.value = term;
  sourceSearchFailure.value = failure;
  if (tab.value !== "online" || !sourceVisible.value)
    sourceLoading.value = true;
  tab.value = "online";
  player.stop();
  sourceVisible.value = true;
}
async function copyKeyword() {
  try {
    await navigator.clipboard.writeText(sourceSearchTerm.value);
    showToast("已复制，请在下方音源页粘贴搜索");
  } catch {
    showToast("未能自动复制，请长按上方关键词复制");
  }
}
async function search() {
  const term = keyword.value.trim();
  if (!term) {
    showToast("请输入歌名或歌手");
    return;
  }
  if (searchMode.value === "source") {
    useSourceSearch();
    return;
  }
  tab.value = "search";
  controller?.abort();
  controller = new AbortController();
  const token = ++requestNumber;
  busy.value = true;
  sourceSearchFailure.value = "";
  results.value = [];
  searched.value = false;
  try {
    const found = await searchMusic(term, controller.signal);
    if (token === requestNumber) {
      results.value = found;
      searched.value = true;
    }
  } catch (cause) {
    if (
      token === requestNumber &&
      !(cause instanceof DOMException && cause.name === "AbortError")
    ) {
      // 接口拒绝访问时保留本次关键词，原站搜索仍需用户在第三方页面提交。
      openSourceSearch(term, message(cause));
    }
  } finally {
    if (token === requestNumber) busy.value = false;
  }
}
async function loadLocal() {
  try {
    const items = await listLocal();
    if (!disposed) {
      local.value = items;
      localError.value = "";
    }
  } catch (cause) {
    if (!disposed) localError.value = message(cause);
  }
}
function select(event: Event) {
  const input = event.target as HTMLInputElement;
  const chosen = input.files?.[0];
  input.value = "";
  if (!chosen) return;
  try {
    checkAudioFile(chosen);
    clearPreview();
    file.value = chosen;
    previewUrl.value = URL.createObjectURL(chosen);
    previewOpen.value = true;
  } catch (cause) {
    showToast(message(cause));
  }
}
function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
  file.value = undefined;
}
async function confirmImport() {
  if (!file.value || importing.value) return;
  importing.value = true;
  try {
    await saveLocal(file.value);
    if (disposed) return;
    await loadLocal();
    previewOpen.value = false;
    tab.value = "local";
    showToast("已保存在本机音乐库");
  } catch (cause) {
    if (!disposed) showToast(message(cause));
  } finally {
    importing.value = false;
  }
}
async function remove(track: Track) {
  const yes = await showConfirmDialog({
    title: track.local ? "移除本机音乐？" : "移出队列？",
    message: track.name,
  }).then(
    () => true,
    () => false,
  );
  if (!yes) return;
  try {
    if (track.local) {
      await removeLocal(track.id);
      await loadLocal();
    }
    player.remove(track.id);
  } catch (cause) {
    showToast(message(cause));
  }
}
async function download(track: Track) {
  if (track.local) {
    try {
      const blob = await readLocal(track.id);
      downloadBlob(blob, track.name);
    } catch (cause) {
      showToast(message(cause));
    }
    return;
  }
  downloadController?.abort();
  downloadController = new AbortController();
  const active = downloadController;
  downloadTitle.value = track.name;
  downloads.value = [];
  downloadError.value = "";
  downloadsOpen.value = true;
  downloading.value = true;
  try {
    const options = await getDownloads(track, active.signal);
    if (active === downloadController) downloads.value = options;
  } catch (cause) {
    if (active === downloadController && !active.signal.aborted)
      downloadError.value = message(cause);
  } finally {
    if (active === downloadController) downloading.value = false;
  }
}
function favorite(track: Track) {
  act(() => workspace.favorite(track));
}
const isFavorite = (track: Track) =>
  workspace.data.favorites.some((t) => t.id === track.id);
onMounted(loadLocal);
onBeforeUnmount(() => {
  disposed = true;
  requestNumber++;
  controller?.abort();
  downloadController?.abort();
  clearPreview();
});
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">A SOUNDTRACK FOR YOUR DAY</p>
      <h1>听见喜欢的声音</h1>
      <p class="muted">找首喜欢的歌，让日常多一点旋律。</p>
    </div>
    <router-link class="button" to="/music/tools"
      ><van-icon name="edit" />音频工具</router-link
    >
  </div>
  <form
    class="music-search"
    @submit.prevent="search()"
    @keydown.enter="if ($event.isComposing) $event.preventDefault();"
  >
    <van-icon name="search" /><input
      v-model="keyword"
      type="search"
      maxlength="100"
      placeholder="搜索歌曲、歌手…"
      aria-label="搜索歌曲或歌手"
      enterkeyhint="search"
    /><button class="primary" type="submit" :disabled="busy">
      {{ busy ? "搜索中…" : "搜索" }}
    </button>
  </form>
  <div class="row-actions search-modes" role="group" aria-label="搜索方式">
    <button
      :class="{ primary: searchMode === 'source' }"
      :aria-pressed="searchMode === 'source'"
      @click="searchMode = 'source'"
    >
      原站搜索
    </button>
    <button
      :class="{ primary: searchMode === 'api' }"
      :aria-pressed="searchMode === 'api'"
      @click="searchMode = 'api'"
    >
      接口搜索
    </button>
    <span class="muted">{{
      searchMode === "source"
        ? "提交后复制关键词，在音源页内粘贴搜索。"
        : "接口受音源访问限制，失败后可切换原站搜索。"
    }}</span>
  </div>
  <div class="chips">
    <button
      v-for="t in [
        { id: 'online', name: '在线音源' },
        { id: 'search', name: '发现音乐' },
        { id: 'favorites', name: '我的收藏' },
        { id: 'local', name: '本机音乐' },
        { id: 'queue', name: '播放队列' },
      ]"
      :key="t.id"
      :class="{ selected: tab === t.id }"
      @click="tab = t.id"
    >
      {{ t.name }}
    </button>
  </div>
  <section v-if="tab === 'online'" class="card online-source">
    <div v-if="sourceSearchFailure" class="error" role="alert">
      <strong>接口搜索未完成，已切换到原站入口。</strong>
      <p>{{ sourceSearchFailure }}</p>
      <p>请复制下方关键词，在音源页内粘贴后搜索；也可以在新窗口打开。</p>
    </div>
    <div class="section-head">
      <div>
        <h2>在线音源</h2>
        <p class="muted">在音源页内搜索、播放、查看歌词与下载。</p>
      </div>
      <a
        class="button"
        :href="SOURCE_SITE"
        target="_blank"
        rel="noopener noreferrer"
        >新窗口打开 <van-icon name="share-o"
      /></a>
    </div>
    <div v-if="sourceSearchTerm" class="source-keyword" role="status">
      <strong
        >要搜索：<span>{{ sourceSearchTerm }}</span></strong
      >
      <p class="muted">
        请复制关键词，在下方音源页的搜索框粘贴后搜索；也可以在新窗口操作。
      </p>
      <button class="primary" @click="copyKeyword">复制关键词</button>
    </div>
    <template v-if="sourceVisible"
      ><p v-if="sourceLoading" class="muted" role="status">
        正在加载音源页面，如等待较久可在新窗口打开。
      </p>
      <iframe
        :src="SOURCE_SITE"
        title="米兔音乐在线播放器"
        class="source-frame"
        allow="autoplay; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-forms"
        referrerpolicy="no-referrer"
        @load="sourceLoading = false"
    /></template>
    <div v-else class="source-intro">
      <van-icon name="music-o" />
      <h2>从一首喜欢的歌开始</h2>
      <p class="muted">打开后会加载第三方音源页面，搜索和播放由该站提供。</p>
      <button
        class="primary"
        @click="
          player.stop();
          sourceVisible = true;
          sourceLoading = true;
        "
      >
        打开在线音乐 <van-icon name="play-circle-o" />
      </button>
    </div>
    <p class="muted">
      音源页中的播放在离开该页时停止。想跨页面播放自己的音乐，可使用“本机音乐”。若来源限制嵌入，请在新窗口打开。
    </p>
  </section>
  <section v-if="tab === 'local'" class="import-banner">
    <div>
      <h2>把自己的歌，也放进来</h2>
      <p class="muted">仅保存在这台设备，不上传服务器。单个文件最多 40MB。</p>
    </div>
    <button class="primary" @click="fileInput?.click()">
      <van-icon name="plus" />导入音乐</button
    ><input
      ref="fileInput"
      type="file"
      accept="audio/*,.flac,.m4a,.ogg,.wav,.mp3"
      hidden
      style="display: none"
      @change="select"
    />
  </section>
  <section v-if="tab !== 'online'" class="card">
    <div class="section-head">
      <h2>
        {{
          tab === "search"
            ? "搜索结果"
            : tab === "favorites"
              ? "你收藏的歌"
              : tab === "local"
                ? "本机音乐库"
                : "接下来播放"
        }}
      </h2>
      <span class="muted">{{ tracks.length }} 首</span>
    </div>
    <div v-if="tab === 'search' && busy" class="empty" role="status">
      <van-loading color="#22765d" size="28" />正在寻找好音乐…
    </div>
    <div v-if="tab === 'local' && localError" class="error" role="alert">
      {{ localError }} <button @click="loadLocal">重新读取</button>
    </div>
    <div
      v-if="!tracks.length && !busy && !(tab === 'local' && localError)"
      class="empty"
    >
      <van-icon :name="tab === 'search' ? 'music-o' : 'like-o'" />{{
        tab === "search"
          ? searched
            ? "没有找到匹配的歌曲，换个关键词试试。"
            : "输入一首歌名，开始今天的音乐时间。"
          : tab === "favorites"
            ? "遇到喜欢的歌，点一下爱心收进这里。"
            : tab === "local"
              ? "还没有导入音乐，先选一首自己的歌吧。"
              : "点击歌曲播放，或把歌曲加入队列。"
      }}
    </div>
    <div
      v-for="(track, i) in tracks"
      :key="track.id"
      class="song-row"
      :class="{ current: player.current?.id === track.id }"
    >
      <button class="song-main" @click="player.play(track)">
        <span class="song-index">{{
          player.current?.id === track.id ? "♫" : String(i + 1).padStart(2, "0")
        }}</span
        ><span class="song-art"
          ><img
            v-if="track.cover"
            :src="track.cover"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer" /><van-icon
            v-else
            name="music-o" /></span
        ><span class="song-text"
          ><strong>{{ track.name }}</strong
          ><small>{{ track.artist }}</small></span
        >
      </button>
      <div class="song-actions">
        <button
          v-if="!track.local"
          class="icon-button"
          :aria-label="isFavorite(track) ? '取消收藏' : '收藏歌曲'"
          :aria-pressed="isFavorite(track)"
          @click="favorite(track)"
        >
          <van-icon :name="isFavorite(track) ? 'like' : 'like-o'" /></button
        ><button
          v-if="tab !== 'queue'"
          class="icon-button"
          aria-label="加入播放队列"
          @click="
            player.add(track);
            showToast('已加入队列');
          "
        >
          <van-icon name="plus" /></button
        ><button
          class="icon-button"
          aria-label="下载选项"
          @click="download(track)"
        >
          <van-icon name="down" /></button
        ><button
          v-if="track.local"
          class="icon-button"
          aria-label="裁剪或转换这首音乐"
          @click="
            router.push({
              path: '/music/tools',
              query: { local: track.id, name: track.name },
            })
          "
        >
          <van-icon name="edit" /></button
        ><button
          v-if="tab === 'local' || tab === 'queue'"
          class="icon-button"
          aria-label="移除歌曲"
          @click="remove(track)"
        >
          <van-icon name="cross" />
        </button>
      </div>
    </div>
  </section>
  <p class="muted source-note">
    <!-- 音源：米兔音乐。在线资源的可用性取决于来源网站； -->
    本机音乐无需联网播放
  </p>
  <van-popup
    v-model:show="previewOpen"
    position="bottom"
    round
    :close-on-click-overlay="!importing"
    teleport=".aide-app"
    @closed="clearPreview"
    ><section class="sheet">
      <h2>导入前，先听一下</h2>
      <p>{{ file?.name }}</p>
      <p class="muted">
        {{ ((file?.size || 0) / 1024 / 1024).toFixed(1) }} MB ·
        文件会保存在当前浏览器。
      </p>
      <audio
        :src="previewUrl"
        controls
        preload="metadata"
        style="width: 100%; margin: 20px 0"
        @play="player.pause"
      />
      <div class="row-actions">
        <button :disabled="importing" @click="previewOpen = false">取消</button
        ><button class="primary" :disabled="importing" @click="confirmImport">
          {{ importing ? "保存中…" : "确认导入" }}
        </button>
      </div>
    </section></van-popup
  >
  <van-popup
    v-model:show="downloadsOpen"
    position="bottom"
    round
    teleport=".aide-app"
    @closed="downloadController?.abort()"
    ><section class="sheet stack">
      <h2>{{ downloadTitle }} · 下载来源</h2>
      <p v-if="downloading" class="muted">读取下载选项中…</p>
      <p v-if="downloadError" class="error" role="alert">{{ downloadError }}</p>
      <p
        v-if="!downloading && !downloadError && !downloads.length"
        class="muted"
      >
        这首歌暂未提供下载选项，可以前往音源网站查看。
      </p>
      <a
        v-for="d in downloads"
        :key="d.url"
        class="button"
        :href="d.url"
        target="_blank"
        rel="noopener noreferrer"
        >{{ d.title }} · 打开来源 <van-icon name="share-o"
      /></a>
      <p class="muted">来源可能是网盘分享页面，保存步骤由对方网站提供。</p>
      <a
        class="button"
        :href="SOURCE_SITE"
        target="_blank"
        rel="noopener noreferrer"
        >前往音源网站</a
      ><button @click="downloadsOpen = false">关闭</button>
    </section></van-popup
  >
</template>
<style scoped>
.search-modes {
  margin-top: 12px;
}
.search-modes button {
  min-height: 44px;
  font-size: 13px;
  padding: 8px 12px;
}
.source-keyword {
  background: var(--pale);
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
}
.source-keyword strong {
  overflow-wrap: anywhere;
}
.source-keyword span {
  user-select: text;
}
.source-keyword p {
  margin: 8px 0 12px;
}
.source-frame {
  display: block;
  border: 1px solid var(--line);
  border-radius: 16px;
  width: 100%;
  height: max(500px, calc(100dvh - 280px));
  margin: 16px 0;
  background: #16191d;
}
.source-intro {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 18px;
  border-radius: 18px;
  background: #ecf0e3;
  padding: 40px 20px;
  margin: 18px 0;
}
.source-intro > .van-icon {
  font-size: 60px;
  color: var(--green);
}
.online-source > .section-head {
  flex-wrap: wrap;
}
.music-search {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  padding: 8px;
  background: var(--paper);
  border-radius: 16px;
}
.music-search > .van-icon {
  margin-left: 8px;
  color: var(--muted);
  font-size: 23px;
}
.music-search input {
  border: 0 !important;
  background: transparent !important;
  flex: 1;
  min-width: 0;
  padding-left: 3px !important;
}
.music-search button {
  flex-shrink: 0;
}
.import-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #e7eddd;
  padding: 22px;
  border-radius: 20px;
  margin-bottom: 20px;
}
.import-banner h2 {
  font-size: 20px;
  font-weight: 650;
}
.song-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  min-width: 0;
}
.song-row:last-child {
  border-bottom: 0;
}
.song-main {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: center;
  gap: 12px !important;
  background: transparent !important;
  padding: 0 !important;
  flex: 1;
  min-width: 0;
  text-align: left !important;
}
.song-index {
  font-size: 11px;
  color: #8d998e;
  width: 20px;
  flex-shrink: 0;
}
.song-art {
  width: 44px;
  height: 44px;
  background: #e9eee2;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--green);
  font-size: 22px;
  overflow: hidden;
}
.song-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.song-text {
  min-width: 0;
}
.song-text strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.song-text small {
  font-size: 11px;
  color: var(--muted);
  display: block;
}
.song-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.song-actions .icon-button {
  font-size: 19px;
}
.current .song-text strong,
.current .song-index {
  color: var(--green);
}
.source-note {
  margin: 20px 0;
  text-align: center;
  font-size: 11px;
}
@media (max-width: 480px) {
  .song-row {
    flex-wrap: wrap;
    gap: 0;
    padding: 15px 0 8px;
  }
  .song-main {
    flex-basis: 100%;
  }
  .song-actions {
    margin-left: auto;
  }
  .song-actions .icon-button {
    width: 48px;
  }
  .import-banner {
    align-items: flex-start;
    flex-direction: column;
  }
  .page-heading > .button {
    font-size: 12px;
    padding: 10px;
    flex-shrink: 0;
  }
}
</style>
