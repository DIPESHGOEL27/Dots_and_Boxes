// ============================================================
// Dots & Boxes Backend — Room Manager
// Handles room lifecycle: create, join, cleanup, TTL expiry.
// ============================================================

import { v4 as uuidv4 } from "uuid";
import { Room, PlayerInfo, GameState, RoomId } from "dots-and-boxes-shared";
import {
  createInitialState,
  isValidGridSize,
  isValidPlayerCount,
} from "dots-and-boxes-shared";
import {
  ROOM_TTL_MS,
  ROOM_CLEANUP_INTERVAL_MS,
  RECONNECT_TIMEOUT_SECONDS,
  DEFAULT_GRID_SIZE,
  DEFAULT_PLAYERS,
} from "dots-and-boxes-shared";
import logger from "../utils/logger";

export class RoomManager {
  private rooms = new Map<RoomId, Room>();
  private socketBindings = new Map<string, { roomId: RoomId; playerId: string }>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start periodic cleanup
    this.cleanupTimer = setInterval(
      () => this.cleanupExpiredRooms(),
      ROOM_CLEANUP_INTERVAL_MS,
    );
  }

  /**
   * Create a new game room.
   */
  createRoom(
    gridSize: number,
    maxPlayers: number,
    creatorInfo: PlayerInfo,
  ): { roomId: RoomId; room: Room } {
    const validGridSize = isValidGridSize(gridSize)
      ? gridSize
      : DEFAULT_GRID_SIZE;
    const validMaxPlayers = isValidPlayerCount(maxPlayers)
      ? maxPlayers
      : DEFAULT_PLAYERS;

    const roomId = uuidv4();
    const room: Room = {
      players: [creatorInfo],
      state: createInitialState(validGridSize, validMaxPlayers),
      creator: creatorInfo.id,
      createdAt: Date.now(),
      disconnectedPlayers: new Map(),
    };

    this.rooms.set(roomId, room);
    logger.info(
      {
        roomId,
        gridSize: validGridSize,
        maxPlayers: validMaxPlayers,
        creator: creatorInfo.id,
      },
      "Room created",
    );

    return { roomId, room };
  }

  /**
   * Link an active socket to a player id for room operations.
   */
  bindSocket(roomId: RoomId, playerId: string, socketId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;

    const playerExists = room.players.some((player) => player.id === playerId);
    if (!playerExists) return false;

    this.socketBindings.set(socketId, { roomId, playerId });
    return true;
  }

  /**
   * Return room/player binding for a socket if available.
   */
  getBindingBySocket(
    socketId: string,
  ): { roomId: RoomId; playerId: string } | null {
    return this.socketBindings.get(socketId) || null;
  }

  /**
   * Remove socket binding when client disconnects.
   */
  unbindSocket(socketId: string): void {
    this.socketBindings.delete(socketId);
  }

  /**
   * Resolve full room id from an exact id or an unambiguous short prefix.
   */
  private resolveRoomId(inputRoomId: RoomId): RoomId | undefined {
    if (this.rooms.has(inputRoomId)) {
      return inputRoomId;
    }

    // Support short code join by prefix (e.g. first 8 chars)
    if (inputRoomId.length >= 6) {
      const matches = Array.from(this.rooms.keys()).filter((id) =>
        id.startsWith(inputRoomId),
      );
      if (matches.length === 1) {
        return matches[0];
      }
    }

    return undefined;
  }

  /**
   * Join an existing room.
   */
  joinRoom(
    roomId: RoomId,
    playerInfo: PlayerInfo,
  ): {
    success: boolean;
    roomId?: RoomId;
    room?: Room;
    playerIndex?: number;
    error?: string;
  } {
    const resolvedRoomId = this.resolveRoomId(roomId);
    if (!resolvedRoomId) {
      return { success: false, error: "Room not found." };
    }

    const room = this.rooms.get(resolvedRoomId);
    if (!room) {
      return { success: false, error: "Room not found." };
    }

    if (room.state.started) {
      return { success: false, error: "Game already in progress." };
    }

    if (room.players.length >= room.state.maxPlayers) {
      return { success: false, error: "Room is full." };
    }

    // Check if player is already in the room
    const existingIndex = room.players.findIndex((p) => p.id === playerInfo.id);
    if (existingIndex !== -1) {
      return {
        success: true,
        roomId: resolvedRoomId,
        room,
        playerIndex: existingIndex,
      };
    }

    room.players.push(playerInfo);
    const playerIndex = room.players.length - 1;

    logger.info(
      {
        roomId: resolvedRoomId,
        playerId: playerInfo.id,
        playerCount: room.players.length,
      },
      "Player joined room",
    );

    return { success: true, roomId: resolvedRoomId, room, playerIndex };
  }

  /**
   * Attempt to rejoin a room after disconnect.
   */
  rejoinRoom(
    roomId: RoomId,
    playerId: string,
    newSocketId: string,
    playerInfo?: PlayerInfo,
  ): {
    success: boolean;
    roomId?: RoomId;
    room?: Room;
    playerIndex?: number;
    reconnected?: boolean;
    error?: string;
  } {
    const resolvedRoomId = this.resolveRoomId(roomId);
    if (!resolvedRoomId) {
      return { success: false, error: "Room not found." };
    }

    const room = this.rooms.get(resolvedRoomId);
    if (!room) {
      return { success: false, error: "Room not found." };
    }

    const playerIndex = room.players.findIndex((player) => player.id === playerId);
    if (playerIndex === -1) {
      // Allow fallback join only before game starts and only with full player info.
      if (!room.state.started && playerInfo) {
        const joined = this.joinRoom(resolvedRoomId, playerInfo);
        if (!joined.success || !joined.room || joined.playerIndex === undefined) {
          return { success: false, error: joined.error || "Cannot rejoin room." };
        }

        this.bindSocket(resolvedRoomId, playerInfo.id, newSocketId);
        return {
          success: true,
          roomId: resolvedRoomId,
          room: joined.room,
          playerIndex: joined.playerIndex,
          reconnected: false,
        };
      }

      return { success: false, error: "No reconnection available." };
    }

    const disconnected = room.disconnectedPlayers.get(playerId);
    if (disconnected) {
      room.disconnectedPlayers.delete(playerId);
    }

    this.bindSocket(resolvedRoomId, playerId, newSocketId);

    logger.info(
      {
        roomId: resolvedRoomId,
        playerId,
        socketId: newSocketId,
        playerIndex,
        reconnected: Boolean(disconnected),
      },
      "Player rejoin processed",
    );

    return {
      success: true,
      roomId: resolvedRoomId,
      room,
      playerIndex,
      reconnected: Boolean(disconnected),
    };
  }

  /**
   * Handle a player disconnecting from a room.
   */
  handleDisconnect(
    socketId: string,
  ):
    | {
        roomId: RoomId;
        room: Room;
        playerIndex: number;
        playerInfo: PlayerInfo;
        removed: boolean;
      }
    | null {
    const binding = this.socketBindings.get(socketId);
    this.socketBindings.delete(socketId);

    if (!binding) {
      return null;
    }

    const room = this.rooms.get(binding.roomId);
    if (!room) {
      return null;
    }

    const playerIndex = room.players.findIndex(
      (player) => player.id === binding.playerId,
    );
    if (playerIndex === -1) {
      return null;
    }

    const playerInfo = room.players[playerIndex];

    if (!room.state.started || room.state.gameOver) {
      // Game not started or already over: remove the player.
      room.players.splice(playerIndex, 1);
      room.disconnectedPlayers.delete(binding.playerId);

      logger.info(
        { roomId: binding.roomId, socketId, playerIndex, playerId: binding.playerId },
        "Player removed from unstarted/finished room",
      );

      // If room is empty, delete it.
      if (room.players.length === 0) {
        this.rooms.delete(binding.roomId);
        logger.info({ roomId: binding.roomId }, "Empty room deleted");
        return null;
      }

      // If creator left, reassign to first remaining player.
      if (room.creator === binding.playerId && room.players.length > 0) {
        room.creator = room.players[0].id;
      }

      return {
        roomId: binding.roomId,
        room,
        playerIndex,
        playerInfo,
        removed: true,
      };
    }

    // Game in progress: mark player as disconnected, preserve player slot/id.
    room.disconnectedPlayers.set(binding.playerId, {
      playerIndex,
      playerInfo,
      disconnectedAt: Date.now(),
    });

    logger.info(
      {
        roomId: binding.roomId,
        socketId,
        playerId: binding.playerId,
        playerIndex,
        timeout: RECONNECT_TIMEOUT_SECONDS,
      },
      "Player disconnected, waiting for reconnect",
    );

    return {
      roomId: binding.roomId,
      room,
      playerIndex,
      playerInfo,
      removed: false,
    };
  }

  /**
   * Check and remove expired disconnected players.
   */
  checkReconnectionTimeouts(): Array<{
    roomId: RoomId;
    playerId: string;
    playerIndex: number;
  }> {
    const expired: Array<{
      roomId: RoomId;
      playerId: string;
      playerIndex: number;
    }> = [];
    const now = Date.now();

    for (const [roomId, room] of this.rooms) {
      for (const [playerId, disc] of room.disconnectedPlayers) {
        if (now - disc.disconnectedAt > RECONNECT_TIMEOUT_SECONDS * 1000) {
          room.disconnectedPlayers.delete(playerId);
          expired.push({ roomId, playerId, playerIndex: disc.playerIndex });
          logger.info(
            { roomId, playerId, playerIndex: disc.playerIndex },
            "Reconnection timeout expired",
          );
        }
      }
    }

    return expired;
  }

  /**
   * Get a room by ID.
   */
  getRoom(roomId: RoomId): Room | undefined {
    const resolvedRoomId = this.resolveRoomId(roomId);
    if (!resolvedRoomId) return undefined;
    return this.rooms.get(resolvedRoomId);
  }

  /**
   * Update the game state for a room.
   */
  updateState(roomId: RoomId, state: GameState): void {
    const resolvedRoomId = this.resolveRoomId(roomId);
    if (!resolvedRoomId) return;

    const room = this.rooms.get(resolvedRoomId);
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
        for (const [socketId, binding] of this.socketBindings) {
          if (binding.roomId === roomId) {
            this.socketBindings.delete(socketId);
          }
        }
        cleaned++;
        continue;
      }

      // Remove rooms where game ended more than 5 minutes ago
      if (room.state.gameOver && age > 5 * 60 * 1000) {
        this.rooms.delete(roomId);
        for (const [socketId, binding] of this.socketBindings) {
          if (binding.roomId === roomId) {
            this.socketBindings.delete(socketId);
          }
        }
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(
        { cleaned, remaining: this.rooms.size },
        "Room cleanup completed",
      );
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
    this.rooms.clear();
    this.socketBindings.clear();
  }
}

// Singleton instance
export const roomManager = new RoomManager();
