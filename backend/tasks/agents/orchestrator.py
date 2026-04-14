import time
from celery import chain, group
from tasks.celery_app import celery
from tasks.agents.transcription_agent import transcription_agent
from tasks.agents.topics_agent import topics_agent
from tasks.agents.summary_agent import summary_agent
from tasks.agents.quiz_agent import quiz_agent
from core.database import SessionLocal
from models.content import Content, ProccesingStatus

import models.user        
import models.content     
import models.transcript  
import models.quiz        

@celery.task(bind=True)
def pause_pipeline(self, previous_result, seconds: int = 5):
    """
    Принимает результат предыдущей таски, ждет N секунд 
    и пробрасывает результат дальше по цепочке.
    """
    time.sleep(seconds)
    return previous_result

@celery.task(bind=True)
def run_pipeline(self, content_id: int):
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            return
        content.status = ProccesingStatus.proccesing
        content.task_id = self.request.id
        db.commit()
    finally:
        db.close()

    pipeline = chain(
        transcription_agent.s(content_id),
        topics_agent.s(),
        group (
            summary_agent.s(),
            quiz_agent.s()
        )             
    )
    pipeline.delay()