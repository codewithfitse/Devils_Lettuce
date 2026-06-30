import { Link } from 'react-router-dom';

export default function DashboardStatCard({ to, icon, value, label }) {
  return (
    <Link to={to} className="dashboard-stat-card card">
      <div className="dashboard-stat-icon" aria-hidden="true">{icon}</div>
      <div className="dashboard-stat-value">{value}</div>
      <div className="dashboard-stat-label">{label}</div>
    </Link>
  );
}
