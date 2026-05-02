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

# Strings that must never be translated (numbers, currency symbols, file extensions,
# branded proper nouns, etc.). Keep this list short and product-agnostic.
NEVER_TRANSLATE = {"₼", "AZN", "USD", "EUR", "QR", "APK", "PWA"}


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    target_lang: str = Field(pattern="^(az|tr|ru|en)$")
    source_lang: Optional[str] = None  # optional hint


class TranslateResponse(BaseModel):
    text: str
    target_lang: str
    cached: bool = False


class BatchTranslateRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)
    target_lang: str = Field(pattern="^(az|tr|ru|en)$")
    source_lang: Optional[str] = "az"


class BatchTranslateResponse(BaseModel):
    translations: dict[str, str]  # original_text -> translated_text
    target_lang: str
    cached_count: int
    translated_count: int


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



@router.post("/translate/batch", response_model=BatchTranslateResponse)
async def translate_batch(req: BatchTranslateRequest):
    """Translate up to 100 short UI strings at once. Aggressively caches every
    single string in `translation_cache` so repeated page visits are ~free.
    Used by the frontend `useAutoTranslatePage` hook to translate admin panels
    automatically without manual i18n refactoring.
    """
    if req.target_lang == "az":
        # No-op for source language
        return BatchTranslateResponse(
            translations={t: t for t in req.texts},
            target_lang=req.target_lang,
            cached_count=0,
            translated_count=0,
        )

    out: dict[str, str] = {}
    to_translate: list[str] = []
    cached_count = 0

    for raw in req.texts:
        text = (raw or "").strip()
        if not text or text in NEVER_TRANSLATE or text.isdigit():
            out[raw] = raw
            continue
        cache_id = _cache_key(text, req.target_lang)
        cached = await db.translation_cache.find_one({"id": cache_id}, {"_id": 0})
        if cached:
            out[raw] = cached["text"]
            cached_count += 1
        else:
            to_translate.append(raw)

    if to_translate:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Translation service not configured")

        target_name = LANG_NAMES.get(req.target_lang, req.target_lang)
        import json as _json
        batch_payload = {f"s{i}": s.strip() for i, s in enumerate(to_translate)}
        system = (
            f"You are a UI string translator for a restaurant SaaS admin panel. "
            f"Translate Azerbaijani UI labels into {target_name}. "
            "Preserve placeholders ({{name}}, {{count}}), emojis, symbols, numbers and proper nouns. "
            "Keep translations CONCISE and NATURAL for buttons/menus. "
            "Return ONLY a valid JSON object mapping each input key to the translated string. No commentary, no code fences."
        )
        try:
            chat = LlmChat(
                api_key=api_key,
                session_id=f"batch-{req.target_lang}",
                system_message=system,
            ).with_model("gemini", "gemini-2.5-flash")
            response = await chat.send_message(UserMessage(
                text="Translate these UI strings (JSON values):\n" + _json.dumps(batch_payload, ensure_ascii=False),
            ))
            raw_text = (response or "").strip()
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```", 2)[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
                raw_text = raw_text.strip().rstrip("`").strip()
            parsed = _json.loads(raw_text)
        except Exception as e:
            logger.error(f"Batch translate failed ({req.target_lang}, n={len(to_translate)}): {e}")
            for raw in to_translate:
                out[raw] = raw
            return BatchTranslateResponse(
                translations=out,
                target_lang=req.target_lang,
                cached_count=cached_count,
                translated_count=0,
            )

        translated_count = 0
        for i, raw in enumerate(to_translate):
            key = f"s{i}"
            translated = (parsed.get(key) or "").strip()
            if not translated:
                out[raw] = raw
                continue
            out[raw] = translated
            translated_count += 1
            cache_id = _cache_key(raw.strip(), req.target_lang)
            try:
                await db.translation_cache.insert_one({
                    "id": cache_id,
                    "text": translated,
                    "target_lang": req.target_lang,
                    "source_text": raw.strip(),
                })
            except Exception:
                pass

        return BatchTranslateResponse(
            translations=out,
            target_lang=req.target_lang,
            cached_count=cached_count,
            translated_count=translated_count,
        )

    return BatchTranslateResponse(
        translations=out,
        target_lang=req.target_lang,
        cached_count=cached_count,
        translated_count=0,
    )
