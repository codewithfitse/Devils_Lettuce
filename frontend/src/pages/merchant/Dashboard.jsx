import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi, productApi } from '../../services/api';
import DashboardStatCard from '../../components/DashboardStatCard';

export default function MerchantDashboard() {
  const [stats, setStats] = useState({ orders: 0, pending: 0, products: 0 });

  useEffect(() => {
    Promise.all([orderApi.getMerchant(), productApi.getMine()]).then(([orders, products]) => {
      setStats({
        orders: orders.data.length,
        pending: orders.data.filter((o) => o.status === 'pending').length,
        products: products.data.length,
      });
    });
  }, []);

  return (
    <div>
      <h1 className="page-title">Merchant Dashboard</h1>

      {stats.pending > 0 && (
        <Link to="/merchant/orders" className="dashboard-alert">
          <span>⏳ <strong>{stats.pending} pending order{stats.pending === 1 ? '' : 's'}</strong> waiting — tap to accept</span>
          <span className="dashboard-alert-action">View Orders →</span>
        </Link>
      )}

      <div className="grid grid-2">
        <DashboardStatCard to="/merchant/products" icon="🍎" value={stats.products} label="My Products" />
        <DashboardStatCard to="/merchant/orders" icon="📦" value={stats.orders} label="Total Orders" />
        <DashboardStatCard to="/merchant/orders" icon="⏳" value={stats.pending} label="Pending Orders" />
      </div>
    </div>
  );
}
