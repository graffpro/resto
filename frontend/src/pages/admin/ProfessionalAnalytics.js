import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, TrendingUp, DollarSign, ShoppingBag, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProfessionalAnalytics() {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
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

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font">Professional Analitika</h1>
        <div className="flex gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-[#E2E8E2] rounded-md bg-white"
          >
            <option value="today">Bu gün</option>
            <option value="week">Bu həftə</option>
            <option value="month">Bu ay</option>
            <option value="all">Hamısı</option>
          </select>
          <Button onClick={fetchAnalytics} className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md">
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
            <p className="text-xs text-white/80 mt-2">{dateFilter === 'today' ? 'Bugünkü' : dateFilter === 'week' ? 'Həftəlik' : dateFilter === 'month' ? 'Aylıq' : 'Ümumi'} gəlir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C6B61]">Sifarişlər</CardTitle>
            <ShoppingBag className="h-5 w-5 text-[#4F9D69]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1A4D2E]">{stats.totalOrders}</div>
            <p className="text-xs text-[#5C6B61] mt-2">Ümumi sifariş sayı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C6B61]">Müştərilər</CardTitle>
            <Users className="h-5 w-5 text-[#4F9D69]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1A4D2E]">{stats.totalCustomers}</div>
            <p className="text-xs text-[#5C6B61] mt-2">Unikal müştəri sayı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C6B61]">Orta Hazırlıq</CardTitle>
            <Clock className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1A4D2E]">{formatTime(stats.avgPreparationTime)}</div>
            <p className="text-xs text-[#5C6B61] mt-2">Mətbəx performansı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C6B61]">Orta Çatdırılma</CardTitle>
            <Clock className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1A4D2E]">{formatTime(stats.avgDeliveryTime)}</div>
            <p className="text-xs text-[#5C6B61] mt-2">Ofisiant performansı</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#4F9D69] to-[#3A7D52] text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ən Yaxşı Ofisiant</CardTitle>
            <TrendingUp className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topWaiter?.name || 'N/A'}</div>
            <p className="text-xs text-white/80 mt-2">
              {stats.topWaiter ? `${stats.topWaiter.count} sifariş · ${stats.topWaiter.revenue.toFixed(2)} AZN` : 'Məlumat yoxdur'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1A4D2E] heading-font">Detallar</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.length === 0 ? (
            <p className="text-center text-[#5C6B61] py-8">Məlumat yoxdur</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F5F9E9]">
                  <tr>
                    <th className="text-left p-3 text-[#1A4D2E] font-semibold">Stol</th>
                    <th className="text-left p-3 text-[#1A4D2E] font-semibold">Sifariş</th>
                    <th className="text-right p-3 text-[#1A4D2E] font-semibold">Məbləğ</th>
                    <th className="text-right p-3 text-[#1A4D2E] font-semibold">Hazırlıq</th>
                    <th className="text-right p-3 text-[#1A4D2E] font-semibold">Çatdırılma</th>
                    <th className="text-left p-3 text-[#1A4D2E] font-semibold">Ofisiant</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.slice(0, 50).map((item, idx) => (
                    <tr key={idx} className="border-t border-[#E2E8E2]">
                      <td className="p-3">Stol {item.table?.table_number}</td>
                      <td className="p-3 text-sm text-[#5C6B61]">#{item.order?.order_number}</td>
                      <td className="p-3 text-right font-semibold text-[#1A4D2E]">{item.order?.total_amount?.toFixed(2)} AZN</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
