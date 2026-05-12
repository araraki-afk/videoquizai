from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func
from core.database import get_db
from core.dependencies import get_current_user, require_teacher
from models.user import User, UserRole
from models.content import Content
from models.quiz import Quiz, QuizAttempt, Question
from models.classroom import Classroom, ClassroomContent, ClassroomMember, MemberRole
from models.feedback import AttemptFeedback
from schemas.quiz import (
    QuizResponse, QuizAttemptResult, QuizAttemptSubmit,
    AttemptFeedbackResponse, AttemptSummaryResponse, AttemptDetailResponse,
    QuizFullResponse, QuizDraftSummary, QuestionUpdate, QuestionCreate,
    QuizUpdate, QuizAssignToClassrooms,
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
    """All validated quizzes whose content the current user owns (drafts +
    every classroom copy)."""
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
    """Return quizzes for a piece of content.

    - The content owner (teacher) sees the draft quiz(es) — these are the
      quizzes with classroom_id IS NULL — so the ContentDetail page keeps
      working as a 'preview / list of drafts'.
    - Classroom members see only the quiz copy belonging to a classroom
      they're a member of.
    """
    from models.classroom import ClassroomContent, ClassroomMember
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Контент не найден")

    is_owner = content.user_id == current_user.id

    if is_owner:
        return (
            db.query(Quiz)
            .filter(
                Quiz.content_id == content_id,
                Quiz.is_validated == True,  # noqa: E712
                Quiz.classroom_id.is_(None),
            )
            .all()
        )

    # Student / non-owner: only quizzes scoped to classrooms they belong to.
    member_classroom_ids = [
        m.classroom_id
        for m in db.query(ClassroomMember).filter(
            ClassroomMember.user_id == current_user.id
        ).all()
    ]
    if not member_classroom_ids:
        raise HTTPException(status_code=403, detail="Нет доступа")

    quizzes = (
        db.query(Quiz)
        .filter(
            Quiz.content_id == content_id,
            Quiz.is_validated == True,  # noqa: E712
            Quiz.classroom_id.in_(member_classroom_ids),
        )
        .all()
    )
    if not quizzes:
        raise HTTPException(status_code=403, detail="Нет доступа")
    return quizzes


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


# ══════════════════════════════════════════════════════════
#  TEACHER: drafts, editing, bulk assignment
#  All these endpoints are declared BEFORE /{quiz_id} so the
#  catch-all route doesn't swallow them.
# ══════════════════════════════════════════════════════════

def _require_quiz_owner(quiz_id: int, teacher: User, db: Session) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Тест не найден")
    content = db.query(Content).filter(Content.id == quiz.content_id).first()
    if not content or content.user_id != teacher.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому тесту")
    return quiz


@router.get("/drafts", response_model=list[QuizDraftSummary])
def list_drafts(
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """Teacher's 'Test Drafts' folder.

    A draft = a Quiz whose content the teacher owns AND whose classroom_id
    is NULL (i.e. the original generated quiz, not a classroom copy)."""
    drafts = (
        db.query(Quiz)
        .join(Content, Quiz.content_id == Content.id)
        .filter(
            Content.user_id == teacher.id,
            Quiz.classroom_id.is_(None),
        )
        .order_by(Quiz.created_at.desc())
        .all()
    )

    out: list[QuizDraftSummary] = []
    for q in drafts:
        content = db.query(Content).filter(Content.id == q.content_id).first()
        assigned_count = (
            db.query(Quiz)
            .filter(Quiz.source_quiz_id == q.id, Quiz.classroom_id.isnot(None))
            .count()
        )
        out.append(QuizDraftSummary(
            id=q.id,
            content_id=q.content_id,
            content_title=content.title if content else "—",
            title=q.title,
            question_count=len(q.questions),
            is_validated=q.is_validated,
            created_at=q.created_at,
            assigned_count=assigned_count,
        ))
    return out


@router.get("/{quiz_id}/full", response_model=QuizFullResponse)
def get_quiz_full(
    quiz_id: int,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """Full quiz view (with correct answers) — teacher/editor only."""
    quiz = _require_quiz_owner(quiz_id, teacher, db)
    return quiz


@router.patch("/{quiz_id}", response_model=QuizFullResponse)
def update_quiz(
    quiz_id: int,
    body: QuizUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    quiz = _require_quiz_owner(quiz_id, teacher, db)
    if body.title is not None:
        quiz.title = body.title.strip() or quiz.title
    db.commit()
    db.refresh(quiz)
    return quiz


@router.delete("/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """Delete a quiz. Allowed on drafts and on classroom copies. Cascade
    removes questions; QuizAttempt rows are kept for audit but become
    orphaned."""
    quiz = _require_quiz_owner(quiz_id, teacher, db)
    db.delete(quiz)
    db.commit()
    return {"detail": "Тест удалён"}


@router.post("/{quiz_id}/questions", response_model=QuizFullResponse)
def create_question(
    quiz_id: int,
    body: QuestionCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    quiz = _require_quiz_owner(quiz_id, teacher, db)
    db.add(Question(
        quiz_id=quiz.id,
        text=body.text,
        question_type=body.question_type,
        options=body.options,
        correct_answer=body.correct_answer,
        topic_tag=body.topic_tag,
    ))
    db.commit()
    db.refresh(quiz)
    return quiz


@router.patch("/questions/{question_id}", response_model=QuizFullResponse)
def update_question(
    question_id: int,
    body: QuestionUpdate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    quiz = _require_quiz_owner(q.quiz_id, teacher, db)

    if body.text is not None:           q.text = body.text
    if body.question_type is not None:  q.question_type = body.question_type
    if body.options is not None:        q.options = body.options
    if body.correct_answer is not None: q.correct_answer = body.correct_answer
    if body.topic_tag is not None:      q.topic_tag = body.topic_tag

    db.commit()
    db.refresh(quiz)
    return quiz


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    _require_quiz_owner(q.quiz_id, teacher, db)
    db.delete(q)
    db.commit()
    return {"detail": "Вопрос удалён"}


@router.post("/{quiz_id}/assign-to-classrooms")
def assign_quiz_to_classrooms(
    quiz_id: int,
    body: QuizAssignToClassrooms,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    """Bulk-publish a draft quiz to one or more classrooms.

    For each classroom in `classroom_ids`:
    - records the assignment in `classroom_contents` if not already there;
    - creates a fresh Quiz row (a copy of this draft) scoped to that
      classroom — so attempts are tracked per classroom.

    If the same classroom already has a copy of this draft (same
    source_quiz_id), the existing copy's max_attempts/deadline are updated
    instead of creating a duplicate.
    """
    draft = _require_quiz_owner(quiz_id, teacher, db)
    if draft.classroom_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Этот тест уже привязан к группе. Назначайте только черновики.",
        )
    if not draft.is_validated:
        raise HTTPException(
            status_code=400,
            detail="Тест ещё не прошёл проверку. Дождитесь окончания обработки.",
        )

    assigned: list[int] = []
    updated: list[int] = []
    skipped: list[dict] = []

    for cid in body.classroom_ids:
        cr = db.query(Classroom).filter(Classroom.id == cid).first()
        if not cr or cr.owner_id != teacher.id:
            skipped.append({"classroom_id": cid, "reason": "не ваша группа"})
            continue

        # Upsert the classroom_contents row.
        cc = db.query(ClassroomContent).filter(
            ClassroomContent.classroom_id == cid,
            ClassroomContent.content_id == draft.content_id,
        ).first()
        if cc is None:
            cc = ClassroomContent(
                classroom_id=cid,
                content_id=draft.content_id,
                quiz_difficulty="medium",
                max_attempts=body.max_attempts if body.max_attempts is not None else 0,
                deadline=body.deadline,
                assigned_by=teacher.id,
            )
            db.add(cc)
        else:
            cc.max_attempts = body.max_attempts if body.max_attempts is not None else cc.max_attempts
            cc.deadline = body.deadline if body.deadline is not None else cc.deadline

        # Upsert the per-classroom Quiz copy.
        existing_copy = db.query(Quiz).filter(
            Quiz.source_quiz_id == draft.id,
            Quiz.classroom_id == cid,
        ).first()
        if existing_copy is None:
            copy = Quiz(
                content_id=draft.content_id,
                title=draft.title,
                is_validated=True,
                classroom_id=cid,
                max_attempts=body.max_attempts,
                deadline=body.deadline,
                source_quiz_id=draft.id,
            )
            db.add(copy)
            db.flush()
            for q in draft.questions:
                db.add(Question(
                    quiz_id=copy.id,
                    text=q.text,
                    question_type=q.question_type,
                    options=q.options,
                    correct_answer=q.correct_answer,
                    topic_tag=q.topic_tag,
                ))
            assigned.append(cid)
        else:
            existing_copy.max_attempts = body.max_attempts
            existing_copy.deadline = body.deadline
            existing_copy.title = draft.title
            updated.append(cid)

    db.commit()
    return {"assigned": assigned, "updated": updated, "skipped": skipped}


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