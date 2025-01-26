<template>
  <div class="home text-center">
    <van-notice-bar left-icon="volume-o" :text="`当前时间：${time}`" />
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

      <van-cell-group inset>
        <van-field
          v-model="beginTime"
          type="number"
          colon
          placeholder="请输入开始时间"
          label="开始时间/秒"
        />
        <van-field
          v-model="endTime"
          type="number"
          colon
          placeholder="请输入结束时间"
          label="结束时间/秒"
        />
      </van-cell-group>

      <van-button type="success" @click="playSegment(beginTime, endTime)"
        >截取片段</van-button
      >

      <p class="audition">
        试听：
        <audio :src="cutAudioUrl" controls autoplay="false"></audio>
      </p>

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
const cutAudioUrl = ref("");
const beginTime = ref(null);
const endTime = ref(null);
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffer = ref(null);
const audioPlayer = ref(null);

onMounted(() => {
  initTime();
});

// 初始化时间
const initTime = () => {
  time.value = dayjs().format("YYYY-MM-DD HH:mm:ss");
  timer.value = setInterval(() => {
    time.value = dayjs().format("YYYY-MM-DD HH:mm:ss");
  }, 1000);
};

// 下载事件处理
const download = () => {
  showConfirmDialog({
    title: "下载提示",
    message: "确实要下载吗？下载后请前往文件目录查看！！！",
  })
    .then(() => {
      showToast("下载");
      const file = files.value[0];
      downloadFile(file.file);
    })
    .catch(() => {
      showToast("取消下载");
    });
};

// 下载file文件
const downloadFile = async (file) => {
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

// 文件开始上传
const beforeRead = (file) => {
  console.log(file, "file上传中");
  file.status = "uploading";
  file.message = "上传中...";
  return true;
};

// 文件上传成功
const afterRead = (file) => {
  console.log(file, "file上传成功");
  aduioName.value = file.file.name;

  // 这里我们直接将文件的临时链接赋值给 audioUrl
  audioUrl.value = URL.createObjectURL(file.file);

  // 音频上传成功后，获取时长
  loadAudioFile(file.file);
};

// 文件删除
const beforeDelete = (file) => {
  console.log(file, "file上传成功");
  aduioName.value = "";
  audioUrl.value = "";
  files.value = [];
};

// 音频时长处理
const loadAudioFile = (file) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const audioData = reader.result;
    audioBuffer.value = await audioContext.decodeAudioData(audioData);
  };
  reader.readAsArrayBuffer(file);
};

// 裁剪音频
const playSegment = async (startTime, endTime) => {
  if (!audioBuffer.value) return;

  // const response = await fetch(audioUrl.value);
  // const arrayBuffer = await response.arrayBuffer();

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer.value;
  const duration = endTime - startTime;

  // // 将源连接到目的地（扬声器）播放
  source.connect(audioContext.destination);
  source.start(audioContext.currentTime, startTime, duration);

  const audioTrack = audioContext.createMediaStreamDestination();
  console.log(audioContext, "audioContext");

  // return;

  const channelData = audioBuffer.value.getChannelData(0); // 获取第一个通道的数据
  const startSample = audioContext.sampleRate * startTime; // 开始剪切的样本位置
  const endSample = audioContext.sampleRate * endTime; // 结束剪切的样本位置

  // 确保结束时间不超过音频总长度
  if (endSample > audioBuffer.value.length) {
    alert("结束时间超出音频长度");
    return;
  }

  const clippedData = channelData.subarray(startSample, endSample); // 剪切音频数据
  /**
   * 1. numberOfChannels：指定新缓冲区中的声道数（如单声道为 1，立体声为 2）。必须是一个正整数。
   * 2. length：定义了新缓冲区的样本帧数量。这决定了音频片段的时间长度，取决于采样率。
   * 3. sampleRate：指定了每秒的样本数量，单位是赫兹 (Hz)。常见的值包括 44100、48000 等。
   */
  const newAudioBuffer = audioContext.createBuffer(
    1,
    clippedData.length,
    audioContext.sampleRate
  );
  
  newAudioBuffer.getChannelData(0).set(clippedData);
  const audioData = newAudioBuffer.getChannelData(0);
  const audioBlob = new Blob([audioData], { type: "audio/mp3" });
  cutAudioUrl.value = URL.createObjectURL(audioBlob);
  // cutAudioUrl.value = audioUrl.value;

  // cutAudioDown();
};

// 下载剪切后的音频文件
async function cutAudioDown() {
  const downloadLink = document.createElement("a");
  downloadLink.href = cutAudioUrl.value;
  downloadLink.download = `${aduioName.value}`;
  downloadLink.click();
}

onBeforeUnmount(() => {
  clearInterval(timer);
});
</script>

<style scope lang="less">
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
.audition {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.van-field__body) {
  border: 1px solid black;
}
:deep(.van-cell-group .van-cell) {
  align-items: center;
}
</style>
