// ============================================================
// Dots & Boxes Backend — Input Validation
// Validates all incoming socket event payloads.
// ============================================================

import {
  CreateRoomPayload,
  JoinRoomPayload,
  RejoinRoomPayload,
  StartGamePayload,
  MakeMovePayload,
  PlayerInfo,
} from 'dots-and-boxes-shared';
import { isValidGridSize, isValidPlayerCount, isValidLine } from 'dots-and-boxes-shared';

/**
 * Validate a UUID v4 string.
 */
function isValidUUID(str: unknown): str is string {
  if (typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Validate PlayerInfo object.
 */
function isValidPlayerInfo(info: unknown): info is PlayerInfo {
  if (!info || typeof info !== 'object') return false;
  const p = info as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    p.name.length <= 20 &&
    typeof p.color === 'string' &&
    typeof p.avatar === 'string'
  );
}

/**
 * Validate CreateRoomPayload.
 */
export function validateCreateRoom(data: unknown): { valid: boolean; payload?: CreateRoomPayload; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload.' };
  }

  const d = data as Record<string, unknown>;

  if (!isValidGridSize(d.gridSize as number)) {
    return { valid: false, error: 'Invalid grid size (must be 3-10).' };
  }

  if (!isValidPlayerCount(d.maxPlayers as number)) {
    return { valid: false, error: 'Invalid player count (must be 2-4).' };
  }

  if (!isValidPlayerInfo(d.playerInfo)) {
    return { valid: false, error: 'Invalid player info.' };
  }

  return {
    valid: true,
    payload: {
      gridSize: d.gridSize as number,
      maxPlayers: d.maxPlayers as number,
      playerInfo: d.playerInfo as PlayerInfo,
    },
  };
}

/**
 * Validate JoinRoomPayload.
 */
export function validateJoinRoom(data: unknown): { valid: boolean; payload?: JoinRoomPayload; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload.' };
  }

  const d = data as Record<string, unknown>;

  if (!isValidUUID(d.roomId)) {
    return { valid: false, error: 'Invalid room ID.' };
  }

  if (!isValidPlayerInfo(d.playerInfo)) {
    return { valid: false, error: 'Invalid player info.' };
  }

  return {
    valid: true,
    payload: {
      roomId: d.roomId as string,
      playerInfo: d.playerInfo as PlayerInfo,
    },
  };
}

/**
 * Validate RejoinRoomPayload.
 */
export function validateRejoinRoom(data: unknown): { valid: boolean; payload?: RejoinRoomPayload; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload.' };
  }

  const d = data as Record<string, unknown>;

  if (!isValidUUID(d.roomId)) {
    return { valid: false, error: 'Invalid room ID.' };
  }

  if (typeof d.playerId !== 'string' || d.playerId.length === 0) {
    return { valid: false, error: 'Invalid player ID.' };
  }

  return {
    valid: true,
    payload: {
      roomId: d.roomId as string,
      playerId: d.playerId as string,
    },
  };
}

/**
 * Validate StartGamePayload.
 */
export function validateStartGame(data: unknown): { valid: boolean; payload?: StartGamePayload; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload.' };
  }

  const d = data as Record<string, unknown>;

  if (!isValidUUID(d.roomId)) {
    return { valid: false, error: 'Invalid room ID.' };
  }

  return {
    valid: true,
    payload: { roomId: d.roomId as string },
  };
}

/**
 * Validate MakeMovePayload.
 */
export function validateMakeMove(data: unknown, gridSize: number): { valid: boolean; payload?: MakeMovePayload; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid payload.' };
  }

  const d = data as Record<string, unknown>;

  if (!isValidUUID(d.roomId)) {
    return { valid: false, error: 'Invalid room ID.' };
  }

  if (!Array.isArray(d.line) || d.line.length !== 4) {
    return { valid: false, error: 'Invalid line format.' };
  }

  const line = d.line as [number, number, number, number];
  if (!isValidLine(line, gridSize)) {
    return { valid: false, error: 'Invalid line coordinates.' };
  }

  return {
    valid: true,
    payload: {
      roomId: d.roomId as string,
      line,
    },
  };
}
