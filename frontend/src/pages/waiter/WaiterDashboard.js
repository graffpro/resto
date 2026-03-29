import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { WebSocketProvider, useWebSocket } from '@/context/WebSocketContext';
import axios from 'axios';
import { RefreshCw, CheckCircle, LogOut, Clock, Wifi, WifiOff, Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import az from '@/translations/az';
import { playNotificationSound, initAudio } from '@/utils/notifications';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

function playDingDing(times = 5) {
  let count = 0;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const play = () => {
    if (count >= times) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    count++;
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(1500, ctx.currentTime);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.3);
      setTimeout(play, 600);
    }, 200);
  };
  play();
}

function WaiterContent() {
  const { user, logout } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const prevOrdersCount = useRef(0);

  useEffect(() => {
    initAudio();
    fetchOrders();
    fetchWaiterCalls();
    const interval = setInterval(() => { fetchOrders(); fetchWaiterCalls(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'order_ready') {
      fetchOrders();
      playNotificationSound();
      toast.success('Sifariş hazırdır!', { duration: 5000 });
    } else if (lastMessage?.type === 'order_update') {
      fetchOrders();
    } else if (lastMessage?.type === 'waiter_call') {
      fetchWaiterCalls();
      playDingDing(5);
      toast.error(`Masa ${lastMessage.table_number} ofisiant çağırır!`, { duration: 10000 });
    } else if (lastMessage?.type === 'waiter_call_ack') {
      setWaiterCalls(prev => prev.filter(c => c.id !== lastMessage.call_id));
    }
  }, [lastMessage]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/waiter`);
      const newOrders = response.data;
      
      // Only play sound if not from WebSocket
      if (!isConnected && prevOrdersCount.current > 0 && newOrders.length > prevOrdersCount.current) {
        playNotificationSound();
        toast.success('Hazır sifariş var!', { duration: 5000 });
      }
      
      prevOrdersCount.current = newOrders.length;
      setOrders(newOrders);
      if (loading) setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const markDelivered = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status?status=delivered`);
      toast.success('Sifariş çatdırıldı');
      fetchOrders();
    } catch (error) {
      toast.error('Xəta baş verdi');
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
      toast.success('Qəbul edildi');
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
    <div className="min-h-screen bg-[#F9F9F7] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight mb-2">{az.waiterOrders}</h1>
            <div className="flex items-center gap-2">
              <p className="text-[#5C665F]">{user?.full_name}</p>
              {isConnected ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Wifi className="w-3 h-3" />
                  Canlı
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
              Yenilə
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
              Ofisiant çağırışları ({waiterCalls.length})
            </h2>
            {waiterCalls.map(call => (
              <div
                key={call.id}
                className="bg-red-50 border-2 border-red-500 rounded-xl p-4 flex items-center justify-between animate-pulse"
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
                  Qəbul et
                </Button>
              </div>
            ))}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white border border-[#E6E5DF] rounded-xl p-12 text-center">
            <p className="text-[#5C665F] text-lg">Hazırda hazır sifariş yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(({ order, table, venue }) => (
              <Card key={order.id} className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-[#181C1A]">
                    <span>Masa {table?.table_number}</span>
                    <Badge className="bg-green-100 text-green-800">{az.ready}</Badge>
                  </CardTitle>
                  <p className="text-sm text-[#5C665F]">{venue?.name}</p>
                  <p className="text-xs text-[#5C665F] mt-2">
                    Sifariş #{order.order_number}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-xs text-[#5C665F] mb-2">Yeməklər:</p>
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
                        Hazır: {getTimeSince(order.ready_at)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => markDelivered(order.id)}
                    className="w-full bg-[#C05C3D] hover:bg-[#A64D31] text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {az.markAsDelivered}
                  </Button>
                </CardContent>
              </Card>
            ))}
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