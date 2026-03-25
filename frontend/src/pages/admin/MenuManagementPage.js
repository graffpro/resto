import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, FolderPlus, Image, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MenuManagementPage() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    discount_percentage: 0,
    is_available: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, itemRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/menu-items`)
      ]);
      setCategories(catRes.data);
      setMenuItems(itemRes.data);
      
      // Expand all categories by default
      const expanded = {};
      catRes.data.forEach(cat => expanded[cat.id] = true);
      setExpandedCategories(expanded);
    } catch (error) {
      toast.error('Məlumatlar yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  // Category functions
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory.id}`, categoryForm);
        toast.success('Kateqoriya yeniləndi');
      } else {
        await axios.post(`${API}/categories`, categoryForm);
        toast.success('Kateqoriya əlavə edildi');
      }
      setCategoryDialog(false);
      resetCategoryForm();
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Kateqoriyanı silmək istədiyinizə əminsiniz? Bütün yeməklər də silinəcək!')) return;
    try {
      await axios.delete(`${API}/categories/${id}`);
      toast.success('Kateqoriya silindi');
      fetchData();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const editCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '' });
    setCategoryDialog(true);
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
  };

  // Menu Item functions
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...itemForm,
        price: parseFloat(itemForm.price),
        discount_percentage: parseFloat(itemForm.discount_percentage) || 0
      };
      if (editingItem) {
        await axios.put(`${API}/menu-items/${editingItem.id}`, data);
        toast.success('Yemək yeniləndi');
      } else {
        await axios.post(`${API}/menu-items`, data);
        toast.success('Yemək əlavə edildi');
      }
      setItemDialog(false);
      resetItemForm();
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

  const editItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id,
      image_url: item.image_url || '',
      discount_percentage: item.discount_percentage || 0,
      is_available: item.is_available !== false
    });
    setItemDialog(true);
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      description: '',
      price: '',
      category_id: '',
      image_url: '',
      discount_percentage: 0,
      is_available: true
    });
  };

  const toggleCategory = (id) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getItemsByCategory = (categoryId) => {
    return menuItems.filter(item => item.category_id === categoryId);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font">Menyu İdarəetməsi</h1>
          <p className="text-[#5C6B61] mt-2">Kateqoriya və yeməkləri idarə edin</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={categoryDialog} onOpenChange={(open) => { setCategoryDialog(open); if (!open) resetCategoryForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[#4F9D69] text-[#4F9D69]" data-testid="add-category-btn">
                <FolderPlus className="w-4 h-4 mr-2" />
                Kateqoriya
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-[#1A4D2E]">
                  {editingCategory ? 'Kateqoriyanı Redaktə Et' : 'Kateqoriya Əlavə Et'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <Label>Ad *</Label>
                  <Input
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(p => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Məsələn: Əsas Yeməklər"
                    data-testid="category-name-input"
                  />
                </div>
                <div>
                  <Label>Təsvir</Label>
                  <Textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                  />
                </div>
                <Button type="submit" className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white">
                  {az.save}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={itemDialog} onOpenChange={(open) => { setItemDialog(open); if (!open) resetItemForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white" data-testid="add-item-btn">
                <Plus className="w-4 h-4 mr-2" />
                Yemək Əlavə Et
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-[#1A4D2E]">
                  {editingItem ? 'Yeməyi Redaktə Et' : 'Yemək Əlavə Et'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div>
                  <Label>Ad *</Label>
                  <Input
                    value={itemForm.name}
                    onChange={(e) => setItemForm(p => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Məsələn: Toyuq Kabab"
                    data-testid="item-name-input"
                  />
                </div>
                <div>
                  <Label>Kateqoriya *</Label>
                  <Select value={itemForm.category_id} onValueChange={(v) => setItemForm(p => ({ ...p, category_id: v }))}>
                    <SelectTrigger data-testid="item-category-select">
                      <SelectValue placeholder="Kateqoriya seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Qiymət (AZN) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={itemForm.price}
                      onChange={(e) => setItemForm(p => ({ ...p, price: e.target.value }))}
                      required
                      placeholder="15.00"
                      data-testid="item-price-input"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      Endirim (%)
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={itemForm.discount_percentage}
                      onChange={(e) => setItemForm(p => ({ ...p, discount_percentage: e.target.value }))}
                      placeholder="0"
                      data-testid="item-discount-input"
                    />
                  </div>
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Image className="w-3 h-3" />
                    Şəkil URL
                  </Label>
                  <Input
                    value={itemForm.image_url}
                    onChange={(e) => setItemForm(p => ({ ...p, image_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    data-testid="item-image-input"
                  />
                  {itemForm.image_url && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-[#E2E8E2]">
                      <img 
                        src={itemForm.image_url} 
                        alt="Preview" 
                        className="w-full h-32 object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label>Təsvir</Label>
                  <Textarea
                    value={itemForm.description}
                    onChange={(e) => setItemForm(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    placeholder="Yeməyin təsviri..."
                  />
                </div>
                <Button type="submit" className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white" data-testid="save-item-btn">
                  {az.save}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-[#1A4D2E] to-[#2A5D3E] text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Kateqoriyalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#5C6B61]">Yeməklər</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1A4D2E]">{menuItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#5C6B61]">Aktiv Yeməklər</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#4F9D69]">
              {menuItems.filter(i => i.is_available !== false).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories with Items */}
      {categories.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">Hələ kateqoriya yoxdur. Əvvəlcə kateqoriya əlavə edin.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map(category => {
            const items = getItemsByCategory(category.id);
            const isExpanded = expandedCategories[category.id];
            
            return (
              <Card key={category.id} className="overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-[#F5F9E9] cursor-pointer"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-[#1A4D2E]" /> : <ChevronDown className="w-5 h-5 text-[#1A4D2E]" />}
                    <div>
                      <h3 className="font-bold text-[#1A4D2E]">{category.name}</h3>
                      <p className="text-sm text-[#5C6B61]">{items.length} yemək</p>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => editCategory(category)}>
                      <Edit className="w-4 h-4 text-orange-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                
                {isExpanded && (
                  <CardContent className="p-4">
                    {items.length === 0 ? (
                      <p className="text-center text-[#5C6B61] py-4">Bu kateqoriyada yemək yoxdur</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map(item => (
                          <div 
                            key={item.id} 
                            className={`border rounded-lg overflow-hidden ${item.is_available === false ? 'opacity-50 bg-gray-50' : 'border-[#E2E8E2]'}`}
                          >
                            {item.image_url && (
                              <div className="relative h-32 bg-gray-100">
                                <img 
                                  src={item.image_url} 
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => e.target.parentElement.style.display = 'none'}
                                />
                                {item.discount_percentage > 0 && (
                                  <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                                    -{item.discount_percentage}%
                                  </Badge>
                                )}
                              </div>
                            )}
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold text-[#1A4D2E]">{item.name}</h4>
                                  {!item.image_url && item.discount_percentage > 0 && (
                                    <Badge className="bg-red-500 text-white text-xs mt-1">
                                      -{item.discount_percentage}%
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  {item.discount_percentage > 0 ? (
                                    <>
                                      <span className="text-sm line-through text-gray-400">{item.price.toFixed(2)}</span>
                                      <span className="font-bold text-red-600 ml-1">
                                        {(item.price * (1 - item.discount_percentage / 100)).toFixed(2)} AZN
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-bold text-[#4F9D69]">{item.price.toFixed(2)} AZN</span>
                                  )}
                                </div>
                              </div>
                              {item.description && (
                                <p className="text-sm text-[#5C6B61] mb-3">{item.description}</p>
                              )}
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => editItem(item)} className="flex-1">
                                  <Edit className="w-3 h-3 mr-1" />
                                  {az.edit}
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteItem(item.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
