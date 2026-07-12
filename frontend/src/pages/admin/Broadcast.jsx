import { useEffect, useState } from 'react';
import { notificationApi } from '../../services/api';

export default function AdminBroadcast() {
  const [subscriberCount, setSubscriberCount] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    notificationApi
      .getSubscriberCount()
      .then((res) => setSubscriberCount(res.data.count))
      .catch((err) => setError(err.message));
  }, []);

  const send = async (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;

    if (!window.confirm(`Send this message to ${subscriberCount ?? 'all'} bot users?`)) return;

    setSending(true);
    setError('');
    setResult(null);
    try {
      const res = await notificationApi.broadcast(text);
      setResult(res.data);
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Telegram Broadcast</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Send a message to everyone who has started the Telegram bot.
        {subscriberCount != null && (
          <> Currently <strong>{subscriberCount}</strong> subscribers.</>
        )}
      </p>

      {result && (
        <div className="alert alert-success">
          Sent to {result.sent} of {result.total} users
          {result.failed > 0 ? ` (${result.failed} failed — user may have blocked the bot)` : ''}.
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card" style={{ padding: '1.25rem', maxWidth: 640 }} onSubmit={send}>
        <label htmlFor="broadcast-message" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Message
        </label>
        <textarea
          id="broadcast-message"
          className="input"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="New stock arrived! Open the bot and tap Browse Products."
          maxLength={4000}
          style={{ width: '100%', marginBottom: '0.75rem', resize: 'vertical' }}
        />
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          HTML tags like &lt;b&gt;bold&lt;/b&gt; are supported. New products are announced automatically when you approve them.
        </p>
        <button type="submit" className="btn btn-primary" disabled={sending || !message.trim()}>
          {sending ? 'Sending…' : 'Send to all bot users'}
        </button>
      </form>
    </div>
  );
}
