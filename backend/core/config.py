from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REDIS_URL: str = "redis://localhost:6379/0"
    MEDIA_DIR: str = "/backend/media"
    MAX_UPLOAD_SIZE_MB: int = 500
    WHISPER_MODEL: str = "small"
    WHISPER_SERVICE_URL: str = "http://whisper:8001"
    GROQ_API_KEY: str  = ""

    class Config:
        env_file=".env"
        extra = "ignore"

settings = Settings()