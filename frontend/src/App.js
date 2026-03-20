import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";
import CustomerLayout from "@/components/layouts/CustomerLayout";
import AdminLayout from "@/components/layouts/AdminLayout";
import HomePage from "@/pages/customer/HomePage";
import CartPage from "@/pages/customer/CartPage";
import CheckoutPage from "@/pages/customer/CheckoutPage";
import ReservationsPage from "@/pages/customer/ReservationsPage";
import MyOrdersPage from "@/pages/customer/MyOrdersPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import OrdersManagement from "@/pages/admin/OrdersManagement";
import ReservationsManagement from "@/pages/admin/ReservationsManagement";
import MenuManagement from "@/pages/admin/MenuManagement";
import CategoriesManagement from "@/pages/admin/CategoriesManagement";
import { CartProvider } from "@/context/CartContext";

function App() {
  return (
    <CartProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<CustomerLayout />}>
              <Route index element={<HomePage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="reservations" element={<ReservationsPage />} />
              <Route path="my-orders" element={<MyOrdersPage />} />
            </Route>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<OrdersManagement />} />
              <Route path="reservations" element={<ReservationsManagement />} />
              <Route path="menu" element={<MenuManagement />} />
              <Route path="categories" element={<CategoriesManagement />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </CartProvider>
  );
}

export default App;