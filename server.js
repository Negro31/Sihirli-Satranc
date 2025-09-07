const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Chess = require('chess.js').Chess;
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
  // Render veya bazı hostinglerde origin / CORS ayarı gerekebilir
  cors: { origin: '*' }
});

const rooms = {}; // { roomId: { game: Chess, players: [socketId...], lastMoveBy, abilities: {socketId:{shieldUsed:false}} } }

function createRoom(roomId) {
  rooms[roomId] = {
    game: new Chess(),
    players: [],
    abilities: {} // per-player ability state
  };
}

io.on('connection', socket => {
  console.log('connect', socket.id);

  socket.on('joinRoom', ({roomId, name}) => {
    if (!rooms[roomId]) createRoom(roomId);
    const room = rooms[roomId];

    // max 2 oyuncu
    if (room.players.length >= 2) {
      socket.emit('roomFull');
      return;
    }
    room.players.push(socket.id);
    room.abilities[socket.id] = { shieldUsed: false };
    socket.join(roomId);

    // if two players -> start and assign colors
    if (room.players.length === 2) {
      // assign white to first
      const white = room.players[0], black = room.players[1];
      io.to(roomId).emit('gameStart', { white, black, fen: room.game.fen(), message: 'Game start!' });
    } else {
      socket.emit('waiting', { message: 'Waiting for opponent...' });
    }
  });

  socket.on('makeMove', ({roomId, from, to, promotion}) => {
    const room = rooms[roomId];
    if (!room) return;

    const chess = room.game;
    const move = chess.move({ from, to, promotion });
    if (move) {
      // broadcast new position
      io.to(roomId).emit('moveMade', { from, to, san: move.san, fen: chess.fen() });

      // check game over
      if (chess.game_over()) {
        io.to(roomId).emit('gameOver', { result: determineResult(chess) });
        // cleanup room after finished (optional)
      }
    } else {
      socket.emit('invalidMove', { from, to });
    }
  });

  // örnek special: shield -> bir taşı yakalanmaya karşı bir kez korur (basit)
  socket.on('useShield', ({roomId}) => {
    const room = rooms[roomId];
    if (!room) return;
    const ability = room.abilities[socket.id];
    if (!ability || ability.shieldUsed) {
      socket.emit('abilityFailed', { reason: 'No shield left' });
      return;
    }
    // set shield active for next capture against this player's piece (server-side basit flag)
    ability.shieldActive = true;
    ability.shieldUsed = true;
    io.to(roomId).emit('abilityUsed', { by: socket.id, ability: 'shield' });
  });

  // basit: disconnect temizliği
  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    // remove from rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const idx = room.players.indexOf(socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        delete room.abilities[socket.id];
        io.to(roomId).emit('playerLeft', { id: socket.id });
        // optional: delete room if empty
        if (room.players.length === 0) delete rooms[roomId];
      }
    }
  });
});

function determineResult(chess) {
  if (chess.in_checkmate()) return 'checkmate';
  if (chess.in_draw()) return 'draw';
  return 'over';
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server listening on', PORT));
