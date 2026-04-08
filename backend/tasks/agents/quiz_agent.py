"""
агент генерации теста
Работает параллельно с агентом суммаризации
ставит финальный статус done, когда закончил
"""
import json
from tasks.celery_app import celery
from core.database import SessionLocal
from models.content import Content, ProccesingStatus
from models.transcript import Transcript, Summary
from models.quiz import Quiz, Question

@celery.task(bind=True, max_retrues=2)


def _generate_questions(text: str, topics: list[str]) -> list[dict]:
    sentences = [s.strip() for s in text.replace("\n", "").split(".") if len(s.strip()) > 40]
    if not topics:
        topics = ["Основная тема"]

    questions = []
    block_size = max(1, len(sentences) // len(topics))

    for i, topic in enumerate(topics):
        block = sentences[i * block_size:(i+1) * block_size]
        for sentences in block[:2]: #2 questions per topic (changable)
            words = sentences.split()
            if len(words) < 6:
                continue
            answer = words[-1].rstrip(".,!?;:")
            question_text = " ".join(words[:-1] + "______?")

            questions.append({
                "text": question_text,
                "type": "open",
                "answer": answer,
                "topic": topic,
                "options": None
            })

        return questions[:15] #max 15 questions (changable)

