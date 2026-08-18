import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestApi, vehicleApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../../components/StatusBadge';
import AssignModal from '../../components/AssignModal';
import { formatTime12, calculateDuration } from '../../utils/timeFormat';
import {
  FileText, Car, Activity, CheckCircle, XCircle, Clock,
  Wrench, MapPin, Users, ChevronRight, AlertCircle, ArrowRight, Edit2
} from 'lucide-react';

function DenyModal({ request, onClose, onDenied }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDeny = async () => {
    setLoading(true);
    try {
      await requestApi.deny(request.id, reason);
      toast({ type: 'success', title: 'Request Denied' });
      onDenied();
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error });
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Deny Request</h3>
          <button className="modal-close" onClick={onClose}><XCircle size={14} /></button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem' }}>Provide a reason for denying <strong>{request.destination}</strong> request:</p>
          <div className="form-group">
            <textarea className="form-control" rows={3} placeholder="Reason for denial..." value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className={`btn btn-danger${loading ? ' btn-loading' : ''}`} onClick={handleDeny} disabled={loading}>
            {!loading && <><XCircle size={16} /> Deny</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignTarget, setAssignTarget] = useState(null);
  const [denyTarget, setDenyTarget] = useState(null);
  const { toast } = useToast();

  const loadData = () => {
    Promise.all([requestApi.stats(), requestApi.list(), vehicleApi.list()])
      .then(([s, r, v]) => {
        setStats(s.data);
        setRequests(r.data);
        setVehicles(v.data);
      }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  // When clicking Approve, open the Assign modal without updating DB status beforehand
  const handleApprove = (request) => {
    setAssignTarget(request);
  };

  const handleEdit = (request) => {
    setAssignTarget(request);
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading dashboard…</div>;

  const pending    = requests.filter(r => r.status === 'pending');
  const inProgress = requests.filter(r => r.status === 'in_progress');

  const STAT_CARDS = [
    { label: 'Pending Review',  value: stats?.pending    ?? 0, icon: Clock,      color: '#f59e0b', rgb: '245,158,11',  alert: stats?.pending > 0 },
    { label: 'Active Trips',    value: stats?.inProgress ?? 0, icon: Activity,   color: '#14b8a6', rgb: '20,184,166' },
    { label: 'Available',       value: stats?.available  ?? 0, icon: Car,        color: '#22c55e', rgb: '34,197,94' },
    { label: 'In Use',          value: stats?.inUse      ?? 0, icon: MapPin,     color: '#3b82f6', rgb: '59,130,246' },
    { label: 'Maintenance',     value: stats?.maintenance ?? 0, icon: Wrench,    color: '#f59e0b', rgb: '245,158,11' },
    { label: 'Completed Today', value: stats?.completed  ?? 0, icon: CheckCircle,color: '#8b5cf6', rgb: '139,92,246' },
  ];

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>City of Palayan — Fleet Management Overview</p>
      </div>

      {/* Stats */}
      <div className="request-analytics" style={{ marginBottom: '1.5rem' }}>
        {STAT_CARDS.map(s => (
          <div
            key={s.label}
            className="mini-stat-card"
            style={{ '--stat-color': s.color, '--stat-rgb': s.rgb }}
          >
            {s.alert && (
              <div style={{ position: 'absolute', top: '0.35rem', right: '0.35rem' }}>
                <AlertCircle size={12} color="#f59e0b" />
              </div>
            )}
            <div className="mini-stat-icon"><s.icon size={15} /></div>
            <div className="mini-stat-info">
              <div className="mini-stat-value">{s.value}</div>
              <div className="mini-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Pending Requests Column */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center justify-between" style={{ minHeight: 34, marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>🔔 Pending Requests ({pending.length})</h3>
            <Link to="/requests" className="btn btn-sm btn-secondary">All Requests</Link>
          </div>
          {pending.length === 0 ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-muted)', minHeight: 140 }}>
              <CheckCircle size={30} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No pending requests</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Requestor</th><th>Destination</th><th>Departure / Return</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pending.slice(0, 6).map(r => {
                    const dep = r.departure_time || r.requested_time;
                    const arr = r.arrival_time;
                    const duration = r.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{r.requestor?.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.requestor?.department}</div>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.destination}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{r.pax_count} pax</div>
                        </td>
                        <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600 }}>{r.requested_date}</div>
                          <div style={{ color: 'var(--accent-teal)', fontSize: '0.72rem' }}>Depart: {formatTime12(dep)}</div>
                          {arr && <div style={{ color: 'var(--gold-300)', fontSize: '0.72rem' }}>Return: {formatTime12(arr)}</div>}
                          {duration && <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>⏱️ {duration}</div>}
                        </td>
                        <td>
                          <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                            <button className="btn btn-sm btn-success" onClick={() => handleApprove(r)} title="Approve & Assign Vehicle">
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => setDenyTarget(r)} title="Deny">
                              <XCircle size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Active Trips & Fleet Status */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Active Trips Header */}
          <div className="flex items-center justify-between" style={{ minHeight: 34, marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>🚗 Active Trips ({inProgress.length})</h3>
            <Link to="/requests" className="btn btn-sm btn-secondary">All Trips</Link>
          </div>
          {inProgress.length === 0 ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-muted)', minHeight: 140 }}>
              <Car size={30} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No active trips</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {inProgress.map(r => {
                const dep = r.departure_time || r.requested_time;
                const arr = r.arrival_time;
                const duration = r.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

                return (
                  <div key={r.id} className="card" style={{ padding: '1rem' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.destination}</div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Driver: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{r.assignment?.driver_name || 'Unassigned'}</span>
                      {r.assignment?.vehicle_name && (
                        <span> · {r.assignment.vehicle_name} ({r.assignment.plate_no})</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span>👤 {r.requestor?.name}</span>
                      <span>·</span>
                      <span>📅 {r.requested_date}</span>
                      <span>·</span>
                      <span style={{ color: 'var(--accent-teal)' }}>Depart: {formatTime12(dep)}</span>
                      {arr && <span style={{ color: 'var(--gold-300)' }}>Return: {formatTime12(arr)}</span>}
                      {duration && <span style={{ color: 'var(--text-muted)' }}>({duration})</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Vehicle Status Summary */}
          <div style={{ marginTop: '1.5rem' }}>
            <div className="flex items-center justify-between" style={{ minHeight: 34, marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>Fleet Status</h3>
              <Link to="/vehicles" className="btn btn-sm btn-secondary">
                Manage All <ChevronRight size={13} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {vehicles.slice(0, 5).map(v => (
                <div key={v.id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.plate_no}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={v.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {assignTarget && (
        <AssignModal
          request={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => { setAssignTarget(null); loadData(); }}
        />
      )}
      {denyTarget && (
        <DenyModal
          request={denyTarget}
          onClose={() => setDenyTarget(null)}
          onDenied={() => { setDenyTarget(null); loadData(); }}
        />
      )}
    </div>
  );
}
