import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import axios from 'axios';
import {
  Search, MapPin, ArrowRight, X, ChevronDown, ChevronRight, Star, Clock,
  QrCode, UtensilsCrossed, ShoppingBag, Smile, Sparkles, LogIn, Flame,
  Pizza, Beef, Fish, Coffee, Wine, IceCream, Soup, Salad,
} from 'lucide-react';
import { toast } from 'sonner';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CustomerAuthModal from '@/components/CustomerAuthModal';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

// Food categories — Wolt-style scrollable row. Keys map to keywords we search
// across partner name/description/cuisine_tags (when we add that field).
const CATEGORIES = [
  { key: 'all',        Icon: Flame,            label: { az: 'Hamısı',   en: 'All',       ru: 'Все',       tr: 'Hepsi' } },
  { key: 'pizza',      Icon: Pizza,            label: { az: 'Pizza',    en: 'Pizza',     ru: 'Пицца',     tr: 'Pizza' } },
  { key: 'burger',     Icon: Beef,             label: { az: 'Burger',   en: 'Burger',    ru: 'Бургер',    tr: 'Burger' } },
  { key: 'sushi',      Icon: Fish,             label: { az: 'Suşi',     en: 'Sushi',     ru: 'Суши',      tr: 'Sushi' } },
  { key: 'national',   Icon: Soup,             label: { az: 'Milli',    en: 'Local',     ru: 'Местная',   tr: 'Yerel' } },
  { key: 'cafe',       Icon: Coffee,           label: { az: 'Kafe',     en: 'Cafe',      ru: 'Кафе',      tr: 'Kafe' } },
  { key: 'bar',        Icon: Wine,             label: { az: 'Bar',      en: 'Bar',       ru: 'Бар',       tr: 'Bar' } },
  { key: 'salad',      Icon: Salad,            label: { az: 'Sağlam',   en: 'Healthy',   ru: 'Здоровое',  tr: 'Sağlıklı' } },
  { key: 'dessert',    Icon: IceCream,         label: { az: 'Desert',   en: 'Dessert',   ru: 'Десерт',    tr: 'Tatlı' } },
];

// Fallback covers when partner has no cover_url
const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
  'https://images.unsplash.com/photo-1667388969250-1c7220bf3f37?w=800',
  'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?w=800',
  'https://images.unsplash.com/photo-1634043319926-c2565ac15c63?w=800',
];

function pickFallbackCover(partnerId = '') {
  const hash = partnerId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_COVERS[hash % FALLBACK_COVERS.length];
}

// Best-effort category matcher using partner name/description
function matchesCategory(partner, catKey) {
  if (catKey === 'all') return true;
  const text = `${partner.name || ''} ${partner.description || ''}`.toLowerCase();
  const aliases = {
    pizza: ['pizza', 'pizzeria'],
    burger: ['burger', 'grill', 'steak', 'beef'],
    sushi: ['sushi', 'japan'],
    national: ['milli', 'kebab', 'dolma', 'plov', 'azərbaycan', 'local'],
    cafe: ['cafe', 'kafe', 'coffee', 'qəhvə', 'kofe'],
    bar: ['bar', 'pub', 'cocktail', 'wine', 'pivə'],
    salad: ['salad', 'healthy', 'vegan', 'salat'],
    dessert: ['dessert', 'sweet', 'ice cream', 'pastry', 'desert', 'tort'],
  };
  return (aliases[catKey] || []).some((kw) => text.includes(kw));
}

function RestaurantCard({ partner }) {
  const cover = partner.cover_url || pickFallbackCover(partner.id);
  return (
    <Link
      to={`/menu/${partner.restaurant_id}`}
      className="group relative flex flex-col bg-white rounded-2xl overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] transition-all duration-300 border border-gray-100 hover:-translate-y-1"
      data-testid={`wolt-restaurant-card-${partner.id}`}
    >
      <div className="relative w-full aspect-[4/3] sm:h-48 overflow-hidden bg-gray-100">
        <img
          src={cover}
          alt={partner.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {partner.is_featured && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400/95 text-amber-900 backdrop-blur-sm shadow-sm">
            <Sparkles size={10} /> Featured
          </span>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          <span className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-[#1A251E] shadow-sm inline-flex items-center gap-1">
            <Clock size={11} /> 25-35 dəq
          </span>
        </div>
        <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-4 border-white shadow-md bg-white overflow-hidden grid place-items-center">
          {partner.logo_url
            ? <img src={partner.logo_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-lg font-black text-[#1A251E]">{(partner.name || '?').charAt(0)}</span>}
        </div>
      </div>
      <div className="pt-8 pb-5 px-4 flex flex-col gap-1.5">
        <h3 className="text-lg font-bold text-[#1A251E] group-hover:text-[#C05C3D] transition-colors line-clamp-1">
          {partner.name}
        </h3>
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <span className="inline-flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md text-xs">
            <Star size={11} className="fill-amber-500 text-amber-500" /> {(partner.rating_avg || 0).toFixed(1)}
          </span>
          <span className="text-stone-400 text-xs">({partner.ratings_count || 0})</span>
          {partner.address && !partner.address.startsWith('http') && (
            <>
              <span className="text-stone-300">·</span>
              <span className="truncate text-xs text-stone-500">{partner.address}</span>
            </>
          )}
        </div>
        {partner.description && (
          <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{partner.description}</p>
        )}
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { setAuth } = useAuth();
  const { customer, logout: customerLogout, isAuthenticated: customerAuthed } = useCustomerAuth();

  const [showRegister, setShowRegister] = useState(false);
  const [showCustomerAuth, setShowCustomerAuth] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');

  const [regForm, setRegForm] = useState({ restaurant_name: '', owner_name: '', username: '', password: '', phone: '' });
  const [regLoading, setRegLoading] = useState(false);

  // Fetch partners
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const res = await axios.get(`${API}/partner-restaurants`);
        setPartners(res.data || []);
      } catch {
        setPartners([]);
      } finally { setLoadingPartners(false); }
    };
    fetchPartners();
  }, []);

  // Listen for register-modal open event (used by other components if needed)
  useEffect(() => {
    const open = () => setShowRegister(true);
    window.addEventListener('open-restaurant-register', open);
    return () => window.removeEventListener('open-restaurant-register', open);
  }, []);

  const filteredPartners = useMemo(() => {
    let list = partners.filter((p) => matchesCategory(p, activeCat));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [partners, activeCat, search]);

  const catLabel = (cat) => cat.label[i18n.language] || cat.label.az;

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.restaurant_name || !regForm.owner_name || !regForm.username || !regForm.password) {
      toast.error(t('customer_auth.terms', 'Fill all fields')); return;
    }
    setRegLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, regForm);
      setAuth(res.data.token, res.data.user);
      toast.success('✓');
      navigate('/admin');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    } finally { setRegLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A251E]">
      {/* ========== HEADER ========== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-100" data-testid="landing-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="landing-logo">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C05C3D] to-[#E0402A] grid place-items-center text-white font-black">Q</div>
            <span className="font-black text-lg tracking-tight hidden sm:inline">QR Restoran</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Become a Partner — small chip (secondary CTA) */}
            <button
              onClick={() => setShowRegister(true)}
              className="hidden sm:inline-flex items-center gap-1 bg-[#C05C3D]/10 text-[#C05C3D] hover:bg-[#C05C3D]/20 rounded-full px-3 md:px-4 py-1.5 text-xs md:text-sm font-semibold transition-colors"
              data-testid="header-become-partner"
            >
              <Sparkles size={13} /> {t('landing.partners.become_cta', 'Partnyor ol')}
            </button>

            {/* Customer Login / Account */}
            {customerAuthed ? (
              <button
                onClick={customerLogout}
                className="inline-flex items-center gap-1.5 bg-[#1A251E] text-white rounded-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold hover:bg-black transition-colors"
                data-testid="header-customer-account"
                title={customer?.email}
              >
                <Smile size={13} /> {customer?.name?.split(' ')[0] || t('customer_auth.account')}
              </button>
            ) : (
              <button
                onClick={() => setShowCustomerAuth(true)}
                className="inline-flex items-center gap-1.5 bg-[#1A251E] text-white rounded-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold hover:bg-black transition-colors"
                data-testid="header-customer-login"
              >
                <LogIn size={13} /> {t('customer_auth.login', 'Daxil ol')}
              </button>
            )}

            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* ========== HERO ========== */}
      <section className="relative w-full min-h-[420px] md:min-h-[520px] bg-gradient-to-br from-[#F4F5F2] via-[#FFE8D6] to-[#FFDEC7] flex flex-col items-center justify-center pt-28 md:pt-32 pb-14 px-4 overflow-hidden" data-testid="landing-hero">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, rgba(192,92,61,0.12) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(245,158,11,0.12) 0%, transparent 45%)"
        }} />
        <h1 className="relative z-10 text-center text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-[#1A251E] mb-3 max-w-4xl">
          {t('landing.hero.title', 'Nə yemək istəyirsən?')}
        </h1>
        <p className="relative z-10 text-center text-sm md:text-base text-stone-700 mb-8 max-w-xl">
          {t('landing.hero.subtitle', 'Yaxınındakı ən yaxşı restoranları kəşf et, menyusuna bax, rezerv et və ya çatdırılma sifariş et.')}
        </p>

        {/* Search bar — pill */}
        <div className="relative z-10 w-full max-w-2xl bg-white rounded-full p-1.5 md:p-2 shadow-[0_12px_40px_rgba(192,92,61,0.18)] flex items-center gap-1 mx-4" data-testid="landing-search-bar">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 border-r border-gray-200 text-stone-500 shrink-0" title="Bakı (tezliklə dəyişdirilə biləcək)">
            <MapPin size={16} className="text-[#C05C3D]" />
            <span className="text-sm font-semibold">Bakı</span>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('landing.hero.search_placeholder', 'Yemək və ya restoran axtar...')}
            className="flex-1 px-3 md:px-4 py-2 outline-none text-sm md:text-base text-[#1A251E] placeholder:text-stone-400 bg-transparent min-w-0"
            data-testid="landing-search-input"
          />
          <button
            onClick={() => document.getElementById('restaurants-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="bg-[#C05C3D] hover:bg-[#E0402A] text-white rounded-full px-4 md:px-6 py-2.5 md:py-3 font-semibold text-sm transition-colors inline-flex items-center gap-1.5 shrink-0"
            data-testid="landing-search-btn"
          >
            <Search size={16} />
            <span className="hidden sm:inline">{t('public_menu.search', 'Axtar').replace('...', '')}</span>
          </button>
        </div>
      </section>

      {/* ========== STICKY CATEGORY PILLS ========== */}
      <div className="sticky top-16 md:top-20 z-40 bg-white/90 backdrop-blur-md py-3 border-b border-gray-100" data-testid="landing-categories">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto gap-2 md:gap-3 pb-1" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map(({ key, Icon, label }) => {
              const active = activeCat === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCat(key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-4 h-10 rounded-full border text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-[#1A251E] border-[#1A251E] text-white shadow-md'
                      : 'bg-white border-gray-200 text-stone-600 hover:border-[#C05C3D] hover:text-[#C05C3D] hover:-translate-y-0.5'
                  }`}
                  data-testid={`landing-cat-${key}`}
                >
                  <Icon size={14} /> {catLabel({ key, Icon, label })}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========== RESTAURANTS GRID ========== */}
      <section id="restaurants-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14" data-testid="landing-restaurants">
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              {activeCat === 'all'
                ? t('landing.partners.title', 'Partnyor Restoranlar')
                : CATEGORIES.find((c) => c.key === activeCat) && catLabel(CATEGORIES.find((c) => c.key === activeCat))}
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              {loadingPartners ? '...' : `${filteredPartners.length} ${t('landing.partners.count_suffix', 'restoran')}`}
            </p>
          </div>
        </div>

        {loadingPartners ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-center py-16 text-stone-500 text-sm bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            {t('landing.partners.no_partners', 'Heç nə tapılmadı. Başqa kateqoriya seçin.')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6" data-testid="partners-grid">
            {filteredPartners.map((p) => <RestaurantCard key={p.id} partner={p} />)}
          </div>
        )}
      </section>

      {/* ========== HOW IT WORKS (compact) ========== */}
      <section className="py-14 md:py-16 bg-[#F4F5F2]/60" data-testid="landing-how">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-center mb-10">
            {t('landing.how.title', 'Necə işləyir?')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { Icon: QrCode,          label: t('landing.how.step1_title', 'QR-i skan et'),    desc: t('landing.how.step1_desc', 'Masadakı QR kodu və ya yuxarıdan restoranı seç.') },
              { Icon: UtensilsCrossed, label: t('landing.how.step2_title', 'Menyuya bax'),     desc: t('landing.how.step2_desc', 'Şəkillər, qiymətlər, təfərrüatlar bir toxunuşda.') },
              { Icon: ShoppingBag,     label: t('landing.how.step3_title', 'Sifariş ver'),     desc: t('landing.how.step3_desc', 'Masada, yaxud evinə çatdırılma — seçim sənin.') },
              { Icon: Smile,           label: t('landing.how.step4_title', 'Ləzzət al'),       desc: t('landing.how.step4_desc', 'Real-vaxtda sifarişi izlə, yığcam və sürətli.') },
            ].map(({ Icon, label, desc }, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-3" data-testid={`landing-step-${i}`}>
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 grid place-items-center text-[#C05C3D] rotate-3 hover:rotate-0 transition-transform">
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-sm md:text-base">{label}</h3>
                <p className="text-xs text-stone-500 max-w-[180px]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FAQ (compact accordion) ========== */}
      <section className="py-14 md:py-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8" data-testid="landing-faq">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-center mb-8">
          {t('landing.faq.title', 'Tez-tez verilən suallar')}
        </h2>
        <div className="space-y-2">
          {['q1', 'q2', 'q3', 'q4', 'q5'].map((k, idx) => (
            <div
              key={k}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden transition-all"
              data-testid={`landing-faq-${k}`}
            >
              <button
                onClick={() => setOpenFaq(openFaq === k ? null : k)}
                className="w-full flex items-center justify-between gap-4 p-4 md:p-5 text-left hover:bg-gray-50/50"
              >
                <span className="font-semibold text-sm md:text-base text-[#1A251E]">
                  {t(`landing.faq.${k}_q`, `Sual ${idx + 1}`)}
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-stone-400 transition-transform ${openFaq === k ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === k && (
                <div className="px-4 md:px-5 pb-4 md:pb-5 text-sm text-stone-600 leading-relaxed">
                  {t(`landing.faq.${k}_a`, '...')}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========== PARTNER CTA (small, bottom) ========== */}
      <section className="max-w-3xl mx-auto px-4 mb-14" data-testid="landing-partner-cta">
        <div className="bg-gradient-to-r from-[#C05C3D]/10 to-[#F59E0B]/10 border border-[#C05C3D]/20 rounded-3xl p-8 sm:p-10 text-center">
          <Sparkles className="w-7 h-7 text-[#C05C3D] mx-auto mb-3" />
          <h3 className="text-xl md:text-2xl font-black mb-2">
            {t('landing.partners.become_title', 'Restoran sahibisiniz?')}
          </h3>
          <p className="text-sm text-stone-600 max-w-md mx-auto mb-5">
            {t('landing.partners.become_subtitle', 'Saytımıza qoşul, menyunu QR-siz təqdim et, yeni müştərilər qazan.')}
          </p>
          <button
            onClick={() => setShowRegister(true)}
            className="inline-flex items-center gap-2 bg-[#1A251E] text-white rounded-full px-6 py-3 font-semibold hover:bg-black transition-colors"
            data-testid="partner-cta-submit"
          >
            {t('landing.partners.become_cta', 'Bizimlə Partnyor Ol')} <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-[#1A251E] text-[#F4F5F2] pt-14 pb-8 px-4 sm:px-6 lg:px-8" data-testid="landing-footer">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C05C3D] to-[#E0402A] grid place-items-center text-white font-black text-sm">Q</div>
              <span className="font-black">QR Restoran</span>
            </div>
            <p className="text-stone-400 text-sm leading-relaxed">
              {t('landing.footer.about', 'Restoranlar üçün QR menyu, rezerv və çatdırılma platforması.')}
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-white text-sm">{t('landing.footer.links', 'Linklər')}</h4>
            <a href="#restaurants-grid" className="text-stone-400 hover:text-white transition-colors text-sm py-1 block">
              {t('landing.partners.title', 'Partnyor Restoranlar')}
            </a>
            <button onClick={() => setShowRegister(true)} className="text-stone-400 hover:text-white transition-colors text-sm py-1 block">
              {t('landing.partners.become_cta', 'Bizimlə Partnyor Ol')}
            </button>
            <button onClick={() => navigate('/login')} className="text-stone-400 hover:text-white transition-colors text-sm py-1 block">
              {t('common.login', 'Giriş')}
            </button>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-white text-sm">{t('landing.footer.contact', 'Əlaqə')}</h4>
            <p className="text-stone-400 text-sm py-1">Bakı, Azərbaycan</p>
            <p className="text-stone-400 text-sm py-1">hello@resto.az</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/10 pt-6 text-center text-xs text-stone-500">
          © {new Date().getFullYear()} QR Restoran · All rights reserved
        </div>
      </footer>

      {/* ========== CUSTOMER AUTH MODAL ========== */}
      <CustomerAuthModal open={showCustomerAuth} onClose={() => setShowCustomerAuth(false)} />

      {/* ========== RESTAURANT REGISTER MODAL ========== */}
      {showRegister && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowRegister(false)} data-testid="register-modal">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative bg-gradient-to-br from-[#C05C3D] to-[#E0402A] text-white p-6">
              <button onClick={() => setShowRegister(false)} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center" data-testid="register-close">
                <X size={16} />
              </button>
              <Sparkles className="w-7 h-7 mb-2" />
              <h2 className="text-xl font-black">{t('landing.register.title', 'Yeni Restoran Qeydiyyatı')}</h2>
              <p className="text-white/80 text-sm mt-1">{t('landing.partners.become_subtitle', 'Bizimlə qoşul və müştəri qazan')}</p>
            </div>
            <form onSubmit={handleRegister} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{t('landing.register.restaurant_name', 'Restoran Adı')}</label>
                <input type="text" value={regForm.restaurant_name} onChange={(e) => setRegForm({ ...regForm, restaurant_name: e.target.value })} className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:border-[#E0402A] focus:ring-1 focus:ring-[#E0402A] outline-none" placeholder="Mövlana Restaurant" required data-testid="register-restaurant-name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{t('landing.register.owner_name', 'Adınız')}</label>
                <input type="text" value={regForm.owner_name} onChange={(e) => setRegForm({ ...regForm, owner_name: e.target.value })} className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:border-[#E0402A] focus:ring-1 focus:ring-[#E0402A] outline-none" required data-testid="register-owner-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{t('landing.register.username', 'İstifadəçi')}</label>
                  <input type="text" value={regForm.username} onChange={(e) => setRegForm({ ...regForm, username: e.target.value })} className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:border-[#E0402A] focus:ring-1 focus:ring-[#E0402A] outline-none" required data-testid="register-username" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{t('landing.register.password', 'Şifrə')}</label>
                  <input type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:border-[#E0402A] focus:ring-1 focus:ring-[#E0402A] outline-none" required data-testid="register-password" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{t('customer_auth.phone_optional', 'Telefon')}</label>
                <div className="phone-input-wrapper mt-1">
                  <PhoneInput international defaultCountry="AZ" value={regForm.phone} onChange={(v) => setRegForm({ ...regForm, phone: v || '' })} placeholder="+994 50 123 45 67" data-testid="register-phone" />
                </div>
              </div>
              <button type="submit" disabled={regLoading} className="w-full bg-[#E0402A] hover:bg-[#C93622] text-white py-3.5 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2" data-testid="registration-form-submit">
                {regLoading ? '...' : <>{t('landing.register.submit', 'Qeydiyyatdan Keç')} <ArrowRight size={16} /></>}
              </button>
              <p className="text-xs text-stone-400 text-center pt-2">
                {t('landing.register.have_account', 'Hesabınız var?')}{' '}
                <button type="button" onClick={() => { setShowRegister(false); navigate('/login'); }} className="text-[#E0402A] font-semibold hover:underline">
                  {t('common.login', 'Giriş')}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
