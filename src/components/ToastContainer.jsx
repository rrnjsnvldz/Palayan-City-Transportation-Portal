import { useToast } from '../hooks/useToast';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const ICONS = { success: CheckCircle, warning: AlertTriangle, error: XCircle, info: Info };
const COLORS = { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' };

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="toast-container">
      {toasts.map(t => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            className="toast"
            style={{ '--toast-color': COLORS[t.type] || COLORS.info }}
          >
            <Icon size={18} color={COLORS[t.type]} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              {t.title && <div className="toast-title">{t.title}</div>}
              {t.message && <div className="toast-msg">{t.message}</div>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
