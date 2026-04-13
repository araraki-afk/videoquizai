from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id         = Column(Integer, primary_key=True)
    content_id = Column(Integer, ForeignKey("contents.id"), nullable=False)
    title      = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    is_validated = Column(Boolean, default=False, nullable=False)
    max_attempts = Column(Integer, nullable=True)

    content   = relationship("Content",     back_populates="quizzes")
    questions = relationship("Question",    back_populates="quiz", cascade="all, delete")
    attempts  = relationship("QuizAttempt", back_populates="quiz")


class Question(Base):
    __tablename__ = "questions"

    id             = Column(Integer, primary_key=True)
    quiz_id        = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    text           = Column(Text, nullable=False)
    question_type  = Column(String, nullable=False)
    options        = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=False)
    topic_tag      = Column(String, nullable=True)

    quiz = relationship("Quiz", back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id         = Column(Integer, primary_key=True)
    quiz_id    = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"),   nullable=False)
    score      = Column(Float, nullable=True)
    answers    = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    quiz     = relationship("Quiz",            back_populates="attempts")