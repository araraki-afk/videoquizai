from pydantic import BaseModel
from datetime import datetime


class QuestionResponse(BaseModel):
    id: int
    text: str
    question_type: str
    options: list[str] | None
    
    model_config = {"from_attributes" : True}

class QuizResponse(BaseModel):
    id: int
    title: str
    questions: list[QuestionResponse]

    model_config = {"from_attributes" : True}

class QuizAttemptSubmit(BaseModel):
    answers: dict[str, str] #id of question and user's answer


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
    weak_topics : list[str] | None
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


