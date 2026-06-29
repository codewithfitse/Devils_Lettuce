export function formatZoneFee(fee) {
  return fee === 0 ? 'Free' : `+${fee} ETB`;
}

export default function ZonePicker({ zones, selected, onChange, idPrefix = 'zone' }) {
  const toggle = (key) => {
    if (selected.includes(key)) {
      if (selected.length <= 1) return;
      onChange(selected.filter((z) => z !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  if (!zones.length) return <p className="text-muted">Loading delivery areas…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {zones.map((z) => (
        <label
          key={z.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 0.65rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            background: selected.includes(z.key) ? 'var(--color-surface-elevated, rgba(61, 139, 95, 0.1))' : 'transparent',
          }}
        >
          <input
            id={`${idPrefix}-${z.key}`}
            type="checkbox"
            checked={selected.includes(z.key)}
            onChange={() => toggle(z.key)}
          />
          <span style={{ flex: 1 }}>{z.name}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{formatZoneFee(z.fee)}</span>
        </label>
      ))}
      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: 0 }}>
        Tick at least one area. Uncheck areas you are not delivering to right now (e.g. at night).
      </p>
    </div>
  );
}
