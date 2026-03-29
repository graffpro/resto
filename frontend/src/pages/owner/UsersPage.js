import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', full_name: '', role: 'admin' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('İstifadəçilər yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users`, formData);
      toast.success('İstifadəçi əlavə edildi');
      setDialogOpen(false);
      setFormData({ username: '', password: '', full_name: '', role: 'admin' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Xəta baş verdi');
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      kitchen: 'bg-orange-100 text-orange-800',
      waiter: 'bg-green-100 text-green-800'
    };
    return <Badge className={colors[role]}>{az[role]}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font">{az.users}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md" data-testid="add-user-button">
              <Plus className="w-4 h-4 mr-2" />
              {az.addUser}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-[#1A4D2E] heading-font">{az.addUser}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>{az.username} *</Label>
                <Input value={formData.username} onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))} required data-testid="username-input" />
              </div>
              <div>
                <Label>{az.password} *</Label>
                <Input type="password" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} required data-testid="password-input" />
              </div>
              <div>
                <Label>{az.fullName} *</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))} required data-testid="fullname-input" />
              </div>
              <div>
                <Label>{az.role} *</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.role}
                  onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                  data-testid="role-select"
                >
                  <option value="admin">{az.admin}</option>
                </select>
                <p className="text-xs text-[#5C6B61] mt-1">Sahib yalnız administrator yarada bilər</p>
              </div>
              <Button type="submit" className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white" data-testid="save-user-button">
                {az.save}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">Hələ istifadəçi yoxdur</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8E2] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F5F9E9]">
              <tr>
                <th className="text-left p-4 text-[#1A4D2E] font-semibold">{az.username}</th>
                <th className="text-left p-4 text-[#1A4D2E] font-semibold">{az.fullName}</th>
                <th className="text-left p-4 text-[#1A4D2E] font-semibold">{az.role}</th>
                <th className="text-left p-4 text-[#1A4D2E] font-semibold">{az.createdBy}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t border-[#E2E8E2]" data-testid={`user-row-${user.id}`}>
                  <td className="p-4">{user.username}</td>
                  <td className="p-4">{user.full_name}</td>
                  <td className="p-4">{getRoleBadge(user.role)}</td>
                  <td className="p-4 text-[#5C6B61] text-sm">{user.created_by || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
