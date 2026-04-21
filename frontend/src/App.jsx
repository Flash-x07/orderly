import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

// Customer pages
import MenuPage from './pages/customer/MenuPage.jsx';
import OrderSuccessPage from './pages/customer/OrderSuccessPage.jsx';

// Auth pages
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';

// Dashboard pages
import DashboardLayout from './pages/dashboard/DashboardLayout.jsx';
import DashboardHome from './pages/dashboard/DashboardHome.jsx';
import OrdersPage from './pages/dashboard/OrdersPage.jsx';
import MenuManagePage from './pages/dashboard/MenuManagePage.jsx';
import TablesPage from './pages/dashboard/TablesPage.jsx';
import SettingsPage from './pages/dashboard/SettingsPage.jsx';

// Subscription pages
import PromoCodePage from './pages/subscription/PromoCodePage.jsx';
import PricingPage from './pages/subscription/PricingPage.jsx';
import ExpiredPage from './pages/subscription/ExpiredPage.jsx';

// Admin pages
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminRestaurants from './pages/admin/AdminRestaurants.jsx';
import AdminPromoCodes from './pages/admin/AdminPromoCodes.jsx';
import AdminSubscriptions from './pages/admin/AdminSubscriptions.jsx';

// Setup page (for owners with no restaurant)
import SetupRestaurantPage from './pages/dashboard/SetupRestaurantPage.jsx';

// ── Route guards ──────────────────────────────────────────────────────────────

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/dashboard" replace />;
  return children;
};

/**
 * RestaurantRoute
 * ─────────────────────────────────────────────────────────────────────────────
 * Previously redirected users without a restaurant to /dashboard/setup.
 * Now it simply ensures the user is authenticated — the dashboard pages
 * handle the "no restaurant" state themselves with friendly empty states.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const RestaurantRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return children;
};

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      {/* ── Public customer routes ── */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/menu/:restaurantId" element={<MenuPage />} />
      <Route path="/order-success" element={<OrderSuccessPage />} />

      {/* ── Auth routes ── */}
      <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/verify-email"    element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />

      {/* ── Restaurant setup (optional — user-initiated only) ── */}
      <Route
        path="/dashboard/setup"
        element={<ProtectedRoute><SetupRestaurantPage /></ProtectedRoute>}
      />

      {/* ── Restaurant Dashboard ── */}
      <Route
        path="/dashboard"
        element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
      >
        {/* Index redirects to setup if no restaurant */}
        <Route index element={<RestaurantRoute><DashboardHome /></RestaurantRoute>} />
        <Route path="orders"   element={<RestaurantRoute><OrdersPage /></RestaurantRoute>} />
        <Route path="menu"     element={<RestaurantRoute><MenuManagePage /></RestaurantRoute>} />
        <Route path="tables"   element={<RestaurantRoute><TablesPage /></RestaurantRoute>} />
        <Route path="settings" element={<RestaurantRoute><SettingsPage /></RestaurantRoute>} />
        {/* Subscription routes — accessible with or without a restaurant */}
        <Route path="activate" element={<PromoCodePage />} />
        <Route path="pricing"  element={<PricingPage />} />
        <Route path="expired"  element={<ExpiredPage />} />
      </Route>

      {/* ── Admin Panel ── */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="restaurants" element={<AdminRestaurants />} />
        <Route path="promo"       element={<AdminPromoCodes />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
