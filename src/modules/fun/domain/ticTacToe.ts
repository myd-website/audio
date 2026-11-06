export type Mark = "X" | "O";
export type Cell = Mark | null;
const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export function ticTacToeResult(board: Cell[]): {
  winner: Mark | "draw" | null;
  line: number[];
} {
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], line };
  }
  return { winner: board.every(Boolean) ? "draw" : null, line: [] };
}

export function chooseComputerMove(board: Cell[]) {
  if (ticTacToeResult(board).winner) return -1;
  const cache = new Map<string, number>();
  const order = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  function score(position: Cell[], turn: Mark, depth: number): number {
    const result = ticTacToeResult(position).winner;
    if (result)
      return result === "draw" ? 0 : result === "O" ? 10 - depth : depth - 10;
    const key = position.map((cell) => cell ?? "-").join("") + turn;
    if (cache.has(key)) return cache.get(key)!;
    const values = order
      .filter((index) => !position[index])
      .map((index) => {
        const next = [...position];
        next[index] = turn;
        return score(next, turn === "O" ? "X" : "O", depth + 1);
      });
    const best = turn === "O" ? Math.max(...values) : Math.min(...values);
    cache.set(key, best);
    return best;
  }
  let best = -Infinity,
    chosen = -1;
  for (const index of order) {
    if (board[index]) continue;
    const next = [...board];
    next[index] = "O";
    const value = score(next, "X", 0);
    if (value > best) {
      best = value;
      chosen = index;
    }
  }
  return chosen;
}
