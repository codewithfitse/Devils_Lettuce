import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Sidebar from './components/Layout/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// User pages
import Home from './pages/user/Home';
import Products from './pages/user/Products';
import ProductDetail from './pages/user/ProductDetail';
import Cart from './pages/user/Cart';
import Checkout from './pages/user/Checkout';
import Orders from './pages/user/Orders';
import PaymentUpload from './pages/user/PaymentUpload';
import Settings from './pages/user/Settings';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminPayments from './pages/admin/Payments';

// Merchant
import MerchantDashboard from './pages/merchant/Dashboard';
import MerchantProducts from './pages/merchant/Products';
import MerchantOrders from './pages/merchant/Orders';

// Driver
import DriverDashboard from './pages/driver/Dashboard';
import DriverDeliveries from './pages/driver/Deliveries';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/products', label: 'Products', icon: '🍎' },
  { to: '/admin/orders', label: 'Orders', icon: '📦' },
  { to: '/admin/payments', label: 'Payments', icon: '💳' },
];

const merchantLinks = [
  { to: '/merchant', label: 'Dashboard', icon: '📊', end: true },
  { to: '/merchant/products', label: 'My Products', icon: '🍎' },
  { to: '/merchant/orders', label: 'Orders', icon: '📦' },
];

const driverLinks = [
  { to: '/driver', label: 'Dashboard', icon: '📊', end: true },
  { to: '/driver/deliveries', label: 'Deliveries', icon: '🚗' },
];

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/products" element={<Layout><Products /></Layout>} />
      <Route path="/products/:id" element={<Layout><ProductDetail /></Layout>} />
      <Route path="/login" element={<Layout><Login /></Layout>} />
      <Route path="/register" element={<Layout><Register /></Layout>} />
      <Route path="/settings" element={<Layout><Settings /></Layout>} />

      {/* User routes */}
      <Route path="/cart" element={<ProtectedRoute><Layout><Cart /></Layout></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><Layout><Checkout /></Layout></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Layout><Orders /></Layout></ProtectedRoute>} />
      <Route path="/payment" element={<ProtectedRoute><Layout><PaymentUpload /></Layout></ProtectedRoute>} />

      {/* Admin panel — super admin only */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />}><AdminDashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />}><AdminUsers /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/products" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />}><AdminProducts /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/orders" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />}><AdminOrders /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/payments" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />}><AdminPayments /></Layout></ProtectedRoute>
      } />

      {/* Merchant panel */}
      <Route path="/merchant" element={
        <ProtectedRoute permission="canSell"><Layout sidebar={<Sidebar links={merchantLinks} />}><MerchantDashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/merchant/products" element={
        <ProtectedRoute permission="canSell"><Layout sidebar={<Sidebar links={merchantLinks} />}><MerchantProducts /></Layout></ProtectedRoute>
      } />
      <Route path="/merchant/orders" element={
        <ProtectedRoute permission="canSell"><Layout sidebar={<Sidebar links={merchantLinks} />}><MerchantOrders /></Layout></ProtectedRoute>
      } />

      {/* Driver panel */}
      <Route path="/driver" element={
        <ProtectedRoute permission="canDeliver"><Layout sidebar={<Sidebar links={driverLinks} />}><DriverDashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/driver/deliveries" element={
        <ProtectedRoute permission="canDeliver"><Layout sidebar={<Sidebar links={driverLinks} />}><DriverDeliveries /></Layout></ProtectedRoute>
      } />
    </Routes>
  );
}
