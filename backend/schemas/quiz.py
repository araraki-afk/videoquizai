from pydantic import BaseModel

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
    answers: dict[int, str] #id of question and user's answer

class QuizAttemptResult(BaseModel):
    score: float
    total: int
    correct: int
    weak_topics : list[str] | None
