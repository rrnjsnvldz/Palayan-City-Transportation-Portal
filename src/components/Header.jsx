import { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, Menu } from 'lucide-react';
import { gpsApi } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const TYPE_COLORS = { success: '#22c55e', warning: '#f59e0b', info: '#3b82f6', error: '#ef4444' };

export default function Header({ title, onMenuClick }) {
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const unread = notifs.filter(n => !n.is_read).length;

  const loadNotifs = () => {
    gpsApi.notifications().then(r => setNotifs(r.data)).catch(() => {});
  };

  useEffect(() => {
    loadNotifs();
    const iv = setInterval(loadNotifs, 20000);
    return () => clearInterval(iv);
  }, []);

  const markAllRead = async () => {
    await gpsApi.markAllRead();
    setNotifs(notifs.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id) => {
    await gpsApi.markRead(id);
    setNotifs(notifs.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <>
      <header className="top-header">
        <div className="header-left">
          <button
            className="hamburger-btn"
            onClick={onMenuClick}
            aria-label="Toggle navigation menu"
            id="hamburger-btn"
          >
            <Menu size={18} />
          </button>
          <span className="header-title">{title}</span>
        </div>

        <div className="header-actions">
          <button
            id="notif-btn"
            className="notif-btn"
            onClick={() => setShowNotif(!showNotif)}
            aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
          >
            <Bell size={17} />
            {unread > 0 && <span className="notif-dot" aria-hidden="true" />}
          </button>
        </div>
      </header>

      {showNotif && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            onClick={() => setShowNotif(false)}
            aria-hidden="true"
          />
          <div className="notif-panel">
            <div className="flex items-center justify-between" style={{ marginBottom: '0.875rem' }}>
              <h3 style={{ fontSize: '0.95rem' }}>
                Notifications {unread > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--accent-red)', fontWeight: 700 }}>({unread})</span>}
              </h3>
              <div className="flex gap-1">
                {unread > 0 && (
                  <button className="btn btn-sm btn-secondary" onClick={markAllRead} style={{ fontSize: '0.72rem' }}>
                    <CheckCheck size={13} /> All Read
                  </button>
                )}
                <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setShowNotif(false)} aria-label="Close">
                  <X size={14} />
                </button>
              </div>
            </div>

            {notifs.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <div className="empty-icon">🔔</div>
                <h3>All caught up!</h3>
                <p>No notifications yet</p>
              </div>
            ) : notifs.map(n => (
              <div
                key={n.id}
                className={`notif-item${!n.is_read ? ' unread' : ''}`}
                style={{ borderLeftColor: TYPE_COLORS[n.type] || TYPE_COLORS.info }}
                onClick={() => !n.is_read && markRead(n.id)}
                role="button"
                tabIndex={0}
              >
                <div className="notif-item-title">{n.title}</div>
                <div className="notif-item-msg">{n.message}</div>
                <div className="notif-item-time">
                  {(() => {
                    try { return formatDistanceToNow(new Date(n.created_at), { addSuffix: true }); }
                    catch { return n.created_at; }
                  })()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
