// ============================================================
// useGameState — Manages local game state transitions
// Uses shared game logic for move application.
// ============================================================

import { useState, useCallback } from 'react';
import {
  GameState,
  Line,
  PlayerIndex,
  createInitialState,
  applyMove,
  normalizeLine,
} from 'dots-and-boxes-shared';

interface UseGameStateReturn {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  makeLocalMove: (line: Line, playerIndex: PlayerIndex) => boolean;
  resetGame: (gridSize: number, playerCount: number) => void;
}

export function useGameState(gridSize: number, playerCount: number): UseGameStateReturn {
  const [state, setState] = useState<GameState>(() =>
    createInitialState(gridSize, playerCount)
  );

  const makeLocalMove = useCallback((line: Line, playerIndex: PlayerIndex): boolean => {
    const normalized = normalizeLine(line);
    const newState = applyMove(state, normalized, playerIndex);
    if (!newState) return false;
    setState(newState);
    return true;
  }, [state]);

  const resetGame = useCallback((newGridSize: number, newPlayerCount: number) => {
    setState(createInitialState(newGridSize, newPlayerCount));
  }, []);

  return { state, setState, makeLocalMove, resetGame };
}
