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

  if (game.isGameOver()) {
    status = "Oyun bitti";
  } else if (game.in_checkmate()) {
    status = "Şah mat!";
  } else if (game.in_draw()) {
    status = "Berabere.";
  } else {
    status = moveColor + " oynuyor" + (game.in_check() ? " (ŞAH!)" : "");
  }
  setText("status", status);
}

function onDragStart (source, piece) {
  if (!game || game.isGameOver()) return false;
  if ((myColor === "w" && piece.startsWith("b")) ||
      (myColor === "b" && piece.startsWith("w"))) {
    return false;
  }
  if (game.turn() !== myColor) return false;
}

function onDrop (source, target) {
  socket.emit("makeMove", { roomName, from: source, to: target, promotion: "q" });
}

function onSnapEnd () {
  board.position(game.fen());
}

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

document.getElementById("createBtn").addEventListener("click", () => {
  myName = $("#playerName").value.trim() || "Misafir";
  roomName = $("#roomName").value.trim();
  socket.emit("createRoom", { roomName, playerName: myName });
});

document.getElementById("joinBtn").addEventListener("click", () => {
  myName = $("#playerName").value.trim() || "Misafir";
  roomName = $("#roomName").value.trim();
  socket.emit("joinRoom", { roomName, playerName: myName });
});

document.getElementById("resignBtn").addEventListener("click", () => {
  if (roomName) socket.emit("resign", { roomName });
});

socket.on("roomCreated", ({ roomName }) => {
  $("#authMsg").textContent = `Oda oluşturuldu: ${roomName}`;
});

socket.on("waiting", (msg) => { $("#authMsg").textContent = msg; });

socket.on("roomUpdate", (data) => {
  $("#authMsg").textContent = `Oyuncular: ${data.players.map(p=>p.name).join(", ")}`;
});

socket.on("gameStarted", ({ players, fen }) => {
  hide("auth");
  show("game");
  const me = players.find(p => p.name === myName) || players[0];
  myColor = me.color;
  initBoard(myColor === "w" ? "white" : "black");
  game.load(fen);
  board.position(fen);
  updateStatus();
  $("#gameMsg").textContent = "Oyun başladı!";
});

socket.on("moveMade", ({ fen }) => {
  game.load(fen);
  board.position(fen);
  updateStatus();
});

socket.on("gameOver", ({ result, fen }) => {
  game.load(fen);
  board.position(fen);
  updateStatus();
  $("#gameMsg").textContent = result;
});

socket.on("opponentLeft", (msg) => {
  $("#gameMsg").textContent = msg;
});

socket.on("errorMessage", (msg) => {
  $("#authMsg").textContent = msg;
});
