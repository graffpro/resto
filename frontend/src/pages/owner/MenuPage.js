import { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', display_order: 0 });
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', category_id: '', image_url: '', preparation_time: 15 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catsRes, itemsRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/menu-items`)
      ]);
      setCategories(catsRes.data);
      setMenuItems(itemsRes.data);
    } catch (error) {
      toast.error('Məlumat yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await axios.put(`${API}/categories/${editingCat.id}`, catForm);
        toast.success('Kateqoriya yeniləndi');
      } else {
        await axios.post(`${API}/categories`, catForm);
        toast.success('Kateqoriya əlavə edildi');
      }
      setCatDialogOpen(false);
      setCatForm({ name: '', description: '', display_order: 0 });
      setEditingCat(null);
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...itemForm, price: parseFloat(itemForm.price), preparation_time: parseInt(itemForm.preparation_time) };
      if (editingItem) {
        await axios.put(`${API}/menu-items/${editingItem.id}`, data);
        toast.success('Yemək yeniləndi');
      } else {
        await axios.post(`${API}/menu-items`, data);
        toast.success('Yemək əlavə edildi');
      }
      setItemDialogOpen(false);
      setItemForm({ name: '', description: '', price: '', category_id: '', image_url: '', preparation_time: 15 });
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('Kateqoriyanı silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API}/categories/${id}`);
      toast.success('Kateqoriya silindi');
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Yeməyi silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API}/menu-items/${id}`);
      toast.success('Yemək silindi');
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font mb-8">{az.menu}</h1>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="items">{az.menuItems}</TabsTrigger>
          <TabsTrigger value="categories">{az.categories}</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <div className="flex justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#1A4D2E]">{az.menuItems}</h2>
            <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md">
                  <Plus className="w-4 h-4 mr-2" />
                  {az.addMenuItem}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-[#1A4D2E] heading-font">
                    {editingItem ? az.edit : az.addMenuItem}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleItemSubmit} className="space-y-4">
                  <div>
                    <Label>{az.itemName} *</Label>
                    <Input value={itemForm.name} onChange={(e) => setItemForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>{az.description} *</Label>
                    <Textarea value={itemForm.description} onChange={(e) => setItemForm(p => ({ ...p, description: e.target.value }))} required rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{az.price} (AZN) *</Label>
                      <Input type="number" step="0.01" value={itemForm.price} onChange={(e) => setItemForm(p => ({ ...p, price: e.target.value }))} required />
                    </div>
                    <div>
                      <Label>{az.category} *</Label>
                      <Select value={itemForm.category_id} onValueChange={(v) => setItemForm(p => ({ ...p, category_id: v }))} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>{az.imageUrl}</Label>
                    <Input value={itemForm.image_url} onChange={(e) => setItemForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://example.com/image.jpg" />
                  </div>
                  <div>
                    <Label>{az.preparationTime}</Label>
                    <Input type="number" value={itemForm.preparation_time} onChange={(e) => setItemForm(p => ({ ...p, preparation_time: e.target.value }))} />
                  </div>
                  <Button type="submit" className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white">{az.save}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {menuItems.length === 0 ? (
            <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
              <p className="text-[#5C6B61] text-lg">Hələ yemək yoxdur</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white border border-[#E2E8E2] rounded-xl overflow-hidden">
                  <div className="h-48 bg-[#F5F9E9]">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-[#1A4D2E] mb-2">{item.name}</h3>
                    <p className="text-[#5C6B61] text-sm mb-2 line-clamp-2">{item.description}</p>
                    <p className="text-xl font-bold text-[#1A4D2E] mb-4">{item.price} AZN</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingItem(item); setItemForm({ name: item.name, description: item.description, price: item.price.toString(), category_id: item.category_id, image_url: item.image_url || '', preparation_time: item.preparation_time }); setItemDialogOpen(true); }} className="flex-1">
                        <Edit className="w-4 h-4 mr-1" />
                        {az.edit}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <div className="flex justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#1A4D2E]">{az.categories}</h2>
            <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md">
                  <Plus className="w-4 h-4 mr-2" />
                  {az.addCategory}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-[#1A4D2E] heading-font">
                    {editingCat ? az.edit : az.addCategory}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCatSubmit} className="space-y-4">
                  <div>
                    <Label>{az.categoryName} *</Label>
                    <Input value={catForm.name} onChange={(e) => setCatForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>{az.description}</Label>
                    <Textarea value={catForm.description} onChange={(e) => setCatForm(p => ({ ...p, description: e.target.value }))} rows={3} />
                  </div>
                  <div>
                    <Label>{az.displayOrder}</Label>
                    <Input type="number" value={catForm.display_order} onChange={(e) => setCatForm(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <Button type="submit" className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white">{az.save}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {categories.length === 0 ? (
            <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
              <p className="text-[#5C6B61] text-lg">Hələ kateqoriya yoxdur</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white border border-[#E2E8E2] rounded-xl p-6">
                  <h3 className="text-xl font-bold text-[#1A4D2E] mb-2">{cat.name}</h3>
                  {cat.description && <p className="text-[#5C6B61] text-sm mb-4">{cat.description}</p>}
                  <div className="flex gap-2 pt-4 border-t border-[#E2E8E2]">
                    <Button variant="outline" size="sm" onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, description: cat.description || '', display_order: cat.display_order }); setCatDialogOpen(true); }} className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      {az.edit}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteCat(cat.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}