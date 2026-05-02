#!/usr/bin/env python3
"""
translate-i18n.py — scalable i18n sync script.

Source of truth: /app/frontend/src/i18n/locales/az.json
Targets:          every other *.json file in the same directory.

What it does:
  • Walks the source JSON recursively and collects every leaf key path.
  • For each target lang, finds keys that are missing OR identical to the source
    (copy-paste untranslated) and asks Gemini 2.5 Flash to translate them in a
    single batched request.
  • Placeholders like {{name}}, {{count}}, {{s}} are preserved literally.
  • Never overwrites a manual translation that already exists (unless --force).

Add a new language:  `python3 translate-i18n.py --add-lang fr`
  creates fr.json with every key translated from Azerbaijani.

Usage:
  python3 /app/scripts/translate-i18n.py                 # fill gaps for all langs
  python3 /app/scripts/translate-i18n.py --lang ru       # only Russian
  python3 /app/scripts/translate-i18n.py --add-lang fr   # create+fill a new lang
  python3 /app/scripts/translate-i18n.py --force         # retranslate everything
  python3 /app/scripts/translate-i18n.py --dry-run       # show what would change
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

# Make backend imports available (emergentintegrations is installed there).
sys.path.insert(0, "/app/backend")

from dotenv import load_dotenv  # noqa: E402
load_dotenv("/app/backend/.env")

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402

LOCALES_DIR = Path("/app/frontend/src/i18n/locales")
SOURCE_LANG = "az"

# Full language names — extend freely when you add a new code.
LANG_NAMES = {
    "az": "Azerbaijani",
    "en": "English",
    "ru": "Russian",
    "tr": "Turkish",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "it": "Italian",
    "pt": "Portuguese",
    "ar": "Arabic",
    "fa": "Persian (Farsi)",
    "uk": "Ukrainian",
    "pl": "Polish",
    "nl": "Dutch",
    "ro": "Romanian",
    "sv": "Swedish",
    "he": "Hebrew",
    "ka": "Georgian",
    "uz": "Uzbek",
    "kk": "Kazakh",
    "zh": "Chinese (Simplified)",
    "ja": "Japanese",
    "ko": "Korean",
}


# ---------- helpers to walk nested dicts by dot-path ----------

def flatten(obj: Any, prefix: str = "") -> dict[str, str]:
    """Turn nested dict -> {dotted.key.path: "leaf string"}."""
    out: dict[str, str] = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_prefix = f"{prefix}.{k}" if prefix else k
            out.update(flatten(v, new_prefix))
    elif isinstance(obj, str):
        out[prefix] = obj
    # Ignore non-string leaves (numbers/bools/null) — we don't translate them.
    return out


def unflatten(flat: dict[str, str]) -> dict[str, Any]:
    """Turn {dotted.key.path: "leaf"} -> nested dict."""
    root: dict[str, Any] = {}
    for key, val in flat.items():
        parts = key.split(".")
        cur = root
        for part in parts[:-1]:
            if part not in cur or not isinstance(cur[part], dict):
                cur[part] = {}
            cur = cur[part]
        cur[parts[-1]] = val
    return root


def deep_merge(base: dict, overlay: dict) -> dict:
    """Overlay wins at leaf-level; base keys are preserved."""
    for k, v in overlay.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            deep_merge(base[k], v)
        else:
            base[k] = v
    return base


# ---------- JSON sort that preserves source key order ----------

def reorder_like(source: dict, target: dict) -> dict:
    """Rebuild target so keys follow source order (new keys appended)."""
    out: dict[str, Any] = {}
    # First: keys in source order
    for k, v in source.items():
        if k in target:
            tv = target[k]
            if isinstance(v, dict) and isinstance(tv, dict):
                out[k] = reorder_like(v, tv)
            else:
                out[k] = tv
    # Then: any extra keys the target has (not in source) — keep them at the end
    for k, v in target.items():
        if k not in out:
            out[k] = v
    return out


# ---------- LLM translation ----------

PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}")


def build_prompt(lang_name: str, batch: dict[str, str]) -> str:
    sample = json.dumps(batch, ensure_ascii=False, indent=2)
    return (
        f"Translate the JSON VALUES from Azerbaijani into {lang_name}.\n"
        f"Rules:\n"
        f"  1. Return a single valid JSON object with the EXACT SAME KEYS.\n"
        f"  2. Preserve placeholders like {{{{name}}}}, {{{{count}}}}, {{{{s}}}}, {{{{total}}}} EXACTLY.\n"
        f"  3. Preserve punctuation, emojis, line breaks, named entities (e.g. 'QR Restoran', 'Bakı').\n"
        f"  4. Keep UI strings concise and natural for a food-delivery/restaurant app.\n"
        f"  5. Do NOT add quotes, code fences or commentary. Reply with JSON only.\n\n"
        f"Input JSON:\n{sample}"
    )


def strip_code_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t)
        t = re.sub(r"\s*```$", "", t)
    return t.strip()


async def translate_batch(lang_code: str, batch: dict[str, str]) -> dict[str, str]:
    if not batch:
        return {}
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY is not set in /app/backend/.env")

    lang_name = LANG_NAMES.get(lang_code, lang_code)
    chat = LlmChat(
        api_key=api_key,
        session_id=f"i18n-{lang_code}",
        system_message=(
            "You are a professional i18n translator for a restaurant marketplace "
            "web app. Always return valid JSON and preserve placeholders verbatim."
        ),
    ).with_model("gemini", "gemini-2.5-flash")

    prompt = build_prompt(lang_name, batch)
    response = await chat.send_message(UserMessage(text=prompt))
    raw = strip_code_fences(response or "")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        # Try to salvage the biggest {...} block
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            raise RuntimeError(f"LLM returned non-JSON for {lang_code}: {raw[:200]}") from e
        parsed = json.loads(match.group(0))

    if not isinstance(parsed, dict):
        raise RuntimeError(f"Expected JSON object for {lang_code}, got {type(parsed).__name__}")

    # Safety check: every placeholder in the source must survive in the target.
    fixed: dict[str, str] = {}
    for k, src in batch.items():
        tgt = parsed.get(k)
        if not isinstance(tgt, str) or not tgt.strip():
            print(f"  ! {lang_code}::{k} — LLM gave empty/non-string, keeping source")
            fixed[k] = src
            continue
        src_placeholders = set(PLACEHOLDER_RE.findall(src))
        tgt_placeholders = set(PLACEHOLDER_RE.findall(tgt))
        if src_placeholders != tgt_placeholders:
            print(f"  ! {lang_code}::{k} — placeholder mismatch {src_placeholders} vs {tgt_placeholders}, keeping source")
            fixed[k] = src
        else:
            fixed[k] = tgt
    return fixed


# ---------- main ----------

def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: dict) -> None:
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    path.write_text(text, encoding="utf-8")


async def sync_lang(lang_code: str, source_flat: dict[str, str], *, force: bool, dry_run: bool) -> None:
    tgt_path = LOCALES_DIR / f"{lang_code}.json"
    target = load_json(tgt_path)
    target_flat = flatten(target)

    if force:
        missing = dict(source_flat)
    else:
        # Only translate keys that are truly missing. Equal strings (e.g. "Email",
        # "Bar", "WhatsApp") are legitimate cognates and should be left alone.
        missing = {k: v for k, v in source_flat.items() if k not in target_flat}

    if not missing:
        print(f"  ✓ {lang_code}: up to date ({len(target_flat)} keys)")
        return

    print(f"  → {lang_code}: translating {len(missing)} key(s)...")
    if dry_run:
        for k in list(missing)[:5]:
            print(f"      · {k} = {missing[k][:60]}")
        if len(missing) > 5:
            print(f"      · ... +{len(missing) - 5} more")
        return

    # Chunk into batches of ~40 keys to keep prompts tight & reliable.
    CHUNK = 40
    keys = list(missing.keys())
    translated: dict[str, str] = {}
    for i in range(0, len(keys), CHUNK):
        chunk = {k: missing[k] for k in keys[i : i + CHUNK]}
        translated.update(await translate_batch(lang_code, chunk))

    # Merge translations into a FULL tree reordered like source
    target_flat.update(translated)
    new_target = unflatten(target_flat)
    # Keep source key ordering so diffs stay clean
    source_tree = load_json(LOCALES_DIR / f"{SOURCE_LANG}.json")
    new_target = reorder_like(source_tree, new_target)

    save_json(tgt_path, new_target)
    print(f"  ✓ {lang_code}: wrote {tgt_path.name} (+{len(translated)} updated)")


async def main_async(args: argparse.Namespace) -> int:
    source_path = LOCALES_DIR / f"{SOURCE_LANG}.json"
    if not source_path.exists():
        print(f"Source file not found: {source_path}", file=sys.stderr)
        return 1

    source_tree = load_json(source_path)
    source_flat = flatten(source_tree)
    print(f"Source (az.json): {len(source_flat)} string keys")

    # Figure out target languages
    if args.add_lang:
        code = args.add_lang
        if code not in LANG_NAMES:
            print(f"! Unknown lang code '{code}'. Add it to LANG_NAMES in this script.", file=sys.stderr)
            return 2
        (LOCALES_DIR / f"{code}.json").touch(exist_ok=True)
        if not (LOCALES_DIR / f"{code}.json").read_text(encoding="utf-8").strip():
            save_json(LOCALES_DIR / f"{code}.json", {})
        target_langs = [code]
    elif args.lang:
        target_langs = [args.lang]
    else:
        target_langs = sorted(
            p.stem for p in LOCALES_DIR.glob("*.json") if p.stem != SOURCE_LANG
        )

    print(f"Targets: {', '.join(target_langs) or '(none)'}\n")
    for code in target_langs:
        await sync_lang(code, source_flat, force=args.force, dry_run=args.dry_run)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync i18n JSON files from az.json using Gemini 2.5 Flash.")
    parser.add_argument("--lang", help="Translate only this target language code (e.g. en, ru)")
    parser.add_argument("--add-lang", help="Create a new locale JSON (e.g. fr, de) and fill it")
    parser.add_argument("--force", action="store_true", help="Retranslate every key, even if already localized")
    parser.add_argument("--dry-run", action="store_true", help="Show missing keys but don't call the LLM")
    args = parser.parse_args()
    try:
        return asyncio.run(main_async(args))
    except KeyboardInterrupt:
        print("\nAborted.")
        return 130


if __name__ == "__main__":
    sys.exit(main())
