import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Sparkles, Eye, EyeOff, Plus, Trash2, Edit2, Star, MapPin, ImagePlus,
  Upload, Loader2, X as XIcon, MapPinned, Instagram, Facebook, Music2,
  Youtube, Send, Linkedin, Twitter, Globe, MessageCircle, Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram, placeholder: 'https://www.instagram.com/...' },
  { key: 'facebook', label: 'Facebook', Icon: Facebook, placeholder: 'https://www.facebook.com/...' },
  { key: 'tiktok', label: 'TikTok', Icon: Music2, placeholder: 'https://www.tiktok.com/@...' },
  { key: 'youtube', label: 'YouTube', Icon: Youtube, placeholder: 'https://www.youtube.com/@...' },
  { key: 'x', label: 'X (Twitter)', Icon: Twitter, placeholder: 'https://x.com/...' },
  { key: 'telegram', label: 'Telegram', Icon: Send, placeholder: 'https://t.me/...' },
  { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, placeholder: '+994...' },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin, placeholder: 'https://www.linkedin.com/...' },
  { key: 'website', label: 'Sayt', Icon: Globe, placeholder: 'https://...' },
  { key: 'other', label: 'Digər', Icon: Link2, placeholder: 'https://...' },
];

const platformMeta = (key) => PLATFORMS.find((p) => p.key === key) || PLATFORMS[PLATFORMS.length - 1];

const EMPTY_FORM = {
  restaurant_id: '',
  name: '',
  description: '',
  logo_url: '',
  cover_url: '',
  address: '',
  phone: '',
  social_links: [],
  menu_table_id: '',
  latitude: '',
  longitude: '',
  is_featured: false,
  is_visible: true,
};

// Convert legacy single-fields (instagram/facebook/whatsapp/website) → social_links
const toFormSocialLinks = (p) => {
  const list = Array.isArray(p.social_links) ? [...p.social_links] : [];
  const seen = new Set(list.map((s) => `${s.platform}::${s.url}`));
  const pushIfNew = (platform, url) => {
    if (url && !seen.has(`${platform}::${url}`)) list.push({ platform, url, label: '' });
  };
  pushIfNew('instagram', p.instagram);
  pushIfNew('facebook', p.facebook);
  pushIfNew('whatsapp', p.whatsapp);
  pushIfNew('website', p.website);
  return list;
};

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [eligible, setEligible] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, cover: false });
  const [autoTableInfo, setAutoTableInfo] = useState(''); // hint shown under restaurant select
  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);

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
    setAutoTableInfo('');
    setShowForm(true);
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({
      ...EMPTY_FORM,
      ...p,
      latitude: p.latitude ?? '',
      longitude: p.longitude ?? '',
      social_links: toFormSocialLinks(p),
    });
    setAutoTableInfo(p.menu_table_id ? 'Menyu masası avtomatik təyin edilib.' : '');
    setShowForm(true);
  };

  // When a restaurant is picked, auto-fetch first table id and pre-fill name
  const onRestSelect = async (rid) => {
    const r = eligible.find((x) => x.id === rid);
    setForm((f) => ({ ...f, restaurant_id: rid, name: f.name || (r?.name || '') }));
    if (!rid) { setAutoTableInfo(''); return; }
    try {
      const res = await axios.get(`${API}/tables`, {
        headers: auth(),
        params: { restaurant_id: rid },
      });
      const list = res.data || [];
      if (list.length > 0) {
        const sorted = [...list].sort((a, b) => {
          const an = parseInt(a.table_number, 10);
          const bn = parseInt(b.table_number, 10);
          if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
          return String(a.table_number || '').localeCompare(String(b.table_number || ''));
        });
        const first = sorted[0];
        setForm((f) => ({ ...f, menu_table_id: first.id }));
        setAutoTableInfo(`Menyu avtomatik bağlandı: Masa #${first.table_number}`);
      } else {
        setAutoTableInfo('Bu restoranda hələ masa yoxdur — menyu linki sonra avtomatik bağlanacaq.');
      }
    } catch {
      setAutoTableInfo('');
    }
  };

  const uploadImage = async (file, kind) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Şəkil 5MB-dan kiçik olmalıdır'); return; }
    setUploading((u) => ({ ...u, [kind]: true }));
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(`${API}/upload/image`, fd, {
        headers: { ...auth(), 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.url || '';
      // Build absolute URL so it works on the public landing page too
      const absolute = url.startsWith('http') ? url : `${process.env.REACT_APP_BACKEND_URL || ''}${url}`;
      setForm((f) => ({ ...f, [`${kind}_url`]: absolute }));
      toast.success(kind === 'logo' ? 'Logo yükləndi' : 'Cover yükləndi');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Yükləmə xətası');
    } finally {
      setUploading((u) => ({ ...u, [kind]: false }));
    }
  };

  const addSocialLink = (platform = 'instagram') => {
    setForm((f) => ({ ...f, social_links: [...(f.social_links || []), { platform, url: '', label: '' }] }));
  };

  const updateSocialLink = (idx, patch) => {
    setForm((f) => ({
      ...f,
      social_links: (f.social_links || []).map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const removeSocialLink = (idx) => {
    setForm((f) => ({ ...f, social_links: (f.social_links || []).filter((_, i) => i !== idx) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!editing && !form.restaurant_id) { toast.error('Restoran seçin'); return; }
    if (!form.name) { toast.error('Ad daxil edin'); return; }
    setSaving(true);
    try {
      // Sanitize social links: drop empty rows
      const cleanLinks = (form.social_links || [])
        .filter((s) => s.url && s.url.trim())
        .map((s) => ({ platform: s.platform || 'other', url: s.url.trim(), label: s.label || '' }));

      // Backwards-compat: also write the legacy single-fields so existing public UI keeps working
      const pickFirst = (key) => cleanLinks.find((s) => s.platform === key)?.url || '';

      const payload = {
        ...form,
        social_links: cleanLinks,
        instagram: pickFirst('instagram'),
        facebook: pickFirst('facebook'),
        whatsapp: pickFirst('whatsapp'),
        website: pickFirst('website'),
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

  const openGoogleMaps = () => {
    // Quick helper: open Google Maps in a new tab so the user can copy the share link
    window.open('https://www.google.com/maps', '_blank', 'noopener,noreferrer');
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
                  : <div className="w-full h-full grid place-items-center text-stone-300"><ImagePlus size={28} /></div>}
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
            className="w-full max-w-2xl bg-white rounded-2xl p-6 my-8 space-y-4"
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
                {autoTableInfo && (
                  <p className="text-[11px] text-emerald-700 mt-1">{autoTableInfo}</p>
                )}
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

            {/* LOGO + COVER UPLOAD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Logo</Label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden grid place-items-center shrink-0">
                    {form.logo_url
                      ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
                      : <ImagePlus className="text-stone-300" size={22} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadImage(e.target.files?.[0], 'logo')}
                      data-testid="partner-form-logo-file"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploading.logo}>
                      {uploading.logo ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                      {form.logo_url ? 'Dəyişdir' : 'Yüklə'}
                    </Button>
                    {form.logo_url && (
                      <button type="button" onClick={() => setForm({ ...form, logo_url: '' })} className="text-[11px] text-red-600 hover:underline self-start">
                        <XIcon size={11} className="inline mr-0.5" /> Sil
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label>Cover (banner)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="w-32 h-20 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden grid place-items-center shrink-0">
                    {form.cover_url
                      ? <img src={form.cover_url} alt="cover" className="w-full h-full object-cover" />
                      : <ImagePlus className="text-stone-300" size={22} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadImage(e.target.files?.[0], 'cover')}
                      data-testid="partner-form-cover-file"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={uploading.cover}>
                      {uploading.cover ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                      {form.cover_url ? 'Dəyişdir' : 'Yüklə'}
                    </Button>
                    {form.cover_url && (
                      <button type="button" onClick={() => setForm({ ...form, cover_url: '' })} className="text-[11px] text-red-600 hover:underline self-start">
                        <XIcon size={11} className="inline mr-0.5" /> Sil
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ADDRESS — Google Maps link */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Ünvan / Google Maps linki</Label>
                <button type="button" onClick={openGoogleMaps} className="text-[11px] text-[#C05C3D] hover:underline inline-flex items-center gap-1">
                  <MapPinned size={12} /> Google Maps-da aç
                </button>
              </div>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Mətn ünvan və ya https://maps.app.goo.gl/... linkini yapışdırın"
                data-testid="partner-form-address"
              />
              <p className="text-[11px] text-stone-500 mt-1">Google Maps-da yeri tapın → "Paylaş" → "Linki kopyala" → bura yapışdırın. Xəritə avtomatik göstəriləcək.</p>
            </div>

            {/* SOCIAL LINKS — dynamic */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sosial şəbəkələr & linklər</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addSocialLink('instagram')} data-testid="partner-form-add-social">
                  <Plus className="w-4 h-4 mr-1" /> Əlavə et
                </Button>
              </div>
              {(form.social_links || []).length === 0 ? (
                <p className="text-[12px] text-stone-500 italic">Hələ link yoxdur. "Əlavə et" düyməsi ilə Instagram, TikTok, YouTube və s. əlavə edə bilərsiniz.</p>
              ) : (
                <div className="space-y-2">
                  {(form.social_links || []).map((s, i) => {
                    const meta = platformMeta(s.platform);
                    const Icon = meta.Icon;
                    return (
                      <div key={i} className="flex items-center gap-2" data-testid={`partner-social-row-${i}`}>
                        <div className="w-9 h-9 rounded-lg bg-stone-100 grid place-items-center shrink-0">
                          <Icon size={16} className="text-stone-700" />
                        </div>
                        <select
                          value={s.platform}
                          onChange={(e) => updateSocialLink(i, { platform: e.target.value })}
                          className="border border-stone-200 rounded-md px-2 py-2 text-sm bg-white"
                        >
                          {PLATFORMS.map((p) => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                          ))}
                        </select>
                        <Input
                          value={s.url}
                          onChange={(e) => updateSocialLink(i, { url: e.target.value })}
                          placeholder={meta.placeholder}
                          className="flex-1"
                          data-testid={`partner-social-url-${i}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeSocialLink(i)}
                          className="w-9 h-9 grid place-items-center rounded-lg bg-stone-100 hover:bg-red-50 text-stone-500 hover:text-red-600 shrink-0"
                          data-testid={`partner-social-remove-${i}`}
                          aria-label="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
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
