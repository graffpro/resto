import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Calendar, PieChart, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function FinancialReportPage() {
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      });
      const response = await axios.get(`${API}/analytics/financial?${params}`);
      setFinancialData(response.data);
    } catch (error) {
      toast.error('Maliyyə məlumatları yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const setPresetRange = (preset) => {
    const today = new Date();
    let start_date, end_date = today.toISOString().split('T')[0];
    
    switch (preset) {
      case 'today':
        start_date = end_date;
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start_date = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        start_date = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'year':
        start_date = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      default:
        return;
    }
    setDateRange({ start_date, end_date });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent border-[#1A4D2E]"></div></div>;
  }

  return (
    <div className="print:bg-white">
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">Maliyyə Hesabatı</h1>
          <p className="text-[#5C665F] mt-0.5">Gəlir, xərc və mənfəət analizi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPresetRange('today')}>Bu gün</Button>
          <Button variant="outline" onClick={() => setPresetRange('week')}>Həftə</Button>
          <Button variant="outline" onClick={() => setPresetRange('month')}>Ay</Button>
          <Button variant="outline" onClick={() => setPresetRange('year')}>İl</Button>
          <Button onClick={handlePrint} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white">
            <Printer className="w-4 h-4 mr-2" />
            Çap
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-8 print:hidden">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#5C665F]" />
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange(p => ({ ...p, start_date: e.target.value }))}
            className="border border-[#E6E5DF] rounded-xl px-3 py-2"
          />
          <span className="text-[#5C665F]">-</span>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange(p => ({ ...p, end_date: e.target.value }))}
            className="border border-[#E6E5DF] rounded-xl px-3 py-2"
          />
          <Button variant="outline" onClick={fetchFinancialData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-2xl font-bold">Maliyyə Hesabatı</h1>
        <p className="text-gray-600">{dateRange.start_date} - {dateRange.end_date}</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-[#1A4D2E] to-[#2A5D3E] text-white print:border print:border-gray-300 print:bg-white print:text-black">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Gəlir</CardTitle>
            <TrendingUp className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{financialData?.total_revenue?.toFixed(2) || '0.00'} AZN</div>
            <p className="text-xs text-white/80 print:text-gray-500 mt-0.5">{financialData?.orders_count || 0} sifariş</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#E76F51] to-[#D4533C] text-white print:border print:border-gray-300 print:bg-white print:text-black">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Xərclər</CardTitle>
            <TrendingDown className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{financialData?.total_expenses?.toFixed(2) || '0.00'} AZN</div>
            <p className="text-xs text-white/80 print:text-gray-500 mt-0.5">{financialData?.expenses_count || 0} xərc qeydi</p>
          </CardContent>
        </Card>

        <Card className={`text-white print:border print:border-gray-300 print:bg-white print:text-black ${
          (financialData?.net_profit || 0) >= 0 
            ? 'bg-gradient-to-br from-[#4F9D69] to-[#3A7D52]' 
            : 'bg-gradient-to-br from-red-600 to-red-700'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Xalis Mənfəət</CardTitle>
            <DollarSign className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(financialData?.net_profit || 0) >= 0 ? '+' : ''}{financialData?.net_profit?.toFixed(2) || '0.00'} AZN
            </div>
            <p className="text-xs text-white/80 print:text-gray-500 mt-0.5">
              Mənfəət marjası: {financialData?.profit_margin?.toFixed(1) || '0'}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#181C1A] heading-font flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Xərc Kateqoriyaları
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financialData?.expense_by_category && Object.keys(financialData.expense_by_category).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(financialData.expense_by_category).map(([category, amount]) => {
                  const percentage = ((amount / financialData.total_expenses) * 100).toFixed(1);
                  const colors = {
                    'Kommunal': 'bg-blue-500',
                    'Ərzaq': 'bg-green-500',
                    'Əməkhaqqı': 'bg-purple-500',
                    'İcarə': 'bg-orange-500',
                    'Təmir': 'bg-yellow-500',
                    'Digər': 'bg-gray-500'
                  };
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#181C1A]">{category}</span>
                        <span className="text-sm text-[#5C665F]">{amount.toFixed(2)} AZN ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colors[category] || 'bg-gray-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-[#5C665F] py-8">Xərc qeydə alınmayıb</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#181C1A] heading-font">Maliyyə Xülasəsi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-[#E6E5DF]">
                <span className="text-[#5C665F]">Ümumi Gəlir</span>
                <span className="font-semibold text-[#181C1A]">+{financialData?.total_revenue?.toFixed(2) || '0.00'} AZN</span>
              </div>
              <div className="flex justify-between py-3 border-b border-[#E6E5DF]">
                <span className="text-[#5C665F]">Ümumi Xərclər</span>
                <span className="font-semibold text-[#E76F51]">-{financialData?.total_expenses?.toFixed(2) || '0.00'} AZN</span>
              </div>
              <div className="flex justify-between py-3 bg-[#F9F9F7] -mx-4 px-4 rounded-lg">
                <span className="font-bold text-[#181C1A]">Xalis Mənfəət</span>
                <span className={`font-bold ${(financialData?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(financialData?.net_profit || 0) >= 0 ? '+' : ''}{financialData?.net_profit?.toFixed(2) || '0.00'} AZN
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-[#E6E5DF]">
                <div className="flex justify-between">
                  <span className="text-[#5C665F]">Orta Sifariş Dəyəri</span>
                  <span className="font-medium text-[#181C1A]">
                    {financialData?.orders_count > 0 
                      ? (financialData.total_revenue / financialData.orders_count).toFixed(2) 
                      : '0.00'} AZN
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#181C1A] heading-font">Performans Göstəriciləri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-[#F9F9F7] rounded-lg">
              <div className="text-2xl font-bold text-[#181C1A]">{financialData?.orders_count || 0}</div>
              <div className="text-sm text-[#5C665F]">Sifariş Sayı</div>
            </div>
            <div className="text-center p-4 bg-[#F9F9F7] rounded-lg">
              <div className="text-2xl font-bold text-[#181C1A]">
                {financialData?.orders_count > 0 
                  ? (financialData.total_revenue / financialData.orders_count).toFixed(2) 
                  : '0.00'}
              </div>
              <div className="text-sm text-[#5C665F]">Orta Çek (AZN)</div>
            </div>
            <div className="text-center p-4 bg-[#F9F9F7] rounded-lg">
              <div className="text-2xl font-bold text-[#181C1A]">{financialData?.expenses_count || 0}</div>
              <div className="text-sm text-[#5C665F]">Xərc Qeydləri</div>
            </div>
            <div className="text-center p-4 bg-[#F9F9F7] rounded-lg">
              <div className={`text-2xl font-bold ${(financialData?.profit_margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {financialData?.profit_margin?.toFixed(1) || '0'}%
              </div>
              <div className="text-sm text-[#5C665F]">Mənfəət Marjası</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
