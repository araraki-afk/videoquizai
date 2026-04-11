"""
Общий клиент для Groq API.
Все агенты используют его для запросов к LLM
"""

import json
import httpx
from core.config import settings

def ask_groq(system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> str:
    """
    Отправляет запрос к Groq API и возвращает текст ответа.
    Синхронная версия - используется внутри Celery задач.
    """
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-type": "application/json",
    }

    payload ={
        "model": "llama-3.3-70b-versatiole",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content" : user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3 #lower the temp, more predictable the answers
    }
    response = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=60.0
    )
    response.raise_for_status()
    return response.json()["choises"][0]["message"]["content"].strip()

def ask_groq_json(system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> dict | list:
    """
    Запрос к Groq с ожиданием JSON ответа.
    Автоматически парсит и возвращает объект.
    """
    #adding the instruction to return the json
    system_with_json = system_prompt + "\n\nОТВЕЧАЙ ТОЛЬКО ВАЛИДНЫМ JSON. НИКАКОГО ТЕКСТА ДО ИЛИ ПОСЛЕ JSON."
    
    raw = ask_groq(system_with_json, user_prompt, max_tokens)

    #getting rid of markdown
    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
    clean = clean.strip()

    return json.loads(clean)

