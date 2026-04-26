import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Star, MapPin, Phone, Instagram, Facebook, MessageCircle, ExternalLink, Globe, Sparkles, Navigation, X } from 'lucide-react';
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

function PartnerDetailModal({ partner, onClose, onRated }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(0);
  const [chosen, setChosen] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    } catch {
      toast.error('Error');
    } finally {
      setSubmitting(false);
    }
  };

  const mapsHref = partner.latitude && partner.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${partner.latitude},${partner.longitude}`
    : (partner.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partner.address)}` : null);

  const mapEmbed = (partner.latitude && partner.longitude)
    ? `https://maps.google.com/maps?q=${partner.latitude},${partner.longitude}&z=15&output=embed`
    : (partner.address ? `https://maps.google.com/maps?q=${encodeURIComponent(partner.address)}&z=15&output=embed` : null);

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
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-[#E0402A] mt-0.5 shrink-0" />
                <span className="text-stone-700">{partner.address}</span>
              </div>
            )}
            {partner.phone && (
              <a href={`tel:${partner.phone}`} className="flex items-center gap-2 text-stone-700 hover:text-[#E0402A]">
                <Phone size={16} className="text-[#E0402A]" /> {partner.phone}
              </a>
            )}
          </div>

          {/* Socials */}
          <div className="flex items-center gap-2">
            {partner.instagram && (
              <a href={partner.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 grid place-items-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors" data-testid="partner-instagram">
                <Instagram size={16} />
              </a>
            )}
            {partner.facebook && (
              <a href={partner.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 grid place-items-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors" data-testid="partner-facebook">
                <Facebook size={16} />
              </a>
            )}
            {partner.whatsapp && (
              <a href={`https://wa.me/${(partner.whatsapp || '').replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="w-10 h-10 grid place-items-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors" data-testid="partner-whatsapp">
                <MessageCircle size={16} />
              </a>
            )}
            {partner.website && (
              <a href={partner.website} target="_blank" rel="noreferrer" className="w-10 h-10 grid place-items-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors" data-testid="partner-website">
                <Globe size={16} />
              </a>
            )}
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
            {partner.menu_table_id && (
              <a
                href={`/table/${partner.menu_table_id}`}
                className="inline-flex items-center gap-2 bg-[#E0402A] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#C93622] transition-colors"
                data-testid="partner-view-menu"
              >
                {t('landing.partners.view_menu')} <ExternalLink size={14} />
              </a>
            )}
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
        </div>
      </div>
    </div>
  );
}

function PartnerCard({ partner, featured = false, onOpen }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => onOpen(partner)}
      className={`group text-left relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        featured
          ? 'bg-gradient-to-br from-stone-900 to-stone-800 text-white border-stone-700 sm:col-span-2 lg:col-span-2'
          : 'bg-white border-stone-200'
      }`}
      data-testid={`partner-card-${partner.id}`}
    >
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
    </button>
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
