from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class QuestionResponse(BaseModel):
    id: int
    text: str
    question_type: str
    options: list[str] | None

    model_config = {"from_attributes": True}


class QuizResponse(BaseModel):
    id: int
    title: str
    questions: list[QuestionResponse]

    model_config = {"from_attributes": True}


#Teacher draft / edit views

class QuestionFullResponse(BaseModel):
    """Same as QuestionResponse but includes the correct answer + topic."""
    id: int
    text: str
    question_type: str
    options: list[str] | None
    correct_answer: str
    topic_tag: str | None = None

    model_config = {"from_attributes": True}


class QuizFullResponse(BaseModel):
    """Full quiz view for teachers (drafts + classroom copies)."""
    id: int
    content_id: int
    title: str
    is_validated: bool
    classroom_id: int | None = None
    deadline: datetime | None = None
    max_attempts: int | None = None
    source_quiz_id: int | None = None
    created_at: datetime
    questions: list[QuestionFullResponse]

    model_config = {"from_attributes": True}


class QuizDraftSummary(BaseModel):
    """Compact draft entry for the 'Test Drafts' folder."""
    id: int
    content_id: int
    content_title: str
    title: str
    question_count: int
    is_validated: bool
    created_at: datetime
    assigned_count: int = 0  # how many classrooms this draft has been pushed to


class QuestionUpdate(BaseModel):
    text: str | None = None
    question_type: str | None = None
    options: list[str] | None = None
    correct_answer: str | None = None
    topic_tag: str | None = None


class QuestionCreate(BaseModel):
    text: str
    question_type: str = "multiple_choice"
    options: list[str] | None = None
    correct_answer: str
    topic_tag: str | None = None


class QuizUpdate(BaseModel):
    title: str | None = None


class QuizAssignToClassrooms(BaseModel):
    classroom_ids: list[int]
    max_attempts: int | None = None  # None = unlimited
    deadline: datetime | None = None


#Submission / results

class QuizAttemptSubmit(BaseModel):
    answers: dict[str, str]  # id of question and user's answer


class PerQuestionFeedback(BaseModel):
    question_id: int
    question_text: str
    topic: str | None = None
    user_answer: str
    correct_answer: str
    is_correct: bool
    skipped: bool
    explanation: str
    mistake_type: str | None = None


class RecommendationItem(BaseModel):
    topic: str
    reason: str
    action: str


class AttemptFeedbackResponse(BaseModel):
    overall_summary: str
    mastery_score: float | None = None
    per_question: list[PerQuestionFeedback]
    recommendations: list[RecommendationItem]
    strengths: list[str]


class QuizAttemptResult(BaseModel):
    attempt_id: int
    score: float
    total: int
    correct: int
    weak_topics: list[str] | None
    feedback: AttemptFeedbackResponse


class AttemptSummaryResponse(BaseModel):
    id: int
    quiz_id: int
    quiz_title: str | None = None
    score: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AttemptDetailResponse(BaseModel):
    id: int
    quiz_id: int
    quiz_title: str | None = None
    score: float | None = None
    created_at: datetime
    feedback: AttemptFeedbackResponse | None = None