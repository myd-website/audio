<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  createPuzzle,
  isPuzzleSolved,
  movePuzzle,
  puzzleNeighbors,
} from "../domain/slidingPuzzle";
import GameCelebration from "./GameCelebration.vue";
const props = defineProps<{ active: boolean }>();
const board = ref(createPuzzle());
const moves = ref(0),
  elapsed = ref(0);
const solved = computed(() => isPuzzleSolved(board.value));
const neighbors = computed(() => puzzleNeighbors(board.value.indexOf(0)));
const time = computed(
  () =>
    `${String(Math.floor(elapsed.value / 60000)).padStart(2, "0")}:${String(Math.floor(elapsed.value / 1000) % 60).padStart(2, "0")}`,
);
let timer: ReturnType<typeof setInterval> | undefined;
let accumulated = 0,
  startedAt = 0;
function stopClock() {
  if (timer === undefined) return;
  clearInterval(timer);
  timer = undefined;
  accumulated += Date.now() - startedAt;
  elapsed.value = accumulated;
}
watch(
  () => props.active && moves.value > 0 && !solved.value,
  (running) => {
    if (!running) return stopClock();
    startedAt = Date.now();
    timer = setInterval(() => {
      elapsed.value = accumulated + Date.now() - startedAt;
    }, 250);
  },
  { flush: "sync" },
);
function move(index: number) {
  if (!props.active || solved.value) return;
  const next = movePuzzle(board.value, index);
  if (next === board.value) return;
  board.value = next;
  moves.value++;
}
function restart() {
  stopClock();
  moves.value = 0;
  accumulated = elapsed.value = 0;
  board.value = createPuzzle();
}
function keyboard(event: KeyboardEvent) {
  const empty = board.value.indexOf(0);
  const target = {
    ArrowUp: empty - 3,
    ArrowDown: empty + 3,
    ArrowLeft: empty - 1,
    ArrowRight: empty + 1,
  }[event.key];
  if (
    target === undefined ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  )
    return;
  event.preventDefault();
  move(target);
}
onBeforeUnmount(stopClock);
</script>
<template>
  <section class="game-card puzzle-game" aria-labelledby="puzzle-title">
    <header class="game-heading">
      <div>
        <p class="game-eyebrow">SLIDE INTO PLACE</p>
        <h2 id="puzzle-title">数字华容道</h2>
        <p class="game-description">小小九宫格，让每一个数字找到自己的位置。</p>
      </div>
      <span class="game-stamp">01—08</span>
    </header>
    <div class="game-stats">
      <div>
        <small>移动步数</small><strong>{{ moves }}<span>步</span></strong>
      </div>
      <div>
        <small>本局用时</small><strong>{{ time }}</strong>
      </div>
      <div>
        <small>目标顺序</small><strong class="stat-small">1 → 8</strong>
      </div>
    </div>
    <TransitionGroup
      name="puzzle-tile"
      tag="div"
      class="puzzle-board"
      tabindex="0"
      aria-label="数字华容道，点击空格旁的数字移动，方向键移动空格"
      @keydown="keyboard"
    >
      <button
        v-for="(tile, index) in board"
        :key="tile"
        type="button"
        :class="{
          'puzzle-empty': tile === 0,
          'can-move': neighbors.includes(index),
          'in-place': tile === index + 1,
        }"
        :disabled="!tile || solved || !neighbors.includes(index)"
        :aria-label="
          tile
            ? `数字 ${tile}，第 ${Math.floor(index / 3) + 1} 行第 ${(index % 3) + 1} 列`
            : '空格'
        "
        @click="move(index)"
      >
        {{ tile || "" }}<span v-if="tile" aria-hidden="true">·</span>
      </button>
    </TransitionGroup>
    <p class="game-status" :class="{ success: solved }" aria-live="polite">
      {{
        solved
          ? `拼好了！你用了 ${moves} 步，把小世界归了位。`
          : "点击空格旁的数字移动，也可以用方向键移动空格。"
      }}
    </p>
    <div class="game-actions">
      <button type="button" class="game-primary" @click="restart">
        <van-icon name="replay" />换一盘</button
      ><span class="game-footnote">切换游戏会暂停计时，保留本局进度</span>
    </div>
    <GameCelebration :active="solved" />
  </section>
</template>
<style scoped>
.puzzle-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: min(100%, 330px);
  margin: 30px auto 24px;
  padding: 12px;
  border-radius: 24px;
  background: #e8e4da;
  box-shadow: inset 0 2px 5px #534d3c0c;
}
.puzzle-board button {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  aspect-ratio: 1;
  min-height: 0;
  padding: 6px;
  border-radius: 15px;
  font-size: clamp(24px, 6vw, 35px);
  font-weight: 650;
  background: #fffdfa;
  color: #7b776b;
  box-shadow:
    0 3px 0 #d3cfc3,
    0 5px 8px #514a3d08;
  opacity: 1;
}
.puzzle-board button.in-place {
  color: #33765c;
  background: #e1eddd;
}
.puzzle-board button.can-move {
  background: #faf0d5;
  color: #7b643c;
  cursor: pointer;
}
.puzzle-board button.can-move:hover {
  background: #f4dfaa;
}
.puzzle-board button span {
  font-size: 12px;
  line-height: 10px;
  opacity: 0.45;
}
.puzzle-board button.puzzle-empty {
  background: transparent;
  box-shadow: none;
}
.puzzle-tile-move {
  transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.3, 1);
}
</style>
