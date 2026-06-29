import { useEffect, useState } from 'react';
import { deliveryApi } from '../../services/api';

export default function DriverDashboard() {
  const [available, setAvailable] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    deliveryApi.getAvailable().then((res) => setAvailable(res.data.length));
    deliveryApi.getMine().then((res) => setActive(res.data.length));
  }, []);

  return (
    <div>
      <h1 className="page-title">Driver Dashboard</h1>
      <div className="grid grid-2">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>📢</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{available}</div>
          <div style={{ color: 'var(--color-muted)' }}>Available to Claim</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>🚗</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{active}</div>
          <div style={{ color: 'var(--color-muted)' }}>My Active Deliveries</div>
        </div>
      </div>
    </div>
  );
}
