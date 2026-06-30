import { useState, useEffect, cloneElement } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout({ children, sidebar }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setPanelOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (panelOpen) document.body.classList.add('scroll-lock');
    else document.body.classList.remove('scroll-lock');
    return () => document.body.classList.remove('scroll-lock');
  }, [panelOpen]);

  const sidebarWithClose = sidebar
    ? cloneElement(sidebar, { onNavigate: () => setPanelOpen(false) })
    : null;

  return (
    <div className="app-shell">
      <Navbar />
      {sidebar ? (
        <div className="panel-shell">
          <button
            type="button"
            className="panel-menu-btn btn btn-sm btn-outline"
            onClick={() => setPanelOpen(true)}
            aria-label="Open panel menu"
          >
            ☰ Menu
          </button>
          <button
            type="button"
            className={`panel-overlay${panelOpen ? ' visible' : ''}`}
            aria-label="Close panel menu"
            onClick={() => setPanelOpen(false)}
            tabIndex={panelOpen ? 0 : -1}
          />
          <div className="panel-layout">
            <div className={`sidebar-drawer${panelOpen ? ' open' : ''}`}>
              {sidebarWithClose}
            </div>
            <main className="panel-main">{children}</main>
          </div>
        </div>
      ) : (
        <main className="site-main">{children}</main>
      )}
    </div>
  );
}
