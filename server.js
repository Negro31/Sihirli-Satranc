import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Chess } from "chess.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static("public"));

const rooms = new Map();

function getOpponent(room, socketId) {
  for (const [id, p] of room.players.entries()) {
    if (id !== socketId) return { id, ...p };
  }
  return null;
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ roomName, playerName }) => {
    if (rooms.has(roomName)) {
      socket.emit("errorMessage", "Bu oda zaten var. Başka bir isim seç.");
      return;
    }
    const chess = new Chess();
    const room = {
      name: roomName,
      chess,
      players: new Map(),
      started: false
    };
    rooms.set(roomName, room);
    socket.join(roomName);
    room.players.set(socket.id, { name: playerName, color: null });
    io.to(roomName).emit("roomUpdate", {
      roomName,
      players: Array.from(room.players.values()),
      started: room.started
    });
    socket.emit("roomCreated", { roomName });
  });

  socket.on("joinRoom", ({ roomName, playerName }) => {
    const room = rooms.get(roomName);
    if (!room) {
      socket.emit("errorMessage", "Böyle bir oda yok.");
      return;
    }
    if (room.players.size >= 2) {
      socket.emit("errorMessage", "Oda dolu.");
      return;
    }
    socket.join(roomName);
    room.players.set(socket.id, { name: playerName, color: null });

    if (room.players.size === 2 && !room.started) {
      const ids = Array.from(room.players.keys());
      if (Math.random() < 0.5) {
        room.players.get(ids[0]).color = "w";
        room.players.get(ids[1]).color = "b";
      } else {
        room.players.get(ids[0]).color = "b";
        room.players.get(ids[1]).color = "w";
      }
      room.started = true;
      io.to(roomName).emit("gameStarted", {
        players: ids.map(id => ({ id, ...room.players.get(id) })),
        fen: room.chess.fen(),
        turn: room.chess.turn()
      });
    } else {
      io.to(roomName).emit("roomUpdate", {
        roomName,
        players: Array.from(room.players.values()),
        started: room.started
      });
      socket.emit("waiting", "Rakip bekleniyor...");
    }
  });

  socket.on("makeMove", ({ roomName, from, to, promotion }) => {
    const room = rooms.get(roomName);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    if (player.color !== room.chess.turn()) {
      socket.emit("errorMessage", "Sıra sende değil.");
      return;
    }
    const move = room.chess.move({ from, to, promotion: promotion || "q" });
    if (!move) {
      socket.emit("errorMessage", "Geçersiz hamle.");
      return;
    }
    io.to(roomName).emit("moveMade", {
      from: move.from, to: move.to, san: move.san,
      fen: room.chess.fen(), turn: room.chess.turn()
    });
    if (room.chess.isGameOver()) {
      let result = "Berabere";
      if (room.chess.isCheckmate()) {
        result = player.color === "w" ? "Beyaz kazandı" : "Siyah kazandı";
      }
      io.to(roomName).emit("gameOver", { result, fen: room.chess.fen() });
    }
  });

  socket.on("resign", ({ roomName }) => {
    const room = rooms.get(roomName);
    if (!room) return;
    const opp = getOpponent(room, socket.id);
    io.to(roomName).emit("gameOver", { result: `Terk: ${opp ? opp.name : "Rakip"} kazandı.` });
  });

  socket.on("disconnect", () => {
    for (const [roomName, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        socket.leave(roomName);
        io.to(roomName).emit("opponentLeft", "Rakip ayrıldı.");
        if (room.players.size === 0) rooms.delete(roomName);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log("Server listening on http://localhost:" + PORT);
});
