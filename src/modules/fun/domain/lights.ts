import { randomInt } from "@/shared/lib/random";

export interface LightsPuzzle {
  size: number;
  board: boolean[];
  solution: boolean[];
}

export function toggleLights(board: boolean[], size: number, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= board.length)
    return board;
  const next = [...board];
  const row = Math.floor(index / size),
    col = index % size;
  for (const [r, c] of [
    [row, col],
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ])
    if (r >= 0 && r < size && c >= 0 && c < size)
      next[r * size + c] = !next[r * size + c];
  return next;
}

export function createLightsPuzzle(
  size: number,
  random = randomInt,
): LightsPuzzle {
  if (![3, 4, 5].includes(size)) throw new Error("请选择有效的翻灯棋盘。");
  let board: boolean[] = Array(size * size).fill(false);
  const solution: boolean[] = Array(size * size).fill(false);
  // 从全灭局面反向打乱，保留一组解，保证每局可解且提示始终有效。
  for (let index = 0; index < board.length; index++) {
    if (!random(2)) continue;
    board = toggleLights(board, size, index);
    solution[index] = true;
  }
  if (!board.some(Boolean)) {
    const index = Math.floor(board.length / 2);
    board = toggleLights(board, size, index);
    solution[index] = !solution[index];
  }
  return { size, board, solution };
}

export function playLight(puzzle: LightsPuzzle, index: number): LightsPuzzle {
  const board = toggleLights(puzzle.board, puzzle.size, index);
  if (board === puzzle.board) return puzzle;
  const solution = [...puzzle.solution];
  solution[index] = !solution[index];
  return { ...puzzle, board, solution };
}
