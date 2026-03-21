"""
Общий клиент для OpenAI API.
Все агенты используют его для запросов к LLM
"""

import json
import httpx
from core.config import settings

def ask_gpt(system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> str:
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "gpt-4o-mini", 
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3
    }
    
    response = httpx.post(
        "https://api.openai.com/v1/chat/completions",  
        headers=headers,
        json=payload,
        timeout=60.0
    )
    
    if response.status_code != 200:
        print(f"[OpenAI] API Error: {response.status_code}: {response.text[:300]}")
        
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()

def ask_gpt_json(system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> dict | list:
    system_with_json = system_prompt + "\n\nОТВЕЧАЙ ТОЛЬКО ВАЛИДНЫМ JSON. НИКАКОГО ТЕКСТА ДО ИЛИ ПОСЛЕ JSON."
    
    raw = ask_gpt(system_with_json, user_prompt, max_tokens)

    clean = raw.strip()
    if clean.startswith("```"):
        # Аккуратный парсинг маркдауна
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
    clean = clean.strip()

    return json.loads(clean)
