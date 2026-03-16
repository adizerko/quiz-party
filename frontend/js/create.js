let quizQuestions = [];
let editIndex = -1; // Индекс редактируемого вопроса

// В самом начале файла можно сразу задать состояние
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('q-input-type')) {
        clearForm();
    }

    const listZone = document.querySelector('.list-zone');
    if (listZone) listZone.style.display = "none";
});

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Исправленная функция выбора типа
function selectType(type, element) {
    const typeInput = document.getElementById('q-input-type');
    if (typeInput) typeInput.value = type;

    // Убираем активный класс у всех и добавляем текущему
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
    if (element) element.classList.add('active');
    
    const fields = document.getElementById('options-fields');
    const correctZone = document.getElementById('correct-answer-zone');
    
    if (type === 'options') {
        if (fields) fields.style.display = 'block';
        if (correctZone) correctZone.style.display = 'none';
    } else {
        if (fields) fields.style.display = 'none';
        if (correctZone) correctZone.style.display = 'block';
    }
}

function addQuestionToList() {
    const textEl = document.getElementById('q-input-text');
    const typeEl = document.getElementById('q-input-type');
    
    if (!textEl || !typeEl) {
        console.error("Не найдены поля ввода текста или типа вопроса");
        return;
    }

    const type = typeEl.value;
    let correct = "";
    let options = []; // ОБЯЗАТЕЛЬНО инициализируем массив здесь

    // Проверка самого вопроса
    if (!textEl.value.trim()) {
        showToast("Введите текст вопроса!");
        return;
    }

    if (type === 'text') {
        correct = document.getElementById('q-input-correct').value.trim();
        if (!correct) {
            showToast("Укажите правильный ответ!");
            return;
        }
    } else {
        // Логика для типа 'options'
        for (let i = 1; i <= 4; i++) {
            const val = document.getElementById(`opt-${i}`).value.trim();
            if (!val) {
                showToast(`Заполните вариант ${i}!`);
                return;
            }
            options.push(val);
        }
        
        const selectedRadio = document.querySelector('input[name="correct-opt"]:checked');
        if (!selectedRadio) {
            showToast("Выберите правильный вариант!");
            return;
        }
        const selectedIndex = parseInt(selectedRadio.value);
        correct = options[selectedIndex];
    }

    const questionData = {
        text: textEl.value.trim(),
        type: type,
        correct: correct,
        options: type === 'options' ? options : null
    };

    if (editIndex > -1) {
        quizQuestions[editIndex] = questionData;
        editIndex = -1;
        document.getElementById('add-btn').innerText = "ДОБАВИТЬ ВОПРОС";
        showToast("Вопрос обновлен!");
    } else {
        quizQuestions.push(questionData);
        showToast("Вопрос добавлен!");
    }

    renderQuestions();
    clearForm();
}

function renderQuestions() {
    const list = document.getElementById('questions-list');
    const countEl = document.getElementById('q-count');
    const listZone = document.querySelector('.list-zone');

    list.innerHTML = "";
    countEl.innerText = quizQuestions.length;

    // Если нет вопросов — скрываем весь блок
    if (quizQuestions.length === 0) {
        listZone.style.display = "none";
        return;
    } else {
        listZone.style.display = "block";
    }

    quizQuestions.forEach((q, index) => {
        const div = document.createElement('div');
        div.className = "question-row";

        let answersHtml = "";
        if (q.type === 'options') {
            answersHtml = `<div class="preview-options-grid">`;
            q.options.forEach(opt => {
                const isCorrect = opt === q.correct;
                answersHtml += `<div class="preview-opt-item ${isCorrect ? 'is-correct' : ''}">${opt} ${isCorrect ? '<i class="fa fa-check"></i>' : ''}</div>`;
            });
            answersHtml += `</div>`;
        } else {
            answersHtml = `<div class="preview-correct-text">Ответ: ${q.correct}</div>`;
        }

        div.innerHTML = `
        <div class="question-card">

            <div class="question-top">
                <div class="question-number">${index + 1}</div>

                <div class="question-text">
                    ${q.text}
                </div>

                <div class="question-actions">
                    <button class="action-btn btn-edit" onclick="editQuestion(${index})">
                        <i class="fa fa-pen"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="removeQuestion(${index})">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>

            ${answersHtml}

        </div>
        `;
        list.appendChild(div);
    });
}

function editQuestion(index) {
    const q = quizQuestions[index];
    editIndex = index;

    // Заполняем форму данными вопроса
    document.getElementById('q-input-text').value = q.text;
    
    // Переключаем тип
    const typeOptions = document.querySelectorAll('.type-option');
    if (q.type === 'text') {
        selectType('text', typeOptions[0]);
        document.getElementById('q-input-correct').value = q.correct;
    } else {
        selectType('options', typeOptions[1]);
        q.options.forEach((opt, i) => {
            document.getElementById(`opt-${i+1}`).value = opt;
            if (opt === q.correct) {
                document.querySelectorAll('input[name="correct-opt"]')[i].checked = true;
            }
        });
    }

    document.getElementById('add-btn').innerText = "СОХРАНИТЬ ИЗМЕНЕНИЯ";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearForm() {
    document.getElementById('q-input-text').value = "";
    document.getElementById('q-input-correct').value = "";
    document.querySelectorAll('.opt-input').forEach(i => i.value = "");
    
    // Сброс на "Текст" по умолчанию
    const typeOptions = document.querySelectorAll('.type-option');
    if (typeOptions.length > 0) {
        selectType('text', typeOptions[0]);
    }
}

function removeQuestion(index) {
    quizQuestions.splice(index, 1);
    renderQuestions();
    showToast("Вопрос удален");
}

// Проверь saveAndGo, чтобы не было ошибок если сервер упал
async function saveAndGo() {
    const title = document.getElementById('quiz-title-input').value.trim();
    if (!title) { showToast("Введите название вечеринки!"); return; }
    if (quizQuestions.length === 0) { showToast("Добавьте хотя бы один вопрос!"); return; }

    const roomCode = 'PARTY-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    // Сначала пробуем отправить, если не вышло — ловим ошибку
    try {
        const response = await fetch('/api/quizzes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title, code: roomCode, questions: quizQuestions }),
        });
        
        if (response.ok) {
            window.location.href = `game.html?role=host&room=${roomCode}`;
        } else {
             showToast("Сервер не принял данные");
        }
    } catch (e) {
        console.error("Server error:", e);
        showToast("Backend не запущен! Проверь Python.");
    }
}

// Запрет зума через жесты
document.addEventListener('touchmove', function (event) {
    if (event.scale !== 1) { 
        event.preventDefault(); 
    }
}, { passive: false });

// Запрет зума через двойной тап
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);
