import { randomInt } from "@/shared/lib/random";

export const solvedPuzzle = () => [1, 2, 3, 4, 5, 6, 7, 8, 0];
export const isPuzzleSolved = (board: number[]) =>
  board.every((value, index) => value === (index + 1) % 9);

export function puzzleNeighbors(empty: number) {
  return [empty - 3, empty + 3, empty - 1, empty + 1].filter(
    (index) =>
      index >= 0 &&
      index < 9 &&
      Math.abs(Math.floor(index / 3) - Math.floor(empty / 3)) +
        Math.abs((index % 3) - (empty % 3)) ===
        1,
  );
}

export function movePuzzle(board: number[], index: number) {
  const empty = board.indexOf(0);
  if (!puzzleNeighbors(empty).includes(index)) return board;
  const next = [...board];
  [next[empty], next[index]] = [next[index], next[empty]];
  return next;
}

export function createPuzzle(draw = randomInt) {
  let board = solvedPuzzle(),
    previous = -1;
  // 从完成态进行合法移动，保证每一盘都有解；避开立即原路返回。
  for (let turn = 0; turn < 120; turn++) {
    const empty = board.indexOf(0);
    const choices = puzzleNeighbors(empty).filter(
      (index) => index !== previous,
    );
    board = movePuzzle(board, choices[draw(choices.length)]);
    previous = empty;
  }
  if (isPuzzleSolved(board))
    board = movePuzzle(board, puzzleNeighbors(board.indexOf(0))[0]);
  return board;
}
