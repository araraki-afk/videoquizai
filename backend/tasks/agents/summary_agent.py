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
    if len(text) > 15000:
        chunk_size = 5000
        parts = [text[:chunk_size], text[len(text)//2:len(text)//2+chunk_size], text[-chunk_size:]]
        excerpt = "\n\n[...]\n\n".join(parts)
    else:
        excerpt = text
    return ask_gpt(
        system_prompt="""Ты — опытный преподаватаель, который создает подробным учебный конспект для студентов.
        Напиши РАЗВЕРНУТЫЙ конспект на русском языке, который поможет студенту подготовиться к тесту по этому материалу.
        Структура конспекта:
        # Общее введение
        Краткое описание того, о чем материал и почему это важно (2-3 предложения).
        
        ## Тема 1: [Название]
        Подробное обхяснение каждой ключевой идеи. Не просто перечисляй факты - объясняй их:
        - Что это такое и почему важно
        - Как это работает (процесс, механизм, логики)
        - Примеры или аналогии для понимания
        - Связь с другими темами 
        ## Тема 2: [Название]
        ... (аналогично)
        
        (выдели 4-7 ключевых тем, если требуется более 4-7, выделяй более)
        
        ## Ключевые определения и термины
        Перечисли и объясни все важные термины, которые встретились в материале.

        ## Итоги
        Краткое обобщение: что самое главное нужно запомнить из этого материала (3 и более пунктов).
        
        Требования: 
        - Пиши подробно и понятным языком
        - Объясняй сложные концепции простыми словами
        - Используй примеры там, где это помогает пониманию
        - Сохраняй важные факты, даты, имена
        - Конспект должен быть достаточно полным, чтобы по нему можно было готовиться к тесу
        - Минимальный объем: 800-1500 слов""",
        user_prompt=f"Составь конспект по этому тексту:\n\n{excerpt}",
        max_tokens=4000
    )
