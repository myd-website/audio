import { safeHttps } from "@/shared/lib/workspace";
import type { Track } from "@/shared/lib/workspace";
export const SOURCE_SITE = "https://www.qqmp3.vip/";
const API_BASE = import.meta.env.DEV
  ? "/music-api/"
  : "https://www.qqmp3.vip/api/";
async function request(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
) {
  if (signal?.aborted) throw new DOMException("已取消", "AbortError");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = window.setTimeout(abort, 15000);
  try {
    const response = await fetch(
      `${API_BASE}${path}?${new URLSearchParams(params)}`,
      {
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      },
    );
    if (!response.ok)
      throw new Error(
        response.status === 403
          ? "音源拒绝了接口访问（403：非法访问），请前往原站搜索。"
          : `音源请求失败（${response.status}），请稍后重试。`,
      );
    const data = await response.json();
    if (signal?.aborted) throw new DOMException("已取消", "AbortError");
    if (controller.signal.aborted)
      throw new Error("音源响应超时，请稍后重试。");
    if (!data || typeof data !== "object")
      throw new Error("音源响应格式不正确。");
    // 部分音源用 HTTP 200 返回业务拒绝，不能当作空搜索结果。
    if (data.code === 403 || data.code === "403")
      throw new Error("音源拒绝了接口访问（403：非法访问），请前往原站搜索。");
    return data;
  } catch (cause) {
    if (signal?.aborted) throw new DOMException("已取消", "AbortError");
    if (controller.signal.aborted)
      throw new Error("音源响应超时，请稍后重试。");
    if (cause instanceof TypeError)
      throw new Error(
        "无法读取音源，请检查网络；当前站点也可能不允许跨域访问。可前往原站搜索。",
      );
    if (cause instanceof SyntaxError)
      throw new Error("音源未返回有效数据，请稍后重试。");
    throw cause;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export function downloadOptions(
  raw: unknown,
): { title: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).flatMap((value) => {
    if (typeof value !== "string") return [];
    const i = value.indexOf("$$");
    if (i < 1) return [];
    const url = safeHttps(value.slice(i + 2));
    return url ? [{ title: value.slice(0, i).slice(0, 100), url }] : [];
  });
}
export function normalizeTrack(raw: unknown): Track | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const rid =
    typeof d.rid === "number" || typeof d.rid === "string" ? String(d.rid) : "";
  if (!/^\d{1,20}$/.test(rid)) return null;
  const name =
    typeof d.name === "string"
      ? d.name
      : typeof d.title === "string"
        ? d.title
        : "未知歌曲";
  const artist =
    typeof d.artist === "string"
      ? d.artist
      : typeof d.singer === "string"
        ? d.singer
        : "未知歌手";
  return {
    id: `qqmp3:${rid}`,
    rid,
    name: name.slice(0, 300) || "未知歌曲",
    artist: artist.slice(0, 300) || "未知歌手",
    cover: safeHttps(d.pic || d.cover) || undefined,
    downloads: downloadOptions(d.downurl),
  };
}
export async function searchMusic(
  keyword: string,
  signal?: AbortSignal,
): Promise<Track[]> {
  if (!keyword.trim() || keyword.length > 100)
    throw new Error("请输入 1～100 字的歌名或歌手。");
  const result = await request(
    "songs.php",
    { type: "search", keyword: keyword.trim() },
    signal,
  );
  if (result.code !== 200 || !Array.isArray(result.data))
    throw new Error("搜索接口暂不可用，请稍后重试或前往原站。");
  const songs: Track[] = result.data
    .slice(0, 200)
    .map(normalizeTrack)
    .filter((t): t is Track => !!t);
  const seen = new Set<string>();
  return songs.filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}
export async function resolveMusic(
  rid: string,
  signal?: AbortSignal,
): Promise<{ url: string; lrc: string }> {
  if (!/^\d{1,20}$/.test(rid)) throw new Error("歌曲标识不正确。");
  const result = await request(
    "kw.php",
    { rid, type: "json", level: "exhigh", lrc: "true" },
    signal,
  );
  const data = result.data;
  if (result.code !== 200 || !data || !safeHttps(data.url))
    throw new Error("未取得可播放资源，请重试或换一首歌曲。");
  return {
    url: safeHttps(data.url),
    lrc: typeof data.lrc === "string" ? data.lrc.slice(0, 100000) : "",
  };
}
export async function getDownloads(track: Track, signal?: AbortSignal) {
  if (track.downloads?.length) return track.downloads;
  if (!track.rid) return [];
  const result = await request(
    "songs.php",
    { type: "download", rid: track.rid },
    signal,
  );
  if (result.code !== 200) throw new Error("暂时无法读取下载选项。");
  return downloadOptions(result.data?.downurl);
}
