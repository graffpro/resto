import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Home, CalendarDays, Package } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';

export default function CustomerLayout() {
  const { getTotalItems } = useCart();
  const location = useLocation();
  const totalItems = getTotalItems();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#F5F9E9]">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2" data-testid="home-link">
              <h1 className="text-3xl font-bold text-[#1A4D2E] heading-font">Green Plate</h1>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                to="/" 
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 accent-font ${
                  isActive('/') 
                    ? 'bg-[#1A4D2E] text-white' 
                    : 'text-[#1A4D2E] hover:bg-[#1A4D2E]/10'
                }`}
                data-testid="nav-home"
              >
                <Home className="w-4 h-4" />
                Menu
              </Link>
              <Link 
                to="/reservations" 
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 accent-font ${
                  isActive('/reservations') 
                    ? 'bg-[#1A4D2E] text-white' 
                    : 'text-[#1A4D2E] hover:bg-[#1A4D2E]/10'
                }`}
                data-testid="nav-reservations"
              >
                <CalendarDays className="w-4 h-4" />
                Reservations
              </Link>
              <Link 
                to="/my-orders" 
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 accent-font ${
                  isActive('/my-orders') 
                    ? 'bg-[#1A4D2E] text-white' 
                    : 'text-[#1A4D2E] hover:bg-[#1A4D2E]/10'
                }`}
                data-testid="nav-orders"
              >
                <Package className="w-4 h-4" />
                My Orders
              </Link>
            </nav>

            <Link to="/cart">
              <Button 
                className="relative bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-full px-6 transition-all duration-200 active:scale-95"
                data-testid="cart-button"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span 
                    className="absolute -top-2 -right-2 bg-[#E76F51] text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
                    data-testid="cart-count"
                  >
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="bg-white border-t border-[#E2E8E2] mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-[#1A4D2E] heading-font mb-4">Green Plate</h3>
              <p className="text-[#5C6B61]">Fresh, organic, and delicious meals delivered to your doorstep.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-[#1A4D2E] mb-4 accent-font">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-[#5C6B61] hover:text-[#1A4D2E] transition-colors">Menu</Link></li>
                <li><Link to="/reservations" className="text-[#5C6B61] hover:text-[#1A4D2E] transition-colors">Reservations</Link></li>
                <li><Link to="/admin" className="text-[#5C6B61] hover:text-[#1A4D2E] transition-colors">Admin</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-[#1A4D2E] mb-4 accent-font">Contact</h4>
              <p className="text-[#5C6B61]">Email: info@greenplate.com</p>
              <p className="text-[#5C6B61]">Phone: (555) 123-4567</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}