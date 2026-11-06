import encoderUrl from "lamejs/lame.min.js?url";
import type { ClipOptions } from "../domain/audio";
import { validateClip, wavBytes } from "../domain/audio";
function canceled(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("任务已取消", "AbortError");
}
export async function encodeAudio(
  file: File,
  options: ClipOptions,
  format: "mp3" | "wav",
  signal: AbortSignal,
  progress: (n: number) => void,
): Promise<Blob> {
  canceled(signal);
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error(
      "当前浏览器无法解码该音频，请尝试 MP3、WAV 或浏览器支持的 M4A 文件。",
    );
  } finally {
    await context.close();
  }
  canceled(signal);
  validateClip(decoded.duration, options);
  progress(10);
  const length = Math.max(1, Math.round((options.end - options.start) * 44100));
  const offline = new OfflineAudioContext(
    Math.min(2, decoded.numberOfChannels),
    length,
    44100,
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;
  const gain = offline.createGain();
  source.connect(gain);
  gain.connect(offline.destination);
  const seconds = length / 44100;
  if (options.fade) {
    const fade = Math.min(0.5, seconds / 2);
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(1, fade);
    gain.gain.setValueAtTime(1, seconds - fade);
    gain.gain.linearRampToValueAtTime(0, seconds);
  }
  source.start(0, options.start, seconds);
  const rendered = await offline.startRendering();
  canceled(signal);
  progress(20);
  const channels = Array.from({ length: rendered.numberOfChannels }, (_, i) =>
    rendered.getChannelData(i),
  );
  if (format === "wav")
    return new Blob([wavBytes(channels, 44100)], { type: "audio/wav" });
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./mp3.worker.js", import.meta.url));
    const timeout = window.setTimeout(
      () => finish(new Error("编码超时，请缩短片段重试。")),
      180000,
    );
    function finish(error?: Error, blob?: Blob) {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      worker.terminate();
      if (error) reject(error);
      else resolve(blob!);
    }
    const abort = () => finish(new DOMException("任务已取消", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () =>
      finish(new Error("编码线程无法加载，请检查浏览器支持或重新加载页面。"));
    worker.onmessage = (event) => {
      if (event.data.type === "progress")
        progress(20 + event.data.progress * 0.8);
      else if (event.data.type === "done")
        finish(undefined, new Blob(event.data.chunks, { type: "audio/mpeg" }));
      else finish(new Error(event.data.message));
    };
    const buffers = channels.map((channel) => channel.buffer);
    worker.postMessage(
      {
        encoderUrl: new URL(encoderUrl, location.href).href,
        channels: buffers,
        sampleRate: 44100,
        bitrate: options.bitrate,
      },
      buffers,
    );
  });
}
