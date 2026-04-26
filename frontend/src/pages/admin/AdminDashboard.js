import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users, Table2, DollarSign, Calendar, BarChart3, Tag, ShoppingCart,
  UtensilsCrossed, LayoutDashboard, MapPin, Award, Package, Settings, Truck,
} from 'lucide-react';
import DashboardTopBar from '@/components/layouts/DashboardTopBar';
import TileHome from '@/components/layouts/TileHome';
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
import DeliveryOrdersPage from './DeliveryOrdersPage';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

function ProtectedPage({ children, sectionName }) {
  return <AdminPinGuard sectionName={sectionName}>{children}</AdminPinGuard>;
}

function AdminHome() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API}/admin/dashboard-stats`, { headers: auth() });
        if (alive) setStats(res.data || {});
      } catch {
        if (alive) setStats({});
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 15000); // refresh every 15s
    return () => { alive = false; clearInterval(id); };
  }, []);

  const fmtMoney = (v) => {
    if (v === undefined || v === null) return null;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k ₼`;
    return `${Math.round(v)} ₼`;
  };

  // Vibrant Metro-style palette — mapped to "category" of the operation.
  // Live ops = warm reds/oranges, Money = greens, People = blues, System = neutral
  const tiles = [
    { to: '/admin/tables',           label: t('nav.tables'),                Icon: Table2,           color: '#E0402A', subtitle: 'LIVE',         size: 'md', testid: 'tile-tables', badge: stats?.active_tables ? `${stats.active_tables} aktiv` : null },
    { to: '/admin/delivery',         label: 'Çatdırılma',                   Icon: Truck,            color: '#10B981', subtitle: 'DELIVERY',     size: 'md', testid: 'tile-delivery', badge: stats?.pending_delivery ? `${stats.pending_delivery} aktiv` : null },
    { to: '/admin/reservations',     label: t('nav.reservations'),          Icon: Calendar,         color: '#F59E0B', subtitle: 'BOOK',                                                badge: stats?.reservations_today ? `${stats.reservations_today} bu gün` : null },
    { to: '/admin/menu-management',  label: t('nav.menu'),                  Icon: UtensilsCrossed,  color: '#EC4899', subtitle: 'KITCHEN',                                             badge: stats?.pending_orders ? `${stats.pending_orders} sifariş` : null },
    { to: '/admin/venues-tables',    label: t('nav.venues'),                Icon: MapPin,           color: '#A855F7', subtitle: 'VENUE' },
    { to: '/admin/users',            label: t('nav.users'),                 Icon: Users,            color: '#0EA5E9', subtitle: 'TEAM',                                                badge: stats?.users_count ? `${stats.users_count}` : null },
    { to: '/admin/staff',            label: t('admin.staff'),               Icon: Award,            color: '#3B82F6', subtitle: 'STAFF' },
    { to: '/admin/inventory',        label: t('nav.inventory'),             Icon: Package,          color: '#0891B2', subtitle: 'STOCK',                                               badge: stats?.low_stock ? `⚠ ${stats.low_stock}` : null },
    { to: '/admin/expenses',         label: t('nav.expenses'),              Icon: DollarSign,       color: '#16A34A', subtitle: 'COSTS' },
    { to: '/admin/discounts',        label: t('nav.discounts'),             Icon: Tag,              color: '#DC2626', subtitle: 'PROMO',                                               badge: stats?.active_discounts ? `${stats.active_discounts} aktiv` : null },
    { to: '/admin/analytics',        label: t('nav.analytics'),             Icon: LayoutDashboard,  color: '#10B981', subtitle: 'INSIGHTS', size: 'md', testid: 'tile-analytics',     badge: stats?.today_revenue ? fmtMoney(stats.today_revenue) : null },
    { to: '/admin/financial-report', label: t('admin.financial_report'),    Icon: BarChart3,        color: '#059669', subtitle: 'REPORT' },
    { to: '/admin/sales-statistics', label: t('admin.sales_stats'),         Icon: ShoppingCart,     color: '#22C55E', subtitle: 'SALES' },
    { to: '/admin/settings',         label: t('common.settings'),           Icon: Settings,         color: '#475569', subtitle: 'SYSTEM' },
  ];

  return (
    <div className="px-3 sm:px-5 py-6 max-w-screen-2xl mx-auto">
      <TileHome
        tiles={tiles}
        title={t('admin.title', 'Admin Panel')}
        subtitle={t('admin.subtitle', 'Restoran əməliyyatlarını idarə et')}
      />
    </div>
  );
}

function SubPageWrap({ children }) {
  return <div className="px-3 sm:px-5 py-6 pt-4 max-w-screen-2xl mx-auto min-w-0">{children}</div>;
}

export default function AdminDashboard() {
  return (
    <VoiceCallProvider myRole="admin">
      <div className="min-h-screen bg-[#F4F5F2]">
        <VoiceCallOverlay />
        <DashboardTopBar
          homePath="/admin"
          roleLabel="Admin"
          showApk
          extra={
            <div className="hidden md:flex items-center">
              <VoiceCallButton targetRole="kitchen" />
            </div>
          }
        />
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/tables" element={<SubPageWrap><ActiveTablesPage /></SubPageWrap>} />
          <Route path="/delivery" element={<SubPageWrap><DeliveryOrdersPage /></SubPageWrap>} />
          <Route path="/reservations" element={<SubPageWrap><ReservationsPage /></SubPageWrap>} />
          <Route path="/venues-tables" element={<SubPageWrap><VenuesTablesPage /></SubPageWrap>} />
          <Route path="/users" element={<SubPageWrap><ProtectedPage sectionName="İstifadəçilər"><AdminUsersPage /></ProtectedPage></SubPageWrap>} />
          <Route path="/staff" element={<SubPageWrap><ProtectedPage sectionName="Personal"><StaffManagementPage /></ProtectedPage></SubPageWrap>} />
          <Route path="/inventory" element={<SubPageWrap><ProtectedPage sectionName="İnventar"><InventoryPage /></ProtectedPage></SubPageWrap>} />
          <Route path="/expenses" element={<SubPageWrap><ProtectedPage sectionName="Xərclər"><ExpensesPage /></ProtectedPage></SubPageWrap>} />
          <Route path="/analytics" element={<SubPageWrap><ProtectedPage sectionName="Analitika"><ProfessionalAnalytics /></ProtectedPage></SubPageWrap>} />
          <Route path="/financial-report" element={<SubPageWrap><ProtectedPage sectionName="Maliyyə Hesabatı"><FinancialReportPage /></ProtectedPage></SubPageWrap>} />
          <Route path="/discounts" element={<SubPageWrap><ProtectedPage sectionName="Endirimlər"><DiscountsPage /></ProtectedPage></SubPageWrap>} />
          <Route path="/sales-statistics" element={<SubPageWrap><ProtectedPage sectionName="Satış Statistikası"><SalesStatisticsPage /></ProtectedPage></SubPageWrap>} />
          <Route path="/menu-management" element={<SubPageWrap><ProtectedPage sectionName="Menyu İdarəetməsi"><MenuManagementPage /></ProtectedPage></SubPageWrap>} />
          <Route path="/settings" element={<SubPageWrap><ProtectedPage sectionName="Ayarlar"><SettingsPage /></ProtectedPage></SubPageWrap>} />
        </Routes>
      </div>
    </VoiceCallProvider>
  );
}
