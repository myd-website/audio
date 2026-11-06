export interface ClipOptions {
  start: number;
  end: number;
  bitrate: number;
  fade: boolean;
}
export function validateClip(duration: number, options: ClipOptions) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 600)
    throw new Error("当前支持总时长不超过 10 分钟的音频。");
  if (
    !Number.isFinite(options.start) ||
    !Number.isFinite(options.end) ||
    options.start < 0 ||
    options.end > duration + 0.001 ||
    options.end <= options.start
  )
    throw new Error(
      "请设置有效的起止时间，结束时间须大于开始时间且不超过总时长。",
    );
  if (options.end - options.start > 300)
    throw new Error("为控制手机内存占用，每次最多导出 5 分钟。请缩短选区。");
  if (![128, 192, 320].includes(options.bitrate))
    throw new Error("请选择有效的 MP3 码率。");
}
export function wavBytes(
  channels: Float32Array[],
  sampleRate: number,
): ArrayBuffer {
  if (
    channels.length < 1 ||
    channels.length > 2 ||
    !channels[0].length ||
    channels.some((c) => c.length !== channels[0].length)
  )
    throw new Error("音频声道数据不正确。");
  const count = channels.length;
  const length = channels[0].length;
  const buffer = new ArrayBuffer(44 + length * count * 2);
  const view = new DataView(buffer);
  const write = (at: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(at + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, length * count * 2, true);
  let offset = 44;
  for (let i = 0; i < length; i++)
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[i]));
      view.setInt16(
        offset,
        Math.round(sample * (sample < 0 ? 32768 : 32767)),
        true,
      );
      offset += 2;
    }
  return buffer;
}
