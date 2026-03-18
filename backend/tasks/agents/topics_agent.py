"""
Агент выделения тем
Делит текст на смысловые блоки и возвращает список названий тем
"""
import json
from tasks.celery_app import celery
from core.database import SessionLocal
from models.content import Content, ProccesingStatus
from models.transcript import Transcript, Summary
from core.groq_client import ask_groq_json


@celery.task(bind = True, max_retries=2)
def topics_agent(self, content_id: int) -> int:
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.content_id == content_id).first()

        if not transcript:
            raise ValueError("Транскрипция не найдена")
        
        topics = _extract_topics_with_llm(transcript.text)

        #Заготовка для агента суммаризации
        existing = db.query(Summary).filter(Summary.content_id == content_id).first()
        if not existing:
            db.add(Summary(
                content_id = content_id,
                text = "",
                topics = json.dumps(topics, ensure_ascii=False)
            ))
        else:
            existing.topics = json.dumps(topics, ensure_ascii=False)
        db.commit()
        return content_id
    
    except Exception as e:
        db.query(Content).filter(Content.id == content_id).update({
            "status": ProccesingStatus.failed,
            "error_message": f"Выделение тем: {str(e)}"
        })
        db.commit()
        raise self.retry(exc=e)
    finally:
        db.close()


def _extract_topics_with_llm(text:str) -> list[str]:
    # обрезаем до 8000 символов
    excerpt = text[:8000]

    result = ask_groq_json(
        system_prompt="""Ты — эксперт по анализу образовательного контента.
Твоя задача — выделить основные темы из текста лекции или статьи.
Верни JSON массив строк — названия тем. Максимум 8 тем.
Темы должны быть конкретными и информативными (не "Введение", а "Основы нейронных сетей").
Пример: ["Градиентный спуск", "Функции активации", "Переобучение и регуляризация"]""",
        user_prompt=f"Выдели основные темы из этого текста:\n\n{excerpt}",
        max_tokens=500
    )

    if isinstance(result, list):
        return [str(t) for t in result[:8]]
    return ["Основная тема"]