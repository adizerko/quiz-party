// Переключатель экранов (если понадобится в будущем)
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.style.display = 'none');
    const target = document.getElementById(screenId);
    if (target) target.style.display = 'flex';
}

// Управление модальным окном
function openJoinModal() {
    const modal = document.getElementById('join-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('player-name').focus(); // Автофокус на имя
    }
}

function closeJoinModal() {
    const modal = document.getElementById('join-modal');
    if (modal) modal.style.display = 'none';
    
    // Правильный сброс новых ошибок при закрытии окна
    ['field-name', 'field-code'].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.classList.remove('error-active', 'error-shake');
    });
    
    ['hint-name', 'hint-code'].forEach(id => {
        const hint = document.getElementById(id);
        if (hint) hint.style.display = 'none';
    });
}

// Логика входа в игру
async function startJoining() {
    const nameInput = document.getElementById('player-name');
    const codeInput = document.getElementById('room-code');
    
    // Контейнеры полей для подсветки
    const fieldName = document.getElementById('field-name');
    const fieldCode = document.getElementById('field-code');
    
    // Тексты подсказок
    const hintName = document.getElementById('hint-name');
    const hintCode = document.getElementById('hint-code');

    const name = nameInput.value.trim();
    const code = codeInput.value.trim();

    // Сброс всех ошибок перед новой проверкой
    [fieldName, fieldCode].forEach(f => f.classList.remove('error-active', 'error-shake'));
    [hintName, hintCode].forEach(h => h.style.display = 'none'); 

    // Проверка имени
    if (!name) {
        showFieldError(fieldName, hintName, "Как тебя называть? ✨");
        return;
    }

    // Проверка кода (пустой)
    if (!code) {
        showFieldError(fieldCode, hintCode, "Введите код комнаты 🔑");
        return;
    }

    try {
        const response = await fetch(`/api/quizzes/${code}`);
        if (response.ok) {
            sessionStorage.setItem('quiz_player_name', name);
            window.location.href = `game.html?room=${code}&role=player`;
        } else {
            // Ошибка: Комната не найдена
            showFieldError(fieldCode, hintCode, "Такой комнаты не существует 🔍");
        }
    } catch (e) {
        showFieldError(fieldCode, hintCode, "Ошибка сервера. Попробуй позже 🛠");
    }
}

function showFieldError(field, hint, message) {
    // 1. Добавляем классы ошибки
    field.classList.add('error-active', 'error-shake');
    
    // 2. Устанавливаем текст и показываем его
    if (hint) {
        hint.innerText = message;
        hint.style.display = 'block'; // Показываем скрытый span
    }

    // Вибрация
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

    // Убираем только анимацию тряски, чтобы можно было тряхнуть еще раз
    setTimeout(() => {
        field.classList.remove('error-shake');
    }, 400);
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

// В js/menu.js
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');

    if (roomFromUrl) {
        // Вызываем твою функцию открытия модалки
        if (typeof openJoinModal === 'function') {
            openJoinModal();
            
            // Находим инпут кода комнаты и вставляем значение
            const roomInput = document.getElementById('room-code');
            if (roomInput) {
                roomInput.value = roomFromUrl;
                // Добавляем класс фокуса для красоты, если у тебя есть такие стили
                roomInput.parentElement.classList.add('is-active'); 
            }
            
            // Сразу фокусируемся на поле ввода имени
            const nameInput = document.getElementById('player-name');
            if (nameInput) {
                setTimeout(() => nameInput.focus(), 400);
            }
        }
    }
});