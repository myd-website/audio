<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { showConfirmDialog, showToast } from "vant";
import { useWorkspaceStore } from "@/shared/stores/workspace";
import { localDate, WORKSPACE_KEY } from "@/shared/lib/workspace";
import {
  decodeProfileBackup,
  encodeProfileBackup,
  profileName,
} from "@/shared/lib/profiles";
import { useProfileStore } from "@/shared/stores/profile";
import { importSharedLocal } from "@/modules/music/services/localFiles";
import { act, message } from "@/shared/lib/feedback";
import { downloadBlob } from "@/shared/services/download";
import { useProfileActions } from "@/shared/composables/useProfileActions";
import AppSelect from "@/shared/components/AppSelect.vue";
const { exitProfile, exiting } = useProfileActions();
const store = useWorkspaceStore();
const router = useRouter();
const profile = useProfileStore();
const profileId = profile.requireCurrent();
const label = profileName(profileId);
const migratingMusic = ref(false);
const name = ref(store.data.preferences.name);
const grade = ref(store.data.preferences.grade);
const gradeOptions = Array.from({ length: 6 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1} 年级`,
}));
watch(
  () => store.data.preferences,
  (p) => {
    name.value = p.name;
    grade.value = p.grade;
  },
);
const fileInput = ref<HTMLInputElement>();
function save() {
  if (
    act(() =>
      store.commit((next) => {
        next.preferences = { name: name.value.trim(), grade: grade.value };
      }),
    )
  )
    showToast("偏好已保存在本机");
}
function backup(raw = false, shared = false) {
  act(() => {
    const content = shared
      ? localStorage.getItem(WORKSPACE_KEY)
      : raw
        ? localStorage.getItem(store.storageKey)
        : encodeProfileBackup(
            profileId,
            JSON.parse(JSON.stringify(store.data)),
          );
    if (content === null) throw new Error("没有找到可导出的记录。");
    downloadBlob(
      new Blob([content], { type: "application/json" }),
      `小伴-${shared ? "旧版共享记录" : label}-${raw ? "原始数据" : "备份"}-${localDate()}.json`,
    );
  });
}
async function restore(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    if (file.size > 8_000_000) throw new Error("备份不能超过 8MB。");
    const raw = await file.text();
    const parsed = decodeProfileBackup(raw);
    const yes = await showConfirmDialog({
      title: `替换${label}的记录？`,
      message: `备份来源：${parsed.source}。将恢复 ${parsed.data.tasks.length} 项任务、${parsed.data.attempts.length} 条学习记录至${label}。请先导出当前数据；另一份档案和音乐文件不受影响。`,
      confirmButtonText: "确认恢复",
    }).then(
      () => true,
      () => false,
    );
    if (yes && act(() => store.restore(JSON.stringify(parsed.data))))
      showToast(`已恢复到${label}`);
  } catch (cause) {
    showToast(message(cause));
  }
}
function importLegacy() {
  act(() =>
    showToast(`已导入 ${store.importLegacy()} 项旧待办，未修改旧版数据。`),
  );
}
async function importShared() {
  const yes = await showConfirmDialog({
    title: `导入到${label}？`,
    message:
      "将改造前的共享记录复制到当前空档案，包括学习、待办、收藏和偏好。旧记录保留；当前档案已有数据时不会覆盖。",
  }).then(
    () => true,
    () => false,
  );
  if (yes && act(() => store.importShared())) showToast(`旧记录已导入${label}`);
}
async function importMusic() {
  if (migratingMusic.value) return;
  const yes = await showConfirmDialog({
    title: `导入旧音乐到${label}？`,
    message:
      "复制改造前共享音乐库中的文件，重复导入自动去重。旧库保留；另一份档案不会自动获得这些文件。",
  }).then(
    () => true,
    () => false,
  );
  if (!yes) return;
  migratingMusic.value = true;
  try {
    showToast(`已导入 ${await importSharedLocal()} 首旧音乐`);
  } catch (cause) {
    showToast(message(cause));
  } finally {
    migratingMusic.value = false;
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">YOUR LITTLE SPACE</p>
      <h1>{{ label }} · 偏好</h1>
      <p class="muted">把助手变成你喜欢的样子。</p>
    </div>
  </div>
  <div class="grid-two settings-grid">
    <section class="card stack">
      <h2>正在使用{{ label }}</h2>
      <p class="muted">
        两份本机档案各自保存待办、学习记录、收藏和音乐文件，首次进入每份档案需验证邀请码，可在这里切换
      </p>
      <button
        class="primary"
        @click="router.push('/profiles')"
        :disabled="migratingMusic"
      >
        切换本机档案
      </button>
      <button
        class="danger"
        :disabled="migratingMusic || exiting"
        @click="exitProfile"
      >
        退出当前档案
      </button>
      <p class="muted">
        退出会清除当前标签页的档案选择与邀请码验证，下次进入需重新输入，不删除学习、日程、收藏和音乐
      </p>
      <p class="muted">
        切换会停止播放与专注计时，并在进入档案时刷新页面。邀请码为前端入口验证，不提供服务端身份认证
      </p>
    </section>
    <section class="card stack">
      <h2>学习偏好</h2>
      <label
        >怎么称呼你<input
          v-model="name"
          maxlength="30"
          placeholder="你的昵称" /></label
      ><AppSelect
        :model-value="grade"
        label="默认年级"
        :options="gradeOptions"
        @update:model-value="grade = Number($event)"
      /><button class="primary" @click="save" :disabled="!store.ready">
        保存偏好
      </button>
    </section>
    <section class="card stack">
      <h2>数据保存在这台设备</h2>
      <p class="muted">
        这是 GitHub Pages 纯前端版本，当前使用{{
          label
        }}。记录和音乐文件按档案分别保存；清除网站数据或更换浏览器后不能自动找回。
      </p>
      <p class="muted">
        跨设备可手动导出、传送并恢复备份。备份包含个人记录，请妥善保存；备份不包含音乐文件。
      </p>
      <button @click="backup()" :disabled="!store.ready">
        <van-icon name="down" />导出数据备份</button
      ><button @click="fileInput?.click()">
        <van-icon name="upgrade" />从备份恢复</button
      ><input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        hidden
        style="display: none"
        @change="restore"
      /><button @click="importLegacy" :disabled="!store.ready">
        导入旧版待办（自动去重）
      </button>
    </section>
    <section class="card stack">
      <h2>把之前的记录带过来</h2>
      <p class="muted">
        旧版共享记录和音乐库仍保留，只有点击导入才会复制到{{
          label
        }}，不会自动复制给两份档案。
      </p>
      <button @click="importShared" :disabled="!store.ready">
        导入改造前共享记录（仅空档案）
      </button>
      <button @click="backup(true, true)">导出改造前共享记录</button>
      <button @click="importMusic" :disabled="migratingMusic">
        {{ migratingMusic ? "导入中…" : "导入改造前的本机音乐" }}
      </button>
    </section>
    <section v-if="store.error" class="card stack">
      <h2>存储恢复</h2>
      <p class="error">{{ store.error }}</p>
      <button @click="backup(true)">导出原始数据</button
      ><button @click="store.load">重新读取</button>
      <p class="muted">
        读取失败时不会用空列表覆盖原记录。若原始文件已损坏，请保留文件后修复，不要直接清除网站数据。
      </p>
    </section>
    <section class="card stack">
      <h2>更多工具</h2>
      <router-link class="button" to="/calculator">日常计算器</router-link>
      <router-link class="button" to="/calculator?mode=vertical"
        >竖式计算器</router-link
      ><router-link class="button" to="/planner/legacy">旧版待办</router-link
      ><router-link class="button" to="/address/list">旧版地址管理</router-link>
      <p class="muted">
        旧页面作为兼容入口保留，仍使用原共享存储，不按本机档案隔离；新日程与旧待办需要通过上方按钮手动导入
      </p>
    </section>
  </div>
</template>
<style scoped>
@media (max-width: 680px) {
  .settings-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
