let quizQuestions = [];
let currentQuestionIndex = 0;

function addPreset(text) {
    quizQuestions.push({ text: text, type: 'text' });
    renderQuestions();
}

function addNewQuestion() {
    const text = prompt("Введите текст вопроса:");
    if (text) {
        const type = confirm("Сделать 4 варианта ответа? (Ок - Да, Отмена - Поле ввода)") ? 'options' : 'text';
        quizQuestions.push({ text: text, type: type });
        renderQuestions();
    }
}

function renderQuestions() {
    const list = document.getElementById('questions-list');
    list.innerHTML = "";
    quizQuestions.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = "question-item";
        qDiv.innerHTML = `
            <span>${index + 1}. ${q.text}</span>
            <button onclick="removeQuestion(${index})" style="background:none; border:none; color:red; cursor:pointer;">❌</button>
        `;
        list.appendChild(qDiv);
    });
}

function removeQuestion(index) {
    quizQuestions.splice(index, 1);
    renderQuestions();
}

function finishCreate() {
    if (quizQuestions.length === 0) {
        alert("Добавьте вопросы!");
        return;
    }
    showScreen('screen-host-panel');
    startRiddle();
}

function startRiddle() {
    const q = quizQuestions[currentQuestionIndex];
    document.getElementById('current-question-title').innerText = `Вопрос №${currentQuestionIndex + 1}`;
    document.getElementById('current-question-text').innerText = q.text;
    document.getElementById('incoming-answers').innerHTML = "";
}

function nextQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        startRiddle();
    } else {
        alert("Викторина окончена!");
    }
}

// Для теста: debugSimulateAnswer("Иван", "Пицца") в консоли
function debugSimulateAnswer(playerName, answerText) {
    const container = document.getElementById('incoming-answers');
    const row = document.createElement('div');
    row.className = "answer-row";
    row.innerHTML = `
        <span><strong>${playerName}:</strong> ${answerText}</span>
        <div>
            <button onclick="markAnswer(this, true)" class="btn-check">✅</button>
            <button onclick="markAnswer(this, false)" class="btn-wrong">❌</button>
        </div>
    `;
    container.appendChild(row);
}

function markAnswer(btn, isCorrect) {
    const row = btn.parentElement.parentElement;
    row.style.opacity = "0.5";
    row.style.borderLeft = isCorrect ? "4px solid #39FF14" : "4px solid #ff4b2b";
    row.style.pointerEvents = "none";
}