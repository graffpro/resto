import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Package, Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, AlertTriangle, TrendingDown, TrendingUp, Search, UtensilsCrossed, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

const UNITS = ['ədəd', 'kq', 'qram', 'litr', 'ml', 'paket', 'qutu'];

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState([]);
  const [summary, setSummary] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIngDialog, setShowIngDialog] = useState(false);
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [showTxHistory, setShowTxHistory] = useState(false);
  const [editingIng, setEditingIng] = useState(null);
  const [selectedIng, setSelectedIng] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('stock');
  const [menuItems, setMenuItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [recipeItems, setRecipeItems] = useState([]);
  const [ingForm, setIngForm] = useState({ name: '', unit: 'ədəd', current_stock: 0, min_stock: 0, cost_per_unit: 0 });
  const [txForm, setTxForm] = useState({ transaction_type: 'purchase', quantity: '', unit_cost: '', notes: '', date: new Date().toISOString().split('T')[0] });

  const fetchData = useCallback(async () => {
    try {
      const [ingRes, sumRes, menuRes, recRes] = await Promise.all([
        axios.get(`${API}/ingredients`),
        axios.get(`${API}/inventory/summary`),
        axios.get(`${API}/menu-items`),
        axios.get(`${API}/recipes`)
      ]);
      setIngredients(ingRes.data);
      setSummary(sumRes.data);
      setMenuItems(menuRes.data);
      setRecipes(recRes.data);
    } catch { toast.error('Məlumatlar yüklənmədi'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleIngSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingIng) {
        await axios.put(`${API}/ingredients/${editingIng.id}`, ingForm);
        toast.success('Xammal yeniləndi');
      } else {
        await axios.post(`${API}/ingredients`, ingForm);
        toast.success('Xammal əlavə edildi');
      }
      setShowIngDialog(false);
      setEditingIng(null);
      setIngForm({ name: '', unit: 'ədəd', current_stock: 0, min_stock: 0, cost_per_unit: 0 });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta'); }
  };

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/stock-transactions`, {
        ingredient_id: selectedIng.id,
        transaction_type: txForm.transaction_type,
        quantity: parseFloat(txForm.quantity),
        unit_cost: txForm.unit_cost ? parseFloat(txForm.unit_cost) : null,
        notes: txForm.notes,
        date: txForm.date
      });
      toast.success(txForm.transaction_type === 'purchase' ? 'Alış qeydə alındı' : 'İstifadə qeydə alındı');
      setShowTxDialog(false);
      setTxForm({ transaction_type: 'purchase', quantity: '', unit_cost: '', notes: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta'); }
  };

  const deleteIngredient = async (id) => {
    if (!window.confirm('Bu xammalı silmək istəyirsiniz?')) return;
    try { await axios.delete(`${API}/ingredients/${id}`); toast.success('Silindi'); fetchData(); }
    catch { toast.error('Xəta'); }
  };

  const openEdit = (ing) => {
    setEditingIng(ing);
    setIngForm({ name: ing.name, unit: ing.unit, current_stock: ing.current_stock, min_stock: ing.min_stock, cost_per_unit: ing.cost_per_unit || 0 });
    setShowIngDialog(true);
  };

  const openTx = (ing, type) => {
    setSelectedIng(ing);
    setTxForm({ transaction_type: type, quantity: '', unit_cost: '', notes: '', date: new Date().toISOString().split('T')[0] });
    setShowTxDialog(true);
  };

  const openTxHistory = async (ing) => {
    setSelectedIng(ing);
    try {
      const res = await axios.get(`${API}/stock-transactions?ingredient_id=${ing.id}`);
      setTransactions(res.data);
    } catch { setTransactions([]); }
    setShowTxHistory(true);
  };

  const lowStockCount = summary.filter(s => s.is_low_stock).length;
  const totalValue = summary.reduce((s, i) => s + (i.current_stock * (i.cost_per_unit || ingredients.find(ig => ig.id === i.id)?.cost_per_unit || 0)), 0);

  const filtered = summary.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openRecipe = async (mi) => {
    setSelectedMenuItem(mi);
    try {
      const res = await axios.get(`${API}/recipes/${mi.id}`);
      setRecipeItems(res.data?.ingredients || []);
    } catch { setRecipeItems([]); }
    setShowRecipeDialog(true);
  };

  const addRecipeIngredient = (ing) => {
    if (recipeItems.find(ri => ri.ingredient_id === ing.id)) return;
    setRecipeItems(prev => [...prev, { ingredient_id: ing.id, ingredient_name: ing.name, ingredient_unit: ing.unit, quantity: 1 }]);
  };

  const updateRecipeQty = (idx, val) => {
    setRecipeItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: parseFloat(val) || 0 } : item));
  };

  const removeRecipeItem = (idx) => {
    setRecipeItems(prev => prev.filter((_, i) => i !== idx));
  };

  const saveRecipe = async () => {
    try {
      await axios.post(`${API}/recipes`, {
        menu_item_id: selectedMenuItem.id,
        ingredients: recipeItems.map(ri => ({ ingredient_id: ri.ingredient_id, quantity: ri.quantity }))
      });
      toast.success('Resept yadda saxlanıldı');
      setShowRecipeDialog(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta'); }
  };

  const deleteRecipe = async (menuItemId) => {
    try { await axios.delete(`${API}/recipes/${menuItemId}`); toast.success('Resept silindi'); fetchData(); }
    catch { toast.error('Xəta'); }
  };

  const getRecipeForItem = (menuItemId) => recipes.find(r => r.menu_item_id === menuItemId);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent" /></div>;

  return (
    <div data-testid="inventory-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">İnventar / Stok</h1>
          <p className="text-xs text-[#8A948D] mt-0.5">{ingredients.length} xammal qeydiyyatda</p>
        </div>
        <Button onClick={() => { setEditingIng(null); setIngForm({ name: '', unit: 'ədəd', current_stock: 0, min_stock: 0, cost_per_unit: 0 }); setShowIngDialog(true); }}
          className="bg-[#C05C3D] hover:bg-[#A64D31] text-white text-xs h-9 px-4 rounded-xl" data-testid="add-ingredient-btn">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Xammal əlavə et
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-[#4A6B8C]" /><span className="text-[10px] text-[#8A948D] uppercase tracking-wider">Ümumi Xammal</span></div>
          <p className="text-xl font-semibold text-[#181C1A] heading-font">{ingredients.length}</p>
        </div>
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-[#3E6A4B]" /><span className="text-[10px] text-[#8A948D] uppercase tracking-wider">Alınıb</span></div>
          <p className="text-xl font-semibold text-[#181C1A] heading-font">{summary.reduce((s, i) => s + i.total_purchased, 0).toFixed(0)}</p>
        </div>
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-[#C05C3D]" /><span className="text-[10px] text-[#8A948D] uppercase tracking-wider">İstifadə</span></div>
          <p className="text-xl font-semibold text-[#181C1A] heading-font">{summary.reduce((s, i) => s + i.total_used, 0).toFixed(0)}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${lowStockCount > 0 ? 'bg-[#B74134]/5 border-[#B74134]/20' : 'bg-white border-[#E6E5DF]'}`}>
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-[#B74134]' : 'text-[#8A948D]'}`} /><span className="text-[10px] text-[#8A948D] uppercase tracking-wider">Az Stok</span></div>
          <p className={`text-xl font-semibold heading-font ${lowStockCount > 0 ? 'text-[#B74134]' : 'text-[#181C1A]'}`}>{lowStockCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5">
        <button onClick={() => setActiveTab('stock')} className={`h-8 px-4 text-xs rounded-xl border transition-all ${activeTab === 'stock' ? 'bg-[#2A3A2C] text-white border-[#2A3A2C]' : 'bg-white text-[#5C665F] border-[#E6E5DF]'}`} data-testid="tab-stock">
          <Package className="w-3.5 h-3.5 inline mr-1" /> Stok ({ingredients.length})
        </button>
        <button onClick={() => setActiveTab('recipes')} className={`h-8 px-4 text-xs rounded-xl border transition-all ${activeTab === 'recipes' ? 'bg-[#2A3A2C] text-white border-[#2A3A2C]' : 'bg-white text-[#5C665F] border-[#E6E5DF]'}`} data-testid="tab-recipes">
          <UtensilsCrossed className="w-3.5 h-3.5 inline mr-1" /> Reseptlər ({recipes.length})
        </button>
      </div>

      {activeTab === 'stock' && (<>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A948D]" />
        <Input placeholder="Xammal axtar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm bg-white border-[#E6E5DF] rounded-xl" />
      </div>

      {/* Ingredients Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-12 text-center">
          <Package className="w-10 h-10 text-[#D1D0C8] mx-auto mb-3" />
          <p className="text-sm text-[#8A948D]">Xammal tapılmadı</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E6E5DF] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F9F9F7]">
              <tr>
                <th className="text-left p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Xammal</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Stok</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Min.</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Alınıb</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">İstifadə</th>
                <th className="text-center p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Xərc</th>
                <th className="text-right p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className={`border-t border-[#E6E5DF] hover:bg-[#F9F9F7] transition-colors ${item.is_low_stock ? 'bg-[#B74134]/3' : ''}`} data-testid={`ingredient-row-${item.id}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {item.is_low_stock && <AlertTriangle className="w-3.5 h-3.5 text-[#B74134] shrink-0" />}
                      <div>
                        <p className="text-sm font-medium text-[#181C1A]">{item.name}</p>
                        <p className="text-[10px] text-[#8A948D]">{item.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-sm font-semibold ${item.is_low_stock ? 'text-[#B74134]' : 'text-[#181C1A]'}`}>
                      {item.current_stock}
                    </span>
                  </td>
                  <td className="p-3 text-center text-xs text-[#8A948D]">{item.min_stock}</td>
                  <td className="p-3 text-center text-xs text-[#3E6A4B]">{item.total_purchased}</td>
                  <td className="p-3 text-center text-xs text-[#C05C3D]">{item.total_used}</td>
                  <td className="p-3 text-center text-xs text-[#5C665F]">{item.total_cost?.toFixed(2)} AZN</td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <Button variant="outline" size="sm" onClick={() => openTx(item, 'purchase')} className="h-7 text-[10px] px-1.5 rounded-lg border-[#3E6A4B]/30 text-[#3E6A4B]" data-testid={`purchase-${item.id}`}>
                        <ArrowDownCircle className="w-3 h-3 mr-0.5" /> Alış
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openTx(item, 'usage')} className="h-7 text-[10px] px-1.5 rounded-lg border-[#C05C3D]/30 text-[#C05C3D]" data-testid={`usage-${item.id}`}>
                        <ArrowUpCircle className="w-3 h-3 mr-0.5" /> İstifadə
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openTxHistory(item)} className="h-7 w-7 p-0 text-[#4A6B8C]" data-testid={`tx-history-${item.id}`}>
                        <TrendingUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-7 w-7 p-0 text-[#5C665F]"><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteIngredient(item.id)} className="h-7 w-7 p-0 text-[#B74134]"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>)}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div>
          {menuItems.length === 0 ? (
            <div className="bg-white border border-[#E6E5DF] rounded-2xl p-12 text-center">
              <UtensilsCrossed className="w-10 h-10 text-[#D1D0C8] mx-auto mb-3" />
              <p className="text-sm text-[#8A948D]">Əvvəlcə menyu itemları əlavə edin</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E6E5DF] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#F9F9F7]">
                  <tr>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Menyu İtem</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Qiymət</th>
                    <th className="text-left p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Xammallar</th>
                    <th className="text-right p-3 text-[10px] uppercase tracking-wider text-[#8A948D] font-medium">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(mi => {
                    const recipe = getRecipeForItem(mi.id);
                    return (
                      <tr key={mi.id} className="border-t border-[#E6E5DF] hover:bg-[#F9F9F7]" data-testid={`recipe-row-${mi.id}`}>
                        <td className="p-3 text-sm font-medium text-[#181C1A]">{mi.name}</td>
                        <td className="p-3 text-sm text-[#C05C3D]">{mi.price?.toFixed(2)} AZN</td>
                        <td className="p-3">
                          {recipe ? (
                            <div className="flex flex-wrap gap-1">
                              {recipe.ingredients.map((ri, idx) => (
                                <Badge key={idx} className="text-[9px] bg-[#4A6B8C]/10 text-[#4A6B8C] rounded-full">
                                  {ri.ingredient_name}: {ri.quantity} {ri.ingredient_unit}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8A948D]">Resept yoxdur</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="outline" size="sm" onClick={() => openRecipe(mi)} className="h-7 text-[10px] px-2 rounded-lg border-[#E6E5DF]" data-testid={`set-recipe-${mi.id}`}>
                              <Link2 className="w-3 h-3 mr-0.5" /> {recipe ? 'Redaktə' : 'Bağla'}
                            </Button>
                            {recipe && (
                              <Button variant="ghost" size="sm" onClick={() => deleteRecipe(mi.id)} className="h-7 w-7 p-0 text-[#B74134]"><Trash2 className="w-3 h-3" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Ingredient Dialog */}
      <Dialog open={showIngDialog} onOpenChange={v => { setShowIngDialog(v); if (!v) setEditingIng(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">{editingIng ? 'Xammalı Redaktə Et' : 'Yeni Xammal'}</DialogTitle></DialogHeader>
          <form onSubmit={handleIngSubmit} className="space-y-3">
            <div><Label className="text-xs text-[#5C665F]">Ad *</Label><Input value={ingForm.name} onChange={e => setIngForm(p => ({...p, name: e.target.value}))} required placeholder="Yumurta, Un, Yağ..." className="h-9 text-sm mt-1 rounded-xl" data-testid="ingredient-name-input" /></div>
            <div>
              <Label className="text-xs text-[#5C665F]">Ölçü vahidi *</Label>
              <select value={ingForm.unit} onChange={e => setIngForm(p => ({...p, unit: e.target.value}))} className="w-full h-9 text-sm mt-1 rounded-xl border border-[#E6E5DF] px-3 bg-white">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs text-[#5C665F]">Mövcud</Label><Input type="number" step="0.01" value={ingForm.current_stock} onChange={e => setIngForm(p => ({...p, current_stock: parseFloat(e.target.value) || 0}))} className="h-9 text-sm mt-1 rounded-xl" /></div>
              <div><Label className="text-xs text-[#5C665F]">Min. stok</Label><Input type="number" step="0.01" value={ingForm.min_stock} onChange={e => setIngForm(p => ({...p, min_stock: parseFloat(e.target.value) || 0}))} className="h-9 text-sm mt-1 rounded-xl" /></div>
              <div><Label className="text-xs text-[#5C665F]">Qiymət</Label><Input type="number" step="0.01" value={ingForm.cost_per_unit} onChange={e => setIngForm(p => ({...p, cost_per_unit: parseFloat(e.target.value) || 0}))} className="h-9 text-sm mt-1 rounded-xl" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowIngDialog(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl" data-testid="submit-ingredient">{editingIng ? 'Yadda saxla' : 'Yarat'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={showTxDialog} onOpenChange={setShowTxDialog}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-base font-medium flex items-center gap-2">
              {txForm.transaction_type === 'purchase' ? <ArrowDownCircle className="w-4 h-4 text-[#3E6A4B]" /> : <ArrowUpCircle className="w-4 h-4 text-[#C05C3D]" />}
              {selectedIng?.name} - {txForm.transaction_type === 'purchase' ? 'Alış' : 'İstifadə'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTxSubmit} className="space-y-3">
            <div className="bg-[#F9F9F7] rounded-xl p-2.5 border border-[#E6E5DF]">
              <p className="text-[10px] text-[#8A948D]">Mövcud stok</p>
              <p className="text-base font-semibold text-[#181C1A]">{selectedIng?.current_stock} {selectedIng?.unit}</p>
            </div>
            <div><Label className="text-xs text-[#5C665F]">Miqdar ({selectedIng?.unit}) *</Label><Input type="number" step="0.01" value={txForm.quantity} onChange={e => setTxForm(p => ({...p, quantity: e.target.value}))} required className="h-9 text-sm mt-1 rounded-xl" data-testid="tx-quantity-input" /></div>
            {txForm.transaction_type === 'purchase' && (
              <div><Label className="text-xs text-[#5C665F]">Vahid qiymət (AZN)</Label><Input type="number" step="0.01" value={txForm.unit_cost} onChange={e => setTxForm(p => ({...p, unit_cost: e.target.value}))} className="h-9 text-sm mt-1 rounded-xl" /></div>
            )}
            <div><Label className="text-xs text-[#5C665F]">Tarix</Label><Input type="date" value={txForm.date} onChange={e => setTxForm(p => ({...p, date: e.target.value}))} className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div><Label className="text-xs text-[#5C665F]">Qeyd</Label><Input value={txForm.notes} onChange={e => setTxForm(p => ({...p, notes: e.target.value}))} placeholder="Əlavə qeyd..." className="h-9 text-sm mt-1 rounded-xl" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowTxDialog(false)} className="rounded-xl">Ləğv et</Button>
              <Button type="submit" size="sm" className={`text-white rounded-xl ${txForm.transaction_type === 'purchase' ? 'bg-[#3E6A4B] hover:bg-[#2A5A3B]' : 'bg-[#C05C3D] hover:bg-[#A64D31]'}`} data-testid="submit-transaction">
                Təsdiqlə
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={showTxHistory} onOpenChange={setShowTxHistory}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="heading-font text-base font-medium">{selectedIng?.name} - Əməliyyat Tarixçəsi</DialogTitle></DialogHeader>
          {transactions.length === 0 ? (
            <p className="text-xs text-[#8A948D] text-center py-6">Əməliyyat yoxdur</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F9F9F7] border border-[#E6E5DF]">
                  <div className="flex items-center gap-2.5">
                    {tx.transaction_type === 'purchase' ? <ArrowDownCircle className="w-4 h-4 text-[#3E6A4B] shrink-0" /> : <ArrowUpCircle className="w-4 h-4 text-[#C05C3D] shrink-0" />}
                    <div>
                      <p className="text-xs font-medium text-[#181C1A]">
                        {tx.transaction_type === 'purchase' ? 'Alış' : 'İstifadə'}: {tx.quantity} {selectedIng?.unit}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#8A948D]">{tx.date}</span>
                        {tx.notes && <span className="text-[10px] text-[#5C665F]">{tx.notes}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {tx.total_cost > 0 && <p className="text-[10px] text-[#5C665F]">{tx.total_cost?.toFixed(2)} AZN</p>}
                    <p className="text-[10px] text-[#8A948D]">Qalıq: {tx.stock_after}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Recipe Dialog */}
      <Dialog open={showRecipeDialog} onOpenChange={setShowRecipeDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-base font-medium flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#C05C3D]" />
              {selectedMenuItem?.name} - Resept
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Current recipe items */}
            {recipeItems.length > 0 && (
              <div className="space-y-2">
                {recipeItems.map((ri, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#F9F9F7] rounded-xl p-2.5 border border-[#E6E5DF]">
                    <div>
                      <p className="text-xs font-medium text-[#181C1A]">{ri.ingredient_name}</p>
                      <p className="text-[10px] text-[#8A948D]">{ri.ingredient_unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="number" step="0.01" value={ri.quantity} onChange={e => updateRecipeQty(idx, e.target.value)} className="w-20 h-7 text-xs text-center rounded-lg" />
                      <Button variant="ghost" size="sm" onClick={() => removeRecipeItem(idx)} className="h-7 w-7 p-0 text-[#B74134]"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add ingredient */}
            <div>
              <Label className="text-xs text-[#5C665F]">Xammal əlavə et</Label>
              <div className="mt-1 max-h-32 overflow-y-auto bg-white border border-[#E6E5DF] rounded-xl">
                {ingredients.filter(ing => !recipeItems.find(ri => ri.ingredient_id === ing.id)).map(ing => (
                  <button key={ing.id} onClick={() => addRecipeIngredient(ing)} className="w-full flex justify-between items-center p-2 hover:bg-[#F9F9F7] text-left border-b border-[#E6E5DF] last:border-0 transition-colors" data-testid={`add-recipe-ing-${ing.id}`}>
                    <span className="text-xs text-[#181C1A]">{ing.name}</span>
                    <span className="text-[10px] text-[#8A948D]">{ing.unit}</span>
                  </button>
                ))}
                {ingredients.length === 0 && <p className="text-xs text-[#8A948D] text-center py-3">Əvvəlcə xammal əlavə edin</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowRecipeDialog(false)} className="rounded-xl">Ləğv et</Button>
              <Button size="sm" onClick={saveRecipe} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-xl" data-testid="save-recipe">Yadda saxla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
