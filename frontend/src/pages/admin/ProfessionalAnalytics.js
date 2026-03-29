import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, TrendingUp, DollarSign, ShoppingBag, Clock, Users, Eye, Edit, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function ProfessionalAnalytics() {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgPreparationTime: 0,
    avgDeliveryTime: 0,
    topWaiter: null,
    totalCustomers: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateFilter]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/detailed`);
      const data = response.data;
      setAnalytics(data);
      calculateStats(data);
    } catch (error) {
      toast.error('Analitika yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const today = new Date().toDateString();
    const filteredData = data.filter(item => {
      if (!item.order?.ordered_at) return false;
      const orderDate = new Date(item.order.ordered_at).toDateString();
      if (dateFilter === 'today') return orderDate === today;
      if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(item.order.ordered_at) >= weekAgo;
      }
      if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(item.order.ordered_at) >= monthAgo;
      }
      return true;
    });

    const totalRevenue = filteredData.reduce((sum, item) => sum + (item.order?.total_amount || 0), 0);
    const totalOrders = filteredData.length;
    
    const prepTimes = filteredData.filter(i => i.preparation_time_minutes).map(i => i.preparation_time_minutes);
    const avgPreparationTime = prepTimes.length > 0 ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length : 0;
    
    const delivTimes = filteredData.filter(i => i.delivery_time_minutes).map(i => i.delivery_time_minutes);
    const avgDeliveryTime = delivTimes.length > 0 ? delivTimes.reduce((a, b) => a + b, 0) / delivTimes.length : 0;

    const waiterStats = {};
    filteredData.forEach(item => {
      if (item.waiter) {
        if (!waiterStats[item.waiter.id]) {
          waiterStats[item.waiter.id] = { name: item.waiter.full_name, count: 0, revenue: 0 };
        }
        waiterStats[item.waiter.id].count++;
        waiterStats[item.waiter.id].revenue += item.order?.total_amount || 0;
      }
    });

    const topWaiter = Object.values(waiterStats).sort((a, b) => b.revenue - a.revenue)[0] || null;

    const uniqueCustomers = new Set(filteredData.map(i => i.session?.id)).size;

    setStats({
      totalRevenue,
      totalOrders,
      avgPreparationTime,
      avgDeliveryTime,
      topWaiter,
      totalCustomers: uniqueCustomers
    });
  };

  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return '0 dəq';
    if (minutes < 60) return `${Math.round(minutes)} dəq`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}s ${mins}d`;
  };

  const handleViewOrder = (item) => {
    setSelectedOrder(item);
  };

  const handleEditOrder = (item) => {
    setEditingOrder(item);
    setEditItems(item.order?.items?.map(i => ({ ...i })) || []);
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Sifarişi silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API}/orders/${orderId}`);
      toast.success('Sifariş silindi');
      fetchAnalytics();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;
    try {
      const total = editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      await axios.put(`${API}/orders/${editingOrder.order.id}`, {
        items: editItems,
        total_amount: total
      });
      toast.success('Sifariş yeniləndi');
      setEditingOrder(null);
      fetchAnalytics();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const updateItemQuantity = (idx, newQty) => {
    if (newQty < 1) return;
    const updated = [...editItems];
    updated[idx].quantity = newQty;
    setEditItems(updated);
  };

  const removeItem = (idx) => {
    if (editItems.length <= 1) {
      toast.error('Ən azı bir məhsul olmalıdır');
      return;
    }
    setEditItems(editItems.filter((_, i) => i !== idx));
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
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">Professional Analitika</h1>
        <div className="flex gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-[#E6E5DF] rounded-xl bg-white"
          >
            <option value="today">Bu gün</option>
            <option value="week">Bu həftə</option>
            <option value="month">Bu ay</option>
            <option value="all">Hamısı</option>
          </select>
          <Button onClick={fetchAnalytics} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white text-xs rounded-xl">
            <RefreshCw className="w-4 h-4 mr-2" />
            Yenilə
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-[#1A4D2E] to-[#2A5D3E] text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Gəlir</CardTitle>
            <DollarSign className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalRevenue.toFixed(2)} AZN</div>
            <p className="text-xs text-white/80 mt-0.5">{dateFilter === 'today' ? 'Bugünkü' : dateFilter === 'week' ? 'Həftəlik' : dateFilter === 'month' ? 'Aylıq' : 'Ümumi'} gəlir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Sifarişlər</CardTitle>
            <ShoppingBag className="h-5 w-5 text-[#4F9D69]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#181C1A]">{stats.totalOrders}</div>
            <p className="text-xs text-[#5C665F] mt-0.5">Ümumi sifariş sayı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Müştərilər</CardTitle>
            <Users className="h-5 w-5 text-[#4F9D69]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#181C1A]">{stats.totalCustomers}</div>
            <p className="text-xs text-[#5C665F] mt-0.5">Unikal müştəri sayı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Orta Hazırlıq</CardTitle>
            <Clock className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#181C1A]">{formatTime(stats.avgPreparationTime)}</div>
            <p className="text-xs text-[#5C665F] mt-0.5">Mətbəx performansı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Orta Çatdırılma</CardTitle>
            <Clock className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#181C1A]">{formatTime(stats.avgDeliveryTime)}</div>
            <p className="text-xs text-[#5C665F] mt-0.5">Ofisiant performansı</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#4F9D69] to-[#3A7D52] text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ən Yaxşı Ofisiant</CardTitle>
            <TrendingUp className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topWaiter?.name || 'N/A'}</div>
            <p className="text-xs text-white/80 mt-0.5">
              {stats.topWaiter ? `${stats.topWaiter.count} sifariş · ${stats.topWaiter.revenue.toFixed(2)} AZN` : 'Məlumat yoxdur'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#181C1A] heading-font">Detallar</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.length === 0 ? (
            <p className="text-center text-[#5C665F] py-8">Məlumat yoxdur</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F9F9F7]">
                  <tr>
                    <th className="text-left p-3 text-[#181C1A] font-semibold">Masa</th>
                    <th className="text-left p-3 text-[#181C1A] font-semibold">Sifariş</th>
                    <th className="text-right p-3 text-[#181C1A] font-semibold">Məbləğ</th>
                    <th className="text-right p-3 text-[#181C1A] font-semibold">Hazırlıq</th>
                    <th className="text-right p-3 text-[#181C1A] font-semibold">Çatdırılma</th>
                    <th className="text-left p-3 text-[#181C1A] font-semibold">Ofisiant</th>
                    <th className="text-center p-3 text-[#181C1A] font-semibold">Əməliyyatlar</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.slice(0, 50).map((item, idx) => (
                    <tr key={idx} className="border-t border-[#E6E5DF] hover:bg-[#F9F9F7]/50">
                      <td className="p-3">Masa {item.table?.table_number}</td>
                      <td className="p-3 text-sm text-[#5C665F]">#{item.order?.order_number}</td>
                      <td className="p-3 text-right font-semibold text-[#181C1A]">{item.order?.total_amount?.toFixed(2)} AZN</td>
                      <td className="p-3 text-right text-sm">
                        <span className={item.preparation_time_minutes > 20 ? 'text-red-600' : 'text-green-600'}>
                          {formatTime(item.preparation_time_minutes)}
                        </span>
                      </td>
                      <td className="p-3 text-right text-sm">
                        <span className={item.delivery_time_minutes > 5 ? 'text-orange-600' : 'text-green-600'}>
                          {formatTime(item.delivery_time_minutes)}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{item.waiter?.full_name || '-'}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(item)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            data-testid={`view-order-${item.order?.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOrder(item)}
                            className="h-8 w-8 p-0 text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                            data-testid={`edit-order-${item.order?.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOrder(item.order?.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                            data-testid={`delete-order-${item.order?.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#181C1A] heading-font">
              Sifariş Detalları - #{selectedOrder?.order?.order_number}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F9F9F7] rounded-lg p-3">
                  <p className="text-xs text-[#5C665F]">Masa</p>
                  <p className="font-bold text-[#181C1A]">Masa {selectedOrder.table?.table_number}</p>
                </div>
                <div className="bg-[#F9F9F7] rounded-lg p-3">
                  <p className="text-xs text-[#5C665F]">Status</p>
                  <Badge className={getStatusColor(selectedOrder.order?.status)}>
                    {getStatusLabel(selectedOrder.order?.status)}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#181C1A] mb-2">Sifariş Edilənlər:</p>
                <div className="space-y-2">
                  {selectedOrder.order?.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-[#E6E5DF]">
                      <div>
                        <p className="font-medium text-[#181C1A]">{item.name}</p>
                        <p className="text-sm text-[#5C665F]">{item.quantity} ədəd × {item.price?.toFixed(2)} AZN</p>
                      </div>
                      <p className="font-bold text-[#181C1A]">{(item.quantity * item.price).toFixed(2)} AZN</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1A4D2E] text-white rounded-lg p-4 flex justify-between items-center">
                <span className="font-medium">Ümumi Məbləğ</span>
                <span className="text-2xl font-bold">{selectedOrder.order?.total_amount?.toFixed(2)} AZN</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#5C665F]">Hazırlıq Vaxtı</p>
                  <p className="font-semibold text-[#181C1A]">{formatTime(selectedOrder.preparation_time_minutes)}</p>
                </div>
                <div>
                  <p className="text-[#5C665F]">Çatdırılma Vaxtı</p>
                  <p className="font-semibold text-[#181C1A]">{formatTime(selectedOrder.delivery_time_minutes)}</p>
                </div>
                <div>
                  <p className="text-[#5C665F]">Ofisiant</p>
                  <p className="font-semibold text-[#181C1A]">{selectedOrder.waiter?.full_name || '-'}</p>
                </div>
                <div>
                  <p className="text-[#5C665F]">Sifariş Tarixi</p>
                  <p className="font-semibold text-[#181C1A]">
                    {new Date(selectedOrder.order?.ordered_at).toLocaleString('az-AZ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Modal */}
      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#181C1A] heading-font">
              Sifarişi Redaktə Et - #{editingOrder?.order?.order_number}
            </DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4">
              <div className="space-y-3">
                {editItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-[#F9F9F7] rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-[#181C1A]">{item.name}</p>
                      <p className="text-sm text-[#5C665F]">{item.price?.toFixed(2)} AZN / ədəd</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateItemQuantity(idx, item.quantity - 1)}
                        className="h-8 w-8 p-0"
                      >
                        -
                      </Button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(idx)}
                      className="h-8 w-8 p-0 text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="bg-[#1A4D2E] text-white rounded-lg p-4 flex justify-between items-center">
                <span className="font-medium">Yeni Ümumi Məbləğ</span>
                <span className="text-2xl font-bold">
                  {editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)} AZN
                </span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingOrder(null)}
                  className="flex-1"
                >
                  Ləğv Et
                </Button>
                <Button
                  onClick={handleUpdateOrder}
                  className="flex-1 bg-[#C05C3D] hover:bg-[#A64D31] text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Yadda Saxla
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
