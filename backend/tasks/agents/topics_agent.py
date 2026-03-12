"""
Агент выделения тем
Делит текст на смысловые блоки и возвращает список названий тем
"""
import json
from tasks.celery_app import celery
from core.database import SessionLocal
from models.content import Content, ProccesingStatus
from models.transcript import Transcript, Summary

@celery.task(bind = True, max_retries=2)
def topics_agent(self, content_id: int) -> int:
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(Transcript.content_id == content_id).first()

        if not transcript:
            raise ValueError("Транскрипция не найдена")
        
        topics = _extract_topics(transcript.text)

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


def _extract_topics(text:str) -> list[str]:
    sentences = [s.strip() for s in text.split(".") if len (s.strip()) > 20]
    if not sentences:
        return ["Основная тема"]
    block_size = max(1, len(sentences) // 8)
    topics = []

    for i in range(0, len(sentences), block_size):
        block = sentences[i:i + block_size]
        if block:
            topic = block[0][:60].strip()
            if topic:
                topics.append(topic)
    return topics[:10]