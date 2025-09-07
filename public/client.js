const socket = io();

let board = null;
let game = null;
let myColor = null;
let roomName = null;
let myName = null;

function $(sel){ return document.querySelector(sel); }
function setText(id, text){ document.getElementById(id).textContent = text; }
function show(id){ document.getElementById(id).classList.remove("hidden"); }
function hide(id){ document.getElementById(id).classList.add("hidden"); }

function updateStatus() {
  if (!game) return;
  let status = "";
  const moveColor = game.turn() === "w" ? "Beyaz" : "Siyah";

  if (game.isGameOver()) status = "Oyun bitti";
  else if (game.in_checkmate()) status = "Şah mat!";
  else if (game.in_draw()) status = "Berabere.";
  else status = moveColor + " oynuyor" + (game.in_check() ? " (ŞAH!)" : "");
  setText("status", status);
}

function onDragStart (source, piece) {
  if (!game || game.isGameOver()) return false;
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
$("#createBtn").addEventListener("click", () => {
  myName = $("#playerName").value.trim() || "Misafir";
  roomName = $("#roomName").value.trim();
  socket.emit("createRoom", { roomName, playerName: myName });
});

// Odaya katıl
$("#joinBtn").addEventListener("click", () => {
  myName = $("#playerName").value.trim() || "Misafir";
  roomName = $("#roomName").value.trim();
  socket.emit("joinRoom", { roomName, playerName: myName });
});

// Terk et
$("#resignBtn").addEventListener("click", () => {
  if (roomName) socket.emit("resign", { roomName });
});

// ✅ Odaya girildiğinde bilgi ver
socket.on("roomJoined", ({ roomName, playerName }) => {
  setText("authMsg", `✔️ ${playerName} olarak ${roomName} odasına girdin.`);
});

// ✅ Oyun başladı
socket.on("gameStarted", ({ players, fen }) => {
  hide("auth");
  show("game");
  const me = players.find(p => p.name === myName);
  myColor = me.color;
  initBoard(myColor === "w" ? "white" : "black");
  game.load(fen);
  board.position(fen);
  updateStatus();
  setText("gameMsg", "🎮 Oyun başladı!");
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
  setText("gameMsg", result);
});

// Rakip çıktı
socket.on("opponentLeft", (msg) => { setText("gameMsg", msg); });

// Hatalar
socket.on("errorMessage", (msg) => { setText("authMsg", msg); });
