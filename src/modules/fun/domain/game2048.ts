import { randomInt } from "@/shared/lib/random";

export type Direction = "up" | "down" | "left" | "right";
export type Tile = { id: number; value: number; index: number };

export function spawnTile(tiles: Tile[], id: number, draw = randomInt): Tile[] {
  const empty = Array.from({ length: 16 }, (_, i) => i).filter(
    (index) => !tiles.some((tile) => tile.index === index),
  );
  if (!empty.length) return tiles;
  return [
    ...tiles,
    { id, index: empty[draw(empty.length)], value: draw(10) === 0 ? 4 : 2 },
  ];
}

export function moveTiles(tiles: Tile[], direction: Direction) {
  const motions: Tile[] = [],
    next: Tile[] = [],
    mergedIds: number[] = [];
  let score = 0;
  for (let lane = 0; lane < 4; lane++) {
    const indices = Array.from({ length: 4 }, (_, offset) => {
      if (direction === "left") return lane * 4 + offset;
      if (direction === "right") return lane * 4 + 3 - offset;
      if (direction === "up") return offset * 4 + lane;
      return (3 - offset) * 4 + lane;
    });
    const row = indices
      .map((index) => tiles.find((tile) => tile.index === index))
      .filter((tile): tile is Tile => Boolean(tile));
    let target = 0;
    for (let source = 0; source < row.length; source++) {
      const tile = row[source],
        neighbor = row[source + 1],
        index = indices[target++];
      motions.push({ ...tile, index });
      // 只合并原序列中的相邻对，刚合成的数字本轮不能再次参与合并。
      if (neighbor && tile.value === neighbor.value) {
        motions.push({ ...neighbor, index });
        next.push({ ...tile, index, value: tile.value * 2 });
        score += tile.value * 2;
        mergedIds.push(tile.id);
        source++;
      } else next.push({ ...tile, index });
    }
  }
  const moved = motions.some(
    (tile) => tiles.find((old) => old.id === tile.id)!.index !== tile.index,
  );
  return { tiles: next, motions, score, moved, mergedIds };
}

export function canMoveTiles(tiles: Tile[]) {
  if (tiles.length < 16) return true;
  return tiles.some((tile) =>
    tiles.some(
      (other) =>
        other.value === tile.value &&
        ((tile.index % 4 < 3 && other.index === tile.index + 1) ||
          other.index === tile.index + 4),
    ),
  );
}
