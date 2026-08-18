import { CheckCircle, Clock, XCircle, AlertTriangle, Truck, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     icon: Clock,         cls: 'badge-pending' },
  approved:    { label: 'Approved',    icon: CheckCircle,   cls: 'badge-approved' },
  in_progress: { label: 'In Progress', icon: RefreshCw,     cls: 'badge-in_progress' },
  completed:   { label: 'Completed',   icon: CheckCircle,   cls: 'badge-completed' },
  denied:      { label: 'Denied',      icon: XCircle,       cls: 'badge-denied' },
  cancelled:   { label: 'Cancelled',   icon: XCircle,       cls: 'badge-cancelled' },
  available:   { label: 'Available',   icon: CheckCircle,   cls: 'badge-available' },
  in_use:      { label: 'In Use',      icon: Truck,         cls: 'badge-in_use' },
  maintenance: { label: 'Maintenance', icon: AlertTriangle, cls: 'badge-maintenance' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, icon: Clock, cls: '' };
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.cls}`} style={{ gap: '0.35rem' }}>
      <Icon size={10} style={{ marginRight: 2 }} />
      {cfg.label}
    </span>
  );
}
