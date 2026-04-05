import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_user
from core.config import settings
from models.user import User
from models.content import Content, ContentType, ProccesingStatus
from models.transcript import Transcript, Summary
from schemas.content import (
    ContentFromURL, ContentFromText,
    ContentResponse, ContentStatusResponse,
    SummaryResponse, TranscriptResponse
)

router = APIRouter(prefix="/content", tags=["content"])


def _check_content_access(content_id: int, user: User, db: Session) -> Content:
    """Проверяем доступ: владелец ИЛИ участник classroom."""
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Не найдено")

    if content.user_id == user.id:
        return content

    from models.classroom import ClassroomContent, ClassroomMember
    is_member = db.query(ClassroomMember).join(ClassroomContent,
        ClassroomContent.classroom_id == ClassroomMember.classroom_id
    ).filter(
        ClassroomContent.content_id == content_id,
        ClassroomMember.user_id == user.id,
    ).first()

    if is_member:
        return content

    raise HTTPException(status_code=404, detail="Не найдено")


def _launch_pipeline(content_id: int) -> str | None:
    """Запускает оркестратор. Если celery не поднят, остальное не падает."""
    try:
        from tasks.agents.orchestrator import run_pipeline
        task = run_pipeline.delay(content_id)
        return task.id
    except Exception:
        return None


def _clamp_question_count(n: int) -> int:
    return max(5, min(20, n))

def _validate_difficulty(d: str) -> str:
    if d not in ("easy", "medium", "hard"):
        return "medium"
    return d

@router.post("/url", response_model=ContentResponse)
def submit_url(
    body: ContentFromURL,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = Content(
        user_id=current_user.id,
        title=body.title or body.url[:80],
        content_type=ContentType.youtube_url,
        source=body.url,
        status=ProccesingStatus.pending,
        quiz_difficulty=_validate_difficulty(body.difficulty),
        question_count=_clamp_question_count(body.question_count),
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    task_id = _launch_pipeline(content.id)
    if task_id:
        content.task_id = task_id
        db.commit()
    return content


@router.post("/text", response_model=ContentResponse)
def submit_text(
    body: ContentFromText,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = Content(
        user_id=current_user.id,
        title=body.title or "Текстовый материал",
        content_type=ContentType.raw_text,
        source=body.text[:1000],
        raw_text=body.text,
        status=ProccesingStatus.pending,
        quiz_difficulty=_validate_difficulty(body.difficulty),
        question_count=_clamp_question_count(body.question_count),
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    task_id = _launch_pipeline(content.id)
    if task_id:
        content.task_id = task_id
        db.commit()
    return content


@router.post("/upload", response_model=ContentResponse)
def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    difficulty: str = Form("medium"),
    question_count: int = Form(10),
    title: str = Form(None),
    current_user: User = Depends(get_current_user)
):
    upload_dir = os.path.join(settings.MEDIA_DIR, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{current_user.id}_{file.filename}")
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    content = Content(
        user_id=current_user.id,
        title=file.filename,
        content_type=ContentType.uploaded_video,
        source=file_path,
        status=ProccesingStatus.pending,
        quiz_difficulty=_validate_difficulty(difficulty),
        question_count=_clamp_question_count(question_count),
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    task_id = _launch_pipeline(content.id)
    if task_id:
        content.task_id = task_id
        db.commit()
    return content


@router.get("/my", response_model=list[ContentResponse])   
def my_content(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Content).filter(
        Content.user_id == current_user.id
    ).order_by(Content.created_at.desc()).all()


@router.get("/{content_id}/status", response_model=ContentStatusResponse) 
def get_status(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = _check_content_access(content_id, current_user, db)
    return content


@router.get("/{content_id}/transcript", response_model=TranscriptResponse) 
def get_transcript(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = _check_content_access(content_id, current_user, db)
    if not content.transcript:   
        raise HTTPException(status_code=202, detail="Транскрипция ещё не готова")
    return TranscriptResponse(content_id=content_id, text=content.transcript.text)


@router.get("/{content_id}/summary", response_model=SummaryResponse)   
def get_summary(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = _check_content_access(content_id, current_user, db)
    if not content.summary or not content.summary.text:
        raise HTTPException(status_code=202, detail="Конспект ещё не готов")
    return SummaryResponse(content_id=content_id, text=content.summary.text)