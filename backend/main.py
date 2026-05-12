from fastapi import FastAPI
from sqlalchemy import text
from core.database import Base, engine
from api.v1.router import router
from fastapi.middleware.cors import CORSMiddleware
import models.user
import models.quiz
import models.content
import models.transcript
import models.feedback
import models.classroom

Base.metadata.create_all(bind=engine)


def _run_lightweight_migrations() -> None:
    """
    Add columns introduced after the initial release. Uses
    `ADD COLUMN IF NOT EXISTS`, which is safe on Postgres 9.6+ and is a no-op
    when the column already exists. Keeps the app working on existing DBs
    without requiring Alembic.
    """
    statements = [
        # Quiz: classroom-specific copies + drafts
        'ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS classroom_id INTEGER',
        'ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE',
        'ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS source_quiz_id INTEGER',
        # ClassroomContent: per-classroom deadline
        'ALTER TABLE classroom_contents ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE',
    ]
    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as exc:
                # log and continue; safer than crashing the API on boot
                print(f"[migration] skipped `{stmt}` ({exc})")


_run_lightweight_migrations()

app = FastAPI(title="VideoQuiz API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000", 
        "https://videoquizai.vercel.app" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}