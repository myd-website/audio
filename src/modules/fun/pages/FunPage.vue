<script setup lang="ts">
defineOptions({ name: "FunPage" });
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { showConfirmDialog, showToast } from "vant";
import { useWorkspaceStore } from "@/shared/stores/workspace";
import { uid } from "@/shared/lib/workspace";
import { randomInt, shuffle } from "@/shared/lib/random";
import { act } from "@/shared/lib/feedback";
import { useFocusStore } from "../stores/focus";
import RandomTools from "../components/RandomTools.vue";
import SlidingPuzzle from "../components/SlidingPuzzle.vue";
import Game2048 from "../components/Game2048.vue";
import GuessNumber from "../components/GuessNumber.vue";
import TicTacToe from "../components/TicTacToe.vue";
import Minesweeper from "../components/Minesweeper.vue";
import LightsPuzzle from "../components/LightsPuzzle.vue";
import ColorFlood from "../components/ColorFlood.vue";
import BubblePop from "../components/BubblePop.vue";
import GameCelebration from "../components/GameCelebration.vue";
const route = useRoute();
const workspace = useWorkspaceStore();
const focus = useFocusStore();
const tools = [
  {
    id: "wheel",
    name: "幸运转盘",
    symbol: "✦",
    caption: "把选择交给运气",
    tone: "sage",
  },
  {
    id: "dice",
    name: "随机小工具",
    symbol: "⚄",
    caption: "摇一点小惊喜",
    tone: "peach",
  },
  {
    id: "puzzle",
    name: "数字华容道",
    symbol: "▦",
    caption: "让数字各就各位",
    tone: "sand",
  },
  {
    id: "2048",
    name: "2048",
    symbol: "2ⁿ",
    caption: "碰一碰，再加倍",
    tone: "peach",
  },
  {
    id: "guess",
    name: "猜数字",
    symbol: "?",
    caption: "跟着直觉找答案",
    tone: "sage",
  },
  {
    id: "tic-tac-toe",
    name: "井字棋",
    symbol: "○×",
    caption: "一起圈圈叉叉",
    tone: "lilac",
  },
  {
    id: "memory",
    name: "记忆翻牌",
    symbol: "◇",
    caption: "记住每一次相遇",
    tone: "lilac",
  },
  {
    id: "mines",
    name: "轻松扫雷",
    symbol: "⚑",
    caption: "给每一步一点推理",
    tone: "sage",
  },
  {
    id: "lights",
    name: "翻灯谜阵",
    symbol: "☼",
    caption: "换个角度，点亮思路",
    tone: "sand",
  },
  {
    id: "flood",
    name: "色彩漫游",
    symbol: "◈",
    caption: "让喜欢的颜色长大",
    tone: "peach",
  },
  {
    id: "bubbles",
    name: "泡泡消消乐",
    symbol: "◌",
    caption: "啪一下，烦恼少一点",
    tone: "lilac",
  },
  {
    id: "focus",
    name: "专注时光",
    symbol: "◷",
    caption: "留一刻给自己",
    tone: "sand",
  },
];
const tool = ref("wheel");
watch(
  () => route.query.tool,
  (value) => {
    tool.value =
      typeof value === "string" && tools.some((item) => item.id === value)
        ? value
        : "wheel";
  },
  { immediate: true },
);
const optionsText = ref(
  "读一本书\n听一首歌\n出门走走\n画一幅画\n整理书桌\n休息一会",
);
const templateName = ref("");
const result = ref("");
const spinning = ref(false);
const rotation = ref(0);
const history = ref<string[]>([]);
let spinTimer: number | undefined;
const options = computed(() =>
  optionsText.value
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean),
);
const colors = [
  "#d3e4c5",
  "#f4dfa9",
  "#e3d9ee",
  "#edc4ad",
  "#bddbd1",
  "#ede5c8",
];
const gradient = computed(
  () =>
    `conic-gradient(${options.value.map((_, i) => `${colors[i % colors.length]} ${(i / options.value.length) * 100}% ${((i + 1) / options.value.length) * 100}%`).join(",")})`,
);
function spin() {
  if (spinning.value) return;
  if (
    options.value.length < 2 ||
    options.value.length > 12 ||
    options.value.some((o) => o.length > 40)
  ) {
    showToast("请输入 2～12 个选项，每个选项不超过 40 字。");
    return;
  }
  const chosen = randomInt(options.value.length);
  const value = options.value[chosen];
  const angle = 360 - ((chosen + 0.5) * 360) / options.value.length;
  rotation.value += 360 * 5 + ((angle - (rotation.value % 360) + 360) % 360);
  spinning.value = true;
  result.value = "";
  spinTimer = window.setTimeout(
    () => {
      result.value = value;
      history.value.unshift(value);
      history.value = history.value.slice(0, 8);
      spinning.value = false;
    },
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 50 : 3100,
  );
}
function saveTemplate() {
  if (!templateName.value.trim()) {
    showToast("请先给模板起个名字。");
    return;
  }
  if (
    options.value.length < 2 ||
    options.value.length > 12 ||
    options.value.some((option) => option.length > 40)
  ) {
    showToast("模板需要 2～12 个选项，每个选项不超过 40 字。");
    return;
  }
  if (
    act(() =>
      workspace.commit((next) => {
        next.templates.push({
          id: uid(),
          name: templateName.value.trim(),
          options: [...options.value],
        });
      }),
    )
  )
    showToast("模板已保存");
}
async function removeTemplate(id: string) {
  const yes = await showConfirmDialog({ title: "删除这个模板？" }).then(
    () => true,
    () => false,
  );
  if (yes)
    act(() =>
      workspace.commit((next) => {
        next.templates = next.templates.filter((t) => t.id !== id);
      }),
    );
}
watch(optionsText, () => {
  clearTimeout(spinTimer);
  spinning.value = false;
  result.value = "";
  rotation.value = 0;
});
const faces = ["☀", "✿", "♫", "★", "☂", "☾"];
const cards = ref(shuffle([...faces, ...faces]));
const flipped = ref<number[]>([]);
const matched = ref<number[]>([]);
const turns = ref(0);
const locked = ref(false);
const memoryRound = ref(0);
let flipTimer: number | undefined;
function flip(index: number) {
  if (
    locked.value ||
    flipped.value.includes(index) ||
    matched.value.includes(index)
  )
    return;
  flipped.value.push(index);
  if (flipped.value.length === 2) {
    turns.value++;
    const [a, b] = flipped.value;
    if (cards.value[a] === cards.value[b]) {
      matched.value.push(a, b);
      flipped.value = [];
    } else {
      locked.value = true;
      flipTimer = window.setTimeout(() => {
        flipped.value = [];
        locked.value = false;
      }, 800);
    }
  }
}
function restart() {
  clearTimeout(flipTimer);
  cards.value = shuffle([...faces, ...faces]);
  flipped.value = [];
  matched.value = [];
  turns.value = 0;
  locked.value = false;
  memoryRound.value++;
}
watch(tool, (_, previous) => {
  if (previous === "wheel" && spinning.value) {
    clearTimeout(spinTimer);
    spinning.value = false;
    rotation.value = 0;
  }
  if (previous === "memory" && locked.value) {
    clearTimeout(flipTimer);
    flipped.value = [];
    locked.value = false;
  }
});
const focusProgress = computed(() =>
  Math.min(
    360,
    Math.max(0, (1 - focus.remaining / (focus.minutes * 60000)) * 360),
  ),
);
const focusTime = computed(() => {
  const sec = Math.ceil(focus.remaining / 1000);
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
});
async function resetFocus(minutes = focus.minutes) {
  if (focus.state === "running" || focus.state === "paused") {
    const yes = await showConfirmDialog({
      title: "重新开始专注？",
      message: "当前倒计时将被重置。",
    }).then(
      () => true,
      () => false,
    );
    if (!yes) return;
  }
  focus.reset(minutes);
}
onBeforeUnmount(() => {
  clearTimeout(spinTimer);
  clearTimeout(flipTimer);
});
</script>
<template>
  <div class="fun-page">
    <header class="fun-hero">
      <div class="hero-copy">
        <p class="game-eyebrow">
          <span class="hero-dot" /> LITTLE BREAK, BIG SMILE
        </p>
        <h1>今天，玩点<span>开心的。</span></h1>
        <p>把忙碌暂停一下，让小小的快乐发生。</p>
        <span class="hero-note">{{ tools.length }} 种小乐趣 · 随时来一局</span>
      </div>
      <div class="hero-art" aria-hidden="true">
        <span class="art-orbit" /><span class="art-spark spark-one">✦</span
        ><span class="art-tile art-tile-back">8</span
        ><span class="art-tile art-tile-front">16<small>JUST PLAY</small></span
        ><span class="art-spark spark-two">✳</span><span class="art-dot" />
      </div>
    </header>
    <nav class="game-picker" aria-label="娱乐模式">
      <button
        v-for="(item, index) in tools"
        :key="item.id"
        type="button"
        :class="[
          'game-choice',
          `tone-${item.tone}`,
          { selected: tool === item.id },
        ]"
        :aria-pressed="tool === item.id"
        @click="tool = item.id"
      >
        <span class="choice-symbol" aria-hidden="true">{{ item.symbol }}</span
        ><span class="choice-copy"
          ><strong>{{ item.name }}</strong
          ><small>{{ item.caption }}</small></span
        ><span class="choice-number" aria-hidden="true">{{
          String(index + 1).padStart(2, "0")
        }}</span>
      </button>
    </nav>
    <div class="game-stage">
      <Transition name="game-panel"
        ><div v-if="tool === 'wheel'" class="wheel-layout">
          <section
            class="game-card wheel-section"
            aria-labelledby="wheel-title"
          >
            <header class="game-heading">
              <div>
                <p class="game-eyebrow">LET CHANCE DECIDE</p>
                <h2 id="wheel-title">下一件开心的小事</h2>
                <p class="game-description">犹豫的时候，让一点运气推你一把。</p>
              </div>
              <span class="game-stamp">✦</span>
            </header>
            <div class="wheel-wrap">
              <span class="wheel-pointer" aria-hidden="true" />
              <div class="wheel-rim">
                <div
                  class="wheel"
                  :class="{ spinning }"
                  :style="{
                    background: options.length ? gradient : '#e8edde',
                    transform: `rotate(${rotation}deg)`,
                  }"
                  aria-hidden="true"
                >
                  <span
                    v-for="(option, index) in options.slice(0, 12)"
                    :key="index"
                    :style="{
                      transform: `rotate(${((index + 0.5) * 360) / options.length}deg) translateY(calc(var(--wheel-size) * -.33))`,
                    }"
                    >{{ option.slice(0, 6) }}</span
                  >
                </div>
              </div>
              <span class="wheel-hub" aria-hidden="true">✦</span>
            </div>
            <button
              type="button"
              class="game-primary"
              :disabled="spinning"
              @click="spin"
            >
              <van-icon name="replay" />{{
                spinning ? "好运转动中…" : "帮我选一个"
              }}
            </button>
            <div class="wheel-answer">
              <Transition name="answer-pop" mode="out-in"
                ><p
                  :key="result"
                  class="game-status"
                  :class="{ success: result }"
                  aria-live="polite"
                >
                  {{
                    result ||
                    (spinning
                      ? "你的下一件小事，马上揭晓。"
                      : "每个选项，机会都一样。")
                  }}
                </p></Transition
              >
            </div>
            <p class="game-footnote">个人娱乐选择工具，无真实奖品或中奖动态</p>
            <GameCelebration :active="Boolean(result)" />
          </section>
          <section class="game-card wheel-settings">
            <p class="game-eyebrow">MAKE IT YOURS</p>
            <h2>装进你的灵感</h2>
            <p class="game-description">想吃的、想做的，都可以放进转盘。</p>
            <label
              >每行一个选项 <small>2～12 项，每项最多 40 字</small
              ><textarea
                v-model="optionsText"
                :disabled="spinning"
                rows="6"
                maxlength="500"
              />
            </label>
            <label
              >给这份选择起个名字<input
                v-model="templateName"
                maxlength="30"
                placeholder="例如：周末的小计划"
                :disabled="spinning" /></label
            ><button type="button" :disabled="spinning" @click="saveTemplate">
              <van-icon name="bookmark-o" />保存为常用模板
            </button>
            <div v-if="workspace.data.templates.length" class="saved-templates">
              <h3>我的模板</h3>
              <div
                v-for="template in workspace.data.templates"
                :key="template.id"
                class="template-row"
              >
                <button
                  type="button"
                  :disabled="spinning"
                  @click="
                    optionsText = template.options.join('\n');
                    templateName = template.name;
                  "
                >
                  <van-icon name="label-o" />{{ template.name }}</button
                ><button
                  type="button"
                  class="remove-template"
                  :aria-label="`删除模板 ${template.name}`"
                  @click="removeTemplate(template.id)"
                >
                  <van-icon name="cross" />
                </button>
              </div>
            </div>
            <div v-if="history.length" class="spin-history">
              <h3>刚刚的小决定</h3>
              <ol>
                <li v-for="(item, index) in history" :key="index">
                  <span>{{
                    String(history.length - index).padStart(2, "0")
                  }}</span
                  >{{ item }}
                </li>
              </ol>
            </div>
          </section>
        </div></Transition
      >
      <Transition name="game-panel"
        ><RandomTools v-show="tool === 'dice'" :active="tool === 'dice'"
      /></Transition>
      <Transition name="game-panel"
        ><SlidingPuzzle v-show="tool === 'puzzle'" :active="tool === 'puzzle'"
      /></Transition>
      <Transition name="game-panel"
        ><Game2048 v-show="tool === '2048'" :active="tool === '2048'"
      /></Transition>
      <Transition name="game-panel"
        ><GuessNumber v-show="tool === 'guess'"
      /></Transition>
      <Transition name="game-panel"
        ><TicTacToe
          v-show="tool === 'tic-tac-toe'"
          :active="tool === 'tic-tac-toe'"
      /></Transition>
      <Transition name="game-panel"
        ><Minesweeper v-show="tool === 'mines'" :active="tool === 'mines'"
      /></Transition>
      <Transition name="game-panel"
        ><LightsPuzzle v-show="tool === 'lights'" :active="tool === 'lights'"
      /></Transition>
      <Transition name="game-panel"
        ><ColorFlood v-show="tool === 'flood'" :active="tool === 'flood'"
      /></Transition>
      <Transition name="game-panel"
        ><BubblePop v-show="tool === 'bubbles'" :active="tool === 'bubbles'"
      /></Transition>
      <Transition name="game-panel"
        ><section
          v-if="tool === 'memory'"
          class="game-card memory-section"
          aria-labelledby="memory-title"
        >
          <header class="game-heading">
            <div>
              <p class="game-eyebrow">REMEMBER THE LITTLE THINGS</p>
              <h2 id="memory-title">每一次翻开，都是相遇</h2>
              <p class="game-description">
                找出相同的图案，看看你的记忆小宇宙。
              </p>
            </div>
            <span class="game-stamp">◇</span>
          </header>
          <div class="game-stats">
            <div>
              <small>已经翻了</small><strong>{{ turns }}<span>次</span></strong>
            </div>
            <div>
              <small>找到伙伴</small
              ><strong>{{ matched.length / 2 }}<span>/ 6 对</span></strong>
            </div>
            <div>
              <small>完成进度</small
              ><strong
                >{{ Math.round((matched.length / 12) * 100)
                }}<span>%</span></strong
              >
            </div>
          </div>
          <div class="memory-grid">
            <button
              v-for="(card, index) in cards"
              :key="`${memoryRound}-${index}`"
              type="button"
              :class="{
                revealed: flipped.includes(index) || matched.includes(index),
                matched: matched.includes(index),
              }"
              :disabled="
                matched.includes(index) || locked || flipped.includes(index)
              "
              :aria-label="
                flipped.includes(index) || matched.includes(index)
                  ? `图案 ${card}${matched.includes(index) ? '，已配对' : ''}`
                  : `翻开第 ${index + 1} 张`
              "
              :aria-pressed="flipped.includes(index) || matched.includes(index)"
              @click="flip(index)"
            >
              <span class="memory-inner" aria-hidden="true"
                ><span class="memory-back">✦<small>LITTLE JOY</small></span
                ><span class="memory-front"
                  >{{ card }}<i v-if="matched.includes(index)">✓</i></span
                ></span
              >
            </button>
          </div>
          <p
            class="game-status"
            :class="{ success: matched.length === 12 }"
            aria-live="polite"
          >
            {{
              matched.length === 12
                ? `全部找到了！用了 ${turns} 次，记忆力不错。`
                : "轻轻翻开两张卡片，找找它们的另一半。"
            }}
          </p>
          <div class="game-actions">
            <button type="button" class="game-primary" @click="restart">
              <van-icon name="replay" />重新洗牌</button
            ><span class="game-footnote">不用着急，慢慢记住就好</span>
          </div>
          <GameCelebration :active="matched.length === 12" /></section
      ></Transition>
      <Transition name="game-panel"
        ><section
          v-if="tool === 'focus'"
          class="game-card focus-card"
          aria-labelledby="focus-title"
        >
          <header class="game-heading">
            <div>
              <p class="game-eyebrow">ONE THING AT A TIME</p>
              <h2 id="focus-title">这一刻，只做一件事</h2>
              <p class="game-description">
                给自己一小段安静，让注意力慢慢回来。
              </p>
            </div>
            <span class="game-stamp">◷</span>
          </header>
          <div
            class="focus-face"
            :class="{
              running: focus.state === 'running',
              done: focus.state === 'done',
            }"
            :style="{ '--progress': `${focusProgress}deg` }"
          >
            <div class="focus-face-inner">
              <van-icon
                :name="focus.state === 'done' ? 'passed' : 'flower-o'"
              /><span role="timer" aria-label="专注剩余时间">{{
                focusTime
              }}</span
              ><small>{{
                focus.state === "running"
                  ? "把这一刻，留给手头的小事"
                  : focus.state === "paused"
                    ? "休息一下，随时继续"
                    : focus.state === "done"
                      ? "辛苦啦，给自己一个小奖励"
                      : "深呼吸，准备开始"
              }}</small>
            </div>
          </div>
          <div class="game-segments focus-presets" aria-label="专注时长">
            <button
              v-for="minutes in [5, 10, 25, 45]"
              :key="minutes"
              type="button"
              :class="{ selected: focus.minutes === minutes }"
              :aria-pressed="focus.minutes === minutes"
              @click="resetFocus(minutes)"
            >
              {{ minutes }} 分钟
            </button>
          </div>
          <div class="game-actions">
            <button
              v-if="focus.state === 'running'"
              type="button"
              class="game-primary"
              @click="focus.pause"
            >
              <van-icon name="pause" />暂停一下</button
            ><button
              v-else
              type="button"
              class="game-primary"
              @click="focus.start"
            >
              <van-icon name="play" />{{
                focus.state === "paused" ? "继续专注" : "开始专注"
              }}</button
            ><button type="button" @click="resetFocus()">
              <van-icon name="replay" />重新开始
            </button>
          </div>
          <p class="game-footnote focus-note">
            离开这个页面，倒计时仍会继续；关闭网站后不会提醒。
          </p>
          <GameCelebration :active="focus.state === 'done'" /></section
      ></Transition>
    </div>
    <footer class="fun-footer">
      <span aria-hidden="true">✳</span> 开心不必很大，一小会儿就好
    </footer>
  </div>
</template>
<style src="../styles/fun.css"></style>
