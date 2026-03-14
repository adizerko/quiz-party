const socket = io();

let currentStep = 0;
let maxReachedStep = 0;
let currentQuestions = [];
let scoreChanges = {};
let scoreOverrides = {};

let answersHistory = {}


const scoreOverride = {};
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');
const role = urlParams.get('role');
const playerName = role === 'host' ? 'HOST' : (sessionStorage.getItem('quiz_player_name') || "Игрок");

async function init() {
    if (document.getElementById('display-room-code')) {
        document.getElementById('display-room-code').innerText = roomCode;
    }

    try {
        const response = await fetch(`/api/quizzes/${roomCode}`);
        if (response.ok) {
            const data = await response.json();
            currentQuestions = data.questions_data;
            renderProgress();
            
            socket.emit('join_room', { 
                room: roomCode, 
                name: playerName, 
                role: role 
            });

            if (role === 'host') {
                document.getElementById('host-screen').style.display = 'block';
            } else {
                document.getElementById('player-screen').style.display = 'block';
            }
        } else {
            alert("Комната не найдена!");
            window.location.href = 'index.html';
        }
    } catch (e) {
        console.error("Ошибка инициализации:", e);
    }
}

function startGame() {

    currentStep = 0;

    socket.emit('start_game_signal', { room: roomCode });

    setTimeout(() => {
        updateHostUI();
        renderProgress();
    }, 100);

}

function nextQuestion() {

    socket.emit("check_answers_before_next", {
        room: roomCode,
        step: currentStep
    });

}

function showModernConfirm(msg, onConfirm) {
    const overlay = document.getElementById('confirm-overlay');
    overlay.style.display = 'flex';
    document.getElementById('confirm-proceed-btn').onclick = () => {
        overlay.style.display = 'none';
        onConfirm();
    };
}

function proceedToNext() {
    if (currentStep < currentQuestions.length - 1) {
        socket.emit("next_question_signal", { room: roomCode });
    } else {
        socket.emit("finish_game_signal", { room: roomCode });
    }
}

function changeScore(targetName, points) {
    socket.emit("override_score", {
        room: roomCode,
        playerName: targetName,
        points: points,
        questionIndex: currentStep
    });
}

function renderProgress() {
    const container = document.getElementById("questions-progress");
    if (!container) return;

    container.innerHTML = currentQuestions.map((_, i) => {
        let stateClass = "future";
        if (i < maxReachedStep) stateClass = "done";
        if (i === currentStep) stateClass = "active";

        // Точка пульсирует именно под тем вопросом, на котором реально идет игра (maxReachedStep)
        const showDot = (i === maxReachedStep);

        return `
        <div class="q-step-wrapper" style="display: inline-flex; flex-direction: column; align-items: center; margin: 0 4px; cursor: pointer;">
            <div class="q-step ${stateClass}" onclick="jumpToQuestion(${i})">
                ${i + 1}
            </div>
            ${showDot ? '<div class="pulse-dot"></div>' : '<div style="height: 12px; margin-top: 4px;"></div>'}
        </div>
        `;
    }).join("");
}

function jumpToQuestion(step) {
    if (role !== 'host') return;
    currentStep = step;
    socket.emit('move_to_step', { room: roomCode, step: step });
    socket.emit("get_update", roomCode); 
    refreshUI();
}

function renderScoreboard(players) {
    const board = document.getElementById("scoreboard");
    if (!board) return;

    const sorted = [...players]
        .filter(p => !p.is_host)
        .sort((a, b) => (b.score || 0) - (a.score || 0));

    // Находим самый высокий балл
    const maxScore = sorted.length > 0 ? sorted[0].score : 0;

    board.innerHTML = sorted.map((p, i) => {
        // Лидер — каждый, у кого балл равен максимальному (и он больше нуля)
        const isLeader = p.score === maxScore && maxScore > 0;

        return `
        <div class="score-row ${isLeader ? "leader-row" : ""}">
            <span>${isLeader ? "👑" : i + 1 + "."} ${p.name}</span>
            <span>${p.score || 0} 🏆</span>
        </div>
        `;
    }).join("");
}

function handleScoreClick(playerName, points) {
    const key = `${playerName}_${currentStep}`;
    
    socket.emit("override_score", {
        room: roomCode,
        playerName: playerName,
        points: points,
        questionIndex: currentStep
    });

    scoreOverrides[key] = !scoreOverrides[key];
    
    socket.emit("get_update", roomCode); 
}

function sendAnswer(val) {
    socket.emit('send_answer', { 
        room: roomCode, 
        name: playerName, 
        answer: val, 
        questionIndex: currentStep 
    });
    
    document.getElementById('player-answer-area').innerHTML = `
        <div class="empty-list-msg" style="margin-top:20px;">
            <h3>Ответ отправлен! 🚀</h3>
            <p>Ждем остальных...</p>
        </div>
    `;
}

const playerEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', 
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', 
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', 
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', 
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', 
    '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', 
    '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', 
    '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', 
    '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', 
    '👿', '👹', '👺', '🤡', '👻', '💀', '☠️', '👽', '👾', '🤖', 
    '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
];

function getRandomEmoji() {
    return playerEmojis[Math.floor(Math.random() * playerEmojis.length)];
}

socket.on('update_players', (players) => {
    const list = document.getElementById('lobby-players-list');
    if (list && role === 'host') {
        list.innerHTML = players.filter(p => !p.is_host).map(p => `
            <div class="player-row-lobby">
                <span class="player-emoji-icon">${p.emoji || '👤'}</span>
                <span class="player-name-lobby">${p.name}</span>
            </div>
        `).join('');
    }
});


socket.on("game_started", (players) => {
    const me = players.find(p => p.name === playerName);
    if (me) myEmoji = me.emoji;
    if (role === "host") {
        document.getElementById("host-lobby").style.display = "none";
        document.getElementById("host-game-area").style.display = "block";

        renderProgress();
        updateHostUI();

        const grid = document.getElementById("players-answers-grid");
        grid.innerHTML = players.filter(p => !p.is_host).map(p => `
            <div class="answer-card waiting">
                <div class="answer-info">
                    <div class="answer-name" style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 2rem;">${p.emoji || '👤'}</span> 
                        <span style="font-size: 1.2rem; font-weight: bold;">${p.name}</span>
                    </div>
                    <div class="answer-text">⏳ ожидает ответа</div>
                </div>
                <div class="answer-buttons"></div>
            </div>
        `).join('');

        renderScoreboard(players);
    } else {
        document.getElementById("player-wait").style.display = "none";
        document.getElementById("player-game-area").style.display = "block";
        renderPlayerQuestion();
    }
    socket.emit("get_update", roomCode);
    renderProgress();
});

socket.on("update_answers", (players) => {
    if (role !== "host") return;
    
    renderScoreboard(players);
    const grid = document.getElementById("players-answers-grid");
    const currentQ = currentQuestions[currentStep];

    grid.innerHTML = players.filter(p => !p.is_host).map(p => {
        const answers = p.answers_history || {};
        const scores = p.scores_history || {};
        const stepKey = currentStep.toString();
        const answerText = answers[stepKey];
        const questionScore = scores[stepKey];
        const isAnswered = answerText !== undefined && answerText !== null && answerText.trim() !== "";

        let statusClass = "waiting";
        let displayAnswer = "⏳ ожидает ответа...";
        let btnHTML = "";

        if (isAnswered) {
            displayAnswer = answerText;
            const isCorrect = answerText.toLowerCase().trim() === currentQ.correct.toLowerCase().trim();
            const currentStatus = questionScore !== undefined ? questionScore : (isCorrect ? 1 : 0);

            // КНОПКИ АДМИНА (изменен дизайн и текст)
            if (currentStatus === 1) {
                statusClass = "correct";
                btnHTML = `<button class="btn-score btn-minus" style="padding: 8px 12px; box-shadow: 0 4px 10px rgba(255,118,117,0.3);" onclick="changeScore('${p.name}', -1)">❌ Забрать балл</button>`;
            } else {
                statusClass = "wrong";
                btnHTML = `<button class="btn-score btn-plus" style="padding: 8px 12px; box-shadow: 0 4px 10px rgba(46,204,113,0.3);" onclick="changeScore('${p.name}', 1)">✅ Дать балл</button>`;
            }
        }

        // КРАСИВОЕ ВЫДЕЛЕНИЕ ОТВЕТА ИГРОКА
        const answerHtml = isAnswered 
            ? `<div style="font-size: 1.2rem; font-weight: 800; color: #2d3436; background: rgba(0,0,0,0.04); padding: 6px 12px; border-radius: 8px; display: inline-block; margin-top: 4px;">${displayAnswer}</div>`
            : `<div class="answer-text">${displayAnswer}</div>`;

        return `
            <div class="answer-card ${statusClass}">
                <div class="answer-info">
                    <div class="answer-name" style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 2rem;">${p.emoji || '👤'}</span> 
                        <span style="font-size: 1.2rem; font-weight: bold;">${p.name}</span>
                    </div>
                    ${answerHtml}
                </div>
                <div class="answer-buttons">${btnHTML}</div>
            </div>
        `;
    }).join("");
});

socket.on('show_results', (data) => {
    document.getElementById('host-screen').style.display = 'none';
    document.getElementById('player-screen').style.display = 'none';
    document.getElementById('finish-screen').style.display = 'block';
    
    const resultsList = document.getElementById('final-results-list');
    const maxScore = data.results.length > 0 ? data.results[0].score : 0;

    resultsList.innerHTML = `
        <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: var(--party-purple); font-size: 2.2rem; margin: 0;">🏆 Итоги игры! 🏆</h2>
        </div>
        ${data.results.map((p, i) => {
            const isWinner = p.score === maxScore && maxScore > 0;
            return `
            <div class="player-row-lobby" style="${isWinner ? 'border: 2px solid gold; background: #fffdf0; transform: scale(1.03); box-shadow: 0 8px 20px rgba(255,215,0,0.3); margin-bottom: 15px;' : 'opacity: 0.9'}">
                <span class="player-emoji-icon" style="${isWinner ? 'font-size: 3.5rem;' : ''}">${p.emoji || '👤'}</span>
                <span class="player-name-lobby" style="flex: 1; ${isWinner ? 'font-size: 1.4rem; color: #d4af37;' : ''}">${isWinner ? '👑 ' : ''}${p.name}</span>
                <span style="font-weight: 900; font-size: ${isWinner ? '1.5rem' : '1.2rem'}; color: var(--party-purple); background: #f0ebf8; padding: 5px 12px; border-radius: 15px;">
                    ${p.score}
                </span>
            </div>
            `;
        }).join('')}
    `;
});

socket.on("move_to_next", (data) => {
    currentStep = data.step;
    if (currentStep > maxReachedStep) {
        maxReachedStep = currentStep;
    }
    refreshUI();
});

socket.on("answers_check_result", (data) => {

    if (!data.allAnswered) {

        showModernConfirm("Не все ответили! Всё равно идём дальше?", () => {
            proceedToNext();
        });

    } else {
        proceedToNext();
    }

});

function refreshUI() {
    renderProgress();
    if (role === 'host') {
        updateHostUI();
        // Запрашиваем актуальные данные игроков для этого шага
        socket.emit("get_update", roomCode); 
        
        const btn = document.getElementById('next-btn');
        btn.innerText = (currentStep === currentQuestions.length - 1) ? "Финиш" : "Следующий";
    } else {
        renderPlayerQuestion();
    }
}

function updateHostUI() {

    const q = currentQuestions[currentStep];

    document.getElementById("host-question-text").innerText =
        `${currentStep + 1}. ${q.text}`;

    document.getElementById("correct-answer").innerText =
        "Правильный ответ: " + q.correct;

}

function renderPlayerQuestion() {
    const q = currentQuestions[currentStep];
    const area = document.getElementById('player-answer-area');
    const title = document.getElementById('player-question-text');
    
    if (!q) return;

    // Добавлена плашка с именем и эмодзи
    title.innerHTML = `
        <div style="background: white; padding: 8px 20px; border-radius: 20px; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 20px; color: #333;">
            <span style="font-size: 1.6rem;">${myEmoji}</span>
            <span style="font-size: 1.1rem; font-weight: 800;">${playerName}</span>
        </div>
        <div style="color: var(--party-purple); font-weight: 700; margin-bottom: 8px; font-size: 0.9rem; text-transform: uppercase;">
            Вопрос ${currentStep + 1} из ${currentQuestions.length}
        </div>
        <div style="font-size: 1.3rem; font-weight: 800; line-height: 1.4;">
            ${q.text}
        </div>
    `;
    
    if (q.type === 'options') {
        area.innerHTML = `
            <div class="menu-grid" style="margin-top: 20px;">
                ${q.options.map(o => `
                    <button class="btn-answer" onclick="sendAnswer('${o}')">${o}</button>
                `).join('')}
            </div>
        `;
    } else {
        area.innerHTML = `
            <div style="margin-top: 20px;">
                <input type="text" id="ans-text" class="answer-input" placeholder="Твой ответ...">
                <button onclick="sendAnswer(document.getElementById('ans-text').value)" class="btn-party-direct">ОТПРАВИТЬ</button>
            </div>
        `;
    }
}

function showToast(text) {

    let toast = document.getElementById("toast");

    if (!toast) {

        toast = document.createElement("div");
        toast.id = "toast";

        toast.style.position = "fixed";
        toast.style.bottom = "30px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%)";

        toast.style.background = "#333";
        toast.style.color = "white";

        toast.style.padding = "12px 20px";
        toast.style.borderRadius = "12px";

        toast.style.fontWeight = "600";
        toast.style.zIndex = "9999";

        document.body.appendChild(toast);

    }

    toast.innerText = text;
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 2000);

}

window.onload = init;