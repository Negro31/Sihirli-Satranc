const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};

io.on("connection", (socket) => {
  console.log("Yeni kullanıcı bağlandı:", socket.id);

  // Oda oluştur
  socket.on("createRoom", ({ roomId, name }) => {
    if (rooms[roomId]) {
      socket.emit("errorMsg", { message: "Bu oda zaten var!" });
      return;
    }
    rooms[roomId] = { players: [socket.id], names: { [socket.id]: name } };
    socket.join(roomId);
    socket.emit("roomCreated", { roomId });
    socket.emit("waiting", { message: "Rakip bekleniyor..." });
  });

  // Odaya katıl
  socket.on("joinRoom", ({ roomId, name }) => {
    if (!rooms[roomId]) {
      socket.emit("errorMsg", { message: "Oda bulunamadı!" });
      return;
    }
    if (rooms[roomId].players.length >= 2) {
      socket.emit("errorMsg", { message: "Oda dolu!" });
      return;
    }

    rooms[roomId].players.push(socket.id);
    rooms[roomId].names[socket.id] = name;
    socket.join(roomId);

    io.to(roomId).emit("gameStart", { message: "Oyun başladı!" });
  });

  // Hamleleri ilet
  socket.on("move", ({ roomId, move }) => {
    socket.to(roomId).emit("move", { move });
  });

  // Oyuncu çıkınca
  socket.on("disconnect", () => {
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players.includes(socket.id)) {
        room.players = room.players.filter((p) => p !== socket.id);
        delete room.names[socket.id];
        io.to(roomId).emit("playerLeft", { id: socket.id });
        if (room.players.length === 0) delete rooms[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server çalışıyor: http://localhost:${PORT}`));
