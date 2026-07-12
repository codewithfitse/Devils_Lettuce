export function formatAreaPrice(price) {
  const fee = Number(price);
  if (!Number.isFinite(fee)) return '—';
  return `${fee} ETB`;
}

/** @deprecated use formatAreaPrice */
export function formatZoneFee(fee) {
  return formatAreaPrice(fee);
}

export default function ZonePicker({ zones, selected, onChange }) {
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
            background: selected.includes(z.key) ? 'var(--color-surface-2)' : 'transparent',
          }}
        >
          <input
            type="checkbox"
            checked={selected.includes(z.key)}
            onChange={() => {
              if (selected.includes(z.key)) {
                onChange(selected.filter((k) => k !== z.key));
              } else {
                onChange([...selected, z.key]);
              }
            }}
          />
          <span style={{ flex: 1 }}>{z.name}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{formatAreaPrice(z.price)}</span>
        </label>
      ))}
    </div>
  );
}
