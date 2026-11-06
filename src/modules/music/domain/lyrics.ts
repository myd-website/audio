export interface LyricLine {
  time: number;
  text: string;
}
/** 支持多时间标签、百分秒/毫秒及 offset；无时间轴时保留纯文本。 */
export function parseLyrics(raw: string): {
  lines: LyricLine[];
  plain: string;
} {
  const lines: LyricLine[] = [];
  const offset = Number(raw.match(/\[offset:\s*(-?\d+)\]/i)?.[1] || 0) / 1000;
  for (const line of raw.split(/\r?\n/)) {
    const matches = [
      ...line.matchAll(/\[(\d{1,3}):([0-5]\d)(?:\.(\d{1,3}))?\]/g),
    ];
    const text = line.replace(/\[[^\]]*\]/g, "").trim();
    for (const match of matches) {
      const time =
        Number(match[1]) * 60 +
        Number(match[2]) +
        Number(`0.${match[3] || 0}`) +
        offset;
      if (text) lines.push({ time: Math.max(0, time), text });
    }
  }
  return {
    lines: lines.sort((a, b) => a.time - b.time),
    plain: lines.length
      ? ""
      : raw.replace(/\[(?:ti|ar|al|by|offset):[^\]]*\]/gi, "").trim(),
  };
}
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
