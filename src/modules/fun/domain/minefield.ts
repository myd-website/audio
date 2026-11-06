import { randomInt } from "@/shared/lib/random";

export interface Minefield {
  size: number;
  mineCount: number;
  mines: boolean[];
  opened: boolean[];
  flags: boolean[];
  phase: "ready" | "playing" | "won" | "lost";
}

export function mineNeighbors(size: number, index: number) {
  const result: number[] = [];
  const row = Math.floor(index / size),
    col = index % size;
  for (let r = Math.max(0, row - 1); r <= Math.min(size - 1, row + 1); r++)
    for (let c = Math.max(0, col - 1); c <= Math.min(size - 1, col + 1); c++)
      if (r !== row || c !== col) result.push(r * size + c);
  return result;
}

export function createMinefield(size: number, mineCount: number): Minefield {
  if (
    !Number.isInteger(size) ||
    size < 4 ||
    size > 12 ||
    !Number.isInteger(mineCount) ||
    mineCount < 1 ||
    mineCount > size * size - 9
  )
    throw new Error("扫雷棋盘或地雷数量不正确。");
  return {
    size,
    mineCount,
    mines: Array(size * size).fill(false),
    opened: Array(size * size).fill(false),
    flags: Array(size * size).fill(false),
    phase: "ready",
  };
}

const validCell = (state: Minefield, index: number) =>
  Number.isInteger(index) && index >= 0 && index < state.mines.length;

export function adjacentMines(state: Minefield, index: number) {
  return mineNeighbors(state.size, index).filter((cell) => state.mines[cell])
    .length;
}

export function toggleMineFlag(state: Minefield, index: number): Minefield {
  if (
    !validCell(state, index) ||
    state.opened[index] ||
    state.phase === "won" ||
    state.phase === "lost"
  )
    return state;
  if (
    !state.flags[index] &&
    state.flags.filter(Boolean).length >= state.mineCount
  )
    return state;
  const flags = [...state.flags];
  flags[index] = !flags[index];
  return { ...state, flags };
}

export function revealMineCell(
  state: Minefield,
  index: number,
  random = randomInt,
): Minefield {
  if (
    !validCell(state, index) ||
    state.opened[index] ||
    state.flags[index] ||
    state.phase === "won" ||
    state.phase === "lost"
  )
    return state;
  const next: Minefield = {
    ...state,
    mines: [...state.mines],
    opened: [...state.opened],
    phase: "playing",
  };
  if (state.phase === "ready") {
    // 首次翻开后才布雷，首次格和周围一圈都安全，避免开局碰运气。
    const safe = new Set([index, ...mineNeighbors(state.size, index)]);
    const available = state.mines
      .map((_, cell) => cell)
      .filter((cell) => !safe.has(cell));
    for (let count = 0; count < state.mineCount; count++) {
      const pick = random(available.length);
      next.mines[available[pick]] = true;
      available.splice(pick, 1);
    }
  }
  next.opened[index] = true;
  if (next.mines[index]) return { ...next, phase: "lost" };
  const queue = [index];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const cell = queue[cursor];
    if (adjacentMines(next, cell)) continue;
    for (const neighbor of mineNeighbors(state.size, cell)) {
      if (next.opened[neighbor] || next.flags[neighbor] || next.mines[neighbor])
        continue;
      next.opened[neighbor] = true;
      queue.push(neighbor);
    }
  }
  if (next.opened.filter(Boolean).length === next.mines.length - next.mineCount)
    next.phase = "won";
  return next;
}
