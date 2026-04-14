"""
Агент суммаризации/написания конспекта
Работает параллельно с quiz_agent
"""
from tasks.celery_app import celery
from core.database import SessionLocal
from models.content import Content, ProccesingStatus
from models.transcript import Transcript, Summary
from core.gpt_client import ask_gpt

@celery.task(bind=True, max_retries=2)
def summary_agent(self, content_id: int) -> int:
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(
            Transcript.content_id == content_id
        ).first()
        if not transcript:
            raise ValueError(f"Transcript not found for content_id {content_id}")
        
        summary_text = _generate_summary_wit_llm(transcript.text)

        summary = db.query(Summary).filter(
            Summary.content_id == content_id
        ).first() 

        if summary:
            summary.text = summary_text
        else:
            db.add(Summary(content_id=content_id, text=summary_text))
        db.commit()
        return content_id

    except Exception as e:
        db.query(Content).filter(Content.id == content_id).update({
            "status": ProccesingStatus.failed,
            "error_message": f"Summary agent error: {str(e)}"
        })
        db.commit()
        raise self.retry(exc=e)
    finally:
        db.close()


def _generate_summary_wit_llm(text: str) -> str:
    # for long texts take sample
    if len(text) > 12000:
        chunk_size = 4000
        parts = [text[:chunk_size], text[len(text)//2:len(text)//2+chunk_size], text[-chunk_size:]]
        excerpt = "\n\n[...]\n\n".join(parts)
    else:
        excerpt = text
    return ask_gpt(
        system_prompt="""Ты — преподаватель, составляющий конспект лекции.
Создай структурированный конспект на русском языке.

Формат конспекта:
## [Название темы]
- Ключевая идея 1
- Ключевая идея 2

Требования:
- Выдели 3-5 основных тем
- Под каждой темой 3-5 ключевых пунктов
- Пиши кратко и по существу
- Сохраняй важные термины и определения
- Не пиши ничего лишнего — только конспект""",
        user_prompt=f"Составь конспект по этому тексту:\n\n{excerpt}",
        max_tokens=2000
    )
