import {
  normalizeLine,
  lineToKey,
  isSameLine,
  isValidLine,
  isValidGridSize,
  isValidPlayerCount,
  isLineTaken,
  isBoxComplete,
  findCompletedBoxes,
  createInitialState,
  totalPossibleLines,
  determineWinner,
  applyMove,
  getAvailableLines,
  countBoxSides,
} from "./gameLogic";
import { Line, GameState } from "./types";

// ─── normalizeLine ──────────────────────────────────────────

describe("normalizeLine", () => {
  it("should keep already normalized lines unchanged", () => {
    expect(normalizeLine([0, 0, 1, 0])).toEqual([0, 0, 1, 0]);
    expect(normalizeLine([0, 0, 0, 1])).toEqual([0, 0, 0, 1]);
  });

  it("should swap reversed horizontal lines", () => {
    expect(normalizeLine([1, 0, 0, 0])).toEqual([0, 0, 1, 0]);
  });

  it("should swap reversed vertical lines", () => {
    expect(normalizeLine([0, 1, 0, 0])).toEqual([0, 0, 0, 1]);
  });

  it("should handle lines at various positions", () => {
    expect(normalizeLine([3, 2, 2, 2])).toEqual([2, 2, 3, 2]);
    expect(normalizeLine([5, 7, 5, 6])).toEqual([5, 6, 5, 7]);
  });
});

// ─── lineToKey ──────────────────────────────────────────────

describe("lineToKey", () => {
  it("should produce consistent keys regardless of direction", () => {
    expect(lineToKey([0, 0, 1, 0])).toBe(lineToKey([1, 0, 0, 0]));
    expect(lineToKey([2, 3, 2, 4])).toBe(lineToKey([2, 4, 2, 3]));
  });

  it("should produce different keys for different lines", () => {
    expect(lineToKey([0, 0, 1, 0])).not.toBe(lineToKey([0, 0, 0, 1]));
  });
});

// ─── isSameLine ─────────────────────────────────────────────

describe("isSameLine", () => {
  it("should match identical lines", () => {
    expect(isSameLine([0, 0, 1, 0], [0, 0, 1, 0])).toBe(true);
  });

  it("should match reversed lines", () => {
    expect(isSameLine([0, 0, 1, 0], [1, 0, 0, 0])).toBe(true);
    expect(isSameLine([3, 4, 3, 5], [3, 5, 3, 4])).toBe(true);
  });

  it("should reject different lines", () => {
    expect(isSameLine([0, 0, 1, 0], [0, 0, 0, 1])).toBe(false);
  });
});

// ─── isValidLine ────────────────────────────────────────────

describe("isValidLine", () => {
  it("should accept valid horizontal lines", () => {
    expect(isValidLine([0, 0, 1, 0], 4)).toBe(true);
    expect(isValidLine([2, 3, 3, 3], 4)).toBe(true);
  });

  it("should accept valid vertical lines", () => {
    expect(isValidLine([0, 0, 0, 1], 4)).toBe(true);
    expect(isValidLine([3, 2, 3, 3], 4)).toBe(true);
  });

  it("should reject diagonal lines", () => {
    expect(isValidLine([0, 0, 1, 1], 4)).toBe(false);
  });

  it("should reject lines spanning more than 1 unit", () => {
    expect(isValidLine([0, 0, 2, 0], 4)).toBe(false);
  });

  it("should reject lines outside grid bounds", () => {
    expect(isValidLine([-1, 0, 0, 0], 4)).toBe(false);
    expect(isValidLine([0, 0, 0, 4], 4)).toBe(false);
    expect(isValidLine([3, 3, 4, 3], 4)).toBe(false);
  });

  it("should reject non-integer coordinates", () => {
    expect(isValidLine([0.5, 0, 1.5, 0], 4)).toBe(false);
  });

  it("should reject malformed input", () => {
    expect(isValidLine([0, 0, 1] as unknown as Line, 4)).toBe(false);
    expect(isValidLine(null as unknown as Line, 4)).toBe(false);
    expect(isValidLine(undefined as unknown as Line, 4)).toBe(false);
  });

  it("should reject same-point lines", () => {
    expect(isValidLine([0, 0, 0, 0], 4)).toBe(false);
  });
});

// ─── isValidGridSize ────────────────────────────────────────

describe("isValidGridSize", () => {
  it("should accept valid grid sizes", () => {
    expect(isValidGridSize(3)).toBe(true);
    expect(isValidGridSize(10)).toBe(true);
    expect(isValidGridSize(5)).toBe(true);
  });

  it("should reject invalid grid sizes", () => {
    expect(isValidGridSize(2)).toBe(false);
    expect(isValidGridSize(11)).toBe(false);
    expect(isValidGridSize(3.5)).toBe(false);
    expect(isValidGridSize(0)).toBe(false);
    expect(isValidGridSize(-1)).toBe(false);
  });
});

// ─── isValidPlayerCount ─────────────────────────────────────

describe("isValidPlayerCount", () => {
  it("should accept valid player counts", () => {
    expect(isValidPlayerCount(2)).toBe(true);
    expect(isValidPlayerCount(3)).toBe(true);
    expect(isValidPlayerCount(4)).toBe(true);
  });

  it("should reject invalid player counts", () => {
    expect(isValidPlayerCount(1)).toBe(false);
    expect(isValidPlayerCount(5)).toBe(false);
    expect(isValidPlayerCount(2.5)).toBe(false);
  });
});

// ─── isLineTaken ────────────────────────────────────────────

describe("isLineTaken", () => {
  it("should detect taken lines using Set", () => {
    const lineSet = new Set([lineToKey([0, 0, 1, 0])]);
    expect(isLineTaken(lineSet, [0, 0, 1, 0])).toBe(true);
    expect(isLineTaken(lineSet, [1, 0, 0, 0])).toBe(true); // reversed
    expect(isLineTaken(lineSet, [0, 0, 0, 1])).toBe(false);
  });

  it("should detect taken lines using array", () => {
    const lineSet = [lineToKey([0, 0, 1, 0])];
    expect(isLineTaken(lineSet, [0, 0, 1, 0])).toBe(true);
    expect(isLineTaken(lineSet, [0, 0, 0, 1])).toBe(false);
  });
});

// ─── isBoxComplete ──────────────────────────────────────────

describe("isBoxComplete", () => {
  it("should return true when all 4 sides are present", () => {
    const lineSet = new Set([
      lineToKey([0, 0, 1, 0]), // top
      lineToKey([0, 1, 1, 1]), // bottom
      lineToKey([0, 0, 0, 1]), // left
      lineToKey([1, 0, 1, 1]), // right
    ]);
    expect(isBoxComplete(0, 0, lineSet)).toBe(true);
  });

  it("should return false when a side is missing", () => {
    const lineSet = new Set([
      lineToKey([0, 0, 1, 0]), // top
      lineToKey([0, 1, 1, 1]), // bottom
      lineToKey([0, 0, 0, 1]), // left
      // missing right
    ]);
    expect(isBoxComplete(0, 0, lineSet)).toBe(false);
  });

  it("should work with reversed line directions", () => {
    const lineSet = new Set([
      lineToKey([1, 0, 0, 0]), // top (reversed)
      lineToKey([1, 1, 0, 1]), // bottom (reversed)
      lineToKey([0, 1, 0, 0]), // left (reversed)
      lineToKey([1, 1, 1, 0]), // right (reversed)
    ]);
    expect(isBoxComplete(0, 0, lineSet)).toBe(true);
  });
});

// ─── findCompletedBoxes ─────────────────────────────────────

describe("findCompletedBoxes", () => {
  it("should find a box completed by a horizontal line", () => {
    // Complete box (0,0) by adding the bottom edge
    const lineSet = new Set([
      lineToKey([0, 0, 1, 0]), // top
      lineToKey([0, 0, 0, 1]), // left
      lineToKey([1, 0, 1, 1]), // right
      lineToKey([0, 1, 1, 1]), // bottom (the new line)
    ]);
    const result = findCompletedBoxes([0, 1, 1, 1], 3, lineSet);
    expect(result).toContain("0,0");
  });

  it("should find a box completed by a vertical line", () => {
    const lineSet = new Set([
      lineToKey([0, 0, 1, 0]), // top
      lineToKey([0, 0, 0, 1]), // left
      lineToKey([0, 1, 1, 1]), // bottom
      lineToKey([1, 0, 1, 1]), // right (the new line)
    ]);
    const result = findCompletedBoxes([1, 0, 1, 1], 3, lineSet);
    expect(result).toContain("0,0");
  });

  it("should find two boxes completed by a shared edge", () => {
    // Line [1, 0, 1, 1] is shared between box (0,0) and box (1,0)
    const lineSet = new Set([
      // Box (0,0)
      lineToKey([0, 0, 1, 0]),
      lineToKey([0, 0, 0, 1]),
      lineToKey([0, 1, 1, 1]),
      // Box (1,0)
      lineToKey([1, 0, 2, 0]),
      lineToKey([1, 1, 2, 1]),
      lineToKey([2, 0, 2, 1]),
      // Shared edge
      lineToKey([1, 0, 1, 1]),
    ]);
    const result = findCompletedBoxes([1, 0, 1, 1], 3, lineSet);
    expect(result).toContain("0,0");
    expect(result).toContain("1,0");
    expect(result.length).toBe(2);
  });

  it("should return empty array when no box is completed", () => {
    const lineSet = new Set([lineToKey([0, 0, 1, 0])]);
    const result = findCompletedBoxes([0, 0, 1, 0], 3, lineSet);
    expect(result).toEqual([]);
  });
});

// ─── createInitialState ─────────────────────────────────────

describe("createInitialState", () => {
  it("should create a valid initial state", () => {
    const state = createInitialState(4, 2);
    expect(state.gridSize).toBe(4);
    expect(state.lines).toEqual([]);
    expect(state.lineSet).toEqual([]);
    expect(state.boxes).toEqual({});
    expect(state.scores).toEqual([0, 0]);
    expect(state.currentPlayer).toBe(0);
    expect(state.maxPlayers).toBe(2);
    expect(state.started).toBe(false);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
  });

  it("should support 4 players", () => {
    const state = createInitialState(5, 4);
    expect(state.scores).toEqual([0, 0, 0, 0]);
    expect(state.maxPlayers).toBe(4);
  });
});

// ─── totalPossibleLines ─────────────────────────────────────

describe("totalPossibleLines", () => {
  it("should calculate correctly for 3x3 grid", () => {
    // 3x3 dots: 2*3*2 = 12 lines
    expect(totalPossibleLines(3)).toBe(12);
  });

  it("should calculate correctly for 4x4 grid", () => {
    // 4x4 dots: 2*4*3 = 24 lines
    expect(totalPossibleLines(4)).toBe(24);
  });

  it("should calculate correctly for 5x5 grid", () => {
    // 5x5 dots: 2*5*4 = 40 lines
    expect(totalPossibleLines(5)).toBe(40);
  });
});

// ─── determineWinner ────────────────────────────────────────

describe("determineWinner", () => {
  it("should return the player with the highest score", () => {
    expect(determineWinner([3, 6])).toBe(1);
    expect(determineWinner([5, 2])).toBe(0);
  });

  it("should return null for a draw", () => {
    expect(determineWinner([4, 4])).toBeNull();
    expect(determineWinner([3, 3, 3])).toBeNull();
  });

  it("should handle 4 players", () => {
    expect(determineWinner([1, 5, 2, 3])).toBe(1);
  });
});

// ─── applyMove ──────────────────────────────────────────────

describe("applyMove", () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState(3, 2);
    state.started = true;
  });

  it("should apply a valid move", () => {
    const newState = applyMove(state, [0, 0, 1, 0], 0);
    expect(newState).not.toBeNull();
    expect(newState!.lines.length).toBe(1);
    expect(newState!.currentPlayer).toBe(1); // turn switches
  });

  it("should reject a move when it is not the player's turn", () => {
    const result = applyMove(state, [0, 0, 1, 0], 1); // player 1, but it's player 0's turn
    expect(result).toBeNull();
  });

  it("should reject duplicate lines", () => {
    const s1 = applyMove(state, [0, 0, 1, 0], 0)!;
    const result = applyMove(s1, [0, 0, 1, 0], 1); // same line
    expect(result).toBeNull();
  });

  it("should reject reversed duplicate lines", () => {
    const s1 = applyMove(state, [0, 0, 1, 0], 0)!;
    const result = applyMove(s1, [1, 0, 0, 0], 1); // reversed
    expect(result).toBeNull();
  });

  it("should keep the current player when a box is completed", () => {
    // Build 3 sides of box (0,0), then complete the 4th
    let s = state;
    s = applyMove(s, [0, 0, 1, 0], 0)!; // player 0, top
    s = applyMove(s, [0, 0, 0, 1], 1)!; // player 1, left
    s = applyMove(s, [1, 0, 1, 1], 0)!; // player 0, right
    // Player 1 completes the bottom → stays player 1
    s = applyMove(s, [0, 1, 1, 1], 1)!; // bottom
    expect(s.scores[1]).toBe(1);
    expect(s.currentPlayer).toBe(1); // keeps turn
  });

  it("should detect game over on 3x3 grid", () => {
    // 3x3 grid has 12 lines. Play them all.
    let s = state;
    s.started = true;
    const allLines: Line[] = [];

    // Horizontal lines
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 2; x++) {
        allLines.push([x, y, x + 1, y]);
      }
    }
    // Vertical lines
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        allLines.push([x, y, x, y + 1]);
      }
    }

    for (const line of allLines) {
      const next = applyMove(s, line, s.currentPlayer);
      if (next) s = next;
    }

    expect(s.gameOver).toBe(true);
    expect(s.lines.length).toBe(12);
  });

  it("should reject moves on invalid lines", () => {
    expect(applyMove(state, [0, 0, 2, 0], 0)).toBeNull(); // too far
    expect(applyMove(state, [-1, 0, 0, 0], 0)).toBeNull(); // out of bounds
    expect(applyMove(state, [0, 0, 1, 1], 0)).toBeNull(); // diagonal
  });

  it("should reject moves when game is over", () => {
    const overState = { ...state, gameOver: true };
    expect(applyMove(overState, [0, 0, 1, 0], 0)).toBeNull();
  });
});

// ─── getAvailableLines ──────────────────────────────────────

describe("getAvailableLines", () => {
  it("should return all lines for an empty board", () => {
    const state = createInitialState(3, 2);
    const available = getAvailableLines(state);
    expect(available.length).toBe(12); // 2*3*2 = 12
  });

  it("should decrease as lines are drawn", () => {
    let state = createInitialState(3, 2);
    state.started = true;
    state = applyMove(state, [0, 0, 1, 0], 0)!;
    const available = getAvailableLines(state);
    expect(available.length).toBe(11);
  });

  it("should return empty array when board is full", () => {
    let state = createInitialState(3, 2);
    state.started = true;

    const allLines: Line[] = [];
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 2; x++) allLines.push([x, y, x + 1, y]);
    }
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) allLines.push([x, y, x, y + 1]);
    }

    for (const line of allLines) {
      const next = applyMove(state, line, state.currentPlayer);
      if (next) state = next;
    }

    expect(getAvailableLines(state).length).toBe(0);
  });
});

// ─── countBoxSides ──────────────────────────────────────────

describe("countBoxSides", () => {
  it("should return 0 for empty board", () => {
    expect(countBoxSides(0, 0, new Set())).toBe(0);
  });

  it("should count individual sides", () => {
    const lineSet = new Set([lineToKey([0, 0, 1, 0])]);
    expect(countBoxSides(0, 0, lineSet)).toBe(1);
  });

  it("should return 4 for a complete box", () => {
    const lineSet = new Set([
      lineToKey([0, 0, 1, 0]),
      lineToKey([0, 1, 1, 1]),
      lineToKey([0, 0, 0, 1]),
      lineToKey([1, 0, 1, 1]),
    ]);
    expect(countBoxSides(0, 0, lineSet)).toBe(4);
  });
});
