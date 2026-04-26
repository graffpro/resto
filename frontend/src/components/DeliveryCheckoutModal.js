import { useState, useEffect } from 'react';
import axios from 'axios';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Truck, MapPin, User, CreditCard, Loader2, X, Check, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/CustomerAuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

/**
 * Two-step delivery checkout modal:
 *   1. Cart review (qty +/-, remove)
 *   2. Delivery address + customer info + payment method
 * On submit → POST /api/public/delivery-orders → tracking confirmation screen.
 *
 * Props:
 *   open, onClose, restaurantId, restaurantName,
 *   cart: [{ menu_item_id, name, price, quantity }],
 *   setCart: (next) => void
 */
export default function DeliveryCheckoutModal({ open, onClose, restaurantId, restaurantName, cart, setCart }) {
  const { customer, token } = useCustomerAuth();
  const [step, setStep] = useState('cart'); // cart | details | done
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    address_notes: '',
    payment_method: 'cash',
    notes: '',
  });

  useEffect(() => {
    if (open && customer) {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || customer.name || '',
        customer_email: f.customer_email || customer.email || '',
        customer_phone: f.customer_phone || customer.phone || '',
      }));
    }
    if (!open) {
      setStep('cart'); setOrder(null);
    }
  }, [open, customer]);

  if (!open) return null;

  const subtotal = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const total = subtotal; // delivery fee = 0 for now (configurable later)

  const updateQty = (idx, delta) => {
    setCart(cart.map((it, i) => {
      if (i !== idx) return it;
      const next = it.quantity + delta;
      return next < 1 ? null : { ...it, quantity: next };
    }).filter(Boolean));
  };

  const removeItem = (idx) => setCart(cart.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) { toast.error('Səbət boşdur'); return; }
    if (!form.customer_name || !form.customer_phone || !form.delivery_address) {
      toast.error('Ad, telefon və ünvanı doldurun'); return;
    }
    setBusy(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API}/public/delivery-orders`,
        {
          restaurant_id: restaurantId,
          ...form,
          items: cart.map((it) => ({
            menu_item_id: it.menu_item_id,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
          })),
        },
        { headers },
      );
      setOrder(res.data.order);
      setCart([]); // clear cart
      setStep('done');
      toast.success('Sifariş qəbul edildi!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Sifariş xətası');
    } finally { setBusy(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      data-testid="delivery-modal"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6">
          <button type="button" onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center" data-testid="delivery-close">
            <X size={16} />
          </button>
          <Truck className="w-7 h-7 mb-2" />
          <h2 className="text-xl font-black">
            {step === 'cart' && 'Səbətim'}
            {step === 'details' && 'Çatdırılma məlumatları'}
            {step === 'done' && 'Sifariş qəbul edildi'}
          </h2>
          <p className="text-white/80 text-sm mt-1">{restaurantName}</p>
        </div>

        {step === 'cart' && (
          <div className="p-6">
            {cart.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-stone-500 text-sm mb-4">Səbətiniz boşdur. Menyudan yemək seçin.</p>
                <Button onClick={onClose} variant="outline">Menyuya qayıt</Button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-5">
                  {cart.map((it, idx) => (
                    <div key={`${it.menu_item_id}-${idx}`} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50" data-testid={`cart-item-${idx}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{it.name}</p>
                        <p className="text-xs text-stone-500">{it.price} ₼ × {it.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-white rounded-full border border-stone-200 px-1">
                        <button type="button" onClick={() => updateQty(idx, -1)} className="w-7 h-7 grid place-items-center hover:bg-stone-100 rounded-full" data-testid={`cart-qty-minus-${idx}`}>
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{it.quantity}</span>
                        <button type="button" onClick={() => updateQty(idx, 1)} className="w-7 h-7 grid place-items-center hover:bg-stone-100 rounded-full" data-testid={`cart-qty-plus-${idx}`}>
                          <Plus size={14} />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeItem(idx)} className="w-8 h-8 grid place-items-center text-stone-400 hover:text-red-600" data-testid={`cart-remove-${idx}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-stone-200 pt-4 mb-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-stone-600">
                    <span>Yeməklər</span><span>{subtotal.toFixed(2)} ₼</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Çatdırılma</span><span>Pulsuz</span>
                  </div>
                  <div className="flex justify-between text-base font-black pt-2 border-t border-stone-100">
                    <span>Cəmi</span><span className="text-[#E0402A]">{total.toFixed(2)} ₼</span>
                  </div>
                </div>
                <Button
                  onClick={() => setStep('details')}
                  className="w-full bg-[#E0402A] hover:bg-[#C93622] h-11 text-sm font-semibold"
                  data-testid="delivery-next"
                >
                  Davam et
                </Button>
              </>
            )}
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={submit} className="p-6 space-y-4">
            <div>
              <Label className="flex items-center gap-1.5"><User size={13} /> Ad *</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required data-testid="delivery-name" />
            </div>
            <div>
              <Label>Telefon *</Label>
              <div className="phone-input-wrapper mt-1">
                <PhoneInput
                  international
                  defaultCountry="AZ"
                  value={form.customer_phone}
                  onChange={(v) => setForm({ ...form, customer_phone: v || '' })}
                  placeholder="+994 50 123 45 67"
                />
              </div>
            </div>
            <div>
              <Label>Email (istəyə bağlı)</Label>
              <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} data-testid="delivery-email" />
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><MapPin size={13} /> Çatdırılma ünvanı *</Label>
              <Textarea
                rows={2}
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                placeholder="Bakı, Nizami küç. 9, mənzil 14"
                required
                data-testid="delivery-address"
              />
              <Input
                className="mt-2"
                value={form.address_notes}
                onChange={(e) => setForm({ ...form, address_notes: e.target.value })}
                placeholder="Zəng et / domofon kodu / qeyd"
                data-testid="delivery-address-notes"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1.5"><CreditCard size={13} /> Ödəniş</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { v: 'cash', label: 'Nağd' },
                  { v: 'card_on_delivery', label: 'Kuryerə kart' },
                ].map((p) => (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => setForm({ ...form, payment_method: p.v })}
                    className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
                      form.payment_method === p.v
                        ? 'bg-[#1A251E] text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                    data-testid={`delivery-payment-${p.v}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Online ödəniş tezliklə əlavə olunacaq</p>
            </div>

            <div>
              <Label>Sifariş qeydi (istəyə bağlı)</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Çatdırılma vaxtı / xüsusi istəklər" data-testid="delivery-notes" />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('cart')} className="flex-1">Geri</Button>
              <Button type="submit" disabled={busy} className="flex-1 bg-[#E0402A] hover:bg-[#C93622]" data-testid="delivery-submit">
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sifariş ver · {total.toFixed(2)} ₼
              </Button>
            </div>
          </form>
        )}

        {step === 'done' && order && (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 grid place-items-center">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black">Sifariş #{order.id.slice(0, 8)}</h3>
            <div className="text-sm text-stone-600 space-y-1 bg-stone-50 rounded-xl p-4 text-left">
              <p><strong>Cəmi:</strong> {order.total} ₼</p>
              <p><strong>Ünvan:</strong> {order.delivery_address}</p>
              <p><strong>Status:</strong> <span className="text-amber-600 font-semibold">Gözləyir (təsdiq üçün)</span></p>
            </div>
            <p className="text-xs text-stone-500">Restoran sifarişinizi qəbul edib təsdiqləyəcək. Statusu izləyə bilərsiniz.</p>
            <Button onClick={onClose} className="w-full bg-[#E0402A] hover:bg-[#C93622]">Bağla</Button>
          </div>
        )}
      </div>
    </div>
  );
}
