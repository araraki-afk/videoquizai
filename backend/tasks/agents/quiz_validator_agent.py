"""
Агент валидации теста.
Если есть плохие вопросы (неполные, без вариантов) - ПЕРЕГЕНЕРИРУЕТ их
"""
import json
from tasks.celery_app import celery
from core.database import SessionLocal
from core.gpt_client import ask_gpt_json
from models.content import Content, ProccesingStatus
from models.quiz import Quiz, Question
from models.transcript import Summary, Transcript


@celery.task(bind=True, max_retries=2)
def quiz_validator_agent(self, quiz_id: int) -> dict:
    db = SessionLocal()
    try:
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if not quiz or not quiz.questions:
            if quiz:
                quiz.is_validated = True
                content = db.query(Content).filter(Content.id == quiz.content_id).first()
                if content:
                    content.status = ProccesingStatus.done
                db.commit()
            return {"status": "skipped"}

        summary = db.query(Summary).filter(Summary.content_id == quiz.content_id).first()
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

        # Validate and get bad question IDs
        validation_result = _validate_with_llm(
            questions=questions_for_review,
            declared_topics=declared_topics,
            summary=summary_text[:3000]
        )

        # REGENERATE bad questions
        bad_q_ids = validation_result.get("bad_questions", [])
        regenerated = 0
        
        if bad_q_ids:
            transcript = db.query(Transcript).filter(Transcript.content_id == quiz.content_id).first()
            if transcript:
                # Delete bad questions
                for bad_id in bad_q_ids:
                    q = db.query(Question).filter(Question.id == bad_id).first()
                    if q:
                        db.delete(q)
                
                # Generate new ones
                new_questions = _regenerate_questions(
                    transcript.text,
                    declared_topics,
                    quiz.questions[0].question_type if quiz.questions else "multiple_choice",
                    len(bad_q_ids)
                )
                
                for nq in new_questions:
                    db.add(Question(
                        quiz_id=quiz_id,
                        text=nq["text"],
                        question_type=nq["type"],
                        options=nq.get("options"),
                        correct_answer=nq["answer"],
                        topic_tag=nq.get("topic")
                    ))
                    regenerated += 1

        # Apply minor improvements to remaining questions
        for item in validation_result.get("improvements", []):
            q = db.query(Question).filter(Question.id == item.get("question_id")).first()
            if q and item.get("new_text"):
                q.text = item["new_text"]

        quiz.is_validated = True
        content = db.query(Content).filter(Content.id == quiz.content_id).first()
        if content:
            content.status = ProccesingStatus.done
        db.commit()

        print(f"[quiz_validator] Quiz {quiz_id}: Deleted {len(bad_q_ids)}, Regenerated {regenerated}")
        return {"status": "completed", "bad_deleted": len(bad_q_ids), "regenerated": regenerated}

    except Exception as exc:
        try:
            quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
            if quiz:
                quiz.is_validated = True
                content = db.query(Content).filter(Content.id == quiz.content_id).first()
                if content:
                    content.status = ProccesingStatus.done
                db.commit()
        except:
            pass
        raise self.retry(exc=exc)
    finally:
        db.close()


def _validate_with_llm(questions: list[dict], declared_topics: list[str], summary: str) -> dict:
    """Validate questions and identify bad ones."""
    topics_str = ", ".join(declared_topics) if declared_topics else "основные"
    
    result = ask_gpt_json(
        system_prompt="""Ты — эксперт по тестам. Проверь вопросы.

Верни JSON:
{
  "quality_score": 8,
  "bad_questions": [42, 43],
  "improvements": [{"question_id": 41, "new_text": "..."}]
}

bad_questions - массив ID ПЛОХИХ вопросов для УДАЛЕНИЯ И ПЕРЕДЕЛКИ:
- Неполные вопросы (заканчиваются на "?" без вариантов)
- Вопросы без вариантов ответа (для multiple_choice)
- Вопросы с ошибками или бессмыслицей
- true_false вопросы без правильных 2 вариантов

improvements - массив вопросов для МЕЛКИХ ИСПРАВЛЕНИЙ (не удаления)""",
        user_prompt=f"""Темы: {topics_str}

Вопросы:
{json.dumps(questions, ensure_ascii=False)[:2000]}""",
        max_tokens=1500
    )
    
    if not isinstance(result, dict):
        return {"quality_score": 5, "bad_questions": [], "improvements": []}
    
    # Ensure bad_questions is a list
    if "bad_questions" not in result:
        result["bad_questions"] = []
    elif not isinstance(result["bad_questions"], list):
        result["bad_questions"] = []
    
    return result


def _regenerate_questions(text: str, topics: list[str], q_type: str, count: int) -> list[dict]:
    """Generate replacement questions."""
    excerpt = text[:8000]
    topics_str = ", ".join(topics) if topics else "основные темы"
    
    result = ask_gpt_json(
        system_prompt=f"""Создай {count} КАЧЕСТВЕННЫХ вопросов.

Верни JSON массив ровно {count} объектов:
[{{
  "text": "Полная, правильная формулировка вопроса",
  "type": "{q_type}",
  "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
  "answer": "Правильный ответ",
  "topic": "Одна из тем"
}}]

ТРЕБОВАНИЯ:
- ПОЛНЫЕ формулировки, не сокращенные
- ВСЕГДА 4 варианта для multiple_choice
- Для true_false: options = ["Верно", "Неверно"]
- Вопросы соответствуют темам
- Ответы логичные и правильные""",
        user_prompt=f"""Темы: {topics_str}

Материал (используй для контекста):
{excerpt}""",
        max_tokens=2500
    )
    
    if not isinstance(result, list):
        return []
    
    questions = []
    for q in result[:count]:
        if q.get("text") and q.get("answer"):
            questions.append({
                "text": q["text"],
                "type": q.get("type", q_type),
                "options": q.get("options"),
                "answer": q["answer"],
                "topic": q.get("topic", topics[0] if topics else "Основная тема")
            })
    
    return questions