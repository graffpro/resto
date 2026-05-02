import { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Users, Utensils, Plus, Minus, Trash2, Search, Check,
  ShoppingBag, Loader2, Table2, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

/**
 * /waiter/take-order — Master Waiter order-entry screen.
 * Optimized for tablet: big tap targets, 2-column layout, 3 steps:
 *   1. Pick table
 *   2. Pick menu items (search + category filter)
 *   3. Review cart + submit
 */
export default function WaiterTakeOrderPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('table'); // table | menu | cart
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState({ categories: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      const [tRes, mRes] = await Promise.all([
        axios.get(`${API}/waiter/takable-tables`, { headers: authHeader }),
        axios.get(`${API}/waiter/menu`, { headers: authHeader }),
      ]);
      setTables(tRes.data || []);
      setMenu({
        categories: mRes.data?.categories || [],
        items: mRes.data?.items || [],
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Məlumatlar yüklənmədi');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  const addToCart = (item) => {
    setCart((c) => {
      const idx = c.findIndex((x) => x.menu_item_id === item.id);
      if (idx >= 0) return c.map((x, i) => i === idx ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };
  const decFromCart = (itemId) => {
    setCart((c) => c.map((x) => x.menu_item_id === itemId ? { ...x, quantity: x.quantity - 1 } : x).filter((x) => x.quantity > 0));
  };
  const qtyOf = (itemId) => cart.find((c) => c.menu_item_id === itemId)?.quantity || 0;
  const removeItem = (itemId) => setCart((c) => c.filter((x) => x.menu_item_id !== itemId));

  const filteredItems = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (menu.items || []).filter((it) => {
      if (activeCat !== 'all' && it.category_id !== activeCat) return false;
      if (!s) return true;
      return (it.name || '').toLowerCase().includes(s)
        || (it.description || '').toLowerCase().includes(s);
    });
  }, [menu.items, activeCat, search]);

  const cartCount = cart.reduce((s, x) => s + x.quantity, 0);
  const cartTotal = cart.reduce((s, x) => s + x.price * x.quantity, 0);

  const submit = async () => {
    if (!selectedTable) { toast.error('Masa seçin'); return; }
    if (cart.length === 0) { toast.error('Səbət boşdur'); return; }
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/waiter/take-order`,
        {
          table_id: selectedTable.id,
          items: cart.map((x) => ({ menu_item_id: x.menu_item_id, quantity: x.quantity })),
        },
        { headers: authHeader },
      );
      toast.success(`Masa ${selectedTable.table_number} — sifariş göndərildi! Mətbəxə düşdü.`);
      // Reset for next customer
      setCart([]);
      setSelectedTable(null);
      setStep('table');
      fetchInitial();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Xəta baş verdi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-stone-100 grid place-items-center">
      <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100 pb-28" data-testid="waiter-take-order-page">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {step !== 'table' ? (
            <button
              type="button"
              onClick={() => setStep(step === 'menu' ? 'table' : 'menu')}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center"
              data-testid="take-order-back"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <Link to="/waiter" className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center">
              <ArrowLeft size={18} />
            </Link>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">🎖 Master Ofitsiant</p>
            <h1 className="text-lg font-black truncate">
              {step === 'table' && 'Masa seçin'}
              {step === 'menu' && `Masa ${selectedTable?.table_number} · Menyu`}
              {step === 'cart' && `Masa ${selectedTable?.table_number} · Səbət`}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-80 uppercase tracking-wider">{user?.full_name || user?.username}</p>
            <button type="button" onClick={() => { logout(); navigate('/login'); }} className="text-[11px] underline opacity-90 hover:opacity-100">Çıxış</button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {/* STEP 1: Pick table */}
        {step === 'table' && (
          <div data-testid="step-pick-table">
            <p className="text-sm text-stone-600 mb-4">Sifariş götürmək istədiyiniz masanı seçin. Açıq sessiya varsa üzərində yaşıl işarə göstərilir.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {tables.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSelectedTable(t); setStep('menu'); }}
                  data-testid={`table-card-${t.table_number}`}
                  className={`relative p-5 rounded-2xl text-left border-2 transition-all active:scale-95 ${
                    t.has_active_session
                      ? 'bg-amber-50 border-amber-300 hover:bg-amber-100'
                      : 'bg-white border-stone-200 hover:border-emerald-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <Table2 className={t.has_active_session ? 'text-amber-600' : 'text-emerald-600'} size={20} />
                    {t.has_active_session && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">Aktiv</span>
                    )}
                  </div>
                  <p className="mt-3 text-3xl font-black text-stone-900 tabular-nums">#{t.table_number}</p>
                  <p className="text-xs text-stone-500 mt-1 truncate">
                    {t.venue_name || 'Məkan yoxdur'}
                    {t.capacity ? ` · ${t.capacity} nəfərlik` : ''}
                  </p>
                </button>
              ))}
              {tables.length === 0 && (
                <p className="col-span-full text-center text-stone-500 py-10">Masa tapılmadı.</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Menu */}
        {step === 'menu' && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6" data-testid="step-menu">
            <div>
              <div className="sticky top-16 z-20 bg-stone-100 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 pt-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <Input
                    placeholder="Yemək axtar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-11 h-12 rounded-2xl text-base"
                    data-testid="menu-search"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1">
                  <button type="button" onClick={() => setActiveCat('all')} className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold ${activeCat === 'all' ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200'}`} data-testid="cat-all">
                    Hamısı ({menu.items.length})
                  </button>
                  {menu.categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveCat(c.id)}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold ${activeCat === c.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200'}`}
                      data-testid={`cat-${c.id}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {filteredItems.map((it) => {
                  const q = qtyOf(it.id);
                  return (
                    <div key={it.id} className="bg-white rounded-2xl p-4 border border-stone-200 flex items-center gap-3" data-testid={`menu-item-${it.id}`}>
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-stone-100 grid place-items-center shrink-0">
                          <Utensils className="text-stone-400" size={20} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-stone-900 truncate">{it.name}</p>
                        <p className="text-xs text-stone-500 line-clamp-1">{it.description}</p>
                        <p className="text-emerald-700 font-black mt-0.5">{it.price} ₼</p>
                      </div>
                      {q > 0 ? (
                        <div className="flex items-center bg-emerald-600 rounded-full shadow-md">
                          <button type="button" onClick={() => decFromCart(it.id)} className="w-10 h-10 grid place-items-center text-white hover:bg-emerald-700 rounded-l-full" data-testid={`menu-minus-${it.id}`}>
                            <Minus size={18} strokeWidth={3} />
                          </button>
                          <span className="min-w-[2rem] text-center text-white font-black">{q}</span>
                          <button type="button" onClick={() => addToCart(it)} className="w-10 h-10 grid place-items-center text-white hover:bg-emerald-700 rounded-r-full" data-testid={`menu-plus-${it.id}`}>
                            <Plus size={18} strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => addToCart(it)} className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white grid place-items-center shrink-0 shadow-md" data-testid={`menu-add-${it.id}`}>
                          <Plus size={20} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {filteredItems.length === 0 && (
                  <p className="col-span-full text-center text-stone-500 py-10">Heç nə tapılmadı.</p>
                )}
              </div>
            </div>

            {/* Cart column (desktop) */}
            <aside className="hidden lg:block">
              <div className="sticky top-20 bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag size={18} className="text-emerald-600" />
                  <h3 className="font-black text-stone-900">Səbət ({cartCount})</h3>
                </div>
                <CartList cart={cart} addToCart={addToCart} decFromCart={decFromCart} removeItem={removeItem} />
                <div className="border-t border-stone-200 pt-3 mt-3">
                  <div className="flex justify-between items-baseline mb-3">
                    <span className="text-stone-600 font-medium">Cəmi:</span>
                    <span className="text-2xl font-black text-stone-900 tabular-nums">{cartTotal.toFixed(2)} ₼</span>
                  </div>
                  <Button
                    onClick={submit}
                    disabled={cart.length === 0 || submitting}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                    data-testid="submit-order-desktop"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} className="mr-2" /> Sifarişi göndər</>}
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* STEP 3: Cart review (mobile) */}
        {step === 'cart' && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-stone-200 p-4" data-testid="step-cart">
            <CartList cart={cart} addToCart={addToCart} decFromCart={decFromCart} removeItem={removeItem} />
            <div className="border-t border-stone-200 pt-3 mt-3">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-stone-600 font-medium">Cəmi:</span>
                <span className="text-2xl font-black text-stone-900 tabular-nums">{cartTotal.toFixed(2)} ₼</span>
              </div>
              <Button
                onClick={submit}
                disabled={cart.length === 0 || submitting}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                data-testid="submit-order-mobile"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} className="mr-2" /> Sifarişi göndər</>}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile cart FAB */}
      {step === 'menu' && cartCount > 0 && (
        <button
          type="button"
          onClick={() => setStep('cart')}
          className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white rounded-full shadow-2xl px-6 h-14 flex items-center gap-3 font-black hover:bg-emerald-700 z-40"
          data-testid="cart-fab"
        >
          <Users size={18} />
          <span>Səbət ({cartCount})</span>
          <span className="opacity-80">·</span>
          <span>{cartTotal.toFixed(2)} ₼</span>
        </button>
      )}
    </div>
  );
}

function CartList({ cart, addToCart, decFromCart, removeItem }) {
  if (cart.length === 0) {
    return <p className="text-center text-stone-500 py-8 text-sm">Səbət boşdur. Menyudan yemək əlavə edin.</p>;
  }
  return (
    <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
      {cart.map((it) => (
        <div key={it.menu_item_id} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200" data-testid={`cart-item-${it.menu_item_id}`}>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-stone-900 truncate">{it.name}</p>
            <p className="text-xs text-stone-600">{it.price} ₼ × {it.quantity} = <span className="font-bold text-emerald-700">{(it.price * it.quantity).toFixed(2)} ₼</span></p>
          </div>
          <div className="flex items-center bg-white border-2 border-emerald-300 rounded-full">
            <button type="button" onClick={() => decFromCart(it.menu_item_id)} className="w-9 h-9 grid place-items-center text-emerald-700 hover:bg-emerald-50 rounded-l-full">
              <Minus size={16} strokeWidth={3} />
            </button>
            <span className="min-w-[2rem] text-center text-stone-900 font-black">{it.quantity}</span>
            <button type="button" onClick={() => addToCart({ id: it.menu_item_id, name: it.name, price: it.price })} className="w-9 h-9 grid place-items-center text-white bg-emerald-600 hover:bg-emerald-700 rounded-r-full">
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
          <button type="button" onClick={() => removeItem(it.menu_item_id)} className="w-9 h-9 grid place-items-center text-stone-400 hover:text-red-600 rounded-full">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
