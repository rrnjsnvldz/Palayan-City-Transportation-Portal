import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { requestApi, assignmentApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../../components/StatusBadge';
import { formatTime12, calculateDuration } from '../../utils/timeFormat';
import { Truck, CheckCircle, MapPin, Navigation, StopCircle, Users, AlertCircle, Calendar, Clock, ArrowRight } from 'lucide-react';

function ActiveTripCard({ trip, onStart, onEnd, starting, ending }) {
  const assignment = trip.assignment;
  const dep = trip.departure_time || trip.requested_time;
  const arr = trip.arrival_time;
  const duration = trip.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

  return (
    <div className="card slide-up" style={{ border: '1px solid rgba(20,184,166,0.3)', background: 'rgba(20,184,166,0.05)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Truck size={20} color="#14b8a6" />
          <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: '1rem' }}>Active Driver Assignment</span>
        </div>
        <StatusBadge status={trip.status} />
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
          { icon: Users,       label: 'Passengers',     value: `${trip.pax_count} pax` },
          { icon: Truck,       label: 'Vehicle',        value: `${assignment?.vehicle_name || '—'} (${assignment?.plate_no || '—'})` },
          { icon: AlertCircle, label: 'Purpose',        value: trip.purpose },
          { icon: Calendar,    label: 'Duration',       value: duration || 'Same day' },
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
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          📝 {trip.notes}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {trip.status === 'approved' && (
          <button
            id={`start-trip-${trip.id}`}
            className={`btn btn-success btn-lg${starting ? ' btn-loading' : ''}`}
            style={{ flex: 1 }}
            onClick={() => onStart(assignment?.id)}
            disabled={starting}
          >
            {!starting && <><Navigation size={18} /> Start Trip</>}
          </button>
        )}
        {trip.status === 'in_progress' && (
          <button
            id={`end-trip-${trip.id}`}
            className={`btn btn-danger btn-lg${ending ? ' btn-loading' : ''}`}
            style={{ flex: 1 }}
            onClick={() => onEnd(assignment?.id)}
            disabled={ending}
          >
            {!ending && <><StopCircle size={18} /> End Trip</>}
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
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const { toast } = useToast();

  const loadData = () => {
    Promise.all([requestApi.stats(), assignmentApi.list()])
      .then(([s, a]) => {
        setStats(s.data);
        setAssignments(a.data);
      }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleStart = async (assignmentId) => {
    setStarting(true);
    try {
      await assignmentApi.startTrip(assignmentId);
      toast({ type: 'success', title: 'Trip Started!', message: 'Safe driving! Trip is now in progress.' });
      loadData();
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to start trip' });
    } finally { setStarting(false); }
  };

  const handleEnd = async (assignmentId) => {
    setEnding(true);
    try {
      await assignmentApi.endTrip(assignmentId, {});
      toast({ type: 'success', title: 'Trip Completed!', message: 'Trip has been marked as completed.' });
      loadData();
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to end trip' });
    } finally { setEnding(false); }
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
      fuel_level: activeAssignment.fuel_level,
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
        <p>Welcome back, {user?.name}! Check your departure schedule and assignments below.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} className="stat-card" style={{ '--stat-color': s.color, '--stat-rgb': s.rgb }}>
            <div className="stat-icon"><s.icon size={22} /></div>
            <div className="stat-value" style={{ fontSize: s.isText ? '1.25rem' : '2rem' }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active Assignment */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Current Assignment</h3>
        {enrichedActive ? (
          <ActiveTripCard
            trip={enrichedActive}
            onStart={handleStart}
            onEnd={handleEnd}
            starting={starting}
            ending={ending}
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
          <h3 style={{ marginBottom: '1rem' }}>Recent Trip History</h3>
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
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.purpose}</div>
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
    </div>
  );
}
