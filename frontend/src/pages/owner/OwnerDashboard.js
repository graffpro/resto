import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Store, LogOut, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import RestaurantsPage from './RestaurantsPage';
import SettingsPage from './SettingsPage';
import PartnersPage from './PartnersPage';

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { to: '/owner', icon: Store, label: t('nav.restaurants'), match: () => isActive('/owner') && !location.pathname.includes('/settings') && !location.pathname.includes('/partners') },
    { to: '/owner/partners', icon: Sparkles, label: t('nav.partners'), match: () => isActive('/owner/partners') },
    { to: '/owner/settings', icon: Settings, label: t('common.settings'), match: () => isActive('/owner/settings') },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-[#1A251E] fixed left-0 top-0 z-30">
          <div className="flex flex-col h-full p-5">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8 px-1">
              <img
                src="https://static.prod-images.emergentagent.com/jobs/20b3b0d0-a719-4e8b-9738-9b8e7415233b/images/51e072b5ec80fc46021df0d71dbee36c21f565c5904af6647ff4730065da4795.png"
                alt="Logo"
                className="w-9 h-9 rounded-lg"
              />
              <div>
                <h1 className="heading-font text-base font-medium text-white">QR Restoran</h1>
                <p className="text-[10px] text-[#8A948D]">{t('owner_panel.title')}</p>
              </div>
            </div>

            {/* User */}
            <div className="bg-white/5 rounded-xl p-3 mb-6 border border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#C05C3D] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user?.full_name}</p>
                  <p className="text-[10px] text-[#C05C3D]">{t('owner_panel.role')}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="space-y-1 flex-1">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    item.match()
                      ? 'bg-[#C05C3D]/15 text-[#C05C3D]'
                      : 'text-[#8A948D] hover:bg-white/5 hover:text-white'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Logout */}
            <Button
              onClick={logout}
              variant="ghost"
              className="w-full justify-start text-[#8A948D] hover:text-white hover:bg-white/5 rounded-xl h-10 text-sm"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('common.logout')}
            </Button>

            {/* Language switcher */}
            <div className="mt-2">
              <LanguageSwitcher variant="dark" />
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="ml-64 flex-1 p-8">
          <Routes>
            <Route path="/" element={<RestaurantsPage />} />
            <Route path="/restaurants" element={<RestaurantsPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
