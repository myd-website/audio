<script setup lang="ts">
defineProps<{ source: "local" | "online"; label?: string }>();
</script>

<template>
  <span class="source-badge" :class="source">
    <span class="source-dot" aria-hidden="true"></span>
    {{ source === "online" ? "在线" : "本地" }}
    <span v-if="label" class="source-label">{{ label }}</span>
  </span>
</template>

<style scoped>
.source-badge {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 9px;
  border: 1px solid #e0e5dd;
  border-radius: 8px;
  background: #f1f3ed;
  color: #61715f;
  font-size: 11px;
  line-height: 1.5;
  vertical-align: middle;
}
.source-badge.online {
  color: #23755f;
  border-color: #d4e6dc;
  background: #edf6f0;
}
.source-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.source-label {
  padding-left: 6px;
  border-left: 1px solid currentColor;
}
</style>
