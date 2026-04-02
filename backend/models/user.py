import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base

class UserRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contents = relationship("Content", back_populates="user")
    owned_classrooms = relationship("Classroom", back_populates="owner")
    classroom_memberships = relationship("ClassroomMember", back_populates="user")