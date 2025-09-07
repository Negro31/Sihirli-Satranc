console.log("main.js yüklendi ✅");

const socket = io();
let roomId = null;

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");

document.getElementById("joinBtn").addEventListener("click", () => {
  roomId = document.getElementById("roomId").value || "room1";
  const name = document.getElementById("name").value || "Player";

  console.log("Join butonuna basıldı, oda:", roomId);

  socket.emit("joinRoom", { roomId, name });
});

socket.on("connect", () => {
  console.log("Socket bağlandı:", socket.id);
  statusEl.innerText = "Sunucuya bağlanıldı ✅";
});

socket.on("waiting", d => {
  statusEl.innerText = d.message;
});

socket.on("gameStart", d => {
  statusEl.innerText = d.message;
  log("Oyun başladı!");
});

socket.on("roomFull", () => {
  alert("Oda dolu!");
});

socket.on("playerLeft", d => {
  log("Oyuncu ayrıldı: " + d.id);
});

function log(msg) {
  logEl.innerHTML = msg + "<br>" + logEl.innerHTML;
}    n: { w: '♘', b: '♞' },
    b: { w: '♗', b: '♝' },
    q: { w: '♕', b: '♛' },
    k: { w: '♔', b: '♚' }
  };
  return map[piece.type][piece.color];
}

// initial render
renderBoard();
