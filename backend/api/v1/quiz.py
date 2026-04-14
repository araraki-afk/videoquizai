from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from models.quiz import Quiz, QuizAttempt
from schemas.quiz import QuizResponse, QuizAttemptResult, QuizAttemptSubmit

router = APIRouter(prefix="/quiz", tags=["quiz"])

def _get_validated_quiz(quiz_id: int, db: Session) -> Quiz:
    """
    возвращает тест только если он прошел валидацию, если нет - 202
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Тест не найден")
    if not quiz.is_validated:
        raise HTTPException(status_code=202, detail="Тест все еще проходит проверку качества. Подождите")
    return quiz

@router.get("/by-content/{content_id}", response_model=list[QuizResponse])
def quizzes_by_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Только проверенные тесты для данного материала
    """
    return (db.query(Quiz).filter(Quiz.content_id == content_id, Quiz.is_validated == True).all())


@router.get("/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Тест по его айди
    """
    return _get_validated_quiz(quiz_id, db)


@router.get("/{quiz_id}/submit", response_model=QuizAttemptResult)
def submit_quiz(
    quiz_id: int,
    body: QuizAttemptSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = _get_validated_quiz(quiz_id, db)

    correct = 0
    weak_topics = []

    for question in quiz.questions:
        user_answer = body.answers.get(str(question.id), "")
        if user_answer.strip().lower() == question.correct_answer.strip().lower():
            correct += 1
        elif question.topic_tag:
            weak_topics.append(question.topic_tag)
    
    total = len(quiz.questions)
    score = round(correct / total * 100, 1) if total > 0 else 0.0

    attempt = QuizAttempt(
        quiz_id = quiz_id,
        user_id = current_user.id,
        score = score,
        answers = {str(k): v for k, v in body.asnwers.items()},
    )
    db.add(attempt)
    db.commit()

    return QuizAttemptResult(
        score=score,
        total=total,
        correct=correct,
        weak_topics=list(set(weak_topics))
    )


@router.get("/{quiz_id}/attempts")
def my_attempts(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    история попыток
    """
    attempts = (
        db.query(QuizAttempt).filter(
            QuizAttempt.id==quiz_id,
            QuizAttempt.user_id==current_user.idm
    ).order_by(QuizAttempt.created_at.desc()).all()
    )
    return [{"id": a.id, "score": a.score, "created_at": a.created_at} for a in attempts]
