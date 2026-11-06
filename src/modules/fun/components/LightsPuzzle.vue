<script setup lang="ts">
import { computed, ref } from "vue";
import {
  createLightsPuzzle,
  playLight,
  type LightsPuzzle,
} from "../domain/lights";
import GameCelebration from "./GameCelebration.vue";
const props = defineProps<{ active: boolean }>();
const puzzle = ref(createLightsPuzzle(4));
const moves = ref(0),
  hint = ref(-1);
const history = ref<LightsPuzzle[]>([]);
const lit = computed(() => puzzle.value.board.filter(Boolean).length);
const won = computed(() => lit.value === 0);
function play(index: number) {
  if (!props.active || won.value) return;
  const next = playLight(puzzle.value, index);
  if (next === puzzle.value) return;
  history.value = [...history.value.slice(-99), puzzle.value];
  puzzle.value = next;
  moves.value++;
  hint.value = -1;
}
function undo() {
  if (!props.active || !history.value.length) return;
  puzzle.value = history.value.pop()!;
  moves.value--;
  hint.value = -1;
}
function showHint() {
  if (props.active && !won.value)
    hint.value = puzzle.value.solution.findIndex(Boolean);
}
function restart(size = puzzle.value.size) {
  puzzle.value = createLightsPuzzle(size);
  history.value = [];
  moves.value = 0;
  hint.value = -1;
}
</script>
<template>
  <section class="game-card lights-game" aria-labelledby="lights-title">
    <header class="game-heading">
      <div>
        <p class="game-eyebrow">A LITTLE SWITCH OF PERSPECTIVE</p>
        <h2 id="lights-title">翻灯谜阵</h2>
        <p class="game-description">
          点一盏灯，自己和上下左右一起翻转。让所有灯熄灭吧。
        </p>
      </div>
      <span class="game-stamp" aria-hidden="true">☼</span>
    </header>
    <div class="game-segments" aria-label="翻灯难度">
      <button
        v-for="size in [3, 4, 5]"
        :key="size"
        type="button"
        :class="{ selected: puzzle.size === size }"
        :aria-pressed="puzzle.size === size"
        @click="restart(size)"
      >
        {{ size }} × {{ size }} ·
        {{ size === 3 ? "热身" : size === 4 ? "动脑" : "挑战" }}
      </button>
    </div>
    <div class="game-stats">
      <div>
        <small>已经点了</small><strong>{{ moves }}<span>步</span></strong>
      </div>
      <div>
        <small>还亮着</small><strong>{{ lit }}<span>盏</span></strong>
      </div>
      <div><small>目标</small><strong class="stat-small">全部熄灭</strong></div>
    </div>
    <div
      class="lights-board"
      :style="{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))` }"
      role="group"
      aria-label="翻灯棋盘"
    >
      <button
        v-for="(on, index) in puzzle.board"
        :key="index"
        type="button"
        :class="{ lit: on, suggested: hint === index }"
        :disabled="won || !active"
        :aria-pressed="on"
        :aria-label="`第 ${Math.floor(index / puzzle.size) + 1} 行第 ${(index % puzzle.size) + 1} 列，${on ? '亮灯' : '熄灭'}${hint === index ? '，建议点这里' : ''}`"
        @click="play(index)"
      >
        <span aria-hidden="true">{{ on ? "☀" : "·" }}</span>
      </button>
    </div>
    <p class="game-status" :class="{ success: won }" aria-live="polite">
      {{
        won
          ? `全部熄灭！用了 ${moves} 步，思路很亮。`
          : hint >= 0
            ? `试试第 ${Math.floor(hint / puzzle.size) + 1} 行第 ${(hint % puzzle.size) + 1} 列，虚线框已标出。`
            : "每局都有解，不限时间，慢慢想。"
      }}
    </p>
    <div class="game-actions">
      <button type="button" class="game-primary" @click="restart()">
        <van-icon name="replay" />换一局</button
      ><button type="button" :disabled="!history.length" @click="undo">
        撤销一步</button
      ><button type="button" :disabled="won" @click="showHint">
        给我一点提示
      </button>
    </div>
    <GameCelebration :active="won && active" />
  </section>
</template>
<style scoped>
.lights-board {
  display: grid;
  gap: 9px;
  width: min(100%, 340px);
  margin: 28px auto;
  padding: 12px;
  background: #e6e4d8;
  border-radius: 22px;
}
.lights-board button {
  aspect-ratio: 1;
  min-height: 0;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 12px;
  background: #dee1d6;
  color: #7f8a73;
  font-size: clamp(18px, 5vw, 30px);
  opacity: 1;
  transition:
    background 0.2s,
    box-shadow 0.2s,
    color 0.2s;
}
.lights-board button.lit {
  background: #f7d77d;
  color: #94621b;
  box-shadow:
    inset 0 0 12px #fff4b8,
    0 2px 7px #bd983528;
}
.lights-board button.suggested {
  border: 2px dashed #506a49;
  outline: 3px solid #ffffffb0;
  outline-offset: -6px;
}
.lights-board button:not(:disabled):active {
  transform: scale(0.92);
}
</style>
