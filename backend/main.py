from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import fastapi_socketio as socketio
from sqlalchemy.orm import Session
from . import models, schemas, database
import os

app = FastAPI()

# 1. Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Инициализация Socket.IO
# Мы будем использовать сам sio_manager для работы с событиями
sio_manager = socketio.SocketManager(app=app, mount_location='/socket.io', cors_allowed_origins='*')

database.init_db()

# --- API Эндпоинты ---
# (Оставь свои @app.post и @app.get для квизов здесь без изменений)

@app.post("/api/quizzes", response_model=schemas.QuizResponse)
def create_quiz(quiz_data: schemas.QuizCreate, db: Session = Depends(database.get_db)):
    new_quiz = models.Quiz(
        title=quiz_data.title,
        code=quiz_data.code,
        questions_data=[q.dict() for q in quiz_data.questions]
    )
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)
    return new_quiz

@app.get("/api/quizzes/{code}")
def get_quiz(code: str, db: Session = Depends(database.get_db)):
    quiz = db.query(models.Quiz).filter(models.Quiz.code == code).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Квиз не найден")
    return quiz

# --- СОБЫТИЯ SOCKET.IO ---
# В fastapi-socketio декоратор вешается на сам менеджер

@sio_manager.on('join_room')
async def handle_join(sid, data):
    room = data.get('room')
    # ДОБАВЬ await ТУТ:
    await sio_manager.enter_room(sid, room)
    print(f"✅ Игрок {sid} подключился к комнате: {room}")

@sio_manager.on('next_question_signal')
async def handle_next_question(sid, data):
    room = data.get('room')
    print(f"📢 Сигнал смены вопроса в комнате: {room}")
    # И ТУТ (уже должен быть, но проверь):
    await sio_manager.emit('move_to_next', {}, room=room)

@sio_manager.on('send_answer')
async def handle_answer(sid, data):
    room = data.get('room')
    # И ТУТ:
    await sio_manager.emit('new_answer', data, room=room)

# --- РАЗДАЧА ФРОНТЕНДА ---
frontend_path = os.path.join(os.getcwd(), "frontend")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(frontend_path, "index.html"))

app.mount("/", StaticFiles(directory=frontend_path), name="static")