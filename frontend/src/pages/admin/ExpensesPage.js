import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EXPENSE_CATEGORIES = [
  'Kommunal',  // İşıq, su, qaz
  'Ərzaq',     // Çörək, içkilər, xammal
  'Əməkhaqqı', // İşçilərə maaş
  'İcarə',     // Bina icarəsi
  'Təmir',     // Təmir-bərpa
  'Digər'      // Digər xərclər
];

const EXPENSE_TYPES = [
  { value: 'daily', label: 'Günlük' },
  { value: 'weekly', label: 'Həftəlik' },
  { value: 'monthly', label: 'Aylıq' }
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'Kommunal',
    expense_type: 'daily',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/expenses`);
      setExpenses(response.data);
      const total = response.data.reduce((sum, exp) => sum + exp.amount, 0);
      setTotalExpenses(total);
    } catch (error) {
      toast.error('Xərclər yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, amount: parseFloat(formData.amount) };
      if (editingExpense) {
        await axios.put(`${API}/expenses/${editingExpense.id}`, data);
        toast.success('Xərc yeniləndi');
      } else {
        await axios.post(`${API}/expenses`, data);
        toast.success('Xərc əlavə edildi');
      }
      setDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xərci silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API}/expenses/${id}`);
      toast.success('Xərc silindi');
      fetchExpenses();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      category: expense.category,
      expense_type: expense.expense_type,
      date: expense.date,
      notes: expense.notes || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      category: 'Kommunal',
      expense_type: 'daily',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingExpense(null);
  };

  const getExpenseTypeLabel = (type) => {
    const found = EXPENSE_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font">Xərclər İdarəetməsi</h1>
          <p className="text-[#5C6B61] mt-2">Restoranın bütün xərclərini qeyd edin və izləyin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md">
              <Plus className="w-4 h-4 mr-2" />
              Xərc Əlavə Et
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-[#1A4D2E] heading-font">
                {editingExpense ? 'Xərci Redaktə Et' : 'Xərc Əlavə Et'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Xərc Adı *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} 
                  required 
                  placeholder="Məsələn: İşıq pulu, Çörək"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Məbləğ (AZN) *</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.amount} 
                    onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <Label>Tarix *</Label>
                  <Input 
                    type="date" 
                    value={formData.date} 
                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} 
                    required 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kateqoriya *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Növ *</Label>
                  <Select value={formData.expense_type} onValueChange={(v) => setFormData(p => ({ ...p, expense_type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Qeydlər</Label>
                <Textarea 
                  value={formData.notes} 
                  onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} 
                  rows={3} 
                  placeholder="Əlavə məlumat"
                />
              </div>
              <Button type="submit" className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white">
                {az.save}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Card className="bg-gradient-to-br from-[#E76F51] to-[#D4533C] text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Xərclər</CardTitle>
            <DollarSign className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalExpenses.toFixed(2)} AZN</div>
            <p className="text-xs text-white/80 mt-2">Bütün qeydə alınmış xərclər</p>
          </CardContent>
        </Card>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">Hələ xərc qeydə alınmayıb</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8E2] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F5F9E9]">
              <tr>
                <th className="text-left p-4 text-[#1A4D2E] font-semibold">Xərc</th>
                <th className="text-left p-4 text-[#1A4D2E] font-semibold">Kateqoriya</th>
                <th className="text-left p-4 text-[#1A4D2E] font-semibold">Növ</th>
                <th className="text-right p-4 text-[#1A4D2E] font-semibold">Məbləğ</th>
                <th className="text-left p-4 text-[#1A4D2E] font-semibold">Tarix</th>
                <th className="text-center p-4 text-[#1A4D2E] font-semibold">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense.id} className="border-t border-[#E2E8E2]">
                  <td className="p-4">
                    <div className="font-semibold text-[#1A4D2E]">{expense.name}</div>
                    {expense.notes && <div className="text-xs text-[#5C6B61] mt-1">{expense.notes}</div>}
                  </td>
                  <td className="p-4 text-[#5C6B61]">{expense.category}</td>
                  <td className="p-4 text-[#5C6B61]">{getExpenseTypeLabel(expense.expense_type)}</td>
                  <td className="p-4 text-right font-bold text-[#E76F51]">{expense.amount.toFixed(2)} AZN</td>
                  <td className="p-4 text-[#5C6B61]">{new Date(expense.date).toLocaleDateString('az-AZ')}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(expense)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
