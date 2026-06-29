import { NavLink } from 'react-router-dom';

export default function Sidebar({ links }) {
  return (
    <aside
      style={{
        width: 240,
        minHeight: 'calc(100vh - 60px)',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        padding: '1.5rem 0',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            style={({ isActive }) => ({
              padding: '0.625rem 1.5rem',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
              fontWeight: isActive ? 600 : 400,
              background: isActive ? 'rgba(45,106,79,0.08)' : 'transparent',
              borderRight: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
            })}
          >
            {link.icon} {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
