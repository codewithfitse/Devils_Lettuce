import { NavLink } from 'react-router-dom';

export default function Sidebar({ links, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Panel</span>
        {onNavigate && (
          <button type="button" className="sidebar-close btn-icon" onClick={onNavigate} aria-label="Close menu">
            ✕
          </button>
        )}
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={onNavigate}
          >
            {link.icon} {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
