from fastapi import FastAPI
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

app = FastAPI(title="VideoQuiz API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://videoquizai.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}