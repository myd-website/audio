<template>
  <section
    ref="boardRoot"
    class="todo-board"
    aria-labelledby="todo-heading"
    :style="{ paddingBottom: `${bottomSpace}px` }"
    @focusin="scheduleUpdate"
    @focusout="scheduleUpdate"
  >
    <header class="board-header">
      <div>
        <p class="eyebrow">给生活一点条理</p>
        <h1 id="todo-heading">我的待办<span class="heading-dot">.</span></h1>
        <p class="header-description">记下要做的事，一件件慢慢完成。</p>
      </div>
      <span class="header-icon" aria-hidden="true"
        ><van-icon name="todo-list-o"
      /></span>
    </header>

    <div v-if="storageError" class="storage-warning" role="alert">
      <p>{{ storageError }}</p>
      <button type="button" @click="reload">重新读取</button>
    </div>

    <div class="summary-card">
      <div class="summary-copy">
        <p>
          还有 <strong>{{ ready ? pendingCount : "—" }}</strong> 件待办
        </p>
        <span>{{ summaryText }}</span>
      </div>
      <span class="progress-label"
        >{{ ready ? progress : "—" }}<small>%</small></span
      >
      <div
        class="progress-track"
        role="progressbar"
        aria-label="任务完成进度"
        :aria-valuenow="ready ? progress : undefined"
        :aria-valuetext="
          ready
            ? `已完成 ${completedCount} 件，共 ${items.length} 件`
            : '暂时无法读取'
        "
        :aria-valuemin="0"
        :aria-valuemax="100"
      >
        <span :style="{ width: `${ready ? progress : 0}%` }" />
      </div>
    </div>

    <form class="composer card" @submit.prevent="addTask">
      <label for="new-todo">接下来要做什么？</label>
      <div class="composer-fields">
        <input
          id="new-todo"
          ref="addInput"
          v-model="draft"
          type="text"
          placeholder="例如：下班后散步 20 分钟"
          :maxlength="TODO_TITLE_LIMIT"
          :disabled="!ready"
          :aria-invalid="Boolean(addError)"
          aria-describedby="todo-input-hint todo-add-error"
          enterkeyhint="done"
          autocomplete="off"
          @input="addError = ''"
          @keydown.enter="guardComposition"
        />
        <button class="primary-button" type="submit" :disabled="!ready">
          <van-icon name="plus" aria-hidden="true" />添加
        </button>
      </div>
      <div class="input-hint" id="todo-input-hint">
        <span>支持回车添加</span
        ><span>{{ draft.length }}/{{ TODO_TITLE_LIMIT }}</span>
      </div>
      <p
        id="todo-add-error"
        class="field-error"
        :role="addError ? 'alert' : undefined"
      >
        {{ addError }}
      </p>
    </form>

    <div class="list-header">
      <h2>任务清单</h2>
      <span>{{ ready ? `${items.length} 件任务` : "暂时无法读取" }}</span>
    </div>
    <div class="filter-bar" role="group" aria-label="筛选待办">
      <button
        v-for="option in filters"
        :key="option.value"
        type="button"
        :class="{ selected: filter === option.value }"
        :aria-pressed="filter === option.value"
        @click="changeFilter(option.value)"
      >
        {{ option.label }}<span>{{ ready ? option.count : "—" }}</span>
      </button>
    </div>

    <ul v-if="visibleItems.length" class="task-list" aria-label="待办列表">
      <li
        v-for="item in visibleItems"
        :key="item.id"
        class="task-card card"
        :class="{ completed: item.completed }"
      >
        <div class="task-row">
          <label class="task-check">
            <input
              type="checkbox"
              :checked="item.completed"
              :disabled="!ready || editingId !== null"
              :aria-label="`${item.completed ? '恢复待办' : '完成待办'}：${item.title}`"
              @change="toggleTask(item, $event)"
            />
            <span aria-hidden="true"
              ><van-icon v-if="item.completed" name="success"
            /></span>
          </label>
          <p class="task-title">{{ item.title }}</p>
          <button
            :id="`task-menu-button-${item.id}`"
            class="more-button"
            type="button"
            :disabled="!ready"
            :aria-label="`更多操作：${item.title}`"
            :aria-expanded="menuId === item.id"
            :aria-controls="`task-actions-${item.id}`"
            @click="toggleMenu(item.id)"
          >
            <van-icon name="ellipsis" aria-hidden="true" />
          </button>
        </div>
        <div
          v-if="menuId === item.id"
          :id="`task-actions-${item.id}`"
          class="task-actions"
        >
          <button type="button" :disabled="!ready" @click="startEdit(item)">
            <van-icon name="edit" aria-hidden="true" />编辑
          </button>
          <button
            class="delete-button"
            type="button"
            :disabled="!ready || deleting"
            @click="deleteTask(item)"
          >
            <van-icon name="delete-o" aria-hidden="true" />删除
          </button>
        </div>
        <form
          v-if="editingId === item.id"
          class="edit-form"
          @submit.prevent="saveEdit"
          @keydown.esc.prevent="cancelEdit"
        >
          <label :for="`edit-${item.id}`">编辑待办</label>
          <textarea
            :id="`edit-${item.id}`"
            ref="editInputs"
            v-model="editDraft"
            rows="3"
            :maxlength="TODO_TITLE_LIMIT"
            :disabled="!ready"
            :aria-invalid="Boolean(editError)"
            :aria-describedby="`edit-error-${item.id}`"
            enterkeyhint="enter"
            @input="editError = ''"
          />
          <p
            :id="`edit-error-${item.id}`"
            class="field-error"
            :role="editError ? 'alert' : undefined"
          >
            {{ editError }}
          </p>
          <div class="edit-actions">
            <button type="button" @click="cancelEdit">取消</button>
            <button class="primary-button" type="submit" :disabled="!ready">
              保存修改
            </button>
          </div>
        </form>
      </li>
    </ul>
    <div v-else class="empty-state card">
      <span class="empty-icon" aria-hidden="true"
        ><van-icon :name="ready ? 'notes-o' : 'warning-o'"
      /></span>
      <h3>{{ emptyText.title }}</h3>
      <p>{{ emptyText.description }}</p>
      <button
        v-if="ready && filter !== 'completed'"
        type="button"
        class="empty-add"
        @click="focusAdd"
      >
        添加一件小事<van-icon name="arrow" aria-hidden="true" />
      </button>
    </div>
    <p class="save-status" role="status" aria-live="polite">
      {{
        feedback ||
        (ready ? "自动保存在当前浏览器，仅本机可见" : "恢复读取后即可继续操作")
      }}
    </p>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { showConfirmDialog } from "vant";
import { useTodoKeyboard } from "./useTodoKeyboard";
import {
  TODO_STORAGE_KEY,
  TODO_TITLE_LIMIT,
  useTodoList,
  type TodoItem,
} from "./useTodoList";

type Filter = "all" | "pending" | "completed";
const {
  items,
  ready,
  storageError,
  completedCount,
  load,
  add,
  rename,
  setCompleted,
  remove,
} = useTodoList();
const draft = ref("");
const boardRoot = ref<HTMLElement>();
const { bottomSpace, scheduleUpdate } = useTodoKeyboard(boardRoot);
const addError = ref("");
const addInput = ref<HTMLInputElement>();
const filter = ref<Filter>("all");
const menuId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const editDraft = ref("");
const editOriginalTitle = ref("");
const editError = ref("");
const editInputs = ref<HTMLTextAreaElement[]>([]);
const feedback = ref("");
const deleting = ref(false);

const pendingCount = computed(() => items.value.length - completedCount.value);
const progress = computed(() =>
  items.value.length
    ? Math.round((completedCount.value / items.value.length) * 100)
    : 0,
);
const summaryText = computed(() =>
  !ready.value
    ? "本机存储暂时不可用"
    : !items.value.length
      ? "从一件小事开始，轻松安排每一天"
      : !pendingCount.value
        ? "全部完成了，给自己一点休息时间"
        : `已完成 ${completedCount.value} 件，按自己的节奏来`,
);
const filters = computed(() => [
  { value: "all" as const, label: "全部", count: items.value.length },
  { value: "pending" as const, label: "待办", count: pendingCount.value },
  { value: "completed" as const, label: "已完成", count: completedCount.value },
]);
const visibleItems = computed(() =>
  items.value
    .filter(
      (item) =>
        filter.value === "all" ||
        item.completed === (filter.value === "completed"),
    )
    .sort((left, right) => Number(left.completed) - Number(right.completed)),
);
const emptyText = computed(() => {
  if (!ready.value)
    return {
      title: "暂时无法读取待办",
      description: "请通过上方提示重新读取，原数据不会被覆盖。",
    };
  if (filter.value === "completed")
    return {
      title: "还没有已完成的任务",
      description: "完成一件事后，点击它左侧的圆圈即可记录。",
    };
  if (filter.value === "pending" && items.value.length)
    return {
      title: "待办都完成啦",
      description: "放松一下，也可以继续记录下一件事。",
    };
  return {
    title: "留点空间，记录接下来",
    description: "工作安排、生活小事，想到就记下来。",
  };
});

// 中文输入法选词时的回车不能触发添加或保存。
function guardComposition(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) event.preventDefault();
}

function focusAdd() {
  addInput.value?.focus();
  scheduleUpdate();
}

function addTask() {
  const result = add(draft.value);
  if (!result.ok) {
    addError.value = result.message;
    addInput.value?.focus();
    scheduleUpdate();
    return;
  }
  draft.value = "";
  addError.value = "";
  filter.value = "all";
  feedback.value = "已添加待办，并保存在本机";
  addInput.value?.blur();
}

function toggleTask(item: Readonly<TodoItem>, event: Event) {
  const result = setCompleted(item.id, !item.completed);
  // 原生复选框会先改变视觉状态，保存失败时必须恢复，不能伪装成功。
  (event.target as HTMLInputElement).checked =
    items.value.find((current) => current.id === item.id)?.completed ??
    item.completed;
  feedback.value = result.ok
    ? item.completed
      ? "已恢复为待办"
      : "已完成，可再次勾选恢复"
    : result.message;
  menuId.value = null;
}

function changeFilter(value: Filter) {
  if (editingId.value) {
    feedback.value = "请先保存或取消正在编辑的待办";
    return;
  }
  filter.value = value;
  menuId.value = null;
}

function toggleMenu(id: string) {
  menuId.value = menuId.value === id ? null : id;
}

async function startEdit(item: Readonly<TodoItem>) {
  if (editingId.value && editingId.value !== item.id) {
    feedback.value = "请先保存或取消正在编辑的待办";
    return;
  }
  if (editingId.value !== item.id) {
    editingId.value = item.id;
    editDraft.value = item.title;
    editOriginalTitle.value = item.title;
    editError.value = "";
  }
  menuId.value = null;
  await nextTick();
  editInputs.value[0]?.focus();
  scheduleUpdate();
}

async function cancelEdit() {
  const id = editingId.value;
  editingId.value = null;
  editError.value = "";
  await nextTick();
  if (id) document.getElementById(`task-menu-button-${id}`)?.focus();
}

function saveEdit() {
  if (!editingId.value) return;
  const current = items.value.find((item) => item.id === editingId.value);
  if (current && current.title !== editOriginalTitle.value) {
    editError.value =
      "这条待办已在其他页面修改，请取消后重新编辑，避免覆盖他人的修改。";
    return;
  }
  const result = rename(editingId.value, editDraft.value);
  if (!result.ok) {
    editError.value = result.message;
    return;
  }
  cancelEdit();
  feedback.value = "修改已保存在本机";
}

async function deleteTask(item: Readonly<TodoItem>) {
  if (deleting.value) return;
  deleting.value = true;
  try {
    await showConfirmDialog({
      title: "删除这条待办？",
      message: `${item.title}\n删除后无法恢复。`,
      confirmButtonText: "删除",
      confirmButtonColor: "#c44747",
      cancelButtonText: "保留",
      closeOnClickOverlay: true,
    });
  } catch {
    // Vant 使用 Promise 拒绝表示取消或关闭确认框。
    deleting.value = false;
    return;
  }
  deleting.value = false;
  const result = remove(item.id);
  if (result.ok) {
    if (editingId.value === item.id) editingId.value = null;
    menuId.value = null;
  }
  feedback.value = result.ok ? "待办已删除" : result.message;
}

function reload() {
  feedback.value = load() ? "已重新读取本机待办" : "";
}

function syncStorage(event: StorageEvent) {
  if (event.key === TODO_STORAGE_KEY || event.key === null) reload();
}

watch(items, () => {
  if (
    editingId.value &&
    !items.value.some((item) => item.id === editingId.value)
  ) {
    editingId.value = null;
    editError.value = "";
    feedback.value = "正在编辑的待办已被其他页面删除，列表已同步";
  }
});

onMounted(() => window.addEventListener("storage", syncStorage));
onBeforeUnmount(() => window.removeEventListener("storage", syncStorage));
</script>

<style scoped>
.todo-board {
  color: #29324b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px;
  line-height: 1.5;
}
.todo-board *,
.todo-board *::before,
.todo-board *::after {
  box-sizing: border-box;
}
button,
input,
textarea {
  font: inherit;
}
button {
  border: 0;
  cursor: pointer;
  touch-action: manipulation;
}
button:disabled,
input:disabled,
textarea:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 3px solid #9caaf2;
  outline-offset: 3px;
}
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 2px 24px;
}
.board-header > div {
  min-width: 0;
}
.eyebrow {
  font-size: 12px;
  color: #737e95;
  letter-spacing: 2px;
  margin-bottom: 6px;
}
h1 {
  font-size: 30px;
  line-height: 1.3;
  font-weight: 750;
  letter-spacing: 1px;
}
.heading-dot {
  color: #606de2;
}
.header-description {
  color: #758099;
  margin-top: 8px;
  font-size: 13px;
}
.header-icon {
  display: grid;
  place-items: center;
  flex: 0 0 52px;
  height: 52px;
  border-radius: 18px;
  background: #e9ecff;
  color: #626edb;
  font-size: 28px;
  transform: rotate(-7deg);
}
.summary-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 20px;
  color: white;
  background: #525fc2;
  border-radius: 20px;
  margin-bottom: 20px;
}
.summary-copy p {
  font-size: 16px;
}
.summary-copy strong {
  font-size: 28px;
  font-weight: 700;
  margin: 0 4px;
}
.summary-copy > span {
  display: block;
  margin-top: 4px;
  color: #e1e5ff;
  font-size: 12px;
}
.progress-label {
  font-size: 30px;
  font-weight: 650;
}
.progress-label small {
  font-size: 13px;
  padding-left: 2px;
}
.progress-track {
  grid-column: 1 / -1;
  height: 5px;
  border-radius: 8px;
  background: #ffffff33;
  overflow: hidden;
}
.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #cbd3ff;
  transition: width 0.2s;
}
.card {
  background: #fff;
  border: 1px solid #e9edf5;
  border-radius: 16px;
}
.composer {
  padding: 16px;
}
.composer > label {
  display: block;
  font-weight: 600;
  margin-bottom: 12px;
}
.composer-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
input[type="text"],
textarea {
  width: 100%;
  min-width: 0;
  height: 48px;
  border: 1px solid #e0e5ef;
  background: #f8f9fc;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 16px;
  line-height: 26px;
  text-indent: 0;
  color: #29324b;
}
textarea {
  display: block;
  height: auto;
  min-height: 104px;
  resize: vertical;
}
input::placeholder {
  color: #8a93a8;
  font-size: 14px;
}
.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 10px;
  background: #5865cc;
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
}
.input-hint {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  color: #7c859a;
  font-size: 12px;
}
.field-error {
  color: #b13e3e;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.field-error:not(:empty) {
  margin-top: 8px;
}
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 26px 2px 14px;
  gap: 12px;
}
.list-header h2 {
  font-size: 18px;
  font-weight: 650;
}
.list-header > span {
  font-size: 12px;
  color: #7a8498;
}
.filter-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 4px;
  gap: 4px;
  border-radius: 13px;
  background: #e9edf5;
  margin-bottom: 16px;
}
.filter-bar button {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 44px;
  padding: 8px 2px;
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  color: #65708a;
}
.filter-bar button.selected {
  background: #fff;
  color: #505fc3;
  font-weight: 600;
  box-shadow: 0 2px 6px #2634590a;
}
.filter-bar button span {
  font-size: 11px;
  min-width: 20px;
  border-radius: 6px;
  padding: 1px 4px;
  background: #dfe5f1;
}
.filter-bar button.selected span {
  background: #edf0ff;
}
.task-list {
  display: grid;
  gap: 10px;
}
.task-card {
  padding: 8px;
}
.task-row {
  display: flex;
  align-items: center;
  min-height: 56px;
  gap: 4px;
}
.task-check {
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  height: 44px;
  cursor: pointer;
}
.task-check input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}
.task-check > span {
  width: 23px;
  height: 23px;
  border: 2px solid #cdd5e5;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: white;
  font-size: 15px;
  pointer-events: none;
}
.task-check input:checked + span {
  background: #7a9b8b;
  border-color: #7a9b8b;
}
.task-check input:focus-visible + span {
  outline: 3px solid #9caaf2;
  outline-offset: 4px;
}
.task-title {
  flex: 1;
  min-width: 0;
  padding: 8px 0;
  overflow-wrap: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-size: 16px;
}
.completed .task-title {
  text-decoration: line-through;
  color: #83908d;
}
.completed {
  background: #fafcfb;
}
.more-button {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  height: 44px;
  border-radius: 10px;
  background: transparent;
  color: #7e889e;
  font-size: 22px;
}
.more-button[aria-expanded="true"] {
  background: #eef1fa;
  color: #5865cc;
}
.task-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #edf0f6;
  padding-top: 8px;
  margin-top: 4px;
}
.task-actions button,
.edit-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 76px;
  gap: 6px;
  border-radius: 8px;
  padding: 8px 12px;
  background: #f1f3fa;
  color: #5663b5;
}
.task-actions .delete-button {
  color: #ba4545;
  background: #fff3f2;
}
.edit-form {
  border-top: 1px solid #edf0f6;
  padding: 12px 4px 4px;
  margin-top: 4px;
}
.edit-form label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}
.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
.edit-actions .primary-button {
  color: white;
  background: #5865cc;
}
.empty-state {
  padding: 32px 20px 24px;
  text-align: center;
}
.empty-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 22px;
  background: #f0f2fc;
  font-size: 32px;
  color: #8b98d6;
  margin: 0 auto 16px;
}
.empty-state h3 {
  font-weight: 600;
  font-size: 16px;
}
.empty-state p {
  color: #7b869c;
  font-size: 13px;
  margin-top: 8px;
}
.empty-add {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-top: 12px;
  padding: 4px 12px;
  border-radius: 8px;
  color: #5865cc;
  background: #f0f2ff;
}
.save-status {
  color: #7d879a;
  font-size: 12px;
  text-align: center;
  padding: 16px 8px 0;
  overflow-wrap: anywhere;
}
.storage-warning {
  padding: 12px;
  margin-bottom: 16px;
  border-radius: 12px;
  color: #8c511d;
  background: #fff3df;
  font-size: 13px;
}
.storage-warning button {
  min-height: 44px;
  padding: 8px 12px;
  margin-top: 8px;
  border-radius: 8px;
  background: #fff;
  color: #8c511d;
}
@media (max-width: 480px) {
  .board-header {
    padding-bottom: 16px;
  }
  .summary-card {
    margin-bottom: 16px;
  }
  .filter-bar button,
  .task-actions button,
  .edit-actions button,
  .empty-add,
  .storage-warning button {
    min-height: 48px;
  }
  .task-row {
    align-items: flex-start;
  }
  .task-check,
  .more-button {
    flex-basis: 48px;
    height: 48px;
  }
  .task-title {
    padding: 12px 0;
  }
  .task-actions button,
  .edit-actions button {
    flex: 1;
    min-width: 0;
  }
  .input-hint {
    flex-wrap: wrap;
  }
}
@media (max-width: 360px) {
  .board-header {
    gap: 8px;
  }
  .header-description {
    font-size: 12px;
  }
  .header-icon {
    flex-basis: 44px;
    height: 44px;
    font-size: 25px;
  }
  .summary-card {
    padding: 16px;
    gap: 12px;
  }
  .composer {
    padding: 12px;
  }
  .primary-button {
    padding: 0 10px;
  }
  .composer-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (prefers-reduced-motion: reduce) {
  .progress-track span {
    transition: none;
  }
}
</style>
