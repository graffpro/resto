import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, XCircle, Eye, Clock, ShoppingBag, Printer, Tag, Plus, Minus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ActiveTablesPage() {
  const [sessions, setSessions] = useState([]);
  const [closedSessions, setClosedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [billSummary, setBillSummary] = useState(null);  // For close session summary
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchClosedSessions();
    fetchMenuItems();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get(`${API}/menu-items`);
      setMenuItems(res.data);
    } catch (e) { /* silent */ }
  };

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API}/sessions/active`);
      setSessions(response.data);
      if (loading) setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchClosedSessions = async () => {
    try {
      const response = await axios.get(`${API}/sessions/history`);
      setClosedSessions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      setDetailsLoading(true);
      const response = await axios.get(`${API}/sessions/${sessionId}/details`);
      setSessionDetails(response.data);
    } catch (error) {
      toast.error('Detallar yüklənmədi');
    } finally {
      setDetailsLoading(false);
    }
  };

  const openDetails = (session, isActive = false) => {
    setSelectedSession({ ...session, is_active: isActive });
    fetchSessionDetails(session.id);
  };

  const closeSession = async (sessionId) => {
    if (!window.confirm('Hesabı bağlamaq istədiyinizə əminsiniz?')) return;
    try {
      console.log('Closing session:', sessionId);
      const response = await axios.post(`${API}/sessions/close/${sessionId}`);
      console.log('Close response:', response.data);
      // Show detailed bill summary
      if (response.data.bill_summary) {
        setBillSummary(response.data.bill_summary);
      }
      toast.success('Hesab bağlandı');
      fetchSessions();
      fetchClosedSessions();
    } catch (error) {
      console.error('Close session error:', error);
      toast.error(error.response?.data?.detail || 'Xəta baş verdi');
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = new Date() - new Date(dateStr);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} ${az.minutes}`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ${az.hours}`;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Gözləyir';
      case 'preparing': return 'Hazırlanır';
      case 'ready': return 'Hazırdır';
      case 'delivered': return 'Çatdırıldı';
      case 'completed': return 'Tamamlandı';
      default: return status;
    }
  };

  const startEditOrder = (order) => {
    setEditingOrder(order);
    setEditItems(order.items.map(item => ({ ...item })));
    setShowAddItem(false);
  };

  const updateItemQty = (idx, delta) => {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const removeEditItem = (idx) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addMenuItemToOrder = (menuItem) => {
    const existing = editItems.findIndex(i => i.name === menuItem.name);
    if (existing >= 0) {
      setEditItems(prev => prev.map((item, i) => i === existing ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setEditItems(prev => [...prev, { name: menuItem.name, price: menuItem.price, quantity: 1, menu_item_id: menuItem.id }]);
    }
    setShowAddItem(false);
  };

  const saveOrderEdit = async () => {
    if (editItems.length === 0) {
      toast.error('Sifarişdə ən azı 1 məhsul olmalıdır');
      return;
    }
    try {
      const totalAmount = editItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      await axios.put(`${API}/orders/${editingOrder.id}`, { items: editItems, total_amount: totalAmount });
      toast.success('Sifariş yeniləndi');
      setEditingOrder(null);
      fetchSessionDetails(selectedSession.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xəta baş verdi');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent"></div></div>;
  }

  const displaySessions = showClosed ? closedSessions : sessions.map(s => ({ ...s, isActive: true }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">{az.activeTables}</h1>
          <p className="text-xs text-[#8A948D] mt-0.5">{sessions.length} aktiv stol</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={!showClosed ? 'default' : 'outline'}
            onClick={() => setShowClosed(false)}
            className={`text-xs h-8 rounded-xl ${!showClosed ? 'bg-[#2A3A2C] hover:bg-[#1A251E] text-white' : 'border-[#E6E5DF]'}`}
          >
            Aktiv ({sessions.length})
          </Button>
          <Button
            variant={showClosed ? 'default' : 'outline'}
            onClick={() => setShowClosed(true)}
            className={`text-xs h-8 rounded-xl ${showClosed ? 'bg-[#2A3A2C] hover:bg-[#1A251E] text-white' : 'border-[#E6E5DF]'}`}
          >
            Bağlanmış ({closedSessions.length})
          </Button>
          <Button onClick={fetchSessions} variant="outline" className="h-8 text-xs rounded-xl border-[#E6E5DF]">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Yenilə
          </Button>
        </div>
      </div>

      {displaySessions.length === 0 ? (
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-12 text-center">
          <p className="text-sm text-[#8A948D]">
            {showClosed ? 'Bağlanmış stol yoxdur' : 'Hazırda aktiv stol yoxdur'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displaySessions.map((item) => {
            const session = item.session || item;
            const table = item.table;
            const venue = item.venue;
            const active_orders = item.active_orders || item.orders_count || 0;
            const isActive = item.isActive || session.is_active;
            
            return (
              <div 
                key={session.id} 
                className={`bg-white border rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(42,58,44,0.06)] hover:-translate-y-0.5 ${
                  isActive ? 'border-[#3E6A4B]/30' : 'border-[#E6E5DF] cursor-pointer'
                }`}
                onClick={() => !isActive && openDetails(session, isActive)}
                data-testid={`session-card-${session.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="heading-font text-base font-semibold text-[#181C1A]">
                    Stol {table?.table_number}
                  </h3>
                  <Badge className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${isActive ? 'bg-[#3E6A4B]/10 text-[#3E6A4B]' : 'bg-[#8A948D]/10 text-[#8A948D]'}`}>
                    {isActive ? 'Aktiv' : 'Bağlı'}
                  </Badge>
                </div>
                
                <div className="space-y-1.5 mb-4">
                  <p className="text-xs text-[#5C665F]">
                    <span className="text-[#8A948D]">Məkan:</span> {venue?.name}
                  </p>
                  <p className="text-xs text-[#5C665F]">
                    <span className="text-[#8A948D]">Vaxt:</span> {getTimeAgo(session.started_at)}
                  </p>
                  <p className="text-xs text-[#5C665F]">
                    <span className="text-[#8A948D]">Sifarişlər:</span> {active_orders}
                  </p>
                  {item.total_revenue !== undefined && (
                    <p className="text-sm font-semibold text-[#C05C3D]">
                      {item.total_revenue?.toFixed(2)} AZN
                    </p>
                  )}
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDetails(session, isActive);
                    }}
                    className="flex-1 h-8 text-xs rounded-xl border-[#E6E5DF]"
                    data-testid={`view-details-${session.id}`}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Detallara Bax
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => { setSelectedSession(null); setSessionDetails(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-lg font-medium text-[#181C1A] tracking-tight">
              Stol {sessionDetails?.table?.table_number} - Sifariş Detalları
            </DialogTitle>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A4D2E]"></div>
            </div>
          ) : sessionDetails ? (
            <div className="space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#F9F9F7] rounded-xl p-3 text-center border border-[#E6E5DF]">
                  <p className="text-[10px] text-[#8A948D] uppercase tracking-wider">Məkan</p>
                  <p className="text-sm font-medium text-[#181C1A] mt-1">{sessionDetails.venue?.name}</p>
                </div>
                <div className="bg-[#F9F9F7] rounded-xl p-3 text-center border border-[#E6E5DF]">
                  <p className="text-[10px] text-[#8A948D] uppercase tracking-wider">Sifariş</p>
                  <p className="text-sm font-medium text-[#181C1A] mt-1">{sessionDetails.orders?.length || 0}</p>
                </div>
                <div className="bg-[#F9F9F7] rounded-xl p-3 text-center border border-[#E6E5DF]">
                  <p className="text-[10px] text-[#8A948D] uppercase tracking-wider">Endirim</p>
                  <p className="text-sm font-medium text-[#3E6A4B] mt-1">
                    -{(sessionDetails.orders || []).reduce((s, o) => s + (o.discount_amount || 0), 0).toFixed(2)} AZN
                  </p>
                </div>
                <div className="bg-[#2A3A2C] rounded-xl p-3 text-center">
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Cəmi</p>
                  <p className="text-base font-bold text-white mt-1">{sessionDetails.total_amount?.toFixed(2)} AZN</p>
                </div>
              </div>

              {/* Orders */}
              {sessionDetails.orders && sessionDetails.orders.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#181C1A] flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#C05C3D]" />
                    Sifarişlər ({sessionDetails.orders.length})
                  </h3>
                  {sessionDetails.orders.map((order) => (
                    <div key={order.id} className="border border-[#E6E5DF] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#181C1A]">#{order.order_number}</span>
                          <Badge className={`text-[10px] rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        {selectedSession?.is_active && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => startEditOrder(order)} className="h-6 w-6 p-0 text-[#4A6B8C]" data-testid={`edit-order-${order.id}`}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={async () => {
                              if (window.confirm('Bu sifarişi silmək istəyirsiniz?')) {
                                try {
                                  await axios.delete(`${API}/orders/${order.id}`);
                                  toast.success('Sifariş silindi');
                                  fetchSessionDetails(selectedSession.id);
                                } catch { toast.error('Xəta'); }
                              }
                            }} className="h-6 w-6 p-0 text-[#B74134]" data-testid={`delete-order-${order.id}`}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1.5 mb-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <div className="flex-1">
                              <span className="text-[#5C665F]">{item.name} x{item.quantity}</span>
                              {item.discount_percentage > 0 && (
                                <span className="ml-1.5 text-[10px] text-[#3E6A4B] bg-[#3E6A4B]/10 px-1 py-0.5 rounded">-{item.discount_percentage}%</span>
                              )}
                            </div>
                            <div className="text-right">
                              {item.discount_percentage > 0 && (
                                <span className="text-[10px] text-[#8A948D] line-through mr-1">{(item.price * item.quantity).toFixed(2)}</span>
                              )}
                              <span className="font-medium text-[#181C1A]">
                                {(item.discounted_price || (item.price * item.quantity)).toFixed(2)} AZN
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Order level discount & service charge */}
                      <div className="space-y-1 mb-2">
                        {order.discount_amount > 0 && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-[#3E6A4B] flex items-center gap-1"><Tag className="w-3 h-3" />{order.discount_name || 'Endirim'} ({order.discount_value}{order.discount_type === 'percentage' ? '%' : ' AZN'})</span>
                            <span className="text-[#3E6A4B]">-{order.discount_amount?.toFixed(2)} AZN</span>
                          </div>
                        )}
                        {order.service_charge_amount > 0 && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-[#D48B30]">Xidmət haqqı ({order.service_charge_percentage}%)</span>
                            <span className="text-[#D48B30]">+{order.service_charge_amount?.toFixed(2)} AZN</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-[#E6E5DF]">
                        <div className="flex items-center gap-1.5 text-[10px] text-[#8A948D]">
                          <Clock className="w-3 h-3" />
                          {new Date(order.ordered_at).toLocaleTimeString('az-AZ')}
                        </div>
                        <span className="text-xs font-semibold text-[#C05C3D]">
                          {order.total_amount?.toFixed(2)} AZN
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-[#8A948D] py-4">Bu stolda hələ sifariş yoxdur</p>
              )}

              {/* Close Session Button - ONLY inside detail modal */}
              {selectedSession?.is_active && (
                <div className="flex justify-end pt-4 border-t border-[#E6E5DF]">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      closeSession(selectedSession.id);
                      setSelectedSession(null);
                      setSessionDetails(null);
                    }}
                    className="bg-[#B74134] hover:bg-red-700 text-white text-xs h-9 rounded-xl"
                    data-testid="close-session-in-modal"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    Hesabı Bağla
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Bill Summary Dialog - Shows when session is closed */}
      <Dialog open={!!billSummary} onOpenChange={() => setBillSummary(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-lg font-medium text-[#181C1A] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#C05C3D]" />
              Hesab Bağlandı - Stol {billSummary?.table?.table_number}
            </DialogTitle>
          </DialogHeader>
          
          {billSummary && (
            <div className="space-y-4 print:text-black" id="bill-to-print">
              {/* Header Info */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#F9F9F7] rounded-xl p-3 border border-[#E6E5DF]">
                  <p className="text-[10px] text-[#8A948D] uppercase">Məkan</p>
                  <p className="text-sm font-medium text-[#181C1A] mt-1">{billSummary.venue?.name}</p>
                </div>
                <div className="bg-[#F9F9F7] rounded-xl p-3 border border-[#E6E5DF]">
                  <p className="text-[10px] text-[#8A948D] uppercase">Sifariş</p>
                  <p className="text-sm font-medium text-[#181C1A] mt-1">{billSummary.orders_count}</p>
                </div>
                <div className="bg-[#F9F9F7] rounded-xl p-3 border border-[#E6E5DF]">
                  <p className="text-[10px] text-[#8A948D] uppercase">Bağlanma</p>
                  <p className="text-sm font-medium text-[#181C1A] mt-1">
                    {new Date(billSummary.closed_at).toLocaleTimeString('az-AZ')}
                  </p>
                </div>
              </div>

              {/* Orders Detail */}
              <div>
                <h3 className="font-bold text-[#181C1A] mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Sifariş Detalları
                </h3>
                <div className="space-y-3">
                  {billSummary.orders?.map((order, idx) => (
                    <div key={order.id || idx} className="border border-[#E2E8E2] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#E2E8E2]">
                        <span className="font-semibold text-[#181C1A]">#{order.order_number}</span>
                        <span className="text-sm text-[#5C6B61]">
                          {new Date(order.ordered_at).toLocaleTimeString('az-AZ')}
                        </span>
                      </div>
                      
                      {/* Items */}
                      <div className="space-y-2 mb-3">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span>{item.name} x{item.quantity}</span>
                              {item.discount_percentage > 0 && (
                                <Badge className="bg-red-100 text-red-700 text-xs">
                                  -{item.discount_percentage}%
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              {item.discount_percentage > 0 ? (
                                <>
                                  <span className="line-through text-gray-400 text-xs mr-1">
                                    {(item.price * item.quantity).toFixed(2)}
                                  </span>
                                  <span className="font-semibold text-red-600">
                                    {item.discounted_price?.toFixed(2)} AZN
                                  </span>
                                </>
                              ) : (
                                <span className="font-semibold">
                                  {(item.price * item.quantity).toFixed(2)} AZN
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order discount */}
                      {order.discount_amount > 0 && (
                        <div className="flex justify-between text-sm py-2 border-t border-dashed border-[#E2E8E2] text-green-700">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {order.discount_name} ({order.discount_type === 'percentage' ? `${order.discount_value}%` : `${order.discount_value} AZN`})
                          </span>
                          <span>-{order.discount_amount?.toFixed(2)} AZN</span>
                        </div>
                      )}

                      <div className="flex justify-between font-bold pt-2 border-t border-[#E2E8E2]">
                        <span>Sifariş Cəmi</span>
                        <span className="text-[#181C1A]">{order.total_amount?.toFixed(2)} AZN</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discounts Summary */}
              {billSummary.discounts_applied?.length > 0 && (
                <div className="bg-[#3E6A4B]/5 border border-[#3E6A4B]/20 rounded-xl p-3">
                  <h4 className="text-xs font-medium text-[#3E6A4B] mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Tətbiq Edilən Endirimlər
                  </h4>
                  <div className="space-y-1">
                    {billSummary.discounts_applied.map((disc, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-[#3E6A4B]">
                        <span>
                          {disc.item_name ? `${disc.item_name}` : disc.discount_name}
                          {' '}({disc.discount_type === 'percentage' ? `${disc.discount_value}%` : `${disc.discount_value} AZN`})
                        </span>
                        <span>-{disc.discount_amount?.toFixed(2)} AZN</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="bg-[#2A3A2C] text-white rounded-2xl p-5">
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Ara Cəm</span>
                    <span>{billSummary.subtotal?.toFixed(2)} AZN</span>
                  </div>
                  {billSummary.total_discount > 0 && (
                    <div className="flex justify-between text-sm text-green-300">
                      <span>Endirim</span>
                      <span>-{billSummary.total_discount?.toFixed(2)} AZN</span>
                    </div>
                  )}
                  {billSummary.total_service_charge > 0 && (
                    <div className="flex justify-between text-sm text-[#D48B30]">
                      <span>Xidmət haqqı</span>
                      <span>+{billSummary.total_service_charge?.toFixed(2)} AZN</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/20">
                  <span className="text-sm font-medium">YEKUN MƏBLƏĞ</span>
                  <span className="text-2xl font-bold">{billSummary.total_amount?.toFixed(2)} AZN</span>
                </div>
              </div>

              {/* Print Button */}
              <div className="flex justify-end gap-2 print:hidden">
                <Button variant="outline" onClick={() => setBillSummary(null)} className="rounded-xl text-xs">Bağla</Button>
                <Button onClick={() => window.print()} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl text-xs">
                  <Printer className="w-4 h-4 mr-2" /> Çap Et
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-base font-medium">
              Sifarişi Redaktə Et - #{editingOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#F9F9F7] rounded-xl p-2.5 border border-[#E6E5DF]">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#181C1A] truncate">{item.name}</p>
                  <p className="text-[10px] text-[#8A948D]">{item.price?.toFixed(2)} AZN / ədəd</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => updateItemQty(idx, -1)} className="h-7 w-7 p-0 rounded-lg" data-testid={`qty-minus-${idx}`}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
                  <Button variant="outline" size="sm" onClick={() => updateItemQty(idx, 1)} className="h-7 w-7 p-0 rounded-lg" data-testid={`qty-plus-${idx}`}>
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeEditItem(idx)} className="h-7 w-7 p-0 text-[#B74134]" data-testid={`remove-item-${idx}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            {!showAddItem ? (
              <Button variant="outline" size="sm" onClick={() => setShowAddItem(true)} className="w-full text-xs h-8 rounded-xl border-dashed border-[#C05C3D] text-[#C05C3D]" data-testid="add-item-to-order">
                <Plus className="w-3.5 h-3.5 mr-1" /> Məhsul əlavə et
              </Button>
            ) : (
              <div className="bg-white border border-[#E6E5DF] rounded-xl p-2 max-h-40 overflow-y-auto">
                {menuItems.length === 0 ? (
                  <p className="text-xs text-[#8A948D] text-center py-2">Menyu yüklənir...</p>
                ) : (
                  menuItems.map(mi => (
                    <button key={mi.id} onClick={() => addMenuItemToOrder(mi)} className="w-full flex justify-between items-center p-2 hover:bg-[#F9F9F7] rounded-lg transition-colors text-left" data-testid={`menu-item-add-${mi.id}`}>
                      <span className="text-xs text-[#181C1A]">{mi.name}</span>
                      <span className="text-[10px] text-[#C05C3D] font-medium">{mi.price?.toFixed(2)} AZN</span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-[#E6E5DF]">
              <span className="text-sm font-semibold text-[#181C1A]">
                Cəmi: {editItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)} AZN
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingOrder(null)} className="rounded-xl text-xs">Ləğv et</Button>
                <Button size="sm" onClick={saveOrderEdit} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl text-xs" data-testid="save-order-edit">Yadda saxla</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}