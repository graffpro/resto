import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { lazy, Suspense } from 'react';
import AppUpdater from '@/utils/AppUpdater';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const OwnerDashboard = lazy(() => import('@/pages/owner/OwnerDashboard'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const KitchenDashboard = lazy(() => import('@/pages/kitchen/KitchenDashboard'));
const WaiterDashboard = lazy(() => import('@/pages/waiter/WaiterDashboard'));
const CustomerPage = lazy(() => import('@/pages/customer/CustomerPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F7]" role="status" aria-label="Yüklənir">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent"></div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F7]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#C05C3D] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    // Stale localStorage token may exist if no API call has fired yet to
    // trigger the 401 interceptor — clear it so the next visit is clean.
    try {
      if (localStorage.getItem('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch {}
    return <Navigate to="/" replace />;
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
      <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
      <Route path="/table/:tableId" element={<Suspense fallback={<PageLoader />}><CustomerPage /></Suspense>} />
      <Route path="/customer/:tableId" element={<Suspense fallback={<PageLoader />}><CustomerPage /></Suspense>} />
      
      <Route
        path="/owner/*"
        element={
          <ProtectedRoute allowedRoles={['owner']}>
            <Suspense fallback={<PageLoader />}><OwnerDashboard /></Suspense>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin', 'owner']}>
            <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['kitchen', 'bar']}>
            <Suspense fallback={<PageLoader />}><KitchenDashboard /></Suspense>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/waiter"
        element={
          <ProtectedRoute allowedRoles={['waiter']}>
            <Suspense fallback={<PageLoader />}><WaiterDashboard /></Suspense>
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
            user.role === 'bar' ? <Navigate to="/kitchen" replace /> :
            user.role === 'waiter' ? <Navigate to="/waiter" replace /> :
            <Navigate to="/admin" replace />
          ) : (
            <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>
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
        <AppUpdater />
      </div>
    </AuthProvider>
  );
}

export default App;