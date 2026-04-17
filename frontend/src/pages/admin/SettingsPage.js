import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`);
      setSettings(res.data);
    } catch { toast.error('Ayarlar yüklənmədi'); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings);
      toast.success('Ayarlar yadda saxlanıldı');
    } catch (err) { toast.error(err.response?.data?.detail || 'Xəta'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent"></div></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="heading-font text-xl font-medium text-[#181C1A] tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Ayarlar
        </h1>
        <p className="text-[#5C665F] mt-0.5 text-sm">Restoran parametrlərini idarə edin</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {/* Restaurant Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#181C1A]">Restoran Məlumatları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-[#5C665F]">Restoran adı</Label>
              <Input
                value={settings?.name || ''}
                onChange={(e) => setSettings(s => ({ ...s, name: e.target.value }))}
                data-testid="settings-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#5C665F]">Ünvan</Label>
                <Input
                  value={settings?.address || ''}
                  onChange={(e) => setSettings(s => ({ ...s, address: e.target.value }))}
                  data-testid="settings-address"
                />
              </div>
              <div>
                <Label className="text-xs text-[#5C665F]">Telefon</Label>
                <Input
                  value={settings?.phone || ''}
                  onChange={(e) => setSettings(s => ({ ...s, phone: e.target.value }))}
                  data-testid="settings-phone"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#5C665F]">Email</Label>
              <Input
                value={settings?.email || ''}
                onChange={(e) => setSettings(s => ({ ...s, email: e.target.value }))}
                data-testid="settings-email"
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card className="border-[#C05C3D]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#C05C3D] flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Maliyyə Ayarları
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#5C665F] flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  Xidmət Haqqı (%)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settings?.service_charge_percentage ?? 0}
                  onChange={(e) => setSettings(s => ({ ...s, service_charge_percentage: parseFloat(e.target.value) || 0 }))}
                  data-testid="settings-service-charge"
                  className="text-lg font-semibold"
                />
                <p className="text-[10px] text-[#5C665F] mt-1">Hər sifarişə avtomatik tətbiq olunacaq</p>
              </div>
              <div>
                <Label className="text-xs text-[#5C665F] flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  Vergi (%)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settings?.tax_percentage ?? 18}
                  onChange={(e) => setSettings(s => ({ ...s, tax_percentage: parseFloat(e.target.value) || 0 }))}
                  data-testid="settings-tax"
                  className="text-lg font-semibold"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#5C665F]">Valyuta</Label>
              <Input
                value={settings?.currency || 'AZN'}
                onChange={(e) => setSettings(s => ({ ...s, currency: e.target.value }))}
                data-testid="settings-currency"
              />
            </div>
          </CardContent>
        </Card>

        {/* PIN Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#181C1A]">Təhlükəsizlik</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="text-xs text-[#5C665F]">Admin PIN (ümumi)</Label>
              <Input
                type="password"
                value={settings?.admin_pin || ''}
                onChange={(e) => setSettings(s => ({ ...s, admin_pin: e.target.value }))}
                placeholder="PIN daxil edin"
                data-testid="settings-pin"
              />
              <p className="text-[10px] text-[#5C665F] mt-1">Fərdi PIN olmadıqda istifadə olunur</p>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Base URL */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#181C1A]">QR Kod Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-[#5C665F]">Sayt ünvanı (QR kod üçün)</Label>
              <Input
                value={settings?.base_url || ''}
                onChange={(e) => setSettings(s => ({ ...s, base_url: e.target.value }))}
                placeholder="http://178.18.240.211"
                data-testid="settings-base-url"
              />
              <p className="text-[10px] text-[#5C665F] mt-1">QR kodlarda istifadə olunacaq ünvan. Dəyişdirdikdən sonra "QR Kodları Yenilə" basın.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch(`${API}/tables/regenerate-qr`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  const data = await res.json();
                  toast.success(data.message || 'QR kodlar yeniləndi');
                } catch { toast.error('Xəta'); }
              }}
              data-testid="regenerate-qr-btn"
            >
              QR Kodları Yenilə
            </Button>
          </CardContent>
        </Card>

        {/* Customer Menu Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#181C1A]">Müştəri Menyu Görünüşü</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-[#5C665F]">Menyu arxa fon şəkli (URL)</Label>
              <Input
                value={settings?.menu_background_url || ''}
                onChange={(e) => setSettings(s => ({ ...s, menu_background_url: e.target.value }))}
                placeholder="https://example.com/background.jpg"
                data-testid="settings-menu-bg"
              />
              <p className="text-[10px] text-[#5C665F] mt-1">Müştəri menyusu üçün arxa fon şəkli</p>
            </div>
            <div>
              <Label className="text-xs text-[#5C665F]">Restoran logosu (URL)</Label>
              <Input
                value={settings?.logo_url || ''}
                onChange={(e) => setSettings(s => ({ ...s, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
                data-testid="settings-logo-url"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white" data-testid="save-settings-btn">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saxlanılır...' : 'Yadda Saxla'}
        </Button>
      </form>
    </div>
  );
}
