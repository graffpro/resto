import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Mail, Loader2, ArrowRight, X, KeyRound, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/CustomerAuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

/**
 * Customer auth modal with passwordless email OTP flow.
 * Step 1: collect email + name + international phone → send OTP
 * Step 2: enter 6-digit code → verify → JWT token
 */
export default function CustomerAuthModal({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { setAuth } = useCustomerAuth();
  const [step, setStep] = useState('contact'); // contact | otp
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setStep('contact'); setEmail(''); setName(''); setPhone(''); setCode(''); setResendIn(0);
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
    if (!name) { toast.error(t('customer_auth.name')); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/customer/auth/send-otp`, {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone || null,
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
            {step === 'contact' ? <Mail className="w-5 h-5 text-amber-300" /> : <KeyRound className="w-5 h-5 text-amber-300" />}
          </div>
          <h2 className="text-xl font-black">
            {step === 'contact' ? t('customer_auth.title_login') : t('customer_auth.title_otp')}
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            {step === 'contact'
              ? t('customer_auth.subtitle_login')
              : t('customer_auth.subtitle_otp', { email })}
          </p>
        </div>

        <div className="p-6 sm:p-7 space-y-4">
          {step === 'contact' ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <Label htmlFor="cust-name">{t('customer_auth.name')}</Label>
                <Input
                  id="cust-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Emil Məmmədov"
                  required
                  data-testid="customer-auth-name"
                />
              </div>
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
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-[#E0402A] hover:bg-[#C93622] h-11 text-sm font-semibold"
                data-testid="customer-auth-send-otp"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('customer_auth.send_code')} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-[11px] text-stone-500 text-center pt-2">
                {t('customer_auth.terms')}
              </p>
            </form>
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
