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

  // 音频上传成功后，获取时长
  loadAudioFile(file.file);
};

const beforeDelete = (file) => {
  console.log(file, "file上传成功");
  aduioName.value = "";
  audioUrl.value = "";
  files.value = [];
};

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffer = ref(null);
const audioPlayer = ref(null);
// const startTime = ref(0);
// const endTime = ref(10); // 默认值可以调整
// const downloadUrl = ref(null);

const loadAudioFile = (file) => {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    const audioData = e.target.result;
    createAudioContext(audioData, file);
  };
  reader.readAsArrayBuffer(file);
};

const createAudioContext = (audioData, file) => {
  audioContext.decodeAudioData(audioData, (buffer) => {
    audioBuffer.value = buffer;
    // audioPlayer.value.src = URL.createObjectURL(file);
  });
};

const playSegment = (startTime, endTime) => {
  if (!audioBuffer.value) return;
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer.value;
  const duration = endTime - startTime;
  source.start(audioContext.currentTime, startTime, duration);

  const audioTrack = audioContext.createMediaStreamDestination();
  console.log(audioContext, "audioContext");

  // 设置audio元素的src为音频上下文的地址
  // source.connect(audioTrack);
  // cutAudioUrl.value = audioTrack.stream;

  // 播放片段
  source.connect(audioContext.destination);

  // cutAudio();
};

async function cutAudio() {
  const startSample = Math.floor(
    beginTime.value * audioBuffer.value.sampleRate
  );
  const endSample = Math.floor(endTime.value * audioBuffer.value.sampleRate);

  // 确保结束时间不超过音频总长度
  if (endSample > audioBuffer.value.length) {
    alert("结束时间超出音频长度");
    return;
  }

  // 创建新的音频缓冲区
  const cutBuffer =
    audioContext &&
    audioContext.createBuffer(
      audioBuffer.value.numberOfChannels,
      endSample - startSample,
      audioBuffer.value.sampleRate
    );

  for (
    let channel = 0;
    channel < audioBuffer.value.numberOfChannels;
    channel++
  ) {
    const inputData = audioBuffer.value.getChannelData(channel);
    const outputData = cutBuffer.getChannelData(channel);
    for (let i = 0; i < outputData.length; i++) {
      outputData[i] = inputData[startSample + i];
    }
  }

  // 将裁剪后的音频数据转换为 Blob 并生成 URL
  const blob = await exportWAV(cutBuffer);
  const url = URL.createObjectURL(blob);

  // 更新页面上的元素
  if (audioPlayer) {
    audioPlayer.value.src = url;
  }
  cutAudioUrl.value = url;
}

function exportWAV(audioBuffer) {
  return new Promise((resolve) => {
    const worker = new Worker(
      URL.createObjectURL(
        new Blob(
          [
            `
          onmessage = async function(e) {
            importScripts('https://cdn.jsdelivr.net/npm/wavefile@1.2.1/WaveFile.min.js');
            const waveFile = new WaveFile(new Float32Array(e.data.buffer));
            waveFile.toPCM16Bit();
            postMessage(waveFile.toBuffer());
          }
        `,
          ],
          { type: "text/javascript" }
        )
      )
    );

    worker.onmessage = (e) => {
      resolve(new Blob([e.data], { type: "audio/wav" }));
    };

    // 报错
    worker && worker.postMessage({ buffer: audioBuffer });
  });
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
