import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import az from '@/translations/az';
import { UtensilsCrossed } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F9E9] px-4">
      <div className="max-w-md w-full">
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1A4D2E] rounded-full mb-4">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A4D2E] heading-font mb-2">
              {az.loginTitle}
            </h1>
            <p className="text-[#5C6B61]">Restoran İdarəetmə Sistemi</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-[#1A4D2E]">
                {az.username}
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-2 h-12"
                data-testid="username-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-[#1A4D2E]">
                {az.password}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 h-12"
                data-testid="password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white py-6 text-lg rounded-full transition-all duration-200 active:scale-95"
              data-testid="login-button"
            >
              {loading ? az.loading : az.loginButton}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-[#F5F9E9] rounded-lg">
            <p className="text-sm text-[#5C6B61] text-center">
              Demo: owner / owner123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
