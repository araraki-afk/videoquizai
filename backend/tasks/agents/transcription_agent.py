"""
Агент транскрипции
-raw_text: текст есть, сохраняем
-youtube_url/uploaded_video: вызываем МИКРОСЕРВИС whisper по http"""
import httpx
from tasks.celery_app import celery
from core.database import SessionLocal
from core.config import settings
from models.content import Content, ProccesingStatus, ContentType
from models.transcript import Transcript

@celery.task(bind=True, max_tries=3, default_retry_delay=30)
def transcription_agent(self, content_id: int) -> int:
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            raise ValueError(f"Content {content_id} not found")
        
        if content.content_type == ContentType.raw_text:
            text = content.raw_text or content.source
        else:
            text = _call_whisper(content)

        transcript = Transcript(content_id=content.id, text=text)
        db.add(transcript)
        db.commit()
        return content_id
    
    except Exception as e:
        db.query(Content).filter(Content.id == content_id).update({
            "status": ProccesingStatus.failed,
            "error_message": f"Транскрипция: {str(e)}"
        })
        db.commit()
        raise self.retry(exc=e)
    finally:
        db.close()


def _call_whisper(content: Content) -> str:
    try:
        response = httpx.post(
            f"{settings.WHISPER_SERVICE_URL}/transcribe",
            json = {
                "content_type": content.content_type.value,
                "source": content.source,
            },
            timeout = 600.0
        )
        response.raise_for_status()
        return response.json()['text']
    except httpx.RequestError as e:
        raise RuntimeError(f"Ошибка при вызове сервиса транскрипции: {str(e)}")