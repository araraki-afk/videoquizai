from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key = True)
    content_id = Column(Integer, ForeignKey("contents.id"), Nullable=False, unique=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default = func.now())

    content = relationship("Content", back_populates="transcript")

class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key = True)
    content_id = Column(Integer, ForeignKey("contents.id"), Nullable=False, unique=True)
    text = Column(Text, nullable=False)
    topics = Column(Text, nullable=True) #json list of topics
    created_at = Column(DateTime(timezone=True), server_default = func.now())

    content = relationship("Content", back_populates="summary")