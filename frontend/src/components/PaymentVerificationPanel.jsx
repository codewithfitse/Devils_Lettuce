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
        <strong>Verification:</strong> Scanning screenshot…
      </div>
    );
  }

  if (v.status === 'failed') {
    return (
      <div className="payment-verification payment-verification-failed">
        <strong>Verification failed:</strong> {v.error || 'Could not scan screenshot'}
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

  return (
    <div className="payment-verification">
      <div className="payment-verification-header">
        <span className={`verification-badge ${recClass}`}>
          {confidence}% — {RECOMMENDATION_LABELS[v.recommendation] || 'Uncertain'}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          Suggestion only — you approve or reject manually
        </span>
      </div>

      <div className="verification-confidence-bar" aria-hidden="true">
        <div
          className={`verification-confidence-fill ${recClass}`}
          style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
        />
      </div>

      <div className="verification-fields">
        <div className="verification-field">
          <span>Amount</span>
          <span>
            OCR: {v.extracted?.amount != null ? `${v.extracted.amount} ETB` : '—'}
            {' · '}
            Expected: {payment.totalAmount} ETB
          </span>
        </div>
        <div className="verification-field">
          <span>Recipient</span>
          <span>{v.extracted?.recipient || '—'}</span>
        </div>
        <div className="verification-field">
          <span>Reference</span>
          <span>{v.extracted?.reference || '—'}</span>
        </div>
        {v.extracted?.successText && (
          <div className="verification-field">
            <span>Success text</span>
            <span>{v.extracted.successText}</span>
          </div>
        )}
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
