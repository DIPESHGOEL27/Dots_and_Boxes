// ============================================================
// Dots & Boxes — Shared Constants
// ============================================================

/** Minimum grid size (3x3 = 4 boxes) */
export const MIN_GRID_SIZE = 3;

/** Maximum grid size (10x10 = 81 boxes) */
export const MAX_GRID_SIZE = 10;

/** Minimum number of players */
export const MIN_PLAYERS = 2;

/** Maximum number of players */
export const MAX_PLAYERS = 4;

/** Default grid size */
export const DEFAULT_GRID_SIZE = 4;

/** Default number of players */
export const DEFAULT_PLAYERS = 2;

/** Grid sizes available in the UI */
export const GRID_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Player color presets */
export const PLAYER_COLORS = [
  "#00bcd4",
  "#ff4081",
  "#ffc107",
  "#8bc34a",
] as const;

/** Default player names */
export const DEFAULT_PLAYER_NAMES = [
  "Player 1",
  "Player 2",
  "Player 3",
  "Player 4",
] as const;

/** Available avatar emojis */
export const PLAYER_AVATARS = ["�", "⚡", "🔥", "💎", "🚀", "🦊"] as const;

/** Pixel spacing between dots on the game board */
export const DOT_SPACING = 60;

/** Dot element size in pixels */
export const DOT_SIZE = 18;

/** Line thickness in pixels */
export const LINE_THICKNESS = 8;

/** Reconnection timeout for disconnected players (seconds) */
export const RECONNECT_TIMEOUT_SECONDS = 30;

/** Room TTL — rooms expire after this many milliseconds (1 hour) */
export const ROOM_TTL_MS = 60 * 60 * 1000;

/** Room cleanup interval (every 60 seconds) */
export const ROOM_CLEANUP_INTERVAL_MS = 60 * 1000;

/** Rate limit: max makeMove events per second per socket */
export const RATE_LIMIT_MOVES_PER_SECOND = 5;

/** Rate limit: max createRoom events per minute per socket */
export const RATE_LIMIT_ROOMS_PER_MINUTE = 2;

/** AI move delay in milliseconds (simulates thinking) */
export const AI_MOVE_DELAY_MS = 500;

/** AI difficulty levels */
export const AI_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type AIDifficulty = (typeof AI_DIFFICULTIES)[number];
