import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { RefreshCw, CheckCircle, LogOut, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function WaiterDashboard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/waiter`);
      setOrders(response.data);
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

  const getTimeSince = (dateStr) => {
    const diff = new Date() - new Date(dateStr);
    const minutes = Math.floor(diff / 60000);
    return `${minutes} ${az.minutes}`;
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center bg-[#F5F9E9]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#F5F9E9] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font mb-2">{az.waiterOrders}</h1>
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
            <p className="text-[#5C6B61] text-lg">Hazırda hazır sifariş yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(({ order, table, venue }) => (
              <Card key={order.id} className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-[#1A4D2E]">
                    <span>Stol {table?.table_number}</span>
                    <Badge className="bg-green-100 text-green-800">{az.ready}</Badge>
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
                        Hazır: {getTimeSince(order.ready_at)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => markDelivered(order.id)}
                    className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white"
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