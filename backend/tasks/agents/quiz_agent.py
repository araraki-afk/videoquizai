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

import models.user       
import models.content     
import models.transcript  
import models.quiz        


@celery.task(bind=True, max_retries=2)   
def quiz_agent(self, content_id: int) -> int:
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        transcript = db.query(Transcript).filter(
            Transcript.content_id == content_id
        ).first()
        summary = db.query(Summary).filter(
            Summary.content_id == content_id
        ).first()

        if not transcript:
            raise ValueError("Транскрипция не найдена")

        topics = json.loads(summary.topics) if summary and summary.topics else []
        questions_data = _generate_questions(transcript.text, topics)

        quiz = Quiz(content_id=content_id, title=f"Тест: {content.title}")
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

        content.status = ProccesingStatus.done
        db.commit()
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


def _generate_questions(text: str, topics: list[str]) -> list[dict]:
    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if len(s.strip()) > 40]
    if not topics:
        topics = ["Основная тема"]

    questions = []
    block_size = max(1, len(sentences) // len(topics))

    for i, topic in enumerate(topics):
        block = sentences[i * block_size:(i + 1) * block_size]
        for sentence in block[:2]:
            words = sentence.split()
            if len(words) < 6:
                continue
            answer = words[-1].rstrip(".,!?;:")
            question_text = " ".join(words[:-1]) + " ___?"

            questions.append({
                "text": question_text,
                "type": "open",
                "answer": answer,
                "topic": topic,
                "options": None
            })

    return questions[:15]