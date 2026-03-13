const socket = io();
let currentQuestions = [];
let currentStep = 0;

const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');
const role = urlParams.get('role');
const playerName = role === 'host' ? 'Организатор' : (sessionStorage.getItem('quiz_player_name') || "Гость " + Math.floor(Math.random()*1000));

if (document.getElementById('display-room-code')) {
    document.getElementById('display-room-code').innerText = roomCode;
}

async function init() {
    try {
        const response = await fetch(`/api/quizzes/${roomCode}`);
        if (response.ok) {
            const data = await response.json();
            currentQuestions = data.questions_data;
            
            socket.emit('join_room', { room: roomCode, name: playerName, role: role });

            if (role === 'host') {
                document.getElementById('host-screen').style.display = 'flex';
            } else {
                document.getElementById('player-screen').style.display = 'flex';
            }
        }
    } catch (e) { console.error(e); }
}

function startGame() {
    socket.emit('start_game_signal', { room: roomCode });
}

function nextQuestion() {
    socket.emit('next_question_signal', { room: roomCode });
}

function sendAnswer(val) {
    socket.emit('send_answer', { room: roomCode, name: playerName, answer: val });
    document.getElementById('player-answer-area').innerHTML = "<h3>Ответ принят! ✅</h3>";
}

// --- SOCKET LISTENERS ---

socket.on('update_players', (players) => {
    const list = document.getElementById('lobby-players-list');
    if (list && role === 'host') {
        const onlyPlayers = players.filter(p => !p.is_host);
        list.innerHTML = onlyPlayers.map(p => `
            <div class="player-row">
                <div class="player-icon">${p.name[0].toUpperCase()}</div>
                <div class="player-info">
                    <span class="player-name">${p.name}</span>
                    <span class="player-status-text">В лобби</span>
                </div>
            </div>
        `).join('');
    }
});

socket.on('game_started', () => {
    if (role === 'host') {
        document.getElementById('host-lobby').style.display = 'none';
        document.getElementById('host-game-area').style.display = 'block';
        updateHostUI();
    } else {
        document.getElementById('player-wait').style.display = 'none';
        document.getElementById('player-game-area').style.display = 'block';
        renderPlayerQuestion();
    }
});

socket.on('update_answers', (players) => {
    const grid = document.getElementById('players-answers-grid');
    if (grid && role === 'host') {
        const onlyPlayers = players.filter(p => !p.is_host);
        grid.innerHTML = onlyPlayers.map(p => `
            <div class="player-row ${p.answer ? 'has-answered' : ''}">
                <div class="player-icon" style="background: ${p.answer ? '#ff85a1' : '#6c5ce7'}">
                    ${p.answer ? '✅' : '?'}
                </div>
                <div class="player-info">
                    <span class="player-name">${p.name}</span>
                    <span class="player-status-text">${p.answer ? p.answer : 'Думает...'}</span>
                </div>
            </div>
        `).join('');
    }
});

socket.on('move_to_next', () => {
    currentStep++;
    role === 'host' ? updateHostUI() : renderPlayerQuestion();
});

// Функции отрисовки (updateHostUI, renderPlayerQuestion) остаются как в прошлых примерах
function updateHostUI() {
    const q = currentQuestions[currentStep];
    const textEl = document.getElementById('host-question-text');
    if (q) textEl.innerText = q.text;
    else textEl.innerText = "Финиш! 🎉";
}

function renderPlayerQuestion() {
    const q = currentQuestions[currentStep];
    const area = document.getElementById('player-answer-area');
    const title = document.getElementById('player-question-text');
    if (!q) { title.innerText = "Конец игры!"; area.innerHTML = ""; return; }
    
    title.innerText = q.text;
    area.innerHTML = q.type === 'options' 
        ? q.options.map(o => `<button class="btn-answer" onclick="sendAnswer('${o}')">${o}</button>`).join('')
        : `<input type="text" id="ans" class="answer-input"><button onclick="sendAnswer(document.getElementById('ans').value)">Отправить</button>`;
}

window.onload = init;