import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Star, MapPin, Phone, Instagram, Facebook, MessageCircle, ExternalLink, Globe, Sparkles, Navigation, X, Languages, Music2, Youtube, Send, Linkedin, Twitter, Link2, Info } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

function StarsDisplay({ value, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(value || 0) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function ReviewItem({ review, currentLang }) {
  const { t } = useTranslation();
  const [translated, setTranslated] = useState(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [busy, setBusy] = useState(false);

  const original = (review.comment || '').trim();
  const canTranslate = original.length > 0;

  const toggleTranslate = async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }
    if (translated) {
      setShowTranslated(true);
      return;
    }
    setBusy(true);
    try {
      const res = await axios.post(`${API}/translate`, {
        text: original,
        target_lang: currentLang,
      });
      setTranslated(res.data?.text || original);
      setShowTranslated(true);
    } catch {
      toast.error('Translation failed');
    } finally {
      setBusy(false);
    }
  };

  const displayed = showTranslated && translated ? translated : original;

  return (
    <div className="rounded-lg border border-stone-200 p-3 bg-white" data-testid={`partner-review-${review.id}`}>
      <div className="flex items-center justify-between mb-1">
        <StarsDisplay value={review.stars} size={13} />
        <span className="text-[10px] text-stone-400">
          {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
        </span>
      </div>
      {canTranslate ? (
        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap break-words">{displayed}</p>
      ) : (
        <p className="text-xs text-stone-400 italic">—</p>
      )}
      {canTranslate && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTranslate}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-[#E0402A] disabled:opacity-50 transition-colors"
            data-testid={`partner-review-translate-${review.id}`}
          >
            <Languages size={12} />
            {busy ? '...' : (showTranslated ? t('landing.partners.original') : t('landing.partners.translate'))}
          </button>
          {showTranslated && translated && (
            <span className="text-[10px] uppercase tracking-wider text-stone-400">→ {currentLang}</span>
          )}
        </div>
      )}
    </div>
  );
}

function PartnerDetailModal({ partner, onClose, onRated }) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'az').split('-')[0];
  const [hover, setHover] = useState(0);
  const [chosen, setChosen] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const loadReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await axios.get(`${API}/partner-restaurants/${partner.id}/ratings?limit=50`);
      setReviews(res.data || []);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner.id]);

  const submitRating = async () => {
    if (!chosen) {
      toast.error(t('landing.partners.rate_now'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/partner-restaurants/${partner.id}/rate`, { stars: chosen, comment });
      toast.success('✓');
      setChosen(0);
      setComment('');
      onRated?.(res.data);
      // Prepend new review to the list optimistically
      if (res.data?.rating) {
        setReviews((list) => [res.data.rating, ...list]);
      } else {
        loadReviews();
      }
    } catch {
      toast.error('Error');
    } finally {
      setSubmitting(false);
    }
  };

  // If address is a Google Maps URL, prefer it directly for both the "open" link and embed.
  const addressIsUrl = typeof partner.address === 'string' && partner.address.startsWith('http');
  const mapsHref = partner.latitude && partner.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${partner.latitude},${partner.longitude}`
    : (partner.address ? (addressIsUrl ? partner.address : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partner.address)}`) : null);

  const mapEmbed = (partner.latitude && partner.longitude)
    ? `https://maps.google.com/maps?q=${partner.latitude},${partner.longitude}&z=15&output=embed`
    : (partner.address && !addressIsUrl ? `https://maps.google.com/maps?q=${encodeURIComponent(partner.address)}&z=15&output=embed` : null);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="partner-detail-modal"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / cover */}
        <div className="relative h-44 bg-gradient-to-br from-stone-800 to-stone-900">
          {partner.cover_url && (
            <img src={partner.cover_url} alt="" className="w-full h-full object-cover opacity-90" />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white grid place-items-center hover:bg-black/70"
            data-testid="partner-modal-close"
          >
            <X size={18} />
          </button>
          <div className="absolute -bottom-8 left-6 w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden grid place-items-center">
            {partner.logo_url ? (
              <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-stone-700">{partner.name?.[0]}</span>
            )}
          </div>
        </div>

        <div className="px-6 pt-12 pb-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-black tracking-tight">{partner.name}</h2>
              {partner.is_featured && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  <Sparkles size={10} /> {t('common.featured')}
                </span>
              )}
            </div>
            {partner.description && <p className="text-sm text-stone-600">{partner.description}</p>}
            <div className="flex items-center gap-3 mt-3">
              <StarsDisplay value={partner.rating_avg} />
              <span className="text-xs text-stone-500">
                {(partner.rating_avg || 0).toFixed(1)} · {t('landing.partners.ratings_count', { count: partner.ratings_count || 0 })}
              </span>
            </div>
          </div>

          {/* Contact details */}
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {partner.address && (
              partner.address.startsWith('http') ? (
                <a
                  href={partner.address}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2 text-stone-700 hover:text-[#E0402A]"
                  data-testid="partner-address-link"
                >
                  <MapPin size={16} className="text-[#E0402A] mt-0.5 shrink-0" />
                  <span className="underline truncate">{t('landing.partners.open_on_map', 'Xəritədə aç')}</span>
                </a>
              ) : (
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-[#E0402A] mt-0.5 shrink-0" />
                  <span className="text-stone-700">{partner.address}</span>
                </div>
              )
            )}
            {partner.phone && (
              <a href={`tel:${partner.phone}`} className="flex items-center gap-2 text-stone-700 hover:text-[#E0402A]">
                <Phone size={16} className="text-[#E0402A]" /> {partner.phone}
              </a>
            )}
          </div>

          {/* Socials */}
          <div className="flex items-center gap-2 flex-wrap">
            {(() => {
              const SOCIAL_ICONS = {
                instagram: Instagram,
                facebook: Facebook,
                tiktok: Music2,
                youtube: Youtube,
                x: Twitter,
                telegram: Send,
                linkedin: Linkedin,
                whatsapp: MessageCircle,
                website: Globe,
                other: Link2,
              };
              const dynamic = Array.isArray(partner.social_links) ? partner.social_links : [];
              // Build a deduped list: prefer dynamic; fall back to legacy single fields
              const seen = new Set(dynamic.map((s) => `${s.platform}::${s.url}`));
              const merged = [...dynamic];
              const pushLegacy = (platform, url) => {
                if (url && !seen.has(`${platform}::${url}`)) merged.push({ platform, url });
              };
              pushLegacy('instagram', partner.instagram);
              pushLegacy('facebook', partner.facebook);
              pushLegacy('whatsapp', partner.whatsapp);
              pushLegacy('website', partner.website);
              return merged
                .filter((s) => s && s.url)
                .map((s, i) => {
                  const Icon = SOCIAL_ICONS[s.platform] || Link2;
                  const href = s.platform === 'whatsapp'
                    ? `https://wa.me/${(s.url || '').replace(/[^\d]/g, '')}`
                    : s.url;
                  return (
                    <a
                      key={`${s.platform}-${i}`}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      title={s.label || s.platform}
                      className="w-10 h-10 grid place-items-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors"
                      data-testid={`partner-social-${s.platform}`}
                    >
                      <Icon size={16} />
                    </a>
                  );
                });
            })()}
          </div>

          {/* Map */}
          {mapEmbed && (
            <div className="rounded-xl overflow-hidden border border-stone-200">
              <iframe
                title="map"
                src={mapEmbed}
                className="w-full h-56"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/menu/${partner.restaurant_id}`}
              className="inline-flex items-center gap-2 bg-[#E0402A] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#C93622] transition-colors"
              data-testid="partner-view-menu"
            >
              {t('landing.partners.view_menu')} <ExternalLink size={14} />
            </Link>
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-stone-300 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-stone-50 transition-colors"
                data-testid="partner-directions"
              >
                {t('landing.partners.directions')} <Navigation size={14} />
              </a>
            )}
          </div>

          {/* Submit rating */}
          <div className="rounded-xl bg-stone-50 p-4 border border-stone-200">
            <p className="text-sm font-semibold text-stone-800 mb-2">{t('landing.partners.your_rating')}</p>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setChosen(s)}
                  data-testid={`partner-rate-star-${s}`}
                >
                  <Star
                    size={24}
                    className={`transition-transform ${(hover || chosen) >= s ? 'fill-amber-400 text-amber-400 scale-110' : 'text-stone-300'}`}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="..."
              className="w-full text-sm border border-stone-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#E0402A]/30"
              data-testid="partner-rating-comment"
            />
            <button
              type="button"
              onClick={submitRating}
              disabled={submitting || !chosen}
              className="mt-2 bg-stone-900 text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 hover:bg-stone-700"
              data-testid="partner-rating-submit"
            >
              {t('landing.partners.rate_now')}
            </button>
          </div>

          {/* Existing reviews list */}
          <div data-testid="partner-reviews-list">
            <p className="text-sm font-semibold text-stone-800 mb-3">
              {t('landing.partners.ratings_count', { count: partner.ratings_count || 0 })}
            </p>
            {loadingReviews ? (
              <div className="space-y-2">
                <div className="h-12 rounded-lg bg-stone-100 animate-pulse" />
                <div className="h-12 rounded-lg bg-stone-100 animate-pulse" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-stone-500 italic">—</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {reviews.map((r) => (
                  <ReviewItem key={r.id} review={r} currentLang={currentLang} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerCard({ partner, featured = false, onOpen }) {
  const { t } = useTranslation();
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        featured
          ? 'bg-gradient-to-br from-stone-900 to-stone-800 text-white border-stone-700 sm:col-span-2 lg:col-span-2'
          : 'bg-white border-stone-200'
      }`}
      data-testid={`partner-card-${partner.id}`}
    >
      {/* Click-anywhere → public menu (does NOT occupy a table) */}
      <Link
        to={`/menu/${partner.restaurant_id}`}
        className="absolute inset-0 z-10"
        aria-label={`${partner.name} menyusu`}
        data-testid={`partner-card-link-${partner.id}`}
      />
      {/* Info button — opens detail modal with rating/reviews/map */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(partner); }}
        className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-stone-800 grid place-items-center shadow-md backdrop-blur transition-transform hover:scale-110"
        aria-label="Ətraflı məlumat"
        data-testid={`partner-card-info-${partner.id}`}
      >
        <Info size={16} />
      </button>
      <div className={`relative ${featured ? 'h-44' : 'h-32'} overflow-hidden`}>
        {partner.cover_url ? (
          <img src={partner.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200" />
        )}
        {featured && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-400 text-amber-900">
            <Sparkles size={10} /> {t('common.featured')}
          </span>
        )}
        {partner.distance_km !== undefined && (
          <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-white/90 text-stone-800">
            {partner.distance_km} km
          </span>
        )}
      </div>

      <div className="p-5 flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl shrink-0 overflow-hidden grid place-items-center ${featured ? 'bg-white' : 'bg-stone-100'}`}>
          {partner.logo_url ? (
            <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-black text-stone-700">{partner.name?.[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold tracking-tight truncate ${featured ? 'text-xl' : 'text-base'}`}>{partner.name}</h3>
          {partner.address && (
            <p className={`text-xs truncate flex items-center gap-1 ${featured ? 'text-stone-300' : 'text-stone-500'}`}>
              <MapPin size={12} /> {partner.address}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <StarsDisplay value={partner.rating_avg} size={12} />
            <span className={`text-[11px] ${featured ? 'text-stone-300' : 'text-stone-500'}`}>
              {(partner.rating_avg || 0).toFixed(1)} ({partner.ratings_count || 0})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartnersSection() {
  const { t } = useTranslation();
  const [partners, setPartners] = useState([]);
  const [filter, setFilter] = useState('all'); // all | featured | nearby
  const [coords, setCoords] = useState(null);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (mode = 'all', loc = null) => {
    setLoading(true);
    try {
      let url = `${API}/partner-restaurants`;
      const params = [];
      if (mode === 'featured') params.push('featured=true');
      if (mode === 'nearby' && loc) {
        params.push(`near_lat=${loc.lat}`);
        params.push(`near_lng=${loc.lng}`);
        params.push('radius_km=50');
      }
      if (params.length) url += '?' + params.join('&');
      const res = await axios.get(url);
      setPartners(res.data || []);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('all');
  }, []);

  const requestNearby = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(loc);
        setFilter('nearby');
        load('nearby', loc);
      },
      () => toast.error('Location denied')
    );
  };

  const handleFilter = (mode) => {
    if (mode === 'nearby') {
      requestNearby();
    } else {
      setFilter(mode);
      load(mode);
    }
  };

  const { featured, others } = useMemo(() => {
    const f = partners.filter((p) => p.is_featured);
    const o = partners.filter((p) => !p.is_featured);
    return { featured: f, others: o };
  }, [partners]);

  if (!loading && partners.length === 0 && filter === 'all') {
    return null; // hide entire section when no partners
  }

  return (
    <section id="partners" className="py-24 md:py-32 px-6 bg-stone-50" data-testid="partners-section">
      <div className="max-w-7xl mx-auto">
        <p className="uppercase tracking-[0.2em] text-xs font-semibold text-gray-500 mb-3">
          {t('landing.partners.section_label')}
        </p>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">{t('landing.partners.title')}</h2>
            <p className="text-sm text-stone-600 mt-2 max-w-xl">{t('landing.partners.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="partners-filters">
            {[
              { k: 'all', label: t('landing.partners.filter_all') },
              { k: 'featured', label: t('landing.partners.filter_featured') },
              { k: 'nearby', label: t('landing.partners.filter_nearby') },
            ].map((b) => (
              <button
                key={b.k}
                onClick={() => handleFilter(b.k)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                  filter === b.k
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
                data-testid={`partners-filter-${b.k}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-white border border-stone-200 animate-pulse" />
            ))}
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-16 text-stone-500 text-sm">{t('landing.partners.no_partners')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="partners-grid">
            {featured.map((p) => (
              <PartnerCard key={p.id} partner={p} featured onOpen={setActive} />
            ))}
            {others.map((p) => (
              <PartnerCard key={p.id} partner={p} onOpen={setActive} />
            ))}
          </div>
        )}

        {/* Become a Partner CTA — for restaurant owners */}
        <div className="mt-12 sm:mt-16 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A251E] via-[#1A251E] to-[#0E1612] text-white p-6 sm:p-10 border border-white/10" data-testid="become-partner-cta">
          <div
            className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")",
            }}
          />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="flex-1">
              <p className="uppercase tracking-[0.2em] text-[11px] font-bold text-amber-400 mb-2">
                {t('landing.partners.become_label', 'Restoran sahibisiniz?')}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
                {t('landing.partners.become_title', 'Bizimlə Partnyor Ol')}
              </h3>
              <p className="text-sm sm:text-base text-stone-300 max-w-xl leading-relaxed">
                {t('landing.partners.become_subtitle', 'Restoranınızı saytımızda nümayiş etdirin, müştərilərə menyunuzu QR-siz təqdim edin və yeni gəlir mənbəyi yaradın. Qeydiyyat bir neçə dəqiqə çəkir.')}
              </p>
            </div>
            <a
              href="#cta-banner"
              onClick={(e) => {
                e.preventDefault();
                // Trigger the existing register modal at the parent
                window.dispatchEvent(new CustomEvent('open-restaurant-register'));
              }}
              className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#E0402A] hover:bg-[#C93622] text-white px-8 py-4 rounded-full text-sm font-bold transition-colors"
              data-testid="become-partner-cta-btn"
            >
              <Sparkles className="w-4 h-4" />
              {t('landing.partners.become_cta', 'Hələ də qoşulmamısan? Qoşul')}
            </a>
          </div>
        </div>
      </div>

      {active && (
        <PartnerDetailModal
          partner={active}
          onClose={() => setActive(null)}
          onRated={(data) => {
            setActive((cur) => cur ? { ...cur, rating_avg: data.rating_avg, ratings_count: data.ratings_count } : cur);
            setPartners((list) => list.map((p) => p.id === active.id ? { ...p, rating_avg: data.rating_avg, ratings_count: data.ratings_count } : p));
          }}
        />
      )}
    </section>
  );
}
