from fastapi import FastAPI
from core.database import Base, engine
from api.v1.router import router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="VideoQuiz API", version = "0.1.0")
app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok"}