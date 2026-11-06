<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  dictionaryQuery,
  isDictionaryKind,
  lookupDictionary,
  supportsOnline,
} from "../services/dictionary";
import type {
  DictionaryEntry,
  DictionaryKind,
  DictionarySource,
} from "../services/dictionary";
import { message } from "@/shared/lib/feedback";
import { usePlayerStore } from "@/modules/music/stores/player";
import DictionaryCharacterDetails from "../components/DictionaryCharacterDetails.vue";
import SourceBadge from "@/shared/components/SourceBadge.vue";
const route = useRoute(),
  router = useRouter(),
  player = usePlayerStore();
const options = [
  {
    id: "character",
    name: "汉语字典",
    hint: "输入一个汉字，如：学",
    samples: ["学", "语", "数", "乐"],
  },
  {
    id: "word",
    name: "汉语词典",
    hint: "输入词语，如：学习、快乐",
    samples: ["学习", "快乐", "朋友", "春天"],
  },
  {
    id: "idiom",
    name: "成语大全",
    hint: "输入成语或开头，如：画蛇添足、一心",
    samples: ["画蛇添足", "守株待兔", "一心", "春"],
  },
  {
    id: "english",
    name: "英汉词典",
    hint: "输入英文单词，如：apple",
    samples: ["apple", "school", "friend", "happy"],
  },
] as const;
const kind = computed<DictionaryKind>(() =>
  isDictionaryKind(route.query.kind) ? route.query.kind : "character",
);
const selected = computed(
  () => options.find((option) => option.id === kind.value)!,
);
const keyword = ref(""),
  submitted = ref(""),
  error = ref(""),
  notice = ref("");
const entries = ref<DictionaryEntry[]>([]),
  exact = ref(0),
  visible = ref(20);
const busy = ref(false),
  audioFailed = ref(false);
const source = ref<DictionarySource>(),
  stage = ref<DictionarySource>("online");
let controller: AbortController | undefined,
  audio: HTMLAudioElement | undefined;
let sequence = 0;
function cancel() {
  sequence++;
  controller?.abort();
  audio?.pause();
  busy.value = false;
}
function reset() {
  cancel();
  entries.value = [];
  exact.value = 0;
  visible.value = 20;
  submitted.value = "";
  error.value = "";
  notice.value = "";
  source.value = undefined;
  audioFailed.value = false;
}
watch(kind, () => {
  reset();
  keyword.value = "";
});
async function search(value = keyword.value, onlineFirst = false) {
  reset();
  keyword.value = value;
  const token = sequence;
  controller = new AbortController();
  try {
    submitted.value = dictionaryQuery(kind.value, value);
    busy.value = true;
    const useOnline = kind.value === "character" || onlineFirst;
    stage.value = useOnline && supportsOnline(kind.value) ? "online" : "local";
    const result = await lookupDictionary(
      kind.value,
      value,
      controller.signal,
      (next) => {
        if (token === sequence) stage.value = next;
      },
      { onlineFirst: useOnline },
    );
    if (token !== sequence) return;
    entries.value = result.entries;
    exact.value = result.exact;
    source.value = result.source;
    notice.value = result.notice;
  } catch (cause) {
    if (token === sequence) error.value = message(cause);
  } finally {
    if (token === sequence) busy.value = false;
  }
}
function pronunciation(event: Event) {
  const target = event.target as HTMLAudioElement;
  if (audio && audio !== target) audio.pause();
  audio = target;
  player.pause();
}
const formsLabels: Record<string, string> = {
  p: "过去式",
  d: "过去分词",
  i: "现在分词",
  "3": "第三人称单数",
  r: "比较级",
  t: "最高级",
  s: "复数",
  "0": "原形",
  "1": "变形类别",
};
function forms(value: string) {
  return value
    .split("/")
    .map((part) => {
      const [key, text] = part.split(":");
      return key && text ? `${formsLabels[key] || key}：${text}` : "";
    })
    .filter(Boolean)
    .join(" · ");
}
onBeforeUnmount(cancel);
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">LOOK IT UP, LEARN A LITTLE</p>
      <h1>随手查字词</h1>
      <p class="muted">遇到不懂的字词，就在这里查一查</p>
    </div>
    <router-link class="button" to="/study">返回学习</router-link>
  </div>
  <nav class="dictionary-tabs" aria-label="词典类型">
    <button
      v-for="option in options"
      :key="option.id"
      :class="{ selected: kind === option.id }"
      :aria-pressed="kind === option.id"
      @click="
        router.replace({
          path: '/study/dictionary',
          query: { kind: option.id },
        })
      "
    >
      {{ option.name }}
    </button>
  </nav>
  <section class="card stack">
    <div class="dictionary-title">
      <h2>{{ selected.name }}</h2>
      <SourceBadge
        :source="kind === 'character' ? 'online' : 'local'"
        :label="kind === 'character' ? '优先查询' : '默认词库'"
      />
    </div>
    <form
      class="dictionary-search"
      @submit.prevent="search()"
      @keydown.enter="if ($event.isComposing) $event.preventDefault();"
    >
      <input
        v-model="keyword"
        :placeholder="selected.hint"
        :aria-label="selected.name + '查询内容'"
        :maxlength="kind === 'english' ? 80 : kind === 'character' ? 2 : 40"
        type="search"
        enterkeyhint="search"
        autocomplete="off"
      />
      <button class="primary" type="submit" :disabled="busy">
        {{ busy ? "查询中…" : "查询" }}
      </button>
    </form>
    <div class="row-actions samples">
      <span class="muted">试一试</span
      ><button
        v-for="sample in selected.samples"
        :key="sample"
        @click="search(sample)"
      >
        {{ sample }}
      </button>
    </div>
    <p class="muted">
      {{
        kind === "english"
          ? "默认显示中文释义、音标和词形变化，可展开英文释义；需要听发音时，可切换到在线英文查询"
          : kind === "character"
            ? "优先在线查询拼音、释义与发音，有笔顺动图和字形资料时一并展示，失败时自动查询本地词库"
            : "当前使用本地词库，支持完整词条和开头匹配，完整匹配优先显示"
      }}
    </p>
  </section>
  <p v-if="busy" class="empty" role="status">
    {{ stage === "online" ? "正在查询在线词典…" : "正在查询本地词库…" }}
  </p>
  <div v-if="error" class="error lookup-message" role="alert">
    {{ error }} <button @click="search()">重试</button>
  </div>
  <section
    v-if="submitted && !busy && !error"
    class="lookup-message"
    aria-live="polite"
  >
    <div class="section-head">
      <h2>“{{ submitted }}”的查询结果</h2>
      <SourceBadge
        v-if="source"
        :source="source"
        :label="
          kind === 'english'
            ? source === 'online'
              ? '英文释义'
              : '英汉词库'
            : '查询结果'
        "
      />
      <span class="muted"
        >{{ exact }} 条精确匹配 · {{ entries.length }} 条结果</span
      >
    </div>
    <p v-if="notice" class="muted" role="status">{{ notice }}</p>
    <div class="row-actions">
      <button
        v-if="source === 'local' && kind === 'character'"
        @click="search(submitted)"
      >
        重新在线查询</button
      ><button
        v-if="source === 'local' && kind === 'english'"
        @click="search(submitted, true)"
      >
        在线英文释义与发音</button
      ><button
        v-if="source === 'online' && kind === 'english'"
        @click="search(submitted)"
      >
        返回英汉释义
      </button>
    </div>
    <p v-if="!entries.length" class="card empty">
      本地词库中暂未找到，试试其他写法或用词语开头查找
    </p>
  </section>
  <DictionaryCharacterDetails
    v-if="kind === 'character' && entries.length"
    :key="submitted"
    :entry="entries[0]"
  />
  <p v-if="audioFailed" class="muted" role="status">
    发音暂时无法播放，仍可查看释义
  </p>
  <article
    v-for="(entry, index) in entries.slice(0, visible)"
    :key="entry.term + index"
    class="card dictionary-entry"
  >
    <div class="entry-heading">
      <h2>{{ entry.term }}</h2>
      <span class="badge">{{
        entry.term === submitted ? "精确匹配" : "相关词条"
      }}</span>
    </div>
    <div class="entry-source">
      <SourceBadge
        v-if="source"
        :source="source"
        :label="
          entry.sourceName || (kind === 'english' ? 'ECDICT' : 'chinese-xinhua')
        "
      />
    </div>
    <p v-if="entry.pronunciation" class="pronunciation">
      {{ entry.pronunciation }}
    </p>
    <audio
      v-if="entry.audio"
      :src="entry.audio"
      :aria-label="entry.term + ' ' + entry.pronunciation + ' 发音'"
      controls
      preload="none"
      @play="pronunciation"
      @error="audioFailed = true"
    />
    <p
      v-if="kind !== 'character' && (entry.radical || entry.strokes)"
      class="muted"
    >
      部首：{{ entry.radical || "—" }} · 笔画：{{ entry.strokes || "—" }}
    </p>
    <h3>
      {{
        kind === "english"
          ? source === "local"
            ? "中文释义"
            : "英文释义"
          : "释义"
      }}
    </h3>
    <p class="definition">{{ entry.definition }}</p>
    <details v-if="entry.english">
      <summary>英文释义</summary>
      <p class="definition">{{ entry.english }}</p>
    </details>
    <p v-if="entry.forms" class="muted">{{ forms(entry.forms) }}</p>
    <template v-if="entry.origin"
      ><h3>出处</h3>
      <p class="definition">{{ entry.origin }}</p></template
    >
    <template v-if="entry.example"
      ><h3>例句</h3>
      <p class="definition">{{ entry.example }}</p></template
    >
    <template v-if="entry.related?.length"
      ><h3>组词</h3>
      <p class="definition">{{ entry.related.join(" · ") }}</p></template
    >
    <div v-if="entry.source || entry.licenseUrl" class="row-actions muted">
      <a
        v-if="entry.source"
        :href="entry.source"
        target="_blank"
        rel="noopener noreferrer"
        >词条来源</a
      ><a
        v-if="entry.licenseUrl"
        :href="entry.licenseUrl"
        target="_blank"
        rel="noopener noreferrer"
        >{{ entry.license || "内容许可" }}</a
      >
    </div>
  </article>
  <button
    v-if="entries.length > visible"
    class="load-more"
    @click="visible += 20"
  >
    再显示 20 条（剩余 {{ entries.length - visible }} 条）
  </button>
  <div
    v-if="kind === 'english' && submitted && !busy"
    class="row-actions lookup-message"
  >
    <a
      class="button"
      :href="`https://www.youdao.com/result?word=${encodeURIComponent(submitted)}&lang=en`"
      target="_blank"
      rel="noopener noreferrer"
      >打开备用词典 <van-icon name="share-o"
    /></a>
  </div>
  <p class="muted attribution">
    本地词库：chinese-xinhua、ECDICT 与自编补充 · 在线查询：慕名 API、Free
    Dictionary API<br />
    社区内容可能存在缺项或错误，请结合教材核对
  </p>
</template>
<style scoped>
.page-heading {
  flex-wrap: wrap;
}
.dictionary-search {
  display: flex;
  gap: 10px;
}
.dictionary-search input {
  flex: 1;
  min-width: 0;
}
.dictionary-search button {
  flex-shrink: 0;
}
.samples button {
  min-height: 44px;
  padding: 6px 12px;
  font-size: 14px;
}
.lookup-message {
  margin: 22px 0;
}
.lookup-message .section-head {
  flex-wrap: wrap;
}
.lookup-message .row-actions {
  margin-top: 12px;
}
.dictionary-entry {
  margin: 16px 0;
}
.entry-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.dictionary-entry .entry-heading h2 {
  font-size: 30px;
  overflow-wrap: anywhere;
}
.pronunciation {
  color: var(--green);
  margin: 8px 0;
  font-size: 18px;
}
.definition {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.9;
  font-size: 16px;
}
.dictionary-entry h3 {
  margin: 20px 0 8px;
  font-size: 14px;
  color: var(--muted);
}
.dictionary-entry details {
  margin: 16px 0;
}
summary {
  cursor: pointer;
  padding: 10px 0;
}
.dictionary-entry audio {
  display: block;
  width: 100%;
  max-width: 400px;
  margin: 12px 0;
}
.load-more {
  width: 100%;
}
.attribution {
  margin: 28px 0;
  line-height: 1.9;
}
.dictionary-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--line);
  background: #edf0e7;
  border-radius: 16px;
  margin-bottom: 20px;
}
.aide-app .dictionary-tabs button {
  padding: 10px 6px;
  background: transparent;
  color: var(--muted);
  border-radius: 11px;
  font-size: 13px;
}
.aide-app .dictionary-tabs button.selected {
  background: var(--paper);
  color: var(--green);
  box-shadow: 0 2px 6px #2439340a;
  font-weight: 650;
}
.dictionary-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
}
.entry-source {
  margin-top: 10px;
}
@media (max-width: 360px) {
  .dictionary-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
