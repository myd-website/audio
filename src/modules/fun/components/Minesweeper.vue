<script setup lang="ts">
import { computed, ref } from "vue";
import {
  adjacentMines,
  createMinefield,
  revealMineCell,
  toggleMineFlag,
} from "../domain/minefield";
import GameCelebration from "./GameCelebration.vue";
const props = defineProps<{ active: boolean }>();
const game = ref(createMinefield(6, 6));
const flagMode = ref(false);
const ended = computed(
  () => game.value.phase === "won" || game.value.phase === "lost",
);
const flags = computed(() => game.value.flags.filter(Boolean).length);
const remaining = computed(
  () =>
    game.value.mines.length -
    game.value.mineCount -
    game.value.opened.filter(Boolean).length +
    (game.value.phase === "lost" ? 1 : 0),
);
function play(index: number) {
  if (!props.active || ended.value) return;
  game.value = flagMode.value
    ? toggleMineFlag(game.value, index)
    : revealMineCell(game.value, index);
}
function restart(size = game.value.size) {
  game.value = createMinefield(size, size === 6 ? 6 : 10);
  flagMode.value = false;
}
function cellLabel(index: number) {
  const state = game.value;
  const position = `第 ${Math.floor(index / state.size) + 1} 行第 ${(index % state.size) + 1} 列`;
  if (state.phase === "lost" && state.mines[index]) return `${position}，地雷`;
  if (state.opened[index])
    return `${position}，已翻开，周围 ${adjacentMines(state, index)} 颗雷`;
  return `${position}，${state.flags[index] ? "已标旗" : "未翻开"}，点击${flagMode.value ? "切换标旗" : "翻开"}`;
}
</script>
<template>
  <section class="game-card mine-game" aria-labelledby="mine-title">
    <header class="game-heading">
      <div>
        <p class="game-eyebrow">THINK BEFORE THE NEXT STEP</p>
        <h2 id="mine-title">轻松扫雷</h2>
        <p class="game-description">
          数字表示周围八格的雷数。翻开所有安全格就赢。
        </p>
      </div>
      <span class="game-stamp" aria-hidden="true">⚑</span>
    </header>
    <div class="game-segments" aria-label="扫雷难度">
      <button
        v-for="size in [6, 8]"
        :key="size"
        type="button"
        :class="{ selected: game.size === size }"
        :aria-pressed="game.size === size"
        @click="restart(size)"
      >
        {{ size }} × {{ size }} · {{ size === 6 ? "6 颗雷" : "10 颗雷" }}
      </button>
    </div>
    <div class="game-stats">
      <div>
        <small>地雷总数</small
        ><strong>{{ game.mineCount }}<span>颗</span></strong>
      </div>
      <div>
        <small>已经标旗</small><strong>{{ flags }}<span>面</span></strong>
      </div>
      <div>
        <small>待翻安全格</small><strong>{{ remaining }}<span>格</span></strong>
      </div>
    </div>
    <div class="game-segments" aria-label="扫雷操作">
      <button
        type="button"
        :class="{ selected: !flagMode }"
        :aria-pressed="!flagMode"
        @click="flagMode = false"
      >
        翻开格子</button
      ><button
        type="button"
        :class="{ selected: flagMode }"
        :aria-pressed="flagMode"
        @click="flagMode = true"
      >
        ⚑ 标旗 / 取消
      </button>
    </div>
    <div
      class="mine-board"
      :style="{ gridTemplateColumns: `repeat(${game.size}, minmax(0, 1fr))` }"
      role="group"
      aria-label="扫雷棋盘"
    >
      <button
        v-for="(_, index) in game.mines"
        :key="index"
        type="button"
        :class="{
          opened: game.opened[index],
          flagged: game.flags[index],
          mine: game.phase === 'lost' && game.mines[index],
          mistaken:
            game.phase === 'lost' && game.flags[index] && !game.mines[index],
        }"
        :style="{
          '--number-color': [
            '#7c8771',
            '#4775a2',
            '#4f885d',
            '#bb775c',
            '#8b70a6',
            '#987237',
            '#477b82',
            '#705b65',
            '#5f634c',
          ][adjacentMines(game, index)],
        }"
        :disabled="game.opened[index] || ended || !active"
        :aria-label="cellLabel(index)"
        @click="play(index)"
      >
        <span aria-hidden="true">{{
          game.phase === "lost" && game.mines[index]
            ? "✹"
            : game.phase === "lost" && game.flags[index] && !game.mines[index]
              ? "×"
              : game.flags[index]
                ? "⚑"
                : game.opened[index]
                  ? adjacentMines(game, index) || ""
                  : "·"
        }}</span>
      </button>
    </div>
    <p
      class="game-status"
      :class="{ success: game.phase === 'won' }"
      aria-live="polite"
    >
      {{
        game.phase === "won"
          ? "所有安全格都找到了，推理成功！"
          : game.phase === "lost"
            ? "碰到小地雷啦，休息一下再挑战。"
            : game.phase === "ready"
              ? "第一下和周围一圈都安全，放心开始。"
              : flagMode
                ? `标旗模式：点击格子放置或取消旗帜，最多 ${game.mineCount} 面。`
                : "根据数字推理；不确定时切到标旗模式。"
      }}
    </p>
    <div class="game-actions">
      <button type="button" class="game-primary" @click="restart()">
        <van-icon name="replay" />重新布一局</button
      ><span class="game-footnote">手机点上方按钮切换标旗，无需长按或右键</span>
    </div>
    <GameCelebration :active="game.phase === 'won' && active" />
  </section>
</template>
<style scoped>
.mine-board {
  display: grid;
  gap: 5px;
  width: min(100%, 400px);
  padding: 10px;
  margin: 24px auto;
  border-radius: 18px;
  background: #dce6dc;
}
.mine-board button {
  aspect-ratio: 1;
  min-height: 0;
  min-width: 0;
  padding: 0;
  border-radius: 7px;
  background: #f5f4e8;
  box-shadow: 0 3px 0 #bdcdbb;
  font-size: clamp(14px, 4vw, 22px);
  font-weight: 700;
  color: #9ca58e;
  opacity: 1;
}
.mine-board button.opened {
  background: #e8ede4;
  box-shadow: none;
  color: var(--number-color);
}
.mine-board button.flagged {
  color: #ae7745;
  background: #fcf0d2;
}
.mine-board button.mine {
  background: #f2d6ca;
  color: #ad5f49;
  box-shadow: none;
}
.mine-board button.mistaken {
  color: #b05b48;
}
.mine-board button:not(:disabled):active {
  transform: translateY(2px);
  box-shadow: none;
}
@media (max-width: 380px) {
  .mine-board {
    gap: 3px;
    padding: 7px;
  }
  .mine-board button {
    border-radius: 5px;
  }
}
</style>
