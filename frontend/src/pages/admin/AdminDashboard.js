import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, ShoppingBag, Calendar, Clock, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [popularItems, setPopularItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, popularRes] = await Promise.all([
        axios.get(`${API}/analytics/dashboard`),
        axios.get(`${API}/analytics/popular-items`)
      ]);
      setStats(statsRes.data);
      setPopularItems(popularRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
      <h1 className="text-4xl font-bold text-[#1A4D2E] mb-8 heading-font" data-testid="dashboard-title">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="stat-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#5C6B61]">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-[#4F9D69]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A4D2E]">${stats?.total_revenue.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-total-orders">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#5C6B61]">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-[#4F9D69]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A4D2E]">{stats?.total_orders || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-pending-orders">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#5C6B61]">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-[#E9C46A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A4D2E]">{stats?.pending_orders || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-reservations">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#5C6B61]">Total Reservations</CardTitle>
            <Calendar className="h-4 w-4 text-[#4F9D69]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A4D2E]">{stats?.total_reservations || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A4D2E] heading-font">Today's Performance</CardTitle>
            <CardDescription>Overview of today's activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#F5F9E9] rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-[#4F9D69]" />
                <div>
                  <p className="text-sm text-[#5C6B61]">Today's Orders</p>
                  <p className="text-2xl font-bold text-[#1A4D2E]" data-testid="today-orders">{stats?.today_orders || 0}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#F5F9E9] rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-[#4F9D69]" />
                <div>
                  <p className="text-sm text-[#5C6B61]">Today's Revenue</p>
                  <p className="text-2xl font-bold text-[#1A4D2E]" data-testid="today-revenue">${stats?.today_revenue.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#1A4D2E] heading-font">Popular Items</CardTitle>
            <CardDescription>Best-selling menu items</CardDescription>
          </CardHeader>
          <CardContent>
            {popularItems.length === 0 ? (
              <p className="text-[#5C6B61] text-center py-8">No data available yet</p>
            ) : (
              <div className="space-y-3">
                {popularItems.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#F5F9E9] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#4F9D69] text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A4D2E]">{item.name}</p>
                        <p className="text-sm text-[#5C6B61]">{item.count} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#1A4D2E]">${item.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}