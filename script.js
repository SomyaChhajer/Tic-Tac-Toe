cat > ~/tic-tac-toe-web/script.js << 'EOF'
// ── AUTH GUARD ────────────────────────────────────────────
const token = localStorage.getItem('token');
const loggedInUsername = localStorage.getItem('username');
if (!token) window.location.href = '/auth.html';

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = '/auth.html';
}

// ── LOAD DB STATS ─────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) { logout(); return; }
    const stats = await res.json();
    document.getElementById('topbar-username').textContent = stats.username;
    document.getElementById('db-wins').textContent = stats.wins;
    document.getElementById('db-losses').textContent = stats.losses;
    document.getElementById('db-draws').textContent = stats.draws;
  } catch (e) {
    document.getElementById('topbar-username').textContent = loggedInUsername || '?';
  }
}
loadStats();

// ── PLAYER NAME SETUP ─────────────────────────────────────
let playerNames = { X: 'Player X', O: 'Player O' };

function startGame() {
  const nameX = document.getElementById('nameX').value.trim();
  const nameO = document.getElementById('nameO').value.trim();
  playerNames.X = nameX || 'Player X';
  playerNames.O = nameO || 'Player O';
  document.getElementById('label-x').textContent = playerNames.X;
  document.getElementById('label-o').textContent = playerNames.O;
  document.getElementById('nameModal').style.display = 'none';
  updateStatus(`${playerNames.X}'s turn`);
}

// ── SAVE RESULT TO DB ─────────────────────────────────────
async function saveResult(result) {
  try {
    const body = result === 'draw'
      ? { isDraw: true, winnerUsername: loggedInUsername, loserUsername: loggedInUsername }
      : {
          isDraw: false,
          winnerUsername: result === 'X' ? playerNames.X : playerNames.O,
          loserUsername:  result === 'X' ? playerNames.O : playerNames.X,
        };
    await fetch('/api/save-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    loadStats();
  } catch (e) {
    console.error('Could not save result:', e);
  }
}

// ── GAME LOGIC ────────────────────────────────────────────
const cells = Array.from(document.querySelectorAll(".cell"));
const statusText = document.getElementById("status");
const nextRoundButton = document.getElementById("next-round");
const restartButton = document.getElementById("restart");
const scoreX = document.getElementById("score-x");
const scoreO = document.getElementById("score-o");
const scoreDraw = document.getElementById("score-draw");

const winningLines = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

let board = Array(9).fill("");
let currentPlayer = "X";
let roundFinished = false;
const scores = { X: 0, O: 0, draw: 0 };

function checkWinner() {
  for (const line of winningLines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (!board.includes("")) return "draw";
  return null;
}

function updateStatus(message) { statusText.textContent = message; }

function updateScores() {
  scoreX.textContent = String(scores.X);
  scoreO.textContent = String(scores.O);
  scoreDraw.textContent = String(scores.draw);
}

function clearBoard() {
  board = Array(9).fill("");
  roundFinished = false;
  currentPlayer = "X";
  for (const cell of cells) {
    cell.textContent = "";
    cell.classList.remove("x", "o");
    cell.disabled = false;
  }
  updateStatus(`${playerNames.X}'s turn`);
}

function restartMatch() {
  scores.X = 0; scores.O = 0; scores.draw = 0;
  updateScores();
  clearBoard();
}

function endRound(result) {
  roundFinished = true;
  for (const cell of cells) cell.disabled = true;
  if (result === "draw") {
    scores.draw += 1;
    updateStatus("Draw! Start the next round.");
  } else {
    scores[result] += 1;
    updateStatus(`${playerNames[result]} wins this round! 🎉`);
  }
  updateScores();
  saveResult(result);
}

function handleMove(event) {
  const cell = event.currentTarget;
  const index = Number(cell.dataset.index);
  if (roundFinished || board[index]) return;
  board[index] = currentPlayer;
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase());
  cell.disabled = true;
  const result = checkWinner();
  if (result) { endRound(result); return; }
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus(`${playerNames[currentPlayer]}'s turn`);
}

for (const cell of cells) cell.addEventListener("click", handleMove);
nextRoundButton.addEventListener("click", clearBoard);
restartButton.addEventListener("click", restartMatch);
updateScores();
EOF