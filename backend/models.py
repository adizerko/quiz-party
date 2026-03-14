from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    code = Column(String, unique=True, index=True)
    questions_data = Column(JSON)
    current_step = Column(Integer, default=0)
    # Связь с игроками
    players = relationship("Player", back_populates="quiz", cascade="all, delete-orphan")

# models.py
class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    sid = Column(String)
    answers_history = Column(JSON, default={}) 
    # Новое поле: { "0": 1, "1": -1, "2": 0 } - хранит баллы за каждый шаг
    scores_history = Column(JSON, default={}) 
    emoji = Column(String, nullable=True)
    score = Column(Integer, default=0)
    is_host = Column(Boolean, default=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    quiz = relationship("Quiz", back_populates="players")