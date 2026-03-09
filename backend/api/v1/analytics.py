from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import Counter
from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from models.quiz import QuizAttempt, Quiz, Question

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/me")
def my_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).all()
    if not attempts:
        return {
            "total_attempts": 0,
            "average_score": 0,
            "weak_topics": [],
            "history": []
        }
    
    # weak topics for all attempts
    weak_topic_counter = Counter()
    history = []

    for attempt in attempts:
        quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
        history.append({
            "quiz_id": attempt.quiz_id,
            "quiz_title": quiz.title if quiz else "-",
            "score": attempt.score,
            "created_at": attempt.created_at
        })
        #questions where answers were wrong
        if quiz:
            for question in quiz.questions:
                user_answer = attempt.answers.get(str(question.id))
                if user_answer and user_answer.strip().lower() != question.correct_answer.strip().lower():
                    if question.topic_tag:
                        weak_topic_counter[question.topic_tag] +=1

    avg_score = round(sum(a.score for a in attempts if a.score is not None)/len(attempts),1)

    return {
        "total_attempts": len(attempts),
        "average_score": avg_score,
        "weak_topics": [
            {"topic": topic, "errors": count}
            for topic, count in weak_topic_counter.most_common(5)
        ],
        "history": sorted(history, key=lambda x: x["created_at"], reverse=True)
    }                