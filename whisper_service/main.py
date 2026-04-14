"""
Микросервис транскрипции.
Принимает POST /transcribe, возвращает текст.

Изолирован от основного API:
- падение whisper не роняет весь бэкенд
- модель загружается один раз при старте контейнера
"""
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Whisper Service API", version="0.1.0")

_model = None  # модель грузится один раз, а не на каждый запрос


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        model_size = os.getenv("WHISPER_MODEL_SIZE", "small")
        print(f"[whisper] Loading model '{model_size}'...")
        _model = WhisperModel(model_size, device="cpu", compute_type="int8")
        print("[whisper] Model loaded")
    return _model


class TranscribeRequest(BaseModel):
    content_type: str
    source: str


class TranscribeResponse(BaseModel):
    text: str
    duration_second: float | None = None


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/transcribe", response_model=TranscribeResponse)
def transcribe(body: TranscribeRequest):
    if body.content_type == "raw_text":
        return TranscribeResponse(text=body.source)

    try:
        if body.content_type == "youtube_url":
            # Для YouTube берём субтитры напрямую — без скачивания видео,
            # без борьбы с DRM и PO Token
            text = _get_youtube_transcript(body.source)
            return TranscribeResponse(text=text)
        else:
            # Для загруженных файлов используем Whisper
            audio_path = body.source
            if not os.path.exists(audio_path):
                raise HTTPException(status_code=404, detail="Аудиофайл не найден")
            return _whisper_transcribe(audio_path)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[whisper] ERROR in transcribe: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при транскрипции: {str(e)}")


def _get_youtube_transcript(url: str) -> str:
    """
    Получает субтитры YouTube через youtube-transcript-api 1.x.
    API v1.x: YouTubeTranscriptApi() — экземпляр, не статический класс.
    """
    import re
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled

    # Извлекаем video_id из любого формата URL
    match = re.search(r"(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})", url)
    if not match:
        raise ValueError(f"Не удалось извлечь video_id из URL: {url}")
    video_id = match.group(1)

    print(f"[whisper] Getting transcript for video_id={video_id}")

    api = YouTubeTranscriptApi()

    try:
        # Пробуем по приоритету: ru → en → любой доступный
        for languages in (["ru"], ["en"], None):
            try:
                if languages is not None:
                    fetched = api.fetch(video_id, languages=languages)
                else:
                    # Берём первый доступный язык
                    transcript_list = api.list(video_id)
                    first = next(iter(transcript_list))
                    fetched = first.fetch()
                    print(f"[whisper] Fallback to language: {first.language_code}")

                # Собираем текст из сегментов
                parts = []
                for seg in fetched:
                    t = seg.text if hasattr(seg, "text") else seg.get("text", "")
                    if t and t.strip():
                        parts.append(t.strip())

                text = " ".join(parts)
                if text.strip():
                    print(f"[whisper] Transcript fetched: {len(text)} chars")
                    return text

            except NoTranscriptFound:
                continue

        raise RuntimeError("Субтитры не найдены ни на одном языке")

    except TranscriptsDisabled:
        raise RuntimeError(
            "Субтитры отключены для этого видео. "
            "Попробуйте другое видео или загрузите файл напрямую."
        )


def _whisper_transcribe(audio_path: str) -> TranscribeResponse:
    """Транскрибирует аудиофайл через локальную модель Whisper."""
    model = get_model()
    segments, info = model.transcribe(audio_path, beam_size=5)
    text = " ".join(seg.text.strip() for seg in segments)
    return TranscribeResponse(
        text=text,
        duration_second=round(info.duration, 1),
    )