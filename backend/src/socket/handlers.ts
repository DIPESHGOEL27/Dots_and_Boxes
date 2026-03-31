// ============================================================
// Dots & Boxes Backend — Socket.io Event Handlers
// All game socket events are handled here with validation,
// rate limiting, and structured logging.
// ============================================================

import { Server, Socket } from "socket.io";
import {
  applyMove,
  normalizeLine,
  PlayerInfo,
  RECONNECT_TIMEOUT_SECONDS,
} from "dots-and-boxes-shared";
import { roomManager } from "../game/roomManager";
import {
  validateCreateRoom,
  validateJoinRoom,
  validateRejoinRoom,
  validateStartGame,
  validateMakeMove,
} from "./validation";
import { checkRateLimit, cleanupRateLimit } from "../middleware/rateLimiter";
import logger from "../utils/logger";

/**
 * Register all socket event handlers for a connected client.
 */
export function registerHandlers(io: Server, socket: Socket): void {
  logger.info({ socketId: socket.id }, "Client connected");

  // ─── Create Room ───────────────────────────────────────

  socket.on("createRoom", (data: unknown) => {
    if (!checkRateLimit(socket.id, "createRoom")) {
      socket.emit("error", {
        message: "Too many requests. Please wait.",
        code: "RATE_LIMITED",
      });
      return;
    }

    const validation = validateCreateRoom(data);
    if (!validation.valid || !validation.payload) {
      socket.emit("error", {
        message: validation.error || "Invalid request.",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { gridSize, maxPlayers, playerInfo } = validation.payload;
    const info: PlayerInfo = { ...playerInfo };

    const { roomId, room } = roomManager.createRoom(gridSize, maxPlayers, info);
    roomManager.bindSocket(roomId, info.id, socket.id);
    socket.join(roomId);

    socket.emit("roomCreated", { roomId });
    io.to(roomId).emit("waitingForPlayers", {
      players: room.players,
      maxPlayers: room.state.maxPlayers,
      creator: room.creator,
       started: room.state.started,
    });
  });

  // ─── Join Room ─────────────────────────────────────────

  socket.on("joinRoom", (data: unknown) => {
    const validation = validateJoinRoom(data);
    if (!validation.valid || !validation.payload) {
      socket.emit("error", {
        message: validation.error || "Invalid request.",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { roomId, playerInfo } = validation.payload;
    const info: PlayerInfo = { ...playerInfo };

    const result = roomManager.joinRoom(roomId, info);
    if (!result.success || !result.room || !result.roomId) {
      socket.emit("error", {
        message: result.error || "Cannot join room.",
        code: "JOIN_FAILED",
      });
      return;
    }

    roomManager.bindSocket(result.roomId, info.id, socket.id);
    socket.join(result.roomId);
      if (!result.room.state.started) {
        io.to(result.roomId).emit("waitingForPlayers", {
          players: result.room.players,
          maxPlayers: result.room.state.maxPlayers,
          creator: result.room.creator,
          started: result.room.state.started,
        });
      }
  });

  // ─── Rejoin Room (Reconnection) ────────────────────────

  socket.on("rejoinRoom", (data: unknown) => {
    const validation = validateRejoinRoom(data);
    if (!validation.valid || !validation.payload) {
      socket.emit("error", {
        message: validation.error || "Invalid request.",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { roomId, playerId, playerInfo } = validation.payload;
    const result = roomManager.rejoinRoom(roomId, playerId, socket.id, playerInfo);

    if (!result.success || !result.room || !result.roomId) {
      socket.emit("error", {
        message: result.error || "Cannot rejoin.",
        code: "REJOIN_FAILED",
      });
      return;
    }

    socket.join(result.roomId);

    // Sync waiting room player list as source of truth.
      if (!result.room.state.started) {
        io.to(result.roomId).emit("waitingForPlayers", {
          players: result.room.players,
          maxPlayers: result.room.state.maxPlayers,
          creator: result.room.creator,
          started: result.room.state.started,
        });
      }

    // Notify all players only if this was a true reconnection.
    if (result.reconnected) {
      io.to(result.roomId).emit("playerReconnected", {
        playerInfo: result.room.players[result.playerIndex!],
        playerIndex: result.playerIndex,
      });
    }

    // Send current game state to the reconnected player
    socket.emit("updateGame", { state: result.room.state });
  });

  // ─── Start Game ────────────────────────────────────────

  socket.on("startGame", (data: unknown) => {
    const validation = validateStartGame(data);
    if (!validation.valid || !validation.payload) {
      socket.emit("error", {
        message: validation.error || "Invalid request.",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { roomId } = validation.payload;
    const room = roomManager.getRoom(roomId);
    const binding = roomManager.getBindingBySocket(socket.id);
    const playerId = binding?.playerId;

    if (!room) {
      socket.emit("error", { message: "Room not found.", code: "NOT_FOUND" });
      return;
    }

    if (!playerId) {
      socket.emit("error", {
        message: "Session expired. Please rejoin room.",
        code: "SESSION_EXPIRED",
      });
      return;
    }

    if (!binding || roomManager.getRoom(binding.roomId) !== room) {
      socket.emit("error", {
        message: "You are not connected to this room.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    if (room.creator !== playerId) {
      socket.emit("error", {
        message: "Only the room creator can start the game.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    if (room.players.length < 2) {
      socket.emit("error", {
        message: "Need at least 2 players to start.",
        code: "NOT_ENOUGH_PLAYERS",
      });
      return;
    }

    room.state.started = true;
    logger.info({ roomId, playerCount: room.players.length }, "Game started");

    io.to(roomId).emit("startGame", { state: room.state });
  });

  // ─── Make Move ─────────────────────────────────────────

  socket.on("makeMove", (data: unknown) => {
    if (!checkRateLimit(socket.id, "makeMove")) {
      socket.emit("invalidMove", {
        message: "Too many moves. Slow down.",
        reason: "RATE_LIMITED" as const,
      });
      return;
    }

    // Pre-validate roomId before full validation (need gridSize)
    if (!data || typeof data !== "object") {
      socket.emit("invalidMove", {
        message: "Invalid payload.",
        reason: "INVALID_LINE" as const,
      });
      return;
    }

    const d = data as Record<string, unknown>;
    const room = roomManager.getRoom(d.roomId as string);
    if (!room) {
      socket.emit("error", { message: "Room not found.", code: "NOT_FOUND" });
      return;
    }

    const validation = validateMakeMove(data, room.state.gridSize);
    if (!validation.valid || !validation.payload) {
      socket.emit("invalidMove", {
        message: validation.error || "Invalid move.",
        reason: "INVALID_LINE" as const,
      });
      return;
    }

    const { roomId, line } = validation.payload;

    if (!room.state.started) {
      socket.emit("invalidMove", {
        message: "Game not started.",
        reason: "GAME_NOT_STARTED" as const,
      });
      return;
    }

    if (room.state.gameOver) {
      socket.emit("invalidMove", {
        message: "Game is over.",
        reason: "GAME_OVER" as const,
      });
      return;
    }

    // ─── TURN VALIDATION (Anti-cheat) ───────────────────
    const binding = roomManager.getBindingBySocket(socket.id);
    if (!binding) {
      socket.emit("invalidMove", {
        message: "Session expired. Please refresh and rejoin.",
        reason: "NOT_YOUR_TURN" as const,
      });
      return;
    }

    if (roomManager.getRoom(binding.roomId) !== room) {
      socket.emit("invalidMove", {
        message: "You are not in this room.",
        reason: "NOT_YOUR_TURN" as const,
      });
      return;
    }

    const playerIndex = room.players.findIndex((p) => p.id === binding.playerId);
    if (playerIndex === -1) {
      socket.emit("invalidMove", {
        message: "You are not in this room.",
        reason: "NOT_YOUR_TURN" as const,
      });
      return;
    }

    if (room.state.currentPlayer !== playerIndex) {
      socket.emit("invalidMove", {
        message: "Not your turn.",
        reason: "NOT_YOUR_TURN" as const,
      });
      return;
    }

    // Apply the move using shared game logic
    const newState = applyMove(room.state, normalizeLine(line), playerIndex);
    if (!newState) {
      socket.emit("invalidMove", {
        message: "Invalid move.",
        reason: "LINE_TAKEN" as const,
      });
      return;
    }

    roomManager.updateState(roomId, newState);

    // Broadcast updated state
    io.to(roomId).emit("updateGame", { state: newState });

    // Check for game over
    if (newState.gameOver) {
      const winnerIndex = newState.winner;
      const winnerName =
        winnerIndex !== null ? room.players[winnerIndex]?.name : null;
      const isDraw = winnerIndex === null;

      logger.info(
        { roomId, winner: winnerName, scores: newState.scores, isDraw },
        "Game over",
      );

      io.to(roomId).emit("gameOver", {
        state: newState,
        winner: winnerIndex,
        winnerName,
        isDraw,
      });
    }
  });

  // ─── Disconnect ────────────────────────────────────────

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Client disconnected");

    const result = roomManager.handleDisconnect(socket.id);
    roomManager.unbindSocket(socket.id);
    cleanupRateLimit(socket.id);

    if (result) {
      const { roomId, room, playerIndex } = result;

      if (!result.removed && room.state.started && !room.state.gameOver) {
        // Game in progress: notify others about disconnect
        io.to(roomId).emit("playerDisconnected", {
          playerInfo: result.playerInfo,
          playerIndex,
          reconnectTimeout: RECONNECT_TIMEOUT_SECONDS,
        });
      } else {
        // Not started or game over: update waiting room
        io.to(roomId).emit("waitingForPlayers", {
          players: room.players,
          maxPlayers: room.state.maxPlayers,
          creator: room.creator,
           started: room.state.started,
        });
      }
    }
  });
}
