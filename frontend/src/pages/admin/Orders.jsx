import { useEffect, useState } from 'react';
import { orderApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import OrderFilterTabs, { splitOrders } from '../../components/OrderFilterTabs';
import OrderManagementCard from '../../components/OrderManagementCard';

export default function AdminOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('active');
  const [error, setError] = useState('');

  const load = () => orderApi.getAll().then((res) => setOrders(res.data));
  useEffect(() => { load(); }, []);

  const run = async (action) => {
    setError('');
    try {
      await action();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const { active, completed } = splitOrders(orders);
  const visible = tab === 'active' ? active : completed;

  return (
    <div>
      <h1 className="page-title">All Orders</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Manage every order — accept, reject, release to drivers, or deliver yourself.
      </p>
      {error && <div className="alert alert-error">{error}</div>}

      <OrderFilterTabs
        tab={tab}
        onTabChange={setTab}
        activeCount={active.length}
        completedCount={completed.length}
      />

      {!visible.length ? (
        <p className="empty-state">{tab === 'active' ? 'No active orders.' : 'No completed orders yet.'}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {visible.map((order) => (
            <OrderManagementCard
              key={order._id}
              order={order}
              user={user}
              run={run}
              showMerchant
            />
          ))}
        </div>
      )}
    </div>
  );
}
