<template>
  <div class="maths-page">
    <van-notice-bar left-icon="volume-o" :text="customText" />
    <ArithmeticCalculator initial-operation="subtract" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import ArithmeticCalculator from "@/components/math/ArithmeticCalculator.vue";

const customText = ref("好好学习，天天向上");

const quotes = [
  "学海无涯，奋斗不止。",
  "坚持到底，永不放弃。",
  "知识改变命运，学习成就未来。",
  "不断挑战自我，超越极限。",
  "今天努力一点，明天轻松一点。",
  "积累点滴进步，铸就辉煌人生。",
  "每一次的努力，都是成功的积累。",
  "勤奋是成功的基石，智慧是成功的翅膀。",
  "学习是一种态度，也是一种责任。",
  "成功来自努力，努力造就成功。",
];

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
