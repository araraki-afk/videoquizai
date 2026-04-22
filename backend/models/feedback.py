"""
Модель для хранения AI-аналитики попыток прохождения теста.
Одна запись на одну попытку (QuizAttempt), создается feedback_agent'ом.
"""
from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base

class AttemptFeedback(Base):
    __tablename__ = "attempt_feedbacks"

    id = Column(Integer, primary_key = True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False, unique=True)

    #общее резюме прохождения
    overall_summary=Column(Text, nullable=False,default="")

    #оценка уровня понимания материала
    mastery_score=Column(Float, nullable=True)

    per_question = Column(JSON, nullable=False,default=list)

    recommendations = Column(JSON, nullable=False, default=list)

    created_at=Column(DateTime(timezone=True), server_default=func.now())

    attempt = relationship("QuizAttempt", back_populates="feedback")