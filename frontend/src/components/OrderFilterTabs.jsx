const COMPLETED_STATUSES = new Set(['completed', 'cancelled']);

export function isActiveOrder(status) {
  return !COMPLETED_STATUSES.has(status);
}

export function splitOrders(orders) {
  const active = [];
  const completed = [];
  for (const order of orders) {
    if (isActiveOrder(order.status)) active.push(order);
    else completed.push(order);
  }
  return { active, completed };
}

export default function OrderFilterTabs({ tab, onTabChange, activeCount, completedCount }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        className={`btn btn-sm ${tab === 'active' ? 'btn-primary' : 'btn-outline'}`}
        onClick={() => onTabChange('active')}
      >
        Active ({activeCount})
      </button>
      <button
        type="button"
        className={`btn btn-sm ${tab === 'completed' ? 'btn-primary' : 'btn-outline'}`}
        onClick={() => onTabChange('completed')}
      >
        Completed ({completedCount})
      </button>
    </div>
  );
}
