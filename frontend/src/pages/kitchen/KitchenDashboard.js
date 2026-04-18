import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { WebSocketProvider, useWebSocket } from '@/context/WebSocketContext';
import axios from 'axios';
import { RefreshCw, Clock, CheckCircle, LogOut, Wifi, WifiOff, Phone, Volume2, VolumeX, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import az from '@/translations/az';
import { initAudio, startContinuousAlarm } from '@/utils/notifications';
import { sendLocalNotification, vibrateDevice, isNativeApp } from '@/utils/capacitor';
import { VoiceCallProvider } from '@/context/VoiceCallContext';
import { VoiceCallButton, VoiceCallOverlay } from '@/components/VoiceCallUI';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

function KitchenContent() {
  const { user, logout } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState([]);
  // Auto-select station based on user role (bar user → bar station)
  const [selectedStation, setSelectedStation] = useState(user?.role === 'bar' ? 'bar' : '');
  const prevOrderIds = useRef(new Set());
  const alarmRef = useRef(null);
  const [alarmActive, setAlarmActive] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Track user interaction for autoplay policy
  const handleUserInteraction = useCallback(() => {
    if (!hasInteracted) {
      initAudio();
      setHasInteracted(true);
    }
  }, [hasInteracted]);

  useEffect(() => {
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [handleUserInteraction]);

  useEffect(() => {
    initAudio();
    fetchOrders();
    fetchStations();
    // Poll every 3 seconds for fast order updates (both native and web)
    const interval = setInterval(fetchOrders, 3000);
    return () => {
      clearInterval(interval);
      if (alarmRef.current) alarmRef.current.stop();
    };
  }, []);

  // Refetch when station filter changes
  useEffect(() => {
    fetchOrders();
  }, [selectedStation]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'new_order') {
      fetchOrders();
      triggerAlarm();
      toast.success('Yeni sifaris daxil oldu!', { duration: 5000 });
    } else if (lastMessage?.type === 'order_update') {
      fetchOrders();
    } else if (lastMessage?.type === 'timed_service_expired') {
      const d = lastMessage.data;
      triggerAlarm();
      toast.error(`Masa ${d.table_number} — ${d.menu_item_name} vaxtı bitdi!`, { duration: 15000 });
    }
  }, [lastMessage]);

  const triggerAlarm = () => {
    if (alarmRef.current) alarmRef.current.stop();
    alarmRef.current = startContinuousAlarm(3000);
    setAlarmActive(true);
    // Native notification for background
    sendLocalNotification('YENI SIFARIS!', 'Metbexe yeni sifaris geldi!');
    vibrateDevice();
  };

  const stopAlarm = () => {
    if (alarmRef.current) {
      alarmRef.current.stop();
      alarmRef.current = null;
    }
    setAlarmActive(false);
  };

  const fetchStations = async () => {
    try {
      const res = await axios.get(`${API}/stations`);
      setStations(res.data);
    } catch {}
  };

  const fetchOrders = async () => {
    try {
      const params = selectedStation ? `?station=${selectedStation}` : '';
      const response = await axios.get(`${API}/orders/kitchen${params}`);
      const newOrders = response.data;
      
      // Check for new pending orders
      const newPendingIds = new Set(
        newOrders.filter(o => o.order.status === 'pending').map(o => o.order.id)
      );
      const hadNewPending = [...newPendingIds].some(id => !prevOrderIds.current.has(id));
      
      if (hadNewPending && prevOrderIds.current.size > 0 && !isConnected) {
        triggerAlarm();
        toast.success('Yeni sifaris!', { duration: 5000 });
      }
      
      // Auto-stop alarm if no pending orders
      if (newOrders.every(o => o.order.status !== 'pending') && alarmRef.current) {
        stopAlarm();
      }
      
      prevOrderIds.current = new Set(newOrders.map(o => o.order.id));
      setOrders(newOrders);
      if (loading) setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const startPreparing = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status?status=preparing`);
      toast.success('Hazirlama basladi');
      stopAlarm();
      fetchOrders();
    } catch (error) {
      toast.error('Xeta bas verdi');
    }
  };

  const markReady = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status?status=ready`);
      toast.success('Sifaris hazirdir');
      fetchOrders();
    } catch (error) {
      toast.error('Xeta bas verdi');
    }
  };

  const getTimeSince = (dateStr) => {
    const diff = new Date() - new Date(dateStr);
    const minutes = Math.floor(diff / 60000);
    return `${minutes} ${az.minutes}`;
  };

  const getStatusBadge = (status) => {
    if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-800">{az.pending}</Badge>;
    if (status === 'preparing') return <Badge className="bg-orange-100 text-orange-800">{az.preparing}</Badge>;
    return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
  };

  const getStationBadge = (station) => {
    const colors = {
      kitchen: 'bg-orange-100 text-orange-700',
      bar: 'bg-purple-100 text-purple-700',
      waiter: 'bg-blue-100 text-blue-700',
    };
    const names = { kitchen: 'Metbex', bar: 'Bar', waiter: 'Ofisiant' };
    const s = stations.find(st => st.id === station);
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors[station] || 'bg-gray-100 text-gray-700'}`}>
        {s?.name || names[station] || station}
      </span>
    );
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center bg-[#F9F9F7]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] p-3 sm:p-6" onClick={handleUserInteraction}>
      <VoiceCallOverlay />
      <div className="max-w-7xl mx-auto">
        {/* Alarm Banner */}
        {alarmActive && (
          <div
            className="mb-3 bg-red-600 text-white rounded-xl p-3 sm:p-4 flex items-center justify-between"
            style={{ animation: 'pulse 0.5s ease-in-out infinite alternate' }}
            data-testid="kitchen-alarm-banner"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
              <span className="text-sm sm:text-lg font-bold">YENI SIFARIS!</span>
            </div>
            <Button
              onClick={stopAlarm}
              className="bg-white text-red-600 hover:bg-red-50 font-bold text-xs sm:text-sm px-3 py-1.5"
              data-testid="stop-alarm-btn"
            >
              <VolumeX className="w-4 h-4 mr-1" />
              Dayandır
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-3">
          <div>
            <h1 className="heading-font text-lg sm:text-xl font-medium text-[#181C1A] tracking-tight mb-1">{az.kitchenOrders}</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-[#5C665F]">{user?.full_name}</p>
              {isConnected ? (
                <span className="flex items-center gap-1 text-xs text-green-600"><Wifi className="w-3 h-3" />Canli</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-orange-600"><WifiOff className="w-3 h-3" />Offline</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-gray-500" />
              <select value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)} className="text-xs sm:text-sm border rounded-md px-2 py-1.5 bg-white" data-testid="station-filter">
                <option value="">Hamisi</option>
                {stations.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <VoiceCallButton targetRole="admin" />
            <Button onClick={fetchOrders} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-md text-xs sm:text-sm px-3">
              <RefreshCw className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Yenile</span>
            </Button>
            <Button onClick={logout} variant="outline" className="rounded-md text-xs sm:text-sm px-3">
              <LogOut className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">{az.logout}</span>
            </Button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white border border-[#E6E5DF] rounded-xl p-12 text-center">
            <p className="text-[#5C665F] text-lg">Hazirda sifaris yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {orders.map(({ order, table, venue }) => (
              <Card key={order.id} className={`bg-white ${order.status === 'pending' ? 'ring-2 ring-red-400 ring-offset-2' : ''}`} data-testid={`kitchen-order-${order.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-[#181C1A]">
                    <span>Masa {table?.table_number}</span>
                    {getStatusBadge(order.status)}
                  </CardTitle>
                  <p className="text-sm text-[#5C665F]">{venue?.name}</p>
                  <p className="text-xs text-[#5C665F] mt-2">
                    Sifaris #{order.order_number}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-xs text-[#5C665F] mb-2">Yemekler:</p>
                    <div className="space-y-1.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <p className="text-sm font-semibold">
                            {item.name} x{item.quantity}
                          </p>
                          {getStationBadge(item.target_station || 'kitchen')}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-[#F9F9F7] rounded-lg">
                    <div className="flex items-center gap-2 text-[#181C1A]">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {order.status === 'pending' 
                          ? getTimeSince(order.ordered_at)
                          : getTimeSince(order.preparing_started_at)
                        }
                      </span>
                    </div>
                  </div>

                  {order.status === 'pending' && (
                    <Button
                      onClick={() => startPreparing(order.id)}
                      className="w-full bg-[#E9C46A] hover:bg-[#D4A849] text-white"
                      data-testid={`start-preparing-${order.id}`}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {az.startPreparing}
                    </Button>
                  )}

                  {order.status === 'preparing' && (
                    <Button
                      onClick={() => markReady(order.id)}
                      className="w-full bg-[#C05C3D] hover:bg-[#A64D31] text-white"
                      data-testid={`mark-ready-${order.id}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {az.markAsReady}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KitchenDashboard() {
  return (
    <WebSocketProvider role="kitchen">
      <VoiceCallProvider myRole="kitchen">
        <KitchenContent />
      </VoiceCallProvider>
    </WebSocketProvider>
  );
}
