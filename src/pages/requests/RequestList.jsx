import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { requestApi, assignmentApi, authApi, vehicleApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../../components/StatusBadge';
import { Search, CheckCircle, XCircle, UserCheck, ChevronDown, ChevronUp, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Assign Modal ──────────────────────────────────────────────
function AssignModal({ request, onClose, onAssigned }) {
  const [drivers,   setDrivers]   = useState([]);
  const [vehicles,  setVehicles]  = useState([]);
  const [driverId,  setDriverId]  = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [loading,   setLoading]   = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    authApi.getUsers().then(r => setDrivers(r.data.filter(u => u.role === 'driver')));
    vehicleApi.list().then(r => setVehicles(r.data.filter(v => v.status === 'available')));
  }, []);

  const handleAssign = async () => {
    if (!driverId || !vehicleId) { toast({ type: 'warning', title: 'Select both driver and vehicle' }); return; }
    setLoading(true);
    try {
      await assignmentApi.create({ request_id: request.id, driver_id: parseInt(driverId), vehicle_id: parseInt(vehicleId) });
      toast({ type: 'success', title: 'Driver & Vehicle Assigned!' });
      onAssigned();
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error });
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Assign Driver & Vehicle</h3>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <strong>{request.destination}</strong><br />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{request.requested_date} {request.requested_time} · {request.pax_count} pax</span>
          </div>
          <div className="form-group">
            <label className="form-label">Driver</label>
            <select className="form-control" value={driverId} onChange={e => setDriverId(e.target.value)}>
              <option value="">-- Select driver --</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Vehicle</label>
            <select className="form-control" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
              <option value="">-- Select vehicle --</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate_no}) · {v.capacity} seats · {v.fuel_level?.toFixed(0)}% fuel</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className={`btn btn-primary${loading ? ' btn-loading' : ''}`} onClick={handleAssign} disabled={loading} id="confirm-assign">
            {!loading && <><UserCheck size={16} /> Assign</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Deny Modal ────────────────────────────────────────────────
function DenyModal({ request, onClose, onDenied }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const handleDeny = async () => {
    setLoading(true);
    try { await requestApi.deny(request.id, reason); toast({ type: 'success', title: 'Request Denied' }); onDenied(); }
    catch (err) { toast({ type: 'error', title: 'Error', message: err.response?.data?.error }); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Deny Request</h3>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
            Reason for denying <strong>{request.destination}</strong>:
          </p>
          <textarea className="form-control" rows={3} placeholder="Enter reason..." value={reason} onChange={e => setReason(e.target.value)} />
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

// ── Request Row (desktop table) ───────────────────────────────
function RequestRow({ r, isAdmin, onApprove, onDeny, onAssign }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <td>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{r.destination}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.purpose}</div>
        </td>
        {isAdmin && (
          <td>
            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{r.requestor?.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.requestor?.department}</div>
          </td>
        )}
        <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
          {r.requested_date}<br /><span style={{ color: 'var(--text-muted)' }}>{r.requested_time}</span>
        </td>
        <td><StatusBadge status={r.status} /></td>
        <td onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {isAdmin && r.status === 'pending' && <>
              <button className="btn btn-sm btn-success" onClick={() => onApprove(r.id)} title="Approve"><CheckCircle size={13} /></button>
              <button className="btn btn-sm btn-secondary" onClick={() => onAssign(r)} title="Assign"><UserCheck size={13} /></button>
              <button className="btn btn-sm btn-danger" onClick={() => onDeny(r)} title="Deny"><XCircle size={13} /></button>
            </>}
            {isAdmin && r.status === 'approved' && !r.assignment && (
              <button className="btn btn-sm btn-secondary" onClick={() => onAssign(r)}>
                <UserCheck size={13} /> Assign
              </button>
            )}
            <button className="btn btn-sm btn-secondary btn-icon" style={{ marginLeft: 2 }}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={isAdmin ? 5 : 4} style={{ padding: 0, background: 'var(--navy-900)' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '0.625rem', fontSize: '0.78rem' }}>
              <div><div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Passengers</div><strong>{r.pax_count}</strong></div>
              <div><div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Department</div><strong>{r.department}</strong></div>
              {r.assignment && <>
                <div><div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Driver</div><strong>{r.assignment.driver_name}</strong></div>
                <div><div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Vehicle</div><strong>{r.assignment.vehicle_name} ({r.assignment.plate_no})</strong></div>
              </>}
              {r.denial_reason && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--accent-red)' }}>Denied:</span> {r.denial_reason}</div>}
              {r.notes && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)' }}>Notes:</span> {r.notes}</div>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Mobile Card ───────────────────────────────────────────────
function RequestMobileCard({ r, isAdmin, onApprove, onDeny, onAssign }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mobile-card">
      <div className="mobile-card-header">
        <div>
          <div className="mobile-card-title">{r.destination}</div>
          <div className="mobile-card-sub">{r.purpose} · {r.department}</div>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <div className="mobile-card-meta">
        {isAdmin && <span>👤 {r.requestor?.name}</span>}
        <span>📅 {r.requested_date} {r.requested_time}</span>
        <span>👥 {r.pax_count} pax</span>
      </div>
      {expanded && (
        <div style={{ marginTop: '0.625rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {r.assignment && <>
            <div><strong style={{ color: 'var(--text-muted)' }}>Driver:</strong> {r.assignment.driver_name}</div>
            <div><strong style={{ color: 'var(--text-muted)' }}>Vehicle:</strong> {r.assignment.vehicle_name} ({r.assignment.plate_no})</div>
          </>}
          {r.denial_reason && <div><strong style={{ color: 'var(--accent-red)' }}>Reason:</strong> {r.denial_reason}</div>}
          {r.notes && <div><strong style={{ color: 'var(--text-muted)' }}>Notes:</strong> {r.notes}</div>}
        </div>
      )}
      <div className="mobile-card-actions">
        {isAdmin && r.status === 'pending' && <>
          <button className="btn btn-sm btn-success" onClick={() => onApprove(r.id)}><CheckCircle size={13} /> Approve</button>
          <button className="btn btn-sm btn-secondary" onClick={() => onAssign(r)}><UserCheck size={13} /> Assign</button>
          <button className="btn btn-sm btn-danger" onClick={() => onDeny(r)}><XCircle size={13} /> Deny</button>
        </>}
        {isAdmin && r.status === 'approved' && !r.assignment && (
          <button className="btn btn-sm btn-secondary" onClick={() => onAssign(r)}><UserCheck size={13} /> Assign Vehicle</button>
        )}
        <button className="btn btn-sm btn-secondary" onClick={() => setExpanded(!expanded)} style={{ marginLeft: 'auto' }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
    </div>
  );
}

const STATUS_FILTERS = ['all','pending','approved','in_progress','completed','denied','cancelled'];

export default function RequestList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignTarget, setAssignTarget] = useState(null);
  const [denyTarget,   setDenyTarget]   = useState(null);
  const { toast } = useToast();

  const loadData = () => {
    requestApi.list().then(r => setRequests(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const handleApprove = async (id) => {
    try { await requestApi.approve(id); toast({ type: 'success', title: 'Approved!' }); loadData(); }
    catch (err) { toast({ type: 'error', title: 'Error', message: err.response?.data?.error }); }
  };

  const filtered = requests.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSearch = !search || [r.destination, r.purpose, r.requestor?.name, r.department]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div className="page-content fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>{isAdmin ? 'All Requests' : 'My Requests'}</h1>
          <p>{filtered.length} request{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/new-request')}>
            <Plus size={15} /> New Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.125rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input id="search-requests" type="text" className="form-control" placeholder="Search requests…"
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.1rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(s => (
            <button key={s} id={`filter-${s}`}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
              style={{ textTransform: 'capitalize', fontSize: '0.72rem' }}>
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-line w-75" style={{ height: 14 }} />
              <div className="skeleton skeleton-line w-50" style={{ height: 10 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No requests found</h3>
          <p>Try adjusting your filters</p>
          {!isAdmin && <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/new-request')}><Plus size={16} /> New Request</button>}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Destination</th>
                  {isAdmin && <th>Requestor</th>}
                  <th>Date / Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <RequestRow key={r.id} r={r} isAdmin={isAdmin} onApprove={handleApprove} onDeny={setDenyTarget} onAssign={setAssignTarget} />
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="mobile-card-list">
            {filtered.map(r => (
              <RequestMobileCard key={r.id} r={r} isAdmin={isAdmin} onApprove={handleApprove} onDeny={setDenyTarget} onAssign={setAssignTarget} />
            ))}
          </div>
        </>
      )}

      {assignTarget && <AssignModal request={assignTarget} onClose={() => setAssignTarget(null)} onAssigned={() => { setAssignTarget(null); loadData(); }} />}
      {denyTarget   && <DenyModal   request={denyTarget}   onClose={() => setDenyTarget(null)}   onDenied={() => { setDenyTarget(null); loadData(); }} />}
    </div>
  );
}
