// Информация об игроке
let playerName = "";
let roomCode = "";

// Функция входа в игру
function joinGame() {
    playerName = document.getElementById('player-name').value;
    roomCode = document.getElementById('join-room-code').value;

    if (playerName && roomCode) {
        console.log(`Игрок ${playerName} входит в комнату ${roomCode}`);
        showScreen('screen-player');
        
        // В будущем здесь будет запрос к бэкенду. 
        // А пока имитируем получение первого вопроса через 2 секунды.
        setTimeout(() => {
            renderPlayerQuestion("Как зовут собаку именинника?", "text");
        }, 2000);
    } else {
        alert("Заполни все поля!");
    }
}

// Рисуем интерфейс вопроса для игрока
function renderPlayerQuestion(text, type) {
    const questionTitle = document.getElementById('player-question-text');
    const answerZone = document.getElementById('player-answer-zone');
    
    questionTitle.innerText = text;
    answerZone.innerHTML = ""; // Очищаем зону ответа

    if (type === 'text') {
        // Если вопрос требует ввода текста
        answerZone.innerHTML = `
            <input type="text" id="answer-input" placeholder="Твой ответ...">
            <button onclick="sendAnswer()" class="btn-primary">Отправить</button>
        `;
    } else if (type === 'options') {
        // Если вопрос с 4 вариантами (для примера пока статика)
        const options = ["Вариант А", "Вариант Б", "Вариант В", "Вариант Г"];
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = "btn-secondary";
            btn.style.marginBottom = "10px";
            btn.innerText = option;
            btn.onclick = () => sendAnswer(option);
            answerZone.appendChild(btn);
        });
    }
}

// Отправка ответа
function sendAnswer(selectedOption = null) {
    const answer = selectedOption || document.getElementById('answer-input').value;
    
    if (!answer) return;

    // Скрываем интерфейс, чтобы нельзя было ответить дважды
    document.getElementById('player-answer-zone').innerHTML = `
        <div style="margin-top:20px;">
            <p>✅ Ответ отправлен!</p>
            <p style="font-size:0.8rem; opacity:0.6;">Ждем решения ведущего...</p>
        </div>
    `;
    
    console.log("Ответ игрока:", answer);
    
    // В будущем тут будет: api.postAnswer(playerName, answer);
}