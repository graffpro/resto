import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, MapPin, Table2, Pencil, Trash2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VenuesTablesPage() {
  const [venues, setVenues] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVenueDialog, setShowVenueDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showQR, setShowQR] = useState(null);
  const [editingVenue, setEditingVenue] = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  const [venueForm, setVenueForm] = useState({ name: '', description: '' });
  const [tableForm, setTableForm] = useState({ table_number: '', venue_id: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [v, t] = await Promise.all([axios.get(`${API}/venues`), axios.get(`${API}/tables`)]);
      setVenues(v.data);
      setTables(t.data);
    } catch { toast.error('Məlumatlar yüklənmədi'); }
    finally { setLoading(false); }
  };

  const handleVenueSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVenue) {
        await axios.put(`${API}/venues/${editingVenue.id}`, venueForm);
        toast.success('Məkan yeniləndi');
      } else {
        await axios.post(`${API}/venues`, venueForm);
        toast.success('Məkan yaradıldı');
      }
      setShowVenueDialog(false);
      setEditingVenue(null);
      setVenueForm({ name: '', description: '' });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta baş verdi'); }
  };

  const handleTableSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTable) {
        await axios.put(`${API}/tables/${editingTable.id}`, tableForm);
        toast.success('Masa yeniləndi');
      } else {
        await axios.post(`${API}/tables`, tableForm);
        toast.success('Masa yaradıldı');
      }
      setShowTableDialog(false);
      setEditingTable(null);
      setTableForm({ table_number: '', venue_id: '' });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta baş verdi'); }
  };

  const deleteVenue = async (id) => {
    if (!window.confirm('Bu məkanı silmək istəyirsiniz?')) return;
    try { await axios.delete(`${API}/venues/${id}`); toast.success('Məkan silindi'); fetchAll(); }
    catch { toast.error('Xəta baş verdi'); }
  };

  const deleteTable = async (id) => {
    if (!window.confirm('Bu masanı silmək istəyirsiniz?')) return;
    try { await axios.delete(`${API}/tables/${id}`); toast.success('Masa silindi'); fetchAll(); }
    catch { toast.error('Xəta baş verdi'); }
  };

  const openEditVenue = (v) => { setEditingVenue(v); setVenueForm({ name: v.name, description: v.description || '' }); setShowVenueDialog(true); };
  const openEditTable = (t) => { setEditingTable(t); setTableForm({ table_number: t.table_number, venue_id: t.venue_id }); setShowTableDialog(true); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent" /></div>;

  return (
    <div data-testid="venues-tables-page">
      {/* Venues Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="heading-font text-lg font-medium text-[#181C1A] tracking-tight">Məkanlar</h2>
            <p className="text-xs text-[#8A948D]">{venues.length} məkan</p>
          </div>
          <Button onClick={() => { setEditingVenue(null); setVenueForm({ name: '', description: '' }); setShowVenueDialog(true); }} className="bg-[#2A3A2C] hover:bg-[#1A251E] text-white text-xs h-8 px-3 rounded-xl" data-testid="add-venue-btn">
            <Plus className="w-3.5 h-3.5 mr-1" /> Məkan
          </Button>
        </div>
        {venues.length === 0 ? (
          <div className="bg-white border border-[#E6E5DF] rounded-2xl p-10 text-center">
            <MapPin className="w-8 h-8 text-[#D1D0C8] mx-auto mb-2" />
            <p className="text-sm text-[#8A948D]">Məkan yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {venues.map(v => (
              <div key={v.id} className="bg-white border border-[#E6E5DF] rounded-xl p-4 hover:shadow-sm transition-all" data-testid={`venue-card-${v.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#2A3A2C]/10 text-[#2A3A2C] flex items-center justify-center"><MapPin className="w-4 h-4" /></div>
                    <div>
                      <h3 className="text-sm font-medium text-[#181C1A]">{v.name}</h3>
                      {v.description && <p className="text-[11px] text-[#8A948D]">{v.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditVenue(v)} className="h-7 w-7 p-0 text-[#5C665F] hover:text-[#181C1A]"><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteVenue(v.id)} className="h-7 w-7 p-0 text-[#B74134] hover:text-red-700"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-[#E6E5DF]/60">
                  <span className="text-[11px] text-[#8A948D]">{tables.filter(t => t.venue_id === v.id).length} masa</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tables Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="heading-font text-lg font-medium text-[#181C1A] tracking-tight">Masalar</h2>
            <p className="text-xs text-[#8A948D]">{tables.length} masa</p>
          </div>
          <Button onClick={() => { setEditingTable(null); setTableForm({ table_number: '', venue_id: venues[0]?.id || '' }); setShowTableDialog(true); }} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white text-xs h-8 px-3 rounded-xl" disabled={venues.length === 0} data-testid="add-table-btn">
            <Plus className="w-3.5 h-3.5 mr-1" /> Masa
          </Button>
        </div>
        {tables.length === 0 ? (
          <div className="bg-white border border-[#E6E5DF] rounded-2xl p-10 text-center">
            <Table2 className="w-8 h-8 text-[#D1D0C8] mx-auto mb-2" />
            <p className="text-sm text-[#8A948D]">Masa yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {tables.map(t => {
              const venue = venues.find(v => v.id === t.venue_id);
              return (
                <div key={t.id} className="bg-white border border-[#E6E5DF] rounded-xl p-3 text-center hover:shadow-sm transition-all" data-testid={`table-card-${t.id}`}>
                  <div className="text-lg font-semibold text-[#181C1A] heading-font mb-1">#{t.table_number}</div>
                  <p className="text-[10px] text-[#8A948D] mb-2">{venue?.name || '-'}</p>
                  <div className="flex gap-1 justify-center">
                    <Button variant="ghost" size="sm" onClick={() => setShowQR(t)} className="h-6 w-6 p-0 text-[#4A6B8C]"><QrCode className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditTable(t)} className="h-6 w-6 p-0 text-[#5C665F]"><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteTable(t.id)} className="h-6 w-6 p-0 text-[#B74134]"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Venue Dialog */}
      <Dialog open={showVenueDialog} onOpenChange={v => { setShowVenueDialog(v); if (!v) setEditingVenue(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">{editingVenue ? 'Məkanı Redaktə Et' : 'Yeni Məkan'}</DialogTitle></DialogHeader>
          <form onSubmit={handleVenueSubmit} className="space-y-3">
            <div><Label className="text-xs text-[#5C665F]">Ad *</Label><Input value={venueForm.name} onChange={e => setVenueForm({...venueForm, name: e.target.value})} required className="h-9 text-sm mt-1 rounded-xl" data-testid="venue-name-input" /></div>
            <div><Label className="text-xs text-[#5C665F]">Açıqlama</Label><Input value={venueForm.description} onChange={e => setVenueForm({...venueForm, description: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowVenueDialog(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-[#2A3A2C] hover:bg-[#1A251E] text-white rounded-xl">{editingVenue ? 'Yadda saxla' : 'Yarat'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={v => { setShowTableDialog(v); if (!v) setEditingTable(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">{editingTable ? 'Masanı Redaktə Et' : 'Yeni Masa'}</DialogTitle></DialogHeader>
          <form onSubmit={handleTableSubmit} className="space-y-3">
            <div><Label className="text-xs text-[#5C665F]">Masa Nömrəsi *</Label><Input value={tableForm.table_number} onChange={e => setTableForm({...tableForm, table_number: e.target.value})} required className="h-9 text-sm mt-1 rounded-xl" data-testid="table-number-input" /></div>
            <div>
              <Label className="text-xs text-[#5C665F]">Məkan *</Label>
              <select value={tableForm.venue_id} onChange={e => setTableForm({...tableForm, venue_id: e.target.value})} required className="w-full h-9 text-sm mt-1 rounded-xl border border-[#E6E5DF] px-3 bg-white" data-testid="table-venue-select">
                <option value="">Seçin</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowTableDialog(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl">{editingTable ? 'Yadda saxla' : 'Yarat'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={!!showQR} onOpenChange={() => setShowQR(null)}>
        <DialogContent className="max-w-xs rounded-2xl text-center">
          <DialogHeader><DialogTitle className="heading-font text-base">Masa #{showQR?.table_number} - QR Kod</DialogTitle></DialogHeader>
          {showQR?.qr_code && <img src={showQR.qr_code} alt="QR Code" className="w-48 h-48 mx-auto" />}
          <Button onClick={() => window.print()} size="sm" className="bg-[#2A3A2C] hover:bg-[#1A251E] text-white rounded-xl mx-auto">Çap et</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
