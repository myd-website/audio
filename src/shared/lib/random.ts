/** 拒绝采样，避免用取模直接映射导致各选项概率不同。 */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 0x100000000)
    throw new Error("随机范围不正确");
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
