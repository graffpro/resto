import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';
import OwnerDashboard from '@/pages/owner/OwnerDashboard';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import KitchenDashboard from '@/pages/kitchen/KitchenDashboard';
import WaiterDashboard from '@/pages/waiter/WaiterDashboard';
import CustomerPage from '@/pages/customer/CustomerPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F9E9]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/table/:tableId" element={<CustomerPage />} />
      
      <Route
        path="/owner/*"
        element={
          <ProtectedRoute allowedRoles={['owner']}>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin', 'owner']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['kitchen']}>
            <KitchenDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/waiter"
        element={
          <ProtectedRoute allowedRoles={['waiter']}>
            <WaiterDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/"
        element={
          user ? (
            user.role === 'owner' ? <Navigate to="/owner" replace /> :
            user.role === 'admin' ? <Navigate to="/admin" replace /> :
            user.role === 'kitchen' ? <Navigate to="/kitchen" replace /> :
            user.role === 'waiter' ? <Navigate to="/waiter" replace /> :
            <Navigate to="/login" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}

export default App;