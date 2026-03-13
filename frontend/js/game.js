const socket = io(); // Автоматически подключается к текущему хосту

let currentQuestions = [];
let currentStep = 0;

const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');
const role = urlParams.get('role');

async function loadQuizData() {
    if (!roomCode) {
        alert("Код комнаты не найден!");
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/quizzes/${roomCode}`);
        if (response.ok) {
            const data = await response.json();
            currentQuestions = data.questions_data;
            
            // Входим в комнату в Socket.IO
            socket.emit('join_room', { room: roomCode });

            if (role === 'host') {
                initHost();
            } else {
                initPlayer();
            }
        } else {
            alert("Комната не существует.");
            window.location.href = 'index.html';
        }
    } catch (e) {
        console.error("Ошибка загрузки:", e);
    }
}

function initHost() {
    document.getElementById('host-screen').style.display = 'flex';
    updateHostUI();
}

function initPlayer() {
    document.getElementById('player-screen').style.display = 'flex';
    renderPlayerQuestion();
}

function updateHostUI() {
    const q = currentQuestions[currentStep];
    const textEl = document.getElementById('host-question-text');
    if (q) {
        textEl.innerText = q.text;
        document.getElementById('answers-count').innerText = "0"; // Сброс счетчика при новом вопросе
    } else {
        textEl.innerText = "Квиз завершен! 🎉";
        document.getElementById('host-controls').style.display = 'none';
    }
}

function nextQuestion() {
    if (currentStep < currentQuestions.length - 1) {
        socket.emit('next_question_signal', { room: roomCode });
    } else {
        // Сигнал конца игры
        socket.emit('next_question_signal', { room: roomCode });
    }
}

function renderPlayerQuestion() {
    const q = currentQuestions[currentStep];
    const area = document.getElementById('player-answer-area');
    const title = document.getElementById('player-question-text');

    if (!q) {
        title.innerText = "Игра окончена! 🎉";
        area.innerHTML = "<p>Спасибо за участие!</p>";
        return;
    }

    title.innerText = q.text;
    area.innerHTML = "";

    if (q.type === 'options') {
        const grid = document.createElement('div');
        grid.className = "answer-grid";
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = "btn-answer";
            btn.innerText = opt;
            btn.onclick = () => sendAnswer(opt);
            grid.appendChild(btn);
        });
        area.appendChild(grid);
    } else {
        area.innerHTML = `
            <input type="text" id="ans-input" class="answer-input" placeholder="Твой ответ...">
            <button onclick="sendAnswer(document.getElementById('ans-input').value)" class="btn-party-add">Отправить ✨</button>
        `;
    }
}

function sendAnswer(val) {
    if (!val) return;
    const name = sessionStorage.getItem('quiz_player_name') || "Аноним";
    socket.emit('send_answer', { room: roomCode, name: name, answer: val });
    
    document.getElementById('player-answer-area').innerHTML = "<h3>Ответ отправлен! 🎯</h3>";
}

// --- СЛУШАТЕЛИ СОБЫТИЙ ---

socket.on('move_to_next', () => {
    currentStep++;
    if (role === 'host') {
        updateHostUI();
    } else {
        renderPlayerQuestion();
    }
});

socket.on('new_answer', () => {
    if (role === 'host') {
        const countEl = document.getElementById('answers-count');
        countEl.innerText = parseInt(countEl.innerText) + 1;
    }
});

window.onload = loadQuizData;