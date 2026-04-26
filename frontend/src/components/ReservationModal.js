import { useState, useEffect } from 'react';
import axios from 'axios';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Calendar, Users, Clock, MessageSquare, Loader2, X, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/CustomerAuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

const TIME_SLOTS = [];
for (let h = 11; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

export default function ReservationModal({ open, onClose, restaurantId, restaurantName }) {
  const { customer, token } = useCustomerAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // reservation object on success

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    reservation_date: '',
    reservation_time: '19:00',
    guest_count: 2,
    special_requests: '',
  });

  // Pre-fill from customer profile
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
      setDone(null);
    }
  }, [open, customer]);

  // Default date = today
  useEffect(() => {
    if (open && !form.reservation_date) {
      const t = new Date();
      const ymd = t.toISOString().slice(0, 10);
      setForm((f) => ({ ...f, reservation_date: ymd }));
    }
  }, [open, form.reservation_date]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.reservation_date) {
      toast.error('Bütün vacib sahələri doldurun'); return;
    }
    setBusy(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API}/public/reservations`,
        { restaurant_id: restaurantId, ...form, guest_count: Number(form.guest_count) },
        { headers },
      );
      toast.success('Rezerv qəbul edildi!');
      setDone(res.data.reservation);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Rezerv xətası');
    } finally { setBusy(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      data-testid="reservation-modal"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center"
            data-testid="reservation-close"
          >
            <X size={16} />
          </button>
          <Calendar className="w-7 h-7 mb-2" />
          <h2 className="text-xl font-black">Rezerv Et</h2>
          <p className="text-white/80 text-sm mt-1">{restaurantName || 'Restorana yer ayırın'}</p>
        </div>

        {done ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 grid place-items-center">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black">Rezerv qəbul edildi!</h3>
            <div className="text-sm text-stone-600 space-y-1 bg-stone-50 rounded-xl p-4 text-left">
              <p><strong>Tarix:</strong> {done.reservation_date} · {done.reservation_time}</p>
              <p><strong>Qonaq sayı:</strong> {done.guest_count}</p>
              <p><strong>Status:</strong> <span className="text-amber-600 font-semibold">Gözləyir (təsdiq üçün)</span></p>
            </div>
            <p className="text-xs text-stone-500">Restoran sizinlə tezliklə əlaqə saxlayacaq.</p>
            <Button onClick={onClose} className="w-full bg-[#E0402A] hover:bg-[#C93622]">Bağla</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-4">
            <div>
              <Label className="flex items-center gap-1.5"><User size={13} /> Adınız *</Label>
              <Input
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                required
                data-testid="reservation-name"
              />
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
              <Input
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                data-testid="reservation-email"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1.5"><Calendar size={13} /> Tarix *</Label>
                <Input
                  type="date"
                  value={form.reservation_date}
                  onChange={(e) => setForm({ ...form, reservation_date: e.target.value })}
                  min={new Date().toISOString().slice(0, 10)}
                  required
                  data-testid="reservation-date"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Clock size={13} /> Saat *</Label>
                <select
                  value={form.reservation_time}
                  onChange={(e) => setForm({ ...form, reservation_time: e.target.value })}
                  className="w-full border border-stone-200 rounded-md px-3 h-10 text-sm bg-white"
                  required
                  data-testid="reservation-time"
                >
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5"><Users size={13} /> Qonaq sayı *</Label>
              <div className="grid grid-cols-7 gap-1.5 mt-1">
                {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, guest_count: n })}
                    className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                      Number(form.guest_count) === n
                        ? 'bg-[#1A251E] text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                    data-testid={`reservation-guests-${n}`}
                  >
                    {n}{n === 8 ? '+' : ''}
                  </button>
                ))}
              </div>
              {form.guest_count > 8 && (
                <Input
                  type="number"
                  min="9"
                  max="50"
                  value={form.guest_count}
                  onChange={(e) => setForm({ ...form, guest_count: Math.max(1, Number(e.target.value)) })}
                  className="mt-2"
                />
              )}
            </div>

            <div>
              <Label className="flex items-center gap-1.5"><MessageSquare size={13} /> Xüsusi istək (istəyə bağlı)</Label>
              <Textarea
                rows={2}
                value={form.special_requests}
                onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
                placeholder="Pəncərə yanı, ad günü tortu və s."
                data-testid="reservation-notes"
              />
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-[#E0402A] hover:bg-[#C93622] h-11 text-sm font-semibold"
              data-testid="reservation-submit"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Rezervi göndər
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
