import { randomInt } from "@/shared/lib/random";

export const GAME_COLORS = [
  { name: "薄荷绿", color: "#699b82", symbol: "✿" },
  { name: "蜜桃橙", color: "#ce886b", symbol: "◆" },
  { name: "葡萄紫", color: "#9c83bb", symbol: "✦" },
  { name: "晴空蓝", color: "#6898b9", symbol: "●" },
  { name: "麦穗黄", color: "#b39a4c", symbol: "▲" },
];
export type ColorBoard = (number | null)[];

export function colorNeighbors(columns: number, length: number, index: number) {
  const cells: number[] = [];
  if (index >= columns) cells.push(index - columns);
  if (index + columns < length) cells.push(index + columns);
  if (index % columns > 0) cells.push(index - 1);
  if (index % columns < columns - 1 && index + 1 < length)
    cells.push(index + 1);
  return cells;
}

export function colorGroup(board: ColorBoard, columns: number, index: number) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= board.length ||
    board[index] === null
  )
    return [];
  const found = new Set([index]);
  const queue = [index];
  for (let cursor = 0; cursor < queue.length; cursor++)
    for (const cell of colorNeighbors(columns, board.length, queue[cursor]))
      if (!found.has(cell) && board[cell] === board[index]) {
        found.add(cell);
        queue.push(cell);
      }
  return queue;
}

export function createColorBoard(
  rows: number,
  columns: number,
  colors: number,
  random = randomInt,
): number[] {
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(columns) ||
    rows < 2 ||
    columns < 2 ||
    rows > 12 ||
    columns > 12 ||
    !Number.isInteger(colors) ||
    colors < 2 ||
    colors > GAME_COLORS.length
  )
    throw new Error("彩色棋盘参数不正确。");
  const board = Array.from({ length: rows * columns }, () => random(colors));
  // 漫游局面不会直接完成，消消乐开局至少有一组可以消除。
  board[1] = board[0];
  if (board.every((color) => color === board[0]))
    board[board.length - 1] = (board[0] + 1) % colors;
  return board;
}

export function floodColor(board: number[], size: number, color: number) {
  if (
    !Number.isInteger(color) ||
    color < 0 ||
    color >= GAME_COLORS.length ||
    color === board[0]
  )
    return board;
  const next = [...board];
  for (const index of colorGroup(board, size, 0)) next[index] = color;
  return next;
}

export function canPopColors(board: ColorBoard, columns: number) {
  return board.some(
    (color, index) =>
      color !== null &&
      ((index % columns < columns - 1 && board[index + 1] === color) ||
        board[index + columns] === color),
  );
}

export function popColors(board: ColorBoard, columns: number, index: number) {
  const group = colorGroup(board, columns, index);
  if (group.length < 2) return { board, removed: [], points: 0 };
  const next = [...board];
  for (const cell of group) next[cell] = null;
  const rows = board.length / columns;
  const packed = Array<number | null>(board.length).fill(null);
  let destination = 0;
  // 每列先向下落，再把空列右侧的列向左收拢，保留棋子相对顺序。
  for (let col = 0; col < columns; col++) {
    const remaining = Array.from(
      { length: rows },
      (_, row) => next[row * columns + col],
    ).filter((color): color is number => color !== null);
    if (!remaining.length) continue;
    remaining.forEach((color, row) => {
      packed[(rows - remaining.length + row) * columns + destination] = color;
    });
    destination++;
  }
  return {
    board: packed,
    removed: group,
    points: group.length * (group.length - 1) * 5,
  };
}
