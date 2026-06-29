import { useEffect, useState } from 'react';
import { orderApi, productApi } from '../../services/api';

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
      <div className="grid grid-2">
        {[
          { label: 'My Products', value: stats.products, icon: '🍎' },
          { label: 'Total Orders', value: stats.orders, icon: '📦' },
          { label: 'Pending Orders', value: stats.pending, icon: '⏳' },
        ].map((c) => (
          <div key={c.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem' }}>{c.icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{c.value}</div>
            <div style={{ color: 'var(--color-muted)' }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
