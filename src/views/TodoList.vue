<template>
  <main class="todo-page">
    <TodoBoard />
    <nav class="todo-links" aria-label="更多工具">
      <router-link to="/address/list"
        ><van-icon name="location-o" aria-hidden="true" />地址管理<van-icon
          name="arrow"
          aria-hidden="true"
      /></router-link>
      <router-link to="/chat/list"
        ><van-icon name="chat-o" aria-hidden="true" />聊天室<van-icon
          name="arrow"
          aria-hidden="true"
      /></router-link>
    </nav>
  </main>
</template>

<script setup lang="ts">
import TodoBoard from "@/components/todo/TodoBoard.vue";
</script>

<style scoped>
.todo-page {
  box-sizing: border-box;
  width: 100%;
  min-height: calc(100vh - 50px);
  min-height: calc(100dvh - 50px);
  padding: 24px 20px calc(24px + env(safe-area-inset-bottom, 0px));
  padding-left: max(20px, env(safe-area-inset-left, 0px));
  padding-right: max(20px, env(safe-area-inset-right, 0px));
  background: #f5f7fc;
}
.todo-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 28px;
}
.todo-links a {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  padding: 8px;
  border: 1px solid #e5eaf3;
  border-radius: 12px;
  background: #fff;
  color: #727e96;
  font-size: 13px;
  flex-wrap: wrap;
  overflow-wrap: anywhere;
}
.todo-links a:focus-visible {
  outline: 3px solid #9caaf2;
  outline-offset: 3px;
}
@media (max-width: 480px) {
  .todo-page {
    padding: 20px 16px calc(24px + env(safe-area-inset-bottom, 0px));
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
}
</style>
