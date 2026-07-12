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
import AdminDeliveryAreas from './pages/admin/DeliveryAreas';
import AdminBroadcast from './pages/admin/Broadcast';

// Merchant
import MerchantDashboard from './pages/merchant/Dashboard';
import MerchantProducts from './pages/merchant/Products';
import MerchantOrders from './pages/merchant/Orders';

// Driver
import DriverDashboard from './pages/driver/Dashboard';
import DriverDeliveries from './pages/driver/Deliveries';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', shortLabel: 'Home', icon: '📊', end: true },
  { to: '/admin/users', label: 'Users', shortLabel: 'Users', icon: '👥' },
  { to: '/admin/products', label: 'Products', shortLabel: 'Products', icon: '🍎' },
  { to: '/admin/orders', label: 'Orders', shortLabel: 'Orders', icon: '📦' },
  { to: '/admin/payments', label: 'Payments', shortLabel: 'Pay', icon: '💳' },
  { to: '/admin/delivery-areas', label: 'Delivery Areas', shortLabel: 'Delivery', icon: '🗺️' },
  { to: '/admin/broadcast', label: 'Broadcast', shortLabel: 'Broadcast', icon: '📢' },
];

const merchantLinks = [
  { to: '/merchant', label: 'Dashboard', shortLabel: 'Home', icon: '📊', end: true },
  { to: '/merchant/products', label: 'My Products', shortLabel: 'Products', icon: '🍎' },
  { to: '/merchant/orders', label: 'Orders', shortLabel: 'Orders', icon: '📦' },
];

const driverLinks = [
  { to: '/driver', label: 'Dashboard', shortLabel: 'Home', icon: '📊', end: true },
  { to: '/driver/deliveries', label: 'Deliveries', shortLabel: 'Deliver', icon: '🚗' },
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
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />} panelLinks={adminLinks}><AdminDashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />} panelLinks={adminLinks}><AdminUsers /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/products" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />} panelLinks={adminLinks}><AdminProducts /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/orders" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />} panelLinks={adminLinks}><AdminOrders /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/payments" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />} panelLinks={adminLinks}><AdminPayments /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/delivery-areas" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />} panelLinks={adminLinks}><AdminDeliveryAreas /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/broadcast" element={
        <ProtectedRoute roles={['super_admin']}><Layout sidebar={<Sidebar links={adminLinks} />} panelLinks={adminLinks}><AdminBroadcast /></Layout></ProtectedRoute>
      } />

      {/* Merchant panel */}
      <Route path="/merchant" element={
        <ProtectedRoute permission="canSell"><Layout sidebar={<Sidebar links={merchantLinks} />} panelLinks={merchantLinks}><MerchantDashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/merchant/products" element={
        <ProtectedRoute permission="canSell"><Layout sidebar={<Sidebar links={merchantLinks} />} panelLinks={merchantLinks}><MerchantProducts /></Layout></ProtectedRoute>
      } />
      <Route path="/merchant/orders" element={
        <ProtectedRoute permission="canSell"><Layout sidebar={<Sidebar links={merchantLinks} />} panelLinks={merchantLinks}><MerchantOrders /></Layout></ProtectedRoute>
      } />

      {/* Driver panel */}
      <Route path="/driver" element={
        <ProtectedRoute permission="canDeliver"><Layout sidebar={<Sidebar links={driverLinks} />} panelLinks={driverLinks}><DriverDashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/driver/deliveries" element={
        <ProtectedRoute permission="canDeliver"><Layout sidebar={<Sidebar links={driverLinks} />} panelLinks={driverLinks}><DriverDeliveries /></Layout></ProtectedRoute>
      } />
    </Routes>
  );
}
