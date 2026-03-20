import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MenusPage() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', display_order: 0 });

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/menus`);
      setMenus(response.data);
    } catch (error) {
      toast.error('Menyular yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMenu) {
        await axios.put(`${API}/menus/${editingMenu.id}`, formData);
        toast.success('Menyu yeniləndi');
      } else {
        await axios.post(`${API}/menus`, formData);
        toast.success('Menyu əlavə edildi');
      }
      setDialogOpen(false);
      resetForm();
      fetchMenus();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Menyunu silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API}/menus/${id}`);
      toast.success('Menyu silindi');
      fetchMenus();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleEdit = (menu) => {
    setEditingMenu(menu);
    setFormData({ name: menu.name, description: menu.description || '', display_order: menu.display_order });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', display_order: 0 });
    setEditingMenu(null);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font">Menyular</h1>
          <p className="text-[#5C6B61] mt-2">Fərqli menyular yaradın (Səhər yeməyi, Nahar, Şam yeməyi və s.)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md" data-testid="add-menu-button">
              <Plus className="w-4 h-4 mr-2" />
              Menyu Əlavə Et
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-[#1A4D2E] heading-font">
                {editingMenu ? 'Menyunu Redaktə Et' : 'Menyu Əlavə Et'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Menyu Adı *</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                  required 
                  placeholder="Məsələn: Səhər Yeməyi, Nahar, Şam Yeməyi"
                  data-testid="menu-name-input" 
                />
              </div>
              <div>
                <Label htmlFor="description">Təsvir</Label>
                <Textarea 
                  id="description" 
                  value={formData.description} 
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                  rows={3} 
                  data-testid="menu-description-input" 
                />
              </div>
              <div>
                <Label htmlFor="display_order">Göstəriş Sırası</Label>
                <Input 
                  id="display_order" 
                  type="number" 
                  value={formData.display_order} 
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))} 
                  data-testid="menu-order-input" 
                />
              </div>
              <Button type="submit" className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white" data-testid="save-menu-button">
                {az.save}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {menus.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">Hələ menyu yoxdur. İlk menyunuzu əlavə edin!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map(menu => (
            <div key={menu.id} className="bg-white border border-[#E2E8E2] rounded-xl p-6" data-testid={`menu-card-${menu.id}`}>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-[#1A4D2E] mb-2">{menu.name}</h3>
                {menu.description && <p className="text-[#5C6B61] text-sm">{menu.description}</p>}
                <p className="text-xs text-[#5C6B61] mt-2">Sıra: {menu.display_order}</p>
              </div>
              <div className="flex gap-2 pt-4 border-t border-[#E2E8E2]">
                <Button variant="outline" size="sm" onClick={() => handleEdit(menu)} className="flex-1" data-testid={`edit-menu-${menu.id}`}>
                  <Edit className="w-4 h-4 mr-1" />
                  {az.edit}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(menu.id)} data-testid={`delete-menu-${menu.id}`}>
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
