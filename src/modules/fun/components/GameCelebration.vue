<script setup lang="ts">
defineProps<{ active: boolean }>();
</script>
<template>
  <div v-if="active" class="game-confetti" aria-hidden="true">
    <i v-for="n in 12" :key="n" :style="{ '--i': n }" />
  </div>
</template>
<style scoped>
.game-confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 4;
  border-radius: inherit;
}
i {
  position: absolute;
  left: 50%;
  top: 35%;
  width: 7px;
  height: 12px;
  opacity: 0;
  background: #dc9061;
  animation: confetti 1.2s ease-out both;
  animation-delay: calc(var(--i) * 18ms);
  --drift: calc((var(--i) - 6.5) * 26px);
}
i:nth-child(3n) {
  background: #799b80;
  border-radius: 50%;
}
i:nth-child(3n + 1) {
  background: #b2a2cb;
}
@keyframes confetti {
  0% {
    opacity: 1;
    transform: translate(0, -30px) rotate(0);
  }
  100% {
    opacity: 0;
    transform: translate(var(--drift), 230px) rotate(340deg);
  }
}
</style>
