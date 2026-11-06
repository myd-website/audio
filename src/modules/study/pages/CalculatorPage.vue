<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import PocketCalculator from "../components/PocketCalculator.vue";
import ArithmeticCalculator from "@/components/math/ArithmeticCalculator.vue";
const route = useRoute();
const router = useRouter();
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">WORK IT OUT, STEP BY STEP</p>
      <h1>随手算一算</h1>
      <p class="muted">日常算式和竖式过程，都在这里。</p>
    </div>
    <router-link class="button" to="/study">返回学习</router-link>
  </div>
  <nav class="chips" aria-label="计算器模式">
    <button
      :class="{ selected: route.query.mode !== 'vertical' }"
      @click="router.replace('/calculator')"
    >
      日常计算器</button
    ><button
      :class="{ selected: route.query.mode === 'vertical' }"
      @click="router.replace('/calculator?mode=vertical')"
    >
      竖式与计算过程
    </button>
  </nav>
  <ArithmeticCalculator v-if="route.query.mode === 'vertical'" />
  <PocketCalculator v-else />
</template>
<style scoped>
.page-heading {
  flex-wrap: wrap;
}
</style>
