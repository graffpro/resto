import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, CalendarDays, UtensilsCrossed, FolderTree } from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#F8FAF8]">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-white border-r border-[#E2E8E2] fixed left-0 top-0">
          <div className="p-6">
            <Link to="/">
              <h1 className="text-2xl font-bold text-[#1A4D2E] heading-font mb-8">Green Plate Admin</h1>
            </Link>
            
            <nav className="space-y-2">
              <Link 
                to="/admin" 
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin') 
                    ? 'bg-[#1A4D2E] text-white' 
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="admin-nav-dashboard"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="accent-font">Dashboard</span>
              </Link>
              <Link 
                to="/admin/orders" 
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/orders') 
                    ? 'bg-[#1A4D2E] text-white' 
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="admin-nav-orders"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="accent-font">Orders</span>
              </Link>
              <Link 
                to="/admin/reservations" 
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/reservations') 
                    ? 'bg-[#1A4D2E] text-white' 
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="admin-nav-reservations"
              >
                <CalendarDays className="w-5 h-5" />
                <span className="accent-font">Reservations</span>
              </Link>
              <Link 
                to="/admin/menu" 
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/menu') 
                    ? 'bg-[#1A4D2E] text-white' 
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="admin-nav-menu"
              >
                <UtensilsCrossed className="w-5 h-5" />
                <span className="accent-font">Menu Items</span>
              </Link>
              <Link 
                to="/admin/categories" 
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive('/admin/categories') 
                    ? 'bg-[#1A4D2E] text-white' 
                    : 'text-[#5C6B61] hover:bg-[#F5F9E9]'
                }`}
                data-testid="admin-nav-categories"
              >
                <FolderTree className="w-5 h-5" />
                <span className="accent-font">Categories</span>
              </Link>
            </nav>
          </div>
        </aside>

        <main className="ml-64 flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}