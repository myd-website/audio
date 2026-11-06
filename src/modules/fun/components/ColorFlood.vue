<script setup lang="ts">
import { computed, ref } from "vue";
import {
  colorGroup,
  createColorBoard,
  floodColor,
  GAME_COLORS,
} from "../domain/colorGames";
import GameCelebration from "./GameCelebration.vue";
const props = defineProps<{ active: boolean }>();
const size = ref(6),
  board = ref(createColorBoard(6, 6, 5));
const moves = ref(0),
  history = ref<number[][]>([]);
const region = computed(() => new Set(colorGroup(board.value, size.value, 0)));
const won = computed(() => region.value.size === board.value.length);
function choose(color: number) {
  if (!props.active || won.value) return;
  const next = floodColor(board.value, size.value, color);
  if (next === board.value) return;
  history.value = [...history.value.slice(-99), board.value];
  board.value = next;
  moves.value++;
}
function undo() {
  if (!props.active || !history.value.length) return;
  board.value = history.value.pop()!;
  moves.value--;
}
function restart(nextSize = size.value) {
  size.value = nextSize;
  board.value = createColorBoard(nextSize, nextSize, 5);
  history.value = [];
  moves.value = 0;
}
</script>
<template>
  <section class="game-card flood-game" aria-labelledby="flood-title">
    <header class="game-heading">
      <div>
        <p class="game-eyebrow">LET A LITTLE COLOR GROW</p>
        <h2 id="flood-title">色彩漫游</h2>
        <p class="game-description">
          从左上角的小星星出发，换个颜色，吞并相邻同色区域。
        </p>
      </div>
      <span class="game-stamp" aria-hidden="true">◈</span>
    </header>
    <div class="game-segments" aria-label="漫游棋盘大小">
      <button
        v-for="value in [6, 8]"
        :key="value"
        type="button"
        :class="{ selected: size === value }"
        :aria-pressed="size === value"
        @click="restart(value)"
      >
        {{ value }} × {{ value }} ·
        {{ value === 6 ? "轻松漫游" : "大一点的世界" }}
      </button>
    </div>
    <div class="game-stats">
      <div>
        <small>换色次数</small><strong>{{ moves }}<span>次</span></strong>
      </div>
      <div>
        <small>已连接区域</small
        ><strong
          >{{ region.size }}<span>/ {{ board.length }}</span></strong
        >
      </div>
      <div>
        <small>完成进度</small
        ><strong
          >{{ Math.round((region.size / board.length) * 100)
          }}<span>%</span></strong
        >
      </div>
    </div>
    <div
      class="flood-board"
      :style="{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }"
      role="img"
      :aria-label="`色彩棋盘，左上角当前为${GAME_COLORS[board[0]].name}，已连接 ${region.size} 格，共 ${board.length} 格`"
    >
      <span
        v-for="(color, index) in board"
        :key="index"
        :style="{ background: GAME_COLORS[color].color }"
        :class="{ connected: region.has(index) }"
        aria-hidden="true"
        >{{ index === 0 ? "★" : GAME_COLORS[color].symbol }}</span
      >
    </div>
    <div class="flood-palette" role="group" aria-label="选择下一个颜色">
      <button
        v-for="(color, index) in GAME_COLORS"
        :key="color.name"
        type="button"
        :style="{ background: color.color }"
        :class="{ chosen: board[0] === index }"
        :disabled="won || board[0] === index || !active"
        :aria-label="`换成${color.name}`"
        :aria-pressed="board[0] === index"
        @click="choose(index)"
      >
        <span aria-hidden="true">{{ color.symbol }}</span
        ><small>{{ color.name }}</small>
      </button>
    </div>
    <p class="game-status" :class="{ success: won }" aria-live="polite">
      {{
        won
          ? `颜色连成一片！用了 ${moves} 次，给自己一个赞。`
          : "选下方颜色，让左上角的区域慢慢长大。不限步数。"
      }}
    </p>
    <div class="game-actions">
      <button type="button" class="game-primary" @click="restart()">
        <van-icon name="replay" />换一片颜色</button
      ><button type="button" :disabled="!history.length" @click="undo">
        撤销一步
      </button>
    </div>
    <GameCelebration :active="won && active" />
  </section>
</template>
<style scoped>
.flood-board {
  width: min(100%, 340px);
  display: grid;
  gap: 4px;
  margin: 28px auto 22px;
  padding: 10px;
  border-radius: 20px;
  background: #e9e5da;
}
.flood-board > span {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  min-width: 0;
  border-radius: 6px;
  color: #ffffff80;
  font-size: clamp(10px, 3vw, 17px);
  transition:
    background 0.25s,
    box-shadow 0.25s;
}
.flood-board > span.connected {
  color: #fffaf0;
  box-shadow: inset 0 0 0 2px #ffffff85;
}
.flood-palette {
  display: flex;
  justify-content: center;
  gap: 7px;
  max-width: 360px;
  margin: auto;
}
.flood-palette button {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
  padding: 8px 2px;
  color: white;
  border-radius: 12px;
  opacity: 1;
  border: 2px solid transparent;
}
.flood-palette button.chosen {
  border-color: #fff8de;
  box-shadow: 0 0 0 2px #627954;
}
.flood-palette button > span {
  font-size: 22px;
  line-height: 1.2;
}
.flood-palette small {
  font-size: 9px;
  white-space: nowrap;
}
</style>
