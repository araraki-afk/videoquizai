from pydantic import BaseModel
from models.content import ContentType, ProccesingStatus

class ContentFromURL(BaseModel):
    url: str
    title: str | None = None
    difficulty: str = "medium" #easy / medium / hard
    question_count: int = "10"


class ContentFromText(BaseModel):
    text: str
    title: str | None = None
    difficulty: str = "medium" #easy / medium / hard
    question_count: int = "10"

class ContentResponse(BaseModel):
    id: int
    title: str
    content_type: ContentType
    status: ProccesingStatus
    task_id: str | None

    model_config = {"from_attributes" : True}

class ContentStatusResponse(BaseModel):
    id: int
    status: ProccesingStatus
    error_message: str | None
    
    model_config = {"from_attributes" : True}

class SummaryResponse(BaseModel):
    content_id: int
    text: str

class TranscriptResponse(BaseModel):
    content_id: int
    text: str

