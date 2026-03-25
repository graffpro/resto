import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, Store, Users, ChefHat, Power, Pencil, UserPlus, Shield, Calendar, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAdmins, setShowAdmins] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    name: '', address: '', phone: '', whatsapp: '', email: '', description: '',
    tax_percentage: 18, service_charge_percentage: 0
  });

  const [adminForm, setAdminForm] = useState({
    username: '', password: '', full_name: '', admin_pin: '', expires_at: ''
  });

  const fetchRestaurants = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/restaurants`);
      setRestaurants(res.data);
    } catch (err) {
      toast.error('Restoranlar yüklənmədi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  const fetchAdmins = async (restaurantId) => {
    try {
      const res = await axios.get(`${API}/users`);
      setAdmins(res.data.filter(u => u.restaurant_id === restaurantId));
    } catch (err) {
      toast.error('Adminlər yüklənmədi');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/restaurants`, form);
      toast.success('Restoran yaradıldı');
      setShowCreate(false);
      resetForm();
      fetchRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xəta baş verdi');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/restaurants/${selectedRestaurant.id}`, form);
      toast.success('Restoran yeniləndi');
      setShowEdit(false);
      resetForm();
      fetchRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xəta baş verdi');
    }
  };

  const toggleStatus = async (id) => {
    try {
      const res = await axios.put(`${API}/restaurants/${id}/toggle-status`);
      toast.success(res.data.is_active ? 'Restoran aktivləşdirildi' : 'Restoran deaktiv edildi');
      fetchRestaurants();
    } catch (err) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users`, {
        ...adminForm,
        role: 'admin',
        restaurant_id: selectedRestaurant.id
      });
      toast.success('Admin yaradıldı');
      setShowCreateAdmin(false);
      setAdminForm({ username: '', password: '', full_name: '', admin_pin: '', expires_at: '' });
      fetchAdmins(selectedRestaurant.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Xəta baş verdi');
    }
  };

  const toggleAdminStatus = async (userId) => {
    try {
      await axios.put(`${API}/users/${userId}/toggle-status`);
      toast.success('Status yeniləndi');
      fetchAdmins(selectedRestaurant.id);
    } catch (err) {
      toast.error('Xəta baş verdi');
    }
  };

  const openEdit = (r) => {
    setSelectedRestaurant(r);
    setForm({
      name: r.name, address: r.address || '', phone: r.phone || '',
      whatsapp: r.whatsapp || '', email: r.email || '', description: r.description || '',
      tax_percentage: r.tax_percentage || 18, service_charge_percentage: r.service_charge_percentage || 0
    });
    setShowEdit(true);
  };

  const openAdmins = (r) => {
    setSelectedRestaurant(r);
    fetchAdmins(r.id);
    setShowAdmins(true);
  };

  const resetForm = () => {
    setForm({ name: '', address: '', phone: '', whatsapp: '', email: '', description: '', tax_percentage: 18, service_charge_percentage: 0 });
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date() > new Date(date);
  };

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.address || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div data-testid="restaurants-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Restoranlar</h2>
          <p className="text-sm text-slate-500 mt-0.5">{restaurants.length} restoran qeydiyyatda</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9 px-4"
          data-testid="create-restaurant-btn"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Yeni Restoran
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Restoran axtar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm bg-white border-slate-200"
          data-testid="search-restaurants"
        />
      </div>

      {/* Restaurant Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <Store className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Restoran tapılmadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`bg-white border rounded-lg p-5 transition-all hover:shadow-md ${
                r.is_active ? 'border-slate-200' : 'border-red-200 bg-red-50/30'
              }`}
              data-testid={`restaurant-card-${r.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    r.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
                  }`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{r.name}</h3>
                    {r.address && <p className="text-xs text-slate-400 mt-0.5">{r.address}</p>}
                  </div>
                </div>
                <Badge
                  className={`text-[10px] px-1.5 py-0.5 ${
                    r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {r.is_active ? 'Aktiv' : 'Deaktiv'}
                </Badge>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mb-4 py-3 border-y border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{r.admin_count || 0} admin</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>{r.staff_count || 0} personal</span>
                </div>
                {r.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>{r.phone}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAdmins(r)}
                  className="flex-1 h-8 text-xs"
                  data-testid={`manage-admins-${r.id}`}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Adminlər
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(r)}
                  className="h-8 text-xs"
                  data-testid={`edit-restaurant-${r.id}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStatus(r.id)}
                  className={`h-8 text-xs ${!r.is_active ? 'text-emerald-600 border-emerald-200' : 'text-red-500 border-red-200'}`}
                  data-testid={`toggle-status-${r.id}`}
                >
                  <Power className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Restaurant Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Yeni Restoran</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label className="text-xs text-slate-600">Ad *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="h-9 text-sm mt-1" data-testid="restaurant-name-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Ünvan</Label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="h-9 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Telefon</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">WhatsApp</Label>
                <Input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="h-9 text-sm mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">E-poçt</Label>
              <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Açıqlama</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="h-9 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Vergi (%)</Label>
                <Input type="number" value={form.tax_percentage} onChange={e => setForm({...form, tax_percentage: parseFloat(e.target.value) || 0})} className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Xidmət haqqı (%)</Label>
                <Input type="number" value={form.service_charge_percentage} onChange={e => setForm({...form, service_charge_percentage: parseFloat(e.target.value) || 0})} className="h-9 text-sm mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="submit-restaurant">Yarat</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Restaurant Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Restoranı Redaktə Et</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div>
              <Label className="text-xs text-slate-600">Ad *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Ünvan</Label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="h-9 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Telefon</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">WhatsApp</Label>
                <Input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="h-9 text-sm mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">E-poçt</Label>
              <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Açıqlama</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="h-9 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Vergi (%)</Label>
                <Input type="number" value={form.tax_percentage} onChange={e => setForm({...form, tax_percentage: parseFloat(e.target.value) || 0})} className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Xidmət haqqı (%)</Label>
                <Input type="number" value={form.service_charge_percentage} onChange={e => setForm({...form, service_charge_percentage: parseFloat(e.target.value) || 0})} className="h-9 text-sm mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEdit(false)}>Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Yadda saxla</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admins Management Dialog */}
      <Dialog open={showAdmins} onOpenChange={setShowAdmins}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              {selectedRestaurant?.name} - Adminlər
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <Button
              size="sm"
              onClick={() => setShowCreateAdmin(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
              data-testid="create-admin-btn"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Yeni Admin
            </Button>

            {admins.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                Bu restoran üçün admin yoxdur
              </div>
            ) : (
              <div className="space-y-2">
                {admins.map(admin => (
                  <div
                    key={admin.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      admin.is_active ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50/50'
                    }`}
                    data-testid={`admin-card-${admin.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {admin.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{admin.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400">@{admin.username}</span>
                          {admin.expires_at && (
                            <span className={`text-[10px] flex items-center gap-0.5 ${
                              isExpired(admin.expires_at) ? 'text-red-500' : 'text-slate-400'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              {admin.expires_at}
                              {isExpired(admin.expires_at) && ' (bitib)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {admin.is_active ? 'Aktiv' : 'Deaktiv'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAdminStatus(admin.id)}
                        className={`h-7 text-[10px] px-2 ${!admin.is_active ? 'text-emerald-600' : 'text-red-500'}`}
                        data-testid={`toggle-admin-${admin.id}`}
                      >
                        <Power className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Yeni Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-3">
            <div>
              <Label className="text-xs text-slate-600">Ad Soyad *</Label>
              <Input value={adminForm.full_name} onChange={e => setAdminForm({...adminForm, full_name: e.target.value})} required className="h-9 text-sm mt-1" data-testid="admin-fullname-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-600">İstifadəçi adı *</Label>
              <Input value={adminForm.username} onChange={e => setAdminForm({...adminForm, username: e.target.value})} required className="h-9 text-sm mt-1" data-testid="admin-username-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Şifrə *</Label>
              <Input type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} required className="h-9 text-sm mt-1" data-testid="admin-password-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-600">PIN Kodu</Label>
              <Input value={adminForm.admin_pin} onChange={e => setAdminForm({...adminForm, admin_pin: e.target.value})} placeholder="4 rəqəmli PIN" maxLength={4} className="h-9 text-sm mt-1" data-testid="admin-pin-input" />
            </div>
            <div>
              <Label className="text-xs text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Son istifadə tarixi
              </Label>
              <Input type="date" value={adminForm.expires_at} onChange={e => setAdminForm({...adminForm, expires_at: e.target.value})} className="h-9 text-sm mt-1" data-testid="admin-expires-input" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateAdmin(false)}>Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="submit-admin">Yarat</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
