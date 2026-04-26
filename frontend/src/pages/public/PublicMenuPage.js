import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, MapPin, Phone, Star, Search, Sparkles, Info, Calendar, Truck, Navigation, ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

function StarsDisplay({ value, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(value || 0) ? 'fill-amber-400 text-amber-400' : 'text-white/30'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function PublicMenuPage() {
  const { restaurantId } = useParams();
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [iRes, cRes, mRes] = await Promise.all([
          axios.get(`${API}/public/restaurant/${restaurantId}`),
          axios.get(`${API}/categories`, { params: { restaurant_id: restaurantId } }),
          axios.get(`${API}/menu-items`, { params: { restaurant_id: restaurantId } }),
        ]);
        setInfo(iRes.data);
        setCategories(cRes.data || []);
        setItems((mRes.data || []).filter((it) => it.is_available !== false));
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Restoran tapılmadı');
      } finally { setLoading(false); }
    };
    fetchAll();
  }, [restaurantId]);

  const filtered = useMemo(() => {
    let list = items;
    if (activeCat !== 'all') list = list.filter((i) => i.category_id === activeCat);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, activeCat, search]);

  const grouped = useMemo(() => {
    if (activeCat !== 'all') return { _: filtered };
    const map = {};
    for (const cat of categories) map[cat.id] = [];
    for (const it of filtered) {
      if (!map[it.category_id]) map[it.category_id] = [];
      map[it.category_id].push(it);
    }
    return map;
  }, [filtered, categories, activeCat]);

  const partner = info?.partner;
  const restaurant = info?.restaurant;

  const mapsHref = partner?.address && partner.address.startsWith('http')
    ? partner.address
    : (partner?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partner.address)}` : null);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 grid place-items-center text-stone-400">
        <div className="text-sm">{t('common.loading', 'Yüklənir...')}</div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-stone-950 grid place-items-center text-stone-400 px-6 text-center">
        <div>
          <p className="text-lg font-bold text-white mb-2">Restoran tapılmadı</p>
          <p className="text-sm mb-6">Bu restoran public menyu üçün açılmayıb.</p>
          <Link to="/" className="text-amber-400 underline text-sm">Ana səhifəyə qayıt</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white" data-testid="public-menu-page">
      {/* HEADER with cover image */}
      <div className="relative">
        <div className="h-56 sm:h-72 relative overflow-hidden bg-gradient-to-br from-stone-800 to-stone-900">
          {partner?.cover_url && (
            <img src={partner.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-transparent" />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-black/40 backdrop-blur text-xs font-semibold hover:bg-black/60"
              data-testid="public-menu-back"
            >
              <ArrowLeft size={14} /> Geri
            </Link>
            <LanguageSwitcher variant="dark" />
          </div>
        </div>

        <div className="px-4 sm:px-6 -mt-12 relative">
          <div className="flex items-end gap-4 mb-3">
            <div className="w-20 h-20 rounded-2xl bg-stone-800 border-4 border-stone-950 overflow-hidden grid place-items-center shrink-0">
              {partner?.logo_url ? (
                <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black">{(partner?.name || restaurant?.name || '?').charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black truncate">{partner?.name || restaurant?.name}</h1>
                {partner?.is_featured && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                    <Sparkles size={10} /> Featured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-stone-300">
                <StarsDisplay value={partner?.rating_avg} size={12} />
                <span>{(partner?.rating_avg || 0).toFixed(1)} · {partner?.ratings_count || 0} rəy</span>
              </div>
            </div>
          </div>

          {partner?.description && (
            <p className="text-sm text-stone-300 mb-3">{partner.description}</p>
          )}

          {/* Quick action chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold"
                data-testid="public-menu-directions"
              >
                <Navigation size={13} /> {t('landing.partners.directions', 'Yol göstər')}
              </a>
            )}
            {partner?.phone && (
              <a
                href={`tel:${partner.phone}`}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold"
              >
                <Phone size={13} /> {partner.phone}
              </a>
            )}
            <button
              type="button"
              onClick={() => toast.info('Rezerv funksiyası tezliklə əlavə olunacaq', { duration: 4000 })}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 text-xs font-semibold"
              data-testid="public-menu-reserve"
            >
              <Calendar size={13} /> Rezerv et
            </button>
            <button
              type="button"
              onClick={() => toast.info('Çatdırılma tezliklə əlavə olunacaq', { duration: 4000 })}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25 text-xs font-semibold"
              data-testid="public-menu-delivery"
            >
              <Truck size={13} /> Çatdırılma
            </button>
            {partner?.menu_table_id && (
              <Link
                to={`/table/${partner.menu_table_id}`}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-[#E0402A] hover:bg-[#C93622] text-xs font-semibold"
                data-testid="public-menu-order"
              >
                <Info size={13} /> Restoranda sifariş ver
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH + CATEGORIES */}
      <div className="sticky top-0 z-30 bg-stone-950/95 backdrop-blur border-b border-white/10">
        <div className="px-4 sm:px-6 py-3 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Yeməklərdə axtar..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-stone-500 focus-visible:ring-amber-400"
              data-testid="public-menu-search"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            <button
              onClick={() => setActiveCat('all')}
              className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-colors ${
                activeCat === 'all' ? 'bg-amber-400 text-stone-900' : 'bg-white/5 text-stone-300 hover:bg-white/10'
              }`}
            >
              Hamısı
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-colors ${
                  activeCat === cat.id ? 'bg-amber-400 text-stone-900' : 'bg-white/5 text-stone-300 hover:bg-white/10'
                }`}
                data-testid={`public-menu-cat-${cat.id}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MENU LIST */}
      <div className="px-4 sm:px-6 py-5 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center text-stone-500 py-12 text-sm">Heç nə tapılmadı.</div>
        ) : activeCat === 'all' ? (
          categories
            .filter((cat) => grouped[cat.id]?.length > 0)
            .map((cat) => (
              <section key={cat.id} className="mb-7">
                <h2 className="text-lg font-black mb-3 text-stone-100">{cat.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grouped[cat.id].map((it) => (
                    <MenuItemCard key={it.id} item={it} onClick={() => setSelectedItem(it)} />
                  ))}
                </div>
              </section>
            ))
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((it) => (
              <MenuItemCard key={it.id} item={it} onClick={() => setSelectedItem(it)} />
            ))}
          </div>
        )}
      </div>

      {/* ITEM DETAIL MODAL */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full sm:max-w-md bg-stone-900 rounded-t-3xl sm:rounded-3xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedItem.image_url && (
              <div className="h-56 bg-stone-800 overflow-hidden">
                <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5 space-y-3">
              <h3 className="text-xl font-black">{selectedItem.name}</h3>
              {selectedItem.description && (
                <p className="text-sm text-stone-400 leading-relaxed">{selectedItem.description}</p>
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl font-black text-amber-400">{selectedItem.price} ₼</span>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedItem(null)}
                  className="text-stone-400 hover:text-white hover:bg-white/5"
                >
                  Bağla
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItemCard({ item, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/5 transition-all text-left"
      data-testid={`public-menu-item-${item.id}`}
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-stone-100 truncate">{item.name}</h4>
        {item.description && (
          <p className="text-xs text-stone-400 line-clamp-2 mt-0.5">{item.description}</p>
        )}
        <p className="text-amber-400 font-black mt-1.5">{item.price} ₼</p>
      </div>
      {item.image_url && (
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-800 shrink-0">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        </div>
      )}
      <ChevronRight size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-600 sm:hidden" />
    </button>
  );
}
