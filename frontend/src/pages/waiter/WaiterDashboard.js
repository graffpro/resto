import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { WebSocketProvider, useWebSocket } from '@/context/WebSocketContext';
import axios from 'axios';
import { RefreshCw, CheckCircle, LogOut, Clock, Wifi, WifiOff, Bell, BellRing, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import az from '@/translations/az';
import { initAudio, startContinuousAlarm } from '@/utils/notifications';
import { sendLocalNotification, vibrateDevice, isNativeApp } from '@/utils/capacitor';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

function WaiterContent() {
  const { user, logout } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const prevOrderIds = useRef(new Set());
  const alarmRef = useRef(null);
  const [alarmActive, setAlarmActive] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const [timedAlerts, setTimedAlerts] = useState([]);

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
    fetchWaiterCalls();
    // Poll every 3 seconds for fast updates (both native and web)
    const interval = setInterval(() => { fetchOrders(); fetchWaiterCalls(); }, 3000);
    return () => {
      clearInterval(interval);
      if (alarmRef.current) alarmRef.current.stop();
    };
  }, []);

  const triggerAlarm = () => {
    if (alarmRef.current) alarmRef.current.stop();
    alarmRef.current = startContinuousAlarm(3000);
    setAlarmActive(true);
    sendLocalNotification('DIQQET!', 'Yeni tapsirig var - ofisiant!');
    vibrateDevice();
  };

  const stopAlarm = () => {
    if (alarmRef.current) {
      alarmRef.current.stop();
      alarmRef.current = null;
    }
    setAlarmActive(false);
  };

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'order_ready') {
      fetchOrders();
      triggerAlarm();
      toast.success('Sifaris hazirdir!', { duration: 5000 });
    } else if (lastMessage?.type === 'new_order') {
      fetchOrders();
      triggerAlarm();
      toast.success('YENI SIFARIS geldi!', { duration: 5000 });
    } else if (lastMessage?.type === 'order_update') {
      fetchOrders();
    } else if (lastMessage?.type === 'waiter_call') {
      fetchWaiterCalls();
      triggerAlarm();
      toast.error(`Masa ${lastMessage.table_number} ofisiant cagırir!`, { duration: 10000 });
    } else if (lastMessage?.type === 'waiter_call_ack') {
      setWaiterCalls(prev => prev.filter(c => c.id !== lastMessage.call_id));
    } else if (lastMessage?.type === 'timed_service_expired') {
      const d = lastMessage.data;
      setTimedAlerts(prev => {
        if (prev.some(a => a.service_id === d.service_id)) return prev;
        return [...prev, d];
      });
      triggerAlarm();
      toast.error(`Masa ${d.table_number} — ${d.menu_item_name} vaxtı bitdi!`, { duration: 15000 });
    }
  }, [lastMessage]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/waiter`);
      const newOrders = response.data;
      
      const newIds = new Set(newOrders.map(o => o.order.id));
      const hadNew = [...newIds].some(id => !prevOrderIds.current.has(id));
      
      if (hadNew && prevOrderIds.current.size > 0 && !isConnected) {
        triggerAlarm();
        toast.success('Hazir sifaris var!', { duration: 5000 });
      }
      
      // Auto-stop alarm if nothing to attend
      if (newOrders.length === 0 && waiterCalls.length === 0 && alarmActive) {
        stopAlarm();
      }
      
      prevOrderIds.current = newIds;
      setOrders(newOrders);
      if (loading) setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const markDelivered = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status?status=delivered`);
      toast.success('Sifaris catdirildi');
      stopAlarm();
      fetchOrders();
    } catch (error) {
      toast.error('Xeta bas verdi');
    }
  };

  const fetchWaiterCalls = async () => {
    try {
      const response = await axios.get(`${API}/waiter-calls?status=pending`);
      setWaiterCalls(response.data || []);
    } catch {}
  };

  const acknowledgeCall = async (callId) => {
    try {
      await axios.post(`${API}/waiter-call/${callId}/acknowledge`);
      setWaiterCalls(prev => prev.filter(c => c.id !== callId));
      if (waiterCalls.length <= 1 && orders.length === 0) {
        stopAlarm();
      }
      toast.success('Qebul edildi');
    } catch {}
  };

  const getTimeSince = (dateStr) => {
    const diff = new Date() - new Date(dateStr);
    const minutes = Math.floor(diff / 60000);
    return `${minutes} ${az.minutes}`;
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center bg-[#F9F9F7]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] p-6" onClick={handleUserInteraction}>
      <div className="max-w-7xl mx-auto">
        {/* Alarm Banner */}
        {alarmActive && (
          <div
            className="mb-4 bg-red-600 text-white rounded-xl p-4 flex items-center justify-between"
            style={{ animation: 'pulse 0.5s ease-in-out infinite alternate' }}
            data-testid="waiter-alarm-banner"
          >
            <div className="flex items-center gap-3">
              <Volume2 className="w-6 h-6 animate-bounce" />
              <span className="text-lg font-bold">DIQQET! Yeni tapsirig var!</span>
            </div>
            <Button
              onClick={stopAlarm}
              className="bg-white text-red-600 hover:bg-red-50 font-bold"
              data-testid="stop-alarm-btn"
            >
              <VolumeX className="w-4 h-4 mr-2" />
              Sesi dayandır
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight mb-2">{az.waiterOrders}</h1>
            <div className="flex items-center gap-2">
              <p className="text-[#5C665F]">{user?.full_name}</p>
              {isConnected ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Wifi className="w-3 h-3" />
                  Canli
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-orange-600">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchOrders} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-md">
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenile
            </Button>
            <Button onClick={logout} variant="outline" className="rounded-md">
              <LogOut className="w-4 h-4 mr-2" />
              {az.logout}
            </Button>
          </div>
        </div>

        {/* Waiter Calls - Flashing Red */}
        {waiterCalls.length > 0 && (
          <div className="mb-6 space-y-3" data-testid="waiter-calls-section">
            <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <BellRing className="w-5 h-5 animate-bounce" />
              Ofisiant cagirislari ({waiterCalls.length})
            </h2>
            {waiterCalls.map(call => (
              <div
                key={call.id}
                className="bg-red-50 border-2 border-red-500 rounded-xl p-4 flex items-center justify-between"
                style={{ animation: 'pulse 0.5s ease-in-out infinite alternate' }}
                data-testid={`waiter-call-${call.id}`}
              >
                <div>
                  <p className="text-lg font-bold text-red-700">Masa {call.table_number}</p>
                  <p className="text-xs text-red-500">{new Date(call.created_at).toLocaleTimeString('az-AZ')}</p>
                </div>
                <Button
                  onClick={() => acknowledgeCall(call.id)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  data-testid={`ack-call-${call.id}`}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Qebul et
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Timed Service Expired Alerts - Orange Flashing */}
        {timedAlerts.length > 0 && (
          <div className="mb-6 space-y-3" data-testid="timed-alerts-section">
            <h2 className="text-lg font-bold text-orange-600 flex items-center gap-2">
              <Clock className="w-5 h-5 animate-spin" />
              Vaxt bitdi! ({timedAlerts.length})
            </h2>
            {timedAlerts.map(alert => (
              <div
                key={alert.service_id}
                className="bg-orange-50 border-2 border-orange-500 rounded-xl p-4 flex items-center justify-between"
                style={{ animation: 'pulse 0.6s ease-in-out infinite alternate' }}
                data-testid={`timed-alert-${alert.service_id}`}
              >
                <div>
                  <p className="text-lg font-bold text-orange-700">Masa {alert.table_number}</p>
                  <p className="text-sm font-semibold text-orange-600">{alert.menu_item_name}</p>
                  <p className="text-xs text-orange-500">
                    {alert.interval_minutes} deq. - {alert.serve_count + 1}-ci servis
                    {alert.notes && <span className="ml-1">({alert.notes})</span>}
                  </p>
                </div>
                <Button
                  onClick={() => setTimedAlerts(prev => prev.filter(a => a.service_id !== alert.service_id))}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  data-testid={`ack-timed-${alert.service_id}`}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Qebul et
                </Button>
              </div>
            ))}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white border border-[#E6E5DF] rounded-xl p-12 text-center">
            <p className="text-[#5C665F] text-lg">Hazirda sifaris yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(({ order, table, venue }) => {
              const statusConfig = {
                pending: { ring: 'ring-yellow-400', badge: 'bg-yellow-100 text-yellow-800', label: az.pending, timeField: 'ordered_at', timeLabel: 'Sifaris' },
                preparing: { ring: 'ring-orange-400', badge: 'bg-orange-100 text-orange-800', label: az.preparing, timeField: 'preparing_started_at', timeLabel: 'Hazirliq' },
                ready: { ring: 'ring-green-400', badge: 'bg-green-100 text-green-800', label: az.ready, timeField: 'ready_at', timeLabel: 'Hazir' },
              };
              const cfg = statusConfig[order.status] || statusConfig.pending;
              return (
                <Card key={order.id} className={`bg-white ring-2 ${cfg.ring} ring-offset-2`} data-testid={`waiter-order-${order.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-[#181C1A]">
                      <span>Masa {table?.table_number}</span>
                      <Badge className={cfg.badge}>{cfg.label}</Badge>
                    </CardTitle>
                    <p className="text-sm text-[#5C665F]">{venue?.name}</p>
                    <p className="text-xs text-[#5C665F] mt-2">
                      Sifaris #{order.order_number}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-xs text-[#5C665F] mb-2">Yemekler:</p>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-sm font-semibold">
                            {item.name} x{item.quantity}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4 p-3 bg-[#F9F9F7] rounded-lg">
                      <div className="flex items-center gap-2 text-[#181C1A]">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-semibold">
                          {cfg.timeLabel}: {order[cfg.timeField] ? getTimeSince(order[cfg.timeField]) : '-'}
                        </span>
                      </div>
                    </div>

                    {order.status === 'ready' && (
                      <Button
                        onClick={() => markDelivered(order.id)}
                        className="w-full bg-[#C05C3D] hover:bg-[#A64D31] text-white"
                        data-testid={`mark-delivered-${order.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {az.markAsDelivered}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WaiterDashboard() {
  return (
    <WebSocketProvider role="waiter">
      <WaiterContent />
    </WebSocketProvider>
  );
}
