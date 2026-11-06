<script setup lang="ts">
import SourceBadge from "@/shared/components/SourceBadge.vue";
</script>

<template>
  <section class="card learning-resources">
    <details>
      <summary>
        <span
          ><strong>免费资源与接口</strong
          ><small>课程与题库分开选，了解每种来源能提供什么</small></span
        ><van-icon name="arrow-down" />
      </summary>
      <div class="resource-grid">
        <article>
          <SourceBadge source="local" label="官方目录快照" />
          <h3>国家平台 · 同步课程</h3>
          <p>
            按课本查课名和章节，具体课程跳转官网学习；当前使用公开目录文件同步，尚未核实可供本站直接播放视频的开放接口
          </p>
          <router-link class="button" to="/study/courses"
            >查找课本课程 <van-icon name="arrow"
          /></router-link>
        </article>
        <article>
          <SourceBadge source="online" label="已接入练习" />
          <h3>接口盒子 · 小学数学题</h3>
          <p>
            免费随机应用题，含答案和解析，每次一道、不分年级；数学练习自动尝试获取，失败使用本地题
          </p>
          <a
            class="button"
            href="https://www.apihz.cn/api/zicishuxuex.html"
            target="_blank"
            rel="noopener noreferrer"
            >查看接口说明 <van-icon name="share-o"
          /></a>
        </article>
        <article>
          <SourceBadge source="online" label="可选拓展 · 未接入" />
          <h3>Open Trivia DB · 英文知识题</h3>
          <p>
            免费、无需密钥，可按分类和难度取题；题目为英文知识问答，不按国内小学年级划分，不作为同步课程或小学英语题库
          </p>
          <a
            class="button"
            href="https://opentdb.com/api_config.php"
            target="_blank"
            rel="noopener noreferrer"
            >查看接口说明 <van-icon name="share-o"
          /></a>
        </article>
      </div>
      <p class="resource-note">
        核验日期 2026-11-06 · 免费服务的频次和可用性以来源方为准 ·
        查看接口说明不会自动请求题库
      </p>
    </details>
  </section>
</template>

<style scoped>
.learning-resources {
  margin: 20px 0;
}
summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-height: 48px;
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
summary strong {
  display: block;
  font-size: 16px;
}
summary small {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}
summary > .van-icon {
  color: var(--green);
  transition: transform 0.2s;
}
details[open] summary > .van-icon {
  transform: rotate(180deg);
}
.resource-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}
.resource-grid article {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #f8f9f4;
}
.resource-grid h3 {
  font-size: 15px;
  margin: 12px 0 8px;
}
.resource-grid p {
  font-size: 12px;
  line-height: 1.9;
  color: var(--muted);
  margin-bottom: 16px;
}
.resource-grid .button {
  margin-top: auto;
  font-size: 12px;
}
.resource-note {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.8;
  margin-top: 16px;
}
@media (max-width: 760px) {
  .resource-grid {
    grid-template-columns: 1fr;
  }
}
</style>
