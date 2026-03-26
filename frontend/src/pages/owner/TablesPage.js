import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ table_number: '', venue_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tablesRes, venuesRes] = await Promise.all([
        axios.get(`${API}/tables`),
        axios.get(`${API}/venues`)
      ]);
      setTables(tablesRes.data);
      setVenues(venuesRes.data);
    } catch (error) {
      toast.error('Məlumat yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tables`, formData);
      toast.success('Masa əlavə edildi və QR kod yaradıldı');
      setDialogOpen(false);
      setFormData({ table_number: '', venue_id: '' });
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Masanı silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API}/tables/${id}`);
      toast.success('Masa silindi');
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const downloadQR = (table) => {
    const link = document.createElement('a');
    link.href = table.qr_code;
    link.download = `table-${table.table_number}-qr.png`;
    link.click();
  };

  const getVenueName = (venueId) => {
    const venue = venues.find(v => v.id === venueId);
    return venue ? venue.name : '';
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font">{az.tables}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md" data-testid="add-table-button">
              <Plus className="w-4 h-4 mr-2" />
              {az.addTable}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-[#1A4D2E] heading-font">{az.addTable}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="table_number">{az.tableNumber} *</Label>
                <Input id="table_number" value={formData.table_number} onChange={(e) => setFormData(prev => ({ ...prev, table_number: e.target.value }))} required data-testid="table-number-input" />
              </div>
              <div>
                <Label htmlFor="venue_id">Məkan *</Label>
                <Select value={formData.venue_id} onValueChange={(value) => setFormData(prev => ({ ...prev, venue_id: value }))} required>
                  <SelectTrigger data-testid="venue-select">
                    <SelectValue placeholder="Məkan seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map(venue => (
                      <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white" data-testid="save-table-button">
                {az.save}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tables.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">Hələ masa yoxdur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map(table => (
            <div key={table.id} className="bg-white border border-[#E2E8E2] rounded-xl p-6" data-testid={`table-card-${table.id}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#1A4D2E]">Masa {table.table_number}</h3>
              </div>
              <p className="text-sm text-[#5C6B61] mb-4">Məkan: {getVenueName(table.venue_id)}</p>
              <div className="mb-4 p-4 bg-[#F5F9E9] rounded-lg flex justify-center">
                <img src={table.qr_code} alt="QR Code" className="w-32 h-32" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadQR(table)} className="flex-1" data-testid={`download-qr-${table.id}`}>
                  <Download className="w-4 h-4 mr-1" />
                  QR Yüklə
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(table.id)} data-testid={`delete-table-${table.id}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}