"""
микросервис транскрипции
принимает POST /transcribe, возвращает текст

Изолирован от основа API
- падение whisper не роняет весь бэкенд
- модель загружается один раз при старте контейнера
"""
import os
import tempfile
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Whisper Service API", version="0.1.0")

_model = None #model loads only once when container starts, not for every request!

def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        model_size = os.getenv("WHISPER_MODEL_SIZE", "small")
        print(f"[whisper] Loading model {model_size}...")
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
    
    audio_path = None
    tmp_dir = None

    try:
        if body.content_type == "youtube_url":
            audio_path, tmp_dir = _download_youtube(body.source)
        else:
            audio_path = body.source
            if not os.path.exists(audio_path):
                raise HTTPException(status_code=404, detail="Аудиофайл не найден")
            
        model = get_model()
        segments, info = model.transcribe(audio_path, beam_size=5) #beam_size=5 - better quality, but slower. Можно вынести в настройки
        text = " ".join(seg.text.strip() for seg in segments)

        return TranscribeResponse(
            text=text,
            duration_second=round(info.duration, 1)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при транскрипции: {str(e)}")
    finally:
        #deleting temp files
        if tmp_dir and os.path.exists(tmp_dir):
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)

def _download_youtube(url: str) -> tuple[str, str]:
    import yt_dlp

    tmp_dir = tempfile.mkdtemp()
    output_template = os.path.join(tmp_dir, "audio.%(ext)s")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
        }],
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    audio_path = os.path.join(tmp_dir, "audio.mp3")
    if not os.path.join(tmp_dir, "audio.mp3"):
        raise RuntimeError("Не удалось скачать аудио с YouTube")
    
    return audio_path, tmp_dir