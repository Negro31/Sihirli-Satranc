const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Oda verileri
const rooms = {};

function createRoom(roomId) {
  rooms[roomId] = { players: [] };
}

io.on('connection', socket => {
  console.log("Yeni bağlantı:", socket.id);

  socket.on("createRoom", ({ roomId, name }) => {
    if (rooms[roomId]) {
      socket.emit("roomExists");
      return;
    }
    createRoom(roomId);
    rooms[roomId].players.push(socket.id);
    socket.join(roomId);
    socket.emit("roomCreated", { roomId });
    console.log(`${socket.id} yeni oda oluşturdu: ${roomId}`);
  });

  socket.on('joinRoom', ({ roomId, name }) => {
    if (!rooms[roomId]) {
      socket.emit("roomNotFound");
      return;
    }

    const room = rooms[roomId];
    if (room.players.length >= 2) {
      socket.emit("roomFull");
      return;
    }

    room.players.push(socket.id);
    socket.join(roomId);

    console.log(`${socket.id} odaya katıldı: ${roomId}`);

    if (room.players.length === 2) {
      io.to(roomId).emit("gameStart", { message: "Oyun başladı!" });
    } else {
      socket.emit("waiting", { message: "Rakip bekleniyor..." });
    }
  });

  socket.on("disconnect", () => {
    console.log("Bağlantı koptu:", socket.id);
    for (let roomId in rooms) {
      const room = rooms[roomId];
      if (room.players.includes(socket.id)) {
        room.players = room.players.filter(p => p !== socket.id);
        io.to(roomId).emit("playerLeft", { id: socket.id });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Sunucu çalışıyor:", PORT));
