import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    tax_percentage: 0,
    service_charge_percentage: 0,
    currency: 'AZN',
    admin_pin: ''
  });
  const [loading, setLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      toast.error('Parametrlər yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/settings`, settings);
      toast.success('Parametrlər yadda saxlanıldı');
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight mb-8">Restoran Parametrləri</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#181C1A]">Əsas Məlumatlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Restoran Adı *</Label>
                <Input
                  value={settings.name}
                  onChange={(e) => setSettings(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Ünvan</Label>
                <Input
                  value={settings.address}
                  onChange={(e) => setSettings(p => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={settings.phone}
                  onChange={(e) => setSettings(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings(p => ({ ...p, email: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#181C1A]">Maliyyə Parametrləri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Vergi (ƏDV) %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.tax_percentage}
                  onChange={(e) => setSettings(p => ({ ...p, tax_percentage: parseFloat(e.target.value) || 0 }))}
                />
                <p className="text-xs text-[#5C665F] mt-1">Azərbaycanda ƏDV: 18%</p>
              </div>
              <div>
                <Label>Xidmət Haqqı %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.service_charge_percentage}
                  onChange={(e) => setSettings(p => ({ ...p, service_charge_percentage: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Valyuta</Label>
                <Input
                  value={settings.currency}
                  onChange={(e) => setSettings(p => ({ ...p, currency: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Admin PIN Security Card */}
          <Card className="lg:col-span-2 border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="text-[#181C1A] flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Admin Təhlükəsizlik PIN
              </CardTitle>
              <CardDescription>
                Administrator həssas bölmələrə (Xərclər, Analitika, Maliyyə, Endirimlər, Satış Statistikası, Menyu) giriş edəndə bu PIN tələb olunacaq. Aktiv Stollar və Rezervasiyalar PIN tələb etmir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm">
                <Label>Admin PIN (boş saxlasanız, PIN tələb olunmayacaq)</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPin ? 'text' : 'password'}
                    value={settings.admin_pin || ''}
                    onChange={(e) => setSettings(p => ({ ...p, admin_pin: e.target.value }))}
                    placeholder="4-6 rəqəmli PIN"
                    className="pr-10"
                    data-testid="admin-pin-setting"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C665F]"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-orange-700 mt-2">
                  ⚠️ Bu PIN təhlükəsizlik üçündür. Administrator müştəri ilə məşğul olarkən başqaları həssas məlumatlara baxa bilməz.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Button type="submit" className="bg-[#C05C3D] hover:bg-[#A64D31] text-white px-8 py-6 rounded-md text-lg">
            <Save className="w-5 h-5 mr-2" />
            Yadda Saxla
          </Button>
        </div>
      </form>
    </div>
  );
}
