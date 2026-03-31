// ============================================================
// GameBoard — Main orchestrator component
// Connects hooks, socket events, and child components.
// Supports local, AI, and online game modes.
// ============================================================

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import toast from "react-hot-toast";
import {
  GameState,
  Line,
  PlayerInfo,
  AIDifficulty,
  normalizeLine,
  totalPossibleLines,
  PLAYER_COLORS,
  DEFAULT_PLAYER_NAMES,
  PLAYER_AVATARS,
} from "dots-and-boxes-shared";
import { useSocket } from "../../hooks/useSocket";
import { useGameState } from "../../hooks/useGameState";
import { useAI } from "../../hooks/useAI";
import { playSound } from "../../utils/sounds";
import Board from "./Board";
import Scoreboard from "./Scoreboard";
import WaitingRoom from "./WaitingRoom";
import GameOver from "./GameOver";
import "./GameBoard.css";

export type GameMode = "local" | "ai" | "online";

interface GameBoardProps {
  gridSize: number;
  mode: GameMode;
  roomId?: string; // For joining an existing room
  playerCount: number; // Number of local or online players
  playerInfo: PlayerInfo; // This player's info
  aiDifficulty?: AIDifficulty;
  onBack: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gridSize,
  mode,
  roomId: initialRoomId,
  playerCount,
  playerInfo,
  aiDifficulty = "medium",
  onBack,
}) => {
  // ─── Socket (only for online mode) ─────────────────────
  const { socket, isConnected, connectionError } = useSocket(mode === "online");

  // ─── Game state ────────────────────────────────────────
  const { state, setState, makeLocalMove, undoLocalMove, resetGame } = useGameState(
    gridSize,
    playerCount,
  );

  // ─── Online room state ─────────────────────────────────
  const [roomId, setRoomId] = useState<string>(initialRoomId || "");
  const [waiting, setWaiting] = useState(mode === "online");
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerInfo[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [myPlayerIndex, setMyPlayerIndex] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState(mode !== "online");

  // ─── Animation state ──────────────────────────────────
  const [lastLine, setLastLine] = useState<Line | null>(null);
  const [newBoxes, setNewBoxes] = useState<string[]>([]);
  const prevScoresRef = useRef<number[]>([]);
  const prevBoxesRef = useRef<Record<string, number>>({});

  // ─── Build players array for local/AI ──────────────────
  const localPlayers: PlayerInfo[] = useMemo(() => {
    if (mode === "online") return onlinePlayers;

    const list: PlayerInfo[] = [playerInfo];

    if (mode === "ai") {
      list.push({
        id: "ai",
        name: `AI (${aiDifficulty[0].toUpperCase() + aiDifficulty.slice(1)})`,
        color: PLAYER_COLORS[1],
        avatar: "🤖",
      });
    } else {
      // Local multiplayer
      for (let i = 1; i < playerCount; i++) {
        list.push({
          id: `local-${i}`,
          name: DEFAULT_PLAYER_NAMES[i],
          color: PLAYER_COLORS[i],
          avatar: PLAYER_AVATARS[i],
        });
      }
    }
    return list;
  }, [mode, playerInfo, playerCount, aiDifficulty, onlinePlayers]);

  const colors = useMemo(
    () => localPlayers.map((p) => p.color),
    [localPlayers],
  );

  // ─── Detect new boxes for animation ────────────────────
  useEffect(() => {
    const prev = prevScoresRef.current;
    if (prev.length > 0 && state.scores.some((s, i) => s > (prev[i] || 0))) {
      playSound("boxComplete");
    }
    prevScoresRef.current = [...state.scores];
  }, [state.scores]);

  useEffect(() => {
    const previousBoxes = prevBoxesRef.current;
    const newlyCompleted = Object.keys(state.boxes).filter(
      (boxKey) => previousBoxes[boxKey] === undefined,
    );

    prevBoxesRef.current = state.boxes;
    if (newlyCompleted.length === 0) return;

    setNewBoxes(newlyCompleted);
    const timer = setTimeout(() => {
      setNewBoxes([]);
    }, 500);

    return () => clearTimeout(timer);
  }, [state.boxes]);

  // ─── Line click handler ────────────────────────────────
  const handleLineClick = useCallback(
    (line: Line) => {
      const normalized = normalizeLine(line);

      if (mode === "online") {
        if (!socket || !isConnected) return;
        socket.emit("makeMove", { roomId, line: normalized });
        playSound("click");
        return;
      }

      // Local & AI modes
      const success = makeLocalMove(normalized, state.currentPlayer);

      if (success) {
        playSound("click");
        setLastLine(normalized);

        // Check for new boxes after a tick (state updates async)
        setTimeout(() => {
          setLastLine(null);
        }, 300);
      }
    },
    [mode, socket, isConnected, roomId, state, makeLocalMove],
  );

  // ─── AI hook ───────────────────────────────────────────
  const aiMoveHandler = useCallback(
    (line: Line) => {
      const normalized = normalizeLine(line);
      const success = makeLocalMove(normalized, state.currentPlayer);
      if (!success) return;

      setLastLine(normalized);
      playSound("click");
      setTimeout(() => setLastLine(null), 300);
    },
    [makeLocalMove, state.currentPlayer],
  );

  useAI({
    enabled: mode === "ai" && gameStarted,
    difficulty: aiDifficulty,
    aiPlayerIndex: 1, // AI is always player 2
    state,
    onMove: aiMoveHandler,
  });

  // ─── Socket events (online mode) ──────────────────────
  useEffect(() => {
    if (mode !== "online" || !socket) return;

    // Create or join room
    if (initialRoomId) {
      socket.emit("joinRoom", { roomId: initialRoomId, playerInfo });
    } else {
      socket.emit("createRoom", {
        gridSize,
        maxPlayers: playerCount,
        playerInfo,
      });
    }

    socket.on("roomCreated", ({ roomId: newRoomId }: { roomId: string }) => {
      setRoomId(newRoomId);
      setIsCreator(true);
    });

    socket.on(
      "waitingForPlayers",
      ({
        players,
        maxPlayers,
        creator,
      }: {
        players: PlayerInfo[];
        maxPlayers: number;
        creator: string;
      }) => {
        setOnlinePlayers(players);
        setIsCreator(socket.id === creator);

        // Find this player's index
        const idx = players.findIndex((p) => p.id === playerInfo.id);
        if (idx !== -1) setMyPlayerIndex(idx);

        setWaiting(true);
        setGameStarted(false);
        playSound("playerJoin");
      },
    );

    socket.on("startGame", ({ state: serverState }: { state: GameState }) => {
      setState(serverState);
      setWaiting(false);
      setGameStarted(true);
      toast.success("Game started!");
    });

    socket.on("updateGame", ({ state: serverState }: { state: GameState }) => {
      setState(serverState);
    });

    socket.on(
      "gameOver",
      ({
        state: serverState,
        winnerName,
        isDraw,
      }: {
        state: GameState;
        winnerName: string | null;
        isDraw: boolean;
      }) => {
        setState(serverState);
        if (isDraw) {
          toast("It's a draw!", { icon: "🤝" });
        } else {
          toast.success(`${winnerName} wins!`);
        }
      },
    );

    socket.on(
      "playerDisconnected",
      ({
        playerInfo: disconnectedPlayer,
        reconnectTimeout,
      }: {
        playerInfo: PlayerInfo;
        reconnectTimeout: number;
      }) => {
        toast(
          `${disconnectedPlayer.name} disconnected. Waiting ${reconnectTimeout}s for reconnection...`,
          {
            icon: "⚡",
            duration: 5000,
          },
        );
      },
    );

    socket.on(
      "playerReconnected",
      ({ playerInfo: reconnectedPlayer }: { playerInfo: PlayerInfo }) => {
        toast.success(`${reconnectedPlayer.name} reconnected!`);
        playSound("playerJoin");
      },
    );

    socket.on("error", ({ message }: { message: string }) => {
      toast.error(message);
      playSound("error");
    });

    socket.on("invalidMove", ({ message }: { message: string }) => {
      toast.error(message);
      playSound("error");
    });

    return () => {
      socket.off("roomCreated");
      socket.off("waitingForPlayers");
      socket.off("startGame");
      socket.off("updateGame");
      socket.off("gameOver");
      socket.off("playerDisconnected");
      socket.off("playerReconnected");
      socket.off("error");
      socket.off("invalidMove");
    };
  }, [
    mode,
    socket,
    initialRoomId,
    gridSize,
    playerCount,
    playerInfo,
    setState,
  ]);

  // ─── Connection error handling ─────────────────────────
  useEffect(() => {
    if (connectionError) {
      toast.error(connectionError);
    }
  }, [connectionError]);

  // ─── Start game handler (online, creator only) ─────────
  const handleStartGame = useCallback(() => {
    if (socket && isCreator && roomId) {
      socket.emit("startGame", { roomId });
    }
  }, [socket, isCreator, roomId]);

  // ─── Play again ────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    resetGame(gridSize, playerCount);
    setLastLine(null);
    setNewBoxes([]);
    prevScoresRef.current = [];
    prevBoxesRef.current = {};
  }, [gridSize, playerCount, resetGame]);

  const handleUndoMove = useCallback(() => {
    if (mode !== "local") return;
    const didUndo = undoLocalMove();
    if (!didUndo) return;

    setLastLine(null);
    setNewBoxes([]);
    playSound("click");
  }, [mode, undoLocalMove]);

  // ─── Can this player interact? ─────────────────────────
  const canInteract = useMemo(() => {
    if (!gameStarted) return false;
    if (state.gameOver) return false;

    if (mode === "online") {
      return state.currentPlayer === myPlayerIndex;
    }
    if (mode === "ai") {
      return state.currentPlayer === 0; // Human is always player 0
    }
    return true; // Local: all players can interact
  }, [gameStarted, state.gameOver, state.currentPlayer, mode, myPlayerIndex]);

  const totalLines = useMemo(() => totalPossibleLines(state.gridSize), [state.gridSize]);
  const movesRemaining = totalLines - state.lines.length;

  // ─── Waiting room (online, pre-game) ──────────────────
  if (mode === "online" && waiting && !gameStarted) {
    return (
      <WaitingRoom
        roomId={roomId}
        players={onlinePlayers}
        maxPlayers={playerCount}
        isCreator={isCreator}
        colors={[...PLAYER_COLORS]}
        onStartGame={handleStartGame}
        onBack={onBack}
      />
    );
  }

  // ─── Game over overlay ─────────────────────────────────
  const showGameOver = state.gameOver && gameStarted;

  return (
    <div className="game-root">
      {/* Header */}
      <div className="game-header">
        <div className="game-actions">
          <button
            className="back-btn"
            onClick={onBack}
            aria-label="Back to lobby"
          >
            &larr; Back
          </button>
          {mode === "local" && (
            <button
              className="undo-btn"
              onClick={handleUndoMove}
              disabled={!gameStarted || state.lines.length === 0}
              aria-label="Undo last move"
            >
              ↶ Undo
            </button>
          )}
        </div>

        <Scoreboard
          players={localPlayers}
          scores={state.scores}
          currentPlayer={state.currentPlayer}
          colors={colors}
        />

        {mode === "online" && roomId && (
          <div className="room-id">
            Room: <b>{roomId.slice(0, 8)}</b>
          </div>
        )}
      </div>

      {/* Board */}
      <Board
        state={state}
        colors={colors}
        previewColor={colors[state.currentPlayer] || "#00bcd4"}
        canInteract={canInteract}
        onLineClick={handleLineClick}
        newBoxes={newBoxes}
        lastLine={lastLine}
      />

      {/* Footer */}
      <div className="game-footer">
        <div className="game-meta">
          <span className="meta-pill">Grid {state.gridSize}x{state.gridSize}</span>
          <span className="meta-pill">Moves Left: {Math.max(0, movesRemaining)}</span>
          {mode === "ai" && (
            <span className="meta-pill">AI: {aiDifficulty}</span>
          )}
        </div>
        {!state.gameOver && gameStarted && (
          <div className="turn" style={{ color: colors[state.currentPlayer] }}>
            {localPlayers[state.currentPlayer]?.avatar}{" "}
            {localPlayers[state.currentPlayer]?.name}&apos;s Turn
            {mode === "ai" && state.currentPlayer === 1 && (
              <span className="thinking-indicator"> 🤔 Thinking...</span>
            )}
          </div>
        )}
      </div>

      {/* Game Over */}
      {showGameOver && (
        <GameOver
          players={localPlayers}
          scores={state.scores}
          colors={colors}
          winner={state.winner}
          onPlayAgain={handlePlayAgain}
          onBackToLobby={onBack}
        />
      )}
    </div>
  );
};

export default GameBoard;
