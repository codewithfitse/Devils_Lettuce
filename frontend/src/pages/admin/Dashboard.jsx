import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi, paymentApi, productApi, userApi } from '../../services/api';
import DashboardStatCard from '../../components/DashboardStatCard';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ orders: 0, payments: 0, products: 0, users: 0, pendingPayments: 0 });

  useEffect(() => {
    Promise.all([
      orderApi.getAll(),
      paymentApi.getAll({ status: 'pending' }),
      productApi.getAll({ approvedOnly: false }),
      userApi.getAll().catch(() => ({ data: [] })),
    ]).then(([orders, payments, products, users]) => {
      setStats({
        orders: orders.data.length,
        pendingPayments: payments.data.length,
        products: products.data.filter((p) => !p.isApproved).length,
        users: users.data?.length || 0,
      });
    });
  }, []);

  return (
    <div>
      <h1 className="page-title">Admin Dashboard</h1>

      {stats.pendingPayments > 0 && (
        <Link to="/admin/payments" className="dashboard-alert">
          <span>💳 <strong>{stats.pendingPayments} payment{stats.pendingPayments === 1 ? '' : 's'}</strong> to review</span>
          <span className="dashboard-alert-action">Review →</span>
        </Link>
      )}

      <div className="grid grid-2">
        <DashboardStatCard to="/admin/orders" icon="📦" value={stats.orders} label="Total Orders" />
        <DashboardStatCard to="/admin/payments" icon="💳" value={stats.pendingPayments} label="Pending Payments" />
        <DashboardStatCard to="/admin/products" icon="🍎" value={stats.products} label="Products to Approve" />
        <DashboardStatCard to="/admin/users" icon="👥" value={stats.users} label="Users" />
      </div>
    </div>
  );
}
