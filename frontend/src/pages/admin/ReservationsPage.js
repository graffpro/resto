import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Phone, Mail, Users, Calendar, Clock, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    table_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    reservation_date: '',
    reservation_time: '',
    guest_count: 2,
    special_requests: ''
  });
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resResponse, tablesResponse, venuesResponse] = await Promise.all([
        axios.get(`${API}/reservations`),
        axios.get(`${API}/tables`),
        axios.get(`${API}/venues`)
      ]);
      setReservations(resResponse.data);
      setTables(tablesResponse.data);
      setVenues(venuesResponse.data);
    } catch (error) {
      toast.error('Məlumatlar yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/reservations`, formData);
      toast.success('Rezervasiya yaradıldı');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`${API}/reservations/${id}/status?status=${status}`);
      toast.success('Status yeniləndi');
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Rezervasiyanı silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API}/reservations/${id}`);
      toast.success('Rezervasiya silindi');
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const resetForm = () => {
    setFormData({
      table_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      reservation_date: '',
      reservation_time: '',
      guest_count: 2,
      special_requests: ''
    });
  };

  const getVenueName = (venueId) => {
    const venue = venues.find(v => v.id === venueId);
    return venue?.name || '';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Təsdiqləndi';
      case 'cancelled': return 'Ləğv edildi';
      case 'completed': return 'Tamamlandı';
      default: return 'Gözləyir';
    }
  };

  const filteredReservations = filterStatus === 'all' 
    ? reservations 
    : reservations.filter(r => r.reservation?.status === filterStatus);

  const todayCount = reservations.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.reservation?.reservation_date === today && r.reservation?.status !== 'cancelled';
  }).length;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">Rezervasiyalar</h1>
          <p className="text-[#5C665F] mt-0.5">Masa rezervasiyalarını idarə edin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#C05C3D] hover:bg-[#A64D31] text-white text-xs rounded-xl" data-testid="add-reservation-btn">
              <Plus className="w-4 h-4 mr-2" />
              Rezervasiya Əlavə Et
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#181C1A] heading-font">Yeni Rezervasiya</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Müştəri Adı *</Label>
                  <Input 
                    value={formData.customer_name} 
                    onChange={(e) => setFormData(p => ({ ...p, customer_name: e.target.value }))} 
                    required 
                    data-testid="reservation-name-input"
                  />
                </div>
                <div>
                  <Label>Telefon *</Label>
                  <Input 
                    value={formData.customer_phone} 
                    onChange={(e) => setFormData(p => ({ ...p, customer_phone: e.target.value }))} 
                    required 
                    placeholder="+994 XX XXX XX XX"
                    data-testid="reservation-phone-input"
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.customer_email} 
                  onChange={(e) => setFormData(p => ({ ...p, customer_email: e.target.value }))} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tarix *</Label>
                  <Input 
                    type="date" 
                    value={formData.reservation_date} 
                    onChange={(e) => setFormData(p => ({ ...p, reservation_date: e.target.value }))} 
                    required 
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="reservation-date-input"
                  />
                </div>
                <div>
                  <Label>Saat *</Label>
                  <Input 
                    type="time" 
                    value={formData.reservation_time} 
                    onChange={(e) => setFormData(p => ({ ...p, reservation_time: e.target.value }))} 
                    required 
                    data-testid="reservation-time-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Masa *</Label>
                  <Select value={formData.table_id} onValueChange={(v) => setFormData(p => ({ ...p, table_id: v }))}>
                    <SelectTrigger data-testid="reservation-table-select">
                      <SelectValue placeholder="Masa seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map(table => (
                        <SelectItem key={table.id} value={table.id}>
                          Masa {table.table_number} - {getVenueName(table.venue_id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Qonaq Sayı *</Label>
                  <Input 
                    type="number" 
                    min="1"
                    value={formData.guest_count} 
                    onChange={(e) => setFormData(p => ({ ...p, guest_count: parseInt(e.target.value) || 1 }))} 
                    required 
                  />
                </div>
              </div>
              <div>
                <Label>Xüsusi İstəklər</Label>
                <Textarea 
                  value={formData.special_requests} 
                  onChange={(e) => setFormData(p => ({ ...p, special_requests: e.target.value }))} 
                  rows={2}
                  placeholder="Ad günü, allergi və s."
                />
              </div>
              <Button type="submit" className="w-full bg-[#C05C3D] hover:bg-[#A64D31] text-white" data-testid="save-reservation-btn">
                {az.save}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-[#1A4D2E] to-[#2A5D3E] text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bugünkü Rezervasiyalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Ümumi Rezervasiyalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#181C1A]">{reservations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Gözləyən</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {reservations.filter(r => r.reservation?.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hamısı</SelectItem>
            <SelectItem value="pending">Gözləyir</SelectItem>
            <SelectItem value="confirmed">Təsdiqləndi</SelectItem>
            <SelectItem value="completed">Tamamlandı</SelectItem>
            <SelectItem value="cancelled">Ləğv edildi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredReservations.length === 0 ? (
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-12 text-center">
          <p className="text-[#5C665F] text-lg">Rezervasiya yoxdur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReservations.map(({ reservation, table, venue }) => (
            <Card key={reservation.id} className="overflow-hidden" data-testid={`reservation-card-${reservation.id}`}>
              <div className={`h-2 ${reservation.status === 'confirmed' ? 'bg-green-500' : reservation.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#181C1A]">{reservation.customer_name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                      {getStatusLabel(reservation.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[#5C665F]">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">{reservation.guest_count}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-[#5C665F] mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(reservation.reservation_date).toLocaleDateString('az-AZ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{reservation.reservation_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{reservation.customer_phone}</span>
                  </div>
                  {reservation.customer_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{reservation.customer_email}</span>
                    </div>
                  )}
                </div>

                <div className="bg-[#F9F9F7] rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-[#181C1A]">
                    Masa {table?.table_number} - {venue?.name}
                  </p>
                  {reservation.special_requests && (
                    <p className="text-xs text-[#5C665F] mt-1">{reservation.special_requests}</p>
                  )}
                </div>

                {reservation.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleStatusChange(reservation.id, 'confirmed')}
                      data-testid={`confirm-reservation-${reservation.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Təsdiq
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleStatusChange(reservation.id, 'cancelled')}
                      data-testid={`cancel-reservation-${reservation.id}`}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Ləğv
                    </Button>
                  </div>
                )}

                {reservation.status === 'confirmed' && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleStatusChange(reservation.id, 'completed')}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Tamamla
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDelete(reservation.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
