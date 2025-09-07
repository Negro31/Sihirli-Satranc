console.log("main.js yüklendi ✅");

const socket = io();
let roomId = null;

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");

function log(msg) {
  logEl.innerHTML = msg + "<br>" + logEl.innerHTML;
}

document.getElementById("createBtn").addEventListener("click", () => {
  roomId = document.getElementById("roomId").value || "room" + Math.floor(Math.random() * 1000);
  const name = document.getElementById("name").value || "Player";

  socket.emit("createRoom", { roomId, name });
  console.log("Oda oluşturuldu:", roomId);
});

document.getElementById("joinBtn").addEventListener("click", () => {
  roomId = document.getElementById("roomId").value;
  const name = document.getElementById("name").value || "Player";

  if (!roomId) {
    alert("Lütfen oda ID gir veya yeni bir oda oluştur!");
    return;
  }

  socket.emit("joinRoom", { roomId, name });
  console.log("Odaya katılmaya çalışılıyor:", roomId);
});

socket.on("connect", () => {
  console.log("Socket bağlandı:", socket.id);
  statusEl.innerText = "Sunucuya bağlanıldı ✅";
});

socket.on("roomCreated", d => {
  statusEl.innerText = `Oda oluşturuldu: ${d.roomId}`;
  log("Oda başarıyla oluşturuldu: " + d.roomId);
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
