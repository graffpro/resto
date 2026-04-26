import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { LANGUAGES } from '@/i18n';

export default function LanguageSwitcher({ variant = 'light' }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Normalise lang (e.g. "en-US" → "en")
  const currentCode = (i18n.resolvedLanguage || i18n.language || 'az').split('-')[0];
  const current = LANGUAGES.find(l => l.code === currentCode) || LANGUAGES[0];

  const change = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  const isDark = variant === 'dark';
  const baseBtn = isDark
    ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
    : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200';

  return (
    <div className="relative" ref={ref} data-testid="language-switcher">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all ${baseBtn}`}
        data-testid="language-switcher-button"
      >
        <span className="text-base">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-xl border border-stone-200 bg-white shadow-xl overflow-hidden z-50"
          data-testid="language-switcher-menu"
        >
          {LANGUAGES.map((lng) => (
            <button
              key={lng.code}
              type="button"
              onClick={() => change(lng.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-stone-50 transition-colors text-stone-800 ${
                lng.code === currentCode ? 'bg-stone-100 font-semibold' : ''
              }`}
              data-testid={`language-option-${lng.code}`}
            >
              <span className="text-lg">{lng.flag}</span>
              <span>{lng.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
