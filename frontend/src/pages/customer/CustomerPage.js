import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Minus, ShoppingCart, Receipt, Search, Tag, X, Clock, Info, Percent, Bell, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function CustomerPage() {
  const { tableId } = useParams();
  const [session, setSession] = useState(null);
  const [table, setTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [totalBill, setTotalBill] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDiscounts, setActiveDiscounts] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [serviceChargePercentage, setServiceChargePercentage] = useState(0);
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [venueRules, setVenueRules] = useState([]);
  const [isSessionOwner, setIsSessionOwner] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [restaurantSettings, setRestaurantSettings] = useState({});

  const getDeviceId = () => {
    let id = localStorage.getItem('qr_device_id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
      localStorage.setItem('qr_device_id', id);
    }
    return id;
  };

  useEffect(() => {
    initSession();
    fetchMenu();
    fetchActiveDiscounts();
    fetchSettings();
  }, [tableId]);

  useEffect(() => {
    if (session) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setServiceChargePercentage(response.data.service_charge_percentage || 0);
      setRestaurantSettings(response.data);
    } catch {}
  };

  const fetchVenueRules = async (venueId) => {
    try {
      const response = await axios.get(`${API}/venues/${venueId}/order-rules`);
      setVenueRules(response.data || []);
    } catch {}
  };

  const callWaiter = async () => {
    if (callingWaiter) return;
    setCallingWaiter(true);
    try {
      await axios.post(`${API}/waiter-call/${tableId}`);
      toast.success('Ofisiant cagirildl!');
      setTimeout(() => setCallingWaiter(false), 30000);
    } catch {
      toast.error('Xeta bas verdi');
      setCallingWaiter(false);
    }
  };

  const estimatedServiceCharge = useMemo(() => {
    if (serviceChargePercentage <= 0 || totalBill <= 0) return 0;
    return Math.round(totalBill * (serviceChargePercentage / 100) * 100) / 100;
  }, [totalBill, serviceChargePercentage]);

  const estimatedGrandTotal = useMemo(() => {
    return Math.round((totalBill + estimatedServiceCharge) * 100) / 100;
  }, [totalBill, estimatedServiceCharge]);

  const initSession = async () => {
    try {
      const deviceId = getDeviceId();
      const response = await axios.post(`${API}/sessions/start/${tableId}`, { device_id: deviceId });
      setSession(response.data.session);
      setTable(response.data.table);
      setIsSessionOwner(response.data.is_session_owner !== false);
      if (response.data.table?.venue_id) {
        fetchVenueRules(response.data.table.venue_id);
      }
    } catch { toast.error('Xeta bas verdi'); }
    finally { setLoading(false); }
  };

  const fetchMenu = async () => {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/menu-items`)
      ]);
      setCategories(catsRes.data);
      setMenuItems(itemsRes.data.filter(item => item.is_available));
    } catch {}
  };

  const fetchActiveDiscounts = async () => {
    try {
      const response = await axios.get(`${API}/discounts/active`);
      setActiveDiscounts(response.data);
    } catch {}
  };

  const fetchOrders = async () => {
    if (!session) return;
    try {
      const response = await axios.get(`${API}/orders/session/${session.session_token}`);
      setOrders(response.data.orders);
      setTotalBill(response.data.total_bill);
    } catch {}
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} sebet elave edildi`);
  };

  const updateCartQuantity = (itemId, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter(i => i.id !== itemId);
      return prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i);
    });
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const menuItem = menuItems.find(m => m.id === item.id);
      const discount = menuItem?.discount_percentage || 0;
      const price = discount > 0 ? item.price * (1 - discount / 100) : item.price;
      return sum + (price * item.quantity);
    }, 0);
  };

  const getApplicableDiscount = () => {
    const subtotal = getCartTotal();
    return activeDiscounts
      .filter(d => subtotal >= (d.min_order_amount || 0))
      .sort((a, b) => b.value - a.value)[0] || null;
  };

  const calculateFinalTotal = () => {
    const subtotal = getCartTotal();
    const discount = getApplicableDiscount();
    if (!discount) return { subtotal, discountAmount: 0, total: subtotal, discount: null };
    let discountAmount = discount.discount_type === 'percentage'
      ? subtotal * (discount.value / 100)
      : Math.min(discount.value, subtotal);
    return { subtotal, discountAmount, total: subtotal - discountAmount, discount };
  };

  const placeOrder = async () => {
    if (cart.length === 0) { toast.error('Sebetiniz bosdur'); return; }
    try {
      const orderData = {
        session_token: session.session_token,
        items: cart.map(item => {
          const menuItem = menuItems.find(m => m.id === item.id);
          return {
            menu_item_id: item.id, name: item.name, price: item.price,
            quantity: item.quantity, discount_percentage: menuItem?.discount_percentage || 0
          };
        }),
        total_amount: getCartTotal()
      };
      await axios.post(`${API}/orders`, orderData);
      toast.success('Sifaris qebul edildi!');
      setCart([]);
      setShowCart(false);
      fetchOrders();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Xeta bas verdi';
      toast.error(msg);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const config = {
      pending: { cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', text: az.pending },
      preparing: { cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30', text: az.preparing },
      ready: { cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', text: az.ready },
      delivered: { cls: 'bg-sky-500/20 text-sky-300 border-sky-500/30', text: az.delivered }
    };
    const c = config[status] || config.pending;
    return <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${c.cls}`}>{c.text}</span>;
  };

  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const bgUrl = restaurantSettings?.menu_background_url;

  if (loading) return (
    <div className="min-h-screen flex justify-center items-center bg-[#1a1a2e]">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-400 border-t-transparent"></div>
    </div>
  );

  return (
    <div
      className="min-h-screen relative"
      style={{
        background: bgUrl
          ? `linear-gradient(to bottom, rgba(20,20,40,0.85), rgba(20,20,40,0.95)), url(${bgUrl}) center/cover fixed`
          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}
      data-testid="customer-page"
      role="main"
      aria-label="Musteri menyusu"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10" role="banner">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {restaurantSettings?.logo_url && (
                <img src={restaurantSettings.logo_url} alt="Logo" className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-400/50" />
              )}
              <div>
                <p className="text-[10px] text-amber-400/80 uppercase tracking-[0.2em] font-medium">Masa</p>
                <h1 className="text-lg font-bold text-white -mt-0.5">{table?.table_number}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={callWaiter}
                disabled={callingWaiter}
                className={`px-3.5 py-2 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-lg ${
                  callingWaiter
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30 animate-pulse'
                    : 'bg-amber-500 text-black active:scale-95 shadow-amber-500/30 hover:bg-amber-400'
                }`}
                data-testid="call-waiter-btn"
              >
                <Bell className="w-3.5 h-3.5" />
                {callingWaiter ? 'Cagirildi' : 'Ofitsiant Çağır'}
              </button>
              {orders.length > 0 && (
                <button
                  onClick={() => setShowOrders(!showOrders)}
                  className="relative px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold border border-emerald-400/50 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all active:scale-95"
                  data-testid="show-orders-btn"
                >
                  <Receipt className="w-4 h-4 inline mr-1.5" />
                  Sifarişlərim ({orders.length})
                  {estimatedGrandTotal > 0 && <span className="ml-1 text-emerald-100 font-bold">• {estimatedGrandTotal.toFixed(0)} AZN</span>}
                </button>
              )}
              {cartItemCount > 0 && (
                <button
                  onClick={() => setShowCart(!showCart)}
                  className="relative px-4 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold shadow-lg shadow-rose-500/40 hover:shadow-rose-500/60 transition-all active:scale-95"
                  data-testid="show-cart-btn"
                >
                  <ShoppingCart className="w-4 h-4 inline mr-1.5" />
                  Səbət ({cartItemCount})
                  <span className="ml-1 text-rose-100 font-bold">• {getCartTotal().toFixed(0)} AZN</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-32">
        {/* Non-owner warning */}
        {!isSessionOwner && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-3 mb-4 text-center backdrop-blur" data-testid="non-owner-warning">
            <p className="text-xs text-red-300 font-medium">Bu masa artiq basqa cihazdan idare olunur. Yalniz sifarislere baxa bilersiz.</p>
          </div>
        )}

        {/* Restaurant Name Banner */}
        {restaurantSettings?.name && (
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white/90 tracking-wide">{restaurantSettings.name}</h2>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Axtar..."
            className="pl-10 h-10 text-sm bg-white/10 border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:ring-amber-400/50 focus:border-amber-400/50"
            data-testid="menu-search"
            aria-label="Menyu axtarisi"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide" role="tablist" aria-label="Kateqoriyalar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'bg-white/10 text-white/70 border border-white/10 hover:bg-white/20'
            }`}
          >Hamisi</button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                  : 'bg-white/10 text-white/70 border border-white/10 hover:bg-white/20'
              }`}
            >{cat.name}</button>
          ))}
        </div>

        {/* Active Discount Banner */}
        {activeDiscounts.length > 0 && (
          <div className="mb-4 space-y-2">
            {activeDiscounts.map(d => (
              <div key={d.id} className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 backdrop-blur" data-testid={`discount-banner-${d.id}`}>
                <div className="w-8 h-8 bg-emerald-500/30 rounded-full flex items-center justify-center">
                  <Tag className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-emerald-300 truncate">{d.name}</p>
                  <p className="text-[11px] text-emerald-400/70">
                    {d.discount_type === 'percentage' ? `${d.value}% endirim` : `${d.value} AZN endirim`}
                    {d.min_order_amount > 0 && ` (min. ${d.min_order_amount} AZN)`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Menu Items Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map(item => {
            const hasDiscount = item.discount_percentage > 0;
            const discountedPrice = hasDiscount ? item.price * (1 - item.discount_percentage / 100) : item.price;
            const inCart = cart.find(c => c.id === item.id);

            return (
              <div
                key={item.id}
                className="bg-white/8 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden cursor-pointer hover:border-amber-400/40 transition-all group"
                onClick={() => setSelectedItem(item)}
                data-testid={`menu-item-${item.id}`}
              >
                {/* Image */}
                <div className="relative aspect-square bg-white/5 overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/10 to-rose-500/10">
                      <span className="text-4xl text-white/20 font-bold">{item.name?.charAt(0)}</span>
                    </div>
                  )}
                  {hasDiscount && (
                    <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg" data-testid={`item-discount-badge-${item.id}`}>
                      -{item.discount_percentage}%
                    </span>
                  )}
                  {inCart && (
                    <span className="absolute top-2 right-2 bg-amber-500 text-black text-[10px] w-6 h-6 rounded-full font-bold flex items-center justify-center shadow-lg">
                      {inCart.quantity}
                    </span>
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                  {item.description && (
                    <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[10px] line-through text-white/30">{item.price.toFixed(2)}</span>
                          <span className="text-sm font-bold text-amber-400">{discountedPrice.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-amber-400">{item.price.toFixed(2)} AZN</span>
                      )}
                    </div>
                    {isSessionOwner && (
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                        className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/30 hover:bg-amber-400 active:scale-90 transition-all"
                        data-testid={`add-to-cart-${item.id}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <p className="col-span-2 text-center text-sm text-white/40 py-12">Netice tapilmadi</p>
          )}
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center" onClick={() => setSelectedItem(null)}>
          <div
            className="w-full max-w-lg bg-[#1a1a2e]/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
            data-testid="item-detail-modal"
          >
            {/* Modal Image */}
            <div className="relative h-64 sm:h-72 bg-white/5 shrink-0">
              {selectedItem.image_url ? (
                <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-rose-500/20">
                  <span className="text-7xl text-white/20 font-bold">{selectedItem.name?.charAt(0)}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-transparent to-transparent" />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center border border-white/20"
                data-testid="close-item-modal"
              >
                <X className="w-5 h-5" />
              </button>
              {selectedItem.discount_percentage > 0 && (
                <div className="absolute top-4 left-4 bg-rose-500 text-white text-sm px-3 py-1.5 rounded-full font-bold shadow-lg">
                  -{selectedItem.discount_percentage}% ENDIRIM
                </div>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">{selectedItem.name}</h2>

              {selectedItem.description && (
                <p className="text-sm text-white/60 mb-4 leading-relaxed">{selectedItem.description}</p>
              )}

              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="text-sm text-white/50">{selectedItem.preparation_time || 15} deq hazirlanma</span>
              </div>

              {/* Price */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                {selectedItem.discount_percentage > 0 ? (
                  <div className="flex items-center gap-3">
                    <span className="text-lg line-through text-white/30">{selectedItem.price.toFixed(2)} AZN</span>
                    <span className="text-2xl font-bold text-amber-400">
                      {(selectedItem.price * (1 - selectedItem.discount_percentage / 100)).toFixed(2)} AZN
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-amber-400">{selectedItem.price.toFixed(2)} AZN</span>
                )}
              </div>

              {/* Quantity + Add to cart */}
              {isSessionOwner && (() => {
                const inCart = cart.find(c => c.id === selectedItem.id);
                return (
                  <div className="flex items-center gap-3">
                    {inCart && (
                      <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-2">
                        <button
                          onClick={() => updateCartQuantity(selectedItem.id, -1)}
                          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                          data-testid="modal-cart-minus"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-lg font-bold text-white w-6 text-center">{inCart.quantity}</span>
                        <button
                          onClick={() => addToCart(selectedItem)}
                          className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black hover:bg-amber-400"
                          data-testid="modal-cart-plus"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <Button
                      onClick={() => { addToCart(selectedItem); }}
                      className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-2xl text-sm font-bold shadow-lg shadow-amber-500/30"
                      data-testid="modal-add-to-cart"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {inCart ? 'Daha elave et' : 'Sebete elave et'}
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Orders Overlay */}
      {showOrders && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setShowOrders(false)}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-[#1a1a2e]/95 backdrop-blur-xl rounded-t-3xl overflow-y-auto border-t border-white/10" onClick={e => e.stopPropagation()} data-testid="orders-panel">
            <div className="sticky top-0 bg-[#1a1a2e]/95 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-white text-lg" data-testid="orders-panel-title">Sifarislerim</h2>
              <button onClick={() => setShowOrders(false)} data-testid="close-orders-btn"><X className="w-5 h-5 text-white/50" /></button>
            </div>
            <div className="p-5 space-y-4">
              {orders.length === 0 && (
                <p className="text-center text-sm text-white/40 py-8" data-testid="no-orders-msg">Hele sifaris yoxdur</p>
              )}
              {orders.map(order => (
                <div key={order.id} className="bg-white/5 border border-white/10 rounded-2xl p-4" data-testid={`order-card-${order.id}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white">#{order.order_number}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  {order.items.map((item, i) => {
                    const originalPrice = item.price * item.quantity;
                    const finalPrice = item.discounted_price != null ? item.discounted_price : originalPrice;
                    const hasItemDiscount = item.discount_percentage > 0;
                    return (
                      <div key={i} className="py-1.5">
                        <div className="flex justify-between text-sm text-white/70">
                          <span className="flex-1">{item.name} x{item.quantity}</span>
                          <div className="text-right">
                            {hasItemDiscount && (
                              <span className="line-through text-[11px] text-white/30 mr-2">{originalPrice.toFixed(2)}</span>
                            )}
                            <span className="font-semibold text-white">{finalPrice.toFixed(2)} AZN</span>
                          </div>
                        </div>
                        {hasItemDiscount && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Percent className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400 font-medium">Mehsul endirimi: -{item.discount_percentage}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {order.discount_amount > 0 && (
                    <div className="bg-emerald-500/10 rounded-xl px-3 py-2 mt-2 flex justify-between items-center border border-emerald-500/20">
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <Tag className="w-3 h-3" />
                        {order.discount_name || 'Kampaniya endirimi'} ({order.discount_type === 'percentage' ? `${order.discount_value}%` : `${order.discount_value} AZN`})
                      </span>
                      <span className="text-[11px] text-emerald-400 font-bold">-{order.discount_amount?.toFixed(2)} AZN</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10 mt-2">
                    <span>Cemi</span>
                    <span className="text-amber-400">{order.total_amount?.toFixed(2)} AZN</span>
                  </div>
                </div>
              ))}

              {/* Bill Summary */}
              {orders.length > 0 && (
                <div className="bg-gradient-to-br from-amber-500/20 to-rose-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3" data-testid="bill-summary">
                  <div className="flex justify-between text-sm text-white/70">
                    <span>Sifarisler cemi</span>
                    <span className="text-white">{totalBill.toFixed(2)} AZN</span>
                  </div>
                  {serviceChargePercentage > 0 && (
                    <div className="flex justify-between text-sm text-white/70">
                      <span className="flex items-center gap-1">
                        Servis haqqi ({serviceChargePercentage}%)
                        <Info className="w-3 h-3 opacity-50" />
                      </span>
                      <span className="text-white">+{estimatedServiceCharge.toFixed(2)} AZN</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between items-end">
                      <p className="text-[11px] text-white/40 uppercase tracking-wider">Texmini umumi hesab</p>
                      <p className="text-3xl font-bold text-amber-400" data-testid="grand-total">{estimatedGrandTotal.toFixed(2)} AZN</p>
                    </div>
                  </div>
                  {serviceChargePercentage > 0 && (
                    <p className="text-[10px] text-white/30 text-center">* Servis haqqi masa baglananda hesablanir</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Bottom Sheet */}
      {showCart && cart.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setShowCart(false)}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] bg-[#1a1a2e]/95 backdrop-blur-xl rounded-t-3xl overflow-y-auto border-t border-white/10" onClick={e => e.stopPropagation()} data-testid="cart-panel">
            <div className="sticky top-0 bg-[#1a1a2e]/95 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">Sebet ({cartItemCount})</h2>
              <button onClick={() => setShowCart(false)}><X className="w-5 h-5 text-white/50" /></button>
            </div>
            <div className="p-5 space-y-4">
              {cart.map(item => {
                const menuItem = menuItems.find(m => m.id === item.id);
                const hasDiscount = menuItem?.discount_percentage > 0;
                const unitPrice = hasDiscount ? item.price * (1 - menuItem.discount_percentage / 100) : item.price;
                return (
                  <div key={item.id} className="flex items-center justify-between" data-testid={`cart-item-${item.id}`}>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                      <p className="text-[11px] text-white/40">
                        {hasDiscount && <span className="text-emerald-400 mr-1">(-{menuItem.discount_percentage}%)</span>}
                        {unitPrice.toFixed(2)} AZN/eded
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateCartQuantity(item.id, -1)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold text-white w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, 1)} className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black hover:bg-amber-400">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold text-amber-400 w-16 text-right">{(unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Total Section */}
              {(() => {
                const calc = calculateFinalTotal();
                return (
                  <div className="border-t border-white/10 pt-4 space-y-3">
                    {calc.discount && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-2 text-emerald-400">
                        <Tag className="w-4 h-4 shrink-0" />
                        <div className="text-[12px]">
                          <span className="font-bold">{calc.discount.name}</span>
                          <span className="ml-1 opacity-70">({calc.discount.discount_type === 'percentage' ? `${calc.discount.value}%` : `${calc.discount.value} AZN`})</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-white/60">
                      <span>Ara cem</span>
                      <span className="text-white">{calc.subtotal.toFixed(2)} AZN</span>
                    </div>
                    {calc.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-400">
                        <span>Endirim</span>
                        <span>-{calc.discountAmount.toFixed(2)} AZN</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-white pt-2">
                      <span>Cemi</span>
                      <span className="text-amber-400">{calc.total.toFixed(2)} AZN</span>
                    </div>
                    {serviceChargePercentage > 0 && (
                      <p className="text-[10px] text-white/30 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {serviceChargePercentage}% servis haqqi masa baglananda elave olunacaq
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      {cartItemCount > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={placeOrder}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-2xl text-base font-bold flex items-center justify-between px-6 shadow-2xl shadow-amber-500/30"
              data-testid="place-order-button"
            >
              <span className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Sifaris ver ({cartItemCount})
              </span>
              <span>{getCartTotal().toFixed(2)} AZN</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
