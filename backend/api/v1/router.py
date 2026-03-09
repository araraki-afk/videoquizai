from fastapi import APIRouter
from . import auth, analytics, quiz, content

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(analytics.router)
router.include_router(quiz.router)
router.include_router(content.router)