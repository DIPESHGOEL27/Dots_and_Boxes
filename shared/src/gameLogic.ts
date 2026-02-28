// ============================================================
// Dots & Boxes — Shared Game Logic
// Canonical game rules used by both client and server.
// All line coordinates are normalized (smaller point first).
// ============================================================

import { GameState, Line, LineKey, BoxKey, PlayerIndex } from './types';
import { MIN_GRID_SIZE, MAX_GRID_SIZE, MIN_PLAYERS, MAX_PLAYERS } from './constants';

// ─── Line Normalization ──────────────────────────────────────

/**
 * Normalize a line so the smaller point comes first.
 * Guarantees consistent comparison regardless of draw direction.
 */
export function normalizeLine(line: Line): Line {
  const [x1, y1, x2, y2] = line;
  if (y1 < y2 || (y1 === y2 && x1 < x2)) {
    return [x1, y1, x2, y2];
  }
  return [x2, y2, x1, y1];
}

/**
 * Serialize a line to a string key for O(1) Set/Map lookups.
 * Always normalizes first.
 */
export function lineToKey(line: Line): LineKey {
  const [x1, y1, x2, y2] = normalizeLine(line);
  return `${x1},${y1}-${x2},${y2}`;
}

/**
 * Check if two lines represent the same edge (direction-agnostic).
 */
export function isSameLine(a: Line, b: Line): boolean {
  return lineToKey(a) === lineToKey(b);
}

// ─── Validation ──────────────────────────────────────────────

/**
 * Validate that a line is a legal move (adjacent dots, within grid bounds).
 */
export function isValidLine(line: Line, gridSize: number): boolean {
  if (!Array.isArray(line) || line.length !== 4) return false;
  const [x1, y1, x2, y2] = line;

  // Must be integers
  if (!Number.isInteger(x1) || !Number.isInteger(y1) ||
      !Number.isInteger(x2) || !Number.isInteger(y2)) return false;

  // Must be within grid bounds
  if (x1 < 0 || x1 >= gridSize || y1 < 0 || y1 >= gridSize) return false;
  if (x2 < 0 || x2 >= gridSize || y2 < 0 || y2 >= gridSize) return false;

  // Must be exactly 1 unit apart (adjacent dots only — no diagonals)
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) return false;

  return true;
}

/**
 * Validate grid size is within allowed bounds.
 */
export function isValidGridSize(gridSize: number): boolean {
  return Number.isInteger(gridSize) && gridSize >= MIN_GRID_SIZE && gridSize <= MAX_GRID_SIZE;
}

/**
 * Validate player count is within allowed bounds.
 */
export function isValidPlayerCount(count: number): boolean {
  return Number.isInteger(count) && count >= MIN_PLAYERS && count <= MAX_PLAYERS;
}

// ─── Line Set Operations ─────────────────────────────────────

/**
 * Check if a line already exists in the line set.
 */
export function isLineTaken(lineSet: Set<LineKey> | string[], line: Line): boolean {
  const key = lineToKey(line);
  if (lineSet instanceof Set) {
    return lineSet.has(key);
  }
  return lineSet.includes(key);
}

// ─── Box Completion ──────────────────────────────────────────

/**
 * Check if all 4 sides of the box at position (x, y) are present.
 * Uses a Set for O(1) lookups.
 */
export function isBoxComplete(x: number, y: number, lineSet: Set<LineKey>): boolean {
  // Top edge
  const top = lineToKey([x, y, x + 1, y]);
  // Bottom edge
  const bottom = lineToKey([x, y + 1, x + 1, y + 1]);
  // Left edge
  const left = lineToKey([x, y, x, y + 1]);
  // Right edge
  const right = lineToKey([x + 1, y, x + 1, y + 1]);

  return lineSet.has(top) && lineSet.has(bottom) && lineSet.has(left) && lineSet.has(right);
}

/**
 * After placing a line, find all boxes that were completed by this move.
 * Returns array of box keys ("x,y") for newly completed boxes.
 */
export function findCompletedBoxes(line: Line, gridSize: number, lineSet: Set<LineKey>): BoxKey[] {
  const [x1, y1, x2, y2] = normalizeLine(line);
  const completedBoxes: BoxKey[] = [];

  const isHorizontal = y1 === y2;
  const isVertical = x1 === x2;

  if (isVertical) {
    // Vertical line: check box to the left and right
    const topY = Math.min(y1, y2);
    // Left box (x-1, topY)
    if (x1 > 0 && isBoxComplete(x1 - 1, topY, lineSet)) {
      completedBoxes.push(`${x1 - 1},${topY}`);
    }
    // Right box (x, topY)
    if (x1 < gridSize - 1 && isBoxComplete(x1, topY, lineSet)) {
      completedBoxes.push(`${x1},${topY}`);
    }
  }

  if (isHorizontal) {
    // Horizontal line: check box above and below
    const leftX = Math.min(x1, x2);
    // Above box (leftX, y-1)
    if (y1 > 0 && isBoxComplete(leftX, y1 - 1, lineSet)) {
      completedBoxes.push(`${leftX},${y1 - 1}`);
    }
    // Below box (leftX, y)
    if (y1 < gridSize - 1 && isBoxComplete(leftX, y1, lineSet)) {
      completedBoxes.push(`${leftX},${y1}`);
    }
  }

  return completedBoxes;
}

// ─── Game State Management ───────────────────────────────────

/**
 * Create a fresh game state for the given grid size and player count.
 */
export function createInitialState(gridSize: number, maxPlayers: number): GameState {
  return {
    gridSize,
    lines: [],
    lineSet: [],
    boxes: {},
    scores: Array(maxPlayers).fill(0),
    currentPlayer: 0,
    maxPlayers,
    started: false,
    gameOver: false,
    winner: null,
  };
}

/**
 * Calculate the total number of possible lines for a given grid size.
 */
export function totalPossibleLines(gridSize: number): number {
  // Horizontal lines: gridSize rows × (gridSize-1) lines per row
  // Vertical lines: (gridSize-1) rows × gridSize lines per row
  return 2 * gridSize * (gridSize - 1);
}

/**
 * Check if the game is over (all lines drawn).
 */
export function isGameOver(state: GameState): boolean {
  return state.lines.length >= totalPossibleLines(state.gridSize);
}

/**
 * Determine the winner. Returns player index, or null for a draw.
 */
export function determineWinner(scores: number[]): PlayerIndex | null {
  const max = Math.max(...scores);
  const winners = scores.filter(s => s === max);
  if (winners.length > 1) return null; // draw
  return scores.indexOf(max);
}

/**
 * Apply a move to the game state. Returns the new state (immutable).
 * This is the canonical move logic used by both client and server.
 *
 * @returns New game state, or null if the move is invalid.
 */
export function applyMove(state: GameState, line: Line, playerIndex: PlayerIndex): GameState | null {
  // Validate the move
  if (!isValidLine(line, state.gridSize)) return null;
  if (state.gameOver) return null;
  if (state.currentPlayer !== playerIndex) return null;

  const normalized = normalizeLine(line);
  const key = lineToKey(normalized);

  // Check for duplicate
  const lineSetAsSet = new Set(state.lineSet);
  if (lineSetAsSet.has(key)) return null;

  // Apply the line
  const newLines = [...state.lines, normalized];
  const newLineSet = [...state.lineSet, key];
  lineSetAsSet.add(key);

  // Check for completed boxes
  const completedBoxes = findCompletedBoxes(normalized, state.gridSize, lineSetAsSet);
  const newBoxes = { ...state.boxes };
  const newScores = [...state.scores];
  let boxCompleted = false;

  for (const boxKey of completedBoxes) {
    if (newBoxes[boxKey] === undefined) {
      newBoxes[boxKey] = playerIndex;
      newScores[playerIndex]++;
      boxCompleted = true;
    }
  }

  // Determine next player (stays the same if a box was completed)
  const nextPlayer = boxCompleted
    ? playerIndex
    : (playerIndex + 1) % state.maxPlayers;

  // Check for game over
  const totalLines = totalPossibleLines(state.gridSize);
  const gameOver = newLines.length >= totalLines;
  const winner = gameOver ? determineWinner(newScores) : null;

  return {
    ...state,
    lines: newLines,
    lineSet: newLineSet,
    boxes: newBoxes,
    scores: newScores,
    currentPlayer: gameOver ? playerIndex : nextPlayer,
    gameOver,
    winner,
  };
}

/**
 * Get all available (undrawn) lines on the board.
 * Used by AI to enumerate possible moves.
 */
export function getAvailableLines(state: GameState): Line[] {
  const lineSet = new Set(state.lineSet);
  const available: Line[] = [];

  // Horizontal lines
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize - 1; x++) {
      const line: Line = [x, y, x + 1, y];
      if (!lineSet.has(lineToKey(line))) {
        available.push(line);
      }
    }
  }

  // Vertical lines
  for (let y = 0; y < state.gridSize - 1; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      const line: Line = [x, y, x, y + 1];
      if (!lineSet.has(lineToKey(line))) {
        available.push(line);
      }
    }
  }

  return available;
}

/**
 * Count how many sides of the box at (x, y) are drawn.
 */
export function countBoxSides(x: number, y: number, lineSet: Set<LineKey>): number {
  let count = 0;
  if (lineSet.has(lineToKey([x, y, x + 1, y]))) count++;       // top
  if (lineSet.has(lineToKey([x, y + 1, x + 1, y + 1]))) count++; // bottom
  if (lineSet.has(lineToKey([x, y, x, y + 1]))) count++;       // left
  if (lineSet.has(lineToKey([x + 1, y, x + 1, y + 1]))) count++; // right
  return count;
}
