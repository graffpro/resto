import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { RefreshCw, Clock, CheckCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import az from '@/translations/az';
import { playNotificationSound, initAudio } from '@/utils/notifications';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function KitchenDashboard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevOrdersCount = useRef(0);

  useEffect(() => {
    initAudio();
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/kitchen`);
      const newOrders = response.data;
      
      if (prevOrdersCount.current > 0 && newOrders.length > prevOrdersCount.current) {
        playNotificationSound();
        toast.success('Yeni sifariş!', { duration: 5000 });
      }
      
      prevOrdersCount.current = newOrders.length;
      setOrders(newOrders);
      if (loading) setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const startPreparing = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status?status=preparing`);
      toast.success('Hazırlama başladı');
      fetchOrders();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const markReady = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status?status=ready`);
      toast.success('Sifariş hazırdır');
      fetchOrders();
    } catch (error) {
      toast.error('Xəta baş verdi');
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

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center bg-[#F5F9E9]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#F5F9E9] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font mb-2">{az.kitchenOrders}</h1>
            <p className="text-[#5C6B61]">{user?.full_name}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchOrders} className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md">
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenilə
            </Button>
            <Button onClick={logout} variant="outline" className="rounded-md">
              <LogOut className="w-4 h-4 mr-2" />
              {az.logout}
            </Button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
            <p className="text-[#5C6B61] text-lg">Hazırda sifariş yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(({ order, table, venue }) => (
              <Card key={order.id} className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-[#1A4D2E]">
                    <span>Stol {table?.table_number}</span>
                    {getStatusBadge(order.status)}
                  </CardTitle>
                  <p className="text-sm text-[#5C6B61]">{venue?.name}</p>
                  <p className="text-xs text-[#5C6B61] mt-2">
                    Sifariş #{order.order_number}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-xs text-[#5C6B61] mb-2">Yeməklər:</p>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-sm font-semibold">
                          {item.name} x{item.quantity}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-[#F5F9E9] rounded-lg">
                    <div className="flex items-center gap-2 text-[#1A4D2E]">
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
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {az.startPreparing}
                    </Button>
                  )}

                  {order.status === 'preparing' && (
                    <Button
                      onClick={() => markReady(order.id)}
                      className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white"
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