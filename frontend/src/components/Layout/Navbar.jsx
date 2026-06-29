import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

export default function Navbar() {
  const { user, logout, isSuperAdmin, isMerchant, isDriver } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <nav
      style={{
        background: 'var(--color-primary-dark)',
        color: 'white',
        padding: '0.875rem 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>
          🥬 Devil's Lettuce
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link to="/products" style={{ color: 'rgba(255,255,255,0.9)' }}>Products</Link>

          {user ? (
            <>
              <Link to="/cart" style={{ color: 'rgba(255,255,255,0.9)' }}>
                Cart {count > 0 && `(${count})`}
              </Link>
              <Link to="/orders" style={{ color: 'rgba(255,255,255,0.9)' }}>Orders</Link>
              {isSuperAdmin && <Link to="/admin" style={{ color: 'var(--color-accent)' }}>Admin</Link>}
              {isMerchant && <Link to="/merchant" style={{ color: 'var(--color-accent)' }}>Merchant</Link>}
              {isDriver && <Link to="/driver" style={{ color: 'var(--color-accent)' }}>Driver</Link>}
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{user.name}</span>
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                onClick={() => { logout(); navigate('/'); }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.9)' }}>Login</Link>
              <Link to="/register" className="btn btn-sm" style={{ background: 'var(--color-accent)', color: '#212529' }}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
