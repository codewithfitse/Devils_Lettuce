import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deliveryApi } from '../../services/api';
import DashboardStatCard from '../../components/DashboardStatCard';

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

      {available > 0 && (
        <Link to="/driver/deliveries" className="dashboard-alert">
          <span>📢 <strong>{available} deliver{available === 1 ? 'y' : 'ies'}</strong> available to claim</span>
          <span className="dashboard-alert-action">View →</span>
        </Link>
      )}

      <div className="grid grid-2">
        <DashboardStatCard to="/driver/deliveries" icon="📢" value={available} label="Available to Claim" />
        <DashboardStatCard to="/driver/deliveries" icon="🚗" value={active} label="My Active Deliveries" />
      </div>
    </div>
  );
}
