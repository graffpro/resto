import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Sparkles, Eye, EyeOff, Plus, Trash2, Edit2, Star, MapPin, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const EMPTY_FORM = {
  restaurant_id: '',
  name: '',
  description: '',
  logo_url: '',
  cover_url: '',
  address: '',
  phone: '',
  instagram: '',
  facebook: '',
  whatsapp: '',
  website: '',
  menu_table_id: '',
  latitude: '',
  longitude: '',
  is_featured: false,
  is_visible: true,
};

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [eligible, setEligible] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        axios.get(`${API}/owner/partners`, { headers: auth() }),
        axios.get(`${API}/owner/eligible-restaurants`, { headers: auth() }),
      ]);
      setPartners(pRes.data || []);
      setEligible(eRes.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Yüklənmədi');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({
      ...EMPTY_FORM,
      ...p,
      latitude: p.latitude ?? '',
      longitude: p.longitude ?? '',
    });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!editing && !form.restaurant_id) { toast.error('Restoran seçin'); return; }
    if (!form.name) { toast.error('Ad daxil edin'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
      };
      if (editing) {
        await axios.put(`${API}/owner/partners/${editing.id}`, payload, { headers: auth() });
        toast.success('Yeniləndi');
      } else {
        await axios.post(`${API}/owner/partners`, payload, { headers: auth() });
        toast.success('Partnyor əlavə edildi');
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Xəta');
    } finally { setSaving(false); }
  };

  const toggleField = async (p, field) => {
    try {
      await axios.put(`${API}/owner/partners/${p.id}`, { [field]: !p[field] }, { headers: auth() });
      load();
    } catch { toast.error('Xəta'); }
  };

  const remove = async (p) => {
    if (!window.confirm(`${p.name} silinsin?`)) return;
    try {
      await axios.delete(`${API}/owner/partners/${p.id}`, { headers: auth() });
      toast.success('Silindi');
      load();
    } catch { toast.error('Xəta'); }
  };

  const onRestSelect = (rid) => {
    const r = eligible.find((x) => x.id === rid);
    setForm((f) => ({ ...f, restaurant_id: rid, name: f.name || (r?.name || '') }));
  };

  return (
    <div className="space-y-6" data-testid="owner-partners-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Partnyor Restoranlar</h1>
          <p className="text-sm text-stone-600">Saytda göstərilən təsdiqlənmiş restoranlar.</p>
        </div>
        <Button onClick={startCreate} className="bg-[#C05C3D] hover:bg-[#A04C30]" data-testid="add-partner-btn">
          <Plus className="w-4 h-4 mr-1" /> Yeni Partnyor
        </Button>
      </div>

      {loading ? (
        <div className="text-stone-500 text-sm">Yüklənir...</div>
      ) : partners.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-10 text-center">
          <p className="text-stone-500 text-sm mb-4">Hələ partnyor yoxdur. Restoranlardan birini partnyor kimi qeyd edin.</p>
          <Button onClick={startCreate} variant="outline" size="sm" data-testid="empty-add-partner-btn">
            <Plus className="w-4 h-4 mr-1" /> Əlavə et
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="owner-partners-grid">
          {partners.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
              <div className="h-28 bg-stone-100 relative overflow-hidden">
                {p.cover_url
                  ? <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full grid place-items-center text-stone-300"><ImageIcon size={28} /></div>}
                {p.is_featured && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-amber-900">
                    <Sparkles size={10} /> Featured
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden grid place-items-center shrink-0">
                    {p.logo_url
                      ? <img src={p.logo_url} alt="" className="w-full h-full object-cover" />
                      : <span className="font-black">{p.name?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{p.name}</p>
                    <p className="text-[11px] text-stone-500 truncate">{p.restaurant_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-600 mb-3">
                  <span className="inline-flex items-center gap-1"><Star size={12} className="fill-amber-400 text-amber-400" /> {(p.rating_avg || 0).toFixed(1)} ({p.ratings_count || 0})</span>
                  {p.address && <span className="inline-flex items-center gap-1 truncate"><MapPin size={12} /> {p.address}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => toggleField(p, 'is_visible')} className={`text-xs px-3 py-1.5 rounded-full border ${p.is_visible ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-100 text-stone-500 border-stone-200'}`} data-testid={`toggle-visible-${p.id}`}>
                    {p.is_visible ? <Eye size={12} className="inline mr-1" /> : <EyeOff size={12} className="inline mr-1" />}
                    {p.is_visible ? 'Görünür' : 'Gizli'}
                  </button>
                  <button onClick={() => toggleField(p, 'is_featured')} className={`text-xs px-3 py-1.5 rounded-full border ${p.is_featured ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-stone-100 text-stone-500 border-stone-200'}`} data-testid={`toggle-featured-${p.id}`}>
                    <Sparkles size={12} className="inline mr-1" /> Featured
                  </button>
                  <button onClick={() => startEdit(p)} className="text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-stone-50" data-testid={`edit-partner-${p.id}`}>
                    <Edit2 size={12} className="inline mr-1" /> Düzəliş
                  </button>
                  <button onClick={() => remove(p)} className="text-xs px-3 py-1.5 rounded-full border bg-white text-red-600 hover:bg-red-50" data-testid={`delete-partner-${p.id}`}>
                    <Trash2 size={12} className="inline" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-2xl p-6 my-8 space-y-3"
            data-testid="partner-form"
          >
            <h2 className="text-xl font-black">{editing ? 'Partnyoru redaktə et' : 'Yeni Partnyor'}</h2>

            {!editing && (
              <div>
                <Label>Restoran</Label>
                <select
                  value={form.restaurant_id}
                  onChange={(e) => onRestSelect(e.target.value)}
                  className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm"
                  data-testid="partner-form-restaurant"
                  required
                >
                  <option value="">Seçin...</option>
                  {eligible.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Görünən Ad *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="partner-form-name" />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="partner-form-phone" />
              </div>
            </div>

            <div>
              <Label>Təsvir</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="partner-form-description" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Logo URL</Label>
                <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} data-testid="partner-form-logo" />
              </div>
              <div>
                <Label>Cover URL (banner)</Label>
                <Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} data-testid="partner-form-cover" />
              </div>
            </div>

            <div>
              <Label>Ünvan</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="partner-form-address" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} data-testid="partner-form-lat" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} data-testid="partner-form-lng" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Instagram URL</Label>
                <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} data-testid="partner-form-instagram" />
              </div>
              <div>
                <Label>Facebook URL</Label>
                <Input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} data-testid="partner-form-facebook" />
              </div>
              <div>
                <Label>WhatsApp (telefon)</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+994..." data-testid="partner-form-whatsapp" />
              </div>
              <div>
                <Label>Sayt</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} data-testid="partner-form-website" />
              </div>
            </div>

            <div>
              <Label>Menyu masa ID (public menyu üçün)</Label>
              <Input value={form.menu_table_id} onChange={(e) => setForm({ ...form, menu_table_id: e.target.value })} placeholder="UUID" data-testid="partner-form-menu-table" />
              <p className="text-[11px] text-stone-500 mt-1">"Menyunu Gör" düyməsi /table/{'<id>'} ünvanına yönləndirir.</p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} data-testid="partner-form-visible" />
                Saytda göstər
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} data-testid="partner-form-featured" />
                Önə Çıxan (Featured)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Ləğv et</Button>
              <Button type="submit" disabled={saving} className="bg-[#C05C3D] hover:bg-[#A04C30]" data-testid="partner-form-submit">
                {saving ? '...' : (editing ? 'Yenilə' : 'Əlavə et')}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
