import { NavLink } from 'react-router-dom';

export default function PanelMobileNav({ links }) {
  return (
    <nav className="panel-mobile-nav" aria-label="Panel navigation">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => `panel-mobile-nav-link${isActive ? ' active' : ''}`}
        >
          <span className="panel-mobile-nav-icon" aria-hidden="true">{link.icon}</span>
          <span className="panel-mobile-nav-label">{link.shortLabel || link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
