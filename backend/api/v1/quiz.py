from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_user
from models.user import User, UserRole
from models.content import Content
from models.quiz import Quiz, QuizAttempt
from models.feedback import AttemptFeedback
from schemas.quiz import (
    QuizResponse, QuizAttemptResult, QuizAttemptSubmit,
    AttemptFeedbackResponse, AttemptSummaryResponse, AttemptDetailResponse,
)
from tasks.agents.feedback_agent import run_feedback_agent

router = APIRouter(prefix="/quiz", tags=["quiz"])


def _get_validated_quiz(quiz_id: int, db: Session) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Тест не найден")
    if not quiz.is_validated:
        raise HTTPException(
            status_code=202,
            detail="Тест ещё проходит проверку качества. Подождите.",
        )
    return quiz


@router.get("/", response_model=list[QuizResponse])
def list_my_quizzes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Quiz)
        .join(Content, Quiz.content_id == Content.id)
        .filter(Content.user_id == current_user.id, Quiz.is_validated == True)
        .all()
    )


@router.get("/by-content/{content_id}", response_model=list[QuizResponse])
def quizzes_by_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Проверяем доступ: владелец контента ИЛИ участник classroom с этим контентом
    from models.classroom import ClassroomContent, ClassroomMember
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Контент не найден")

    is_owner = content.user_id == current_user.id
    is_classroom_member = db.query(ClassroomMember).join(ClassroomContent,
        ClassroomContent.classroom_id == ClassroomMember.classroom_id
    ).filter(
        ClassroomContent.content_id == content_id,
        ClassroomMember.user_id == current_user.id,
    ).first() is not None

    if not is_owner and not is_classroom_member:
        raise HTTPException(status_code=403, detail="Нет доступа")

    return (
        db.query(Quiz)
        .filter(Quiz.content_id == content_id, Quiz.is_validated == True)  # noqa
        .all()
    )


@router.get("/attempts/{attempt_id}", response_model=AttemptDetailResponse)
def get_attempt_detail(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Попытка не найдена")
    
    if attempt.user_id != current_user.id and current_user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Нет доступа к этой попытке")

    quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()

    fb = (
        db.query(AttemptFeedback)
        .filter(AttemptFeedback.attempt_id == attempt.id)
        .first()
    )
    if not fb:
        fb = run_feedback_agent(db, attempt)

    return AttemptDetailResponse(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        quiz_title=quiz.title if quiz else None,
        score=attempt.score,
        created_at=attempt.created_at,
        feedback=AttemptFeedbackResponse(
            overall_summary=fb.overall_summary,
            mastery_score=fb.mastery_score,
            per_question=fb.per_question,
            recommendations=fb.recommendations,
            strengths=fb.strengths,
        ),
    )


@router.get("/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_validated_quiz(quiz_id, db)


@router.get("/{quiz_id}/check-attempt")
def check_attempt(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Тест не найден")
    
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id)
        .all()
    )

    if quiz.max_attempts is None:
        return {
            "attempted": len(attempts) > 0,
            "remaining": None,
            "unlimited": True,
            "last_attempt": attempts[-1].id if attempts else None,
            "last_score": attempts[-1].score if attempts else None,
        }
    else:
        remaining = max(0, quiz.max_attempts - len(attempts))
        return {
            "attempted": len(attempts) > 0,
            "remaining": remaining,
            "unlimited": False,
            "last_attempt": attempts[-1].id if attempts else None,
            "last_score": attempts[-1].score if attempts else None,
        }


@router.post("/{quiz_id}/submit", response_model=QuizAttemptResult)
def submit_quiz(
    quiz_id: int,
    body: QuizAttemptSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = _get_validated_quiz(quiz_id, db)


    if quiz.max_attempts is not None:
        attempt_count = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id)
            .count()
        )
        if attempt_count >= quiz.max_attempts:
            raise HTTPException(status_code=400, detail="Вы достигли лимита попыток")

    answers_normalized: dict[str, str] = {
        str(k): (v or "") for k, v in body.answers.items()
    }

    correct = 0
    weak_topics: list[str] = []

    for question in quiz.questions:
        user_answer = answers_normalized.get(str(question.id), "")
        if (
            user_answer.strip().lower()
            == (question.correct_answer or "").strip().lower()
            and user_answer.strip() != ""
        ):
            correct += 1
        elif question.topic_tag:
            weak_topics.append(question.topic_tag)

    total = len(quiz.questions)
    score = round(correct / total * 100, 1) if total > 0 else 0.0

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=current_user.id,
        score=score,
        answers=answers_normalized,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    feedback = run_feedback_agent(db, attempt)

    return QuizAttemptResult(
        attempt_id=attempt.id,
        score=score,
        total=total,
        correct=correct,
        weak_topics=list(dict.fromkeys(weak_topics)),
        feedback=AttemptFeedbackResponse(
            overall_summary=feedback.overall_summary,
            mastery_score=feedback.mastery_score,
            per_question=feedback.per_question,
            recommendations=feedback.recommendations,
            strengths=feedback.strengths,
        ),
    )


@router.get("/{quiz_id}/attempts", response_model=list[AttemptSummaryResponse])
def my_attempts(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    quiz_title = quiz.title if quiz else None

    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.created_at.desc())
        .all()
    )
    return [
        AttemptSummaryResponse(
            id=a.id,
            quiz_id=a.quiz_id,
            quiz_title=quiz_title,
            score=a.score,
            created_at=a.created_at,
        )
        for a in attempts
    ]

