import { defineStore } from "pinia";
import invitationConfig from "@/config/invitation.json";
import { PROFILE_SESSION_KEY, isProfileId } from "../lib/profiles";
import type { ProfileId } from "../lib/profiles";

export const useProfileStore = defineStore("profile", () => {
  let current: ProfileId | null = null;
  let error = "";
  const verified = new Set<ProfileId>();
  try {
    const raw = sessionStorage.getItem(PROFILE_SESSION_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (
        !isProfileId(saved?.current) ||
        !Array.isArray(saved.verified) ||
        saved.verified.length > 2 ||
        !saved.verified.every(isProfileId) ||
        !saved.verified.includes(saved.current)
      ) {
        throw new Error("无效档案会话");
      }
      saved.verified.forEach((id: ProfileId) => verified.add(id));
      current = saved.current;
    }
  } catch {
    error = "无法读取档案会话，请重新输入邀请码，并允许此网站使用浏览器存储";
  }
  function requireCurrent(): ProfileId {
    if (!current) throw new Error("请先选择本机档案。");
    return current;
  }
  function isVerified(id: ProfileId) {
    return verified.has(id);
  }
  function select(id: ProfileId, invitation = "") {
    if (!isProfileId(id)) throw new Error("请选择有效的本机档案。");
    if (!verified.has(id)) {
      if (!invitation.trim()) throw new Error("请输入邀请码");
      // 纯前端使用门槛，不是服务端身份认证；会话只保存验证状态，不保存输入内容。
      if (invitation.trim() !== invitationConfig.code)
        throw new Error("邀请码错误，请重新输入");
    }
    const nextVerified = new Set([...verified, id]);
    // 当前文档始终绑定原档案。入口保存下次选择后刷新，旧异步操作不会写入新档案。
    // 选择与验证状态一次写入，存储失败时不产生半完成会话。
    sessionStorage.setItem(
      PROFILE_SESSION_KEY,
      JSON.stringify({ current: id, verified: [...nextVerified] }),
    );
    verified.add(id);
  }
  function exit() {
    // 退出清除本标签页的选择与验证状态，档案数据及 IndexedDB 音乐均保留。
    sessionStorage.removeItem(PROFILE_SESSION_KEY);
    verified.clear();
  }
  return { current, error, requireCurrent, isVerified, select, exit };
});
