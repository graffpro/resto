import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Percent, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'percentage',
    value: '',
    min_order_amount: 0,
    valid_from: '',
    valid_until: ''
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/discounts`);
      setDiscounts(response.data);
    } catch (error) {
      toast.error('Endirimlər yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, value: parseFloat(formData.value), min_order_amount: parseFloat(formData.min_order_amount) || 0 };
      if (editingDiscount) {
        await axios.put(`${API}/discounts/${editingDiscount.id}`, data);
        toast.success('Endirim yeniləndi');
      } else {
        await axios.post(`${API}/discounts`, data);
        toast.success('Endirim əlavə edildi');
      }
      setDialogOpen(false);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Endirimi silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API}/discounts/${id}`);
      toast.success('Endirim silindi');
      fetchDiscounts();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleToggle = async (id) => {
    try {
      const response = await axios.put(`${API}/discounts/${id}/toggle`);
      toast.success(response.data.is_active ? 'Endirim aktivləşdirildi' : 'Endirim deaktiv edildi');
      fetchDiscounts();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      description: discount.description || '',
      discount_type: discount.discount_type,
      value: discount.value.toString(),
      min_order_amount: discount.min_order_amount,
      valid_from: discount.valid_from || '',
      valid_until: discount.valid_until || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_type: 'percentage',
      value: '',
      min_order_amount: 0,
      valid_from: '',
      valid_until: ''
    });
    setEditingDiscount(null);
  };

  const activeDiscounts = discounts.filter(d => d.is_active);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight">Endirimlər</h1>
          <p className="text-[#5C665F] mt-0.5">Endirim kampaniyalarını idarə edin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#C05C3D] hover:bg-[#A64D31] text-white text-xs rounded-xl" data-testid="add-discount-btn">
              <Plus className="w-4 h-4 mr-2" />
              Endirim Əlavə Et
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-[#181C1A] heading-font">
                {editingDiscount ? 'Endirimi Redaktə Et' : 'Endirim Əlavə Et'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Endirim Adı *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} 
                  required 
                  placeholder="Məsələn: Yeni il Endirimi"
                  data-testid="discount-name-input"
                />
              </div>
              <div>
                <Label>Təsvir</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} 
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Endirim Növü *</Label>
                  <Select value={formData.discount_type} onValueChange={(v) => setFormData(p => ({ ...p, discount_type: v }))}>
                    <SelectTrigger data-testid="discount-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Faiz (%)</SelectItem>
                      <SelectItem value="fixed">Sabit Məbləğ (AZN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dəyər *</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.value} 
                    onChange={(e) => setFormData(p => ({ ...p, value: e.target.value }))} 
                    required 
                    placeholder={formData.discount_type === 'percentage' ? '10' : '5.00'}
                    data-testid="discount-value-input"
                  />
                </div>
              </div>
              <div>
                <Label>Minimum Sifariş Məbləği (AZN)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={formData.min_order_amount} 
                  onChange={(e) => setFormData(p => ({ ...p, min_order_amount: e.target.value }))} 
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Başlama Tarixi</Label>
                  <Input 
                    type="date" 
                    value={formData.valid_from} 
                    onChange={(e) => setFormData(p => ({ ...p, valid_from: e.target.value }))} 
                  />
                </div>
                <div>
                  <Label>Bitmə Tarixi</Label>
                  <Input 
                    type="date" 
                    value={formData.valid_until} 
                    onChange={(e) => setFormData(p => ({ ...p, valid_until: e.target.value }))} 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#C05C3D] hover:bg-[#A64D31] text-white" data-testid="save-discount-btn">
                {az.save}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-[#4F9D69] to-[#3A7D52] text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktiv Endirimlər</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeDiscounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#5C665F]">Ümumi Endirimlər</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#181C1A]">{discounts.length}</div>
          </CardContent>
        </Card>
      </div>

      {discounts.length === 0 ? (
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-12 text-center">
          <p className="text-[#5C665F] text-lg">Hələ endirim yoxdur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {discounts.map(discount => (
            <Card key={discount.id} className={`overflow-hidden ${!discount.is_active ? 'opacity-60' : ''}`} data-testid={`discount-card-${discount.id}`}>
              <div className={`h-2 ${discount.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${discount.is_active ? 'bg-[#F9F9F7]' : 'bg-gray-100'}`}>
                      {discount.discount_type === 'percentage' ? (
                        <Percent className={`w-6 h-6 ${discount.is_active ? 'text-[#4F9D69]' : 'text-gray-400'}`} />
                      ) : (
                        <DollarSign className={`w-6 h-6 ${discount.is_active ? 'text-[#4F9D69]' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#181C1A]">{discount.name}</h3>
                      <p className="text-2xl font-bold text-[#4F9D69]">
                        {discount.discount_type === 'percentage' ? `${discount.value}%` : `${discount.value} AZN`}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleToggle(discount.id)}
                    className="text-gray-400 hover:text-[#4F9D69]"
                    data-testid={`toggle-discount-${discount.id}`}
                  >
                    {discount.is_active ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {discount.description && (
                  <p className="text-sm text-[#5C665F] mb-4">{discount.description}</p>
                )}

                <div className="space-y-2 text-sm text-[#5C665F] mb-4">
                  {discount.min_order_amount > 0 && (
                    <p>Min. sifariş: <span className="font-semibold">{discount.min_order_amount} AZN</span></p>
                  )}
                  {discount.valid_from && (
                    <p>Başlama: <span className="font-semibold">{new Date(discount.valid_from).toLocaleDateString('az-AZ')}</span></p>
                  )}
                  {discount.valid_until && (
                    <p>Bitmə: <span className="font-semibold">{new Date(discount.valid_until).toLocaleDateString('az-AZ')}</span></p>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-[#E6E5DF]">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(discount)} className="flex-1" data-testid={`edit-discount-${discount.id}`}>
                    <Edit className="w-4 h-4 mr-1" />
                    {az.edit}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(discount.id)} data-testid={`delete-discount-${discount.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
