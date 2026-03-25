import { useState, useEffect } from 'react';
import axios from 'axios';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPinGuard({ children, sectionName }) {
  const [isVerified, setIsVerified] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pinRequired, setPinRequired] = useState(false);

  useEffect(() => {
    checkPinRequired();
  }, []);

  const checkPinRequired = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      const adminPin = response.data?.admin_pin;
      if (adminPin && adminPin.length > 0) {
        setPinRequired(true);
        setShowPinDialog(true);
      } else {
        setIsVerified(true);
      }
    } catch (error) {
      console.error('Failed to check PIN settings');
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
    } catch (error) {
      toast.error('Yanlış PIN');
      setPin('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleVerifyPin();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div>
      </div>
    );
  }

  if (isVerified) {
    return children;
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#F5F9E9] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#1A4D2E]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A4D2E] mb-2">Qorunan Bölmə</h2>
          <p className="text-[#5C6B61] mb-6">
            "{sectionName}" bölməsinə giriş üçün PIN tələb olunur
          </p>
          <Button 
            onClick={() => setShowPinDialog(true)}
            className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white"
          >
            <Lock className="w-4 h-4 mr-2" />
            PIN daxil et
          </Button>
        </div>
      </div>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1A4D2E] heading-font text-center">
              Admin PIN
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#5C6B61] text-center">
              {sectionName} bölməsinə giriş üçün PIN daxil edin
            </p>
            <div className="relative">
              <Input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="PIN"
                className="text-center text-2xl tracking-widest pr-10"
                autoFocus
                data-testid="admin-pin-input"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C6B61]"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <Button 
              onClick={handleVerifyPin}
              className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white"
              disabled={!pin}
              data-testid="verify-pin-btn"
            >
              Təsdiqlə
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
