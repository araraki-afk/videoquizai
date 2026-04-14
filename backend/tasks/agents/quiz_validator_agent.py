"""
Агент валидации теста.
Запускается после quiz_agent. Проверяет качество теста через gpt.
Тест виден клиенту только после проверки, т.е quiz.is_validated=True
"""
import json
from tasks.celery_app import celery
from core.database import SessionLocal
from core.gpt_client import ask_gpt_json
from models.content import Content, ProccesingStatus
from models.quiz import Quiz, Question
from models.transcript import Summary


@celery.task(bind=True, max_retries=2)
def quiz_validator_agent(self, quiz_id: int) -> dict:
    db = SessionLocal()
    try:
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if not quiz:
            return {"status": "skipped", "reason": "quiz not found or empty"}

        if not quiz.questions:
            # test is empty
            quiz.is_validated = True
            content = db.query(Content).filter(Content.id == quiz.content_id).first()
            if content:
                content.status = ProccesingStatus.done
            db.commit()
            return {"status": "skipped", "reason": "quiz has no questions"}

        summary = db.query(Summary).filter(
            Summary.content_id == quiz.content_id
        ).first()

        declared_topics = json.loads(summary.topics) if summary and summary.topics else []
        summary_text = summary.text if summary else ""

        questions_for_review = [
            {
                "id": q.id,
                "text": q.text,
                "type": q.question_type,
                "options": q.options,
                "answer": q.correct_answer,
                "topic": q.topic_tag,
            }
            for q in quiz.questions
        ]

        validation_result = _validate_with_llm(
            questions=questions_for_review,
            declared_topics=declared_topics,
            summary=summary_text[:3000]
        )

        improvements_count = 0
        for item in validation_result.get("improvements", []):
            question = db.query(Question).filter(
                Question.id == item.get("question_id")
            ).first()
            if not question:
                continue
            if item.get("new_text"):
                question.text = item["new_text"]
                improvements_count += 1
            if item.get("new_answer"):
                question.correct_answer = item["new_answer"]
            if item.get("new_topic"):
                question.topic_tag = item["new_topic"]

        #put the status done
        quiz.is_validated = True

        content = db.query(Content).filter(Content.id == quiz.content_id).first()
        if content:
            content.status = ProccesingStatus.done        
        db.commit()

        report = {
            "status": "completed",
            "quiz_id": quiz_id,
            "total_questions": len(questions_for_review),
            "quality_score": validation_result.get("quality_score", 0),
            "issues_found": validation_result.get("issues_found", []),
            "improvements_applied": improvements_count,
            "difficulty_level": validation_result.get("difficulty_level", "medium"),
            "topics_coverage": validation_result.get("topics_coverage", {}),
        }

        print(f"[quiz_validator] Quiz {quiz_id} validated. Score: {report['quality_score']}/10")
        return report

    except Exception as exc:
        print(f"[quiz_validator] Error: {exc}")
        #при ошибке валидации все равно отдаем тест - иначе зависание
        try:
            quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
            if quiz:
                quiz.is_validated = True
                content = db.query(Content).filter(Content.id == quiz.content_id).first()
                if content:
                    content.status = ProccesingStatus.done        
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc)
    finally:
        db.close()


def _validate_with_llm(
    questions: list[dict],
    declared_topics: list[str],
    summary: str
) -> dict:
    topics_str = ", ".join(declared_topics) if declared_topics else "не определены"
    questions_str = json.dumps(questions, ensure_ascii=False, indent=2)

    result = ask_gpt_json(
        system_prompt="""Ты — эксперт по педагогическому дизайну.
Проверь качество теста и верни JSON:

{
  "quality_score": 8,
  "difficulty_level": "easy" | "medium" | "hard",
  "issues_found": ["описание проблемы"],
  "topics_coverage": {"Тема 1": 3, "Тема 2": 2},
  "improvements": [
    {
      "question_id": 42,
      "problem": "описание",
      "new_text": "улучшенный вопрос или null",
      "new_answer": null,
      "new_topic": null
    }
  ]
}

Проверяй: соответствие темам, правильность ответов, качество дистракторов,
подсказки в формулировках, равномерность по темам, уровень сложности.
Improvements — максимум 3 вопроса.""",
        user_prompt=f"""Заявленные темы: {topics_str}

Конспект:
{summary}

Вопросы:
{questions_str}""",
        max_tokens=2000
    )

    if not isinstance(result, dict):
        return {"quality_score": 5, "issues_found": [], "improvements": []}
    return result
