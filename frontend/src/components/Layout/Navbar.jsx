import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

export default function Navbar() {
  const { user, logout, isSuperAdmin, isMerchant, isDriver } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="Devil's Lettuce" className="navbar-logo" />
          <span className="navbar-brand-text">
            <span>Devil&apos;s Lettuce</span>
            <small>Quality · Trust · Relief</small>
          </span>
        </Link>

        <div className="navbar-links">
          <Link to="/products" className="nav-link">Products</Link>

          {user ? (
            <>
              <Link to="/cart" className="nav-link">
                Cart{count > 0 && ` (${count})`}
              </Link>
              <Link to="/orders" className="nav-link">Orders</Link>
              {isSuperAdmin && <Link to="/admin" className="nav-link-accent">Admin</Link>}
              {isMerchant && <Link to="/merchant" className="nav-link-accent">Merchant</Link>}
              {isDriver && <Link to="/driver" className="nav-link-accent">Driver</Link>}
              <Link to="/settings" className="btn-icon" title="Settings">⚙️</Link>
              <span className="nav-user">{user.name}</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => { logout(); navigate('/'); }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/settings" className="btn-icon" title="Settings">⚙️</Link>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-sm btn-primary">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
