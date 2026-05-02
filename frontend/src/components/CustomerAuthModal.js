import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Mail, Loader2, ArrowRight, X, KeyRound, Check, Briefcase, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

/**
 * Unified auth modal with three entry points:
 *   • Login   — existing customer, email → OTP
 *   • Qeydiyyat — new customer, email + name + phone → OTP
 *   • Staff   — partner / admin / kitchen / waiter / master_waiter / bar,
 *               username + password (classic JWT flow via AuthContext.login).
 */
export default function CustomerAuthModal({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { setAuth } = useCustomerAuth();
  const { login: staffLogin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // login | register | staff
  const [step, setStep] = useState('contact'); // contact | otp
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setMode('login'); setStep('contact');
      setEmail(''); setName(''); setPhone(''); setCode('');
      setUsername(''); setPassword('');
      setResendIn(0);
    }
  }, [open]);

  useEffect(() => {
    if (resendIn > 0) {
      const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [resendIn]);

  if (!open) return null;

  const sendOtp = async (e) => {
    e?.preventDefault?.();
    if (!email) { toast.error(t('customer_auth.email')); return; }
    if (mode === 'register' && !name) { toast.error(t('customer_auth.name')); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/customer/auth/send-otp`, {
        email: email.trim().toLowerCase(),
        mode,  // backend can enforce "login mode requires existing customer" later
        name: mode === 'register' ? name.trim() : null,
        phone: mode === 'register' ? (phone || null) : null,
      });
      toast.success(t('customer_auth.code_sent'));
      setStep('otp');
      setResendIn(60);
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Email error');
    } finally { setBusy(false); }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault?.();
    if (!code || code.length < 6) { toast.error('Code'); return; }
    setBusy(true);
    try {
      const res = await axios.post(`${API}/customer/auth/verify-otp`, {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      setAuth(res.data.token, res.data.customer);
      toast.success(t('customer_auth.welcome', { name: res.data.customer.name || res.data.customer.email }));
      onSuccess?.(res.data.customer);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Verify error');
    } finally { setBusy(false); }
  };

  const staffSubmit = async (e) => {
    e?.preventDefault?.();
    if (!username || !password) { toast.error('Login və şifrə tələb olunur'); return; }
    setBusy(true);
    try {
      const result = await staffLogin(username.trim(), password);
      if (!result?.success) {
        toast.error(result?.error || 'Giriş baş tutmadı');
        return;
      }
      const role = result.user?.role;
      toast.success(`Xoş gəldin, ${result.user?.full_name || result.user?.username}!`);
      onClose?.();
      // Redirect by role — mirrors App.js "/" routing
      const dest = role === 'owner' ? '/owner'
        : role === 'admin' ? '/admin'
        : role === 'kitchen' || role === 'bar' ? '/kitchen'
        : role === 'master_waiter' ? '/waiter/take-order'
        : role === 'waiter' ? '/waiter'
        : '/admin';
      navigate(dest);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Giriş xətası');
    } finally { setBusy(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      data-testid="customer-auth-modal"
    >
      <div
        className="w-full sm:max-w-md bg-white text-stone-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-[#1A251E] to-[#0E1612] text-white p-6 sm:p-7">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"
            data-testid="customer-auth-close"
          >
            <X size={16} />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 grid place-items-center mb-3">
            {step === 'contact'
              ? (mode === 'staff' ? <Briefcase className="w-5 h-5 text-amber-300" /> : <Mail className="w-5 h-5 text-amber-300" />)
              : <KeyRound className="w-5 h-5 text-amber-300" />}
          </div>
          <h2 className="text-xl font-black">
            {step === 'contact'
              ? (mode === 'login' ? 'Daxil ol'
                : mode === 'register' ? 'Qeydiyyat'
                : 'Personal girişi')
              : t('customer_auth.title_otp')}
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            {step === 'contact'
              ? (mode === 'login'
                  ? 'Email ünvanınızı daxil edin, 6 rəqəmli kod göndərəcəyik.'
                  : mode === 'register'
                  ? 'Ad, email və telefon daxil edin, hesabınızı qururuq.'
                  : 'Restoran sahibi, administrator və ya personal üçün.')
              : t('customer_auth.subtitle_otp', { email })}
          </p>
        </div>

        <div className="p-6 sm:p-7 space-y-4">
          {step === 'contact' ? (
            <>
              {/* 3-tab switcher: Login (email OTP) / Register / Staff (username+password) */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 rounded-full mb-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`h-9 rounded-full text-xs sm:text-sm font-bold transition-colors ${mode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                  data-testid="auth-tab-login"
                >
                  Daxil ol
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`h-9 rounded-full text-xs sm:text-sm font-bold transition-colors ${mode === 'register' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                  data-testid="auth-tab-register"
                >
                  Qeydiyyat
                </button>
                <button
                  type="button"
                  onClick={() => setMode('staff')}
                  className={`h-9 rounded-full text-xs sm:text-sm font-bold transition-colors ${mode === 'staff' ? 'bg-[#1A251E] text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                  data-testid="auth-tab-staff"
                >
                  Personal
                </button>
              </div>

              {mode === 'staff' ? (
                <form onSubmit={staffSubmit} className="space-y-4" data-testid="staff-login-form">
                  <div>
                    <Label htmlFor="staff-username" className="flex items-center gap-1.5"><User size={13} /> İstifadəçi adı</Label>
                    <Input
                      id="staff-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="İstifadəçi adınız"
                      autoComplete="username"
                      required
                      data-testid="staff-username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="staff-password">Şifrə</Label>
                    <Input
                      id="staff-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      data-testid="staff-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-[#1A251E] hover:bg-[#0E1612] h-11 text-sm font-semibold text-white"
                    data-testid="staff-login-submit"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Briefcase className="w-4 h-4 mr-2" />}
                    Daxil ol
                  </Button>
                  <p className="text-[11px] text-stone-500 text-center pt-1">
                    Restoran sahibi, administrator, ofitsiant və mətbəx personalı üçün.
                  </p>
                </form>
              ) : (
              <form onSubmit={sendOtp} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <Label htmlFor="cust-name">{t('customer_auth.name')}</Label>
                    <Input
                      id="cust-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Emil Məmmədov"
                      required={mode === 'register'}
                      data-testid="customer-auth-name"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="cust-email">{t('customer_auth.email')}</Label>
                  <Input
                    id="cust-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="emil@example.com"
                    required
                    data-testid="customer-auth-email"
                  />
                </div>
                {mode === 'register' && (
                  <div>
                    <Label>{t('customer_auth.phone_optional')}</Label>
                    <div className="phone-input-wrapper mt-1">
                      <PhoneInput
                        international
                        defaultCountry="AZ"
                        value={phone}
                        onChange={setPhone}
                        placeholder="+994 50 123 45 67"
                        data-testid="customer-auth-phone"
                      />
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">
                      {t('customer_auth.phone_hint')}
                    </p>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-[#E0402A] hover:bg-[#C93622] h-11 text-sm font-semibold"
                  data-testid="customer-auth-send-otp"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {mode === 'login' ? 'Daxil ol' : 'Qeydiyyatdan keç'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-center text-xs text-stone-500 pt-1">
                  {mode === 'login' ? (
                    <>Hesabınız yoxdur? <button type="button" onClick={() => setMode('register')} className="text-[#E0402A] font-bold hover:underline">Qeydiyyatdan keç</button></>
                  ) : (
                    <>Hesabınız var? <button type="button" onClick={() => setMode('login')} className="text-[#E0402A] font-bold hover:underline">Daxil ol</button></>
                  )}
                </p>
                <p className="text-[11px] text-stone-500 text-center pt-1">
                  {t('customer_auth.terms')}
                </p>
              </form>
              )}
            </>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="cust-otp">{t('customer_auth.code_placeholder')}</Label>
                <Input
                  id="cust-otp"
                  ref={codeInputRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('customer_auth.code_placeholder')}
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  data-testid="customer-auth-code"
                />
              </div>
              <Button
                type="submit"
                disabled={busy || code.length < 6}
                className="w-full bg-[#E0402A] hover:bg-[#C93622] h-11 text-sm font-semibold"
                data-testid="customer-auth-verify"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                {t('customer_auth.verify')}
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep('contact')}
                  className="text-stone-600 hover:text-stone-900"
                >
                  ← {t('customer_auth.change_email')}
                </button>
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={resendIn > 0 || busy}
                  className="text-[#C05C3D] hover:text-[#A04C30] disabled:text-stone-400 disabled:cursor-not-allowed"
                  data-testid="customer-auth-resend"
                >
                  {resendIn > 0 ? t('customer_auth.resend_in', { s: resendIn }) : t('customer_auth.resend')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
