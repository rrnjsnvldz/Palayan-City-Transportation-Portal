import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { requestApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../../components/StatusBadge';
import AssignModal from '../../components/AssignModal';
import { formatTime12, calculateDuration } from '../../utils/timeFormat';
import { Search, CheckCircle, XCircle, ChevronDown, ChevronUp, X, Plus, Clock, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
function RequestRow({ r, isAdmin, onApprove, onEdit, onDeny }) {
  const [expanded, setExpanded] = useState(false);
  const dep = r.departure_time || r.requested_time;
  const arr = r.arrival_time;
  const duration = r.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

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
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.requested_date}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
            <span style={{ color: 'var(--accent-teal)' }} title="Departure from City Hall">🛫 {formatTime12(dep)}</span>
            {arr && (
              <span style={{ color: 'var(--gold-300)' }} title="Estimated Return to City Hall">🛬 {formatTime12(arr)}</span>
            )}
          </div>
          {duration && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              ⏱️ {duration}
            </div>
          )}
        </td>
        <td><StatusBadge status={r.status} /></td>
        <td onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {isAdmin && r.status === 'pending' && <>
              <button className="btn btn-sm btn-success" onClick={() => onApprove(r)} title="Approve & Assign Vehicle">
                <CheckCircle size={13} /> Approve
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => onDeny(r)} title="Deny">
                <XCircle size={13} />
              </button>
            </>}
            {isAdmin && r.status === 'approved' && (
              <button className="btn btn-sm btn-secondary" onClick={() => onEdit(r)} title="Edit Assigned Driver & Vehicle">
                <Edit2 size={13} /> Edit
              </button>
            )}
            <button className="btn btn-sm btn-secondary btn-icon" style={{ marginLeft: 2 }} onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={isAdmin ? 5 : 4} style={{ padding: 0, background: 'var(--navy-900)' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Departure (City Hall)</div>
                <strong style={{ color: 'var(--accent-teal)' }}>{formatTime12(dep)}</strong>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Return (City Hall)</div>
                <strong style={{ color: 'var(--gold-300)' }}>{arr ? formatTime12(arr) : '—'}</strong>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Trip Duration</div>
                <strong>{duration || '—'}</strong>
              </div>
              <div><div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Passengers</div><strong>{r.pax_count} pax</strong></div>
              <div><div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Department</div><strong>{r.department}</strong></div>
              {r.assignment && <>
                <div><div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Driver</div><strong>{r.assignment.driver_name}</strong></div>
                <div><div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Vehicle</div><strong>{r.assignment.vehicle_name} ({r.assignment.plate_no})</strong></div>
              </>}
              {r.denial_reason && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Denied Reason:</span> {r.denial_reason}</div>}
              {r.notes && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Notes:</span> {r.notes}</div>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Mobile Card ───────────────────────────────────────────────
function RequestMobileCard({ r, isAdmin, onApprove, onEdit, onDeny }) {
  const [expanded, setExpanded] = useState(false);
  const dep = r.departure_time || r.requested_time;
  const arr = r.arrival_time;
  const duration = r.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

  return (
    <div className="mobile-card">
      <div className="mobile-card-header">
        <div>
          <div className="mobile-card-title">{r.destination}</div>
          <div className="mobile-card-sub">{r.purpose} · {r.department}</div>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <div className="mobile-card-meta" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isAdmin && <span>👤 {r.requestor?.name}</span>}
          <span>📅 {r.requested_date}</span>
          <span>👥 {r.pax_count} pax</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', background: 'var(--surface-2)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', width: '100%' }}>
          <Clock size={12} color="var(--gold-400)" />
          <span style={{ color: 'var(--accent-teal)' }}>Depart: {formatTime12(dep)}</span>
          {arr && (
            <>
              <span>→</span>
              <span style={{ color: 'var(--gold-300)' }}>Return: {formatTime12(arr)}</span>
            </>
          )}
          {duration && <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>⏱️ {duration}</span>}
        </div>
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
          <button className="btn btn-sm btn-success" onClick={() => onApprove(r)}>
            <CheckCircle size={13} /> Approve
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => onDeny(r)}>
            <XCircle size={13} /> Deny
          </button>
        </>}
        {isAdmin && r.status === 'approved' && (
          <button className="btn btn-sm btn-secondary" onClick={() => onEdit(r)}>
            <Edit2 size={13} /> Edit Assignment
          </button>
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

  // When approving or editing, open the Assign modal
  const handleApprove = (request) => {
    setAssignTarget(request);
  };

  const handleEdit = (request) => {
    setAssignTarget(request);
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
                  <th>Departure / Return</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <RequestRow key={r.id} r={r} isAdmin={isAdmin} onApprove={handleApprove} onEdit={handleEdit} onDeny={setDenyTarget} />
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="mobile-card-list">
            {filtered.map(r => (
              <RequestMobileCard key={r.id} r={r} isAdmin={isAdmin} onApprove={handleApprove} onEdit={handleEdit} onDeny={setDenyTarget} />
            ))}
          </div>
        </>
      )}

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
