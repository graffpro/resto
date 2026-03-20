import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Building2, Table2, UtensilsCrossed, Users, LogOut, FolderTree, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import az from '@/translations/az';
import VenuesPage from './VenuesPage';
import TablesPage from './TablesPage';
import MenuPage from './MenuPage';
import UsersPage from './UsersPage';
import SettingsPage from './SettingsPage';

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#F8FAF8]">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-white border-r border-[#E2E8E2] fixed left-0 top-0">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-[#1A4D2E] heading-font mb-2">
              {az.owner}
            </h1>
            <p className="text-sm text-[#5C6B61] mb-8">{user?.full_name}</p>
            
            <nav className="space-y-2">
              <Link
                to="/owner"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/owner') || location.pathname === '/owner/venues'
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-venues"
              >
                <Building2 className="w-5 h-5" />
                <span className="accent-font">{az.venues}</span>
              </Link>
              
              <Link
                to="/owner/tables"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/owner/tables')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-tables"
              >
                <Table2 className="w-5 h-5" />
                <span className="accent-font">{az.tables}</span>
              </Link>
              
              <Link
                to="/owner/menu"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/owner/menu')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-menu"
              >
                <UtensilsCrossed className="w-5 h-5" />
                <span className="accent-font">{az.menu}</span>
              </Link>
              
              <Link
                to="/owner/users"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/owner/users')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-users"
              >
                <Users className="w-5 h-5" />
                <span className="accent-font">{az.users}</span>
              </Link>
              
              <Link
                to="/owner/settings"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/owner/settings')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-settings"
              >
                <Settings className="w-5 h-5" />
                <span className="accent-font">{az.settings}</span>
              </Link>
            </nav>
            
            <div className="absolute bottom-6 left-6 right-6">
              <Button
                onClick={logout}
                variant="outline"
                className="w-full justify-start"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {az.logout}
              </Button>
            </div>
          </div>
        </aside>

        <main className="ml-64 flex-1 p-8">
          <Routes>
            <Route path="/" element={<VenuesPage />} />
            <Route path="/venues" element={<VenuesPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}