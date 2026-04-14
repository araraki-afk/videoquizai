"""
Агент генерации теста.
Работает параллельно с summary_agent.
Ставит финальный статус done когда закончил.
"""
import json
from tasks.celery_app import celery
from core.database import SessionLocal
from models.content import Content, ProccesingStatus
from models.transcript import Transcript, Summary
from models.quiz import Quiz, Question
from core.gpt_client import ask_gpt_json

import models.user
import models.content
import models.transcript
import models.quiz


@celery.task(bind=True, max_retries=2)
def quiz_agent(self, content_id: int) -> int:
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        transcript = db.query(Transcript).filter(Transcript.content_id == content_id).first()
        summary = db.query(Summary).filter(Summary.content_id == content_id).first()

        if not transcript:
            raise ValueError("Транскрипция не найдена")

        topics = json.loads(summary.topics) if summary and summary.topics else []
        questions_data = _generate_questions_with_llm(transcript.text, topics)

        quiz = Quiz(
            content_id=content_id, 
            title=f"Тест: {content.title}",
            is_validated=False,
            )
        db.add(quiz)
        db.flush()

        for q in questions_data:
            db.add(Question(
                quiz_id=quiz.id,
                text=q["text"],
                question_type=q["type"],
                options=q.get("options"),
                correct_answer=q["answer"],
                topic_tag=q.get("topic")
            ))

        db.commit()

        from tasks.agents.quiz_validator_agent import quiz_validator_agent
        quiz_validator_agent.delay(quiz.id)

        return content_id

    except Exception as exc:
        db.query(Content).filter(Content.id == content_id).update({
            "status": ProccesingStatus.failed,
            "error_message": f"Генерация теста: {str(exc)}"
        })
        db.commit()
        raise self.retry(exc=exc)
    finally:
        db.close()


def _generate_questions_with_llm(text: str, topics: list[str]) -> list[dict]:
    excerpt = text[:10000]
    topics_str = ", ".join(topics) if topics else "основные темы материала"

    result = ask_gpt_json(
        system_prompt="""Ты — преподаватель, составляющий тест по учебному материалу.
Создай 10-12 вопросов разных типов.

Верни JSON массив объектов. Каждый объект:
{
  "text": "Текст вопроса",
  "type": "multiple_choice" | "true_false" | "open",
  "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
  "answer": "Правильный ответ (для multiple_choice — точный текст варианта)",
  "topic": "Тема из списка"
}

Требования:
- 5-6 вопросов multiple_choice (4 варианта, один правильный)
- 2-3 вопроса true_false (варианты: ["Верно", "Неверно"])
- 2-3 открытых вопроса (answer — краткий ответ 1-3 слова)
- Вопросы должны проверять понимание, а не механическое запоминание
- Распредели вопросы по темам равномерно""",  
        user_prompt=f"Темы материала: {topics_str}\n\nТекст:\n{excerpt}",
        max_tokens=3000
    )

    if not isinstance(result, list):
        return []  

    questions = []
    for q in result[:12]:
        if not q.get("text") or not q.get("answer"):
            continue
        questions.append({
            "text": q["text"],
            "type": q.get("type", "open"),
            "options": q.get("options"),
            "answer": q["answer"],
            "topic": q.get("topic", topics[0] if topics else "Общая тема")
        })
    return questions
