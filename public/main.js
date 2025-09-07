console.log("main.js yüklendi ✅");

const socket = io();
let roomId = null;
let game = null;
let board = null;
let color = null; // "white" veya "black"

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");

function log(msg) {
  logEl.innerHTML = msg + "<br>" + logEl.innerHTML;
}

// 🎮 Oda oluştur
document.getElementById("createBtn").addEventListener("click", () => {
  roomId = document.getElementById("roomId").value || "room" + Math.floor(Math.random() * 1000);
  const name = document.getElementById("name").value || "Player";

  socket.emit("createRoom", { roomId, name });
});

// 🎮 Odaya katıl
document.getElementById("joinBtn").addEventListener("click", () => {
  roomId = document.getElementById("roomId").value;
  const name = document.getElementById("name").value || "Player";

  if (!roomId) {
    alert("Lütfen oda ID gir veya yeni bir oda oluştur!");
    return;
  }

  socket.emit("joinRoom", { roomId, name });
});

// 🔌 Bağlantılar
socket.on("connect", () => {
  statusEl.innerText = "Sunucuya bağlanıldı ✅";
});

socket.on("roomCreated", d => {
  statusEl.innerText = `Oda oluşturuldu: ${d.roomId}`;
  log("Oda başarıyla oluşturuldu: " + d.roomId);
  color = "white"; // Odayı kuran beyaz olsun
});

socket.on("waiting", d => {
  statusEl.innerText = d.message;
});

socket.on("gameStart", d => {
  statusEl.innerText = d.message;
  log("Oyun başladı!");

  if (!color) color = "black"; // Sonradan giren siyah olur

  startChessGame();
});

socket.on("roomFull", () => {
  alert("Oda dolu!");
});

socket.on("playerLeft", d => {
  log("Oyuncu ayrıldı: " + d.id);
});

// ♟ Satranç başlat
function startChessGame() {
  game = new Chess();

  board = Chessboard("board", {
    draggable: true,
    position: "start",
    orientation: color,
    onDrop: onDrop
  });
}

// ♟ Taş sürüklenip bırakıldığında
function onDrop(source, target) {
  if (!game || game.turn() !== color[0]) {
    return "snapback";
  }

  let move = game.move({ from: source, to: target, promotion: "q" });

  if (move === null) return "snapback";

  board.position(game.fen());

  socket.emit("move", { roomId, move });
}

// ♟ Rakip hamle yaptığında
socket.on("move", data => {
  game.move(data.move);
  board.position(game.fen());
});
