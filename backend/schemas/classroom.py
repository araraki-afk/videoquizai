from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# ── Requests ─────────────────────────────────────

class ClassroomCreate(BaseModel):
    name: str
    description: str | None = None


class ClassroomAddMember(BaseModel):
    email: EmailStr


class ClassroomAssignContent(BaseModel):
    content_id: int
    quiz_difficulty: str = "medium"  # easy / medium / hard
    max_attempts: int | None = 2


class ClassroomJoinRequest(BaseModel):
    invite_code: str


# ── Responses ────────────────────────────────────

class ClassroomMemberResponse(BaseModel):
    id: int
    user_id: int
    email: str
    full_name: str
    role: str
    joined_at: datetime


class ClassroomContentResponse(BaseModel):
    id: int
    content_id: int
    content_title: str
    content_type: str
    content_status: str
    quiz_difficulty: str
    max_attempts: int | None
    assigned_at: datetime


class ClassroomResponse(BaseModel):
    id: int
    name: str
    description: str | None
    owner_id: int
    invite_code: str | None
    created_at: datetime
    member_count: int = 0


class ClassroomDetailResponse(BaseModel):
    id: int
    name: str
    description: str | None
    owner_id: int
    invite_code: str | None
    created_at: datetime
    members: list[ClassroomMemberResponse]
    contents: list[ClassroomContentResponse]


# ── Analytics ────────────────────────────────────

class StudentAttemptInfo(BaseModel):
    student_id: int
    student_name: str
    student_email: str
    attempt_id: int
    quiz_title: str
    score: float | None
    created_at: datetime


class TopicWeakness(BaseModel):
    topic: str
    error_count: int
    student_count: int


class ClassroomAnalyticsResponse(BaseModel):
    classroom_id: int
    classroom_name: str
    total_students: int
    total_attempts: int
    average_score: float
    attempts: list[StudentAttemptInfo]
    weak_topics: list[TopicWeakness]
    score_distribution: dict[str, int]  # "0-40": 3, "40-70": 5, "70-100": 2
