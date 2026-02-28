// ============================================================
// Dots & Boxes — Shared Type Definitions
// ============================================================

/** A line segment between two adjacent dots: [x1, y1, x2, y2] (normalized: smaller point first) */
export type Line = [number, number, number, number];

/** Serialized line key for O(1) Set lookups */
export type LineKey = string;

/** Box key in format "x,y" representing the top-left dot of the box */
export type BoxKey = string;

/** Player index (0-based) */
export type PlayerIndex = number;

/** Unique identifier for a game room */
export type RoomId = string;

/** Player information */
export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

/** Core game state — shared between client and server */
export interface GameState {
  gridSize: number;
  lines: Line[];
  lineSet: string[];       // Serialized line keys for O(1) dedup
  boxes: Record<BoxKey, PlayerIndex>;
  scores: number[];
  currentPlayer: PlayerIndex;
  maxPlayers: number;
  started: boolean;
  gameOver: boolean;
  winner: PlayerIndex | null; // null = draw or not over
}

/** Room state on the server */
export interface Room {
  players: PlayerInfo[];
  state: GameState;
  creator: string;           // socket id of room creator
  createdAt: number;          // timestamp
  disconnectedPlayers: Map<string, DisconnectedPlayer>;
}

/** Tracks a disconnected player for reconnection */
export interface DisconnectedPlayer {
  playerIndex: PlayerIndex;
  playerInfo: PlayerInfo;
  disconnectedAt: number;
}

// ============ Socket.io Event Payloads ============

/** Client → Server: create a new room */
export interface CreateRoomPayload {
  gridSize: number;
  maxPlayers: number;
  playerInfo: PlayerInfo;
}

/** Client → Server: join an existing room */
export interface JoinRoomPayload {
  roomId: RoomId;
  playerInfo: PlayerInfo;
}

/** Client → Server: attempt to reconnect to a room */
export interface RejoinRoomPayload {
  roomId: RoomId;
  playerId: string;
}

/** Client → Server: start the game (creator only) */
export interface StartGamePayload {
  roomId: RoomId;
}

/** Client → Server: make a move */
export interface MakeMovePayload {
  roomId: RoomId;
  line: Line;
}

/** Server → Client: room was created */
export interface RoomCreatedEvent {
  roomId: RoomId;
}

/** Server → Client: waiting room update */
export interface WaitingForPlayersEvent {
  players: PlayerInfo[];
  maxPlayers: number;
  creator: string;
}

/** Server → Client: game started */
export interface StartGameEvent {
  state: GameState;
}

/** Server → Client: game state updated */
export interface UpdateGameEvent {
  state: GameState;
}

/** Server → Client: game over */
export interface GameOverEvent {
  state: GameState;
  winner: PlayerIndex | null;
  winnerName: string | null;
  isDraw: boolean;
}

/** Server → Client: player disconnected */
export interface PlayerDisconnectedEvent {
  playerInfo: PlayerInfo;
  playerIndex: PlayerIndex;
  reconnectTimeout: number; // seconds
}

/** Server → Client: player reconnected */
export interface PlayerReconnectedEvent {
  playerInfo: PlayerInfo;
  playerIndex: PlayerIndex;
}

/** Server → Client: error */
export interface ErrorEvent {
  message: string;
  code?: string;
}

/** Server → Client: invalid move */
export interface InvalidMoveEvent {
  message: string;
  reason: 'NOT_YOUR_TURN' | 'LINE_TAKEN' | 'INVALID_LINE' | 'GAME_NOT_STARTED' | 'GAME_OVER';
}
