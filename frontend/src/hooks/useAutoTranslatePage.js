import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { DASHBOARD_COMMON_STRINGS } from './dashboardStrings';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;
const CACHE_KEY_PREFIX = 'auto_tr_v1_';

// Match any string containing at least one letter from Azerbaijani Latin alphabet
// OR regular Latin letters (fallback). We deliberately AVOID translating pure
// numeric / whitespace / symbol-only strings.
const HAS_LETTER = /[A-Za-zÇçƏəĞğİıÖöŞşÜü]/;
// Strings we never want to touch (node names that aren't user-visible, etc).
const SKIP_TAG_NAMES = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE']);
// Common short technical tokens we shouldn't run through the LLM
const NEVER_TRANSLATE = new Set([
  'QR', '₼', 'AZN', 'USD', 'EUR', '•', '·', '→', '—', '...', ',', '.',
  'AZ', 'EN', 'RU', 'TR', 'ID',
]);

function getCache(lang) {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY_PREFIX + lang) || '{}');
  } catch { return {}; }
}
function saveCache(lang, data) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + lang, JSON.stringify(data));
  } catch { /* quota exhausted */ }
}

function collectTextNodes(root) {
  const out = [];
  if (!root) return out;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      const trimmed = node.nodeValue.trim();
      if (!trimmed) return NodeFilter.FILTER_REJECT;
      if (!HAS_LETTER.test(trimmed)) return NodeFilter.FILTER_REJECT;
      if (NEVER_TRANSLATE.has(trimmed)) return NodeFilter.FILTER_REJECT;
      if (node.parentElement) {
        if (SKIP_TAG_NAMES.has(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest('[data-no-auto-translate]')) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest('input, textarea, [contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = walker.nextNode())) out.push(n);
  return out;
}

/**
 * useAutoTranslatePage — automatic DOM translator hook.
 *
 * Usage:
 *   const pageRef = useAutoTranslatePage();
 *   return <div ref={pageRef}>...all your Azerbaijani content...</div>;
 *
 * Behaviour:
 *   • If i18n.language === 'az' → no-op (source language).
 *   • Otherwise, walks the container DOM, batches distinct text strings,
 *     sends them to POST /api/translate/batch and replaces text nodes in place.
 *   • Caches translations per-language in localStorage so repeat visits are instant.
 *   • Uses a MutationObserver so dynamically rendered content is translated too.
 *   • Add `data-no-auto-translate` on any element to opt-out (e.g. usernames).
 */
export default function useAutoTranslatePage() {
  const { i18n } = useTranslation();
  const ref = useRef(null);
  // Normalize 'en-US' → 'en', 'ru-RU' → 'ru'
  const raw = i18n.language || 'az';
  const lang = raw.split('-')[0].toLowerCase();

  useEffect(() => {
    if (lang === 'az') return undefined;
    const root = ref.current;
    if (!root) return undefined;

    let cache = getCache(lang);

    // ── PRE-WARM ── on first visit for this language, send our curated list
    // of common dashboard strings in ONE batch request so the first render
    // already has them in cache and the MutationObserver can translate in-place
    // without the user noticing any AZ flash.
    const prewarmKey = `${CACHE_KEY_PREFIX}${lang}_prewarmed`;
    if (!localStorage.getItem(prewarmKey)) {
      const missing = DASHBOARD_COMMON_STRINGS.filter((s) => !cache[s]);
      if (missing.length > 0) {
        axios.post(`${API}/translate/batch`, {
          texts: missing,
          target_lang: lang,
          source_lang: 'az',
        }, { timeout: 20000 })
          .then((res) => {
            const translations = res?.data?.translations || {};
            cache = { ...cache, ...translations };
            saveCache(lang, cache);
            localStorage.setItem(prewarmKey, '1');
            // Trigger another DOM pass so any already-rendered AZ text gets swapped
            applyCachedAndCollect();
          })
          .catch(() => { /* silent */ });
      } else {
        localStorage.setItem(prewarmKey, '1');
      }
    }

    const pendingOriginals = new Map(); // original -> [textNode, ...]
    let flushTimer = null;

    const applyCachedAndCollect = () => {
      const textNodes = collectTextNodes(root);
      const toRequest = new Set();
      for (const node of textNodes) {
        const original = node.nodeValue.trim();
        if (!original) continue;
        // If DOM already contains the translation, skip (we marked it with a dataset on parent)
        if (node.__autoTranslated === lang) continue;
        const hit = cache[original];
        if (hit) {
          // Replace while preserving surrounding whitespace
          node.nodeValue = node.nodeValue.replace(original, hit);
          node.__autoTranslated = lang;
          continue;
        }
        toRequest.add(original);
        const bucket = pendingOriginals.get(original) || [];
        bucket.push(node);
        pendingOriginals.set(original, bucket);
      }
      if (toRequest.size > 0) scheduleFlush();
    };

    const scheduleFlush = () => {
      if (flushTimer) return;
      // Debounce so rapid mutations don't fire N separate requests
      flushTimer = setTimeout(flush, 250);
    };

    const flush = async () => {
      flushTimer = null;
      const originals = Array.from(pendingOriginals.keys()).slice(0, 100);
      if (originals.length === 0) return;
      // Remove taken items from pending so subsequent flushes don't duplicate
      const batchNodes = new Map();
      for (const k of originals) {
        batchNodes.set(k, pendingOriginals.get(k));
        pendingOriginals.delete(k);
      }
      try {
        const res = await axios.post(`${API}/translate/batch`, {
          texts: originals,
          target_lang: lang,
          source_lang: 'az',
        }, { timeout: 20000 });
        const translations = res?.data?.translations || {};
        for (const original of originals) {
          const translated = translations[original];
          if (!translated || translated === original) continue;
          cache[original] = translated;
          const nodes = batchNodes.get(original) || [];
          for (const node of nodes) {
            if (!node || !node.parentElement) continue;
            if (node.__autoTranslated === lang) continue;
            node.nodeValue = node.nodeValue.replace(original, translated);
            node.__autoTranslated = lang;
          }
        }
        saveCache(lang, cache);
      } catch (e) {
        // fail quietly — source text remains visible
        // eslint-disable-next-line no-console
        console.warn('auto-translate batch failed:', e?.message || e);
      }
      // Drain any further pending added during the request
      if (pendingOriginals.size > 0) scheduleFlush();
    };

    // Initial pass after mount
    const initial = setTimeout(applyCachedAndCollect, 50);

    // Observe DOM changes — router swaps, list mutations, modal opens, etc.
    const mo = new MutationObserver(() => {
      applyCachedAndCollect();
    });
    mo.observe(root, { childList: true, subtree: true, characterData: true });

    return () => {
      clearTimeout(initial);
      if (flushTimer) clearTimeout(flushTimer);
      mo.disconnect();
    };
  }, [lang]);

  return ref;
}
