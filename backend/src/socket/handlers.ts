// ============================================================
// Dots & Boxes Backend — Socket.io Event Handlers
// All game socket events are handled here with validation,
// rate limiting, and structured logging.
// ============================================================

import { Server, Socket } from 'socket.io';
import {
  applyMove,
  normalizeLine,
  PlayerInfo,
  RECONNECT_TIMEOUT_SECONDS,
} from 'dots-and-boxes-shared';
import { roomManager } from '../game/roomManager';
import {
  validateCreateRoom,
  validateJoinRoom,
  validateRejoinRoom,
  validateStartGame,
  validateMakeMove,
} from './validation';
import { checkRateLimit, cleanupRateLimit } from '../middleware/rateLimiter';
import logger from '../utils/logger';

/**
 * Register all socket event handlers for a connected client.
 */
export function registerHandlers(io: Server, socket: Socket): void {
  logger.info({ socketId: socket.id }, 'Client connected');

  // ─── Create Room ───────────────────────────────────────

  socket.on('createRoom', (data: unknown) => {
    if (!checkRateLimit(socket.id, 'createRoom')) {
      socket.emit('error', { message: 'Too many requests. Please wait.', code: 'RATE_LIMITED' });
      return;
    }

    const validation = validateCreateRoom(data);
    if (!validation.valid || !validation.payload) {
      socket.emit('error', { message: validation.error || 'Invalid request.', code: 'VALIDATION_ERROR' });
      return;
    }

    const { gridSize, maxPlayers, playerInfo } = validation.payload;
    const info: PlayerInfo = { ...playerInfo, id: socket.id };

    const { roomId, room } = roomManager.createRoom(gridSize, maxPlayers, info);
    socket.join(roomId);

    socket.emit('roomCreated', { roomId });
    io.to(roomId).emit('waitingForPlayers', {
      players: room.players,
      maxPlayers: room.state.maxPlayers,
      creator: room.creator,
    });
  });

  // ─── Join Room ─────────────────────────────────────────

  socket.on('joinRoom', (data: unknown) => {
    const validation = validateJoinRoom(data);
    if (!validation.valid || !validation.payload) {
      socket.emit('error', { message: validation.error || 'Invalid request.', code: 'VALIDATION_ERROR' });
      return;
    }

    const { roomId, playerInfo } = validation.payload;
    const info: PlayerInfo = { ...playerInfo, id: socket.id };

    const result = roomManager.joinRoom(roomId, info);
    if (!result.success || !result.room) {
      socket.emit('error', { message: result.error || 'Cannot join room.', code: 'JOIN_FAILED' });
      return;
    }

    socket.join(roomId);
    io.to(roomId).emit('waitingForPlayers', {
      players: result.room.players,
      maxPlayers: result.room.state.maxPlayers,
      creator: result.room.creator,
    });
  });

  // ─── Rejoin Room (Reconnection) ────────────────────────

  socket.on('rejoinRoom', (data: unknown) => {
    const validation = validateRejoinRoom(data);
    if (!validation.valid || !validation.payload) {
      socket.emit('error', { message: validation.error || 'Invalid request.', code: 'VALIDATION_ERROR' });
      return;
    }

    const { roomId, playerId } = validation.payload;
    const result = roomManager.rejoinRoom(roomId, playerId, socket.id);

    if (!result.success || !result.room) {
      socket.emit('error', { message: result.error || 'Cannot rejoin.', code: 'REJOIN_FAILED' });
      return;
    }

    socket.join(roomId);

    // Notify all players about the reconnection
    io.to(roomId).emit('playerReconnected', {
      playerInfo: result.room.players[result.playerIndex!],
      playerIndex: result.playerIndex,
    });

    // Send current game state to the reconnected player
    socket.emit('updateGame', { state: result.room.state });
  });

  // ─── Start Game ────────────────────────────────────────

  socket.on('startGame', (data: unknown) => {
    const validation = validateStartGame(data);
    if (!validation.valid || !validation.payload) {
      socket.emit('error', { message: validation.error || 'Invalid request.', code: 'VALIDATION_ERROR' });
      return;
    }

    const { roomId } = validation.payload;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found.', code: 'NOT_FOUND' });
      return;
    }

    if (room.creator !== socket.id) {
      socket.emit('error', { message: 'Only the room creator can start the game.', code: 'UNAUTHORIZED' });
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start.', code: 'NOT_ENOUGH_PLAYERS' });
      return;
    }

    room.state.started = true;
    logger.info({ roomId, playerCount: room.players.length }, 'Game started');

    io.to(roomId).emit('startGame', { state: room.state });
  });

  // ─── Make Move ─────────────────────────────────────────

  socket.on('makeMove', (data: unknown) => {
    if (!checkRateLimit(socket.id, 'makeMove')) {
      socket.emit('invalidMove', { message: 'Too many moves. Slow down.', reason: 'RATE_LIMITED' as const });
      return;
    }

    // Pre-validate roomId before full validation (need gridSize)
    if (!data || typeof data !== 'object') {
      socket.emit('invalidMove', { message: 'Invalid payload.', reason: 'INVALID_LINE' as const });
      return;
    }

    const d = data as Record<string, unknown>;
    const room = roomManager.getRoom(d.roomId as string);
    if (!room) {
      socket.emit('error', { message: 'Room not found.', code: 'NOT_FOUND' });
      return;
    }

    const validation = validateMakeMove(data, room.state.gridSize);
    if (!validation.valid || !validation.payload) {
      socket.emit('invalidMove', { message: validation.error || 'Invalid move.', reason: 'INVALID_LINE' as const });
      return;
    }

    const { roomId, line } = validation.payload;

    if (!room.state.started) {
      socket.emit('invalidMove', { message: 'Game not started.', reason: 'GAME_NOT_STARTED' as const });
      return;
    }

    if (room.state.gameOver) {
      socket.emit('invalidMove', { message: 'Game is over.', reason: 'GAME_OVER' as const });
      return;
    }

    // ─── TURN VALIDATION (Anti-cheat) ───────────────────
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) {
      socket.emit('invalidMove', { message: 'You are not in this room.', reason: 'NOT_YOUR_TURN' as const });
      return;
    }

    if (room.state.currentPlayer !== playerIndex) {
      socket.emit('invalidMove', { message: 'Not your turn.', reason: 'NOT_YOUR_TURN' as const });
      return;
    }

    // Apply the move using shared game logic
    const newState = applyMove(room.state, normalizeLine(line), playerIndex);
    if (!newState) {
      socket.emit('invalidMove', { message: 'Invalid move.', reason: 'LINE_TAKEN' as const });
      return;
    }

    roomManager.updateState(roomId, newState);

    // Broadcast updated state
    io.to(roomId).emit('updateGame', { state: newState });

    // Check for game over
    if (newState.gameOver) {
      const winnerIndex = newState.winner;
      const winnerName = winnerIndex !== null ? room.players[winnerIndex]?.name : null;
      const isDraw = winnerIndex === null;

      logger.info({ roomId, winner: winnerName, scores: newState.scores, isDraw }, 'Game over');

      io.to(roomId).emit('gameOver', {
        state: newState,
        winner: winnerIndex,
        winnerName,
        isDraw,
      });
    }
  });

  // ─── Disconnect ────────────────────────────────────────

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');

    const result = roomManager.handleDisconnect(socket.id);
    cleanupRateLimit(socket.id);

    if (result) {
      const { roomId, room, playerIndex } = result;

      if (room.state.started && !room.state.gameOver) {
        // Game in progress: notify others about disconnect
        io.to(roomId).emit('playerDisconnected', {
          playerInfo: room.players[playerIndex],
          playerIndex,
          reconnectTimeout: RECONNECT_TIMEOUT_SECONDS,
        });
      } else {
        // Not started or game over: update waiting room
        io.to(roomId).emit('waitingForPlayers', {
          players: room.players,
          maxPlayers: room.state.maxPlayers,
          creator: room.creator,
        });
      }
    }
  });
}
