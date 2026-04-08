from celery import Celery
from core.config import settings

celery = Celery(
    "videoquiz",
    broker = settings.REDIS_URL,
    backend = settings.REDIS_URL,
    include = [
        "tasks.agents.orchestrator",
        "tasks.agents.transcription_agent",
        "tasks.agents.topics_agent",
        "tasks.agents.summary_agent",
        "tasks.agents.quiz_agent",
    ]
)

celery.conf.update(
    task_serializer = "json",
    result_serializer = "json",
    accept_content = ["json"],
    timezone = "UTC",
    enable_utc = True,
    task_track_started = True,
)
