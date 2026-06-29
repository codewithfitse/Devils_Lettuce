import { useTheme } from '../../contexts/ThemeContext';

export default function Settings() {
  const { theme, setTheme, isDark } = useTheme();

  return (
    <div className="container page-section" style={{ maxWidth: 560 }}>
      <h1 className="page-title">Settings</h1>

      <div className="card settings-card">
        <div className="settings-row">
          <div>
            <h2 className="settings-label">Appearance</h2>
            <p className="settings-desc">
              {isDark
                ? 'Dark mode — premium black & gold theme (default)'
                : 'Light mode — clean professional look'}
            </p>
          </div>
        </div>

        <div className="theme-toggle-group">
          <button
            type="button"
            className={`theme-option ${isDark ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
            aria-pressed={isDark}
          >
            <span className="theme-option-icon">🌙</span>
            <span className="theme-option-text">
              <strong>Dark</strong>
              <small>Default · Gold accents</small>
            </span>
          </button>
          <button
            type="button"
            className={`theme-option ${!isDark ? 'active' : ''}`}
            onClick={() => setTheme('light')}
            aria-pressed={!isDark}
          >
            <span className="theme-option-icon">☀️</span>
            <span className="theme-option-text">
              <strong>Light</strong>
              <small>Clean · Easy on eyes</small>
            </span>
          </button>
        </div>

        <div className="theme-switch-row">
          <span>Quick toggle</span>
          <button
            type="button"
            className={`theme-switch ${isDark ? 'on' : ''}`}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            <span className="theme-switch-thumb" />
          </button>
        </div>
      </div>

      <div className="card settings-card" style={{ marginTop: '1.25rem' }}>
        <h2 className="settings-label">About</h2>
        <p className="settings-desc" style={{ marginBottom: 0 }}>
          Devil&apos;s Lettuce — Quality · Trust · Relief
          <br />
          Premium fruit marketplace, Addis Ababa.
        </p>
      </div>
    </div>
  );
}
