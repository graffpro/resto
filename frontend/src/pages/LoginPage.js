import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import az from '@/translations/az';
import { Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(username, password);
    if (result.success) {
      toast.success('Uğurla daxil oldunuz!');
      navigate('/');
    } else {
      toast.error(result.error || az.invalidCredentials);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://static.prod-images.emergentagent.com/jobs/20b3b0d0-a719-4e8b-9738-9b8e7415233b/images/bd5f07138fc166454b3ad2256f020efc946ad91278e4bdfaa5d7d9cc1f3707ab.png"
          alt="Restaurant"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A251E]/90 via-[#1A251E]/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <img
            src="https://static.prod-images.emergentagent.com/jobs/20b3b0d0-a719-4e8b-9738-9b8e7415233b/images/51e072b5ec80fc46021df0d71dbee36c21f565c5904af6647ff4730065da4795.png"
            alt="Logo"
            className="w-14 h-14 mb-6 rounded-xl"
          />
          <h1 className="heading-font text-3xl font-light tracking-tight mb-2">QR Restoran</h1>
          <p className="text-sm text-white/70 max-w-sm leading-relaxed">
            Restoranlarınızı real vaxtda idarə edin. QR kod ilə sifariş, analitika və daha çox.
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center bg-[#F9F9F7] px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <img
                src="https://static.prod-images.emergentagent.com/jobs/20b3b0d0-a719-4e8b-9738-9b8e7415233b/images/51e072b5ec80fc46021df0d71dbee36c21f565c5904af6647ff4730065da4795.png"
                alt="Logo"
                className="w-10 h-10 rounded-xl"
              />
              <span className="heading-font text-lg font-medium text-[#181C1A]">QR Restoran</span>
            </div>
            <h2 className="heading-font text-2xl font-medium text-[#181C1A] tracking-tight">Daxil olun</h2>
            <p className="text-sm text-[#5C665F] mt-1">Hesabınıza giriş edin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="username" className="text-xs font-medium text-[#5C665F] uppercase tracking-wider">
                {az.username}
              </Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A948D]" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="pl-10 h-11 text-sm bg-white border-[#E6E5DF] rounded-xl focus:border-[#C05C3D] focus:ring-[#C05C3D]"
                  placeholder="İstifadəçi adınız"
                  data-testid="username-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-xs font-medium text-[#5C665F] uppercase tracking-wider">
                {az.password}
              </Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A948D]" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 h-11 text-sm bg-white border-[#E6E5DF] rounded-xl focus:border-[#C05C3D] focus:ring-[#C05C3D]"
                  placeholder="Şifrəniz"
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C05C3D] hover:bg-[#A64D31] text-white h-11 text-sm font-medium rounded-xl transition-all duration-300 active:scale-[0.98]"
              data-testid="login-button"
            >
              {loading ? az.loading : az.loginButton}
            </Button>
          </form>

          <div className="mt-8 p-3 bg-[#F0EFEA] rounded-xl border border-[#E6E5DF]">
            <p className="text-xs text-[#8A948D] text-center">
              Demo giriş: <span className="font-medium text-[#5C665F]">owner / owner123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
