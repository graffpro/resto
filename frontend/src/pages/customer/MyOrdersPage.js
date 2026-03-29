import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Clock, CheckCircle, XCircle, Truck, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const statusIcons = {
  pending: Clock,
  confirmed: CheckCircle,
  preparing: Package,
  ready: CheckCircle,
  delivered: CheckCircle,
  cancelled: XCircle
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  const handleSearch = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/orders/customer/${email}`);
      setOrders(response.data);
      setSearchEmail(email);
      if (response.data.length === 0) {
        toast.info('No orders found for this email');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl md:text-5xl font-bold text-[#1A4D2E] mb-8 heading-font" data-testid="my-orders-page-title">
        My Orders
      </h1>

      <div className="max-w-md mb-8">
        <Label htmlFor="email" className="text-[#1A4D2E] mb-2 block">Enter your email to view orders</Label>
        <div className="flex gap-2">
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
            data-testid="email-search-input"
          />
          <Button 
            onClick={handleSearch} 
            disabled={loading}
            className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-full px-6 transition-all duration-200 active:scale-95"
            data-testid="search-orders-button"
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="space-y-6">
          <p className="text-[#5C6B61]">Showing {orders.length} order(s) for {searchEmail}</p>
          
          {orders.map(order => {
            const StatusIcon = statusIcons[order.status] || Clock;
            return (
              <div 
                key={order.id}
                className="bg-white border border-[#E2E8E2] rounded-xl p-6 hover:shadow-lg transition-shadow"
                data-testid={`order-${order.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#1A4D2E] mb-1" data-testid={`order-number-${order.id}`}>
                      Order #{order.order_number}
                    </h3>
                    <p className="text-[#5C6B61] text-sm">
                      {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge className={`${statusColors[order.status]} flex items-center gap-1`} data-testid={`order-status-${order.id}`}>
                    <StatusIcon className="w-4 h-4" />
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-[#5C6B61] mb-2">
                    {order.order_type === 'delivery' ? (
                      <>
                        <Truck className="w-4 h-4" />
                        <span>Delivery to: {order.delivery_address}</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        <span>Pickup</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#E2E8E2] pt-4">
                  <h4 className="font-semibold text-[#1A4D2E] mb-3">Order Items:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-[#5C6B61]">
                        <span>{item.name} x {item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#E2E8E2] mt-4 pt-4">
                    <div className="flex justify-between text-xl font-bold text-[#1A4D2E]">
                      <span>Total</span>
                      <span data-testid={`order-total-${order.id}`}>${order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && searchEmail && orders.length === 0 && (
        <div className="text-center py-20">
          <Package className="w-24 h-24 mx-auto text-[#5C6B61] mb-6" />
          <h3 className="text-2xl font-bold text-[#1A4D2E] mb-2 heading-font">No Orders Found</h3>
          <p className="text-[#5C6B61]">No orders found for {searchEmail}</p>
        </div>
      )}
    </div>
  );
}
