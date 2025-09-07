const socket = io();
let chess = new Chess();
let selected = null;
let mySocketId = null;
let roomId = null;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');

document.getElementById('joinBtn').onclick = () => {
  roomId = document.getElementById('roomId').value || 'room1';
  const name = document.getElementById('name').value || 'Player';
  socket.emit('joinRoom', { roomId, name });
};

document.getElementById('shieldBtn').onclick = () => {
  if (!roomId) return alert('Önce odaya katıl');
  socket.emit('useShield', { roomId });
};

socket.on('connect', () => {
  mySocketId = socket.id;
  log('connected: ' + mySocketId);
});

socket.on('waiting', d => status('Waiting for opponent...'));
socket.on('roomFull', () => alert('Oda dolu'));
socket.on('gameStart', d => {
  chess = new Chess(d.fen || undefined);
  renderBoard();
  status('Game started!');
});

socket.on('moveMade', d => {
  chess.load(d.fen);
  renderBoard();
  status('Move: ' + d.san);
});

socket.on('abilityUsed', d => {
  log('Ability used by ' + d.by + ': ' + d.ability);
});

socket.on('abilityFailed', d => {
  alert('Ability failed: ' + d.reason);
});

socket.on('invalidMove', () => {
  alert('Invalid move');
});

socket.on('gameOver', d => {
  status('Game over: ' + d.result);
});

function log(t){ logEl.innerText = t + '\n' + logEl.innerText; }
function status(t){ statusEl.innerText = t; }

function renderBoard(){
  boardEl.innerHTML = '';
  const board = chess.board(); // 8x8 array
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const sq = board[r][c];
      const sqEl = document.createElement('div');
      const isLight = (r + c) % 2 === 0;
      sqEl.className = 'square ' + (isLight ? 'light' : 'dark');
      const file = 'abcdefgh'[c];
      const rank = 8 - r;
      const coord = file + rank;
      sqEl.dataset.coord = coord;
      if (sq) {
        sqEl.innerText = pieceUnicode(sq);
        sqEl.dataset.color = sq.color;
      }
      sqEl.onclick = () => onSquareClick(coord);
      boardEl.appendChild(sqEl);
    }
  }
  // highlight selected if any
  if (selected) {
    const el = document.querySelector(`[data-coord="${selected}"]`);
    if (el) el.classList.add('selected');
  }
}

function onSquareClick(coord){
  if (!selected) {
    // select if there's a piece of our color? we don't know player's color in this simple example
    const piece = chess.get(coord);
    if (piece) {
      selected = coord;
      renderBoard();
    }
  } else {
    // attempt move selected -> coord
    socket.emit('makeMove', { roomId, from: selected, to: coord });
    selected = null;
  }
}

function pieceUnicode(piece){
  // piece: {type:'p', color:'w'}
  const map = {
    p: { w: '♙', b: '♟' },
    r: { w: '♖', b: '♜' },
    n: { w: '♘', b: '♞' },
    b: { w: '♗', b: '♝' },
    q: { w: '♕', b: '♛' },
    k: { w: '♔', b: '♚' }
  };
  return map[piece.type][piece.color];
}

// initial render
renderBoard();
