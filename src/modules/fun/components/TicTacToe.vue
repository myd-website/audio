<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  chooseComputerMove,
  ticTacToeResult,
  type Cell,
  type Mark,
} from "../domain/ticTacToe";
import GameCelebration from "./GameCelebration.vue";
const props = defineProps<{ active: boolean }>();
const mode = ref<"computer" | "local">("computer");
const board = ref<Cell[]>(Array(9).fill(null)),
  turn = ref<Mark>("X");
const scores = ref({ X: 0, O: 0, draw: 0 });
const thinking = ref(false);
const outcome = computed(() => ticTacToeResult(board.value));
const status = computed(() =>
  outcome.value.winner === "draw"
    ? "势均力敌，这局是平局。"
    : outcome.value.winner
      ? `${outcome.value.winner === "X" ? "叉叉" : "圆圈"}连成一线，赢啦！`
      : thinking.value
        ? "圆圈正在想下一步…"
        : `轮到${turn.value === "X" ? "叉叉 ×" : "圆圈 ○"}落子${mode.value === "computer" && turn.value === "X" ? "，你先来" : ""}`,
);
let timer: ReturnType<typeof setTimeout> | undefined;
function clearThinking() {
  clearTimeout(timer);
  thinking.value = false;
}
function restart() {
  clearThinking();
  board.value = Array(9).fill(null);
  turn.value = "X";
}
function place(index: number) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 9 ||
    board.value[index] ||
    outcome.value.winner
  )
    return;
  board.value[index] = turn.value;
  const winner = outcome.value.winner;
  if (winner) scores.value[winner]++;
  else turn.value = turn.value === "X" ? "O" : "X";
}
function scheduleComputer() {
  clearThinking();
  if (
    !props.active ||
    mode.value !== "computer" ||
    turn.value !== "O" ||
    outcome.value.winner
  )
    return;
  thinking.value = true;
  timer = setTimeout(
    () => {
      thinking.value = false;
      if (
        props.active &&
        mode.value === "computer" &&
        turn.value === "O" &&
        !outcome.value.winner
      )
        place(chooseComputerMove(board.value));
    },
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420,
  );
}
function play(index: number) {
  if (
    !props.active ||
    thinking.value ||
    (mode.value === "computer" && turn.value === "O")
  )
    return;
  place(index);
  scheduleComputer();
}
watch(() => props.active, scheduleComputer);
watch(mode, () => {
  restart();
  scores.value = { X: 0, O: 0, draw: 0 };
});
onBeforeUnmount(clearThinking);
</script>
<template>
  <section class="game-card tic-game" aria-labelledby="tic-title">
    <header class="game-heading">
      <div>
        <p class="game-eyebrow">YOUR MOVE, MY MOVE</p>
        <h2 id="tic-title">一起画个圈圈叉叉</h2>
        <p class="game-description">横着、竖着、斜着，先连成三个就赢。</p>
      </div>
      <span class="game-stamp">○×</span>
    </header>
    <div class="game-segments" aria-label="井字棋对战方式">
      <button
        type="button"
        :class="{ selected: mode === 'computer' }"
        :aria-pressed="mode === 'computer'"
        @click="mode = 'computer'"
      >
        和电脑下</button
      ><button
        type="button"
        :class="{ selected: mode === 'local' }"
        :aria-pressed="mode === 'local'"
        @click="mode = 'local'"
      >
        两个人玩
      </button>
    </div>
    <div class="game-stats tic-stats">
      <div :class="{ 'current-player': !outcome.winner && turn === 'X' }">
        <small>叉叉 {{ mode === "computer" ? "· 你" : "· 玩家一" }}</small
        ><strong>{{ scores.X }}<span>胜</span></strong>
      </div>
      <div>
        <small>握手言和</small><strong>{{ scores.draw }}<span>局</span></strong>
      </div>
      <div :class="{ 'current-player': !outcome.winner && turn === 'O' }">
        <small>圆圈 {{ mode === "computer" ? "· 电脑" : "· 玩家二" }}</small
        ><strong>{{ scores.O }}<span>胜</span></strong>
      </div>
    </div>
    <div
      class="tic-board"
      role="group"
      aria-label="井字棋棋盘"
      :aria-busy="thinking"
    >
      <button
        v-for="(cell, index) in board"
        :key="index"
        type="button"
        :disabled="
          Boolean(cell) ||
          Boolean(outcome.winner) ||
          thinking ||
          (mode === 'computer' && turn === 'O')
        "
        :class="{ 'winning-cell': outcome.line.includes(index) }"
        :aria-label="`第 ${Math.floor(index / 3) + 1} 行第 ${(index % 3) + 1} 列，${cell === 'X' ? '叉叉' : cell === 'O' ? '圆圈' : '空格，可落子'}`"
        @click="play(index)"
      >
        <span
          v-if="cell"
          :class="['tic-mark', cell === 'X' ? 'mark-x' : 'mark-o']"
          aria-hidden="true"
        />
      </button>
    </div>
    <p
      class="game-status"
      :class="{ success: outcome.winner }"
      aria-live="polite"
    >
      <span v-if="thinking" class="thinking-dots" aria-hidden="true"
        ><i /><i /><i /></span
      >{{ status }}
    </p>
    <div class="game-actions">
      <button type="button" class="game-primary" @click="restart">
        <van-icon name="replay" />再下一局</button
      ><span class="game-footnote">{{
        mode === "computer"
          ? "你执叉叉先手，电脑会认真迎战"
          : "共用这块屏幕，轮流落子"
      }}</span>
    </div>
    <GameCelebration
      :active="Boolean(outcome.winner && outcome.winner !== 'draw')"
    />
  </section>
</template>
<style scoped>
.tic-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  width: min(100%, 315px);
  margin: 30px auto 24px;
  padding: 10px;
  background: #e6e0ee;
  border-radius: 23px;
}
.tic-board button {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  min-height: 0;
  padding: 10px;
  background: #fcfaff;
  border-radius: 14px;
  opacity: 1;
  transition:
    background 0.2s,
    box-shadow 0.2s;
}
.tic-board button:not(:disabled):hover {
  background: #efe8f8;
  box-shadow: inset 0 0 0 2px #baacd2;
}
.tic-board button.winning-cell {
  background: #e3edda;
  animation: winning 0.6s ease;
}
.tic-mark {
  /* 由棋格限定棋子尺寸，避免空 span 在自动网格轨道中收缩成零宽。 */
  position: absolute;
  inset: 26%;
  display: block;
  animation: mark-in 0.24s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
.mark-x::before,
.mark-x::after {
  content: "";
  position: absolute;
  top: 44%;
  left: -10%;
  width: 120%;
  height: 6px;
  background: #997db3;
  border-radius: 5px;
  transform: rotate(45deg);
}
.mark-x::after {
  transform: rotate(-45deg);
}
.mark-o {
  border: 6px solid #b8915e;
  border-radius: 50%;
}
.tic-stats > div {
  border-bottom: 3px solid transparent;
  transition: border-color 0.2s;
}
.tic-stats > .current-player {
  border-color: #b3a0c9;
}
.thinking-dots {
  display: inline-flex;
  gap: 3px;
  margin-right: 7px;
}
.thinking-dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #a18bb8;
  animation: thinking 0.8s infinite alternate;
}
.thinking-dots i:nth-child(2) {
  animation-delay: 0.15s;
}
.thinking-dots i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes mark-in {
  from {
    opacity: 0;
    transform: scale(0.5) rotate(-15deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}
@keyframes winning {
  50% {
    box-shadow: 0 0 0 4px #bdd1a7;
  }
}
@keyframes thinking {
  to {
    transform: translateY(-4px);
    opacity: 0.4;
  }
}
</style>
