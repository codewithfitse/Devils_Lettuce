const RECOMMENDATION_LABELS = {
  likely_real: 'Likely real',
  uncertain: 'Uncertain',
  likely_fake: 'Likely fake',
};

const RECOMMENDATION_CLASS = {
  likely_real: 'verification-badge-real',
  uncertain: 'verification-badge-uncertain',
  likely_fake: 'verification-badge-fake',
};

export default function PaymentVerificationPanel({ payment }) {
  const v = payment.verification;
  if (!v) return null;

  if (v.status === 'pending' || v.status === 'processing') {
    return (
      <div className="payment-verification payment-verification-processing">
        <strong>Verification:</strong> Checking official Telebirr receipt…
      </div>
    );
  }

  if (v.status === 'failed') {
    return (
      <div className="payment-verification payment-verification-failed">
        <strong>Verification failed:</strong> {v.error || 'Could not verify payment'}
        <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--color-muted)' }}>
          Review the proof image manually below.
        </p>
      </div>
    );
  }

  if (payment.duplicateViolation || (payment.status === 'rejected' && payment.violationReason)) {
    return (
      <div className="payment-verification payment-verification-failed">
        <strong>Duplicate transaction violation</strong>
        <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
          {payment.violationReason || payment.rejectionReason || 'This receipt was already used.'}
        </p>
      </div>
    );
  }

  const confidence = v.confidence ?? 0;
  const recClass = RECOMMENDATION_CLASS[v.recommendation] || 'verification-badge-uncertain';
  const official = v.officialReceipt || {};

  return (
    <div className="payment-verification">
      <div className="payment-verification-header">
        <span className={`verification-badge ${recClass}`}>
          {confidence}% — {RECOMMENDATION_LABELS[v.recommendation] || 'Uncertain'}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          Official receipt check — you approve or reject manually
        </span>
      </div>

      <div className="verification-confidence-bar" aria-hidden="true">
        <div
          className={`verification-confidence-fill ${recClass}`}
          style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
        />
      </div>

      {official.transactionId && (
        <div className="verification-fields" style={{ marginBottom: '0.75rem' }}>
          <div className="verification-field">
            <span>Transaction ID</span>
            <span>
              {official.receiptUrl ? (
                <a href={official.receiptUrl} target="_blank" rel="noreferrer">
                  {official.transactionId}
                </a>
              ) : (
                official.transactionId
              )}
            </span>
          </div>
          {official.fetchError && (
            <div className="verification-field">
              <span>Receipt fetch</span>
              <span style={{ color: 'var(--color-danger)' }}>{official.fetchError}</span>
            </div>
          )}
        </div>
      )}

      <div className="verification-fields">
        <div className="verification-field">
          <span>Credited name</span>
          <span>{official.creditedPartyName || '—'}</span>
        </div>
        <div className="verification-field">
          <span>Credited account</span>
          <span>{official.creditedPartyAccount || '—'}</span>
        </div>
        <div className="verification-field">
          <span>Status</span>
          <span>{official.transactionStatus || '—'}</span>
        </div>
        <div className="verification-field">
          <span>Settled amount</span>
          <span>
            {official.settledAmount != null ? `${official.settledAmount} ETB` : '—'}
            {' · '}
            Order total: {payment.totalAmount} ETB
          </span>
        </div>
      </div>

      {v.checks?.length > 0 && (
        <ul className="verification-checklist">
          {v.checks.map((check) => (
            <li key={check.id} className={check.passed ? 'passed' : 'failed'}>
              <span>{check.passed ? '✓' : '✗'} {check.label}</span>
              <span>{check.points}/{check.maxPoints}</span>
            </li>
          ))}
        </ul>
      )}

      {payment.proof && (
        <img
          src={payment.proof}
          alt="Payment proof"
          className="payment-proof-preview"
        />
      )}
    </div>
  );
}
