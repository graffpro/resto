import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Minus, ShoppingCart, Receipt, Search, Tag, ChevronDown, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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

  useEffect(() => {
    initSession();
    fetchMenu();
    fetchActiveDiscounts();
  }, [tableId]);

  useEffect(() => {
    if (session) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const initSession = async () => {
    try {
      const response = await axios.post(`${API}/sessions/start/${tableId}`);
      setSession(response.data.session);
      setTable(response.data.table);
    } catch { toast.error('Xəta baş verdi'); }
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
    if (cart.length === 0) { toast.error('Səbətiniz boşdur'); return; }
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
      toast.success('Sifariş qəbul edildi!');
      setCart([]);
      setShowCart(false);
      fetchOrders();
    } catch { toast.error('Xəta baş verdi'); }
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
      pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', text: az.pending, icon: '...' },
      preparing: { cls: 'bg-orange-50 text-orange-700 border-orange-200', text: az.preparing, icon: '...' },
      ready: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: az.ready, icon: '' },
      delivered: { cls: 'bg-sky-50 text-sky-700 border-sky-200', text: az.delivered, icon: '' }
    };
    const c = config[status] || config.pending;
    return <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${c.cls}`}>{c.icon} {c.text}</span>;
  };

  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (loading) return (
    <div className="min-h-screen flex justify-center items-center bg-[#FAFAF8]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#2A3A2C] border-t-transparent"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF8]" data-testid="customer-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E8E8E4]">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#8A948D] uppercase tracking-widest">Masa</p>
              <h1 className="text-lg font-bold text-[#181C1A] -mt-0.5">{table?.table_number}</h1>
            </div>
            <div className="flex items-center gap-2">
              {orders.length > 0 && (
                <button onClick={() => setShowOrders(!showOrders)} className="relative px-3 py-1.5 rounded-full bg-[#2A3A2C] text-white text-[10px] font-medium" data-testid="show-orders-btn">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {orders.length} sifariş
                  {totalBill > 0 && <span className="ml-1 opacity-70">({totalBill.toFixed(0)} AZN)</span>}
                </button>
              )}
              {cartItemCount > 0 && (
                <button onClick={() => setShowCart(!showCart)} className="relative p-2 rounded-full bg-[#C05C3D] text-white" data-testid="show-cart-btn">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-[#C05C3D] text-[10px] font-bold rounded-full flex items-center justify-center border border-[#C05C3D]">{cartItemCount}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-3 pb-32">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A948D]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Axtar..."
            className="pl-9 h-9 text-sm bg-white border-[#E8E8E4] rounded-xl"
            data-testid="menu-search"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              selectedCategory === 'all' ? 'bg-[#2A3A2C] text-white' : 'bg-white text-[#5C665F] border border-[#E8E8E4]'
            }`}
          >Hamısı</button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                selectedCategory === cat.id ? 'bg-[#2A3A2C] text-white' : 'bg-white text-[#5C665F] border border-[#E8E8E4]'
              }`}
            >{cat.name}</button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="space-y-2.5">
          {filteredItems.map(item => {
            const hasDiscount = item.discount_percentage > 0;
            const discountedPrice = hasDiscount ? item.price * (1 - item.discount_percentage / 100) : item.price;
            const inCart = cart.find(c => c.id === item.id);

            return (
              <div key={item.id} className="bg-white rounded-xl border border-[#E8E8E4] overflow-hidden flex" data-testid={`menu-item-${item.id}`}>
                {item.image_url ? (
                  <div className="w-24 h-24 shrink-0 bg-[#F5F5F3]">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                  </div>
                ) : (
                  <div className="w-16 h-24 shrink-0 bg-gradient-to-br from-[#E8E8E4] to-[#F5F5F3] flex items-center justify-center">
                    <span className="text-2xl opacity-30">
                      {item.name?.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-sm font-semibold text-[#181C1A] leading-tight truncate">{item.name}</h3>
                      {hasDiscount && (
                        <span className="shrink-0 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">-{item.discount_percentage}%</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[10px] text-[#8A948D] mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div>
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] line-through text-[#8A948D]">{item.price.toFixed(2)}</span>
                          <span className="text-sm font-bold text-red-600">{discountedPrice.toFixed(2)} AZN</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-[#181C1A]">{item.price.toFixed(2)} AZN</span>
                      )}
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="w-7 h-7 rounded-full border border-[#E8E8E4] flex items-center justify-center bg-white" data-testid={`cart-minus-${item.id}`}>
                          <Minus className="w-3 h-3 text-[#5C665F]" />
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{inCart.quantity}</span>
                        <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-full bg-[#C05C3D] flex items-center justify-center text-white" data-testid={`cart-plus-${item.id}`}>
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(item)} className="h-7 px-3 rounded-full bg-[#C05C3D] text-white text-[11px] font-medium flex items-center gap-1" data-testid={`add-to-cart-${item.id}`}>
                        <Plus className="w-3 h-3" /> Əlavə et
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <p className="text-center text-sm text-[#8A948D] py-8">Nəticə tapılmadı</p>
          )}
        </div>
      </div>

      {/* Orders Overlay */}
      {showOrders && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setShowOrders(false)}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-white rounded-t-3xl overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="orders-panel">
            <div className="sticky top-0 bg-white border-b border-[#E8E8E4] px-4 py-3 flex items-center justify-between">
              <h2 className="font-bold text-[#181C1A]">Sifarişlərim</h2>
              <button onClick={() => setShowOrders(false)}><X className="w-5 h-5 text-[#8A948D]" /></button>
            </div>
            <div className="p-4 space-y-3">
              {orders.map(order => (
                <div key={order.id} className="border border-[#E8E8E4] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#181C1A]">#{order.order_number}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-[#5C665F] py-0.5">
                      <span>{item.name} x{item.quantity}</span>
                      <span className="font-medium text-[#181C1A]">{(item.discounted_price || (item.price * item.quantity)).toFixed(2)} AZN</span>
                    </div>
                  ))}
                  {order.service_charge_amount > 0 && (
                    <div className="flex justify-between text-[10px] text-[#D48B30] pt-1 border-t border-dashed border-[#E8E8E4] mt-1">
                      <span>Xidmət haqqı ({order.service_charge_percentage}%)</span>
                      <span>+{order.service_charge_amount?.toFixed(2)} AZN</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold text-[#181C1A] pt-1.5 border-t border-[#E8E8E4] mt-1.5">
                    <span>Cəmi</span>
                    <span>{order.total_amount?.toFixed(2)} AZN</span>
                  </div>
                </div>
              ))}
              <div className="bg-[#2A3A2C] text-white rounded-xl p-4 text-center">
                <p className="text-xs text-white/60">Ümumi hesab</p>
                <p className="text-2xl font-bold">{totalBill.toFixed(2)} AZN</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Bottom Sheet */}
      {showCart && cart.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setShowCart(false)}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-white rounded-t-3xl overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="cart-panel">
            <div className="sticky top-0 bg-white border-b border-[#E8E8E4] px-4 py-3 flex items-center justify-between">
              <h2 className="font-bold text-[#181C1A]">Səbət ({cartItemCount})</h2>
              <button onClick={() => setShowCart(false)}><X className="w-5 h-5 text-[#8A948D]" /></button>
            </div>
            <div className="p-4 space-y-3">
              {cart.map(item => {
                const menuItem = menuItems.find(m => m.id === item.id);
                const hasDiscount = menuItem?.discount_percentage > 0;
                const unitPrice = hasDiscount ? item.price * (1 - menuItem.discount_percentage / 100) : item.price;
                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium text-[#181C1A] truncate">{item.name}</p>
                      <p className="text-[10px] text-[#8A948D]">{unitPrice.toFixed(2)} AZN/ədəd</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCartQuantity(item.id, -1)} className="w-7 h-7 rounded-full border border-[#E8E8E4] flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, 1)} className="w-7 h-7 rounded-full bg-[#C05C3D] flex items-center justify-center text-white">
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold text-[#181C1A] w-16 text-right">{(unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Total Section */}
              {(() => {
                const calc = calculateFinalTotal();
                return (
                  <div className="border-t border-[#E8E8E4] pt-3 space-y-2">
                    {calc.discount && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center gap-2 text-green-700">
                        <Tag className="w-3.5 h-3.5 shrink-0" />
                        <div className="text-[11px]">
                          <span className="font-semibold">{calc.discount.name}</span>
                          <span className="ml-1 opacity-70">({calc.discount.discount_type === 'percentage' ? `${calc.discount.value}%` : `${calc.discount.value} AZN`})</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-[#5C665F]">
                      <span>Ara cəm</span>
                      <span>{calc.subtotal.toFixed(2)} AZN</span>
                    </div>
                    {calc.discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Endirim</span>
                        <span>-{calc.discountAmount.toFixed(2)} AZN</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-[#181C1A] pt-1">
                      <span>Cəmi</span>
                      <span>{calc.total.toFixed(2)} AZN</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      {cartItemCount > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/90 backdrop-blur-md border-t border-[#E8E8E4]">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={cartItemCount > 0 ? placeOrder : undefined}
              className="w-full h-12 bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl text-sm font-semibold flex items-center justify-between px-5"
              data-testid="place-order-button"
            >
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Sifariş ver ({cartItemCount})
              </span>
              <span>{getCartTotal().toFixed(2)} AZN</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
