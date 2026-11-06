<script setup lang="ts">
import { ref } from "vue";
import { PROFILES, profileName } from "@/shared/lib/profiles";
import type { ProfileId } from "@/shared/lib/profiles";
import { useProfileStore } from "@/shared/stores/profile";
import { message } from "@/shared/lib/feedback";
const profile = useProfileStore();
const error = ref(profile.error);
const busy = ref(false);
const open = ref(false);
const selected = ref<ProfileId | null>(null);
const invitation = ref("");
const invitationError = ref("");
const invitationInput = ref<HTMLInputElement>();
const trigger = ref<HTMLButtonElement>();
const composing = ref(false);
function choose(id: ProfileId, event: MouseEvent) {
  if (busy.value || open.value) return;
  error.value = "";
  if (profile.isVerified(id)) return enter(id);
  trigger.value = event.currentTarget as HTMLButtonElement;
  selected.value = id;
  invitation.value = "";
  invitationError.value = "";
  composing.value = false;
  open.value = true;
}
function cancel() {
  if (busy.value) return;
  open.value = false;
  invitation.value = "";
  invitationError.value = "";
}
function confirm() {
  if (selected.value && !composing.value)
    enter(selected.value, invitation.value);
}
function enter(id: ProfileId, code = "") {
  if (busy.value) return;
  busy.value = true;
  try {
    profile.select(id, code);
    invitation.value = "";
    // 完整刷新同时释放播放器、计时器、工作线程和页面草稿。
    const next = new URL(window.location.href);
    next.hash = "/today";
    window.history.replaceState(null, "", next.href);
    window.location.reload();
  } catch (cause) {
    busy.value = false;
    if (open.value) invitationError.value = message(cause);
    else error.value = message(cause);
  }
}
</script>
<template>
  <main class="profiles-page">
    <span class="brand-mark">伴</span>
    <p class="eyebrow">A LITTLE SPACE OF YOUR OWN</p>
    <h1>今天，谁来使用？</h1>
    <p class="muted">选一份本机档案，继续自己的学习和生活。</p>
    <div class="profile-options">
      <button
        v-for="item in PROFILES"
        :key="item.id"
        class="profile-option"
        :disabled="busy"
        @click="choose(item.id, $event)"
      >
        <span class="profile-symbol"><van-icon :name="item.icon" /></span>
        <strong>{{ item.name }}</strong>
        <span class="muted">{{ item.description }}</span>
        <span class="profile-enter"
          >{{ profile.current === item.id ? "继续使用" : "进入档案" }}
          <van-icon name="arrow"
        /></span>
      </button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p class="muted profile-note">
      首次进入每份档案需要邀请码，本标签页刷新后保留验证，退出后需重新输入。两份档案分别保存本机记录和音乐，切换后会刷新页面
    </p>
    <van-popup
      v-model:show="open"
      position="bottom"
      round
      teleport=".aide-app"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invitation-title"
      :close-on-click-overlay="false"
      @opened="invitationInput?.focus()"
      @closed="trigger?.focus()"
      @keydown.esc.prevent="cancel"
    >
      <section class="sheet invitation-sheet">
        <p class="eyebrow">WELCOME TO YOUR SPACE</p>
        <h2 id="invitation-title">请输入邀请码</h2>
        <p class="muted invitation-hint">
          验证后即可进入{{ selected ? profileName(selected) : "档案" }}
        </p>
        <form @submit.prevent="confirm">
          <label for="profile-invitation">邀请码</label>
          <input
            id="profile-invitation"
            ref="invitationInput"
            v-model="invitation"
            type="password"
            autocomplete="off"
            autocapitalize="off"
            :spellcheck="false"
            maxlength="64"
            placeholder="输入收到的邀请码"
            :disabled="busy"
            :aria-invalid="!!invitationError"
            :aria-describedby="invitationError ? 'invitation-error' : undefined"
            @input="invitationError = ''"
            @compositionstart="composing = true"
            @compositionend="composing = false"
            @keydown.enter="
              ($event.isComposing || composing) && $event.preventDefault()
            "
          />
          <p
            v-if="invitationError"
            id="invitation-error"
            class="error"
            role="alert"
          >
            {{ invitationError }}
          </p>
          <div class="row-actions">
            <button type="button" :disabled="busy" @click="cancel">取消</button>
            <button type="submit" class="primary" :disabled="busy">
              {{ busy ? "正在进入…" : "验证并进入" }}
            </button>
          </div>
        </form>
      </section>
    </van-popup>
  </main>
</template>
<style scoped>
.profiles-page {
  max-width: 720px;
  margin: auto;
  padding: max(48px, env(safe-area-inset-top)) 20px 32px;
}
.brand-mark {
  margin-bottom: 28px;
}
h1 {
  font-size: 30px;
  font-weight: 750;
  margin: 8px 0;
}
.profile-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 30px 0 24px;
}
.aide-app .profile-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 24px;
  border: 1px solid var(--line);
  background: var(--paper);
  border-radius: 22px;
  gap: 14px;
  min-width: 0;
}
.profile-symbol {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: 20px;
  font-size: 32px;
  background: #e3eddc;
  color: var(--green);
}
.profile-option:nth-child(2) .profile-symbol {
  background: #f5e8d2;
  color: #a96a32;
}
.profile-option strong {
  font-size: 21px;
}
.profile-enter {
  color: var(--green);
  font-size: 14px;
  margin-top: auto;
  padding-top: 8px;
}
.profile-note {
  max-width: 540px;
  line-height: 1.9;
}
.invitation-sheet {
  width: 100%;
}
.invitation-sheet h2 {
  margin-bottom: 8px;
}
.invitation-hint {
  margin-bottom: 20px;
}
.invitation-sheet form {
  gap: 10px;
}
@media (max-width: 480px) {
  .profile-options {
    grid-template-columns: minmax(0, 1fr);
  }
  .aide-app .profile-option {
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: 6px 16px;
    padding: 20px;
  }
  .profile-symbol {
    grid-row: 1/4;
    width: 56px;
    height: 56px;
  }
  .profile-enter {
    grid-column: 2;
  }
}
</style>
