"""
Модели для Classroom (группы преподавателя).
- Classroom: группа, которую создает преподаватель
- ClassroomMember: привязка студента к группе
- ClassroomContent: привязка контента к группе (видео/текст/pdf)
"""
import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class MemberRole(str, enum.Enum):
    teacher = "teacher"
    student = "student"


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invite_code = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="owned_classrooms")
    members = relationship("ClassroomMember", back_populates="classroom", cascade="all, delete")
    classroom_contents = relationship("ClassroomContent", back_populates="classroom", cascade="all, delete")


class ClassroomMember(Base):
    __tablename__ = "classroom_members"

    id = Column(Integer, primary_key=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(MemberRole), default=MemberRole.student)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    classroom = relationship("Classroom", back_populates="members")
    user = relationship("User", back_populates="classroom_memberships")


class ClassroomContent(Base):
    """Привязка контента к classroom + настройки теста для группы."""
    __tablename__ = "classroom_contents"

    id = Column(Integer, primary_key=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    content_id = Column(Integer, ForeignKey("contents.id"), nullable=False)
    quiz_difficulty = Column(String, default="medium")  # easy / medium / hard
    max_attempts=Column(Integer, nullable=False, default=2)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    classroom = relationship("Classroom", back_populates="classroom_contents")
    content = relationship("Content")
