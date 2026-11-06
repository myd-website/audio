<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import GlobalPlayer from "@/modules/music/components/GlobalPlayer.vue";
import { useWorkspaceStore } from "@/shared/stores/workspace";
import { useMobileViewport } from "@/shared/composables/useMobileViewport";
import ProfilesPage from "@/modules/account/pages/ProfilesPage.vue";
import { useProfileStore } from "@/shared/stores/profile";
import { profileName } from "@/shared/lib/profiles";
import { usePlayerStore } from "@/modules/music/stores/player";
import { useFocusStore } from "@/modules/fun/stores/focus";
import { closeDialog } from "vant";
import { useFixedScale } from "@/shared/composables/useFixedScale";
import { useProfileActions } from "@/shared/composables/useProfileActions";
useFixedScale();
const { exitProfile, exiting } = useProfileActions();
const { keyboardOpen, viewportStyle } = useMobileViewport();
const route = useRoute();
const workspace = useWorkspaceStore();
const profile = useProfileStore();
const player = usePlayerStore();
const focus = useFocusStore();
const shellMounted = ref(false);
// Vant 即使隐藏也会创建 Teleport；先挂载目标容器，再渲染包含弹层的页面。
onMounted(() => {
  shellMounted.value = true;
});
const choosingProfile = computed(
  () => !profile.current || route.path === "/profiles",
);
watch(choosingProfile, (choosing) => {
  if (choosing) {
    player.stop();
    player.queue = [];
    player.expanded = false;
    focus.reset();
    closeDialog();
  }
});
const tabs = [
  { path: "/today", label: "今天", icon: "wap-home-o" },
  { path: "/study", label: "学习", icon: "notes-o" },
  { path: "/music", label: "音乐", icon: "music-o" },
  { path: "/planner", label: "日程", icon: "calendar-o" },
  { path: "/fun", label: "娱乐", icon: "smile-o" },
];
const active = computed(() => route.meta.tab || route.path);
</script>
<template>
  <div
    class="aide-app"
    :class="{
      'is-keyboard-open': keyboardOpen,
      'has-bottom-nav': !choosingProfile,
      'has-mini-player': !choosingProfile && !!player.current,
    }"
    :style="viewportStyle"
  >
    <ProfilesPage v-if="shellMounted && choosingProfile" />
    <template v-else-if="shellMounted">
      <header class="app-header">
        <router-link to="/today" class="brand"
          ><span class="brand-mark">伴</span
          ><span>小伴助手<small>把每一天，过得有意思</small></span></router-link
        >
        <div class="account-actions">
          <router-link
            class="profile-link"
            to="/settings"
            :aria-label="`${profileName(profile.current!)}，个人设置与数据备份`"
          >
            <span class="avatar"><van-icon name="user-o" /></span
            ><small>{{ profileName(profile.current!) }}</small>
          </router-link>
          <button
            class="subtle exit-button"
            :disabled="exiting"
            @click="exitProfile"
          >
            退出
          </button>
        </div>
      </header>
      <div v-if="workspace.error" class="storage-banner" role="alert">
        {{ workspace.error }}
        <router-link to="/settings">处理数据问题</router-link>
      </div>
      <div class="page-content"><router-view /></div>
      <GlobalPlayer />
      <nav class="bottom-nav" aria-label="主导航">
        <router-link
          v-for="tab in tabs"
          :key="tab.path"
          :to="tab.path"
          :class="{ active: active === tab.path }"
          :aria-current="active === tab.path ? 'page' : undefined"
          ><van-icon :name="tab.icon" /><span>{{
            tab.label
          }}</span></router-link
        >
      </nav>
    </template>
  </div>
</template>
<style scoped>
.account-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.aide-app .exit-button {
  padding: 8px;
  font-size: 13px;
}
.profile-link {
  display: flex;
  align-items: center;
  gap: 8px;
}
.profile-link small {
  font-size: 12px;
  color: var(--muted);
}
@media (max-width: 380px) {
  .brand small {
    display: none;
  }
  .profile-link {
    gap: 4px;
  }
  .profile-link small {
    max-width: 60px;
    overflow-wrap: anywhere;
  }
}
</style>
