// ============================================================
// useGameState hook tests
// ============================================================

import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../hooks/useGameState';
import { Line } from 'dots-and-boxes-shared';

describe('useGameState', () => {
  it('initializes with correct grid size and player count', () => {
    const { result } = renderHook(() => useGameState(4, 2));

    expect(result.current.state.gridSize).toBe(4);
    expect(result.current.state.scores).toEqual([0, 0]);
    expect(result.current.state.currentPlayer).toBe(0);
    expect(result.current.state.lines).toEqual([]);
    expect(result.current.state.started).toBe(false); // server sets started=true
    expect(result.current.state.gameOver).toBe(false);
  });

  it('accepts a valid move', () => {
    const { result } = renderHook(() => useGameState(3, 2));

    const line: Line = [0, 0, 1, 0];
    let success: boolean = false;

    act(() => {
      success = result.current.makeLocalMove(line, 0);
    });

    expect(success).toBe(true);
    expect(result.current.state.lines.length).toBe(1);
  });

  it('rejects a duplicate move', () => {
    const { result } = renderHook(() => useGameState(3, 2));

    const line: Line = [0, 0, 1, 0];

    act(() => {
      result.current.makeLocalMove(line, 0);
    });

    let success: boolean = false;
    act(() => {
      success = result.current.makeLocalMove(line, 1);
    });

    expect(success).toBe(false);
  });

  it('reacts to resetGame', () => {
    const { result } = renderHook(() => useGameState(4, 2));

    act(() => {
      result.current.makeLocalMove([0, 0, 1, 0], 0);
    });

    expect(result.current.state.lines.length).toBe(1);

    act(() => {
      result.current.resetGame(5, 3);
    });

    expect(result.current.state.gridSize).toBe(5);
    expect(result.current.state.scores).toEqual([0, 0, 0]);
    expect(result.current.state.lines).toEqual([]);
  });

  it('switches player after a non-completing move', () => {
    const { result } = renderHook(() => useGameState(3, 2));

    act(() => {
      result.current.makeLocalMove([0, 0, 1, 0], 0);
    });

    expect(result.current.state.currentPlayer).toBe(1);
  });
});
