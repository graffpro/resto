import { useState, useEffect } from 'react';
import axios from 'axios';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

export default function AdminPinGuard({ children, sectionName }) {
  const [isVerified, setIsVerified] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkPinRequired(); }, []);

  const checkPinRequired = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      const adminPin = response.data?.admin_pin;
      if (adminPin && adminPin.length > 0) {
        setShowPinDialog(true);
      } else {
        setIsVerified(true);
      }
    } catch {
      setIsVerified(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    try {
      await axios.post(`${API}/verify-admin-pin`, { pin });
      setIsVerified(true);
      setShowPinDialog(false);
      toast.success('Giriş təsdiqləndi');
    } catch {
      toast.error('Yanlış PIN');
      setPin('');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent" /></div>;
  }

  if (isVerified) return children;

  return (
    <>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white border border-[#E6E5DF] rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-[#C05C3D]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-[#C05C3D]" />
          </div>
          <h2 className="heading-font text-lg font-medium text-[#181C1A] mb-1">Qorunan Bölmə</h2>
          <p className="text-xs text-[#8A948D] mb-5">"{sectionName}" bölməsinə giriş üçün PIN tələb olunur</p>
          <Button onClick={() => setShowPinDialog(true)} className="bg-[#C05C3D] hover:bg-[#A64D31] text-white text-xs h-9 rounded-xl">
            <Lock className="w-3.5 h-3.5 mr-1.5" /> PIN daxil et
          </Button>
        </div>
      </div>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="heading-font text-base font-medium text-center">Admin PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-[#8A948D] text-center">{sectionName} bölməsinə giriş üçün PIN daxil edin</p>
            <div className="relative">
              <Input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                placeholder="PIN"
                className="text-center text-xl tracking-widest pr-10 h-11 rounded-xl"
                autoFocus
                data-testid="admin-pin-input"
              />
              <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A948D]">
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={handleVerifyPin} className="w-full bg-[#C05C3D] hover:bg-[#A64D31] text-white h-10 rounded-xl text-sm" disabled={!pin} data-testid="verify-pin-btn">
              Təsdiqlə
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
