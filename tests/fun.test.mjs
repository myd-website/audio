import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { posix } from "node:path";
import test from "node:test";
import ts from "typescript";
import { compileScript, parse } from "vue/compiler-sfc";

const require = createRequire(import.meta.url),
  vue = require("vue");
function evaluate(source, resolve) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const exports = {};
  new Function("require", "exports", outputText)(resolve, exports);
  return exports;
}
function load(file, overrides = {}, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);
  const result = evaluate(
    readFileSync(new URL(`../src/${file}.ts`, import.meta.url), "utf8"),
    (id) =>
      overrides[id] ??
      (id.startsWith("@/")
        ? load(id.slice(2), overrides, cache)
        : id.startsWith(".")
          ? load(
              posix.normalize(`${posix.dirname(file)}/${id}`),
              overrides,
              cache,
            )
          : require(id)),
  );
  cache.set(file, result);
  return result;
}
function mount(t, name, overrides = {}, initialProps = { active: true }) {
  const { descriptor } = parse(
    readFileSync(
      new URL(
        `../src/modules/fun/${name === "FunPage" ? "pages" : "components"}/${name}.vue`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const component = evaluate(
    compileScript(descriptor, { id: name }).content,
    (id) =>
      overrides[id] ??
      (id.endsWith(".vue")
        ? { default: {} }
        : id.startsWith("../domain/")
          ? load(`modules/fun/domain/${id.slice(10)}`, overrides)
          : require(id)),
  ).default;
  const renderer = vue.createRenderer({
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    insert() {},
    remove() {},
    setElementText() {},
    setText() {},
    patchProp() {},
    parentNode: () => null,
    nextSibling: () => null,
  });
  let model;
  const props = vue.reactive(initialProps);
  const app = renderer.createApp({
    setup() {
      model = component.setup(props, { expose() {} });
      return () => vue.h("div");
    },
  });
  app.mount({});
  let mounted = true;
  const unmount = () => {
    if (mounted) app.unmount();
    mounted = false;
  };
  t.after(unmount);
  return { model, props, unmount };
}
function clock(t) {
  const saved = {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    window: globalThis.window,
    now: Date.now,
  };
  const jobs = new Map();
  let nextId = 0,
    now = 0;
  const add = (callback, delay = 0, repeat = false) => {
    const id = ++nextId;
    jobs.set(id, { callback, due: now + delay, delay, repeat });
    return id;
  };
  globalThis.setTimeout = (fn, ms) => add(fn, ms);
  globalThis.setInterval = (fn, ms) => add(fn, ms, true);
  globalThis.clearTimeout = globalThis.clearInterval = (id) => jobs.delete(id);
  globalThis.window = {
    setTimeout: globalThis.setTimeout,
    matchMedia: () => ({ matches: false }),
  };
  Date.now = () => now;
  t.after(() => {
    Date.now = saved.now;
    delete saved.now;
    Object.assign(globalThis, saved);
  });
  return {
    jobs,
    advance(ms) {
      const end = now + ms;
      for (let count = 0; count < 1000; count++) {
        const entry = [...jobs.entries()]
          .filter(([, job]) => job.due <= end)
          .sort((a, b) => a[1].due - b[1].due)[0];
        if (!entry) break;
        const [id, job] = entry;
        now = job.due;
        if (job.repeat) job.due += job.delay;
        else jobs.delete(id);
        job.callback();
      }
      now = end;
    },
  };
}
const puzzle = load("modules/fun/domain/slidingPuzzle");
const merge = load("modules/fun/domain/game2048");
const tic = load("modules/fun/domain/ticTacToe");
const lights = load("modules/fun/domain/lights");
const minefield = load("modules/fun/domain/minefield");
const colorGames = load("modules/fun/domain/colorGames");

function seeded(seed) {
  return (max) => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) % max;
  };
}
test("娱乐页保留路由入口，切换取消未完成动画且模板校验不写入无效数据", async (t) => {
  const time = clock(t);
  const route = vue.reactive({ query: { tool: "focus" } });
  const data = { templates: [] },
    messages = [];
  const { model, unmount } = mount(t, "FunPage", {
    "vue-router": { useRoute: () => route },
    vant: {
      showToast: (message) => messages.push(message),
      showConfirmDialog: async () => {},
    },
    "@/shared/stores/workspace": {
      useWorkspaceStore: () => ({ data, commit: (change) => change(data) }),
    },
    "@/shared/lib/workspace": { uid: () => "test-template" },
    "@/shared/lib/random": { randomInt: () => 0, shuffle: (values) => values },
    "@/shared/lib/feedback": {
      act: (action) => {
        action();
        return true;
      },
    },
    "../stores/focus": {
      useFocusStore: () => ({ minutes: 25, remaining: 1500000, state: "idle" }),
    },
  });
  assert.equal(model.tool.value, "focus");
  route.query.tool = "wheel";
  await vue.nextTick();
  model.spin();
  assert.equal(model.spinning.value, true);
  model.tool.value = "memory";
  await vue.nextTick();
  time.advance(4000);
  assert.equal(model.spinning.value, false);
  assert.deepEqual(model.history.value, []);
  model.flip(0);
  model.flip(1);
  assert.equal(model.locked.value, true);
  model.tool.value = "guess";
  await vue.nextTick();
  time.advance(1000);
  assert.equal(model.locked.value, false);
  assert.deepEqual(model.flipped.value, []);
  model.templateName.value = "测试模板";
  model.optionsText.value = `${"长".repeat(41)}\n短选项`;
  model.saveTemplate();
  assert.equal(data.templates.length, 0);
  assert.match(messages.at(-1), /40/);
  model.optionsText.value = "选项一\n选项二";
  model.saveTemplate();
  assert.deepEqual(data.templates[0].options, ["选项一", "选项二"]);
  assert.equal(model.tools.length, 12);
  for (const name of ["mines", "lights", "flood", "bubbles"]) {
    route.query.tool = name;
    await vue.nextTick();
    assert.equal(model.tool.value, name);
  }
  route.query.tool = "unknown";
  await vue.nextTick();
  assert.equal(model.tool.value, "wheel");
  model.spin();
  unmount();
  time.advance(4000);
  assert.deepEqual(model.history.value, []);
  assert.equal(time.jobs.size, 0);
});
const asTiles = (values) =>
  values.flatMap((value, index) =>
    value ? [{ id: index + 1, value, index }] : [],
  );
const cells = (tiles) =>
  Array.from(
    { length: 16 },
    (_, i) => tiles.find((tile) => tile.index === i)?.value ?? 0,
  );

test("华容道随机开局都有解且未完成，只允许空格相邻移动", () => {
  let seed = 30;
  const draw = (max) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % max;
  };
  for (let run = 0; run < 80; run++) {
    const board = puzzle.createPuzzle(draw);
    assert.deepEqual([...board].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(puzzle.isPuzzleSolved(board), false);
    const values = board.filter(Boolean);
    let inversions = 0;
    values.forEach((value, index) =>
      values.slice(index + 1).forEach((other) => {
        if (value > other) inversions++;
      }),
    );
    assert.equal(inversions % 2, 0);
  }
  const board = [1, 2, 0, 3, 4, 5, 6, 7, 8];
  assert.strictEqual(puzzle.movePuzzle(board, 3), board, "不能跨行移动");
  assert.strictEqual(puzzle.movePuzzle(board, -1), board);
  const next = puzzle.movePuzzle(board, 5);
  assert.equal(next[2], 5);
  assert.equal(next[5], 0);
  assert.equal(board[2], 0);
});
test("2048 合并遵循方向，每块数字一轮只能合并一次且分数准确", () => {
  for (const [values, expected, score] of [
    [[2, 2, 2, 2], [4, 4, 0, 0], 8],
    [[2, 2, 4, 0], [4, 4, 0, 0], 4],
    [[2, 0, 2, 2], [4, 2, 0, 0], 4],
    [[4, 4, 8, 8], [8, 16, 0, 0], 24],
  ]) {
    const original = asTiles(values),
      result = merge.moveTiles(original, "left");
    assert.deepEqual(cells(result.tiles).slice(0, 4), expected);
    assert.equal(result.score, score);
    assert.equal(result.moved, true);
    assert.deepEqual(original, asTiles(values));
    assert.equal(
      new Set(result.tiles.map((tile) => tile.index)).size,
      result.tiles.length,
    );
  }
  for (const [direction, indices] of [
    ["left", [0, 1, 2, 3]],
    ["right", [3, 2, 1, 0]],
    ["up", [0, 4, 8, 12]],
    ["down", [12, 8, 4, 0]],
  ]) {
    const tiles = indices.map((index, i) => ({ id: i, index, value: 2 }));
    const result = merge.moveTiles(tiles, direction);
    assert.deepEqual(
      result.tiles.map((tile) => [tile.index, tile.value]),
      [
        [indices[0], 4],
        [indices[1], 4],
      ],
    );
    assert.equal(result.score, 8);
  }
  assert.equal(merge.moveTiles(asTiles([2, 0, 0, 0]), "left").moved, false);
});
test("2048 新数字仅出现在空格，满盘只能在有相邻同值时继续", () => {
  const board = asTiles([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]);
  assert.equal(merge.canMoveTiles(board), false, "跨行接缝的相同数字不能合并");
  assert.strictEqual(merge.spawnTile(board, 99), board);
  const almost = board.slice(1),
    spawned = merge.spawnTile(almost, 99, () => 0);
  assert.equal(spawned.at(-1).index, 0);
  assert.equal(spawned.at(-1).value, 4);
  assert.equal(merge.canMoveTiles(almost), true);
  assert.equal(
    merge.canMoveTiles(
      board.map((tile) => (tile.index === 1 ? { ...tile, value: 2 } : tile)),
    ),
    true,
  );
});
test("井字棋识别横竖斜线和平局，电脑会取胜、堵截且不修改输入", () => {
  for (const line of [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]) {
    const board = Array(9).fill(null);
    line.forEach((i) => (board[i] = "X"));
    assert.deepEqual(tic.ticTacToeResult(board), { winner: "X", line });
    assert.equal(tic.chooseComputerMove(board), -1);
  }
  const board = ["X", "X", null, null, "O", null, null, null, null],
    before = [...board];
  assert.equal(tic.chooseComputerMove(board), 2);
  assert.deepEqual(board, before);
  assert.equal(
    tic.chooseComputerMove(["O", "O", null, "X", "X", null, null, null, null]),
    2,
  );
  assert.equal(
    tic.ticTacToeResult(["X", "O", "X", "X", "O", "O", "O", "X", "X"]).winner,
    "draw",
  );
});
test("穷举玩家所有合法选择，井字棋电脑不会漏防导致失败", () => {
  let endings = 0;
  function walk(board) {
    const outcome = tic.ticTacToeResult(board).winner;
    assert.notEqual(outcome, "X");
    if (outcome) {
      endings++;
      return;
    }
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      const next = [...board];
      next[i] = "X";
      assert.notEqual(tic.ticTacToeResult(next).winner, "X");
      if (!tic.ticTacToeResult(next).winner)
        next[tic.chooseComputerMove(next)] = "O";
      walk(next);
    }
  }
  walk(Array(9).fill(null));
  assert.ok(endings > 100);
});
test("猜数字校验输入、逐步缩小范围，获胜后锁定且重开清空记录", (t) => {
  const { model } = mount(t, "GuessNumber", {
    "@/shared/lib/random": { randomInt: () => 41 },
  });
  for (const invalid of ["", "2.5", "1e2", "-1", "101"]) {
    model.input.value = invalid;
    model.guess();
    assert.ok(model.error.value);
    assert.equal(model.guesses.value.length, 0);
  }
  model.input.value = "50";
  model.guess();
  assert.equal(model.high.value, 49);
  model.input.value = "25";
  model.guess();
  assert.equal(model.low.value, 26);
  model.input.value = "50";
  model.guess();
  assert.equal(model.guesses.value.length, 2);
  model.input.value = "42";
  model.guess();
  assert.equal(model.won.value, true);
  model.guess();
  assert.equal(model.guesses.value.length, 3);
  model.restart(1000);
  assert.equal(model.high.value, 1000);
  assert.deepEqual(model.guesses.value, []);
  assert.equal(model.won.value, false);
});
test("华容道无效移动不计步，切换暂停计时，完成、重开与卸载清理时钟", async (t) => {
  const time = clock(t),
    { model, props, unmount } = mount(t, "SlidingPuzzle");
  model.board.value = [1, 2, 3, 4, 5, 6, 0, 7, 8];
  model.move(0);
  assert.equal(model.moves.value, 0);
  model.move(7);
  time.advance(1250);
  assert.equal(model.elapsed.value, 1250);
  props.active = false;
  await vue.nextTick();
  time.advance(3000);
  assert.equal(model.elapsed.value, 1250);
  props.active = true;
  await vue.nextTick();
  time.advance(750);
  model.move(8);
  assert.equal(model.solved.value, true);
  assert.equal(model.elapsed.value, 2000);
  assert.equal(time.jobs.size, 0);
  model.move(7);
  assert.equal(model.moves.value, 2);
  model.restart();
  assert.equal(model.moves.value, 0);
  assert.equal(model.elapsed.value, 0);
  model.move(model.neighbors.value[0]);
  assert.equal(time.jobs.size, 1);
  unmount();
  assert.equal(time.jobs.size, 0);
});
test("2048 锁定动画期间重复操作，无效移动不生成数字，重开和隐藏不会重复提交", async (t) => {
  const time = clock(t),
    { model, props, unmount } = mount(t, "Game2048");
  model.tiles.value = asTiles([2, 2]);
  model.move("left");
  model.move("right");
  assert.equal(model.moving.value, true);
  time.advance(150);
  assert.equal(model.score.value, 4);
  assert.equal(model.turns.value, 1);
  assert.equal(model.tiles.value.length, 2);
  model.tiles.value = asTiles([2]);
  model.move("left");
  assert.equal(time.jobs.size, 0);
  assert.equal(model.tiles.value.length, 1);
  model.move("right");
  model.restart();
  time.advance(300);
  assert.equal(model.score.value, 0);
  assert.equal(model.turns.value, 0);
  assert.equal(model.tiles.value.length, 2);
  model.tiles.value = asTiles([1024, 1024]);
  model.move("left");
  props.active = false;
  await vue.nextTick();
  assert.equal(model.outcome.value, "won");
  assert.equal(model.score.value, 2048);
  assert.equal(time.jobs.size, 0);
  time.advance(500);
  assert.equal(model.turns.value, 1);
  model.continueGame();
  assert.equal(model.outcome.value, "playing");
  unmount();
  assert.equal(time.jobs.size, 0);
});
test("井字棋拒绝重复落子，切换、重开和卸载取消电脑迟到的落子", async (t) => {
  const time = clock(t),
    { model, props, unmount } = mount(t, "TicTacToe");
  model.play(0);
  model.play(1);
  assert.equal(model.board.value.filter(Boolean).length, 1);
  props.active = false;
  await vue.nextTick();
  time.advance(1000);
  assert.equal(model.board.value.filter(Boolean).length, 1);
  props.active = true;
  await vue.nextTick();
  time.advance(420);
  assert.equal(model.board.value.filter(Boolean).length, 2);
  model.restart();
  model.play(0);
  model.restart();
  time.advance(1000);
  assert.deepEqual(model.board.value, Array(9).fill(null));
  model.mode.value = "local";
  await vue.nextTick();
  for (const i of [0, 3, 1, 4, 2]) model.play(i);
  assert.equal(model.outcome.value.winner, "X");
  assert.equal(model.scores.value.X, 1);
  model.play(8);
  assert.equal(model.board.value[8], null);
  assert.equal(model.scores.value.X, 1);
  model.mode.value = "computer";
  await vue.nextTick();
  model.play(0);
  unmount();
  assert.equal(time.jobs.size, 0);
});
test("立体骰子点数、合计与朝向一致，快速重复点击和离开时正确收尾", async (t) => {
  const time = clock(t),
    draws = [0, 1, 5];
  const { model, props, unmount } = mount(t, "RandomTools", {
    "@/shared/lib/random": { randomInt: () => draws.shift() ?? 0 },
  });
  model.setCount(3);
  model.rollDice();
  model.rollDice();
  assert.deepEqual(model.dice.value, [1, 2, 6]);
  assert.equal(time.jobs.size, 1);
  time.advance(920);
  assert.equal(model.result.value, "1 + 2 + 6 = 9 点");
  assert.equal(model.rotations.value[0].x % 360, 0);
  assert.equal(model.rotations.value[1].x % 360, 270);
  assert.equal(model.rotations.value[2].y % 360, 180);
  model.flipCoin();
  props.active = false;
  await vue.nextTick();
  assert.equal(model.busy.value, false);
  assert.equal(time.jobs.size, 0);
  assert.match(model.result.value, /正面/);
  model.minimum.value = "";
  model.drawNumber();
  assert.ok(model.error.value);
  model.minimum.value = 6;
  model.maximum.value = 6;
  model.drawNumber();
  assert.equal(model.numberResult.value, 6);
  unmount();
  assert.equal(time.jobs.size, 0);
});

test("翻灯随机局面始终非完成且可解，任意落子后保留有效解，不跨行翻转", () => {
  for (const size of [3, 4, 5]) {
    for (let seed = 1; seed <= 80; seed++) {
      const random = seeded(seed);
      let puzzle = lights.createLightsPuzzle(size, random);
      assert.ok(puzzle.board.some(Boolean));
      for (let move = 0; move < 20; move++)
        puzzle = lights.playLight(puzzle, random(size * size));
      const before = structuredClone(puzzle);
      let solved = puzzle;
      for (let index = 0; index < puzzle.solution.length; index++)
        if (puzzle.solution[index]) solved = lights.playLight(solved, index);
      assert.ok(solved.board.every((on) => !on));
      assert.deepEqual(puzzle, before);
      assert.equal(lights.playLight(puzzle, -1), puzzle);
      assert.equal(lights.playLight(puzzle, size * size), puzzle);
    }
  }
  assert.deepEqual(lights.toggleLights(Array(9).fill(false), 3, 2), [
    false,
    true,
    true,
    false,
    false,
    true,
    false,
    false,
    false,
  ]);
  assert.ok(lights.createLightsPuzzle(3, () => 0).board.some(Boolean));
  assert.throws(() => lights.createLightsPuzzle(9));
});

test("扫雷每个首次落点及邻域安全，雷数固定且展开不翻开地雷", () => {
  for (const [size, count] of [
    [6, 6],
    [8, 10],
  ]) {
    for (let first = 0; first < size * size; first++) {
      const initial = minefield.createMinefield(size, count);
      const game = minefield.revealMineCell(initial, first, seeded(first + 1));
      assert.equal(game.mines.filter(Boolean).length, count);
      for (const index of [first, ...minefield.mineNeighbors(size, first)])
        assert.equal(game.mines[index], false);
      assert.equal(game.opened[first], true);
      game.opened.forEach((opened, index) => {
        if (opened) assert.equal(game.mines[index], false);
      });
      assert.ok(initial.mines.every((mine) => !mine));
      assert.ok(initial.opened.every((opened) => !opened));
    }
  }
});

test("扫雷标旗受上限约束，标旗阻止展开，胜负终态拒绝继续操作", () => {
  let game = minefield.createMinefield(4, 1);
  game = minefield.toggleMineFlag(game, 5);
  assert.equal(minefield.toggleMineFlag(game, 6), game);
  assert.equal(minefield.revealMineCell(game, 5), game);
  game = minefield.toggleMineFlag(game, 5);
  assert.equal(game.flags[5], false);
  game = { ...game, mines: [true, ...Array(15).fill(false)], phase: "playing" };
  const flagged = minefield.toggleMineFlag(game, 15);
  let safe = minefield.revealMineCell(flagged, 14);
  assert.equal(safe.opened[15], false);
  safe = minefield.toggleMineFlag(safe, 15);
  safe = minefield.revealMineCell(safe, 15);
  assert.equal(safe.phase, "won");
  assert.equal(safe.opened.filter(Boolean).length, 15);
  assert.equal(minefield.revealMineCell(safe, 0), safe);
  assert.equal(minefield.toggleMineFlag(safe, 0), safe);
  const lost = minefield.revealMineCell(game, 0);
  assert.equal(lost.phase, "lost");
  assert.equal(minefield.revealMineCell(lost, 1), lost);
  assert.equal(minefield.toggleMineFlag(lost, 1), lost);
  assert.equal(minefield.adjacentMines(game, 5), 1);
  assert.equal(minefield.revealMineCell(game, -1), game);
  assert.throws(() => minefield.createMinefield(4, 8));
});

test("色彩漫游只改变左上角连通区域，相邻同色合并，原棋盘不被修改", () => {
  const board = [0, 0, 1, 2, 1, 1, 2, 2, 1];
  const next = colorGames.floodColor(board, 3, 1);
  assert.deepEqual(next, [1, 1, 1, 2, 1, 1, 2, 2, 1]);
  assert.equal(colorGames.colorGroup(next, 3, 0).length, 6);
  assert.ok(colorGames.floodColor(next, 3, 2).every((color) => color === 2));
  assert.deepEqual(board, [0, 0, 1, 2, 1, 1, 2, 2, 1]);
  assert.equal(colorGames.floodColor(board, 3, 0), board);
  assert.equal(colorGames.floodColor(board, 3, -1), board);
  assert.deepEqual(colorGames.colorGroup([0, 1, 1, 0], 2, 0), [0]);
  for (const colors of [4, 5]) {
    const generated = colorGames.createColorBoard(8, 7, colors, () => 0);
    assert.equal(generated.length, 56);
    assert.ok(generated.some((color) => color !== generated[0]));
    assert.ok(colorGames.canPopColors(generated, 7));
  }
});

test("泡泡连消计算得分、向下落子并向左收拢，隔行边缘和孤立泡泡不能消除", () => {
  const board = [0, 1, 2, 0, 1, 2, 3, 1, 2];
  const result = colorGames.popColors(board, 3, 1);
  assert.deepEqual(result.removed, [1, 4, 7]);
  assert.equal(result.points, 30);
  assert.deepEqual(result.board, [0, 2, null, 0, 2, null, 3, 2, null]);
  assert.deepEqual(board, [0, 1, 2, 0, 1, 2, 3, 1, 2]);
  const dropped = colorGames.popColors(result.board, 3, 0);
  assert.deepEqual(dropped.board, [null, 2, null, null, 2, null, 3, 2, null]);
  const isolated = [0, 1, 1, 2];
  assert.equal(colorGames.canPopColors(isolated, 2), false);
  assert.equal(colorGames.popColors(isolated, 2, 1).board, isolated);
  assert.equal(colorGames.popColors(isolated, 2, -1).points, 0);
  assert.ok(
    colorGames
      .popColors([0, 0, 0, 0], 2, 0)
      .board.every((color) => color === null),
  );
  assert.equal(colorGames.canPopColors([null, null, null, null], 2), false);
});

test("翻灯页面支持提示、获胜锁定、撤销、重开，隐藏时不响应操作", async (t) => {
  const { model, props } = mount(t, "LightsPuzzle", {
    "@/shared/lib/random": { randomInt: () => 0 },
  });
  props.active = false;
  model.play(0);
  assert.equal(model.moves.value, 0);
  props.active = true;
  model.showHint();
  assert.ok(model.hint.value >= 0);
  model.play(model.hint.value);
  assert.equal(model.won.value, true);
  model.play(0);
  assert.equal(model.moves.value, 1);
  model.undo();
  assert.equal(model.won.value, false);
  assert.equal(model.moves.value, 0);
  model.restart(5);
  assert.equal(model.puzzle.value.board.length, 25);
  assert.equal(model.history.value.length, 0);
  assert.equal(model.hint.value, -1);
  for (let step = 0; step < 201; step++) model.play(0);
  assert.equal(model.moves.value, 201);
  assert.equal(model.history.value.length, 100);
});

test("扫雷页面的手机标旗、切换保留局面、终态及重开正常", async (t) => {
  const { model, props } = mount(t, "Minesweeper");
  model.flagMode.value = true;
  model.play(0);
  assert.equal(model.game.value.flags[0], true);
  assert.equal(model.game.value.phase, "ready");
  props.active = false;
  const paused = model.game.value;
  model.play(1);
  assert.equal(model.game.value, paused);
  props.active = true;
  model.play(0);
  assert.equal(model.game.value.flags[0], false);
  model.flagMode.value = false;
  model.play(0);
  assert.equal(model.game.value.opened[0], true);
  assert.ok(model.cellLabel(0).includes("已翻开"));
  model.restart(8);
  assert.equal(model.game.value.mines.length, 64);
  assert.equal(model.game.value.mineCount, 10);
  assert.equal(model.game.value.phase, "ready");
  assert.equal(model.flagMode.value, false);
});

test("漫游页面同色不计步，完成、撤销和切换正常，重开清除旧局", async (t) => {
  const { model, props } = mount(t, "ColorFlood", {
    "@/shared/lib/random": { randomInt: () => 0 },
  });
  model.choose(0);
  assert.equal(model.moves.value, 0);
  props.active = false;
  model.choose(1);
  assert.equal(model.moves.value, 0);
  props.active = true;
  model.choose(1);
  assert.equal(model.won.value, true);
  assert.equal(model.moves.value, 1);
  model.choose(2);
  assert.equal(model.moves.value, 1);
  model.undo();
  assert.equal(model.won.value, false);
  assert.equal(model.moves.value, 0);
  model.restart(8);
  assert.equal(model.board.value.length, 64);
  assert.equal(model.history.value.length, 0);
});

test("消消乐页面完整清空只奖励一次，撤销恢复棋盘和分数，隐藏局面不被修改", async (t) => {
  const { model, props } = mount(t, "BubblePop");
  model.board.value = Array(56).fill(0);
  props.active = false;
  model.pop(0);
  assert.equal(model.score.value, 0);
  props.active = true;
  model.pop(0);
  assert.equal(model.won.value, true);
  assert.equal(model.totalScore.value, 15900);
  model.pop(1);
  assert.equal(model.totalScore.value, 15900);
  model.undo();
  assert.equal(model.score.value, 0);
  assert.equal(model.rounds.value, 0);
  assert.equal(model.remaining.value, 56);
  assert.equal(model.ended.value, false);
  assert.deepEqual(model.burst.value, []);
  model.restart();
  assert.equal(model.history.value.length, 0);
  assert.equal(model.score.value, 0);
  assert.equal(model.remaining.value, 56);
});
