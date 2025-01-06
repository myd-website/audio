<template>
  <div class="home text-center">
    <p class="mg20 text-color">{{ time }}</p>
    <div class="upload-box">
      <p class="mg10">请上传音频文件：</p>
      <van-uploader
        v-model="files"
        :max-count="1"
        :before-read="beforeRead"
        :after-read="afterRead"
        :before-delete="beforeDelete"
        accept="audio/mp3"
      />
    </div>

    <!-- 显示上传的 mp3 文件信息 -->
    <div v-if="audioUrl" class="audio-resouse">
      <span>{{ aduioName }}</span>
      <audio :src="audioUrl" controls :autoplay="false" />
      <van-button type="success" @click="download">下载</van-button>
    </div>
  </div>
</template>

<script setup>
import dayjs from "dayjs";
import { ref, onMounted, onBeforeUnmount, watchEffect } from "vue";
import { showToast, showConfirmDialog } from "vant";

const time = ref("");
const timer = ref(null);
const audioUrl = ref("");
const aduioName = ref("");
const files = ref([]);

onMounted(() => {
  initTime();
});

const initTime = () => {
  time.value = dayjs().format("YYYY-MM-DD HH:mm:ss");
  timer.value = setInterval(() => {
    time.value = dayjs().format("YYYY-MM-DD HH:mm:ss");
  }, 1000);
};

const download = () => {
  showConfirmDialog({
    title: "下载提示",
    message: "确实要下载吗？下载后请前往文件目录查看！！！",
  })
    .then(() => {
      showToast("下载");
      const file = files.value[0];
      downloadPdf(file.file);
    })
    .catch(() => {
      showToast("取消下载");
    });
};

// 下载file文件
const downloadPdf = async (file) => {
  if (file) {
    const blob = new Blob([file]);
    const fileUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.setAttribute("download", file.name);
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(fileUrl);
    document.body.removeChild(link);
    return;
  }
};

const beforeRead = (file) => {
  console.log(file, "file上传中");
  file.status = "uploading";
  file.message = "上传中...";
  return true;
};

const afterRead = (file) => {
  console.log(file, "file上传成功");
  aduioName.value = file.file.name;

  // 这里我们直接将文件的临时链接赋值给 audioUrl
  audioUrl.value = URL.createObjectURL(file.file);
};

const beforeDelete = (file) => {
  console.log(file, "file上传成功");
  aduioName.value = "";
  audioUrl.value = "";
  files.value = [];
};

onBeforeUnmount(() => {
  clearInterval(timer);
});
</script>

<style>
.text-color {
  color: v-bind(color);
}
.upload-box {
  background: #ffac00;
  padding: 10px;
}
.audio-resouse {
  width: 100%;
  margin: 30px auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}
</style>
