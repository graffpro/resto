import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Eye, Truck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status?status=${newStatus}`);
      toast.success('Order status updated successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font" data-testid="orders-management-title">Orders Management</h1>
        <Button 
          onClick={fetchOrders}
          className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md"
          data-testid="refresh-orders-button"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div 
              key={order.id}
              className="bg-white border border-[#E2E8E2] rounded-xl p-6"
              data-testid={`order-item-${order.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#1A4D2E] mb-2" data-testid={`order-number-${order.id}`}>
                    Order #{order.order_number}
                  </h3>
                  <div className="space-y-1 text-[#5C6B61]">
                    <p><strong>Customer:</strong> {order.customer_name}</p>
                    <p><strong>Email:</strong> {order.customer_email}</p>
                    <p><strong>Phone:</strong> {order.customer_phone}</p>
                    <div className="flex items-center gap-2 mt-2">
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
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <Badge className={statusColors[order.status]} data-testid={`order-status-badge-${order.id}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                  <p className="text-sm text-[#5C6B61]">
                    {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                  </p>
                  <p className="text-xl font-bold text-[#1A4D2E]" data-testid={`order-total-${order.id}`}>
                    ${order.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#E2E8E2]">
                <Button
                  variant="outline"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  className="rounded-md"
                  data-testid={`toggle-order-details-${order.id}`}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {expandedOrder === order.id ? 'Hide' : 'View'} Items
                </Button>

                <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
                  <SelectTrigger className="w-48" data-testid={`status-select-${order.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {expandedOrder === order.id && (
                <div className="mt-4 pt-4 border-t border-[#E2E8E2]">
                  <h4 className="font-semibold text-[#1A4D2E] mb-3">Order Items:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between p-3 bg-[#F5F9E9] rounded-lg">
                        <span className="text-[#1A4D2E]">{item.name} x {item.quantity}</span>
                        <span className="font-semibold text-[#1A4D2E]">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {order.special_instructions && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-[#1A4D2E]">Special Instructions:</p>
                      <p className="text-[#5C6B61] mt-1">{order.special_instructions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}