import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Users, Pencil, Trash2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import az from '@/translations/az';

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', full_name: '', role: 'kitchen' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { setLoading(true); const r = await axios.get(`${API}/users`); setUsers(r.data); }
    catch { toast.error('İstifadəçilər yüklənmədi'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = { full_name: formData.full_name, role: formData.role };
        if (formData.password) updateData.new_password = formData.password;
        await axios.put(`${API}/users/${editingUser.id}`, updateData);
        toast.success('İstifadəçi yeniləndi');
      } else {
        await axios.post(`${API}/users`, formData);
        toast.success('İstifadəçi əlavə edildi');
      }
      setDialogOpen(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', full_name: '', role: 'kitchen' });
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta baş verdi'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Bu istifadəçini silmək istəyirsiniz?')) return;
    try { await axios.delete(`${API}/users/${id}`); toast.success('İstifadəçi silindi'); fetchUsers(); }
    catch { toast.error('Xəta baş verdi'); }
  };

  const toggleStatus = async (id) => {
    try { await axios.put(`${API}/users/${id}/toggle-status`); toast.success('Status yeniləndi'); fetchUsers(); }
    catch { toast.error('Xəta'); }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setFormData({ username: u.username, password: '', full_name: u.full_name, role: u.role });
    setDialogOpen(true);
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-[#C05C3D]/10 text-[#C05C3D]',
      kitchen: 'bg-[#D48B30]/10 text-[#D48B30]',
      waiter: 'bg-[#3E6A4B]/10 text-[#3E6A4B]',
      master_waiter: 'bg-emerald-600 text-white shadow-sm',
      bar: 'bg-[#7C3AED]/10 text-[#7C3AED]',
    };
    const labels = { ...az, master_waiter: '🎖 Master Ofitsiant' };
    return <Badge className={`text-[10px] rounded-full ${colors[role] || 'bg-[#8A948D]/10 text-[#8A948D]'}`}>{labels[role] || role}</Badge>;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent" /></div>;

  return (
    <div data-testid="admin-users-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">{az.users}</h1>
          <p className="text-xs text-[#8A948D] mt-0.5">{users.length} istifadəçi</p>
        </div>
        <Button onClick={() => { setEditingUser(null); setFormData({ username: '', password: '', full_name: '', role: 'kitchen' }); setDialogOpen(true); }} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white text-xs h-9 px-4 rounded-xl" data-testid="add-user-btn">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> {az.addUser}
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-12 text-center">
          <Users className="w-10 h-10 text-[#D1D0C8] mx-auto mb-3" />
          <p className="text-sm text-[#8A948D]">Hələ istifadəçi yoxdur</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E6E5DF] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F9F9F7]">
              <tr>
                <th className="text-left p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">{az.fullName}</th>
                <th className="text-left p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">{az.username}</th>
                <th className="text-left p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">{az.role}</th>
                <th className="text-left p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Status</th>
                <th className="text-right p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t border-[#E6E5DF] hover:bg-[#F9F9F7] transition-colors" data-testid={`user-row-${user.id}`}>
                  <td className="p-3 text-sm text-[#181C1A] font-medium">{user.full_name}</td>
                  <td className="p-3 text-sm text-[#5C665F]">@{user.username}</td>
                  <td className="p-3">{getRoleBadge(user.role)}</td>
                  <td className="p-3">
                    <Badge className={`text-[10px] rounded-full ${user.is_active !== false ? 'bg-[#3E6A4B]/10 text-[#3E6A4B]' : 'bg-[#B74134]/10 text-[#B74134]'}`}>
                      {user.is_active !== false ? 'Aktiv' : 'Deaktiv'}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)} className="h-7 w-7 p-0 text-[#5C665F]"><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleStatus(user.id)} className={`h-7 w-7 p-0 ${user.is_active !== false ? 'text-[#D48B30]' : 'text-[#3E6A4B]'}`}><Power className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteUser(user.id)} className="h-7 w-7 p-0 text-[#B74134]"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditingUser(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">{editingUser ? 'Redaktə Et' : az.addUser}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            {!editingUser && (
              <div><Label className="text-xs text-[#5C665F]">{az.username} *</Label><Input value={formData.username} onChange={e => setFormData(p => ({...p, username: e.target.value}))} required className="h-9 text-sm mt-1 rounded-xl" /></div>
            )}
            <div><Label className="text-xs text-[#5C665F]">{editingUser ? 'Yeni Şifrə (boş=dəyişmir)' : `${az.password} *`}</Label><Input type="password" value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} required={!editingUser} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div><Label className="text-xs text-[#5C665F]">{az.fullName} *</Label><Input value={formData.full_name} onChange={e => setFormData(p => ({...p, full_name: e.target.value}))} required className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div>
              <Label className="text-xs text-[#5C665F]">{az.role} *</Label>
              <select className="flex h-9 w-full rounded-xl border border-[#E6E5DF] bg-white px-3 py-2 text-sm mt-1" value={formData.role} onChange={e => setFormData(p => ({...p, role: e.target.value}))}>
                <option value="kitchen">{az.kitchen}</option>
                <option value="waiter">{az.waiter}</option>
                <option value="master_waiter">🎖 Master Ofitsiant</option>
                <option value="bar">Bar</option>
              </select>
              {formData.role === 'master_waiter' && (
                <p className="text-[11px] text-emerald-700 mt-1 leading-tight">
                  Master ofitsiant müştəri adına sifariş götürə bilər — masaya yaxınlaşıb tabletdən sifariş daxil edir (xüsusilə yaşlı müştərilər üçün).
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl">{editingUser ? 'Yadda saxla' : az.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
