<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";

export interface SelectOption {
  value: string | number;
  label: string;
  description?: string;
}
const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    label: string;
    options: SelectOption[];
    disabled?: boolean;
    placeholder?: string;
  }>(),
  { placeholder: "请选择" },
);
const emit = defineEmits<{
  (event: "update:modelValue", value: string | number): void;
}>();
const id = useId();
const trigger = ref<HTMLButtonElement>();
const open = ref(false);
const keyword = ref("");
const selected = computed(() =>
  props.options.find((option) => option.value === props.modelValue),
);
const filtered = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase();
  return props.options.filter((option) =>
    `${option.label} ${option.description || ""}`
      .toLocaleLowerCase()
      .includes(query),
  );
});
function choose(value: string | number) {
  emit("update:modelValue", value);
  open.value = false;
}
watch(open, () => (keyword.value = ""));
// 外部筛选更新后关闭旧选项，避免把上一册的单元应用到新教材。
watch([() => props.options, () => props.disabled], () => {
  open.value = false;
});
</script>

<template>
  <div class="app-select">
    <span :id="`${id}-label`" class="select-label">{{ label }}</span>
    <button
      ref="trigger"
      type="button"
      class="select-trigger"
      :disabled="disabled || !options.length"
      :aria-labelledby="`${id}-label ${id}-value`"
      :aria-describedby="
        selected?.description ? `${id}-description` : undefined
      "
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-controls="`${id}-dialog`"
      @click="open = true"
    >
      <span class="selected-text">
        <strong :id="`${id}-value`">{{
          selected?.label || placeholder
        }}</strong>
        <small v-if="selected?.description" :id="`${id}-description`">{{
          selected.description
        }}</small>
      </span>
      <van-icon name="arrow-down" aria-hidden="true" />
    </button>
    <van-popup
      :id="`${id}-dialog`"
      v-model:show="open"
      position="bottom"
      round
      closeable
      teleport=".aide-app"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`${id}-title`"
      @keydown.esc.prevent="open = false"
      @closed="trigger?.focus()"
    >
      <section class="select-panel">
        <header>
          <p>选择{{ label }}</p>
          <h2 :id="`${id}-title`">{{ label }}</h2>
        </header>
        <input
          v-if="options.length > 8"
          v-model="keyword"
          type="search"
          maxlength="80"
          :placeholder="`搜索${label}`"
          :aria-label="`搜索${label}`"
        />
        <div class="select-options" role="group" :aria-label="label">
          <button
            v-for="option in filtered"
            :key="option.value"
            type="button"
            class="select-option"
            :class="{ chosen: option.value === modelValue }"
            :aria-pressed="option.value === modelValue"
            @click="choose(option.value)"
          >
            <span>
              <strong>{{ option.label }}</strong>
              <small v-if="option.description">{{ option.description }}</small>
            </span>
            <van-icon
              :name="option.value === modelValue ? 'checked' : 'circle'"
              aria-hidden="true"
            />
          </button>
          <p v-if="!filtered.length" class="empty">没有找到匹配选项</p>
        </div>
      </section>
    </van-popup>
  </div>
</template>

<style scoped>
.app-select {
  min-width: 0;
}
.select-label {
  display: block;
  margin-bottom: 8px;
  color: #65736a;
  font-size: 12px;
  font-weight: 600;
}
.aide-app .select-trigger {
  width: 100%;
  min-height: 58px;
  justify-content: space-between;
  padding: 12px 14px;
  border: 1px solid #dce4d9;
  border-radius: 14px;
  background: #fffefa;
  text-align: left;
}
.selected-text {
  flex: 1;
  min-width: 0;
}
.selected-text strong,
.select-option strong {
  display: block;
  font-size: 14px;
  font-weight: 550;
  overflow-wrap: anywhere;
}
.selected-text small,
.select-option small {
  display: block;
  color: var(--muted);
  font-size: 11px;
  margin-top: 4px;
  overflow-wrap: anywhere;
}
.select-trigger > .van-icon {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--green);
}
.select-panel {
  max-width: 640px;
  max-height: min(85dvh, calc(var(--aide-visible-height, 100dvh) - 24px));
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: auto;
  padding: 24px 20px calc(24px + env(safe-area-inset-bottom, 0px));
}
.select-panel header {
  margin: 0 32px 20px 0;
}
.select-panel header p {
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 4px;
}
.select-panel h2 {
  font-size: 21px;
}
.select-options {
  display: grid;
  gap: 9px;
  margin-top: 12px;
  max-height: min(55dvh, 440px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px;
}
.aide-app .select-option {
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid var(--line);
  background: #f8f9f4;
  text-align: left;
}
.select-option > span {
  min-width: 0;
}
.aide-app .select-option.chosen {
  border-color: #a4c7b2;
  background: var(--pale);
  color: var(--green);
}
.select-option > .van-icon {
  flex-shrink: 0;
}
</style>
