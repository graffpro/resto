import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import {
  QrCode, ChefHat, Users, BarChart3, Package, Bell, Clock, Wifi,
  ArrowRight, Check, ChevronDown, Menu, X, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

const FEATURES = [
  { icon: QrCode, title: 'QR Menyu', desc: 'Müştərilər QR kodu skan edib birbaşa telefondan sifariş verir. Kağız menyu ehtiyacı yoxdur.', span: 'md:col-span-8' },
  { icon: ChefHat, title: 'Mətbəx Ekranı', desc: 'Sifarişlər real-time mətbəxə düşür. Hər item öz stansiyasına yönləndirilir.', span: 'md:col-span-4' },
  { icon: Wifi, title: 'Real-Time', desc: 'WebSocket ilə ani bildirişlər. Sifariş verilən an mətbəx xəbərdar olur.', span: 'md:col-span-4' },
  { icon: Package, title: 'İnventar', desc: 'Xammal izləmə, resept idarəetmə, stok xəbərdarlıqları. Heç vaxt materialınız tükənməz.', span: 'md:col-span-4' },
  { icon: Users, title: 'Personal', desc: 'Mətbəx, Bar, Ofisiant — hər birini ayrıca idarə edin. Növbə sistemi.', span: 'md:col-span-4' },
  { icon: BarChart3, title: 'Analitika', desc: 'Satış, gəlir, populyar məhsullar — hər şeyi görün, hər şeyi bilin.', span: 'md:col-span-6' },
  { icon: Bell, title: 'Ofisiant Çağır', desc: 'Müştəri bir kliklə ofisiantı çağırır. Davamlı alarm səsi, əsla qaçırmayın.', span: 'md:col-span-6' },
];

const STEPS = [
  { num: '01', title: 'Qeydiyyatdan Keçin', desc: 'Restoran adı və şifrə ilə 30 saniyədə başlayın.' },
  { num: '02', title: 'Menyunu Yaradın', desc: 'Kateqoriyalar, qiymətlər, şəkillər əlavə edin.' },
  { num: '03', title: 'QR Kodu Payın', desc: 'Masalara QR kodlar yerləşdirin, sifarişlər axmağa başlasın.' },
];

const FAQS = [
  { q: 'Sistemin qurulması nə qədər vaxt alır?', a: 'Qeydiyyatdan menyu yaratmağa qədər 10 dəqiqə. QR kodlar avtomatik yaradılır.' },
  { q: 'Hansı avadanlıq lazımdır?', a: 'Heç bir xüsusi avadanlıq lazım deyil. İstənilən telefon, planşet və ya kompüter ilə işləyir.' },
  { q: 'Neçə masanı dəstəkləyir?', a: 'Limitsiz masa, menyular, işçilər yaratmaq olur.' },
  { q: 'Məlumatlarım təhlükəsizdirmi?', a: 'Bütün məlumatlar şifrələnmiş serverdə saxlanılır.' },
  { q: 'Android tətbiqi var?', a: 'Bəli! Mətbəx və ofisiant üçün Android APK mövcuddur. Arxa planda da işləyir.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [regForm, setRegForm] = useState({ restaurant_name: '', owner_name: '', username: '', password: '', phone: '' });
  const [regLoading, setRegLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.restaurant_name || !regForm.owner_name || !regForm.username || !regForm.password) {
      toast.error('Bütün sahələri doldurun'); return;
    }
    setRegLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, regForm);
      setAuth(res.data.token, res.data.user);
      toast.success('Qeydiyyat uğurlu! Xoş gəlmisiniz!');
      navigate('/admin');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Qeydiyyat xətası');
    } finally { setRegLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="text-xl font-black tracking-tighter">QR Restoran</a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-[#0A0A0A] transition-colors">Xüsusiyyətlər</a>
            <a href="#how" className="text-sm text-gray-600 hover:text-[#0A0A0A] transition-colors">Necə İşləyir</a>
            <a href="#faq" className="text-sm text-gray-600 hover:text-[#0A0A0A] transition-colors">FAQ</a>
            <button onClick={() => navigate('/login')} className="text-sm text-gray-600 hover:text-[#0A0A0A]" data-testid="nav-login-link">Daxil ol</button>
            <button onClick={() => setShowRegister(true)} className="bg-[#E0402A] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#C93622] transition-colors" data-testid="nav-register-btn">
              Pulsuz Qeydiyyat
            </button>
          </div>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2">
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-200 px-6 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenu(false)} className="block text-sm text-gray-600">Xüsusiyyətlər</a>
            <a href="#how" onClick={() => setMobileMenu(false)} className="block text-sm text-gray-600">Necə İşləyir</a>
            <a href="#faq" onClick={() => setMobileMenu(false)} className="block text-sm text-gray-600">FAQ</a>
            <button onClick={() => navigate('/login')} className="block text-sm text-gray-600 w-full text-left">Daxil ol</button>
            <button onClick={() => { setShowRegister(true); setMobileMenu(false); }} className="w-full bg-[#E0402A] text-white px-5 py-2.5 text-sm font-medium">Pulsuz Qeydiyyat</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-6" data-testid="hero-section">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="uppercase tracking-[0.2em] text-xs font-semibold text-gray-500 mb-4">Restoran İdarəetmə Sistemi</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.05] mb-6">
              Restoranınızı<br />
              <span className="text-[#E0402A]">Rəqəmsallaşdırın.</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
              QR menyu, mətbəx ekranı, inventar, analitika — hər şey bir platformada. Kağız menyudan qurtulun, sifarişləri real-time idarə edin.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => setShowRegister(true)} className="bg-[#E0402A] text-white px-8 py-3.5 font-medium hover:bg-[#C93622] transition-colors flex items-center gap-2 text-sm" data-testid="hero-register-cta">
                İndi Başlayın <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/login')} className="border border-[#0A0A0A] px-8 py-3.5 font-medium hover:bg-gray-50 transition-colors text-sm" data-testid="hero-login-btn">
                Daxil Ol
              </button>
            </div>
            <div className="flex items-center gap-6 mt-8 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Pulsuz</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Limitsiz</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Android APK</span>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="aspect-[4/3] overflow-hidden border border-gray-200">
              <img
                src="https://images.unsplash.com/photo-1556742517-fde6c2abbe11?w=800&q=80"
                alt="Restoran POS"
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Real-time sifarişlər</p>
                  <p className="text-sm font-bold">3-5 saniyə</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32 px-6 bg-white" data-testid="features-section">
        <div className="max-w-7xl mx-auto">
          <p className="uppercase tracking-[0.2em] text-xs font-semibold text-gray-500 mb-3">Xüsusiyyətlər</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-16">Bir Platformada Hər Şey</h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className={`${f.span} bg-[#FAFAFA] border border-gray-200 p-8 flex flex-col justify-between group hover:border-[#0A0A0A] transition-colors duration-300`} data-testid={`feature-card-${i}`}>
                <div>
                  <f.icon className="w-8 h-8 text-[#E0402A] mb-4" strokeWidth={1.5} />
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-24 md:py-32 px-6" data-testid="how-section">
        <div className="max-w-7xl mx-auto">
          <p className="uppercase tracking-[0.2em] text-xs font-semibold text-gray-500 mb-3">Necə İşləyir</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-16">3 Addımda Başlayın</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative" data-testid={`step-${i}`}>
                <span className="text-8xl font-black text-gray-100 select-none">{s.num}</span>
                <div className="-mt-10 relative z-10">
                  <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-16 text-center">
            <button onClick={() => setShowRegister(true)} className="bg-[#E0402A] text-white px-10 py-4 font-medium hover:bg-[#C93622] transition-colors inline-flex items-center gap-2" data-testid="how-register-cta">
              Pulsuz Qeydiyyat <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32 px-6 bg-white" data-testid="faq-section">
        <div className="max-w-3xl mx-auto">
          <p className="uppercase tracking-[0.2em] text-xs font-semibold text-gray-500 mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-12">Tez-tez Verilən Suallar</h2>
          <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
            {FAQS.map((f, i) => (
              <div key={i} data-testid={`faq-accordion-item-${i}`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full py-5 flex items-center justify-between text-left"
                >
                  <span className="text-sm font-semibold pr-4">{f.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <p className="pb-5 text-sm text-gray-600 leading-relaxed">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6 bg-[#0A0A0A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-4">Hələ Kağız Menyu İstifadə Edirsiniz?</h2>
          <p className="text-gray-400 mb-8 text-sm">QR Restoran ilə menyunuzu rəqəmsallaşdırın, sifarişləri avtomatlaşdırın.</p>
          <button onClick={() => setShowRegister(true)} className="bg-[#E0402A] text-white px-10 py-4 font-medium hover:bg-[#C93622] transition-colors inline-flex items-center gap-2">
            Pulsuz Başlayın <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#0A0A0A] text-white border-t border-gray-800" data-testid="footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-2xl font-black tracking-tighter">QR Restoran</p>
            <p className="text-xs text-gray-500 mt-1">Restoran idarəetmə sistemi</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Xüsusiyyətlər</a>
            <a href="#how" className="hover:text-white transition-colors">Necə İşləyir</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Daxil ol</button>
          </div>
        </div>
      </footer>

      {/* Registration Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRegister(false)}>
          <div className="w-full max-w-md bg-white border border-gray-200 p-8" onClick={e => e.stopPropagation()} data-testid="registration-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black tracking-tighter">Pulsuz Qeydiyyat</h2>
              <button onClick={() => setShowRegister(false)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Restoran Adı</label>
                <input
                  type="text"
                  value={regForm.restaurant_name}
                  onChange={e => setRegForm(p => ({ ...p, restaurant_name: e.target.value }))}
                  className="w-full mt-1 px-4 py-3 border border-gray-300 text-sm focus:border-[#E0402A] focus:ring-1 focus:ring-[#E0402A] outline-none"
                  placeholder="Məs: Mövlana Restaurant"
                  data-testid="register-restaurant-name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Adınız</label>
                <input
                  type="text"
                  value={regForm.owner_name}
                  onChange={e => setRegForm(p => ({ ...p, owner_name: e.target.value }))}
                  className="w-full mt-1 px-4 py-3 border border-gray-300 text-sm focus:border-[#E0402A] focus:ring-1 focus:ring-[#E0402A] outline-none"
                  placeholder="Ad Soyad"
                  data-testid="register-owner-name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">İstifadəçi Adı</label>
                <input
                  type="text"
                  value={regForm.username}
                  onChange={e => setRegForm(p => ({ ...p, username: e.target.value }))}
                  className="w-full mt-1 px-4 py-3 border border-gray-300 text-sm focus:border-[#E0402A] focus:ring-1 focus:ring-[#E0402A] outline-none"
                  placeholder="Giriş üçün istifadəçi adı"
                  data-testid="register-username"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Şifrə</label>
                <input
                  type="password"
                  value={regForm.password}
                  onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full mt-1 px-4 py-3 border border-gray-300 text-sm focus:border-[#E0402A] focus:ring-1 focus:ring-[#E0402A] outline-none"
                  placeholder="Minimum 6 simvol"
                  data-testid="register-password"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon (istəyə bağlı)</label>
                <input
                  type="tel"
                  value={regForm.phone}
                  onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full mt-1 px-4 py-3 border border-gray-300 text-sm focus:border-[#E0402A] focus:ring-1 focus:ring-[#E0402A] outline-none"
                  placeholder="+994 XX XXX XX XX"
                  data-testid="register-phone"
                />
              </div>
              <button
                type="submit"
                disabled={regLoading}
                className="w-full bg-[#E0402A] text-white py-3.5 font-medium hover:bg-[#C93622] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="registration-form-submit"
              >
                {regLoading ? 'Gözləyin...' : 'Qeydiyyatdan Keç'}
                {!regLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-4">
              Hesabınız var? <button onClick={() => { setShowRegister(false); navigate('/login'); }} className="text-[#E0402A] font-medium">Daxil olun</button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
