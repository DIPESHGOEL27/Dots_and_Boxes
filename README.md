# 🎮 Dots & Boxes

[![CI](https://github.com/DIPESHGOEL27/Dots_and_Boxes/actions/workflows/ci.yml/badge.svg)](https://github.com/DIPESHGOEL27/Dots_and_Boxes/actions)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black?logo=socket.io)
![License](https://img.shields.io/badge/License-MIT-green)

A production-grade implementation of the classic **Dots and Boxes** strategy game featuring real-time online multiplayer, AI opponents with multiple difficulty levels, and a polished dark-themed UI — built with **TypeScript** end-to-end.

## 🎯 Live Demo

**[Play Now →](https://dots-and-boxes-xi.vercel.app/)**

## ✨ Features

### 🎲 Game Modes

| Mode                      | Description                                                       |
| ------------------------- | ----------------------------------------------------------------- |
| 👥 **Local Multiplayer**  | 2–4 players on the same device, hot-seat style                    |
| 🤖 **vs AI**              | Play against AI with **Easy**, **Medium**, or **Hard** difficulty |
| 🌐 **Online Multiplayer** | Real-time rooms via Socket.io with shareable invite links         |

### 🤖 AI Opponent

- **Easy** — Random move selection
- **Medium** — Greedy strategy: completes boxes, avoids giving away 3-sided boxes
- **Hard** — Minimax with alpha-beta pruning (depth 6, full search for ≤12 remaining moves)

### 🎨 Player Customization

- Custom player names (persisted in localStorage)
- 4 color presets
- 12 avatar emojis

### 🏆 Game Features

- 3×3 to 10×10 grid sizes
- Automatic box completion detection & scoring
- Turn indicator with active player glow animation
- Game-over overlay with ranked leaderboard & confetti
- Procedural sound effects (Web Audio API — no external files)
- Shareable room links for online play (`/game/online/:roomId`)
- Disconnect handling with 30-second reconnection window
- Mute toggle (persisted in localStorage)

## 🏗️ Architecture

```
dots_and_boxes/
├── shared/              # Shared TypeScript package
│   └── src/
│       ├── types.ts     # Type definitions (GameState, events, etc.)
│       ├── constants.ts # Grid sizes, colors, timing constants
│       ├── gameLogic.ts # Core game logic (applyMove, findCompletedBoxes, etc.)
│       └── gameLogic.test.ts  # 52 unit tests
│
├── backend/             # Node.js + Express + Socket.io
│   └── src/
│       ├── index.ts     # Server entry, health check, graceful shutdown
│       ├── socket/
│       │   ├── handlers.ts    # Socket event handlers with turn validation
│       │   └── validation.ts  # Input validation (payloads, line coords)
│       ├── game/
│       │   └── roomManager.ts # Room CRUD, TTL cleanup, disconnections
│       ├── middleware/
│       │   └── rateLimiter.ts # Per-socket sliding window rate limiting
│       └── utils/
│           └── logger.ts      # Structured logging (pino)
│
├── frontend/            # React 19 + TypeScript (CRA)
│   └── src/
│       ├── App.tsx      # Router (react-router-dom v6)
│       ├── routes/
│       │   ├── Home.tsx       # Lobby with player customization
│       │   └── Game.tsx       # Route wrapper parsing URL params
│       ├── components/GameBoard/
│       │   ├── GameBoard.tsx  # Main orchestrator (local/AI/online)
│       │   ├── Board.tsx      # Pure rendering (dots, lines, boxes)
│       │   ├── Scoreboard.tsx # Player scores with turn glow
│       │   ├── WaitingRoom.tsx# Pre-game lobby with copy link
│       │   └── GameOver.tsx   # Results, leaderboard, confetti
│       ├── hooks/
│       │   ├── useSocket.ts   # Socket.io connection lifecycle
│       │   ├── useGameState.ts# Local game state via shared logic
│       │   └── useAI.ts       # AI strategies (easy/medium/hard)
│       └── utils/
│           └── sounds.ts      # Procedural Web Audio API sounds
│
└── .github/workflows/
    └── ci.yml           # CI pipeline (build, test, typecheck)
```

## 🛠️ Tech Stack

| Layer          | Technology                                                  |
| -------------- | ----------------------------------------------------------- |
| **Language**   | TypeScript (strict mode, end-to-end)                        |
| **Frontend**   | React 19, React Router v6, react-hot-toast, canvas-confetti |
| **Backend**    | Node.js, Express 4, Socket.io 4.8                           |
| **Shared**     | Monorepo shared package (`dots-and-boxes-shared`)           |
| **Testing**    | Jest, React Testing Library (86+ tests across packages)     |
| **CI/CD**      | GitHub Actions (Node 18 & 20 matrix)                        |
| **Logging**    | pino (structured JSON logging)                              |
| **Deployment** | Vercel (frontend) + Render (backend)                        |

## 🔒 Security & Reliability

- **Server-side turn validation** — prevents out-of-turn moves
- **Input validation** — all payloads validated (grid size, player info, line coordinates)
- **Rate limiting** — sliding window per socket (5 moves/sec, 2 rooms/min)
- **Room TTL** — automatic cleanup of stale rooms (1 hour)
- **Graceful shutdown** — SIGTERM/SIGINT handling with client notification
- **Disconnect handling** — 30-second reconnection window for dropped players

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/DIPESHGOEL27/Dots_and_Boxes.git
cd Dots_and_Boxes

# Install & build the shared package
cd shared && npm install && npm run build && cd ..

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install --legacy-peer-deps && cd ..
```

### Development

```bash
# Terminal 1: Start the backend
cd backend && npm run dev

# Terminal 2: Start the frontend
cd frontend && npm start
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:4000`.

### Testing

```bash
# Run all tests
cd shared && npm test          # 52 tests
cd ../frontend && npx react-scripts test --watchAll=false  # 34 tests
```

### Production Build

```bash
cd shared && npm run build
cd ../backend && npm run build
cd ../frontend && npx react-scripts build
```

## 📡 API

### Health Check

```
GET /health
→ { status: "ok", uptime: 1234.5, rooms: 3, timestamp: "..." }
```

### Socket.io Events

| Direction | Event                | Payload                                         |
| --------- | -------------------- | ----------------------------------------------- |
| C→S       | `createRoom`         | `{ gridSize, maxPlayers, playerInfo }`          |
| C→S       | `joinRoom`           | `{ roomId, playerInfo }`                        |
| C→S       | `startGame`          | `{ roomId }`                                    |
| C→S       | `makeMove`           | `{ roomId, line: [x1,y1,x2,y2] }`               |
| S→C       | `roomCreated`        | `{ roomId }`                                    |
| S→C       | `waitingForPlayers`  | `{ players, maxPlayers, creator }`              |
| S→C       | `startGame`          | `{ state }`                                     |
| S→C       | `updateGame`         | `{ state }`                                     |
| S→C       | `gameOver`           | `{ state, winner, winnerName, isDraw }`         |
| S→C       | `playerDisconnected` | `{ playerInfo, playerIndex, reconnectTimeout }` |
| S→C       | `playerReconnected`  | `{ playerInfo, playerIndex }`                   |

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
