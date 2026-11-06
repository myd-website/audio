<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  canMoveTiles,
  moveTiles,
  spawnTile,
  type Direction,
  type Tile,
} from "../domain/game2048";
import GameCelebration from "./GameCelebration.vue";
const props = defineProps<{ active: boolean }>();
let nextId = 1;
const tiles = ref<Tile[]>([]);
const score = ref(0),
  best = ref(0),
  turns = ref(0);
const moving = ref(false),
  continued = ref(false);
const outcome = ref<"playing" | "won" | "over">("playing");
const merged = ref<number[]>([]),
  born = ref(-1);
const highest = computed(() =>
  Math.max(0, ...tiles.value.map((tile) => tile.value)),
);
let timer: ReturnType<typeof setTimeout> | undefined;
let pending: ReturnType<typeof moveTiles> | undefined;
let pointer: { x: number; y: number; id: number } | undefined;
const directions: { id: Direction; label: string; arrow: string }[] = [
  { id: "up", label: "向上移动", arrow: "↑" },
  { id: "left", label: "向左移动", arrow: "←" },
  { id: "down", label: "向下移动", arrow: "↓" },
  { id: "right", label: "向右移动", arrow: "→" },
];
function restart() {
  clearTimeout(timer);
  pending = undefined;
  moving.value = false;
  pointer = undefined;
  tiles.value = spawnTile(spawnTile([], nextId++), nextId++);
  score.value = turns.value = 0;
  outcome.value = "playing";
  continued.value = false;
  merged.value = [];
  born.value = -1;
}
restart();
function settle() {
  if (!pending) return;
  const move = pending;
  pending = undefined;
  // 一次合法移动只提交一次分数和新方块；无效移动完全不改变棋盘。
  born.value = nextId++;
  tiles.value = spawnTile(move.tiles, born.value);
  merged.value = move.mergedIds;
  score.value += move.score;
  best.value = Math.max(best.value, score.value);
  turns.value++;
  moving.value = false;
  if (!continued.value && highest.value >= 2048) outcome.value = "won";
  else if (!canMoveTiles(tiles.value)) outcome.value = "over";
}
function move(direction: Direction) {
  if (!props.active || moving.value || outcome.value !== "playing") return;
  const result = moveTiles(tiles.value, direction);
  if (!result.moved) {
    if (!canMoveTiles(tiles.value)) outcome.value = "over";
    return;
  }
  merged.value = [];
  born.value = -1;
  moving.value = true;
  pending = result;
  tiles.value = result.motions;
  timer = setTimeout(
    settle,
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150,
  );
}
function continueGame() {
  if (outcome.value !== "won") return;
  continued.value = true;
  outcome.value = canMoveTiles(tiles.value) ? "playing" : "over";
}
function keyboard(event: KeyboardEvent) {
  const direction = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  }[event.key] as Direction | undefined;
  if (
    !direction ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  )
    return;
  event.preventDefault();
  move(direction);
}
function pointerDown(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0) return;
  pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}
function pointerUp(event: PointerEvent) {
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x,
    dy = event.clientY - pointer.y;
  pointer = undefined;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  move(
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0
        ? "right"
        : "left"
      : dy > 0
        ? "down"
        : "up",
  );
}
watch(
  () => props.active,
  (active) => {
    if (!active) {
      pointer = undefined;
      clearTimeout(timer);
      settle();
    }
  },
);
onBeforeUnmount(() => {
  clearTimeout(timer);
  pending = undefined;
});
</script>
<template>
  <section class="game-card merge-game" aria-labelledby="merge-title">
    <header class="game-heading">
      <div>
        <p class="game-eyebrow">A LITTLE MORE, A LITTLE CLOSER</p>
        <h2 id="merge-title">慢慢合成 2048</h2>
        <p class="game-description">相同的数字碰个面，每一步都多一点可能。</p>
      </div>
      <span class="game-stamp">2ⁿ</span>
    </header>
    <div class="game-stats">
      <div>
        <small>本局得分</small><strong>{{ score }}</strong>
      </div>
      <div>
        <small>本次页面最高分</small><strong>{{ best }}</strong>
      </div>
      <div>
        <small>已移动</small><strong>{{ turns }}<span>步</span></strong>
      </div>
    </div>
    <div
      class="merge-board"
      tabindex="0"
      role="group"
      aria-label="2048 棋盘，可用方向键、WASD、滑动或下方按钮操作"
      aria-describedby="merge-status"
      @keydown="keyboard"
      @pointerdown="pointerDown"
      @pointerup="pointerUp"
      @pointercancel="pointer = undefined"
      @lostpointercapture="pointer = undefined"
    >
      <div class="merge-cells" aria-hidden="true">
        <span v-for="n in 16" :key="n" />
      </div>
      <div
        v-for="tile in tiles"
        :key="tile.id"
        class="merge-tile"
        :style="{ '--x': tile.index % 4, '--y': Math.floor(tile.index / 4) }"
        :aria-label="`第 ${Math.floor(tile.index / 4) + 1} 行第 ${(tile.index % 4) + 1} 列，${tile.value}`"
      >
        <span
          :class="[
            'tile-value',
            `value-${Math.min(tile.value, 2048)}`,
            {
              'tile-merged': merged.includes(tile.id),
              'tile-born': born === tile.id,
              'tile-long': tile.value > 9999,
            },
          ]"
          >{{ tile.value }}</span
        >
      </div>
      <div v-if="outcome !== 'playing'" class="merge-overlay">
        <span>{{ outcome === "won" ? "✦" : "↻" }}</span>
        <h3>{{ outcome === "won" ? "2048，合成啦！" : "这一局，先到这里" }}</h3>
        <p>
          {{
            outcome === "won"
              ? "还可以继续，看看下一个数字。"
              : `得到了 ${score} 分，再来一次试试看。`
          }}
        </p>
        <button
          v-if="outcome === 'won'"
          type="button"
          class="game-primary"
          @pointerdown.stop
          @pointerup.stop
          @keydown.stop
          @click="continueGame"
        >
          继续挑战</button
        ><button
          type="button"
          @pointerdown.stop
          @pointerup.stop
          @keydown.stop
          @click="restart"
        >
          再来一局
        </button>
      </div>
    </div>
    <div class="direction-pad" aria-label="2048 方向控制">
      <button
        v-for="direction in directions"
        :key="direction.id"
        type="button"
        :aria-label="direction.label"
        :disabled="moving || outcome !== 'playing'"
        @click="move(direction.id)"
      >
        {{ direction.arrow }}
      </button>
    </div>
    <p id="merge-status" class="game-status" aria-live="polite">
      {{
        outcome === "won"
          ? "已合成 2048！可以继续挑战。"
          : outcome === "over"
            ? `没有可移动的位置了，本局 ${score} 分。`
            : `最大数字 ${highest} · 滑动棋盘、方向键或下方按钮操作`
      }}
    </p>
    <div class="game-actions">
      <button type="button" @click="restart">
        <van-icon name="replay" />重新开始</button
      ><span class="game-footnote">无效移动不生成数字，每轮只合并一次</span>
    </div>
    <GameCelebration :active="outcome === 'won'" />
  </section>
</template>
<style scoped>
.merge-board {
  position: relative;
  width: min(100%, 360px);
  aspect-ratio: 1;
  margin: 28px auto 20px;
  background: #bcb6a5;
  border: 10px solid #bcb6a5;
  border-radius: 22px;
  touch-action: none;
  user-select: none;
  --tile: calc((100% - 24px) / 4);
}
.merge-cells {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.merge-cells span {
  border-radius: 10px;
  background: #d5cfc0;
}
.merge-tile {
  position: absolute;
  width: var(--tile);
  height: var(--tile);
  left: calc(var(--x) * (100% + 8px) / 4);
  top: calc(var(--y) * (100% + 8px) / 4);
  transition:
    left 0.14s ease,
    top 0.14s ease;
}
.tile-value {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: clamp(19px, 5vw, 32px);
  font-weight: 750;
  background: #ece6d9;
  color: #756957;
  box-shadow: 0 2px 3px #74685016;
}
.value-4 {
  background: #eee1c5;
}
.value-8 {
  background: #e8b786;
  color: #553c28;
}
.value-16 {
  background: #df956c;
  color: #fffaf2;
}
.value-32 {
  background: #d67f66;
  color: #fffaf2;
}
.value-64 {
  background: #c66651;
  color: #fff;
}
.value-128 {
  background: #b4bb80;
  color: #344326;
}
.value-256 {
  background: #92ab77;
  color: #233d25;
}
.value-512 {
  background: #689274;
  color: #fff;
}
.value-1024 {
  background: #477b66;
  color: #fff;
  font-size: clamp(18px, 4.5vw, 27px);
}
.value-2048 {
  background: #29634e;
  color: #ffebad;
  font-size: clamp(18px, 4.5vw, 27px);
  box-shadow: 0 0 18px #b4d19850;
}
.tile-long {
  font-size: clamp(13px, 3.5vw, 21px);
}
.tile-born {
  animation: tile-appear 0.18s ease-out;
}
.tile-merged {
  animation: tile-pop 0.25s ease-out;
}
.merge-overlay {
  position: absolute;
  inset: -1px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  text-align: center;
  border-radius: 14px;
  background: #fff9ecde;
  backdrop-filter: blur(5px);
  animation: tile-appear 0.25s ease-out;
}
.merge-overlay > span {
  font-size: 38px;
  color: #b38d49;
}
.merge-overlay h3 {
  font-size: 23px;
}
.merge-overlay p {
  font-size: 13px;
  color: #6d725f;
}
.direction-pad {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.direction-pad button {
  width: 50px;
  padding: 6px;
  font-size: 24px;
  background: #f0ece2;
}
@keyframes tile-appear {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes tile-pop {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.16);
  }
}
</style>
