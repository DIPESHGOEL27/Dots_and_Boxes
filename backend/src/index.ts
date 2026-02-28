// ============================================================
// Dots & Boxes Backend — Server Entry Point
// Express + Socket.io server with structured logging,
// CORS, health checks, and graceful shutdown.
// ============================================================

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import logger from './utils/logger';
import { registerHandlers } from './socket/handlers';
import { roomManager } from './game/roomManager';
import { RECONNECT_TIMEOUT_SECONDS } from 'dots-and-boxes-shared';

// ─── Configuration ───────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:3000',
  'https://dots-and-boxes-xi.vercel.app',
];

const PORT = parseInt(process.env.PORT || '4000', 10);

// ─── Express App ─────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    rooms: roomManager.getRoomCount(),
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Dots & Boxes Backend</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #181c24;
            color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          .container {
            text-align: center;
            padding: 2.5rem 3rem;
            border: 2px solid #00bcd4;
            border-radius: 16px;
            background: #232837;
            box-shadow: 0 4px 24px rgba(0, 188, 212, 0.15);
          }
          h1 { color: #00bcd4; margin-bottom: 0.5rem; font-size: 1.8rem; }
          .status { color: #4CAF50; font-weight: 600; font-size: 1.1rem; margin: 0.5rem 0; }
          .info { color: #aaa; font-size: 0.95rem; margin: 0.3rem 0; }
          a { color: #00bcd4; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎮 Dots & Boxes Backend</h1>
          <p class="status">Server is running successfully ✅</p>
          <p class="info">Socket.io multiplayer server active</p>
          <p class="info">Active rooms: ${roomManager.getRoomCount()}</p>
          <p class="info" style="margin-top: 1rem;">
            <a href="https://dots-and-boxes-xi.vercel.app" target="_blank">Play the game →</a>
          </p>
        </div>
      </body>
    </html>
  `);
});

// ─── Socket.io Server ────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

io.on('connection', (socket) => {
  registerHandlers(io, socket);
});

// ─── Reconnection Timeout Checker ────────────────────────────

setInterval(() => {
  const expired = roomManager.checkReconnectionTimeouts();
  for (const { roomId, playerIndex } of expired) {
    const room = roomManager.getRoom(roomId);
    if (room) {
      io.to(roomId).emit('playerForfeited', {
        playerIndex,
        message: `Player ${playerIndex + 1} failed to reconnect within ${RECONNECT_TIMEOUT_SECONDS} seconds.`,
      });
    }
  }
}, 5000);

// ─── Start Server ────────────────────────────────────────────

server.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started');
});

// ─── Graceful Shutdown ───────────────────────────────────────

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutdown signal received');

  // Notify all connected clients
  io.emit('serverShutdown', { message: 'Server is restarting. Please refresh.' });

  // Close socket.io
  io.close(() => {
    logger.info('Socket.io server closed');
  });

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    roomManager.shutdown();
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server, io };
