// ============================================================
// Board — Pure rendering component for the game board
// Renders dots, lines, and boxes using shared constants.
// ============================================================

import React, { useCallback, useMemo } from "react";
import {
  GameState,
  Line,
  normalizeLine,
  isSameLine,
  DOT_SPACING,
} from "dots-and-boxes-shared";
import "./GameBoard.css";

interface BoardProps {
  state: GameState;
  colors: string[];
  canInteract: boolean;
  onLineClick: (line: Line) => void;
  /** Recently completed box keys for animation */
  newBoxes?: string[];
  /** Recently drawn line key for animation */
  lastLine?: Line | null;
}

const Board: React.FC<BoardProps> = ({
  state,
  colors,
  canInteract,
  onLineClick,
  newBoxes = [],
  lastLine = null,
}) => {
  const { gridSize, lines, boxes } = state;

  // Pre-build a set of taken line keys for O(1) lookup
  const takenSet = useMemo(() => {
    const set = new Set<string>();
    for (const l of lines) {
      set.add(`${l[0]},${l[1]},${l[2]},${l[3]}`);
    }
    return set;
  }, [lines]);

  const isLineTaken = useCallback(
    (line: Line): boolean => {
      const n = normalizeLine(line);
      return takenSet.has(`${n[0]},${n[1]},${n[2]},${n[3]}`);
    },
    [takenSet],
  );

  const isLastLine = useCallback(
    (line: Line): boolean => {
      if (!lastLine) return false;
      return isSameLine(normalizeLine(line), normalizeLine(lastLine));
    },
    [lastLine],
  );

  const newBoxSet = useMemo(() => new Set(newBoxes), [newBoxes]);

  const gridPixelSize = (gridSize - 1) * DOT_SPACING;
  const boardSize = gridPixelSize + DOT_SPACING; // padding around grid

  // ─── Dots ──────────────────────────────────────────────
  const dotElements = useMemo(() => {
    const dots: React.ReactNode[] = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        dots.push(
          <div
            key={`dot-${x}-${y}`}
            className="dot"
            style={{
              left: `${x * DOT_SPACING}px`,
              top: `${y * DOT_SPACING}px`,
            }}
          />,
        );
      }
    }
    return dots;
  }, [gridSize]);

  // ─── Lines ─────────────────────────────────────────────
  const lineElements = useMemo(() => {
    const result: React.ReactNode[] = [];

    // Horizontal lines
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize - 1; x++) {
        const line: Line = [x, y, x + 1, y];
        const taken = isLineTaken(line);
        const isNew = isLastLine(line);
        const clickable = canInteract && !taken;

        result.push(
          <div
            key={`hline-${x}-${y}`}
            className={[
              "line",
              "hline",
              taken ? "taken" : "",
              clickable ? "clickable" : "",
              isNew ? "line-new" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: `${x * DOT_SPACING + 6}px`,
              top: `${y * DOT_SPACING - 4}px`,
              background: taken ? "#888" : undefined,
            }}
            onClick={clickable ? () => onLineClick(line) : undefined}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={
              clickable
                ? `Draw line from (${x},${y}) to (${x + 1},${y})`
                : undefined
            }
          />,
        );
      }
    }

    // Vertical lines
    for (let y = 0; y < gridSize - 1; y++) {
      for (let x = 0; x < gridSize; x++) {
        const line: Line = [x, y, x, y + 1];
        const taken = isLineTaken(line);
        const isNew = isLastLine(line);
        const clickable = canInteract && !taken;

        result.push(
          <div
            key={`vline-${x}-${y}`}
            className={[
              "line",
              "vline",
              taken ? "taken" : "",
              clickable ? "clickable" : "",
              isNew ? "line-new" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: `${x * DOT_SPACING - 4}px`,
              top: `${y * DOT_SPACING + 6}px`,
              background: taken ? "#888" : undefined,
            }}
            onClick={clickable ? () => onLineClick(line) : undefined}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={
              clickable
                ? `Draw line from (${x},${y}) to (${x},${y + 1})`
                : undefined
            }
          />,
        );
      }
    }

    return result;
  }, [gridSize, isLineTaken, isLastLine, canInteract, onLineClick]);

  // ─── Boxes ─────────────────────────────────────────────
  const boxElements = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let y = 0; y < gridSize - 1; y++) {
      for (let x = 0; x < gridSize - 1; x++) {
        const key = `${x},${y}`;
        const owner = boxes[key];
        const isNewBox = newBoxSet.has(key);

        result.push(
          <div
            key={`box-${key}`}
            className={[
              "box",
              owner !== undefined ? "box-filled" : "",
              isNewBox ? "box-new" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: `${x * DOT_SPACING + 4}px`,
              top: `${y * DOT_SPACING + 4}px`,
              background:
                owner !== undefined
                  ? (colors[owner] || "#888") + "44"
                  : "transparent",
              border:
                owner !== undefined
                  ? `2px solid ${colors[owner] || "#888"}`
                  : "2px solid transparent",
            }}
          />,
        );
      }
    }
    return result;
  }, [gridSize, boxes, colors, newBoxSet]);

  return (
    <div
      className="board-container"
      style={{ width: boardSize, height: boardSize }}
    >
      <div
        className="grid-inner"
        style={{
          width: `${gridPixelSize}px`,
          height: `${gridPixelSize}px`,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {boxElements}
        {lineElements}
        {dotElements}
      </div>
    </div>
  );
};

export default React.memo(Board);
