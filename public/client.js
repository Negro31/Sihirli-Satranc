const socket = io();

let board = null;
let game = null;
let myColor = null;
let roomName = null;
let myName = null;

function $(id){ return document.getElementById(id); }

function updateStatus() {
  if (!game) return;
  let status = "";
  const moveColor = game.turn() === "w" ? "Beyaz" : "Siyah";
  if (game.isGameOver()) status = "Oyun bitti";
  else if (game.in_checkmate()) status = "Şah mat!";
  else if (game.in_draw()) status = "Berabere.";
  else status = moveColor + " oynuyor" + (game.in_check() ? " (ŞAH!)" : "");
  $("status").textContent = status;
}

function onDragStart (source, piece) {
  if (!game || game.game_over()) return false;
  if ((myColor === "w" && piece.startsWith("b")) || (myColor === "b" && piece.startsWith("w")))
    return false;
  if (game.turn() !== myColor) return false;
}

function onDrop (source, target) {
  socket.emit("makeMove", { roomName, from: source, to: target, promotion: "q" });
}

function onSnapEnd () { board.position(game.fen()); }

function initBoard(orientation) {
  game = new Chess();
  board = Chessboard("board", {
    draggable: true,
    position: "start",
    orientation,
    onDragStart,
    onDrop,
    onSnapEnd
  });
  updateStatus();
}

// Oda oluştur
$("createBtn").addEventListener("click", () => {
  myName = $("playerName").value.trim() || "Misafir";
  roomName = $("roomName").value.trim();
  socket.emit("createRoom", { roomName, playerName: myName });
});

// Odaya katıl
$("joinBtn").addEventListener("click", () => {
  myName = $("playerName").value.trim() || "Misafir";
  roomName = $("roomName").value.trim();
  socket.emit("joinRoom", { roomName, playerName: myName });
});

// Terk et
$("resignBtn").addEventListener("click", () => {
  if (roomName) socket.emit("resign", { roomName });
});

// Odaya girildi
socket.on("roomJoined", ({ roomName, playerName }) => {
  $("authMsg").textContent = `✔️ ${playerName} olarak "${roomName}" odasına girdin.`;
  $("roomTitle").textContent = `Oda: ${roomName}`;
});

// Oyun başladı
socket.on("gameStarted", ({ players, fen }) => {
  $("auth").classList.add("hidden");
  $("game").classList.remove("hidden");
  const me = players.find(p => p.name === myName);
  myColor = me.color;
  initBoard(myColor === "w" ? "white" : "black");
  game.load(fen);
  board.position(fen);
  updateStatus();
  $("gameMsg").textContent = "🎮 Oyun başladı!";
});

// Hamle işlendi
socket.on("moveMade", ({ fen }) => {
  game.load(fen);
  board.position(fen);
  updateStatus();
});

// Oyun bitti
socket.on("gameOver", ({ result, fen }) => {
  game.load(fen);
  board.position(fen);
  updateStatus();
  $("gameMsg").textContent = result;
});

// Rakip çıktı
socket.on("opponentLeft", (msg) => { $("gameMsg").textContent = msg; });

// Hatalar
socket.on("errorMessage", (msg) => { $("authMsg").textContent = msg; });
