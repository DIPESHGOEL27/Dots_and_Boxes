// ============================================================
// useAI — AI opponent logic with multiple difficulty levels
// Runs client-side with a delay to simulate thinking.
// ============================================================

import { useEffect, useRef, useCallback } from "react";
import {
  GameState,
  Line,
  AIDifficulty,
  getAvailableLines,
  applyMove,
  normalizeLine,
  lineToKey,
  countBoxSides,
  findCompletedBoxes,
  AI_MOVE_DELAY_MS,
} from "dots-and-boxes-shared";

// ─── AI Strategy Functions ───────────────────────────────────

/**
 * Easy AI: picks a random available line.
 */
function easyAI(state: GameState): Line | null {
  const available = getAvailableLines(state);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Medium AI: greedy strategy.
 * 1. If a move completes a box, take it.
 * 2. Avoid moves that give the opponent a 3-sided box.
 * 3. Otherwise, pick randomly.
 */
function mediumAI(state: GameState): Line | null {
  const available = getAvailableLines(state);
  if (available.length === 0) return null;

  const lineSet = new Set(state.lineSet);

  // Priority 1: Complete a box
  for (const line of available) {
    const normalized = normalizeLine(line);
    const key = lineToKey(normalized);
    const testSet = new Set(lineSet);
    testSet.add(key);
    const completed = findCompletedBoxes(normalized, state.gridSize, testSet);
    if (completed.length > 0) {
      return line;
    }
  }

  // Priority 2: Avoid creating 3-sided boxes for opponent
  const safeMoves: Line[] = [];
  for (const line of available) {
    const normalized = normalizeLine(line);
    const key = lineToKey(normalized);
    const testSet = new Set(lineSet);
    testSet.add(key);

    let createsDanger = false;
    // Check all boxes adjacent to this line
    for (let y = 0; y < state.gridSize - 1; y++) {
      for (let x = 0; x < state.gridSize - 1; x++) {
        const sides = countBoxSides(x, y, testSet);
        if (sides === 3 && state.boxes[`${x},${y}`] === undefined) {
          createsDanger = true;
          break;
        }
      }
      if (createsDanger) break;
    }

    if (!createsDanger) {
      safeMoves.push(line);
    }
  }

  if (safeMoves.length > 0) {
    return safeMoves[Math.floor(Math.random() * safeMoves.length)];
  }

  // No safe moves — pick the one that creates the fewest 3-sided boxes
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Hard AI: minimax with alpha-beta pruning.
 * Evaluates moves by score differential within a limited depth.
 */
function hardAI(state: GameState, aiPlayerIndex: number): Line | null {
  const available = getAvailableLines(state);
  if (available.length === 0) return null;

  // For small remaining moves, use full minimax; otherwise limit depth
  const maxDepth = available.length <= 12 ? available.length : 6;

  let bestScore = -Infinity;
  let bestMove: Line | null = null;

  for (const line of available) {
    const newState = applyMove(state, normalizeLine(line), state.currentPlayer);
    if (!newState) continue;

    const score = minimax(
      newState,
      maxDepth - 1,
      -Infinity,
      Infinity,
      false,
      aiPlayerIndex,
    );
    if (score > bestScore) {
      bestScore = score;
      bestMove = line;
    }
  }

  return bestMove;
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayerIndex: number,
): number {
  if (depth === 0 || state.gameOver) {
    // Evaluate: score differential from AI's perspective
    const aiScore = state.scores[aiPlayerIndex];
    const opponentScore = state.scores.reduce(
      (sum, s, i) => (i !== aiPlayerIndex ? sum + s : sum),
      0,
    );
    return aiScore - opponentScore;
  }

  const available = getAvailableLines(state);
  if (available.length === 0) {
    const aiScore = state.scores[aiPlayerIndex];
    const opponentScore = state.scores.reduce(
      (sum, s, i) => (i !== aiPlayerIndex ? sum + s : sum),
      0,
    );
    return aiScore - opponentScore;
  }

  if (isMaximizing || state.currentPlayer === aiPlayerIndex) {
    let maxEval = -Infinity;
    for (const line of available) {
      const newState = applyMove(
        state,
        normalizeLine(line),
        state.currentPlayer,
      );
      if (!newState) continue;

      // If current player stays the same (completed a box), stay maximizing/minimizing
      const nextIsMax = newState.currentPlayer === aiPlayerIndex;
      const eval_ = minimax(
        newState,
        depth - 1,
        alpha,
        beta,
        nextIsMax,
        aiPlayerIndex,
      );
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const line of available) {
      const newState = applyMove(
        state,
        normalizeLine(line),
        state.currentPlayer,
      );
      if (!newState) continue;

      const nextIsMax = newState.currentPlayer === aiPlayerIndex;
      const eval_ = minimax(
        newState,
        depth - 1,
        alpha,
        beta,
        nextIsMax,
        aiPlayerIndex,
      );
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// ─── Hook ────────────────────────────────────────────────────

interface UseAIOptions {
  enabled: boolean;
  difficulty: AIDifficulty;
  aiPlayerIndex: number;
  state: GameState;
  onMove: (line: Line) => void;
}

export function useAI({
  enabled,
  difficulty,
  aiPlayerIndex,
  state,
  onMove,
}: UseAIOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computeMove = useCallback(() => {
    let move: Line | null = null;

    switch (difficulty) {
      case "easy":
        move = easyAI(state);
        break;
      case "medium":
        move = mediumAI(state);
        break;
      case "hard":
        move = hardAI(state, aiPlayerIndex);
        break;
    }

    if (move) {
      onMove(move);
    }
  }, [difficulty, state, aiPlayerIndex, onMove]);

  useEffect(() => {
    if (!enabled) return;
    if (state.gameOver) return;
    if (state.currentPlayer !== aiPlayerIndex) return;
    if (!state.started) return;

    // Delay to simulate thinking
    timerRef.current = setTimeout(computeMove, AI_MOVE_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    enabled,
    state.currentPlayer,
    state.gameOver,
    state.started,
    aiPlayerIndex,
    computeMove,
  ]);
}
