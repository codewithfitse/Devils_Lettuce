import { NavLink } from 'react-router-dom';

export default function Sidebar({ links }) {
  return (
    <aside className="sidebar">
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            {link.icon} {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
