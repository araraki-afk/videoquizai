"""
Общий клиент для Groq API.
Все агенты используют его для запросов к LLM
"""

import json
import httpx
from core.config import settings

def ask_groq(system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> str:
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        # gemini-2.0-flash или gemini-1.5-flash — быстрые и бесплатные модели
        "model": "gemini-2.0-flash", 
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3
    }
    
    # Используем OpenAI-совместимый эндпоинт от Google
    response = httpx.post(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",  
        headers=headers,
        json=payload,
        timeout=60.0
    )
    
    if response.status_code != 200:
        print(f"Gemini API Error: {response.status_code} - {response.text}")
        
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()

def ask_gemini_json(system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> dict | list:
    system_with_json = system_prompt + "\n\nОТВЕЧАЙ ТОЛЬКО ВАЛИДНЫМ JSON. НИКАКОГО ТЕКСТА ДО ИЛИ ПОСЛЕ JSON."
    
    raw = ask_groq(system_with_json, user_prompt, max_tokens)

    clean = raw.strip()
    if clean.startswith("```"):
        # Аккуратный парсинг маркдауна
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
    clean = clean.strip()

    return json.loads(clean)

def ask_groq_json(system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> dict | list:
    system_with_json = system_prompt + "\n\nОТВЕЧАЙ ТОЛЬКО ВАЛИДНЫМ JSON. НИКАКОГО ТЕКСТА ДО ИЛИ ПОСЛЕ JSON."
    
    raw = ask_groq(system_with_json, user_prompt, max_tokens)

    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
    clean = clean.strip()

    return json.loads(clean)