// ============================================================
// Dots & Boxes Backend — Room Manager
// Handles room lifecycle: create, join, cleanup, TTL expiry.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Room,
  PlayerInfo,
  GameState,
  RoomId,
} from 'dots-and-boxes-shared';
import {
  createInitialState,
  isValidGridSize,
  isValidPlayerCount,
} from 'dots-and-boxes-shared';
import {
  ROOM_TTL_MS,
  ROOM_CLEANUP_INTERVAL_MS,
  RECONNECT_TIMEOUT_SECONDS,
  DEFAULT_GRID_SIZE,
  DEFAULT_PLAYERS,
} from 'dots-and-boxes-shared';
import logger from '../utils/logger';

class RoomManager {
  private rooms = new Map<RoomId, Room>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => this.cleanupExpiredRooms(), ROOM_CLEANUP_INTERVAL_MS);
  }

  /**
   * Create a new game room.
   */
  createRoom(gridSize: number, maxPlayers: number, creatorInfo: PlayerInfo): { roomId: RoomId; room: Room } {
    const validGridSize = isValidGridSize(gridSize) ? gridSize : DEFAULT_GRID_SIZE;
    const validMaxPlayers = isValidPlayerCount(maxPlayers) ? maxPlayers : DEFAULT_PLAYERS;

    const roomId = uuidv4();
    const room: Room = {
      players: [creatorInfo],
      state: createInitialState(validGridSize, validMaxPlayers),
      creator: creatorInfo.id,
      createdAt: Date.now(),
      disconnectedPlayers: new Map(),
    };

    this.rooms.set(roomId, room);
    logger.info({ roomId, gridSize: validGridSize, maxPlayers: validMaxPlayers, creator: creatorInfo.id }, 'Room created');

    return { roomId, room };
  }

  /**
   * Join an existing room.
   */
  joinRoom(roomId: RoomId, playerInfo: PlayerInfo): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found.' };
    }

    if (room.state.started) {
      return { success: false, error: 'Game already in progress.' };
    }

    if (room.players.length >= room.state.maxPlayers) {
      return { success: false, error: 'Room is full.' };
    }

    // Check if player is already in the room
    if (room.players.some(p => p.id === playerInfo.id)) {
      return { success: true, room };
    }

    room.players.push(playerInfo);
    logger.info({ roomId, playerId: playerInfo.id, playerCount: room.players.length }, 'Player joined room');

    return { success: true, room };
  }

  /**
   * Attempt to rejoin a room after disconnect.
   */
  rejoinRoom(roomId: RoomId, playerId: string, newSocketId: string): {
    success: boolean;
    room?: Room;
    playerIndex?: number;
    error?: string;
  } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found.' };
    }

    const disconnected = room.disconnectedPlayers.get(playerId);
    if (!disconnected) {
      return { success: false, error: 'No reconnection available.' };
    }

    // Restore the player with the new socket id
    const restoredInfo: PlayerInfo = {
      ...disconnected.playerInfo,
      id: newSocketId,
    };

    room.players[disconnected.playerIndex] = restoredInfo;
    room.disconnectedPlayers.delete(playerId);

    // Update creator if needed
    if (room.creator === playerId) {
      room.creator = newSocketId;
    }

    logger.info({ roomId, oldId: playerId, newId: newSocketId, playerIndex: disconnected.playerIndex }, 'Player reconnected');

    return { success: true, room, playerIndex: disconnected.playerIndex };
  }

  /**
   * Handle a player disconnecting from a room.
   */
  handleDisconnect(socketId: string): { roomId: RoomId; room: Room; playerIndex: number } | null {
    for (const [roomId, room] of this.rooms) {
      const playerIndex = room.players.findIndex(p => p.id === socketId);
      if (playerIndex === -1) continue;

      if (!room.state.started || room.state.gameOver) {
        // Game not started or already over: remove the player
        room.players.splice(playerIndex, 1);
        logger.info({ roomId, socketId, playerIndex }, 'Player removed from unstarted/finished room');

        // If room is empty, delete it
        if (room.players.length === 0) {
          this.rooms.delete(roomId);
          logger.info({ roomId }, 'Empty room deleted');
          return null;
        }

        // If creator left, reassign
        if (room.creator === socketId && room.players.length > 0) {
          room.creator = room.players[0].id;
        }

        return { roomId, room, playerIndex };
      }

      // Game in progress: mark player as disconnected with reconnection window
      const playerInfo = room.players[playerIndex];
      room.disconnectedPlayers.set(socketId, {
        playerIndex,
        playerInfo,
        disconnectedAt: Date.now(),
      });

      // Mark the slot as disconnected (keep the index)
      room.players[playerIndex] = {
        ...playerInfo,
        id: `disconnected-${socketId}`,
        name: `${playerInfo.name} (disconnected)`,
      };

      logger.info({ roomId, socketId, playerIndex, timeout: RECONNECT_TIMEOUT_SECONDS }, 'Player disconnected, waiting for reconnect');

      return { roomId, room, playerIndex };
    }

    return null;
  }

  /**
   * Check and remove expired disconnected players.
   */
  checkReconnectionTimeouts(): Array<{ roomId: RoomId; playerId: string; playerIndex: number }> {
    const expired: Array<{ roomId: RoomId; playerId: string; playerIndex: number }> = [];
    const now = Date.now();

    for (const [roomId, room] of this.rooms) {
      for (const [playerId, disc] of room.disconnectedPlayers) {
        if (now - disc.disconnectedAt > RECONNECT_TIMEOUT_SECONDS * 1000) {
          room.disconnectedPlayers.delete(playerId);
          expired.push({ roomId, playerId, playerIndex: disc.playerIndex });
          logger.info({ roomId, playerId, playerIndex: disc.playerIndex }, 'Reconnection timeout expired');
        }
      }
    }

    return expired;
  }

  /**
   * Get a room by ID.
   */
  getRoom(roomId: RoomId): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Update the game state for a room.
   */
  updateState(roomId: RoomId, state: GameState): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.state = state;
    }
  }

  /**
   * Get the number of active rooms.
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Clean up rooms that have exceeded the TTL.
   */
  private cleanupExpiredRooms(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [roomId, room] of this.rooms) {
      const age = now - room.createdAt;

      // Remove rooms older than TTL
      if (age > ROOM_TTL_MS) {
        this.rooms.delete(roomId);
        cleaned++;
        continue;
      }

      // Remove rooms where game ended more than 5 minutes ago
      if (room.state.gameOver && age > 5 * 60 * 1000) {
        this.rooms.delete(roomId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info({ cleaned, remaining: this.rooms.size }, 'Room cleanup completed');
    }
  }

  /**
   * Shutdown the room manager — clear timers.
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton instance
export const roomManager = new RoomManager();
