import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Table2, LogOut, DollarSign, Calendar, BarChart3, Tag, ShoppingCart, UtensilsCrossed, LayoutDashboard, MapPin, Award, Package, Settings, Phone, Smartphone, Download, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import az from '@/translations/az';
import AdminPinGuard from '@/components/AdminPinGuard';
import { VoiceCallProvider } from '@/context/VoiceCallContext';
import { VoiceCallButton, VoiceCallOverlay } from '@/components/VoiceCallUI';
import ActiveTablesPage from './ActiveTablesPage';
import AdminUsersPage from './AdminUsersPage';
import ProfessionalAnalytics from './ProfessionalAnalytics';
import ExpensesPage from './ExpensesPage';
import ReservationsPage from './ReservationsPage';
import FinancialReportPage from './FinancialReportPage';
import DiscountsPage from './DiscountsPage';
import SalesStatisticsPage from './SalesStatisticsPage';
import MenuManagementPage from './MenuManagementPage';
import VenuesTablesPage from './VenuesTablesPage';
import StaffManagementPage from './StaffManagementPage';
import InventoryPage from './InventoryPage';
import SettingsPage from './SettingsPage';

function ProtectedPage({ children, sectionName }) {
  return <AdminPinGuard sectionName={sectionName}>{children}</AdminPinGuard>;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isActive = (path) => location.pathname === path;

  const navItems = [
    { to: '/admin', icon: Table2, label: t('nav.tables'), protected: false },
    { to: '/admin/reservations', icon: Calendar, label: t('nav.reservations'), protected: false },
    { to: '/admin/venues-tables', icon: MapPin, label: `${t('nav.venues')} & ${t('nav.tables')}`, protected: false },
    { to: '/admin/menu-management', icon: UtensilsCrossed, label: t('nav.menu'), protected: true },
    { to: '/admin/users', icon: Users, label: t('nav.users'), protected: true },
    { to: '/admin/staff', icon: Award, label: t('admin.staff'), protected: true },
    { to: '/admin/inventory', icon: Package, label: t('nav.inventory'), protected: true },
    { to: '/admin/expenses', icon: DollarSign, label: t('nav.expenses'), protected: true },
    { to: '/admin/discounts', icon: Tag, label: t('nav.discounts'), protected: true },
    { to: '/admin/analytics', icon: LayoutDashboard, label: t('nav.analytics'), protected: true },
    { to: '/admin/financial-report', icon: BarChart3, label: t('admin.financial_report'), protected: true },
    { to: '/admin/sales-statistics', icon: ShoppingCart, label: t('admin.sales_stats'), protected: true },
    { to: '/admin/settings', icon: Settings, label: t('common.settings'), protected: true },
  ];

  return (
    <VoiceCallProvider myRole="admin">
    <div className="min-h-screen bg-[#F9F9F7]">
      <VoiceCallOverlay />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#1A251E] px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white p-1">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <h1 className="text-sm font-medium text-white">QR Restoran</h1>
        <div className="w-5" />
      </div>

      {/* Backdrop */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setSidebarOpen(false)} />}

      <div className="flex">
        <aside className={`w-56 min-h-screen bg-[#1A251E] fixed left-0 top-0 z-30 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <div className="flex flex-col h-full p-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-6 px-1">
              <img
                src="https://static.prod-images.emergentagent.com/jobs/20b3b0d0-a719-4e8b-9738-9b8e7415233b/images/51e072b5ec80fc46021df0d71dbee36c21f565c5904af6647ff4730065da4795.png"
                alt="Logo" className="w-8 h-8 rounded-lg"
              />
              <div>
                <h1 className="heading-font text-sm font-medium text-white">QR Restoran</h1>
                <p className="text-[10px] text-[#8A948D]">Admin</p>
              </div>
            </div>

            {/* User */}
            <div className="bg-white/5 rounded-xl p-2.5 mb-5 border border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#C05C3D] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-xs font-medium text-white truncate max-w-[120px]">{user?.full_name}</p>
                  <p className="text-[10px] text-[#C05C3D]">Administrator</p>
                </div>
              </div>
            </div>

            {/* Voice Call */}
            <div className="bg-white/5 rounded-xl p-2.5 mb-4 border border-white/10">
              <p className="text-[10px] text-[#8A948D] mb-2 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Səsli Zəng
              </p>
              <VoiceCallButton targetRole="kitchen" />
            </div>

            {/* Nav */}
            <nav className="space-y-0.5 flex-1 overflow-y-auto">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
                    isActive(item.to)
                      ? 'bg-[#C05C3D]/15 text-[#C05C3D]'
                      : 'text-[#8A948D] hover:bg-white/5 hover:text-white'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="font-medium truncate">{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* APK Download */}
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/qr-restoran.apk';
                link.download = 'qr-restoran.apk';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 text-emerald-400 hover:from-emerald-600/30 hover:to-teal-600/30 transition-all mt-2 w-full"
              data-testid="download-apk-btn"
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <span className="font-semibold block">Android APK</span>
                <span className="text-[9px] text-emerald-500/70">Mətbəx / Ofisiant üçün</span>
              </div>
              <Download className="w-3.5 h-3.5 ml-auto" />
            </button>

            {/* Logout */}
            <Button onClick={logout} variant="ghost" className="w-full justify-start text-[#8A948D] hover:text-white hover:bg-white/5 rounded-lg h-9 text-xs mt-2" data-testid="admin-logout-button">
              <LogOut className="w-3.5 h-3.5 mr-2" /> {t('common.logout')}
            </Button>

            {/* Language switcher */}
            <div className="mt-2">
              <LanguageSwitcher variant="dark" />
            </div>
          </div>
        </aside>

        <main className="lg:ml-56 flex-1 p-3 sm:p-6 pt-16 lg:pt-6 min-w-0">
          <Routes>
            <Route path="/" element={<ActiveTablesPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/venues-tables" element={<VenuesTablesPage />} />
            <Route path="/users" element={<ProtectedPage sectionName="İstifadəçilər"><AdminUsersPage /></ProtectedPage>} />
            <Route path="/staff" element={<ProtectedPage sectionName="Personal"><StaffManagementPage /></ProtectedPage>} />
            <Route path="/inventory" element={<ProtectedPage sectionName="İnventar"><InventoryPage /></ProtectedPage>} />
            <Route path="/expenses" element={<ProtectedPage sectionName="Xərclər"><ExpensesPage /></ProtectedPage>} />
            <Route path="/analytics" element={<ProtectedPage sectionName="Analitika"><ProfessionalAnalytics /></ProtectedPage>} />
            <Route path="/financial-report" element={<ProtectedPage sectionName="Maliyyə Hesabatı"><FinancialReportPage /></ProtectedPage>} />
            <Route path="/discounts" element={<ProtectedPage sectionName="Endirimlər"><DiscountsPage /></ProtectedPage>} />
            <Route path="/sales-statistics" element={<ProtectedPage sectionName="Satış Statistikası"><SalesStatisticsPage /></ProtectedPage>} />
            <Route path="/menu-management" element={<ProtectedPage sectionName="Menyu İdarəetməsi"><MenuManagementPage /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage sectionName="Ayarlar"><SettingsPage /></ProtectedPage>} />
          </Routes>
        </main>
      </div>
    </div>
    </VoiceCallProvider>
  );
}
