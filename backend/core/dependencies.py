from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import decode_token
from models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Недействительный токен")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user

def require_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Только для преподавателей")
    return current_user