"""
API для Classroom:
- Преподаватель создает группу, добавляет студентов по email, назначает материалы
- Студент видит свои группы и назначенные материалы
- Студент присоединяется по инвайт-коду
- Аналитика группы для преподавателя
"""
import secrets
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import get_current_user, require_teacher
from models.user import User, UserRole
from models.content import Content, ProccesingStatus
from models.classroom import Classroom, ClassroomMember, ClassroomContent, MemberRole
from models.quiz import Quiz, QuizAttempt, Question
from models.feedback import AttemptFeedback
from schemas.classroom import (
    ClassroomCreate, ClassroomAddMember, ClassroomAssignContent,
    ClassroomJoinRequest,
    ClassroomResponse, ClassroomDetailResponse,
    ClassroomMemberResponse, ClassroomContentResponse,
    ClassroomAnalyticsResponse, StudentAttemptInfo, TopicWeakness,
)

router = APIRouter(prefix="/classroom", tags=["classroom"])


# ── Helpers ──────────────────────────────────────────────

def _get_classroom_or_404(classroom_id: int, db: Session) -> Classroom:
    cr = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    return cr


def _require_owner(classroom: Classroom, user: User):
    if classroom.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Вы не владелец этой группы")


def _classroom_response(cr: Classroom, db: Session) -> ClassroomResponse:
    count = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == cr.id,
        ClassroomMember.role == MemberRole.student,
    ).count()
    return ClassroomResponse(
        id=cr.id, name=cr.name, description=cr.description,
        owner_id=cr.owner_id, invite_code=cr.invite_code,
        created_at=cr.created_at, member_count=count,
    )


# ══════════════════════════════════════════════════════════
#  COMMON ENDPOINTS
# ══════════════════════════════════════════════════════════

@router.post("/create", response_model=ClassroomResponse)
def create_classroom(
    body: ClassroomCreate,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    cr = Classroom(
        name=body.name,
        description=body.description,
        owner_id=teacher.id,
        invite_code=secrets.token_urlsafe(8),
    )
    db.add(cr)
    db.flush()
    db.add(ClassroomMember(
        classroom_id=cr.id, user_id=teacher.id, role=MemberRole.teacher,
    ))
    db.commit()
    db.refresh(cr)
    return _classroom_response(cr, db)


@router.post("/join")
def join_classroom(
    body: ClassroomJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Студент присоединяется к группе по инвайт-коду."""
    cr = db.query(Classroom).filter(Classroom.invite_code == body.invite_code).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Группа с таким кодом не найдена")

    exists = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == cr.id,
        ClassroomMember.user_id == current_user.id,
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Вы уже состоите в этой группе")

    m = ClassroomMember(
        classroom_id=cr.id,
        user_id=current_user.id,
        role=MemberRole.student,
    )
    db.add(m)
    db.commit()
    return {"detail": "Вы присоединились к группе", "classroom_name": cr.name, "classroom_id": cr.id}


@router.get("/my", response_model=list[ClassroomResponse])
def my_classrooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memberships = (
        db.query(ClassroomMember)
        .filter(ClassroomMember.user_id == current_user.id)
        .all()
    )
    classroom_ids = [m.classroom_id for m in memberships]
    if not classroom_ids:
        return []
    classrooms = (
        db.query(Classroom)
        .filter(Classroom.id.in_(classroom_ids))
        .order_by(Classroom.created_at.desc())
        .all()
    )
    return [_classroom_response(cr, db) for cr in classrooms]


@router.get("/{classroom_id}", response_model=ClassroomDetailResponse)
def get_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cr = _get_classroom_or_404(classroom_id, db)
    is_member = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == cr.id,
        ClassroomMember.user_id == current_user.id,
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Вы не участник этой группы")

    members = db.query(ClassroomMember).filter(ClassroomMember.classroom_id == cr.id).all()
    member_responses = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            member_responses.append(ClassroomMemberResponse(
                id=m.id, user_id=u.id, email=u.email,
                full_name=u.full_name, role=m.role.value,
                joined_at=m.joined_at,
            ))

    cc_list = db.query(ClassroomContent).filter(
        ClassroomContent.classroom_id == cr.id
    ).order_by(ClassroomContent.assigned_at.desc()).all()
    content_responses = []
    for cc in cc_list:
        content = db.query(Content).filter(Content.id == cc.content_id).first()
        if content:
            content_responses.append(ClassroomContentResponse(
                id=cc.id, content_id=content.id,
                content_title=content.title,
                content_type=content.content_type.value,
                content_status=content.status.value,
                quiz_difficulty=cc.quiz_difficulty,
                max_attempts=cc.max_attempts,
                assigned_at=cc.assigned_at,
            ))

    return ClassroomDetailResponse(
        id=cr.id, name=cr.name, description=cr.description,
        owner_id=cr.owner_id, invite_code=cr.invite_code,
        created_at=cr.created_at,
        members=member_responses, contents=content_responses,
    )


# ══════════════════════════════════════════════════════════
#  TEACHER ENDPOINTS
# ══════════════════════════════════════════════════════════

@router.post("/{classroom_id}/add-member", response_model=ClassroomMemberResponse)
def add_member(
    classroom_id: int,
    body: ClassroomAddMember,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    cr = _get_classroom_or_404(classroom_id, db)
    _require_owner(cr, teacher)

    student = db.query(User).filter(User.email == body.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Пользователь с таким email не найден")

    exists = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == cr.id,
        ClassroomMember.user_id == student.id,
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Пользователь уже в группе")

    m = ClassroomMember(
        classroom_id=cr.id, user_id=student.id, role=MemberRole.student,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return ClassroomMemberResponse(
        id=m.id, user_id=student.id, email=student.email,
        full_name=student.full_name, role=m.role.value,
        joined_at=m.joined_at,
    )


@router.delete("/{classroom_id}/member/{user_id}")
def remove_member(
    classroom_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    cr = _get_classroom_or_404(classroom_id, db)
    _require_owner(cr, teacher)
    m = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == cr.id,
        ClassroomMember.user_id == user_id,
        ClassroomMember.role == MemberRole.student,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Участник не найден")
    db.delete(m)
    db.commit()
    return {"detail": "Участник удалён"}


@router.post("/{classroom_id}/assign-content", response_model=ClassroomContentResponse)
def assign_content(
    classroom_id: int,
    body: ClassroomAssignContent,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    cr = _get_classroom_or_404(classroom_id, db)
    _require_owner(cr, teacher)

    content = db.query(Content).filter(
        Content.id == body.content_id,
        Content.user_id == teacher.id,
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Контент не найден или не ваш")

    if body.quiz_difficulty not in ("easy", "medium", "hard"):
        raise HTTPException(status_code=400, detail="difficulty: easy / medium / hard")

    exists = db.query(ClassroomContent).filter(
        ClassroomContent.classroom_id == cr.id,
        ClassroomContent.content_id == content.id,
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Контент уже назначен")

    cc = ClassroomContent(
        classroom_id=cr.id,
        content_id=content.id,
        quiz_difficulty=body.quiz_difficulty,
        max_attempts=body.max_attempts,
        assigned_by=teacher.id,
    )
    db.add(cc)
    db.commit()
    db.refresh(cc)

    _generate_classroom_quiz(db, content, body.quiz_difficulty, body.max_attempts)

    return ClassroomContentResponse(
        id=cc.id, content_id=content.id,
        content_title=content.title,
        content_type=content.content_type.value,
        content_status=content.status.value,
        quiz_difficulty=cc.quiz_difficulty,
        max_attempts=cc.max_attempts,
        assigned_at=cc.assigned_at,
    )


def _generate_classroom_quiz(db: Session, content: Content, difficulty: str, max_attempts: int = 3):
    if content.status != ProccesingStatus.done:
        return
    try:
        from tasks.agents.quiz_agent import generate_classroom_quiz
        generate_classroom_quiz.delay(content.id, difficulty, max_attempts)
    except Exception:
        pass


# ══════════════════════════════════════════════════════════
#  TEACHER ANALYTICS
# ══════════════════════════════════════════════════════════

@router.get("/{classroom_id}/analytics", response_model=ClassroomAnalyticsResponse)
def classroom_analytics(
    classroom_id: int,
    db: Session = Depends(get_db),
    teacher: User = Depends(require_teacher),
):
    cr = _get_classroom_or_404(classroom_id, db)
    _require_owner(cr, teacher)

    student_members = (
        db.query(ClassroomMember)
        .filter(ClassroomMember.classroom_id == cr.id, ClassroomMember.role == MemberRole.student)
        .all()
    )
    student_ids = [m.user_id for m in student_members]
    students_map: dict[int, User] = {}
    for m in student_members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            students_map[u.id] = u

    cc_list = db.query(ClassroomContent).filter(ClassroomContent.classroom_id == cr.id).all()
    content_ids = [cc.content_id for cc in cc_list]

    quizzes = db.query(Quiz).filter(Quiz.content_id.in_(content_ids)).all() if content_ids else []
    quiz_ids = [q.id for q in quizzes]
    quiz_map = {q.id: q for q in quizzes}

    attempts = []
    if quiz_ids and student_ids:
        attempts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.quiz_id.in_(quiz_ids), QuizAttempt.user_id.in_(student_ids))
            .order_by(QuizAttempt.created_at.desc())
            .all()
        )

    attempt_infos = []
    scores = []
    score_buckets = {"0-40": 0, "40-70": 0, "70-100": 0}
    weak_topic_counter: Counter = Counter()
    weak_topic_students: dict[str, set] = {}

    for a in attempts:
        student = students_map.get(a.user_id)
        quiz = quiz_map.get(a.quiz_id)
        if student and quiz:
            attempt_infos.append(StudentAttemptInfo(
                student_id=student.id, student_name=student.full_name,
                student_email=student.email, attempt_id=a.id,
                quiz_title=quiz.title, score=a.score, created_at=a.created_at,
            ))
        if a.score is not None:
            scores.append(a.score)
            if a.score < 40: score_buckets["0-40"] += 1
            elif a.score < 70: score_buckets["40-70"] += 1
            else: score_buckets["70-100"] += 1

        if quiz:
            for question in quiz.questions:
                user_answer = (a.answers or {}).get(str(question.id), "")
                if user_answer.strip().lower() != (question.correct_answer or "").strip().lower() and question.topic_tag:
                    weak_topic_counter[question.topic_tag] += 1
                    weak_topic_students.setdefault(question.topic_tag, set()).add(a.user_id)

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    weak_topics = [
        TopicWeakness(topic=t, error_count=c, student_count=len(weak_topic_students.get(t, set())))
        for t, c in weak_topic_counter.most_common(10)
    ]

    return ClassroomAnalyticsResponse(
        classroom_id=cr.id, classroom_name=cr.name,
        total_students=len(student_ids), total_attempts=len(attempts),
        average_score=avg_score, attempts=attempt_infos,
        weak_topics=weak_topics, score_distribution=score_buckets,
    )


# ══════════════════════════════════════════════════════════
#  STUDENT: classroom content access
# ══════════════════════════════════════════════════════════

@router.get("/{classroom_id}/content-for-student")
def student_classroom_content(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cr = _get_classroom_or_404(classroom_id, db)
    is_member = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == cr.id,
        ClassroomMember.user_id == current_user.id,
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Вы не участник этой группы")

    cc_list = db.query(ClassroomContent).filter(
        ClassroomContent.classroom_id == cr.id
    ).order_by(ClassroomContent.assigned_at.desc()).all()

    result = []
    for cc in cc_list:
        content = db.query(Content).filter(Content.id == cc.content_id).first()
        if not content:
            continue
        quizzes = db.query(Quiz).filter(
            Quiz.content_id == content.id, Quiz.is_validated == True
        ).all()
        quiz_infos = []
        for q in quizzes:
            user_attempts = (
                db.query(QuizAttempt)
                .filter(QuizAttempt.quiz_id == q.id, QuizAttempt.user_id == current_user.id)
                .count()
            )
            quiz_infos.append({
                "id": q.id,
                "title": q.title,
                "question_count": len(q.questions),
                "max_attempts": q.max_attempts,
                "used_attempts": user_attempts,
            })
        result.append({
            "content_id": content.id,
            "title": content.title,
            "content_type": content.content_type.value,
            "status": content.status.value,
            "quiz_difficulty": cc.quiz_difficulty,
            "assigned_at": cc.assigned_at.isoformat() if cc.assigned_at else None,
            "quizzes": quiz_infos,
        })
    return result