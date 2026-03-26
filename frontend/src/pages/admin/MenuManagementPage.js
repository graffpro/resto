import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, FolderPlus, Image, Percent, Package, X, Upload, Loader2 } from 'lucide-react';
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
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  
  // Recipe items for the current menu item being added/edited
  const [recipeItems, setRecipeItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  
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
      const [catRes, itemRes, ingRes, recRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/menu-items`),
        axios.get(`${API}/ingredients`),
        axios.get(`${API}/recipes`)
      ]);
      setCategories(catRes.data);
      setMenuItems(itemRes.data);
      setIngredients(ingRes.data);
      setRecipes(recRes.data);
      
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
      let savedItemId;
      if (editingItem) {
        await axios.put(`${API}/menu-items/${editingItem.id}`, data);
        savedItemId = editingItem.id;
        toast.success('Yemək yeniləndi');
      } else {
        const res = await axios.post(`${API}/menu-items`, data);
        savedItemId = res.data.id;
        toast.success('Yemək əlavə edildi');
      }
      // Save recipe if ingredients are specified
      const validRecipeItems = recipeItems.filter(r => r.ingredient_id && r.quantity > 0);
      if (validRecipeItems.length > 0) {
        await axios.post(`${API}/recipes`, {
          menu_item_id: savedItemId,
          ingredients: validRecipeItems.map(r => ({ ingredient_id: r.ingredient_id, quantity: parseFloat(r.quantity) }))
        });
      } else if (savedItemId) {
        // Clear recipe if no ingredients
        try { await axios.delete(`${API}/recipes/${savedItemId}`); } catch {}
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
    // Load existing recipe for this item
    const existingRecipe = recipes.find(r => r.menu_item_id === item.id);
    if (existingRecipe && existingRecipe.ingredients?.length > 0) {
      setRecipeItems(existingRecipe.ingredients.map(ri => ({
        ingredient_id: ri.ingredient_id,
        quantity: ri.quantity
      })));
    } else {
      setRecipeItems([]);
    }
    setItemDialog(true);
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setRecipeItems([]);
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

  const addRecipeRow = () => setRecipeItems(prev => [...prev, { ingredient_id: '', quantity: '' }]);
  const removeRecipeRow = (idx) => setRecipeItems(prev => prev.filter((_, i) => i !== idx));
  const updateRecipeRow = (idx, field, val) => setRecipeItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const getIngredientName = (id) => ingredients.find(i => i.id === id)?.name || '';
  const getIngredientUnit = (id) => ingredients.find(i => i.id === id)?.unit || '';
  const getItemRecipe = (itemId) => recipes.find(r => r.menu_item_id === itemId);

  const toggleCategory = (id) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getItemsByCategory = (categoryId) => {
    return menuItems.filter(item => item.category_id === categoryId);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">Menyu İdarəetməsi</h1>
          <p className="text-[#5C665F] mt-0.5">Kateqoriya və yeməkləri idarə edin</p>
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
                <DialogTitle className="text-[#181C1A]">
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
                <Button type="submit" className="w-full bg-[#C05C3D] hover:bg-[#A64D31] text-white">
                  {az.save}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={itemDialog} onOpenChange={(open) => { setItemDialog(open); if (!open) resetItemForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#C05C3D] hover:bg-[#A64D31] text-white" data-testid="add-item-btn">
                <Plus className="w-4 h-4 mr-2" />
                Yemək Əlavə Et
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-[#181C1A]">
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
                    Şəkil
                  </Label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${uploading ? 'border-[#C05C3D] bg-[#C05C3D]/5' : 'border-[#E6E5DF] hover:border-[#C05C3D]'}`}>
                        {uploading ? (
                          <div className="flex items-center justify-center gap-2 text-xs text-[#C05C3D]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Yüklənir...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-xs text-[#8A948D]">
                            <Upload className="w-4 h-4" />
                            Şəkil seçin (max 5MB)
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploading}
                        data-testid="item-image-upload"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { toast.error('Şəkil 5MB-dan böyükdür'); return; }
                          setUploading(true);
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const res = await axios.post(`${API}/upload/image`, formData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            const imageUrl = `${BACKEND_URL}${res.data.url}`;
                            setItemForm(p => ({ ...p, image_url: imageUrl }));
                            toast.success('Şəkil yükləndi');
                          } catch (err) { toast.error(err.response?.data?.detail || 'Yükləmə xətası'); }
                          finally { setUploading(false); }
                        }}
                      />
                    </label>
                  </div>
                  {itemForm.image_url && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-[#E6E5DF] relative">
                      <img 
                        src={itemForm.image_url} 
                        alt="Preview" 
                        className="w-full h-32 object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <Button variant="ghost" size="sm" onClick={() => setItemForm(p => ({ ...p, image_url: '' }))} className="absolute top-1 right-1 h-6 w-6 p-0 bg-black/50 hover:bg-black/70 rounded-full">
                        <X className="w-3 h-3 text-white" />
                      </Button>
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
                {/* Recipe / Ingredient Mapping */}
                {ingredients.length > 0 && (
                  <div className="border border-[#E6E5DF] rounded-lg p-3 bg-[#F9F9F7]">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-semibold text-[#181C1A] flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Resept (Xammal tərkibi)
                      </Label>
                      <Button type="button" variant="outline" size="sm" onClick={addRecipeRow} className="h-6 text-[10px] px-2" data-testid="add-recipe-row-btn">
                        <Plus className="w-3 h-3 mr-1" /> Xammal
                      </Button>
                    </div>
                    {recipeItems.length === 0 ? (
                      <p className="text-[10px] text-[#5C665F]">Stokdan avtomatik çıxılması üçün xammal əlavə edin</p>
                    ) : (
                      <div className="space-y-2">
                        {recipeItems.map((ri, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Select value={ri.ingredient_id} onValueChange={(v) => updateRecipeRow(idx, 'ingredient_id', v)}>
                              <SelectTrigger className="h-8 text-xs flex-1" data-testid={`recipe-ingredient-${idx}`}>
                                <SelectValue placeholder="Xammal seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {ingredients.map(ing => (
                                  <SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={ri.quantity}
                              onChange={(e) => updateRecipeRow(idx, 'quantity', e.target.value)}
                              placeholder="Miqdar"
                              className="w-20 h-8 text-xs"
                              data-testid={`recipe-quantity-${idx}`}
                            />
                            <span className="text-[10px] text-[#5C665F] w-10">{getIngredientUnit(ri.ingredient_id)}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeRecipeRow(idx)} className="h-6 w-6 p-0">
                              <X className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <Button type="submit" className="w-full bg-[#C05C3D] hover:bg-[#A64D31] text-white" data-testid="save-item-btn">
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
            <CardTitle className="text-sm font-medium text-[#5C665F]">Yeməklər</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#181C1A]">{menuItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Aktiv Yeməklər</CardTitle>
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
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-12 text-center">
          <p className="text-[#5C665F] text-lg">Hələ kateqoriya yoxdur. Əvvəlcə kateqoriya əlavə edin.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map(category => {
            const items = getItemsByCategory(category.id);
            const isExpanded = expandedCategories[category.id];
            
            return (
              <Card key={category.id} className="overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-[#F9F9F7] cursor-pointer"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-[#181C1A]" /> : <ChevronDown className="w-5 h-5 text-[#181C1A]" />}
                    <div>
                      <h3 className="font-bold text-[#181C1A]">{category.name}</h3>
                      <p className="text-sm text-[#5C665F]">{items.length} yemək</p>
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
                      <p className="text-center text-[#5C665F] py-4">Bu kateqoriyada yemək yoxdur</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map(item => (
                          <div 
                            key={item.id} 
                            className={`border rounded-lg overflow-hidden ${item.is_available === false ? 'opacity-50 bg-gray-50' : 'border-[#E6E5DF]'}`}
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
                                  <h4 className="font-semibold text-[#181C1A]">{item.name}</h4>
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
                                <p className="text-sm text-[#5C665F] mb-3">{item.description}</p>
                              )}
                              {getItemRecipe(item.id) && (
                                <div className="mb-2">
                                  <Badge variant="outline" className="text-[10px] border-[#4F9D69] text-[#4F9D69]">
                                    <Package className="w-2.5 h-2.5 mr-1" />
                                    {getItemRecipe(item.id).ingredients?.length} xammal
                                  </Badge>
                                </div>
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
