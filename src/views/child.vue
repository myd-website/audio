<template>
  <van-notice-bar
    left-icon="volume-o"
    @click="showModal"
    v-if="connectVisible"
    :text="text"
  />
</template>

<script setup>
import { ref } from "vue";
import { showToast, showDialog } from "vant";

const text = ref("我是子组件");
const connectVisible = ref(true);

const showModal = () => {
  showDialog({
    title: "下载提示：浏览器打开进行下载",
    message: `我是弹窗内容`,
    allowHtml: true,
    theme: "round-button",
  }).then(() => {
    connectVisible.value = false;
    showToast("弹窗关闭了");
  });
};
</script>

<style lang="scss" scoped></style>
