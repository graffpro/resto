import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Store, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RestaurantsPage from './RestaurantsPage';
import SettingsPage from './SettingsPage';

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex">
        {/* Modern Sidebar */}
        <aside className="w-72 min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 fixed left-0 top-0 shadow-2xl">
          <div className="p-6">
            {/* Logo Area */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">QR Restoran</h1>
                  <p className="text-xs text-slate-400">İdarəetmə Paneli</p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user?.full_name}</p>
                  <p className="text-xs text-emerald-400">Sistem Sahibi</p>
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="space-y-1">
              <Link
                to="/owner"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive('/owner') && !location.pathname.includes('/settings')
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                data-testid="nav-restaurants"
              >
                <Store className="w-5 h-5" />
                <span className="text-sm font-medium">Restoranlar</span>
              </Link>
              
              <Link
                to="/owner/settings"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive('/owner/settings')
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                data-testid="nav-settings"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Parametrlər</span>
              </Link>
            </nav>
            
            {/* Logout */}
            <div className="absolute bottom-6 left-6 right-6">
              <Button
                onClick={logout}
                variant="ghost"
                className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Çıxış
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-72 flex-1 p-8">
          <Routes>
            <Route path="/" element={<RestaurantsPage />} />
            <Route path="/restaurants" element={<RestaurantsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
