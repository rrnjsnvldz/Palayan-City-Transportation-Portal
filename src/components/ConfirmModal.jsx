import { AlertTriangle, Trash2, LogOut, CheckCircle, Info, X } from 'lucide-react';

const TYPE_CONFIGS = {
  danger: {
    color: 'var(--accent-red)',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    shadow: 'rgba(239, 68, 68, 0.25)',
    btnClass: 'btn-danger',
    defaultIcon: Trash2,
  },
  warning: {
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    shadow: 'rgba(245, 158, 11, 0.25)',
    btnClass: 'btn-primary',
    defaultIcon: AlertTriangle,
  },
  success: {
    color: 'var(--accent-teal)',
    bg: 'rgba(20, 184, 166, 0.12)',
    border: 'rgba(20, 184, 166, 0.3)',
    shadow: 'rgba(20, 184, 166, 0.25)',
    btnClass: 'btn-success',
    defaultIcon: CheckCircle,
  },
  info: {
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
    shadow: 'rgba(59, 130, 246, 0.25)',
    btnClass: 'btn-primary',
    defaultIcon: Info,
  }
};

export default function ConfirmModal({
  isOpen = true,
  title = 'Confirmation Required',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  icon: CustomIcon,
  loading = false,
  onConfirm,
  onClose
}) {
  if (!isOpen) return null;

  const config = TYPE_CONFIGS[type] || TYPE_CONFIGS.danger;
  const IconComponent = CustomIcon || config.defaultIcon;

  return (
    <div className="modal-overlay" style={{ zIndex: 400 }}>
      <div className="modal" style={{ maxWidth: 420, textAlign: 'center', padding: '1.75rem 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Glowing Icon Badge */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: config.bg,
            border: `1.5px solid ${config.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.color,
            marginBottom: '1rem',
            boxShadow: `0 0 24px ${config.shadow}`
          }}>
            <IconComponent size={24} />
          </div>

          <h3 style={{
            fontSize: '1.2rem',
            color: 'var(--text-primary)',
            marginBottom: '0.4rem',
            fontFamily: 'Montserrat',
            fontWeight: 800
          }}>
            {title}
          </h3>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            lineHeight: 1.5,
            margin: '0 0 1.5rem 0'
          }}>
            {message}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {cancelText}
            </button>
            <button
              className={`btn ${config.btnClass}${loading ? ' btn-loading' : ''}`}
              onClick={onConfirm}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {!loading && confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
