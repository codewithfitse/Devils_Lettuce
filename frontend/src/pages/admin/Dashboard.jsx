import { useEffect, useState } from 'react';
import { orderApi, paymentApi, productApi, userApi } from '../../services/api';

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

  const cards = [
    { label: 'Total Orders', value: stats.orders, icon: '📦' },
    { label: 'Pending Payments', value: stats.pendingPayments, icon: '💳' },
    { label: 'Products to Approve', value: stats.products, icon: '🍎' },
    { label: 'Users', value: stats.users, icon: '👥' },
  ];

  return (
    <div>
      <h1 className="page-title">Admin Dashboard</h1>
      <div className="grid grid-2">
        {cards.map((c) => (
          <div key={c.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{c.icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{c.value}</div>
            <div style={{ color: 'var(--color-muted)' }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
