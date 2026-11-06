import { computed, readonly, ref } from "vue";

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

type ActionResult = { ok: true } | { ok: false; message: string };
type TodoStorage = Pick<Storage, "getItem" | "setItem">;

export const TODO_STORAGE_KEY = "audio:todos:v1";
export const TODO_TITLE_LIMIT = 120;

function validTitle(title: string): boolean {
  return title.trim().length > 0 && title.length <= TODO_TITLE_LIMIT;
}

function decodeTodos(raw: string | null): TodoItem[] {
  if (raw === null) return [];
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.items)) {
    throw new Error("不支持的待办数据格式");
  }
  const ids = new Set<string>();
  return data.items.map((item: TodoItem) => {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.title !== "string" ||
      !validTitle(item.title) ||
      typeof item.completed !== "boolean"
    ) {
      throw new Error("待办数据不完整");
    }
    ids.add(item.id);
    return { id: item.id, title: item.title, completed: item.completed };
  });
}

/** 本机保存成功后才更新界面；读取失败时禁止覆盖原数据。 */
export function useTodoList(
  getStorage: () => TodoStorage = () => window.localStorage,
) {
  const items = ref<TodoItem[]>([]);
  const ready = ref(false);
  const storageError = ref("");
  let snapshot: string | null = null;
  let sequence = 0;

  function load(): boolean {
    try {
      const raw = getStorage().getItem(TODO_STORAGE_KEY);
      const loaded = decodeTodos(raw);
      items.value = loaded;
      snapshot = raw;
      ready.value = true;
      storageError.value = "";
      return true;
    } catch {
      ready.value = false;
      storageError.value =
        "无法读取本机待办，原数据未被覆盖。请检查浏览器存储设置后重新读取。";
      return false;
    }
  }

  function commit(
    change: (current: TodoItem[]) => TodoItem[] | null,
  ): ActionResult {
    if (!ready.value) {
      return { ok: false, message: "请先恢复本机存储，再操作待办。" };
    }
    try {
      const storage = getStorage();
      // 防止多个标签页使用旧列表互相覆盖；同步后让用户重新确认本次操作。
      if (storage.getItem(TODO_STORAGE_KEY) !== snapshot) {
        if (load()) {
          storageError.value =
            "其他页面已更新待办，已同步最新列表，请重试本次操作。";
        }
        return { ok: false, message: storageError.value };
      }
      const next = change(items.value);
      if (!next) {
        return { ok: false, message: "这条待办已不存在，请查看最新列表。" };
      }
      const serialized = JSON.stringify({ version: 1, items: next });
      storage.setItem(TODO_STORAGE_KEY, serialized);
      snapshot = serialized;
      items.value = next;
      storageError.value = "";
      return { ok: true };
    } catch {
      storageError.value =
        "保存失败，本次修改尚未保存。输入已保留，请检查存储空间或浏览器设置后重试。";
      return { ok: false, message: storageError.value };
    }
  }

  function add(title: string): ActionResult {
    const normalized = title.trim();
    if (!validTitle(normalized)) {
      return {
        ok: false,
        message: `请输入 1～${TODO_TITLE_LIMIT} 字的待办内容。`,
      };
    }
    return commit((current) => {
      let id: string;
      do {
        id = `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      } while (current.some((item) => item.id === id));
      return [{ id, title: normalized, completed: false }, ...current];
    });
  }

  function rename(id: string, title: string): ActionResult {
    const normalized = title.trim();
    if (!validTitle(normalized)) {
      return {
        ok: false,
        message: `请输入 1～${TODO_TITLE_LIMIT} 字的待办内容。`,
      };
    }
    return commit((current) =>
      current.some((item) => item.id === id)
        ? current.map((item) =>
            item.id === id ? { ...item, title: normalized } : item,
          )
        : null,
    );
  }

  function setCompleted(id: string, completed: boolean): ActionResult {
    return commit((current) =>
      current.some((item) => item.id === id)
        ? current.map((item) =>
            item.id === id ? { ...item, completed } : item,
          )
        : null,
    );
  }

  function remove(id: string): ActionResult {
    return commit((current) =>
      current.some((item) => item.id === id)
        ? current.filter((item) => item.id !== id)
        : null,
    );
  }

  load();
  return {
    items: readonly(items),
    ready: readonly(ready),
    storageError: readonly(storageError),
    completedCount: computed(
      () => items.value.filter((item) => item.completed).length,
    ),
    load,
    add,
    rename,
    setCompleted,
    remove,
  };
}
