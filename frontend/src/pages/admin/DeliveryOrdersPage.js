import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Truck, Clock, ChefHat, Package, CheckCircle2, XCircle, Phone, MapPin,
  RefreshCw, Search, Filter, MessageSquare, User, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

function getStatusMeta(t) {
  return {
    pending:          { label: t('delivery_orders.status_pending'),          color: '#F59E0B', bg: 'bg-amber-50',    text: 'text-amber-800',    Icon: Clock },
    confirmed:        { label: t('delivery_orders.status_confirmed'),        color: '#0EA5E9', bg: 'bg-sky-50',      text: 'text-sky-800',      Icon: CheckCircle2 },
    preparing:        { label: t('delivery_orders.status_preparing'),        color: '#EC4899', bg: 'bg-pink-50',     text: 'text-pink-800',     Icon: ChefHat },
    out_for_delivery: { label: t('delivery_orders.status_out_for_delivery'), color: '#8B5CF6', bg: 'bg-violet-50',   text: 'text-violet-800',   Icon: Truck },
    delivered:        { label: t('delivery_orders.status_delivered'),        color: '#10B981', bg: 'bg-emerald-50',  text: 'text-emerald-800',  Icon: Package },
    cancelled:        { label: t('delivery_orders.status_cancelled'),        color: '#6B7280', bg: 'bg-stone-100',   text: 'text-stone-700',    Icon: XCircle },
  };
}

function getPaymentLabel(t) {
  return {
    cash: t('delivery.payment_cash'),
    card_on_delivery: t('delivery.payment_card_on_delivery'),
    online: 'Online',
  };
}

function relativeTime(iso, t) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return t('delivery_orders.ago_seconds', { n: Math.floor(diff) });
  if (diff < 3600) return t('delivery_orders.ago_minutes', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('delivery_orders.ago_hours', { n: Math.floor(diff / 3600) });
  return new Date(iso).toLocaleDateString();
}

export default function DeliveryOrdersPage() {
  const { t } = useTranslation();
  const STATUS_META = useMemo(() => getStatusMeta(t), [t]);
  const PAYMENT_LABEL = useMemo(() => getPaymentLabel(t), [t]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // active | all | delivered | cancelled
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/delivery-orders`, { headers: auth() });
      setOrders(res.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Yüklənmədi');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, 20000); // 20s auto-refresh
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter === 'active') list = list.filter((o) => !['delivered', 'cancelled'].includes(o.status));
    else if (filter === 'delivered') list = list.filter((o) => o.status === 'delivered');
    else if (filter === 'cancelled') list = list.filter((o) => o.status === 'cancelled');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').toLowerCase().includes(q) ||
        (o.delivery_address || '').toLowerCase().includes(q) ||
        o.id.includes(q)
      );
    }
    return list;
  }, [orders, filter, search]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.put(
        `${API}/admin/delivery-orders/${orderId}/status?new_status=${newStatus}`,
        {},
        { headers: auth() },
      );
      toast.success(`Status: ${STATUS_META[newStatus]?.label || newStatus}`);
      fetchOrders();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Error');
    }
  };

  const counts = useMemo(() => {
    const c = { active: 0, delivered: 0, cancelled: 0, all: orders.length };
    for (const o of orders) {
      if (['delivered', 'cancelled'].includes(o.status)) c[o.status]++;
      else c.active++;
    }
    return c;
  }, [orders]);

  return (
    <div className="space-y-5" data-testid="delivery-orders-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" /> {t('delivery_orders.title')}
          </h1>
          <p className="text-sm text-stone-600">{t('delivery_orders.subtitle')}</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> {t('delivery_orders.refresh')}
        </Button>
      </div>

      {/* FILTERS */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'active', label: `${t('delivery_orders.filter_active')} (${counts.active})` },
          { key: 'delivered', label: `${t('delivery_orders.filter_delivered')} (${counts.delivered})` },
          { key: 'cancelled', label: `${t('delivery_orders.filter_cancelled')} (${counts.cancelled})` },
          { key: 'all', label: `${t('delivery_orders.filter_all')} (${counts.all})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 h-9 rounded-full text-xs font-semibold transition-colors ${
              filter === f.key
                ? 'bg-[#1A251E] text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
            data-testid={`delivery-filter-${f.key}`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('delivery_orders.search_placeholder')}
            className="pl-8 h-9 text-sm"
            data-testid="delivery-search"
          />
        </div>
      </div>

      {/* LIST */}
      {loading && orders.length === 0 ? (
        <div className="text-center py-12 text-stone-500 text-sm">...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-500 text-sm rounded-2xl bg-white border-2 border-dashed border-stone-200">
          {t('delivery_orders.no_orders')}
        </div>
      ) : (
        <div className="space-y-3" data-testid="delivery-orders-list">
          {filtered.map((order) => {
            const meta = STATUS_META[order.status] || STATUS_META.pending;
            const Icon = meta.Icon;
            const isOpen = expanded === order.id;
            const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];

            return (
              <div
                key={order.id}
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden"
                data-testid={`delivery-order-${order.id}`}
              >
                <div className="p-4 flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${meta.bg} ${meta.text}`}
                    style={{ color: meta.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black truncate">#{order.id.slice(0, 8)}</p>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-stone-500">{relativeTime(order.created_at, t)}</span>
                    </div>
                    <p className="text-sm text-stone-700 mt-0.5 flex items-center gap-1.5">
                      <User size={12} /> {order.customer_name}
                      <a href={`tel:${order.customer_phone}`} className="text-stone-500 hover:text-[#E0402A]">
                        · {order.customer_phone}
                      </a>
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5 truncate">
                      <MapPin size={11} className="inline mr-1" /> {order.delivery_address}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-[#E0402A]">{order.total} ₼</p>
                    <p className="text-[10px] text-stone-500">
                      {PAYMENT_LABEL[order.payment_method] || order.payment_method}
                    </p>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900 inline-flex items-center gap-1"
                    data-testid={`delivery-toggle-${order.id}`}
                  >
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isOpen ? t('delivery_orders.hide') : t('delivery_orders.details')}
                  </button>

                  <div className="ml-auto flex flex-wrap gap-1.5">
                    {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(order.id, nextStatus)}
                        className="h-8 px-3 text-xs"
                        style={{ background: STATUS_META[nextStatus].color, color: 'white' }}
                        data-testid={`delivery-advance-${order.id}`}
                      >
                        → {STATUS_META[nextStatus].label}
                      </Button>
                    )}
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm(t('delivery_orders.cancel_confirm'))) updateStatus(order.id, 'cancelled');
                        }}
                        className="h-8 px-3 text-xs text-red-600 hover:bg-red-50 border-red-200"
                        data-testid={`delivery-cancel-${order.id}`}
                      >
                        {t('delivery_orders.cancel')}
                      </Button>
                    )}
                    <a
                      href={`https://wa.me/${(order.customer_phone || '').replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 px-3 inline-flex items-center gap-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageSquare size={12} /> WhatsApp
                    </a>
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="h-8 px-3 inline-flex items-center gap-1 text-xs font-semibold rounded-md bg-stone-100 text-stone-700 hover:bg-stone-200"
                    >
                      <Phone size={12} /> {t('reservation.phone_label')}
                    </a>
                  </div>
                </div>

                {/* EXPANDED DETAILS */}
                {isOpen && (
                  <div className="border-t border-stone-100 bg-stone-50 p-4 space-y-3 text-sm">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">{t('delivery_orders.items_label')}</p>
                      <ul className="space-y-1">
                        {order.items?.map((it, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>{it.quantity}× {it.name}</span>
                            <span className="text-stone-700 font-semibold">{(it.price * it.quantity).toFixed(2)} ₼</span>
                          </li>
                        ))}
                      </ul>
                      <div className="border-t border-stone-200 mt-2 pt-2 flex justify-between font-bold">
                        <span>{t('delivery_orders.total')}</span><span className="text-[#E0402A]">{order.total} ₼</span>
                      </div>
                    </div>
                    {order.address_notes && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">{t('delivery_orders.address_notes_label')}</p>
                        <p className="text-stone-700">{order.address_notes}</p>
                      </div>
                    )}
                    {order.notes && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">{t('delivery_orders.customer_notes_label')}</p>
                        <p className="text-stone-700">{order.notes}</p>
                      </div>
                    )}
                    {order.customer_email && (
                      <div className="text-stone-600">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{t('delivery_orders.email_label')}: </span>
                        {order.customer_email}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
