"""
Агент суммаризации/написания конспекта
Работает параллельно с quiz_agent
"""
from tasks.celery_app import celery
from core.database import SessionLocal
from models.content import Content, ProccesingStatus
from models.transcript import Transcript, Summary

@celery.task(bind=True, max_retries=2)
def summary_agent(self, content_id: int) -> int:
    db = SessionLocal()
    try:
        transcript = db.query(Transcript).filter(
            Transcript.content_id == content_id
        ).first()
        if not transcript:
            raise ValueError(f"Transcript not found for content_id {content_id}")
        
        summary_text = _generate_summary(transcript.text)

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


def _generate_summary(text: str) -> str:
    sentences = [s.strip() for s in text.replace("\n", "").split(".") if len(s.strip()) > 30]
    if not sentences:
        return text[:500]
    
    selected = sentences[::3][:20] #every 3rd sentence
    return ". ".join(selected) + "."