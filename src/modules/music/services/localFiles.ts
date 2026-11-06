import { uid } from "@/shared/lib/workspace";
import type { Track } from "@/shared/lib/workspace";
import { useProfileStore } from "@/shared/stores/profile";
import { profileMusicDatabase } from "@/shared/lib/profiles";
interface LocalMusic {
  id: string;
  name: string;
  blob: Blob;
  addedAt: string;
}
export const MAX_AUDIO_SIZE = 40 * 1024 * 1024;
export function checkAudioFile(file: File) {
  if (file.size === 0 || file.size > MAX_AUDIO_SIZE)
    throw new Error("请选择非空、大小不超过 40MB 的音频文件。");
  if (
    !file.type.startsWith("audio/") &&
    !/\.(mp3|wav|m4a|aac|ogg|flac|webm|aiff|aif)$/i.test(file.name)
  )
    throw new Error("请选择音频文件。");
}
function currentDatabase() {
  return profileMusicDatabase(useProfileStore().requireCurrent());
}
async function open(database: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(database, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("files", { keyPath: "id" });
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () =>
      reject(new Error("本机音乐库无法打开，请检查浏览器存储权限。"));
    req.onblocked = () =>
      reject(new Error("音乐库正在被其他页面更新，请关闭其他页面后重试。"));
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
  database = currentDatabase(),
): Promise<T> {
  const db = await open(database);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode);
    const req = action(tx.objectStore("files"));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onabort = () => {
      db.close();
      reject(new Error("本机音乐保存或读取失败，请检查存储空间后重试。"));
    };
    tx.onerror = () => {
      /* transaction abort 统一报告失败，不能在 request 成功时提前提示保存成功。 */
    };
  });
}
export async function listLocal(): Promise<Track[]> {
  const db = await open(currentDatabase());
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const req = tx.objectStore("files").openCursor();
    const items: Track[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const item = cursor.value as LocalMusic;
        items.push({
          id: item.id,
          name: item.name,
          artist: "本机导入",
          local: true,
        });
        cursor.continue();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(items.reverse());
    };
    tx.onabort = () => {
      db.close();
      reject(new Error("读取本机音乐失败。"));
    };
  });
}
export async function saveLocal(file: File): Promise<Track> {
  checkAudioFile(file);
  const item: LocalMusic = {
    id: `local:${uid()}`,
    name: file.name,
    blob: file,
    addedAt: new Date().toISOString(),
  };
  await addFiles([item]);
  return { id: item.id, name: item.name, artist: "本机导入", local: true };
}
export async function readLocal(id: string): Promise<Blob> {
  const item = await transaction<LocalMusic | undefined>("readonly", (store) =>
    store.get(id),
  );
  if (!item) throw new Error("本机文件已不存在，请重新导入。");
  return item.blob;
}
export async function removeLocal(id: string) {
  await transaction("readwrite", (store) => store.delete(id));
}

/** 旧库只在用户明确导入时读取，原文件与旧数据库均保留。 */
export async function importSharedLocal(): Promise<number> {
  const database = currentDatabase();
  const old = await transaction<LocalMusic[]>(
    "readonly",
    (store) => store.getAll(),
    "aide:music",
  );
  if (!old.length) return 0;
  if (
    old.length > 50 ||
    old.some(
      (item) =>
        !item ||
        typeof item.id !== "string" ||
        !item.id.startsWith("local:") ||
        typeof item.name !== "string" ||
        !(item.blob instanceof Blob) ||
        item.blob.size === 0 ||
        item.blob.size > MAX_AUDIO_SIZE,
    )
  )
    throw new Error(
      "旧音乐库存在不兼容记录，原文件已保留，请从原文件重新导入。",
    );
  return addFiles(old, database);
}

async function addFiles(
  items: LocalMusic[],
  database = currentDatabase(),
): Promise<number> {
  const db = await open(database);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    const request = store.getAllKeys();
    let count = 0;
    let reason = "本机音乐保存失败，请检查存储空间后重试。";
    request.onsuccess = () => {
      const existing = new Set(request.result);
      const added = items.filter((item) => !existing.has(item.id));
      if (existing.size + added.length > 50) {
        reason = "本机音乐最多保存 50 首，请先移除不需要的文件。";
        tx.abort();
        return;
      }
      // 容量检查与批量写入在同一事务中，失败不会留下部分导入结果。
      for (const item of added) store.add(item);
      count = added.length;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(count);
    };
    tx.onabort = () => {
      db.close();
      reject(new Error(reason));
    };
  });
}
