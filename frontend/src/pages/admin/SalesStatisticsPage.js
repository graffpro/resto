import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, ShoppingBag, TrendingUp, Package, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function SalesStatisticsPage() {
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    fetchSalesData();
  }, [period]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/sales-by-item?period=${period}`);
      setSalesData(response.data);
    } catch (error) {
      toast.error('Satış məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (p) => {
    switch (p) {
      case 'today': return 'Bu gün';
      case 'month': return 'Bu ay';
      case 'year': return 'Bu il';
      default: return 'Hamısı';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">Satış Statistikası</h1>
          <p className="text-[#5C665F] mt-0.5">Hansı məhsuldan nə qədər satılıb</p>
        </div>
        <div className="flex gap-2">
          {['today', 'month', 'year', 'all'].map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              onClick={() => setPeriod(p)}
              className={period === p ? 'bg-[#1A4D2E] text-white' : ''}
              data-testid={`period-${p}-btn`}
            >
              {getPeriodLabel(p)}
            </Button>
          ))}
          <Button onClick={fetchSalesData} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Yenilə
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-[#1A4D2E] to-[#2A5D3E] text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Gəlir</CardTitle>
            <TrendingUp className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{salesData?.total_revenue?.toFixed(2) || '0.00'} AZN</div>
            <p className="text-xs text-white/80 mt-0.5">{getPeriodLabel(period)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Satılan Məhsul</CardTitle>
            <Package className="h-5 w-5 text-[#4F9D69]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#181C1A]">{salesData?.total_items_sold || 0}</div>
            <p className="text-xs text-[#5C665F] mt-0.5">Ümumi ədəd</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Unikal Məhsul</CardTitle>
            <BarChart2 className="h-5 w-5 text-[#4F9D69]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#181C1A]">{salesData?.unique_items_count || 0}</div>
            <p className="text-xs text-[#5C665F] mt-0.5">Müxtəlif yemək/içki</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Orta Qiymət</CardTitle>
            <ShoppingBag className="h-5 w-5 text-[#4F9D69]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#181C1A]">
              {salesData?.total_items_sold > 0 
                ? (salesData.total_revenue / salesData.total_items_sold).toFixed(2) 
                : '0.00'} AZN
            </div>
            <p className="text-xs text-[#5C665F] mt-0.5">Məhsul başına</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#181C1A] heading-font">Məhsul Satışları - {getPeriodLabel(period)}</CardTitle>
        </CardHeader>
        <CardContent>
          {!salesData?.items || salesData.items.length === 0 ? (
            <p className="text-center text-[#5C665F] py-8">Bu dövr üçün satış məlumatı yoxdur</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F9F9F7]">
                  <tr>
                    <th className="text-left p-4 text-[#181C1A] font-semibold">#</th>
                    <th className="text-left p-4 text-[#181C1A] font-semibold">Məhsul</th>
                    <th className="text-center p-4 text-[#181C1A] font-semibold">Satılan Ədəd</th>
                    <th className="text-center p-4 text-[#181C1A] font-semibold">Sifariş Sayı</th>
                    <th className="text-right p-4 text-[#181C1A] font-semibold">Gəlir</th>
                    <th className="text-right p-4 text-[#181C1A] font-semibold">Pay (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.items.map((item, idx) => {
                    const percentage = salesData.total_revenue > 0 
                      ? ((item.total_revenue / salesData.total_revenue) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <tr key={item.id} className="border-t border-[#E6E5DF] hover:bg-[#F9F9F7]/50">
                        <td className="p-4 text-[#5C665F]">{idx + 1}</td>
                        <td className="p-4">
                          <span className="font-semibold text-[#181C1A]">{item.name}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center w-12 h-8 bg-[#F9F9F7] rounded-xl font-bold text-[#181C1A]">
                            {item.total_quantity}
                          </span>
                        </td>
                        <td className="p-4 text-center text-[#5C665F]">{item.orders_count}</td>
                        <td className="p-4 text-right font-bold text-[#181C1A]">{item.total_revenue.toFixed(2)} AZN</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-[#4F9D69] h-2 rounded-full"
                                style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-[#5C665F] w-12">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#1A4D2E] text-white">
                  <tr>
                    <td className="p-4 font-bold" colSpan="2">CƏMİ</td>
                    <td className="p-4 text-center font-bold">{salesData.total_items_sold}</td>
                    <td className="p-4 text-center">-</td>
                    <td className="p-4 text-right font-bold">{salesData.total_revenue.toFixed(2)} AZN</td>
                    <td className="p-4 text-right font-bold">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
