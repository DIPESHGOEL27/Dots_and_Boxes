import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "./GameBoard.css";

function GameBoard({
  gridSize,
  mode,
  roomId,
  playerColors,
  playerNames,
  localPlayers = 2,
  onBack,
}) {
  const [state, setState] = useState(getDefaultState(gridSize, localPlayers));
  const [room, setRoom] = useState(roomId);
  const [waiting, setWaiting] = useState(false);
  const [players, setPlayers] = useState([]); // for online waiting room
  const [creator, setCreator] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [myPlayerIndex, setMyPlayerIndex] = useState(null);
  const socketRef = useRef(null);
  const [currentLocalPlayer, setCurrentLocalPlayer] = useState(0);
  const [gameStarted, setGameStarted] = useState(mode === "local");

  // Only run socket connection logic once on mount
  useEffect(() => {
    if (mode !== "online") {
      setState(getDefaultState(gridSize, localPlayers));
      setGameStarted(true);
      setCurrentLocalPlayer(0);
      return;
    }
    // Online mode
    let socket = io(
      process.env.REACT_APP_BACKEND_URL || "http://localhost:4000"
    );
    socketRef.current = socket;
    setWaiting(true);
    setGameStarted(false);
    setPlayers([]);
    setCreator(null);
    setIsCreator(false);
    setMyPlayerIndex(null);
    if (room) {
      socket.emit("joinRoom", { roomId: room });
    } else {
      socket.emit("createRoom", {
        gridSize,
        maxPlayers: playerNames.length,
      });
      socket.on("roomCreated", ({ roomId }) => {
        setRoom(roomId);
      });
    }
    socket.on("waitingForPlayers", ({ players, maxPlayers, creator }) => {
      setPlayers(players);
      setCreator(creator);
      setIsCreator(socket.id === creator);
      // Assign myPlayerIndex based on socket id
      const idx = players.indexOf(socket.id);
      setMyPlayerIndex(idx !== -1 ? idx : null);
      setWaiting(true);
      setGameStarted(false);
    });
    socket.on("startGame", ({ state }) => {
      setState(state);
      setWaiting(false);
      setGameStarted(true);
    });
    socket.on("updateGame", ({ state }) => {
      setState(state);
    });
    socket.on("error", ({ message }) => {
      alert(message);
      onBack();
    });
    return () => socket.disconnect();
    // Only run on mount/unmount
    // eslint-disable-next-line
  }, [mode]);

  const handleStartGame = () => {
    if (mode === "online" && isCreator && room) {
      socketRef.current.emit("startGame", { roomId: room });
    }
  };

  const handleLineClick = (line) => {
    if (mode === "online") {
      // Only allow move if it's this client's turn
      // (Online mode: only 2 players, so currentPlayer is 0 or 1)
      // No need for myPlayer state, as only one client can act at a time
      if (waiting) return;
      socketRef.current.emit("makeMove", { roomId: room, line });
    } else {
      // Local mode: allow move if it's the current local player's turn
      if (state.currentPlayer !== currentLocalPlayer) return;
      if (state.lines.some((l) => isSameLine(l, line))) return;
      const newLines = [...state.lines, line];
      const completedBoxes = checkCompletedBoxes(state, line);
      let newBoxes = { ...state.boxes };
      let newScores = [...state.scores];
      let boxCompleted = false;
      completedBoxes.forEach((box) => {
        if (newBoxes[box] === undefined) {
          newBoxes[box] = state.currentPlayer;
          newScores[state.currentPlayer]++;
          boxCompleted = true;
        }
      });
      const nextPlayer = boxCompleted
        ? state.currentPlayer
        : (state.currentPlayer + 1) % localPlayers;
      setState({
        ...state,
        lines: newLines,
        boxes: newBoxes,
        scores: newScores,
        currentPlayer: nextPlayer,
      });
      setCurrentLocalPlayer(nextPlayer);
    }
  };

  // Board rendering helpers
  const renderDots = () => {
    const dots = [];
    for (let y = 0; y < state.gridSize; y++) {
      for (let x = 0; x < state.gridSize; x++) {
        dots.push(
          <div
            key={`dot-${x}-${y}`}
            className="dot"
            style={{ left: `${x * 60}px`, top: `${y * 60}px` }}
          />
        );
      }
    }
    return dots;
  };

  const renderLines = () => {
    const lines = [];
    // Horizontal
    for (let y = 0; y < state.gridSize; y++) {
      for (let x = 0; x < state.gridSize - 1; x++) {
        const line = [x, y, x + 1, y];
        const taken = state.lines.some((l) => isSameLine(l, line));
        lines.push(
          <div
            key={`hline-${x}-${y}`}
            className={`line hline${taken ? " taken" : ""}${
              canDraw(line) ? " clickable" : ""
            }`}
            style={{
              left: `${x * 60 + 6}px`,
              top: `${y * 60 - 4}px`,
              background: taken ? "#888" : undefined,
            }}
            onClick={() => canDraw(line) && handleLineClick(line)}
          />
        );
      }
    }
    // Vertical
    for (let y = 0; y < state.gridSize - 1; y++) {
      for (let x = 0; x < state.gridSize; x++) {
        const line = [x, y, x, y + 1];
        const taken = state.lines.some((l) => isSameLine(l, line));
        lines.push(
          <div
            key={`vline-${x}-${y}`}
            className={`line vline${taken ? " taken" : ""}${
              canDraw(line) ? " clickable" : ""
            }`}
            style={{
              left: `${x * 60 - 4}px`,
              top: `${y * 60 + 6}px`,
              background: taken ? "#888" : undefined,
            }}
            onClick={() => canDraw(line) && handleLineClick(line)}
          />
        );
      }
    }
    return lines;
  };

  const renderBoxes = () => {
    const boxes = [];
    for (let y = 0; y < state.gridSize - 1; y++) {
      for (let x = 0; x < state.gridSize - 1; x++) {
        const owner = state.boxes[`${x},${y}`];
        boxes.push(
          <div
            key={`box-${x}-${y}`}
            className="box"
            style={{
              left: `${x * 60 + 4}px`,
              top: `${y * 60 + 4}px`,
              background:
                owner !== undefined
                  ? playerColors[owner] + "44"
                  : "transparent",
              border:
                owner !== undefined
                  ? `2px solid ${playerColors[owner]}`
                  : "2px solid transparent",
            }}
          />
        );
      }
    }
    return boxes;
  };

  const canDraw = (line) => {
    if (mode === "online") {
      // Only allow move if not waiting, line not taken, and it's this player's turn
      return (
        !waiting &&
        !state.lines.some((l) => isSameLine(l, line)) &&
        myPlayerIndex !== null &&
        state.currentPlayer === myPlayerIndex
      );
    }
    // Local: only allow if it's the current local player's turn and line not taken
    return (
      state.currentPlayer === currentLocalPlayer &&
      !state.lines.some((l) => isSameLine(l, line))
    );
  };

  const isSameLine = (a, b) => {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  };

  // Local mode box check
  function checkCompletedBoxes(state, line) {
    const { gridSize, lines } = state;
    const [x1, y1, x2, y2] = line;
    const allLines = [...lines, line];
    const boxes = [];
    if (x1 === x2 && x1 > 0) {
      const bx = x1 - 1,
        by = Math.min(y1, y2);
      if (isBoxComplete(bx, by, allLines)) boxes.push(`${bx},${by}`);
    }
    if (x1 === x2 && x1 < gridSize - 1) {
      const bx = x1,
        by = Math.min(y1, y2);
      if (isBoxComplete(bx, by, allLines)) boxes.push(`${bx},${by}`);
    }
    if (y1 === y2 && y1 > 0) {
      const bx = Math.min(x1, x2),
        by = y1 - 1;
      if (isBoxComplete(bx, by, allLines)) boxes.push(`${bx},${by}`);
    }
    if (y1 === y2 && y1 < gridSize - 1) {
      const bx = Math.min(x1, x2),
        by = y1;
      if (isBoxComplete(bx, by, allLines)) boxes.push(`${bx},${by}`);
    }
    return boxes;
  }

  function isBoxComplete(x, y, lines) {
    return (
      lines.some(
        (l) => l[0] === x && l[1] === y && l[2] === x + 1 && l[3] === y
      ) &&
      lines.some(
        (l) => l[0] === x && l[1] === y + 1 && l[2] === x + 1 && l[3] === y + 1
      ) &&
      lines.some(
        (l) => l[0] === x && l[1] === y && l[2] === x && l[3] === y + 1
      ) &&
      lines.some(
        (l) => l[0] === x + 1 && l[1] === y && l[2] === x + 1 && l[3] === y + 1
      )
    );
  }

  // Game over check
  const isGameOver =
    state.scores &&
    state.scores.length > 0 &&
    state.lines.length === (state.gridSize - 1) * state.gridSize * 2;
  const winner =
    isGameOver && state.scores && state.scores.length > 0
      ? state.scores.every((v) => v === state.scores[0])
        ? "Draw"
        : (() => {
            const max = Math.max(...state.scores);
            const idx = state.scores.findIndex((v) => v === max);
            return playerNames[idx];
          })()
      : null;

  // Prevent NaN for board size
  // const boardSize = Number.isFinite(state.gridSize) ? state.gridSize * 60 : 240;
  const gridPixelSize = (state.gridSize - 1) * 60;
  const boardSize = gridPixelSize + 60; // 30px margin on all sides
  // const boardSize = (state.gridSize - 1) * 60 + 18;

  // In render
  if (mode === "online" && waiting && !gameStarted) {
    return (
      <div className="game-root">
        <div className="game-header">
          <button className="back-btn" onClick={onBack}>
            &larr; Back
          </button>
        </div>
        <div className="waiting-room">
          <h2>Waiting for players...</h2>
          <div className="room-id" style={{ marginBottom: "1rem" }}>
            Room ID: <b>{room}</b>
          </div>
          <div>
            Players joined: {players.length} / {playerNames.length}
          </div>
          <ul>
            {Array.from({ length: playerNames.length }).map((_, i) => (
              <li key={i} style={{ color: playerColors[i] }}>
                {players[i] ? (
                  playerNames[i]
                ) : (
                  <span style={{ opacity: 0.5 }}>(Waiting...)</span>
                )}
              </li>
            ))}
          </ul>
          {isCreator &&
            players.length >= 2 &&
            players.length <= playerNames.length && (
              <button className="start-btn" onClick={handleStartGame}>
                Start Game
              </button>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="game-root">
      <div className="game-header">
        <button className="back-btn" onClick={onBack}>
          &larr; Back
        </button>
        <div className="scores-block">
          {(state.scores &&
          playerNames &&
          state.scores.length === playerNames.length
            ? playerNames
            : Array.isArray(state.scores)
            ? state.scores.map((_, idx) => `Player ${idx + 1}`)
            : []
          ).map((name, idx) => (
            <div key={name} className="score-row">
              <span
                className={state.currentPlayer === idx ? "active" : ""}
                style={{ color: playerColors[idx] }}
              >
                {name}
              </span>
              <span className="score-value">
                {state.scores && state.scores[idx] !== undefined
                  ? state.scores[idx]
                  : 0}
              </span>
            </div>
          ))}
        </div>
        {mode === "online" && room && (
          <div className="room-id">
            Room: <b>{room}</b>
          </div>
        )}
      </div>
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
          {renderBoxes()}
          {renderLines()}
          {renderDots()}
        </div>
      </div>
      <div className="game-footer">
        {isGameOver ? (
          <div className="winner">
            {winner === "Draw" ? "It's a Draw!" : `${winner} Wins!`}
          </div>
        ) : (
          <div
            className="turn"
            style={{ color: playerColors[state.currentPlayer] }}
          >
            {playerNames[state.currentPlayer]}'s Turn
          </div>
        )}
        {waiting && <div className="waiting">Waiting for opponent...</div>}
      </div>
    </div>
  );
}

function getDefaultState(gridSize, localPlayers) {
  return {
    gridSize,
    lines: [],
    boxes: {},
    scores: Array(localPlayers).fill(0),
    currentPlayer: 0,
  };
}

export default GameBoard;
