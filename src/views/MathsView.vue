<template>
  <div class="maths-page">
    <van-notice-bar left-icon="volume-o" :text="customText" />
    <ArithmeticCalculator initial-operation="subtract" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import ArithmeticCalculator from "@/components/math/ArithmeticCalculator.vue";
import quotes from "@/config/studyQuotes.json";

const customText = ref("好好学习，天天向上");

onMounted(() => {
  showRandomQuote();
});

const showRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  customText.value = quotes[randomIndex];
};
</script>
<style scoped lang="less">
.maths-page {
  min-height: 100vh;
  background: #fdfcfe;
}
</style>
