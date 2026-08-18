import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Bell, X, CheckCheck, Menu, CheckCircle, Info,
  AlertTriangle, AlertCircle, ArrowRight, ExternalLink, Calendar
} from 'lucide-react';
import { gpsApi } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const TYPE_COLORS = {
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
  error: '#ef4444'
};

const TYPE_ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
  error: AlertCircle
};

function getNotificationAction(notif, userRole) {
  const text = `${notif?.title || ''} ${notif?.message || ''}`.toLowerCase();

  if (text.includes('vehicle') || text.includes('car') || text.includes('fleet') || text.includes('maintenance')) {
    if (userRole === 'admin') return { label: 'Go to Vehicle Management', to: '/vehicles' };
    return { label: 'Go to Fleet Status', to: '/fleet-status' };
  }

  if (text.includes('user') || text.includes('account')) {
    if (userRole === 'admin') return { label: 'Go to User Management', to: '/users' };
  }

  if (text.includes('calendar') || text.includes('schedule')) {
    return { label: 'Go to Calendar Schedule', to: '/calendar' };
  }

  // Request & Trip related notifications
  if (userRole === 'admin') {
    return { label: 'Go to Transport Requests', to: '/requests' };
  }
  if (userRole === 'driver') {
    return { label: 'Go to My Trips', to: '/my-trips' };
  }
  return { label: 'Go to My Requests', to: '/my-requests' };
}

function NotificationModal({ notif, onClose, onNavigate }) {
  const { user } = useAuth();
  if (!notif) return null;

  const IconComponent = TYPE_ICONS[notif.type] || Info;
  const color = TYPE_COLORS[notif.type] || '#3b82f6';
  const action = getNotificationAction(notif, user?.role);

  let formattedDate = '';
  let relativeTime = '';
  try {
    const d = new Date(notif.created_at);
    formattedDate = d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    relativeTime = formatDistanceToNow(d, { addSuffix: true });
  } catch {
    formattedDate = notif.created_at;
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 300 }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: `${color}22`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <IconComponent size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Notification Details</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Notification Title & Time */}
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem', fontFamily: 'Montserrat' }}>
              {notif.title}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{formattedDate}</span>
              {relativeTime && (
                <>
                  <span>·</span>
                  <span style={{ color: 'var(--accent-teal)' }}>{relativeTime}</span>
                </>
              )}
            </div>
          </div>

          {/* Notification Message Card */}
          <div style={{
            background: 'var(--surface-2)',
            border: `1px solid ${color}33`,
            borderLeft: `4px solid ${color}`,
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            fontSize: '0.88rem',
            lineHeight: 1.5,
            color: 'var(--text-primary)'
          }}>
            {notif.message}
          </div>

          {/* Quick Subject Link Hint */}
          <div style={{
            background: 'rgba(201, 168, 76, 0.08)',
            border: '1px solid rgba(201, 168, 76, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.625rem 0.75rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <span>Target Section: <strong style={{ color: 'var(--gold-300)' }}>{action.label.replace('Go to ', '')}</strong></span>
            <ExternalLink size={13} color="var(--gold-400)" />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Dismiss
          </button>
          <button
            id="notif-go-to-subject"
            className="btn btn-primary"
            onClick={() => onNavigate(action.to)}
          >
            {action.label} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Header({ title, onMenuClick }) {
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [activeNotif, setActiveNotif] = useState(null);
  const unread = notifs.filter(n => !n.is_read).length;

  const loadNotifs = () => {
    gpsApi.notifications().then(r => setNotifs(r.data || [])).catch(() => {});
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

  const handleNotifClick = (n) => {
    if (!n.is_read) {
      markRead(n.id);
    }
    setShowNotif(false);
    setActiveNotif(n);
  };

  const handleModalNavigate = (route) => {
    setActiveNotif(null);
    navigate(route);
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

      {/* Notification Dropdown Panel */}
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
                onClick={() => handleNotifClick(n)}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div className="notif-item-title">{n.title}</div>
                  {!n.is_read && (
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--gold-400)',
                      marginTop: 4,
                      flexShrink: 0
                    }} />
                  )}
                </div>
                <div className="notif-item-msg">{n.message}</div>
                <div className="notif-item-time" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                  <span>
                    {(() => {
                      try { return formatDistanceToNow(new Date(n.created_at), { addSuffix: true }); }
                      catch { return n.created_at; }
                    })()}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--gold-400)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                    Click to view <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Notification Detail Modal */}
      {activeNotif && (
        <NotificationModal
          notif={activeNotif}
          onClose={() => setActiveNotif(null)}
          onNavigate={handleModalNavigate}
        />
      )}
    </>
  );
}
