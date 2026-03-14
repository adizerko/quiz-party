const socket = io();
let currentQuestions = [];
let currentStep = 0;
let scoreChanges = {};
let scoreOverrides = {}; // Храним ручные правки: { "PlayerName_0": true/false }

const scoreOverride = {}; // key = playerName + "_" + step
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');
const role = urlParams.get('role');
const playerName = role === 'host' ? 'HOST' : (sessionStorage.getItem('quiz_player_name') || "Игрок");

// Инициализация игры
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

// Управление игрой (только для Хоста)
function startGame() {

    currentStep = 0;

    socket.emit('start_game_signal', { room: roomCode });

    setTimeout(() => {
        updateHostUI();
        renderProgress();
    }, 100);

}

// ИСПРАВЛЕНИЕ 5: Замена стандартного alert/confirm на современный
function nextQuestion() {
    const players = document.querySelectorAll("#players-answers-grid .answer-card");
    let allAnswered = true;

    players.forEach(el => {
        if(el.querySelector(".answer-text").innerText.includes("ожидает")) {
            allAnswered = false;
        }
    });

    if(!allAnswered) {
        showModernConfirm("Не все игроки ответили! Всё равно перейти к следующему вопросу?", proceedToNextQuestion);
        return;
    }
    proceedToNextQuestion();
}

// Новая функция для современного алерта (оставляем твой класс party-card)
function showModernConfirm(msg, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'modern-confirm-overlay';
    overlay.innerHTML = `
        <div class="party-card modern-confirm-box">
            <h3 style="margin-top: 0; color: var(--party-purple); font-size: 1.5rem;">Внимание! 👀</h3>
            <p style="font-weight: 600; margin-bottom: 25px;">${msg}</p>
            <div style="display: flex; gap: 10px;">
                <button class="btn-party-main" style="background: var(--error-red); flex: 1; padding: 12px;" id="btn-cancel">ОТМЕНА</button>
                <button class="btn-party-main" style="background: var(--success-green); flex: 1; padding: 12px;" id="btn-confirm">ДАЛЬШЕ</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-cancel').onclick = () => document.body.removeChild(overlay);
    document.getElementById('btn-confirm').onclick = () => {
        document.body.removeChild(overlay);
        callback();
    };
}

// Функция, которая вызывается, когда мы точно решили идти дальше
function proceedToNextQuestion() {
    if(currentStep < currentQuestions.length - 1) {
        socket.emit("next_question_signal", { room: roomCode });
    } else {
        socket.emit("finish_game_signal", { room: roomCode });
    }
}


// ИСПРАВЛЕНИЕ 2 и 3: Разрешаем менять очки всем (убрана блокировка if(!correct) return;)
function changeScore(targetName, points) {
    const key = targetName + "_" + currentStep;

    const card = [...document.querySelectorAll("#players-answers-grid .answer-card")].find(c => c.querySelector(".answer-name").innerText === targetName);
    if(!card) return;

    // Убрана проверка if(!correct), чтобы можно было менять очки любому игроку

    if(!scoreOverride[key]) scoreOverride[key] = 0;

    // Высчитываем, каким станет оверрайд после нажатия
    const newScore = scoreOverride[key] + points;

    // Не даем уйти за пределы +1 и -1 за один вопрос (защита от спама кнопкой)
    if(newScore > 1 || newScore < -1) return; 

    socket.emit("override_score", {
        room: roomCode,
        playerName: targetName,
        points: points
    });

    scoreOverride[key] = newScore;
}

// ИСПРАВЛЕНИЕ 4: Убрана логика 'done' (зеленый цвет для предыдущих)
// ИСПРАВЛЕНИЕ 4: Отрисовка прогресса с запоминанием пройденного пути
function renderProgress() {
    const container = document.getElementById("questions-progress");
    if (!container) return;

    // УБИРАЕМ КНОПКУ НАЗАД (Пункт 4)
    // Если у тебя в HTML была кнопка с id="prev-btn", удали её или скрой:
    const prevBtn = document.getElementById("prev-question-btn");
    if (prevBtn) prevBtn.style.display = "none";

    container.innerHTML = currentQuestions.map((_, i) => {
        let stateClass = "";
        
        if (i < currentStep) {
            stateClass = "done";    // Пройденные (зеленые)
        } else if (i === currentStep) {
            stateClass = "active";  // Текущий (желтый/синий)
        } else {
            stateClass = "waiting"; // Будущие (серые)
        }

        return `<div class="q-step ${stateClass}">${i + 1}</div>`;
    }).join("");
}

function jumpToQuestion(step) {

    currentStep = step;

    socket.emit('move_to_step', {
        room: roomCode,
        step: step
    });

    refreshUI(); // обновляем карточки, прогресс и правильный ответ
}

function renderScoreboard(players) {

    const board = document.getElementById("scoreboard");
    if (!board) return;

    const sorted = [...players]
        .filter(p => !p.is_host)
        .sort((a, b) => (b.score || 0) - (a.score || 0));

    board.innerHTML = sorted.map((p, i) => {

        const leader = i === 0;

        return `
        <div class="score-row ${leader ? "leader-row" : ""}">
            <span>${leader ? "👑" : i + 1 + "."} ${p.name}</span>
            <span>${p.score || 0} 🏆</span>
        </div>
        `;

    }).join("");

}

function handleScoreClick(playerName, points) {
    const key = `${playerName}_${currentStep}`;
    
    // Отправляем на сервер изменение баллов
    socket.emit("override_score", {
        room: roomCode,
        playerName: playerName,
        points: points,
        questionIndex: currentStep
    });

    // Инвертируем состояние для смены кнопки
    scoreOverrides[key] = !scoreOverrides[key];
    
    // Просим сервер прислать обновленный список игроков, чтобы сработал update_answers
    socket.emit("get_update", roomCode); 
}

// Отправка ответа (для Игрока)
function sendAnswer(val) {
    socket.emit('send_answer', { room: roomCode, name: playerName, answer: val });
    document.getElementById('player-answer-area').innerHTML = `
        <div class="empty-list-msg" style="margin-top:20px;">
            <h3>Ответ отправлен! 🚀</h3>
            <p>Ждем остальных...</p>
        </div>
    `;
}

// --- СЛУШАТЕЛИ SOCKET.IO ---

// Массив случайных эмодзи лиц для игроков
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

// Функция для получения случайного эмодзи
function getRandomEmoji() {
    return playerEmojis[Math.floor(Math.random() * playerEmojis.length)];
}

// --- ОБНОВЛЕННЫЕ СЛУШАТЕЛИ ---

// 1. Обновленный список игроков в ЛОББИ (до начала игры)
socket.on('update_players', (players) => {
    const list = document.getElementById('lobby-players-list');
    if (list && role === 'host') {
        const onlyPlayers = players.filter(p => !p.is_host);
        
        // Отрисовываем в новом компактном стиле: Иконка Имя
        list.innerHTML = onlyPlayers.map(p => {
            const emoji = getRandomEmoji(); // Генерируем эмодзи для отображения
            return `
                <div class="player-row-lobby">
                    <span class="player-emoji-icon">${emoji}</span>
                    <span class="player-name-lobby">${p.name}</span>
                </div>
            `;
        }).join('');
    }
});

// ИСПРАВЛЕНИЕ 1: Убрана ошибка renderPlayersList, из-за которой не появлялись игроки
socket.on("game_started", (players) => {
    if (role === "host") {
        document.getElementById("host-lobby").style.display = "none";
        document.getElementById("host-game-area").style.display = "block";

        renderProgress(); // квадратики с номерами вопросов
        updateHostUI();  // вопрос и правильный ответ

        // ИСПРАВЛЕНИЕ 1: Показываем игроков сразу со старта
        const grid = document.getElementById("players-answers-grid");
        grid.innerHTML = players
            .filter(p => !p.is_host)
            .map(p => `
                <div class="answer-card waiting">
                    <div class="answer-info">
                        <div class="answer-name">${p.name}</div>
                        <div class="answer-text">⏳ ожидает ответа</div>
                    </div>
                    <div class="answer-buttons">
                        <button class="btn-score btn-plus" onclick="changeScore('${p.name}', 1)">+1</button>
                        <button class="btn-score btn-minus" onclick="changeScore('${p.name}', -1)">−1</button>
                    </div>
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

// 2. Обновленный экран ответов (во время игры)
// Мы тоже добавляем эмодзи сюда, чтобы стиль был единым
socket.on("update_answers", (players) => {
    if (role !== "host") return;

    const grid = document.getElementById("players-answers-grid");
    const currentQ = currentQuestions[currentStep];

    grid.innerHTML = players
        .filter(p => !p.is_host)
        .map(p => {
            const isAnswered = !!p.answer;
            const isCorrect = isAnswered && p.answer.toLowerCase().trim() === currentQ.correct.toLowerCase().trim();
            
            // Логика кнопок (Пункт 2 твоих требований)
            const key = `${p.name}_${currentStep}`;
            const hasManualChange = scoreOverrides[key]; // Нажимал ли хост уже кнопку?
            
            let btnHTML = "";
            if (isAnswered) {
                if (isCorrect) {
                    // Если верно: изначально кнопка -1. Если нажали (override), то +1
                    btnHTML = !hasManualChange 
                        ? `<button class="btn-score btn-minus" onclick="handleScoreClick('${p.name}', -1)">−1</button>`
                        : `<button class="btn-score btn-plus" onclick="handleScoreClick('${p.name}', 1)">+1</button>`;
                } else {
                    // Если неверно: изначально кнопка +1. Если нажали (override), то -1
                    btnHTML = !hasManualChange 
                        ? `<button class="btn-score btn-plus" onclick="handleScoreClick('${p.name}', 1)">+1</button>`
                        : `<button class="btn-score btn-minus" onclick="handleScoreClick('${p.name}', -1)">−1</button>`;
                }
            }

            const statusClass = isAnswered ? (isCorrect ? "correct" : "wrong") : "waiting";
            const answerText = isAnswered 
                ? `<span class="ans-label">Ответ:</span> <strong>${p.answer}</strong>` 
                : `⏳ ожидает...`;

            // Пункт 5: Добавляем смайлик p.emoji (убедись, что на бэкенде он передается в объекте игрока)
            return `
                <div class="answer-card ${statusClass}">
                    <div class="answer-info">
                        <div class="answer-name">${p.emoji || '👤'} ${p.name}</div>
                        <div class="answer-text">${answerText}</div>
                    </div>
                    <div class="answer-buttons">
                        ${btnHTML}
                    </div>
                </div>
            `;
        })
        .join("");
});

socket.on('show_results', (data) => {
    // Скрываем игровые экраны
    document.getElementById('host-screen').style.display = 'none';
    document.getElementById('player-screen').style.display = 'none';
    
    const finishScreen = document.getElementById('finish-screen');
    finishScreen.style.display = 'block';

    const resultsList = document.getElementById('final-results-list');
    const winner = data.results[0];

    // Генерируем красивый список с визуализацией
    resultsList.innerHTML = `
        <div class="winner-announcement" style="margin-bottom: 30px; animation: tada 1s ease-in-out;">
            <div style="font-size: 4rem;">🏆</div>
            <h2 style="color: var(--party-purple); font-size: 1.8rem; margin: 10px 0;">${winner.name}</h2>
            <p style="font-weight: 800; color: var(--party-pink); letter-spacing: 1px;">АБСОЛЮТНЫЙ ЧЕМПИОН!</p>
        </div>
        
        <div class="results-table">
            ${data.results.map((p, i) => {
                const emoji = getRandomEmoji(); // Твои новые эмодзи
                const isWinner = i === 0;
                return `
                    <div class="player-row-lobby" style="${isWinner ? 'border: 2px solid var(--party-pink); background: #fffafb;' : ''}">
                        <span style="font-weight: 800; width: 25px; color: #a1a1a1;">${i + 1}</span>
                        <span class="player-emoji-icon">${isWinner ? '👑' : emoji}</span>
                        <span class="player-name-lobby" style="flex-grow: 1;">${p.name}</span>
                        <span style="font-weight: 800; color: var(--party-purple);">${p.score} <small>очков</small></span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
});

socket.on("move_to_next", () => {

    currentStep++;

    refreshUI();

})

// Вспомогательные функции
function refreshUI() {

    renderProgress();

    if (role === 'host') {

        updateHostUI();

        const btn = document.getElementById('next-btn');

        btn.innerText =
            (currentStep === currentQuestions.length - 1)
            ? "Финиш"
            : "Следующий";

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

    title.innerText =
    `${currentStep + 1} / ${currentQuestions.length}
    ${q.text}`;
    
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