import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, Star, Calendar, Clock, TrendingUp, Plus, Minus, Award, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

const SHIFT_TYPES = [
  { value: 'work', label: 'İş günü', color: 'bg-[#3E6A4B]/10 text-[#3E6A4B]' },
  { value: 'rest', label: 'İstirahət', color: 'bg-[#4A6B8C]/10 text-[#4A6B8C]' },
  { value: 'absent', label: 'İşə gəlməyib', color: 'bg-[#B74134]/10 text-[#B74134]' },
  { value: 'late', label: 'Gecikib', color: 'bg-[#D48B30]/10 text-[#D48B30]' },
];

export default function StaffManagementPage() {
  const [staff, setStaff] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [shiftLogs, setShiftLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPointsDialog, setShowPointsDialog] = useState(false);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [pointsForm, setPointsForm] = useState({ points: 0, reason: '' });
  const [shiftForm, setShiftForm] = useState({ date: new Date().toISOString().split('T')[0], shift_type: 'work', start_time: '09:00', end_time: '18:00', notes: '' });

  const fetchData = useCallback(async () => {
    try {
      const [perfRes, shiftsRes] = await Promise.all([
        axios.get(`${API}/analytics/staff-performance?period=${period}`),
        axios.get(`${API}/shifts`)
      ]);
      setPerformance(perfRes.data);
      setShiftLogs(shiftsRes.data);
    } catch { toast.error('Məlumatlar yüklənmədi'); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openPointsDialog = (user) => {
    setSelectedUser(user);
    setPointsForm({ points: 0, reason: '' });
    setShowPointsDialog(true);
  };

  const openShiftDialog = (user) => {
    setSelectedUser(user);
    setShiftForm({ date: new Date().toISOString().split('T')[0], shift_type: 'work', start_time: '09:00', end_time: '18:00', notes: '' });
    setShowShiftDialog(true);
  };

  const openHistory = async (user) => {
    setSelectedUser(user);
    try {
      const res = await axios.get(`${API}/points/${user.id}`);
      setPointsHistory(res.data);
    } catch { setPointsHistory([]); }
    setShowHistoryDialog(true);
  };

  const submitPoints = async (e) => {
    e.preventDefault();
    if (pointsForm.points === 0) return toast.error('Xal dəyəri 0 ola bilməz');
    try {
      await axios.post(`${API}/points`, { user_id: selectedUser.id, points: pointsForm.points, reason: pointsForm.reason });
      toast.success('Xal əlavə edildi');
      setShowPointsDialog(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta'); }
  };

  const submitShift = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/shifts`, { user_id: selectedUser.id, ...shiftForm });
      toast.success('Növbə qeydə alındı');
      setShowShiftDialog(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta'); }
  };

  const deleteShift = async (id) => {
    try { await axios.delete(`${API}/shifts/${id}`); toast.success('Silindi'); fetchData(); }
    catch { toast.error('Xəta'); }
  };

  const getShiftBadge = (type) => {
    const s = SHIFT_TYPES.find(t => t.value === type);
    return s ? <Badge className={`text-[10px] rounded-full ${s.color}`}>{s.label}</Badge> : <Badge>{type}</Badge>;
  };

  const userShifts = (userId) => shiftLogs.filter(s => s.user_id === userId);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent" /></div>;

  return (
    <div data-testid="staff-management-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">Personal İdarəetmə</h1>
          <p className="text-xs text-[#8A948D] mt-0.5">{performance.length} işçi</p>
        </div>
        <div className="flex gap-1.5">
          {[
            { key: 'today', label: 'Bu gün' },
            { key: 'week', label: 'Həftə' },
            { key: 'month', label: 'Ay' },
            { key: 'year', label: 'İl' },
          ].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`h-8 px-3 text-xs rounded-xl border transition-all ${period === p.key ? 'bg-[#2A3A2C] text-white border-[#2A3A2C]' : 'bg-white text-[#5C665F] border-[#E6E5DF] hover:border-[#2A3A2C]'}`}
              data-testid={`period-${p.key}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-[#4A6B8C]" /><span className="text-[10px] text-[#8A948D] uppercase tracking-wider">Ümumi İşçi</span></div>
          <p className="text-xl font-semibold text-[#181C1A] heading-font">{performance.length}</p>
        </div>
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-[#D48B30]" /><span className="text-[10px] text-[#8A948D] uppercase tracking-wider">Ümumi Xal</span></div>
          <p className="text-xl font-semibold text-[#181C1A] heading-font">{performance.reduce((s, p) => s + p.points, 0)}</p>
        </div>
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-[#3E6A4B]" /><span className="text-[10px] text-[#8A948D] uppercase tracking-wider">Çatdırılmış</span></div>
          <p className="text-xl font-semibold text-[#181C1A] heading-font">{performance.reduce((s, p) => s + p.delivered_orders, 0)}</p>
        </div>
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-[#C05C3D]" /><span className="text-[10px] text-[#8A948D] uppercase tracking-wider">Ort. Çatdırma</span></div>
          <p className="text-xl font-semibold text-[#181C1A] heading-font">
            {performance.length > 0 ? (performance.reduce((s, p) => s + p.avg_delivery_time, 0) / performance.length).toFixed(1) : 0} dəq
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      {performance.length === 0 ? (
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-12 text-center">
          <Users className="w-10 h-10 text-[#D1D0C8] mx-auto mb-3" />
          <p className="text-sm text-[#8A948D]">Ofisiant tapılmadı</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E6E5DF] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F9F9F7]">
              <tr>
                <th className="text-left p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">#</th>
                <th className="text-left p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">İşçi</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Xal</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Sifarişlər</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Ort. Vaxt</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Növbə</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">İstirahət</th>
                <th className="text-right p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((p, idx) => {
                const shifts = userShifts(p.id);
                const restDays = shifts.filter(s => s.shift_type === 'rest').length + (p.rest_days?.length || 0);
                const absentDays = shifts.filter(s => s.shift_type === 'absent').length;
                return (
                  <tr key={p.id} className="border-t border-[#E6E5DF] hover:bg-[#F9F9F7] transition-colors" data-testid={`staff-row-${p.id}`}>
                    <td className="p-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-[#D48B30]/10 text-[#D48B30]' : idx === 1 ? 'bg-[#8A948D]/10 text-[#8A948D]' : idx === 2 ? 'bg-[#C05C3D]/10 text-[#C05C3D]' : 'bg-[#F9F9F7] text-[#8A948D]'}`}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.is_active ? 'bg-[#3E6A4B]/10 text-[#3E6A4B]' : 'bg-[#B74134]/10 text-[#B74134]'}`}>
                          {p.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#181C1A]">{p.name}</p>
                          {!p.is_active && <span className="text-[10px] text-[#B74134]">Deaktiv</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#D48B30]">
                        <Star className="w-3 h-3" /> {p.points}
                      </span>
                    </td>
                    <td className="p-3 text-center text-sm text-[#181C1A]">{p.delivered_orders}</td>
                    <td className="p-3 text-center text-sm text-[#5C665F]">{p.avg_delivery_time} dəq</td>
                    <td className="p-3 text-center">
                      <span className="text-xs text-[#5C665F]">{shifts.filter(s => s.shift_type === 'work').length} gün</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-[#4A6B8C]">{restDays}</span>
                        {absentDays > 0 && <Badge className="text-[9px] bg-[#B74134]/10 text-[#B74134] rounded-full px-1">{absentDays} qayıb</Badge>}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" onClick={() => openPointsDialog(p)} className="h-7 text-[10px] px-2 rounded-lg border-[#E6E5DF]" data-testid={`add-points-${p.id}`}>
                          <Star className="w-3 h-3 mr-0.5 text-[#D48B30]" /> Xal
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openShiftDialog(p)} className="h-7 text-[10px] px-2 rounded-lg border-[#E6E5DF]" data-testid={`add-shift-${p.id}`}>
                          <Calendar className="w-3 h-3 mr-0.5 text-[#4A6B8C]" /> Növbə
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openHistory(p)} className="h-7 text-[10px] px-2 rounded-lg border-[#E6E5DF]" data-testid={`view-history-${p.id}`}>
                          <TrendingUp className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Shifts Log */}
      {shiftLogs.length > 0 && (
        <div className="mt-6">
          <h2 className="heading-font text-base font-medium text-[#181C1A] mb-3">Son Növbə Qeydləri</h2>
          <div className="bg-white border border-[#E6E5DF] rounded-2xl overflow-hidden">
            <div className="divide-y divide-[#E6E5DF]">
              {shiftLogs.slice(0, 10).map(log => {
                const user = performance.find(p => p.id === log.user_id);
                return (
                  <div key={log.id} className="flex items-center justify-between p-3 hover:bg-[#F9F9F7]" data-testid={`shift-log-${log.id}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#181C1A]">{user?.name || 'Naməlum'}</span>
                      {getShiftBadge(log.shift_type)}
                      <span className="text-[11px] text-[#8A948D]">{log.date}</span>
                      {log.start_time && <span className="text-[10px] text-[#8A948D]">{log.start_time} - {log.end_time}</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteShift(log.id)} className="h-6 w-6 p-0 text-[#B74134]">×</Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Points Dialog */}
      <Dialog open={showPointsDialog} onOpenChange={setShowPointsDialog}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">{selectedUser?.name} - Xal</DialogTitle></DialogHeader>
          <form onSubmit={submitPoints} className="space-y-3">
            <div>
              <Label className="text-xs text-[#5C665F]">Xal (mənfi = çıx)</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setPointsForm(p => ({...p, points: p.points - 1}))} className="h-9 w-9 p-0 rounded-xl"><Minus className="w-3 h-3" /></Button>
                <Input type="number" value={pointsForm.points} onChange={e => setPointsForm(p => ({...p, points: parseInt(e.target.value) || 0}))} className="h-9 text-sm text-center rounded-xl" />
                <Button type="button" variant="outline" size="sm" onClick={() => setPointsForm(p => ({...p, points: p.points + 1}))} className="h-9 w-9 p-0 rounded-xl"><Plus className="w-3 h-3" /></Button>
              </div>
              <div className="flex gap-1 mt-2">
                {[1, 5, 10, -5, -10].map(v => (
                  <button key={v} type="button" onClick={() => setPointsForm(p => ({...p, points: v}))}
                    className={`flex-1 h-7 text-[10px] rounded-lg border transition-all ${pointsForm.points === v ? 'bg-[#C05C3D] text-white border-[#C05C3D]' : 'border-[#E6E5DF] text-[#5C665F]'}`}>
                    {v > 0 ? `+${v}` : v}
                  </button>
                ))}
              </div>
            </div>
            <div><Label className="text-xs text-[#5C665F]">Səbəb *</Label><Input value={pointsForm.reason} onChange={e => setPointsForm(p => ({...p, reason: e.target.value}))} required placeholder="Yaxşı xidmət, gecikmə..." className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPointsDialog(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl" data-testid="submit-points">Təsdiqlə</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shift Dialog */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">{selectedUser?.name} - Növbə</DialogTitle></DialogHeader>
          <form onSubmit={submitShift} className="space-y-3">
            <div><Label className="text-xs text-[#5C665F]">Tarix</Label><Input type="date" value={shiftForm.date} onChange={e => setShiftForm(p => ({...p, date: e.target.value}))} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div>
              <Label className="text-xs text-[#5C665F]">Tip</Label>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {SHIFT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setShiftForm(p => ({...p, shift_type: t.value}))}
                    className={`h-8 text-xs rounded-xl border transition-all ${shiftForm.shift_type === t.value ? 'bg-[#2A3A2C] text-white border-[#2A3A2C]' : 'bg-white text-[#5C665F] border-[#E6E5DF]'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {(shiftForm.shift_type === 'work' || shiftForm.shift_type === 'late') && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-[#5C665F]">Başlanğıc</Label><Input type="time" value={shiftForm.start_time} onChange={e => setShiftForm(p => ({...p, start_time: e.target.value}))} className="h-9 text-sm mt-1 rounded-xl" /></div>
                <div><Label className="text-xs text-[#5C665F]">Son</Label><Input type="time" value={shiftForm.end_time} onChange={e => setShiftForm(p => ({...p, end_time: e.target.value}))} className="h-9 text-sm mt-1 rounded-xl" /></div>
              </div>
            )}
            <div><Label className="text-xs text-[#5C665F]">Qeyd</Label><Input value={shiftForm.notes} onChange={e => setShiftForm(p => ({...p, notes: e.target.value}))} placeholder="Əlavə qeyd..." className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowShiftDialog(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-[#2A3A2C] hover:bg-[#1A251E] text-white rounded-xl" data-testid="submit-shift">Qeydə al</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Points History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">{selectedUser?.name} - Xal Tarixçəsi</DialogTitle></DialogHeader>
          {pointsHistory.length === 0 ? (
            <p className="text-xs text-[#8A948D] text-center py-6">Tarixçə yoxdur</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pointsHistory.map(h => (
                <div key={h.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F9F9F7] border border-[#E6E5DF]">
                  <div>
                    <p className="text-xs text-[#181C1A]">{h.reason}</p>
                    <p className="text-[10px] text-[#8A948D]">{new Date(h.created_at).toLocaleDateString('az-AZ')}</p>
                  </div>
                  <span className={`text-sm font-semibold ${h.points >= 0 ? 'text-[#3E6A4B]' : 'text-[#B74134]'}`}>
                    {h.points > 0 ? `+${h.points}` : h.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
