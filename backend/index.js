const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://dots-and-boxes-xi.vercel.app/",
    methods: ["GET", "POST"],
  },
});

const allowedOrigins = [
  "http://localhost:3000", // for local dev
  "https://dots-and-boxes-xi.vercel.app/", // replace with your actual Vercel URL
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

const gameRooms = new Map();

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("createRoom", ({ gridSize, maxPlayers = 2 }) => {
    console.log(
      "Create room request from:",
      socket.id,
      "gridSize:",
      gridSize,
      "maxPlayers:",
      maxPlayers
    );
    const roomId = uuidv4();
    gameRooms.set(roomId, {
      players: [socket.id],
      state: {
        gridSize: gridSize || 4, // default 4x4
        lines: [],
        boxes: {},
        scores: Array(maxPlayers).fill(0),
        currentPlayer: 0,
        maxPlayers,
        started: false,
      },
      creator: socket.id,
    });
    socket.join(roomId);
    socket.emit("roomCreated", { roomId });
    io.to(roomId).emit("waitingForPlayers", {
      players: [socket.id],
      maxPlayers,
      creator: socket.id,
    });
  });

  socket.on("joinRoom", ({ roomId }) => {
    console.log("Join room request from:", socket.id, "roomId:", roomId);
    const room = gameRooms.get(roomId);
    if (room && room.players.length < (room.state.maxPlayers || 2)) {
      // Check if player is already in the room
      if (!room.players.includes(socket.id)) {
        room.players.push(socket.id);
        socket.join(roomId);
      }
      console.log("Players in room after join:", room.players);
      io.to(roomId).emit("waitingForPlayers", {
        players: room.players,
        maxPlayers: room.state.maxPlayers,
        creator: room.creator,
      });
    } else {
      socket.emit("error", { message: "Room is full or invalid." });
    }
  });

  socket.on("startGame", ({ roomId }) => {
    console.log("Start game request from:", socket.id, "roomId:", roomId);
    const room = gameRooms.get(roomId);
    if (room && room.creator === socket.id) {
      room.state.started = true;
      console.log("Game starting with players:", room.players);
      io.to(roomId).emit("startGame", { state: room.state });
    }
  });

  socket.on("makeMove", ({ roomId, line }) => {
    const room = gameRooms.get(roomId);
    if (room && room.state.started) {
      // Prevent duplicate lines
      if (
        room.state.lines.some(
          (l) =>
            l[0] === line[0] &&
            l[1] === line[1] &&
            l[2] === line[2] &&
            l[3] === line[3]
        )
      )
        return;
      room.state.lines.push(line);
      const completedBoxes = checkCompletedBoxes(room.state, line);
      let boxCompleted = false;
      completedBoxes.forEach((box) => {
        if (!room.state.boxes[box]) {
          room.state.boxes[box] = room.state.currentPlayer;
          room.state.scores[room.state.currentPlayer]++;
          boxCompleted = true;
        }
      });
      if (!boxCompleted) {
        room.state.currentPlayer =
          (room.state.currentPlayer + 1) % room.state.maxPlayers;
      }
      io.to(roomId).emit("updateGame", { state: room.state });
    }
  });
});

function checkCompletedBoxes(state, line) {
  // line: [x1, y1, x2, y2]
  // Returns array of box keys completed by this move
  const { gridSize, lines } = state;
  const [x1, y1, x2, y2] = line;
  const boxes = [];
  // Check for box above/left
  if (x1 === x2 && x1 > 0) {
    // vertical line, check left box
    const bx = x1 - 1,
      by = Math.min(y1, y2);
    if (isBoxComplete(bx, by, lines)) boxes.push(`${bx},${by}`);
  }
  if (x1 === x2 && x1 < gridSize - 1) {
    // vertical line, check right box
    const bx = x1,
      by = Math.min(y1, y2);
    if (isBoxComplete(bx, by, lines)) boxes.push(`${bx},${by}`);
  }
  if (y1 === y2 && y1 > 0) {
    // horizontal line, check above box
    const bx = Math.min(x1, x2),
      by = y1 - 1;
    if (isBoxComplete(bx, by, lines)) boxes.push(`${bx},${by}`);
  }
  if (y1 === y2 && y1 < gridSize - 1) {
    // horizontal line, check below box
    const bx = Math.min(x1, x2),
      by = y1;
    if (isBoxComplete(bx, by, lines)) boxes.push(`${bx},${by}`);
  }
  return boxes;
}

function isBoxComplete(x, y, lines) {
  // Check if all 4 sides of box at (x, y) are present
  return (
    lines.some(
      (l) => l[0] === x && l[1] === y && l[2] === x + 1 && l[3] === y
    ) && // top
    lines.some(
      (l) => l[0] === x && l[1] === y + 1 && l[2] === x + 1 && l[3] === y + 1
    ) && // bottom
    lines.some(
      (l) => l[0] === x && l[1] === y && l[2] === x && l[3] === y + 1
    ) && // left
    lines.some(
      (l) => l[0] === x + 1 && l[1] === y && l[2] === x + 1 && l[3] === y + 1
    ) // right
  );
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
