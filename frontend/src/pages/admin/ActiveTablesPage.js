import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, XCircle, Eye, Clock, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ActiveTablesPage() {
  const [sessions, setSessions] = useState([]);
  const [closedSessions, setClosedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchClosedSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API}/sessions/active`);
      setSessions(response.data);
      if (loading) setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchClosedSessions = async () => {
    try {
      const response = await axios.get(`${API}/sessions/history`);
      setClosedSessions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      setDetailsLoading(true);
      const response = await axios.get(`${API}/sessions/${sessionId}/details`);
      setSessionDetails(response.data);
    } catch (error) {
      toast.error('Detallar yüklənmədi');
    } finally {
      setDetailsLoading(false);
    }
  };

  const openDetails = (session) => {
    setSelectedSession(session);
    fetchSessionDetails(session.id);
  };

  const closeSession = async (sessionId) => {
    if (!window.confirm('Hesabı bağlamaq istədiyinizə əminsiniz?')) return;
    try {
      await axios.post(`${API}/sessions/close/${sessionId}`);
      toast.success('Hesab bağlandı');
      fetchSessions();
      fetchClosedSessions();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = new Date() - new Date(dateStr);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} ${az.minutes}`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ${az.hours}`;
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
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  const displaySessions = showClosed ? closedSessions : sessions.map(s => ({ ...s, isActive: true }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font">{az.activeTables}</h1>
        <div className="flex gap-2">
          <Button
            variant={!showClosed ? 'default' : 'outline'}
            onClick={() => setShowClosed(false)}
            className={!showClosed ? 'bg-[#1A4D2E] text-white' : ''}
          >
            Aktiv ({sessions.length})
          </Button>
          <Button
            variant={showClosed ? 'default' : 'outline'}
            onClick={() => setShowClosed(true)}
            className={showClosed ? 'bg-[#1A4D2E] text-white' : ''}
          >
            Bağlanmış ({closedSessions.length})
          </Button>
          <Button onClick={fetchSessions} className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md">
            <RefreshCw className="w-4 h-4 mr-2" />
            Yenilə
          </Button>
        </div>
      </div>

      {displaySessions.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">
            {showClosed ? 'Bağlanmış stol yoxdur' : 'Hazırda aktiv stol yoxdur'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displaySessions.map((item) => {
            const session = item.session || item;
            const table = item.table;
            const venue = item.venue;
            const active_orders = item.active_orders || item.orders_count || 0;
            const isActive = item.isActive || session.is_active;
            
            return (
              <div 
                key={session.id} 
                className={`bg-white border rounded-xl p-6 cursor-pointer hover:shadow-lg transition-shadow ${
                  isActive ? 'border-green-300' : 'border-[#E2E8E2]'
                }`}
                onClick={() => openDetails(session)}
                data-testid={`session-card-${session.id}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[#1A4D2E]">
                    Stol {table?.table_number}
                  </h3>
                  <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {isActive ? 'Aktiv' : 'Bağlı'}
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-[#5C6B61] text-sm">
                    <strong>Məkan:</strong> {venue?.name}
                  </p>
                  <p className="text-[#5C6B61] text-sm">
                    <strong>Başlama:</strong> {getTimeAgo(session.started_at)}
                  </p>
                  <p className="text-[#5C6B61] text-sm">
                    <strong>Sifarişlər:</strong> {active_orders}
                  </p>
                  {item.total_revenue !== undefined && (
                    <p className="text-[#1A4D2E] font-semibold">
                      Cəmi: {item.total_revenue?.toFixed(2)} AZN
                    </p>
                  )}
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDetails(session)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Detallara Bax
                  </Button>
                  {isActive && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => closeSession(session.id)}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => { setSelectedSession(null); setSessionDetails(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1A4D2E] heading-font text-2xl">
              Stol {sessionDetails?.table?.table_number} - Sifariş Detalları
            </DialogTitle>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A4D2E]"></div>
            </div>
          ) : sessionDetails ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#F5F9E9] rounded-lg p-4 text-center">
                  <p className="text-sm text-[#5C6B61]">Məkan</p>
                  <p className="font-bold text-[#1A4D2E]">{sessionDetails.venue?.name}</p>
                </div>
                <div className="bg-[#F5F9E9] rounded-lg p-4 text-center">
                  <p className="text-sm text-[#5C6B61]">Sifariş Sayı</p>
                  <p className="font-bold text-[#1A4D2E]">{sessionDetails.orders?.length || 0}</p>
                </div>
                <div className="bg-[#1A4D2E] rounded-lg p-4 text-center text-white">
                  <p className="text-sm opacity-80">Ümumi Məbləğ</p>
                  <p className="font-bold text-xl">{sessionDetails.total_amount?.toFixed(2)} AZN</p>
                </div>
              </div>

              {/* Orders */}
              {sessionDetails.orders && sessionDetails.orders.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-[#1A4D2E] flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Sifarişlər
                  </h3>
                  {sessionDetails.orders.map((order, idx) => (
                    <div key={order.id} className="border border-[#E2E8E2] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-[#1A4D2E]">#{order.order_number}</span>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-[#5C6B61]">
                              {item.name} x{item.quantity}
                            </span>
                            <span className="font-semibold text-[#1A4D2E]">
                              {(item.price * item.quantity).toFixed(2)} AZN
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-[#E2E8E2]">
                        <div className="flex items-center gap-2 text-xs text-[#5C6B61]">
                          <Clock className="w-3 h-3" />
                          {new Date(order.ordered_at).toLocaleTimeString('az-AZ')}
                        </div>
                        <span className="font-bold text-[#1A4D2E]">
                          {order.total_amount?.toFixed(2)} AZN
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#5C6B61] py-4">Bu stolda hələ sifariş yoxdur</p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}