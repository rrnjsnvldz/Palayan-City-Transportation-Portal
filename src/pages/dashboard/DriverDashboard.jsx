import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { requestApi, assignmentApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import { formatTime12, calculateDuration } from '../../utils/timeFormat';
import {
  Truck, CheckCircle, MapPin, Navigation, StopCircle, Users,
  AlertCircle, Calendar, Clock, ArrowRight, CheckCircle2, ChevronRight
} from 'lucide-react';

function ActiveTripCard({
  trip,
  onStart,
  onArriveDestination,
  onDepartDestination,
  onEnd,
  loadingAction
}) {
  const assignment = trip.assignment;
  const dep = trip.departure_time || trip.requested_time;
  const arr = trip.arrival_time;
  const duration = trip.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

  // Determine current lifecycle stage:
  // 1: Ready to depart City Hall (status === 'approved')
  // 2: En route to destination (started_at && !arrived_at)
  // 3: Arrived at destination / picking up passengers (arrived_at && !departed_destination_at)
  // 4: Returning to City Hall (departed_destination_at && !ended_at)
  let currentStage = 1;
  if (trip.status === 'in_progress') {
    if (assignment?.departed_destination_at || assignment?.trip_stage === 'returning_to_city_hall') {
      currentStage = 4;
    } else if (assignment?.arrived_at || assignment?.trip_stage === 'arrived_at_destination') {
      currentStage = 3;
    } else {
      currentStage = 2;
    }
  }

  const STAGES = [
    { num: 1, label: '1. Depart City Hall', short: 'Depart City Hall', icon: Navigation },
    { num: 2, label: '2. Arrived at Destination', short: 'Arrived at Destination', icon: MapPin },
    { num: 3, label: '3. Return Trip to City Hall', short: 'Depart Destination', icon: ArrowRight },
    { num: 4, label: '4. End Transportation', short: 'End Transportation', icon: StopCircle },
  ];

  return (
    <div className="card slide-up" style={{ border: '1px solid rgba(20,184,166,0.3)', background: 'rgba(20,184,166,0.05)', padding: '1.25rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Truck size={20} color="#14b8a6" />
          <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: '1.05rem' }}>Active Driver Assignment</span>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      {/* 4-Step Trip Lifecycle Stepper */}
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.875rem 1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
          Trip Progress Lifecycle
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', position: 'relative' }}>
          {STAGES.map((s) => {
            const isDone = currentStage > s.num;
            const isCurrent = currentStage === s.num;
            return (
              <div
                key={s.num}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  background: isCurrent
                    ? 'rgba(201, 168, 76, 0.15)'
                    : isDone
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isCurrent
                    ? '1.5px solid var(--gold-400)'
                    : isDone
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.35rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: isDone ? 'var(--accent-green)' : isCurrent ? 'var(--gold-400)' : 'var(--surface-3)',
                  color: isDone || isCurrent ? '#070f1f' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  marginBottom: '0.35rem'
                }}>
                  {isDone ? <CheckCircle2 size={14} color="#070f1f" /> : s.num}
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: isCurrent ? 800 : 600,
                  color: isCurrent ? 'var(--gold-300)' : isDone ? 'var(--accent-green)' : 'var(--text-muted)',
                  lineHeight: 1.2
                }}>
                  {s.short}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prominent Schedule Banner for Driver */}
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.875rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Clock size={16} color="var(--gold-400)" />
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Trip Schedule & City Hall Timing
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span>📅 {trip.requested_date}</span>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span style={{ color: 'var(--accent-teal)' }}>Depart City Hall: {formatTime12(dep)}</span>
              {arr && (
                <>
                  <ArrowRight size={12} color="var(--text-muted)" />
                  <span style={{ color: 'var(--gold-300)' }}>Return City Hall: {formatTime12(arr)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {duration && (
          <div style={{
            background: 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 'var(--radius-full)',
            padding: '0.25rem 0.75rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--gold-300)',
          }}>
            ⏱️ Est. {duration}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { icon: MapPin,      label: 'Destination',    value: trip.destination },
          { icon: Users,       label: 'Passengers',     value: `${trip.pax_count} pax (${trip.department || 'City Hall'})` },
          { icon: Truck,       label: 'Vehicle',        value: `${assignment?.vehicle_name || '—'} (${assignment?.plate_no || '—'})` },
          { icon: AlertCircle, label: 'Purpose',        value: trip.purpose },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
            <div className="flex items-center gap-1" style={{ marginBottom: '0.25rem' }}>
              <item.icon size={13} color="var(--text-muted)" />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{item.label}</span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {trip.notes && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          📝 <strong>Notes:</strong> {trip.notes}
        </div>
      )}

      {/* Stage Actions Flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Stage 1 Button: Start Travel / Depart City Hall */}
        {currentStage === 1 && (
          <button
            id={`start-trip-${trip.id}`}
            className={`btn btn-success btn-lg${loadingAction ? ' btn-loading' : ''}`}
            onClick={() => onStart(assignment?.id, trip.destination)}
            disabled={loadingAction}
            style={{ width: '100%' }}
          >
            {!loadingAction && <><Navigation size={18} /> Start Travel (Depart City Hall) 🛫</>}
          </button>
        )}

        {/* Stage 2 Button: Arrived at Destination */}
        {currentStage === 2 && (
          <button
            id={`arrive-dest-${trip.id}`}
            className={`btn btn-primary btn-lg${loadingAction ? ' btn-loading' : ''}`}
            onClick={() => onArriveDestination(assignment?.id, trip.destination)}
            disabled={loadingAction}
            style={{ width: '100%', background: 'var(--accent-teal)', borderColor: 'var(--accent-teal)' }}
          >
            {!loadingAction && <><MapPin size={18} /> Arrived at Destination (Pick Up Passengers) 📍</>}
          </button>
        )}

        {/* Stage 3 Button: Depart Destination / Return Trip */}
        {currentStage === 3 && (
          <button
            id={`depart-dest-${trip.id}`}
            className={`btn btn-primary btn-lg${loadingAction ? ' btn-loading' : ''}`}
            onClick={() => onDepartDestination(assignment?.id, trip.destination)}
            disabled={loadingAction}
            style={{ width: '100%', background: '#d97706', borderColor: '#d97706' }}
          >
            {!loadingAction && <><ArrowRight size={18} /> Depart Destination (Heading Back to City Hall) 🛬</>}
          </button>
        )}

        {/* Stage 4 Button: End Transportation */}
        {currentStage === 4 && (
          <button
            id={`end-trip-${trip.id}`}
            className={`btn btn-danger btn-lg${loadingAction ? ' btn-loading' : ''}`}
            onClick={() => onEnd(assignment?.id, trip.destination)}
            disabled={loadingAction}
            style={{ width: '100%' }}
          >
            {!loadingAction && <><StopCircle size={18} /> End Transportation (Arrived at City Hall) 🏁</>}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const { toast } = useToast();

  const loadData = () => {
    Promise.all([requestApi.stats(), assignmentApi.list()])
      .then(([s, a]) => {
        setStats(s.data);
        setAssignments(a.data);
      }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  // Stage 1: Depart City Hall / Start Travel
  const handleStartPrompt = (assignmentId, destination) => {
    setConfirmDialog({
      title: 'Start Travel',
      message: `Depart Palayan City Hall and begin travel to "${destination}"?`,
      confirmText: 'Yes, Start Travel',
      type: 'success',
      action: async () => {
        setLoadingAction(true);
        try {
          await assignmentApi.startTrip(assignmentId);
          toast({ type: 'success', title: 'Trip Started 🛫', message: `En route to ${destination}. Drive safely!` });
          loadData();
        } catch (err) {
          toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to start trip' });
        } finally {
          setLoadingAction(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // Stage 2: Arrived at Destination
  const handleArrivePrompt = (assignmentId, destination) => {
    setConfirmDialog({
      title: 'Arrived at Destination',
      message: `Confirm that you have arrived at "${destination}" and are ready for passenger pickup/official business?`,
      confirmText: 'Yes, Arrived at Destination',
      type: 'info',
      action: async () => {
        setLoadingAction(true);
        try {
          await assignmentApi.arriveDestination(assignmentId);
          toast({ type: 'success', title: 'Arrival Recorded 📍', message: `Arrived at ${destination}. Passengers and admin notified.` });
          loadData();
        } catch (err) {
          toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to record arrival' });
        } finally {
          setLoadingAction(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // Stage 3: Depart Destination / Return Trip
  const handleDepartPrompt = (assignmentId, destination) => {
    setConfirmDialog({
      title: 'Depart for City Hall',
      message: `Depart "${destination}" with passengers and start return journey back to Palayan City Hall?`,
      confirmText: 'Yes, Depart Destination',
      type: 'warning',
      action: async () => {
        setLoadingAction(true);
        try {
          await assignmentApi.departDestination(assignmentId);
          toast({ type: 'success', title: 'Return Trip Started 🛬', message: `En route back to Palayan City Hall.` });
          loadData();
        } catch (err) {
          toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to record departure' });
        } finally {
          setLoadingAction(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // Stage 4: End Transportation
  const handleEndPrompt = (assignmentId, destination) => {
    setConfirmDialog({
      title: 'End Transportation',
      message: `Confirm return to Palayan City Hall and mark this transport assignment as complete?`,
      confirmText: 'Yes, End Transportation',
      type: 'danger',
      action: async () => {
        setLoadingAction(true);
        try {
          await assignmentApi.endTrip(assignmentId, {});
          toast({ type: 'success', title: 'Trip Completed 🏁', message: 'Transportation safely finished. Vehicle is now available.' });
          loadData();
        } catch (err) {
          toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to complete trip' });
        } finally {
          setLoadingAction(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;

  const activeAssignment = assignments.find(a =>
    a.request_status === 'in_progress' || a.request_status === 'approved'
  );

  // Convert assignments to request-like objects for display
  const enrichedActive = activeAssignment ? {
    id: activeAssignment.request_id,
    destination: activeAssignment.destination,
    purpose: activeAssignment.purpose,
    department: activeAssignment.department,
    requested_date: activeAssignment.requested_date,
    requested_time: activeAssignment.requested_time,
    departure_time: activeAssignment.departure_time || activeAssignment.requested_time,
    arrival_time: activeAssignment.arrival_time,
    trip_duration: activeAssignment.trip_duration,
    pax_count: activeAssignment.pax_count,
    notes: activeAssignment.notes,
    status: activeAssignment.request_status,
    assignment: {
      id: activeAssignment.id,
      vehicle_name: activeAssignment.vehicle_name,
      plate_no: activeAssignment.plate_no,
      vehicle_type: activeAssignment.vehicle_type,
      capacity: activeAssignment.capacity,
      started_at: activeAssignment.started_at,
      arrived_at: activeAssignment.arrived_at,
      departed_destination_at: activeAssignment.departed_destination_at,
      ended_at: activeAssignment.ended_at,
      trip_stage: activeAssignment.trip_stage,
    }
  } : null;

  const pastTrips = assignments.filter(a =>
    a.request_status === 'completed' || a.request_status === 'cancelled'
  );

  const STAT_CARDS = [
    { label: "Today's Trips",  value: stats?.todayTrips ?? 0, icon: Calendar,     color: '#3b82f6', rgb: '59,130,246' },
    { label: 'Total Completed', value: stats?.totalTrips ?? 0, icon: CheckCircle, color: '#22c55e', rgb: '34,197,94' },
    { label: 'Active Status',   value: enrichedActive ? 'On Trip' : 'Available', icon: Truck, color: enrichedActive ? '#14b8a6' : '#22c55e', rgb: enrichedActive ? '20,184,166' : '34,197,94', isText: true },
  ];

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1>Driver Dashboard</h1>
        <p>Welcome back, {user?.name}! Manage your 4-stage transport lifecycle and trip manifest below.</p>
      </div>

      {/* Stats */}
      <div className="request-analytics analytics-grid-3" style={{ marginBottom: '1.5rem' }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} className="mini-stat-card" style={{ '--stat-color': s.color, '--stat-rgb': s.rgb }}>
            <div className="mini-stat-icon"><s.icon size={15} /></div>
            <div className="mini-stat-info">
              <div className="mini-stat-value" style={{ fontSize: s.isText ? '0.95rem' : '1.15rem' }}>{s.value}</div>
              <div className="mini-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Assignment */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Current Assigned Transport</h3>
        {enrichedActive ? (
          <ActiveTripCard
            trip={enrichedActive}
            onStart={handleStartPrompt}
            onArriveDestination={handleArrivePrompt}
            onDepartDestination={handleDepartPrompt}
            onEnd={handleEndPrompt}
            loadingAction={loadingAction}
          />
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <CheckCircle size={40} color="#22c55e" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ color: 'var(--text-secondary)' }}>No Active Assignment</h3>
            <p>You have no active or upcoming trips. Check with your admin for assignments.</p>
          </div>
        )}
      </div>

      {/* Trip History */}
      {pastTrips.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Recent Completed Trips</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Vehicle</th>
                  <th>Departure / Return</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pastTrips.slice(0, 10).map(a => {
                  const dep = a.departure_time || a.requested_time;
                  const arr = a.arrival_time;
                  const duration = a.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{a.destination}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.purpose} ({a.department || 'City Hall'})</div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{a.vehicle_name} <span style={{ color: 'var(--text-muted)' }}>({a.plate_no})</span></td>
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        <div>{a.requested_date}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                          {formatTime12(dep)} {arr ? `→ ${formatTime12(arr)}` : ''} {duration ? `(${duration})` : ''}
                        </div>
                      </td>
                      <td><StatusBadge status={a.request_status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText="Cancel"
          type={confirmDialog.type}
          loading={loadingAction}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.action}
        />
      )}
    </div>
  );
}
