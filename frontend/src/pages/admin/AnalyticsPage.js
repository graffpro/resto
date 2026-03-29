import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/detailed`);
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Analitika yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${Math.round(minutes)} dəq`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}s ${mins}dəq`;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font">{az.detailedAnalytics}</h1>
        <Button onClick={fetchAnalytics} className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md">
          <RefreshCw className="w-4 h-4 mr-2" />
          Yenilə
        </Button>
      </div>

      {analytics.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">Hələ məlumat yoxdur</p>
        </div>
      ) : (
        <div className="space-y-4">
          {analytics.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-[#1A4D2E] flex items-center justify-between">
                  <span>Masa {item.table?.table_number} - {item.venue?.name}</span>
                  <span className="text-sm font-normal text-[#5C6B61]">
                    Sifariş #{item.order?.order_number}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-[#5C6B61] mb-1">Sifariş vaxtı</p>
                    <p className="text-sm font-semibold">
                      {item.order?.ordered_at ? new Date(item.order.ordered_at).toLocaleString('az-AZ') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5C6B61] mb-1">Hazırlıq vaxtı</p>
                    <p className="text-sm font-semibold text-orange-600">
                      {formatTime(item.preparation_time_minutes)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5C6B61] mb-1">Çatdırılma vaxtı</p>
                    <p className="text-sm font-semibold text-green-600">
                      {formatTime(item.delivery_time_minutes)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5C6B61] mb-1">Ofisiant</p>
                    <p className="text-sm font-semibold">
                      {item.waiter?.full_name || '-'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#E2E8E2]">
                  <p className="text-xs text-[#5C6B61] mb-2">Sifarişlər:</p>
                  <div className="space-y-1">
                    {item.order?.items?.map((orderItem, idx) => (
                      <p key={idx} className="text-sm">
                        {orderItem.name} x{orderItem.quantity} - {orderItem.price * orderItem.quantity} AZN
                      </p>
                    ))}
                  </div>
                  <p className="text-lg font-bold text-[#1A4D2E] mt-2">
                    Cəmi: {item.order?.total_amount} AZN
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}