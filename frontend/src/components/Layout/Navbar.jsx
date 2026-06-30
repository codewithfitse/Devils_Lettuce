import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

export default function Navbar() {
  const { user, logout, isSuperAdmin, isMerchant, isDriver } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (menuOpen) document.body.classList.add('scroll-lock');
    else document.body.classList.remove('scroll-lock');
    return () => document.body.classList.remove('scroll-lock');
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <img src="/logo.png" alt="Devil's Lettuce" className="navbar-logo" />
          <span className="navbar-brand-text">
            <span>Devil&apos;s Lettuce</span>
            <small>Quality · Trust · Relief</small>
          </span>
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`navbar-links${menuOpen ? ' open' : ''}`}>
          <Link to="/products" className="nav-link" onClick={closeMenu}>Products</Link>

          {user ? (
            <>
              <Link to="/cart" className="nav-link" onClick={closeMenu}>
                Cart{count > 0 && ` (${count})`}
              </Link>
              <Link to="/orders" className="nav-link" onClick={closeMenu}>Orders</Link>
              {isSuperAdmin && <Link to="/admin" className="nav-link-accent" onClick={closeMenu}>Admin</Link>}
              {isMerchant && <Link to="/merchant" className="nav-link-accent" onClick={closeMenu}>Merchant</Link>}
              {isDriver && <Link to="/driver" className="nav-link-accent" onClick={closeMenu}>Driver</Link>}
              <Link to="/settings" className="nav-link" onClick={closeMenu}>Settings</Link>
              <span className="nav-user">{user.name}</span>
              <button
                type="button"
                className="btn btn-sm btn-ghost nav-logout-btn"
                onClick={() => { logout(); navigate('/'); closeMenu(); }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/settings" className="nav-link" onClick={closeMenu}>Settings</Link>
              <Link to="/login" className="nav-link" onClick={closeMenu}>Login</Link>
              <Link to="/register" className="btn btn-sm btn-primary nav-register-btn" onClick={closeMenu}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
