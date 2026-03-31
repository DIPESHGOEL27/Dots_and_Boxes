// ============================================================
// useGameState — Manages local game state transitions
// Uses shared game logic for move application.
// ============================================================

import { useState, useCallback, useRef } from "react";
import {
  GameState,
  Line,
  PlayerIndex,
  createInitialState,
  applyMove,
  normalizeLine,
} from "dots-and-boxes-shared";

interface UseGameStateReturn {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  makeLocalMove: (line: Line, playerIndex: PlayerIndex) => boolean;
  undoLocalMove: () => boolean;
  resetGame: (gridSize: number, playerCount: number) => void;
}

export function useGameState(
  gridSize: number,
  playerCount: number,
): UseGameStateReturn {
  const [state, setState] = useState<GameState>(() =>
    createInitialState(gridSize, playerCount),
  );
  const historyRef = useRef<GameState[]>([]);

  const makeLocalMove = useCallback(
    (line: Line, playerIndex: PlayerIndex): boolean => {
      const normalized = normalizeLine(line);
      let applied = false;

      setState((prevState) => {
        const newState = applyMove(prevState, normalized, playerIndex);
        if (!newState) return prevState;

        historyRef.current.push(prevState);
        applied = true;
        return newState;
      });

      return applied;
    },
    [],
  );

  const undoLocalMove = useCallback((): boolean => {
    const previous = historyRef.current.pop();
    if (!previous) return false;
    setState(previous);
    return true;
  }, []);

  const resetGame = useCallback(
    (newGridSize: number, newPlayerCount: number) => {
      historyRef.current = [];
      setState(createInitialState(newGridSize, newPlayerCount));
    },
    [],
  );

  return { state, setState, makeLocalMove, undoLocalMove, resetGame };
}
