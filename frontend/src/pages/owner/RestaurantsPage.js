import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Plus, Store, Users, Power, Pencil, UserPlus, Shield, Calendar, Clock, Search, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const TIME_PERIODS = [
  { label: '5 gün', days: 5 },
  { label: '2 həftə', days: 14 },
  { label: '1 ay', days: 30 },
  { label: '3 ay', days: 90 },
  { label: '6 ay', days: 180 },
  { label: '1 il', days: 365 },
];

function getExpiryDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function RestaurantsPage() {
  const { t } = useTranslation();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAdmins, setShowAdmins] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showEditAdmin, setShowEditAdmin] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const emptyForm = { name: '', address: '', phone: '', whatsapp: '', email: '', description: '', tax_percentage: 18, service_charge_percentage: 0 };
  const emptyAdminForm = { username: '', password: '', full_name: '', admin_pin: '', expires_at: '', selected_period: '' };

  const [form, setForm] = useState(emptyForm);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);

  const fetchRestaurants = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/restaurants`);
      setRestaurants(res.data);
    } catch { toast.error('Restoranlar yüklənmədi'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  const fetchAdmins = async (restaurantId) => {
    try {
      const res = await axios.get(`${API}/users`);
      setAdmins(res.data.filter(u => u.restaurant_id === restaurantId));
    } catch { toast.error('Adminlər yüklənmədi'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/restaurants`, form);
      toast.success('Restoran yaradıldı');
      setShowCreate(false);
      setForm(emptyForm);
      fetchRestaurants();
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta baş verdi'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/restaurants/${selectedRestaurant.id}`, form);
      toast.success('Restoran yeniləndi');
      setShowEdit(false);
      setForm(emptyForm);
      fetchRestaurants();
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta baş verdi'); }
  };

  const deleteRestaurant = async (id) => {
    if (!window.confirm('Bu restoranı silmək istədiyinizə əminsiniz? Bütün adminlər və personal də silinəcək.')) return;
    try {
      await axios.delete(`${API}/restaurants/${id}`);
      toast.success('Restoran silindi');
      fetchRestaurants();
    } catch { toast.error('Xəta baş verdi'); }
  };

  const toggleStatus = async (id) => {
    try {
      const res = await axios.put(`${API}/restaurants/${id}/toggle-status`);
      toast.success(res.data.is_active ? 'Restoran aktivləşdirildi' : 'Restoran deaktiv edildi');
      fetchRestaurants();
    } catch { toast.error('Xəta baş verdi'); }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users`, {
        username: adminForm.username,
        password: adminForm.password,
        full_name: adminForm.full_name,
        admin_pin: adminForm.admin_pin,
        expires_at: adminForm.expires_at,
        role: 'admin',
        restaurant_id: selectedRestaurant.id
      });
      toast.success('Admin yaradıldı');
      setShowCreateAdmin(false);
      setAdminForm(emptyAdminForm);
      fetchAdmins(selectedRestaurant.id);
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta baş verdi'); }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    try {
      const updateData = { full_name: adminForm.full_name, admin_pin: adminForm.admin_pin, expires_at: adminForm.expires_at };
      if (adminForm.password) updateData.new_password = adminForm.password;
      await axios.put(`${API}/users/${selectedAdmin.id}`, updateData);
      toast.success('Admin yeniləndi');
      setShowEditAdmin(false);
      fetchAdmins(selectedRestaurant.id);
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta baş verdi'); }
  };

  const deleteAdmin = async (userId) => {
    if (!window.confirm('Bu admini silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success('Admin silindi');
      fetchAdmins(selectedRestaurant.id);
    } catch { toast.error('Xəta baş verdi'); }
  };

  const toggleAdminStatus = async (userId) => {
    try {
      await axios.put(`${API}/users/${userId}/toggle-status`);
      toast.success('Status yeniləndi');
      fetchAdmins(selectedRestaurant.id);
    } catch { toast.error('Xəta baş verdi'); }
  };

  const openEdit = (r) => {
    setSelectedRestaurant(r);
    setForm({ name: r.name, address: r.address || '', phone: r.phone || '', whatsapp: r.whatsapp || '', email: r.email || '', description: r.description || '', tax_percentage: r.tax_percentage || 18, service_charge_percentage: r.service_charge_percentage || 0 });
    setShowEdit(true);
  };

  const openEditAdmin = (admin) => {
    setSelectedAdmin(admin);
    setAdminForm({ username: admin.username, password: '', full_name: admin.full_name, admin_pin: admin.admin_pin || '', expires_at: admin.expires_at || '', selected_period: '' });
    setShowEditAdmin(true);
  };

  const openAdmins = (r) => {
    setSelectedRestaurant(r);
    fetchAdmins(r.id);
    setShowAdmins(true);
  };

  const selectPeriod = (days) => {
    const expiry = getExpiryDate(days);
    setAdminForm(prev => ({ ...prev, expires_at: expiry, selected_period: String(days) }));
  };

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.address || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent" /></div>;
  }

  return (
    <div data-testid="restaurants-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">{t('nav.restaurants')}</h2>
          <p className="text-xs text-[#8A948D] mt-0.5">{t('owner_panel.registered_count', { count: restaurants.length })}</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white text-xs h-9 px-4 rounded-xl" data-testid="create-restaurant-btn">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Yeni Restoran
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A948D]" />
        <Input placeholder={t('owner_panel.search_restaurant')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm bg-white border-[#E6E5DF] rounded-xl" data-testid="search-restaurants" />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-16 text-center">
          <Store className="w-10 h-10 text-[#D1D0C8] mx-auto mb-3" />
          <p className="text-sm text-[#8A948D]">Restoran tapılmadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className={`bg-white border rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(42,58,44,0.06)] hover:-translate-y-0.5 ${r.is_active ? 'border-[#E6E5DF]' : 'border-red-200 bg-red-50/20'}`} data-testid={`restaurant-card-${r.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${r.is_active ? 'bg-[#2A3A2C]/10 text-[#2A3A2C]' : 'bg-red-100 text-red-500'}`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#181C1A]">{r.name}</h3>
                    {r.address && <p className="text-[11px] text-[#8A948D] mt-0.5">{r.address}</p>}
                  </div>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.is_active ? 'bg-[#3E6A4B]/10 text-[#3E6A4B]' : 'bg-[#B74134]/10 text-[#B74134]'}`}>
                  {r.is_active ? t('owner_panel.active') : t('owner_panel.inactive')}
                </Badge>
              </div>

              <div className="flex gap-4 mb-4 py-3 border-y border-[#E6E5DF]/60">
                <div className="flex items-center gap-1.5 text-xs text-[#5C665F]">
                  <Shield className="w-3.5 h-3.5 text-[#C05C3D]" />
                  <span>{r.admin_count || 0} {t('owner_panel.admins_count')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#5C665F]">
                  <Users className="w-3.5 h-3.5 text-[#4A6B8C]" />
                  <span>{r.staff_count || 0} {t('owner_panel.staff_count')}</span>
                </div>
              </div>

              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => openAdmins(r)} className="flex-1 h-8 text-xs rounded-xl border-[#E6E5DF] hover:bg-[#F9F9F7]" data-testid={`manage-admins-${r.id}`}>
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> {t('owner_panel.manage_admins')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(r)} className="h-8 w-8 p-0 rounded-xl border-[#E6E5DF]" data-testid={`edit-restaurant-${r.id}`}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleStatus(r.id)} className={`h-8 w-8 p-0 rounded-xl ${!r.is_active ? 'text-[#3E6A4B] border-[#3E6A4B]/30' : 'text-[#D48B30] border-[#D48B30]/30'}`} data-testid={`toggle-status-${r.id}`}>
                  <Power className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteRestaurant(r.id)} className="h-8 w-8 p-0 rounded-xl text-[#B74134] border-[#B74134]/30 hover:bg-red-50" data-testid={`delete-restaurant-${r.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Restaurant Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">Yeni Restoran</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div><Label className="text-xs text-[#5C665F]">Ad *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="h-9 text-sm mt-1 rounded-xl" data-testid="restaurant-name-input" /></div>
            <div><Label className="text-xs text-[#5C665F]">Ünvan</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-[#5C665F]">Telefon</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
              <div><Label className="text-xs text-[#5C665F]">WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            </div>
            <div><Label className="text-xs text-[#5C665F]">E-poçt</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div><Label className="text-xs text-[#5C665F]">Açıqlama</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-[#5C665F]">Vergi (%)</Label><Input type="number" value={form.tax_percentage} onChange={e => setForm({...form, tax_percentage: parseFloat(e.target.value) || 0})} className="h-9 text-sm mt-1 rounded-xl" /></div>
              <div><Label className="text-xs text-[#5C665F]">Xidmət haqqı (%)</Label><Input type="number" value={form.service_charge_percentage} onChange={e => setForm({...form, service_charge_percentage: parseFloat(e.target.value) || 0})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl" data-testid="submit-restaurant">Yarat</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Restaurant Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">Restoranı Redaktə Et</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div><Label className="text-xs text-[#5C665F]">Ad *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div><Label className="text-xs text-[#5C665F]">Ünvan</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-[#5C665F]">Telefon</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
              <div><Label className="text-xs text-[#5C665F]">WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            </div>
            <div><Label className="text-xs text-[#5C665F]">E-poçt</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div><Label className="text-xs text-[#5C665F]">Açıqlama</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-[#5C665F]">Vergi (%)</Label><Input type="number" value={form.tax_percentage} onChange={e => setForm({...form, tax_percentage: parseFloat(e.target.value) || 0})} className="h-9 text-sm mt-1 rounded-xl" /></div>
              <div><Label className="text-xs text-[#5C665F]">Xidmət haqqı (%)</Label><Input type="number" value={form.service_charge_percentage} onChange={e => setForm({...form, service_charge_percentage: parseFloat(e.target.value) || 0})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEdit(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl">Yadda saxla</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admins Dialog */}
      <Dialog open={showAdmins} onOpenChange={setShowAdmins}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-base font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#C05C3D]" /> {selectedRestaurant?.name} - Adminlər
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button size="sm" onClick={() => { setAdminForm(emptyAdminForm); setShowCreateAdmin(true); }} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white text-xs h-8 rounded-xl" data-testid="create-admin-btn">
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Yeni Admin
            </Button>
            {admins.length === 0 ? (
              <div className="text-center py-10 text-sm text-[#8A948D]">Bu restoran üçün admin yoxdur</div>
            ) : (
              <div className="space-y-2">
                {admins.map(admin => {
                  const daysLeft = getDaysLeft(admin.expires_at);
                  const isExpired = daysLeft !== null && daysLeft <= 0;
                  return (
                    <div key={admin.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${admin.is_active && !isExpired ? 'border-[#E6E5DF] bg-white' : 'border-red-200 bg-red-50/30'}`} data-testid={`admin-card-${admin.id}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${admin.is_active ? 'bg-[#C05C3D]/10 text-[#C05C3D]' : 'bg-red-100 text-red-600'}`}>
                          {admin.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#181C1A] truncate">{admin.full_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-[#8A948D]">@{admin.username}</span>
                            {admin.expires_at && (
                              <span className={`text-[10px] flex items-center gap-0.5 ${isExpired ? 'text-[#B74134]' : daysLeft <= 7 ? 'text-[#D48B30]' : 'text-[#8A948D]'}`}>
                                <Calendar className="w-3 h-3" />
                                {isExpired ? 'Müddəti bitib' : `${daysLeft} gün qalıb`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button variant="outline" size="sm" onClick={() => openEditAdmin(admin)} className="h-7 w-7 p-0 rounded-lg border-[#E6E5DF]" data-testid={`edit-admin-${admin.id}`}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleAdminStatus(admin.id)} className={`h-7 w-7 p-0 rounded-lg ${!admin.is_active ? 'text-[#3E6A4B] border-[#3E6A4B]/30' : 'text-[#D48B30] border-[#D48B30]/30'}`} data-testid={`toggle-admin-${admin.id}`}>
                          <Power className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteAdmin(admin.id)} className="h-7 w-7 p-0 rounded-lg text-[#B74134] border-[#B74134]/30 hover:bg-red-50" data-testid={`delete-admin-${admin.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">Yeni Admin</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-3">
            <div><Label className="text-xs text-[#5C665F]">Ad Soyad *</Label><Input value={adminForm.full_name} onChange={e => setAdminForm({...adminForm, full_name: e.target.value})} required className="h-9 text-sm mt-1 rounded-xl" data-testid="admin-fullname-input" /></div>
            <div><Label className="text-xs text-[#5C665F]">İstifadəçi adı *</Label><Input value={adminForm.username} onChange={e => setAdminForm({...adminForm, username: e.target.value})} required className="h-9 text-sm mt-1 rounded-xl" data-testid="admin-username-input" /></div>
            <div><Label className="text-xs text-[#5C665F]">Şifrə *</Label><Input type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} required className="h-9 text-sm mt-1 rounded-xl" data-testid="admin-password-input" /></div>
            <div><Label className="text-xs text-[#5C665F]">PIN Kodu</Label><Input value={adminForm.admin_pin} onChange={e => setAdminForm({...adminForm, admin_pin: e.target.value})} placeholder="4 rəqəmli PIN" maxLength={6} className="h-9 text-sm mt-1 rounded-xl" data-testid="admin-pin-input" /></div>
            <div>
              <Label className="text-xs text-[#5C665F] flex items-center gap-1"><Clock className="w-3 h-3" /> Müddət</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {TIME_PERIODS.map(p => (
                  <button key={p.days} type="button" onClick={() => selectPeriod(p.days)}
                    className={`h-8 text-xs rounded-xl border transition-all ${adminForm.selected_period === String(p.days) ? 'bg-[#C05C3D] text-white border-[#C05C3D]' : 'bg-white text-[#5C665F] border-[#E6E5DF] hover:border-[#C05C3D]'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              {adminForm.expires_at && <p className="text-[10px] text-[#8A948D] mt-1">Son tarix: {adminForm.expires_at}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateAdmin(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl" data-testid="submit-admin">Yarat</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={showEditAdmin} onOpenChange={setShowEditAdmin}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">Admini Redaktə Et</DialogTitle></DialogHeader>
          <form onSubmit={handleEditAdmin} className="space-y-3">
            <div><Label className="text-xs text-[#5C665F]">Ad Soyad *</Label><Input value={adminForm.full_name} onChange={e => setAdminForm({...adminForm, full_name: e.target.value})} required className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div><Label className="text-xs text-[#5C665F]">Yeni Şifrə (boş buraxın dəyişməmək üçün)</Label><Input type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div><Label className="text-xs text-[#5C665F]">PIN Kodu</Label><Input value={adminForm.admin_pin} onChange={e => setAdminForm({...adminForm, admin_pin: e.target.value})} placeholder="4 rəqəmli PIN" maxLength={6} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div>
              <Label className="text-xs text-[#5C665F] flex items-center gap-1"><Clock className="w-3 h-3" /> Müddəti uzat</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {TIME_PERIODS.map(p => (
                  <button key={p.days} type="button" onClick={() => selectPeriod(p.days)}
                    className={`h-8 text-xs rounded-xl border transition-all ${adminForm.selected_period === String(p.days) ? 'bg-[#C05C3D] text-white border-[#C05C3D]' : 'bg-white text-[#5C665F] border-[#E6E5DF] hover:border-[#C05C3D]'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              {adminForm.expires_at && <p className="text-[10px] text-[#8A948D] mt-1">Son tarix: {adminForm.expires_at}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEditAdmin(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl">Yadda saxla</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
