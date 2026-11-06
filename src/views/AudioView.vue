<template>
  <div class="home text-center">
    <van-notice-bar left-icon="volume-o" :text="`当前时间：${time}`" />
    <div v-if="!audioUrl">
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

      <div class="upload-btn">
        <a href="http://www.eev3.com/" target="_blank">音乐库</a>
        <a href="http://www.4c44.com/slist/huayu/nan.html" target="_blank"
          >音乐库</a
        >
      </div>
    </div>

    <!-- 测试子组建引入 -->
    <!-- <child /> -->

    <!-- 显示上传的 mp3 文件信息 -->
    <div v-if="audioUrl" class="audio-resouse">
      <!-- <span>{{ aduioName }}</span> -->
      <!-- <audio :src="audioUrl" controls :autoplay="false" /> -->

      <div class="music-box">
        <div class="close" @click="beforeDelete">
          <van-icon name="clear" />
        </div>
        <AudioPlay :audioUrl="audioUrl" :aduioName="aduioName" />
      </div>

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
        <!-- 试听： -->
        <!-- <audio :src="cutAudioUrl" controls autoplay="false"></audio> -->
        <AudioPlay :audioUrl="cutAudioUrl" :aduioName="customFileName" />
      </p>

      <van-button type="success" @click="download">下载</van-button>
    </div>
  </div>
</template>

<script setup>
import dayjs from "dayjs";
import { ref, onMounted, onBeforeUnmount, watchEffect } from "vue";
import { showToast, showConfirmDialog, showDialog } from "vant";
import child from "./child.vue";
import AudioPlay from "./audioPlay.vue";

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
const customFileName = ref(null);

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
  if (!customFileName.value) {
    showToast("片段不能为空");
    return;
  }
  showDialog({
    title: "下载提示：浏览器打开进行下载",
    message: `
        <a href="${cutAudioUrl.value}" id="linkText" target="_blank">https://myd-website.github.io/audio/</a>
        <input
          style="width: 100%;"
          class="customFileName"
          value="${customFileName.value}"
          type="text"
          colon
          placeholder="请输入文件名称"
        />`,
    allowHtml: true,
    theme: "round-button",
  }).then(() => {
    const inputValue =
      document.getElementsByClassName("customFileName")[0].value;
    if (!inputValue) {
      showToast("文件名称不能为空");
      return;
    } else {
      // 设置文件名
      customFileName.value = inputValue.includes("mp3")
        ? inputValue
        : `${inputValue}.mp3`;

      // 复制内容到剪切板
      copyWriteText();

      // 下载方法
      cutAudioDown();
    }
  });
};

// 复制地址
const copyWriteText = async () => {
  const linkSrc = "https://myd-website.github.io/audio/";

  const range = document.createRange();
  range.selectNode(document.querySelector("#linkText"));
  const selection = window.getSelection();
  if (selection.rangeCount > 0) selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand("Copy");
  showToast("复制成功");
};

// 下载剪切后的音频文件
const cutAudioDown = (wavBlob) => {
  const downloadLink = document.createElement("a");
  downloadLink.href = cutAudioUrl.value;
  downloadLink.download = customFileName.value;
  downloadLink.click();
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

// 截取片段
const playSegment = async (beginTime, endTime) => {
  const fileInput = files.value[0];

  if (!fileInput.file) {
    showToast("请先选择一个音频文件");
    return;
  }

  if (Number(beginTime) >= Number(endTime)) {
    showToast("请输入有效的时间段");
    return;
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await fileInput.file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  /**
   * @describe 通过以下方法可以有效降低音频文件的大小
   * 1. numberOfChannels：指定新缓冲区中的声道数（如单声道为 1，立体声为 2）。必须是一个正整数。
   * 2. length：定义了新缓冲区的样本帧数量。这决定了音频片段的时间长度，取决于采样率。【采样率越高，音频质量越好，但文件大小也会增加。】
   * 3. sampleRate：指定了每秒的样本数量，单位是赫兹 (Hz)。常见的值包括 44100(CD质量)、48000(DVD质量)、96000(高保真音频)
   * 4. 降低音频文件大小
   *  - 降低采样率。
   *  - 降低比特率。
   *  - 减少声道数（立体声转单声道）。
   *  - 裁剪音频。
   *  - 使用更高效的音频格式（如 MP3、OGG、AAC）。
   *  - 动态调整音频质量。
   *
   */
  const numberOfChannels = 2; // 单声道 audioBuffer.numberOfChannels
  const length = (endTime - beginTime) * audioBuffer.sampleRate; // 音频片段的长度，单位是样本帧。(endTime - beginTime) * audioBuffer.sampleRate
  const sampleRate = audioBuffer.sampleRate;

  const clippedBuffer = audioContext.createBuffer(
    numberOfChannels,
    length,
    sampleRate
  );

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const inputChannelData = audioBuffer.getChannelData(channel);
    const outputChannelData = clippedBuffer.getChannelData(channel);
    outputChannelData.set(
      inputChannelData.subarray(
        beginTime * audioBuffer.sampleRate,
        endTime * audioBuffer.sampleRate
      )
    );
  }

  // 将音频缓冲区转换为Blob对象
  const wavBlob = await audioBufferToWav(clippedBuffer);

  // 设置试听链接
  cutAudioUrl.value = URL.createObjectURL(wavBlob);
  customFileName.value = `[${beginTime}秒~${endTime}秒片段]_${aduioName.value}`;
};

function audioBufferToWav(buffer) {
  let numOfChan = buffer.numberOfChannels,
    length = buffer.length * numOfChan * 2 + 44,
    bufferOffset = 0,
    view = new DataView(new ArrayBuffer(length)),
    channels = [],
    i,
    sample,
    offset = 0,
    pos = 0;

  // write WAVE header
  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);

  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);

  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][bufferOffset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    bufferOffset++;
  }

  // create Blob
  return new Blob([view], { type: "audio/wav" });

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

// 裁剪音频(弃用)
const playSegment_Deprecated = async (startTime, endTime) => {
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
  // 压缩文件
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
};

onBeforeUnmount(() => {
  clearInterval(timer);
});
</script>

<style scoped lang="less">
.upload-box {
  background: #ffac00;
  padding: 10px;
}
.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  a {
    color: black;
    width: 1rem;
    height: 0.5rem;
    line-height: 0.5rem;
    padding: 0.2rem 0.2rem;
    background: #ffac00;
    border-radius: 0.1rem;
  }
}
.audio-resouse {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: url("../assets/music_bg.avif") no-repeat center;
  padding-bottom: 1rem;
  padding-top: 0.5rem;
  .music-box {
    width: 100%;
    padding: 0 0.3rem;
    position: relative;
    .close {
      position: absolute;
      right: 7%;
      top: 3%;
      z-index: 10;
    }
  }
}
.audition {
  width: 100%;
  padding: 0 0.3rem;
}

:deep(.van-field__body) {
  border: 1px solid #fff;
  border-radius: 10px;
  padding: 0 10px;
}
:deep(.van-cell-group .van-cell) {
  align-items: center;
  background: #9ba66c;
}
</style>
