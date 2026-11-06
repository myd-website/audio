<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { DictionaryEntry } from "../services/dictionary";

const props = defineProps<{ entry: DictionaryEntry }>();
const failedImages = ref<string[]>([]);
const imageUrl = computed(() =>
  [props.entry.strokeAnimation, props.entry.characterImage].find(
    (url) => url && !failedImages.value.includes(url),
  ),
);
const hasImages = computed(() =>
  Boolean(props.entry.strokeAnimation || props.entry.characterImage),
);
const animated = computed(() =>
  Boolean(imageUrl.value && imageUrl.value === props.entry.strokeAnimation),
);
const facts = computed(() =>
  [
    { label: "部首", value: props.entry.radical },
    { label: "笔画", value: props.entry.strokes },
    { label: "结构", value: props.entry.structure },
  ].filter((fact) => fact.value),
);
const wordGroups = computed(() =>
  [
    { label: "近义词", words: props.entry.synonyms },
    { label: "反义词", words: props.entry.antonyms },
  ].filter((group) => group.words?.length),
);
const hasDetails = computed(() =>
  Boolean(
    hasImages.value ||
    facts.value.length ||
    wordGroups.value.length ||
    props.entry.extraInfo ||
    props.entry.encyclopedia,
  ),
);
watch(
  () => [
    props.entry.term,
    props.entry.strokeAnimation,
    props.entry.characterImage,
  ],
  () => {
    failedImages.value = [];
  },
);
function imageError(event: Event) {
  const target = event.target as HTMLImageElement;
  const failedUrl = target.currentSrc || target.src;
  // 只处理当前图片的失败事件，避免旧图片的迟到事件影响新词条。
  if (failedUrl === imageUrl.value) failedImages.value.push(failedUrl);
}
</script>

<template>
  <section
    v-if="hasDetails"
    class="card character-details"
    aria-label="字形与书写"
  >
    <h2>字形与书写</h2>
    <div class="character-layout" :class="{ 'with-image': hasImages }">
      <figure v-if="hasImages" class="writing-preview">
        <div class="writing-frame">
          <img
            v-if="imageUrl"
            :key="imageUrl"
            :src="imageUrl"
            :alt="entry.term + (animated ? '字的笔顺动图' : '字的字形图片')"
            width="240"
            height="240"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            @error="imageError"
          />
          <div v-else class="writing-unavailable" role="status">
            <p>书写图片暂时无法加载</p>
            <button type="button" @click="failedImages = []">重新加载</button>
          </div>
        </div>
        <figcaption class="muted">
          {{
            imageUrl
              ? animated
                ? "笔顺动图"
                : "字形图片"
              : "图片加载失败，不影响释义查询"
          }}
        </figcaption>
        <p
          v-if="imageUrl && !animated && entry.strokeAnimation"
          class="muted image-notice"
          role="status"
        >
          动图暂不可用，已显示静态图。
        </p>
      </figure>
      <div class="character-info">
        <dl v-if="facts.length" class="character-facts">
          <div v-for="fact in facts" :key="fact.label">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>
        <div v-for="group in wordGroups" :key="group.label" class="word-group">
          <h3>{{ group.label }}</h3>
          <div class="word-tags">
            <span v-for="word in group.words" :key="word">{{ word }}</span>
          </div>
        </div>
        <details v-if="entry.extraInfo" class="extra-info">
          <summary>更多字义</summary>
          <p>{{ entry.extraInfo }}</p>
        </details>
        <a
          v-if="entry.encyclopedia"
          class="encyclopedia-link"
          :href="entry.encyclopedia"
          target="_blank"
          rel="noopener noreferrer"
          referrerpolicy="no-referrer"
          >查看百科 <van-icon name="share-o"
        /></a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.character-details {
  margin: 16px 0;
}
.character-layout {
  display: grid;
  gap: 20px;
  margin-top: 16px;
  align-items: start;
}
.character-layout.with-image {
  grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
}
.writing-preview {
  margin: 0;
  min-width: 0;
  width: 100%;
  max-width: 240px;
  text-align: center;
}
.writing-frame {
  aspect-ratio: 1;
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  background: white;
}
.writing-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.writing-unavailable {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  color: var(--muted);
  font-size: 13px;
}
.writing-preview figcaption {
  margin-top: 8px;
}
.image-notice {
  margin-top: 6px;
  line-height: 1.6;
}
.character-info {
  display: grid;
  min-width: 0;
  gap: 18px;
}
.character-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 12px;
  margin: 0;
}
.character-facts dt,
.word-group h3 {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 400;
}
.character-facts dd {
  margin: 0;
  font-size: 16px;
  overflow-wrap: anywhere;
}
.word-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.word-tags span {
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--pale);
  font-size: 14px;
  overflow-wrap: anywhere;
  max-width: 100%;
}
.extra-info {
  border-top: 1px solid var(--line);
  padding-top: 8px;
}
.extra-info summary {
  cursor: pointer;
  padding: 8px 0;
  font-size: 14px;
}
.extra-info p {
  margin: 8px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.9;
  font-size: 14px;
}
.encyclopedia-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  min-height: 44px;
  color: var(--green);
  font-size: 14px;
}
@media (max-width: 600px) {
  .character-layout.with-image {
    grid-template-columns: minmax(0, 1fr);
  }
  .writing-preview {
    justify-self: center;
    max-width: 220px;
  }
}
</style>
