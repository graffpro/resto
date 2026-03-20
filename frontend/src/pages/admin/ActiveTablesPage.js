import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, XCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ActiveTablesPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
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

  const closeSession = async (sessionId) => {
    if (!window.confirm('Hesabı bağlamaq istədiyinizə əminsiniz?')) return;
    try {
      await axios.post(`${API}/sessions/close/${sessionId}`);
      toast.success('Hesab bağlandı');
      fetchSessions();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const continueSession = async (sessionId) => {
    try {
      await axios.post(`${API}/sessions/continue/${sessionId}`);
      toast.success('Stol davam etdirilir');
      fetchSessions();
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

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font">{az.activeTables}</h1>
        <Button onClick={fetchSessions} className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md">
          <RefreshCw className="w-4 h-4 mr-2" />
          Yenilə
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">Hazırda aktiv stol yoxdur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(({ session, table, venue, active_orders }) => (
            <div key={session.id} className="bg-white border border-[#E2E8E2] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#1A4D2E]">
                  Stol {table?.table_number}
                </h3>
                <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-[#5C6B61] text-sm">
                  <strong>Məkan:</strong> {venue?.name}
                </p>
                <p className="text-[#5C6B61] text-sm">
                  <strong>Başlama:</strong> {getTimeAgo(session.started_at)}
                </p>
                <p className="text-[#5C6B61] text-sm">
                  <strong>Aktiv sifarişlər:</strong> {active_orders}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => closeSession(session.id)}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Bağla
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}