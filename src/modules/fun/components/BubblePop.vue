<script setup lang="ts">
import { computed, ref } from "vue";
import {
  canPopColors,
  colorGroup,
  createColorBoard,
  GAME_COLORS,
  popColors,
  type ColorBoard,
} from "../domain/colorGames";
import GameCelebration from "./GameCelebration.vue";
const props = defineProps<{ active: boolean }>();
const columns = 7,
  rows = 8;
const board = ref<ColorBoard>(createColorBoard(rows, columns, 4));
const score = ref(0),
  rounds = ref(0),
  hovered = ref(-1);
const burst = ref<number[]>([]),
  burstRound = ref(0),
  message = ref("");
const history = ref<{ board: ColorBoard; score: number; rounds: number }[]>([]);
const highlighted = computed(
  () => new Set(colorGroup(board.value, columns, hovered.value)),
);
const remaining = computed(
  () => board.value.filter((color) => color !== null).length,
);
const ended = computed(() => !canPopColors(board.value, columns));
const won = computed(() => remaining.value === 0);
const totalScore = computed(() => score.value + (won.value ? 500 : 0));
function pop(index: number) {
  if (!props.active || ended.value) return;
  const next = popColors(board.value, columns, index);
  if (!next.removed.length) {
    message.value = "至少两颗上下或左右相连的同色泡泡才能消除。";
    return;
  }
  history.value = [
    ...history.value.slice(-99),
    { board: board.value, score: score.value, rounds: rounds.value },
  ];
  board.value = next.board;
  score.value += next.points;
  rounds.value++;
  burst.value = next.removed;
  burstRound.value++;
  hovered.value = -1;
  message.value = `啪！消除 ${next.removed.length} 颗，获得 ${next.points} 分。`;
}
function undo() {
  if (!props.active || !history.value.length) return;
  const previous = history.value.pop()!;
  board.value = previous.board;
  score.value = previous.score;
  rounds.value = previous.rounds;
  burst.value = [];
  hovered.value = -1;
  message.value = "已经回到上一步，再换个思路试试。";
}
function restart() {
  board.value = createColorBoard(rows, columns, 4);
  history.value = [];
  burst.value = [];
  hovered.value = -1;
  score.value = rounds.value = 0;
  message.value = "";
}
</script>
<template>
  <section class="game-card bubble-game" aria-labelledby="bubble-title">
    <header class="game-heading">
      <div>
        <p class="game-eyebrow">POP AWAY THE BUSY DAY</p>
        <h2 id="bubble-title">泡泡消消乐</h2>
        <p class="game-description">
          点掉相连的同色泡泡，连得越多，分数越高。空列会自动收拢。
        </p>
      </div>
      <span class="game-stamp" aria-hidden="true">◌</span>
    </header>
    <div class="game-stats">
      <div>
        <small>本局得分</small><strong>{{ totalScore }}<span>分</span></strong>
      </div>
      <div>
        <small>还剩泡泡</small><strong>{{ remaining }}<span>颗</span></strong>
      </div>
      <div>
        <small>连消次数</small><strong>{{ rounds }}<span>次</span></strong>
      </div>
    </div>
    <div
      class="bubble-board"
      role="group"
      aria-label="泡泡棋盘"
      @pointerleave="hovered = -1"
    >
      <button
        v-for="(color, index) in board"
        :key="index"
        type="button"
        :class="{
          empty: color === null,
          highlighted: highlighted.size >= 2 && highlighted.has(index),
        }"
        :style="{
          '--bubble-color':
            color === null ? 'transparent' : GAME_COLORS[color].color,
        }"
        :disabled="color === null || ended || !active"
        :aria-hidden="color === null ? true : undefined"
        :aria-label="
          color === null
            ? undefined
            : `第 ${Math.floor(index / columns) + 1} 行第 ${(index % columns) + 1} 列，${GAME_COLORS[color].name}泡泡`
        "
        @pointerenter="hovered = index"
        @focus="hovered = index"
        @blur="hovered = -1"
        @click="pop(index)"
      >
        <span v-if="color !== null" aria-hidden="true">{{
          GAME_COLORS[color].symbol
        }}</span>
      </button>
      <div :key="burstRound" class="bubble-burst" aria-hidden="true">
        <i
          v-for="index in burst"
          :key="index"
          :style="{
            gridColumn: (index % columns) + 1,
            gridRow: Math.floor(index / columns) + 1,
          }"
          >✧</i
        >
      </div>
    </div>
    <p class="game-status" :class="{ success: won }" aria-live="polite">
      {{
        won
          ? "全部清空！额外奖励 500 分，畅快收工。"
          : ended
            ? "没有相邻的同色泡泡了。可以撤销再想想，或轻松换一局。"
            : message || "至少两颗同色泡泡上下或左右相连，就能一起消除。"
      }}
    </p>
    <div class="game-actions">
      <button type="button" class="game-primary" @click="restart()">
        <van-icon name="replay" />再来一盘</button
      ><button type="button" :disabled="!history.length" @click="undo">
        撤销一步</button
      ><span class="game-footnote"
        >不限时间 · 两颗得 10 分 · 连消越多越划算</span
      >
    </div>
    <GameCelebration :active="won && active" />
  </section>
</template>
<style scoped>
.bubble-board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  width: min(100%, 360px);
  margin: 28px auto;
  padding: 12px;
  border-radius: 22px;
  background: #eee8ed;
}
.bubble-board button {
  aspect-ratio: 1;
  min-height: 0;
  min-width: 0;
  padding: 0;
  border-radius: 50%;
  border: 2px solid #ffffff80;
  background:
    radial-gradient(circle at 33% 26%, #ffffffa0, transparent 55%),
    var(--bubble-color);
  box-shadow:
    inset 0 -4px 5px #00000012,
    0 2px 0 #0000000c;
  color: #fffdf1;
  opacity: 1;
  font-size: clamp(12px, 3vw, 19px);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.bubble-board button.highlighted {
  transform: scale(1.09);
  box-shadow: 0 0 0 2px #fff6dd;
}
.bubble-board button:not(:disabled):active {
  transform: scale(0.85);
}
.bubble-board button.empty {
  visibility: hidden;
}
.bubble-burst {
  position: absolute;
  inset: 12px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: repeat(8, minmax(0, 1fr));
  gap: 6px;
  pointer-events: none;
}
.bubble-burst i {
  display: grid;
  place-items: center;
  color: #a58249;
  font-size: 25px;
  font-style: normal;
  opacity: 0;
  animation: bubble-burst 0.45s ease-out both;
}
@keyframes bubble-burst {
  from {
    opacity: 1;
    transform: scale(0.5);
  }
  to {
    opacity: 0;
    transform: scale(1.7) rotate(35deg);
  }
}
@media (max-width: 380px) {
  .bubble-board {
    gap: 4px;
    padding: 8px;
  }
  .bubble-burst {
    inset: 8px;
    gap: 4px;
  }
}
</style>
