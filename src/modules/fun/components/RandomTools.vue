<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { randomInt } from "@/shared/lib/random";
const props = defineProps<{ active: boolean }>();
const kind = ref<"dice" | "coin" | "number">("dice");
const kinds: { id: "dice" | "coin" | "number"; name: string }[] = [
  { id: "dice", name: "掷骰子" },
  { id: "coin", name: "抛硬币" },
  { id: "number", name: "随机数" },
];
const count = ref(1),
  dice = ref([1]);
const rotations = ref([{ x: 0, y: 0 }]);
const busy = ref(false),
  result = ref("");
const coinRotation = ref(0),
  coin = ref("正面");
const minimum = ref<number | string>(1),
  maximum = ref<number | string>(100);
const numberResult = ref<number>(),
  error = ref("");
const pips = [
  [4],
  [0, 8],
  [0, 4, 8],
  [0, 2, 6, 8],
  [0, 2, 4, 6, 8],
  [0, 2, 3, 5, 6, 8],
];
const faces = ["front", "top", "right", "left", "bottom", "back"];
const title = computed(() =>
  kind.value === "dice"
    ? "掷一点小运气"
    : kind.value === "coin"
      ? "正反之间，听听心意"
      : "让数字带来一点惊喜",
);
const description = computed(() =>
  kind.value === "dice"
    ? "一颗、两颗、三颗，每次都是新的可能。"
    : kind.value === "coin"
      ? "拿不定主意时，让硬币轻轻翻个面。"
      : "设定一个范围，抽取属于这一刻的数字。",
);
let timer: ReturnType<typeof setTimeout> | undefined;
let pending = "";
function settle() {
  busy.value = false;
  result.value = pending;
  pending = "";
}
function animate(message: string) {
  busy.value = true;
  result.value = "";
  pending = message;
  timer = setTimeout(
    settle,
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 920,
  );
}
function setCount(value: number) {
  if (busy.value) return;
  count.value = value;
  dice.value = Array(value).fill(1);
  rotations.value = Array.from({ length: value }, () => ({ x: 0, y: 0 }));
  result.value = "";
}
function rollDice() {
  if (busy.value) return;
  const targets = [
    [0, 0],
    [-90, 0],
    [0, -90],
    [0, 90],
    [90, 0],
    [0, 180],
  ];
  dice.value = Array.from({ length: count.value }, () => randomInt(6) + 1);
  rotations.value = dice.value.map((value, index) => {
    const previous = rotations.value[index],
      [x, y] = targets[value - 1];
    return {
      x: previous.x + 720 + ((x - (previous.x % 360) + 360) % 360),
      y: previous.y + 720 + ((y - (previous.y % 360) + 360) % 360),
    };
  });
  animate(
    dice.value.length === 1
      ? `掷出了 ${dice.value[0]} 点`
      : `${dice.value.join(" + ")} = ${dice.value.reduce((sum, value) => sum + value, 0)} 点`,
  );
}
function flipCoin() {
  if (busy.value) return;
  const side = randomInt(2);
  coin.value = side === 0 ? "正面" : "反面";
  coinRotation.value +=
    1800 + ((side * 180 - (coinRotation.value % 360) + 360) % 360);
  animate(`这次是${coin.value}`);
}
function drawNumber() {
  error.value = "";
  const min = Number(minimum.value),
    max = Number(maximum.value);
  if (
    String(minimum.value).trim() === "" ||
    String(maximum.value).trim() === "" ||
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min < 0 ||
    max > 1000000 ||
    max < min
  ) {
    error.value = "请输入 0～1000000 范围内的整数，且上限不能小于下限。";
    return;
  }
  numberResult.value = min + randomInt(max - min + 1);
  result.value = `抽到了 ${numberResult.value}`;
}
watch([minimum, maximum], () => {
  numberResult.value = undefined;
  result.value = error.value = "";
});
watch(kind, () => {
  result.value = error.value = "";
});
watch(
  () => props.active,
  (active) => {
    if (!active && busy.value) {
      clearTimeout(timer);
      settle();
    }
  },
);
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
  <section class="game-card random-game" aria-labelledby="random-title">
    <header class="game-heading">
      <div>
        <p class="game-eyebrow">A SMALL DOSE OF SERENDIPITY</p>
        <h2 id="random-title">{{ title }}</h2>
        <p class="game-description">{{ description }}</p>
      </div>
      <span class="game-stamp">✦</span>
    </header>
    <div class="game-segments" aria-label="随机工具">
      <button
        v-for="item in kinds"
        :key="item.id"
        type="button"
        :disabled="busy"
        :aria-pressed="kind === item.id"
        :class="{ selected: kind === item.id }"
        @click="kind = item.id"
      >
        {{ item.name }}
      </button>
    </div>
    <template v-if="kind === 'dice'">
      <div class="dice-stage" :class="{ rolling: busy }" aria-hidden="true">
        <div v-for="index in dice.length" :key="index" class="dice-space">
          <div
            class="dice-cube"
            :style="{
              transform: `rotateX(-18deg) rotateY(-25deg) rotateX(${rotations[index - 1].x}deg) rotateY(${rotations[index - 1].y}deg)`,
            }"
          >
            <div
              v-for="(face, faceIndex) in faces"
              :key="face"
              :class="[
                'dice-face',
                `face-${face}`,
                { 'single-pip': faceIndex === 0 },
              ]"
            >
              <i
                v-for="pip in pips[faceIndex]"
                :key="pip"
                :style="{
                  gridRow: Math.floor(pip / 3) + 1,
                  gridColumn: (pip % 3) + 1,
                }"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="dice-count" aria-label="骰子数量">
        <span>几颗骰子？</span
        ><button
          v-for="n in [1, 2, 3]"
          :key="n"
          type="button"
          :disabled="busy"
          :class="{ selected: count === n }"
          :aria-pressed="count === n"
          @click="setCount(n)"
        >
          {{ n }} 颗
        </button>
      </div>
      <button
        type="button"
        class="game-primary roll-button"
        :disabled="busy"
        @click="rollDice"
      >
        <van-icon name="replay" />{{ busy ? "好运翻滚中…" : "掷一次骰子" }}
      </button>
    </template>
    <template v-else-if="kind === 'coin'">
      <div class="coin-stage" :class="{ flipping: busy }" aria-hidden="true">
        <div class="coin" :style="{ transform: `rotateY(${coinRotation}deg)` }">
          <span class="coin-face coin-heads"><b>✦</b><small>正面</small></span
          ><span class="coin-face coin-tails"><b>☾</b><small>反面</small></span>
        </div>
      </div>
      <button
        type="button"
        class="game-primary roll-button"
        :disabled="busy"
        @click="flipCoin"
      >
        {{ busy ? "让硬币飞一会…" : "抛一枚硬币" }}
      </button>
    </template>
    <template v-else>
      <div class="number-stage">
        <Transition name="number-pop" mode="out-in"
          ><strong
            :key="numberResult === undefined ? 'empty' : result + numberResult"
            >{{ numberResult ?? "—" }}</strong
          ></Transition
        ><small>给随机留一个位置</small>
      </div>
      <form class="number-form" @submit.prevent="drawNumber">
        <div class="number-fields">
          <label
            >最小值<input
              v-model="minimum"
              type="number"
              min="0"
              max="1000000"
              step="1"
              required /></label
          ><span aria-hidden="true">—</span
          ><label
            >最大值<input
              v-model="maximum"
              type="number"
              min="0"
              max="1000000"
              step="1"
              required
          /></label>
        </div>
        <button type="submit" class="game-primary roll-button">
          抽取一个数字
        </button>
      </form>
      <p v-if="error" class="game-error" role="alert">{{ error }}</p>
    </template>
    <p class="game-status random-status" aria-live="polite" aria-atomic="true">
      {{
        busy
          ? "再等一小下，惊喜马上揭晓。"
          : result || "准备好了吗？把选择交给一点运气。"
      }}
    </p>
    <p class="game-footnote random-note">每次独立随机 · 仅供日常娱乐</p>
  </section>
</template>
<style scoped>
.random-game {
  text-align: center;
}
.random-game .game-heading {
  text-align: left;
}
.dice-stage {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 2vw, 24px);
  padding: 40px 10px;
  --size: clamp(50px, 14vw, 84px);
}
.dice-space {
  position: relative;
  width: calc(var(--size) * 1.3);
  height: var(--size);
  perspective: 600px;
}
.dice-space::after {
  content: "";
  position: absolute;
  width: 110%;
  height: 14px;
  left: -5%;
  bottom: -34px;
  background: #887d5e20;
  border-radius: 50%;
  filter: blur(5px);
  z-index: -1;
}
.dice-cube {
  position: relative;
  width: var(--size);
  height: var(--size);
  margin: auto;
  transform-style: preserve-3d;
  transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.22, 1);
}
.dice-face {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 16%;
  gap: 9%;
  border: 1px solid #ddd8c9;
  border-radius: 16%;
  background: linear-gradient(145deg, #fffefa, #ece7da);
  backface-visibility: hidden;
  box-shadow:
    inset 0 0 8px #fff,
    0 0 0 1px #e4ddcc;
}
.dice-face i {
  display: block;
  border-radius: 50%;
  background: #38765c;
  box-shadow:
    inset 0 1px 3px #153b3550,
    0 1px 0 #fff;
}
.single-pip i {
  background: #c57561;
}
.face-front {
  transform: translateZ(calc(var(--size) / 2));
}
.face-back {
  transform: rotateY(180deg) translateZ(calc(var(--size) / 2));
}
.face-right {
  transform: rotateY(90deg) translateZ(calc(var(--size) / 2));
}
.face-left {
  transform: rotateY(-90deg) translateZ(calc(var(--size) / 2));
}
.face-top {
  transform: rotateX(90deg) translateZ(calc(var(--size) / 2));
}
.face-bottom {
  transform: rotateX(-90deg) translateZ(calc(var(--size) / 2));
}
.rolling .dice-space {
  animation: dice-hop 0.9s ease-in-out;
}
.rolling .dice-space:nth-child(2) {
  animation-delay: 0.04s;
}
.rolling .dice-space:nth-child(3) {
  animation-delay: 0.08s;
}
.dice-count {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 4px 0 22px;
  font-size: 12px;
}
.dice-count > span {
  margin-right: 6px;
  color: #838773;
}
.dice-count button {
  min-height: 34px;
  padding: 4px 11px;
  border-radius: 9px;
  font-size: 12px;
  background: #f3f0e6;
}
.dice-count button.selected {
  background: #dfead8;
  color: #3f6a4f;
}
.coin-stage {
  display: grid;
  place-items: center;
  min-height: 245px;
  perspective: 700px;
}
.coin {
  position: relative;
  width: 128px;
  height: 128px;
  transform-style: preserve-3d;
  transition: transform 0.9s cubic-bezier(0.18, 0.65, 0.26, 1);
}
.coin-face {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 7px solid #d7b96f;
  background: radial-gradient(circle at 30% 25%, #fff2b8, #e9ce85 75%);
  box-shadow:
    inset 0 0 0 3px #f8e6a8,
    inset 0 0 0 5px #d7b96f;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #9c763c;
}
.coin-heads {
  transform: translateZ(3px);
}
.coin-tails {
  transform: rotateY(180deg) translateZ(3px);
}
.coin-face b {
  font-size: 46px;
  line-height: 1.1;
  text-shadow: 0 1px #fff3ba;
}
.coin-face small {
  font-size: 13px;
  letter-spacing: 3px;
}
.flipping {
  animation: coin-hop 0.9s ease-in-out;
}
.roll-button {
  min-width: 190px;
}
.random-status {
  min-height: 32px;
  margin-top: 24px;
}
.random-note {
  margin-top: 4px;
}
.number-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  gap: 8px;
}
.number-stage strong {
  font-size: clamp(38px, 10vw, 64px);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #52754c;
  line-height: 1.2;
}
.number-stage small {
  color: #939781;
  font-size: 12px;
}
.number-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 12px minmax(0, 1fr);
  gap: 12px;
  text-align: left;
  align-items: end;
  max-width: 400px;
  margin: 0 auto 20px;
}
.number-fields > span {
  padding-bottom: 12px;
  color: #aaa88e;
}
.number-fields label {
  font-size: 12px;
}
.number-pop-enter-active,
.number-pop-leave-active {
  transition:
    opacity 0.16s,
    transform 0.16s;
}
.number-pop-enter-from {
  opacity: 0;
  transform: translateY(15px);
}
.number-pop-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}
@keyframes dice-hop {
  0%,
  100% {
    translate: 0 0;
  }
  40% {
    translate: 0 -25px;
  }
  75% {
    translate: 0 5px;
  }
}
@keyframes coin-hop {
  0%,
  100% {
    translate: 0 0;
  }
  45% {
    translate: 0 -26px;
  }
}
</style>
