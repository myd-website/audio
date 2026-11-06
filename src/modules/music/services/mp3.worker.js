/* 编码运行在独立线程；取消任务时由调用方终止 worker，避免阻塞手机界面。 */
self.onmessage = function (event) {
  try {
    const { encoderUrl, channels, sampleRate, bitrate } = event.data;
    importScripts(encoderUrl);
    const encoder = new self.lamejs.Mp3Encoder(
      channels.length,
      sampleRate,
      bitrate,
    );
    const input = channels.map((buffer) => new Float32Array(buffer));
    const chunks = [];
    const block = 1152;
    let reported = -1;
    for (let offset = 0; offset < input[0].length; offset += block) {
      const pcm = input.map((channel) => {
        const slice = channel.subarray(offset, offset + block);
        const values = new Int16Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          const sample = Math.max(-1, Math.min(1, slice[i]));
          values[i] = Math.round(sample * (sample < 0 ? 32768 : 32767));
        }
        return values;
      });
      const output = encoder.encodeBuffer(pcm[0], pcm[1]);
      if (output.length) chunks.push(new Uint8Array(output).buffer);
      const progress = Math.floor((offset / input[0].length) * 100);
      if (progress !== reported && progress % 5 === 0) {
        self.postMessage({ type: "progress", progress });
        reported = progress;
      }
    }
    const tail = encoder.flush();
    if (tail.length) chunks.push(new Uint8Array(tail).buffer);
    self.postMessage({ type: "done", chunks }, chunks);
  } catch {
    self.postMessage({
      type: "error",
      message: "MP3 编码失败，请缩短片段或换一个文件重试。",
    });
  }
};
