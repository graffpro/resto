import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { RefreshCw, XCircle, Eye, Clock, ShoppingBag, Printer, Tag, Plus, Minus, Pencil, Trash2, Timer, Coffee, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import az from '@/translations/az';
import { initAudio, playTimedServiceAlarm } from '@/utils/notifications';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
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
  const [timedServices, setTimedServices] = useState([]);
  const [showTimedDialog, setShowTimedDialog] = useState(false);
  const [timedForm, setTimedForm] = useState({ menu_item_id: '', interval_minutes: 45, notes: '' });
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [allTables, setAllTables] = useState([]);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [newOrderItems, setNewOrderItems] = useState([]);
  
  // Global timed services alert state
  const [allActiveTimedServices, setAllActiveTimedServices] = useState([]);
  const [alertedServiceIds, setAlertedServiceIds] = useState(new Set());
  const [alertingTableIds, setAlertingTableIds] = useState(new Set());
  const audioInitialized = useRef(false);

  useEffect(() => {
    fetchSessions();
    fetchClosedSessions();
    fetchMenuItems();
    fetchAllTables();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  // Poll all active timed services every 5 seconds for alerts
  const fetchAllActiveTimedServices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/timed-services/active`);
      setAllActiveTimedServices(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchAllActiveTimedServices();
    const interval = setInterval(fetchAllActiveTimedServices, 5000);
    return () => clearInterval(interval);
  }, [fetchAllActiveTimedServices]);

  // Check for due timed services and trigger alarm
  useEffect(() => {
    const now = new Date();
    const newAlertingTables = new Set();
    let shouldAlarm = false;

    allActiveTimedServices.forEach(svc => {
      if (!svc.is_active || !svc.next_serve_at) return;
      const nextServe = new Date(svc.next_serve_at);
      if (nextServe <= now) {
        newAlertingTables.add(svc.table_id);
        // Only alarm if not already alerted for this service
        if (!alertedServiceIds.has(svc.id)) {
          shouldAlarm = true;
          setAlertedServiceIds(prev => new Set([...prev, svc.id]));
        }
      }
    });

    setAlertingTableIds(newAlertingTables);

    if (shouldAlarm && audioInitialized.current) {
      playTimedServiceAlarm();
      // Repeat alarm every 8 seconds while there are due services
    }
  }, [allActiveTimedServices]);

  // Repeat alarm while there are alerting tables
  useEffect(() => {
    if (alertingTableIds.size === 0 || !audioInitialized.current) return;
    const alarmInterval = setInterval(() => {
      if (alertingTableIds.size > 0) {
        playTimedServiceAlarm();
      }
    }, 8000);
    return () => clearInterval(alarmInterval);
  }, [alertingTableIds]);

  // Init audio on first user interaction
  useEffect(() => {
    const handleClick = () => {
      if (!audioInitialized.current) {
        initAudio();
        audioInitialized.current = true;
      }
    };
    document.addEventListener('click', handleClick, { once: true });
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get(`${API}/menu-items`);
      setMenuItems(res.data);
    } catch (e) { /* silent */ }
  };

  const fetchAllTables = async () => {
    try {
      const res = await axios.get(`${API}/tables`);
      setAllTables(res.data);
    } catch { /* silent */ }
  };

  const fetchTimedServices = async (sessionId) => {
    try {
      const res = await axios.get(`${API}/timed-services?session_id=${sessionId}`);
      setTimedServices(res.data);
    } catch { /* silent */ }
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
    fetchTimedServices(session.id);
  };

  const closeSession = async (sessionId) => {
    if (!window.confirm('Hesabı bağlamaq istədiyinizə əminsiniz?')) return;
    try {
      const response = await axios.post(`${API}/sessions/close/${sessionId}`);
      if (response.data.bill_summary) {
        setBillSummary(response.data.bill_summary);
      }
      toast.success('Hesab bağlandı');
      setSelectedSession(null);
      fetchSessions();
      fetchClosedSessions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Xəta baş verdi');
    }
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Sessiyanı silmək istədiyinizə əminsiniz? Bütün əlaqəli sifarişlər də silinəcək.')) return;
    try {
      await axios.delete(`${API}/sessions/${sessionId}`);
      toast.success('Sessiya silindi');
      setSelectedSession(null);
      fetchSessions();
      fetchClosedSessions();
    } catch (error) {
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

  const addNewOrderItem = (menuItem) => {
    const existing = newOrderItems.findIndex(i => i.menu_item_id === menuItem.id);
    if (existing >= 0) {
      setNewOrderItems(prev => prev.map((item, i) => i === existing ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setNewOrderItems(prev => [...prev, { menu_item_id: menuItem.id, name: menuItem.name, price: menuItem.price, quantity: 1 }]);
    }
  };

  const submitNewOrder = async () => {
    if (newOrderItems.length === 0) {
      toast.error('Ən azı 1 məhsul seçin');
      return;
    }
    try {
      const totalAmount = newOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      await axios.post(`${API}/orders`, {
        session_token: selectedSession.session_token,
        items: newOrderItems,
        total_amount: totalAmount
      });
      toast.success('Sifariş yaradıldı!');
      setShowNewOrderDialog(false);
      setNewOrderItems([]);
      fetchSessionDetails(selectedSession.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xəta baş verdi');
    }
  };

  const createTimedService = async () => {
    if (!timedForm.menu_item_id) { toast.error('Menyu elementi seçin'); return; }
    try {
      await axios.post(`${API}/timed-services`, {
        table_id: sessionDetails?.table?.id,
        session_id: selectedSession?.id,
        menu_item_id: timedForm.menu_item_id,
        interval_minutes: parseInt(timedForm.interval_minutes) || 45,
        notes: timedForm.notes
      });
      toast.success('Vaxtlı xidmət əlavə edildi');
      setShowTimedDialog(false);
      setTimedForm({ menu_item_id: '', interval_minutes: 45, notes: '' });
      fetchTimedServices(selectedSession.id);
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta'); }
  };

  const deleteTimedService = async (svcId) => {
    try {
      await axios.delete(`${API}/timed-services/${svcId}`);
      toast.success('Vaxtlı xidmət silindi');
      fetchTimedServices(selectedSession.id);
      fetchAllActiveTimedServices();
    } catch { toast.error('Xəta'); }
  };

  const stopTimedService = async (svcId) => {
    try {
      await axios.put(`${API}/timed-services/${svcId}/stop`);
      toast.success('Vaxtlı xidmət dayandırıldı');
      setAlertedServiceIds(prev => {
        const next = new Set(prev);
        next.delete(svcId);
        return next;
      });
      fetchTimedServices(selectedSession.id);
      fetchAllActiveTimedServices();
    } catch { toast.error('Xəta'); }
  };

  const transferTable = async () => {
    if (!transferTargetId || !selectedSession) { toast.error('Masa seçin'); return; }
    try {
      const res = await axios.post(`${API}/sessions/transfer`, {
        session_id: selectedSession.id,
        new_table_id: transferTargetId
      });
      toast.success(res.data.message);
      setShowTransferDialog(false);
      setTransferTargetId('');
      setSelectedSession(null);
      setSessionDetails(null);
      fetchSessions();
      fetchAllTables();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Köçürmə xətası');
    }
  };

  const markTimedServiceServed = async (svcId) => {
    try {
      await axios.put(`${API}/timed-services/${svcId}/serve`);
      toast.success('Xidmət edildi kimi qeyd olundu');
      // Remove from alerted set so alarm stops
      setAlertedServiceIds(prev => {
        const next = new Set(prev);
        next.delete(svcId);
        return next;
      });
      fetchTimedServices(selectedSession.id);
      fetchAllActiveTimedServices();
    } catch { toast.error('Xəta'); }
  };

  const getTimedServiceStatus = (svc) => {
    if (!svc.is_active) return { label: 'Dayandırılıb', color: 'bg-gray-100 text-gray-600' };
    if (!svc.next_serve_at) return { label: 'Gözləyir', color: 'bg-yellow-100 text-yellow-700' };
    const next = new Date(svc.next_serve_at);
    const now = new Date();
    if (next <= now) return { label: 'Vaxtı çatıb!', color: 'bg-red-100 text-red-700 animate-pulse' };
    const mins = Math.round((next - now) / 60000);
    return { label: `${mins} dəq sonra`, color: 'bg-blue-100 text-blue-700' };
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

  // Group sessions by venue
  const groupedByVenue = displaySessions.reduce((acc, item) => {
    const venueName = item.venue?.name || 'Digər';
    if (!acc[venueName]) acc[venueName] = [];
    acc[venueName].push(item);
    return acc;
  }, {});
  const venueNames = Object.keys(groupedByVenue).sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">{az.activeTables}</h1>
          <p className="text-xs text-[#8A948D] mt-0.5">{sessions.length} aktiv masa</p>
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
            {showClosed ? 'Bağlanmış masa yoxdur' : 'Hazırda aktiv masa yoxdur'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {venueNames.map(venueName => (
            <div key={venueName}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#4F9D69]"></div>
                <h2 className="heading-font text-sm font-semibold text-[#181C1A]">{venueName}</h2>
                <Badge variant="outline" className="text-[10px] border-[#E6E5DF] text-[#8A948D]">{groupedByVenue[venueName].length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedByVenue[venueName].map((item) => {
                  const session = item.session || item;
                  const table = item.table;
                  const active_orders = item.active_orders || item.orders_count || 0;
                  const isActive = item.isActive || session.is_active;
                  const isAlerting = alertingTableIds.has(table?.id);
                  const alertingService = isAlerting ? allActiveTimedServices.find(s => s.table_id === table?.id && s.is_active && new Date(s.next_serve_at) <= new Date()) : null;
                  
                  return (
                    <div 
                      key={session.id} 
                      className={`border rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(42,58,44,0.06)] hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${
                        isAlerting
                          ? 'border-red-500 bg-red-50 shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                          : isActive ? 'bg-white border-[#3E6A4B]/30' : 'bg-white border-[#E6E5DF]'
                      }`}
                      style={isAlerting ? { animation: 'timedAlertPulse 1s ease-in-out infinite' } : {}}
                      onClick={() => openDetails(session, isActive)}
                      data-testid={`session-card-${session.id}`}
                    >
                      {/* Red flash overlay */}
                      {isAlerting && (
                        <div className="absolute inset-0 bg-red-500/10 pointer-events-none" style={{ animation: 'timedAlertFlash 1s ease-in-out infinite' }} />
                      )}
                      
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <h3 className="heading-font text-base font-semibold text-[#181C1A]">
                          Masa {table?.table_number}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          {isAlerting && (
                            <Badge className="bg-red-500 text-white text-[10px] rounded-full px-2 py-0.5 font-medium flex items-center gap-1" style={{ animation: 'timedAlertPulse 1s ease-in-out infinite' }}>
                              <Volume2 className="w-3 h-3" />
                              {alertingService?.menu_item_name}
                            </Badge>
                          )}
                          <Badge className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${isActive ? 'bg-[#3E6A4B]/10 text-[#3E6A4B]' : 'bg-[#8A948D]/10 text-[#8A948D]'}`}>
                            {isActive ? 'Aktiv' : 'Bağlı'}
                          </Badge>
                          {!isActive && (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} className="h-6 w-6 p-0 text-red-400 hover:text-red-600" data-testid={`delete-session-${session.id}`}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 mb-4 relative z-10">
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

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openDetails(session, isActive); }}
                        className={`w-full h-8 text-xs rounded-xl relative z-10 ${isAlerting ? 'border-red-400 text-red-600 bg-white' : 'border-[#E6E5DF]'}`}
                        data-testid={`view-details-${session.id}`}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        {isAlerting ? 'Xidmət vaxtı çatıb!' : 'Detallara Bax'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => { setSelectedSession(null); setSessionDetails(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-lg font-medium text-[#181C1A] tracking-tight">
              Masa {sessionDetails?.table?.table_number} - Sifariş Detalları
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

              {/* Device Lock Control */}
              {selectedSession?.is_active && selectedSession?.device_id && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div>
                    <p className="text-xs font-medium text-amber-800">Cihaz kilidi aktiv</p>
                    <p className="text-[10px] text-amber-600">Masa bir cihaza bağlıdır</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await axios.post(`${API}/sessions/${selectedSession.id}/unlock-device`);
                        toast.success('Cihaz kilidi açıldı');
                        fetchSessionDetails(selectedSession.id);
                      } catch { toast.error('Xəta'); }
                    }}
                    className="h-7 text-[10px] rounded-lg border-amber-500 text-amber-700"
                    data-testid="unlock-device-btn"
                  >
                    Kilidi Aç
                  </Button>
                </div>
              )}

              {/* Orders */}
              {sessionDetails.orders && sessionDetails.orders.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#181C1A] flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#C05C3D]" />
                      Sifarişlər ({sessionDetails.orders.length})
                    </h3>
                    {selectedSession?.is_active && (
                      <Button variant="outline" size="sm" onClick={() => { setShowNewOrderDialog(true); setNewOrderItems([]); }} className="h-7 text-[10px] rounded-lg border-[#C05C3D] text-[#C05C3D]" data-testid="add-new-order-btn">
                        <Plus className="w-3 h-3 mr-1" /> Yeni Sifariş
                      </Button>
                    )}
                  </div>
                  {sessionDetails.orders.map((order) => (
                    <div key={order.id} className="border border-[#E6E5DF] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-[#181C1A]">#{order.order_number}</span>
                          <Badge className={`text-[10px] rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          {order.source === 'waiter_manual' && (
                            <Badge className="text-[10px] rounded-full bg-emerald-600 text-white shadow-sm" data-testid={`order-master-waiter-${order.id}`}>
                              🎖 Master: {order.taken_by_name || 'ofitsiant'}
                            </Badge>
                          )}
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
                      
                      {/* Order level discount (no per-order service charge) */}
                      <div className="space-y-1 mb-2">
                        {order.discount_amount > 0 && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-[#3E6A4B] flex items-center gap-1"><Tag className="w-3 h-3" />{order.discount_name || 'Endirim'} ({order.discount_value}{order.discount_type === 'percentage' ? '%' : ' AZN'})</span>
                            <span className="text-[#3E6A4B]">-{order.discount_amount?.toFixed(2)} AZN</span>
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
                <div className="text-center py-4">
                  <p className="text-sm text-[#8A948D] mb-3">Bu masada hələ sifariş yoxdur</p>
                  {selectedSession?.is_active && (
                    <Button onClick={() => { setShowNewOrderDialog(true); setNewOrderItems([]); }} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white text-xs rounded-xl" data-testid="add-first-order-btn">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Sifariş Əlavə Et
                    </Button>
                  )}
                </div>
              )}

              {/* Timed Services */}
              {selectedSession?.is_active && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#181C1A] flex items-center gap-2">
                      <Timer className="w-4 h-4 text-[#D48B30]" />
                      Vaxtlı Xidmətlər
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setShowTimedDialog(true)} className="h-7 text-[10px] rounded-lg border-[#D48B30] text-[#D48B30]" data-testid="add-timed-service-btn">
                      <Plus className="w-3 h-3 mr-1" /> Vaxtlı Xidmət
                    </Button>
                  </div>
                  {timedServices.filter(s => s.is_active).length > 0 ? (
                    <div className="space-y-2">
                      {timedServices.filter(s => s.is_active).map(svc => {
                        const status = getTimedServiceStatus(svc);
                        return (
                          <div key={svc.id} className="flex items-center justify-between bg-[#F9F9F7] rounded-xl p-2.5 border border-[#E6E5DF]" data-testid={`timed-service-${svc.id}`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Coffee className="w-4 h-4 text-[#D48B30] shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-[#181C1A] truncate">{svc.menu_item_name}</p>
                                <p className="text-[10px] text-[#8A948D]">Hər {svc.interval_minutes} dəq | {svc.serve_count || 0}x verildi</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge className={`text-[9px] rounded-full ${status.color}`}>{status.label}</Badge>
                              <Button variant="outline" size="sm" onClick={() => markTimedServiceServed(svc.id)} className="h-6 px-2 text-[10px] rounded-lg border-[#4F9D69] text-[#4F9D69]" data-testid={`mark-served-${svc.id}`}>
                                Verildi
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => stopTimedService(svc.id)} className="h-6 px-2 text-[10px] rounded-lg border-[#8A948D] text-[#8A948D]" data-testid={`stop-timed-${svc.id}`}>
                                Yetərlidir
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteTimedService(svc.id)} className="h-6 w-6 p-0 text-red-500" data-testid={`delete-timed-${svc.id}`}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#8A948D] text-center py-2">Vaxtlı xidmət yoxdur. "Vaxtlı Xidmət" düyməsinə basın.</p>
                  )}
                </div>
              )}

              {/* Close Session Button - ONLY inside detail modal */}
              {selectedSession?.is_active && (
                <div className="flex justify-between items-center pt-4 border-t border-[#E6E5DF]">
                  <Button
                    variant="outline"
                    onClick={() => setShowTransferDialog(true)}
                    className="text-xs h-9 rounded-xl border-[#4F9D69] text-[#4F9D69]"
                    data-testid="transfer-table-btn"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Masa Dəyişdir
                  </Button>
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
              Hesab Bağlandı - Masa {billSummary?.table?.table_number}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#181C1A]">#{order.order_number}</span>
                          {order.source === 'waiter_manual' && (
                            <Badge className="text-[10px] rounded-full bg-emerald-600 text-white">
                              🎖 Master: {order.taken_by_name || 'ofitsiant'}
                            </Badge>
                          )}
                        </div>
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

      {/* New Order Dialog */}
      <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-base font-medium flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#C05C3D]" />
              Masaya Sifariş Əlavə Et
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {newOrderItems.length > 0 && (
              <div className="space-y-2">
                {newOrderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#F9F9F7] rounded-xl p-2.5 border border-[#E6E5DF]">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#181C1A] truncate">{item.name}</p>
                      <p className="text-[10px] text-[#8A948D]">{item.price?.toFixed(2)} AZN / ədəd</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setNewOrderItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))} className="h-7 w-7 p-0 rounded-lg">
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
                      <Button variant="outline" size="sm" onClick={() => setNewOrderItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it))} className="h-7 w-7 p-0 rounded-lg">
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setNewOrderItems(prev => prev.filter((_, i) => i !== idx))} className="h-7 w-7 p-0 text-[#B74134]">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-[#181C1A] mb-2">Menyudan seçin:</p>
              <div className="bg-white border border-[#E6E5DF] rounded-xl p-1 max-h-48 overflow-y-auto">
                {menuItems.length === 0 ? (
                  <p className="text-xs text-[#8A948D] text-center py-4">Menyu yüklənir...</p>
                ) : (
                  menuItems.map(mi => (
                    <button key={mi.id} onClick={() => addNewOrderItem(mi)} className="w-full flex justify-between items-center p-2.5 hover:bg-[#F9F9F7] rounded-lg transition-colors text-left" data-testid={`new-order-item-${mi.id}`}>
                      <span className="text-xs text-[#181C1A] font-medium">{mi.name}</span>
                      <span className="text-[11px] text-[#C05C3D] font-semibold">{mi.price?.toFixed(2)} AZN</span>
                    </button>
                  ))
                )}
              </div>
            </div>
            {newOrderItems.length > 0 && (
              <div className="flex justify-between items-center pt-3 border-t border-[#E6E5DF]">
                <span className="text-sm font-bold text-[#181C1A]">
                  Cəmi: {newOrderItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)} AZN
                </span>
                <Button onClick={submitNewOrder} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl text-xs" data-testid="submit-new-order">
                  <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Sifariş Ver
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Timed Service Dialog */}
      <Dialog open={showTimedDialog} onOpenChange={setShowTimedDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-base font-medium flex items-center gap-2">
              <Timer className="w-4 h-4 text-[#D48B30]" />
              Vaxtlı Xidmət Əlavə Et
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-[#5C665F]">Menyu elementi *</Label>
              <Select value={timedForm.menu_item_id} onValueChange={(v) => setTimedForm(f => ({ ...f, menu_item_id: v }))}>
                <SelectTrigger className="h-9" data-testid="timed-menu-item-select">
                  <SelectValue placeholder="Məsələn: Çay" />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map(mi => (
                    <SelectItem key={mi.id} value={mi.id}>{mi.name} - {mi.price?.toFixed(2)} AZN</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-[#5C665F]">İnterval (dəqiqə) *</Label>
              <Input
                type="number"
                min="5"
                max="480"
                value={timedForm.interval_minutes}
                onChange={(e) => setTimedForm(f => ({ ...f, interval_minutes: e.target.value }))}
                data-testid="timed-interval-input"
              />
              <p className="text-[10px] text-[#8A948D] mt-1">Hər neçə dəqiqədən bir verilsin</p>
            </div>
            <div>
              <Label className="text-xs text-[#5C665F]">Qeyd</Label>
              <Input
                value={timedForm.notes}
                onChange={(e) => setTimedForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Məs: Şəkərsiz"
                data-testid="timed-notes-input"
              />
            </div>
            <Button onClick={createTimedService} className="w-full bg-[#D48B30] hover:bg-[#B87526] text-white rounded-xl text-xs" data-testid="save-timed-service-btn">
              <Timer className="w-3.5 h-3.5 mr-1" /> Başlat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-base font-medium flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#4F9D69]" />
              Masa Dəyişdir
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-[#F9F9F7] rounded-xl p-3 border border-[#E6E5DF]">
              <p className="text-[10px] text-[#8A948D]">Hazırkı masa</p>
              <p className="text-sm font-semibold text-[#181C1A]">Masa {sessionDetails?.table?.table_number}</p>
            </div>
            <div>
              <Label className="text-xs text-[#5C665F]">Yeni masa seçin *</Label>
              <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                <SelectTrigger className="h-9" data-testid="transfer-table-select">
                  <SelectValue placeholder="Masa seçin" />
                </SelectTrigger>
                <SelectContent>
                  {allTables
                    .filter(t => t.id !== sessionDetails?.table?.id)
                    .map(t => {
                      const hasSession = sessions.some(s => (s.session || s).table_id === t.id);
                      return (
                        <SelectItem key={t.id} value={t.id} disabled={hasSession}>
                          Masa {t.table_number} {hasSession ? '(Tutulub)' : ''}
                        </SelectItem>
                      );
                    })
                  }
                </SelectContent>
              </Select>
            </div>
            <Button onClick={transferTable} className="w-full bg-[#4F9D69] hover:bg-[#3E7E55] text-white rounded-xl text-xs" data-testid="confirm-transfer-btn">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Köçür
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}