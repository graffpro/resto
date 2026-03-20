import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Users, Table2, LogOut, DollarSign, Calendar, BarChart3, Tag, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import az from '@/translations/az';
import ActiveTablesPage from './ActiveTablesPage';
import AdminUsersPage from './AdminUsersPage';
import ProfessionalAnalytics from './ProfessionalAnalytics';
import ExpensesPage from './ExpensesPage';
import ReservationsPage from './ReservationsPage';
import FinancialReportPage from './FinancialReportPage';
import DiscountsPage from './DiscountsPage';
import SalesStatisticsPage from './SalesStatisticsPage';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#F8FAF8]">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-white border-r border-[#E2E8E2] fixed left-0 top-0">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-[#1A4D2E] heading-font mb-2">
              {az.admin}
            </h1>
            <p className="text-sm text-[#5C6B61] mb-8">{user?.full_name}</p>
            
            <nav className="space-y-2">
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-active-tables"
              >
                <Table2 className="w-5 h-5" />
                <span className="accent-font">{az.activeTables}</span>
              </Link>
              
              <Link
                to="/admin/reservations"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/reservations')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-reservations"
              >
                <Calendar className="w-5 h-5" />
                <span className="accent-font">Rezervasiyalar</span>
              </Link>
              
              <Link
                to="/admin/users"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/users')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-users"
              >
                <Users className="w-5 h-5" />
                <span className="accent-font">{az.users}</span>
              </Link>
              
              <Link
                to="/admin/expenses"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/expenses')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-expenses"
              >
                <DollarSign className="w-5 h-5" />
                <span className="accent-font">Xərclər</span>
              </Link>
              
              <Link
                to="/admin/analytics"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/analytics')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-analytics"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="accent-font">{az.analytics}</span>
              </Link>
              
              <Link
                to="/admin/financial-report"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/financial-report')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-financial-report"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="accent-font">Maliyyə Hesabatı</span>
              </Link>
              
              <Link
                to="/admin/discounts"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/discounts')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-discounts"
              >
                <Tag className="w-5 h-5" />
                <span className="accent-font">Endirimlər</span>
              </Link>
              
              <Link
                to="/admin/sales-statistics"
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/sales-statistics')
                    ? 'bg-[#1A4D2E] text-white'
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="nav-sales-statistics"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="accent-font">Satış Statistikası</span>
              </Link>
            </nav>
            
            <div className="absolute bottom-6 left-6 right-6">
              <Button onClick={logout} variant="outline" className="w-full justify-start">
                <LogOut className="w-4 h-4 mr-2" />
                {az.logout}
              </Button>
            </div>
          </div>
        </aside>

        <main className="ml-64 flex-1 p-8">
          <Routes>
            <Route path="/" element={<ActiveTablesPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/users" element={<AdminUsersPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/analytics" element={<ProfessionalAnalytics />} />
            <Route path="/financial-report" element={<FinancialReportPage />} />
            <Route path="/discounts" element={<DiscountsPage />} />
            <Route path="/sales-statistics" element={<SalesStatisticsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}