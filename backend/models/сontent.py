import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base

class ContentType(str, enum.Enum):
    youtube_url = "youtube_url"
    uploaded_video = "uploaded_video"
    raw_text = "raw_text"

class ProccesingStatus(str, enum.Enum):
    pending = "pending"
    proccesing = "proccesing"
    done = "done"
    failed = "failed"

class Content(Base):
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable = False)
    title = Column(String, nullable=False)
    content_type = Column(Enum(ContentType), nullable = False)
    source = Column(Text, nullable=False) #url, путь к файлу или текст
    raw_text = Column(Text, nullable=True)
    status = Column(Enum(ProccesingStatus), default=ProccesingStatus.pending)
    task_id = Column(String, nullable=True) #celery task id
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates = "contents")
    transcript = relationship("Transcript", back_populates="content", uselist=False)
    summary = relationship("Summary", back_populates="content", uselist=False)
    quizzes = relationship("Quiz", back_populates="content", back_populates="content")