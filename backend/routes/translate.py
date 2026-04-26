"""Lightweight translation endpoint powered by Emergent LLM key (Gemini Flash)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import os
import hashlib
import logging
from database import db
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)
router = APIRouter()

LANG_NAMES = {
    "az": "Azerbaijani",
    "tr": "Turkish",
    "ru": "Russian",
    "en": "English",
}


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    target_lang: str = Field(pattern="^(az|tr|ru|en)$")
    source_lang: Optional[str] = None  # optional hint


class TranslateResponse(BaseModel):
    text: str
    target_lang: str
    cached: bool = False


def _cache_key(text: str, target: str) -> str:
    h = hashlib.sha256(f"{target}::{text}".encode("utf-8")).hexdigest()
    return f"tr_{h}"


@router.post("/translate", response_model=TranslateResponse)
async def translate(req: TranslateRequest):
    """Translate short user-generated content (e.g. review comments) to a
    target language. Results are cached forever in MongoDB to avoid repeat LLM
    calls for the same string."""
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")

    cache_id = _cache_key(text, req.target_lang)
    cached = await db.translation_cache.find_one({"id": cache_id}, {"_id": 0})
    if cached:
        return TranslateResponse(text=cached["text"], target_lang=req.target_lang, cached=True)

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Translation service not configured")

    target_name = LANG_NAMES.get(req.target_lang, req.target_lang)
    system = (
        f"You are a professional translator. Translate the user's message into {target_name}. "
        "Preserve emojis, punctuation, line breaks, and named entities exactly. "
        "Reply with the translation only — no quotes, no commentary, no language label."
    )

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"translate-{cache_id[:12]}",
            system_message=system,
        ).with_model("gemini", "gemini-2.5-flash")
        response = await chat.send_message(UserMessage(text=text))
        translated = (response or "").strip()
        if not translated:
            raise ValueError("Empty translation")
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=502, detail="Translation failed")

    # Cache the result
    try:
        await db.translation_cache.insert_one({
            "id": cache_id,
            "text": translated,
            "target_lang": req.target_lang,
            "source_text": text,
        })
    except Exception:
        pass

    return TranslateResponse(text=translated, target_lang=req.target_lang, cached=False)
