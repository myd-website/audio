import { decodeWorkspace } from "./workspace";
import type { Workspace } from "./workspace";

// 使用新会话格式，旧版仅保存档案 ID 的会话不能跳过邀请码验证。
export const PROFILE_SESSION_KEY = "aide:profile:session:v2";
export const PROFILES = [
  {
    id: "one",
    name: "档案一",
    icon: "flower-o",
    description: "学习、计划和喜欢的歌，都有自己的位置",
  },
  {
    id: "two",
    name: "档案二",
    icon: "smile-o",
    description: "另一份独立的日常，从这里开始",
  },
] as const;
export type ProfileId = (typeof PROFILES)[number]["id"];
export function isProfileId(value: unknown): value is ProfileId {
  return PROFILES.some((profile) => profile.id === value);
}
export function profileWorkspaceKey(id: ProfileId) {
  if (!isProfileId(id)) throw new Error("请选择有效的本机档案。");
  return `aide:workspace:profile:${id}:v1`;
}
export function profileMusicDatabase(id: ProfileId) {
  if (!isProfileId(id)) throw new Error("请选择有效的本机档案。");
  return `aide:music:profile:${id}`;
}
export function profileName(id: ProfileId) {
  return PROFILES.find((profile) => profile.id === id)!.name;
}
export function encodeProfileBackup(id: ProfileId, data: Workspace) {
  return JSON.stringify(
    {
      type: "aide-profile-backup",
      version: 1,
      profileId: id,
      workspace: decodeWorkspace(JSON.stringify(data)),
    },
    null,
    2,
  );
}
export function decodeProfileBackup(raw: string): {
  data: Workspace;
  source: string;
} {
  if (raw.length > 8_000_000) throw new Error("备份不能超过 8MB。");
  const parsed = JSON.parse(raw);
  if (parsed?.type === "aide-profile-backup") {
    if (parsed.version !== 1 || !isProfileId(parsed.profileId))
      throw new Error("档案备份格式不正确。");
    return {
      data: decodeWorkspace(JSON.stringify(parsed.workspace)),
      source: profileName(parsed.profileId),
    };
  }
  return { data: decodeWorkspace(raw), source: "旧版共享备份" };
}
