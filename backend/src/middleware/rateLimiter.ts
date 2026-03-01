// ============================================================
// Dots & Boxes Backend — Rate Limiter Middleware
// Per-socket event rate limiting using a sliding window.
// ============================================================

import logger from "../utils/logger";
import {
  RATE_LIMIT_MOVES_PER_SECOND,
  RATE_LIMIT_ROOMS_PER_MINUTE,
} from "dots-and-boxes-shared";

interface RateBucket {
  timestamps: number[];
  windowMs: number;
  maxEvents: number;
}

const socketBuckets = new Map<string, Map<string, RateBucket>>();

function getBucket(
  socketId: string,
  event: string,
  maxEvents: number,
  windowMs: number,
): RateBucket {
  if (!socketBuckets.has(socketId)) {
    socketBuckets.set(socketId, new Map());
  }
  const eventMap = socketBuckets.get(socketId)!;
  if (!eventMap.has(event)) {
    eventMap.set(event, { timestamps: [], windowMs, maxEvents });
  }
  return eventMap.get(event)!;
}

/**
 * Check if an event from a socket should be rate-limited.
 * Returns true if te event is allowed, false if rate-limited.
 */
export function checkRateLimit(socketId: string, event: string): boolean {
  let maxEvents: number;
  let windowMs: number;

  switch (event) {
    case "makeMove":
      maxEvents = RATE_LIMIT_MOVES_PER_SECOND;
      windowMs = 1000;
      break;
    case "createRoom":
      maxEvents = RATE_LIMIT_ROOMS_PER_MINUTE;
      windowMs = 60000;
      break;
    default:
      return true; // no limit for other events
  }

  const bucket = getBucket(socketId, event, maxEvents, windowMs);
  const now = Date.now();

  // Remove timestamps outside the window
  bucket.timestamps = bucket.timestamps.filter(
    (t) => now - t < bucket.windowMs,
  );

  if (bucket.timestamps.length >= bucket.maxEvents) {
    logger.warn(
      { socketId, event, count: bucket.timestamps.length },
      "Rate limit exceeded",
    );
    return false;
  }

  bucket.timestamps.push(now);
  return true;
}

/**
 * Clean up rate limit data for a disconnected socket.
 */
export function cleanupRateLimit(socketId: string): void {
  socketBuckets.delete(socketId);
}
