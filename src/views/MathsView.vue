<template>
  <div ref="root" class="text-center">
    <van-notice-bar left-icon="volume-o" :text="customText" />

    <div class="calculation">
      <div v-for="item in calculation" :key="item.id" class="box">
        <div class="item" @click="handleCalculation(item)">
          {{ item.name }} &nbsp; {{ item.type }}
        </div>
        <br />
      </div>
    </div>

    <!-- 根据计算方式显示对应题目 -->
    <div v-if="defaultCalc" class="calc-content">
      <div class="calc-title">
        <span>{{ defaultCalc.name }}题目：</span>
        <span class="AI" @click="handleAnalysis">分析</span>
        <span class="clear" @click="resetAll">清空</span>
      </div>
      <div class="calc-question">
        <van-field class="input" v-model="startNumber" type="number" />
        <span>{{ defaultCalc.type }}</span>
        <van-field class="input" v-model="endNumber" type="number" />
        <span> = </span>
        <van-field
          class="input"
          v-model="answerNumber"
          readonly
          type="number"
        />
      </div>
      <!-- 解析过程 -->
      <div class="process">
        <div class="process-content">
          <div class="process-content-type">
            <span style="visibility: hidden">{{ defaultCalc.type }}</span>
            <span>{{ startNumber }}</span>
          </div>
          <div class="process-content-type">
            <span>{{ defaultCalc.type }}</span>
            <span>{{ endNumber }}</span>
          </div>
        </div>
        <van-divider
          :style="{
            color: '#1989fa',
            borderColor: '#1989fa',
            padding: '0 16px',
            marginBottom: '0px',
          }"
          content-position="left"
          >=</van-divider
        >
        <div class="process-content">
          <div class="answer">
            <span style="visibility: hidden">{{ defaultCalc.type }}</span>
            <span class="answerColor">{{ answerNumber }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";

const customText = ref("好好学习，天天向上");
const defaultCalc = ref(null);
const startNumber = ref(null);
const endNumber = ref(null);
const answerNumber = ref(null);
const trigger = ref(false);

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

const calculation = [
  {
    id: "add",
    name: "加法",
    type: "+",
    fn: (a, b) => a + b,
  },
  {
    id: "subtract",
    name: "减法",
    type: "-",
    fn: (a, b) => a - b,
  },
  {
    id: "multiply",
    name: "乘法",
    type: "x",
    fn: (a, b) => a * b,
  },
  {
    id: "divide",
    name: "除法",
    type: "÷",
    fn: (a, b) => a / b,
  },
];

watch([startNumber, endNumber], ([newStart, newEnd]) => {
  if (newStart && newEnd) {
    answerNumber.value = null;
  }
});

onMounted(() => {
  showRandomQuote();
});

const showRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  customText.value = quotes[randomIndex];
};

// 根据输入的值计算
const handleCalculation = (item) => {
  console.log(item, "item");
  defaultCalc.value = item;
  answerNumber.value = null;
  trigger.value = false;
};

// 分析题目并计算结果
const handleAnalysis = () => {
  console.log(defaultCalc.value, "defaultCalc");
  console.log(startNumber.value, "startNumber");
  console.log(endNumber.value, "endNumber");
  trigger.value = true;
  answerNumber.value = defaultCalc.value.fn(
    Number(startNumber.value),
    Number(endNumber.value)
  );
};

// 重置所有输入框
const resetAll = () => {
  startNumber.value = null;
  endNumber.value = null;
  answerNumber.value = null;
  trigger.value = false;
};
</script>
<style scoped lang="less">
.answerColor {
  color: #e384ff;
}
.calculation {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px 0;
  .box {
    width: 100%;
    height: auto;
    color: #5e5a5a;
    background: #ffc400;
    padding: 10px 0;
    margin: 0 10px;
    text-align: center;
    cursor: pointer;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.calc-content {
  margin: 100px 20px;
  height: auto;
  border: 1px solid #ccc;
  .calc-title {
    margin: 10px;
    .AI {
      display: inline-block;
      background-color: #e384ff;
      color: #fff;
      width: 100px;
      height: auto;
      border-radius: 10px;
      text-align: center;
      padding: 5px 2px;
    }
    .clear {
      display: inline-block;
      background-color: #e384ff;
      color: #fff;
      width: 100px;
      height: auto;
      border-radius: 10px;
      text-align: center;
      padding: 5px 2px;
      margin-left: 0.2rem;
    }
  }
  .calc-question {
    display: flex;
    justify-content: center;
    align-items: center;
    .input {
      :deep(.van-cell__value) {
        border: 1px solid #ccc;
      }
      :deep(.van-field__control) {
        text-align: center;
      }
    }
    .input > :last-child {
      :deep(.van-field__control) {
        color: #e384ff;
      }
    }
  }
  .process {
    .process-content {
      display: flex;
      flex-direction: column;
      flex-wrap: nowrap;
      align-content: flex-end;
      justify-content: center;
      align-items: center;
      .process-content-type {
        margin: 10px 0 0 0;
        width: 90%;
        text-align: end;
      }
      .process-content-type > :first-child {
        display: inline-block;
        margin-right: 100px;
        color: #e384ff;
      }
      .answer {
        margin-right: 50px;
        margin: 10px 0;
        width: 90%;
        text-align: end;
      }
      .answer > :first-child {
        display: inline-block;
        margin-right: 100px;
        color: #e384ff;
      }
    }
  }
}
</style>
