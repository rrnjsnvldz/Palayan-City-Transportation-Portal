import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { requestApi, vehicleApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import VehicleCard from '../../components/VehicleCard';
import { formatTime12, calculateDuration } from '../../utils/timeFormat';
import { Car, FileText, Clock, CheckCircle, Plus, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RequestorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      requestApi.stats(),
      requestApi.list(),
      vehicleApi.list(),
    ]).then(([s, r, v]) => {
      setStats(s.data);
      setRequests(r.data.slice(0, 5));
      setVehicles(v.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading dashboard…</div>;

  const STAT_CARDS = [
    { label: 'Total Requests',  value: stats?.total    ?? 0, icon: FileText,    color: '#3b82f6', rgb: '59,130,246' },
    { label: 'Pending',         value: stats?.pending  ?? 0, icon: Clock,       color: '#f59e0b', rgb: '245,158,11' },
    { label: 'Approved',        value: stats?.approved ?? 0, icon: CheckCircle, color: '#14b8a6', rgb: '20,184,166' },
    { label: 'Available Cars',  value: stats?.available ?? 0, icon: Car,        color: '#22c55e', rgb: '34,197,94' },
  ];

  return (
    <div className="page-content fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Good morning, {user?.name?.split(' ')[0]}! 👋</h1>
          <p>{user?.department} · Requestor Portal</p>
        </div>
        <Link to="/new-request" className="btn btn-primary">
          <Plus size={16} /> New Request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} className="stat-card" style={{ '--stat-color': s.color, '--stat-rgb': s.rgb }}>
            <div className="stat-icon"><s.icon size={22} /></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ gap: '1.5rem' }}>
        {/* Recent Requests */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3>My Recent Requests</h3>
            <Link to="/my-requests" className="btn btn-sm btn-secondary">View All</Link>
          </div>
          <div className="table-container">
            {requests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No requests yet</h3>
                <p>Submit your first transport request</p>
                <Link to="/new-request" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  <Plus size={14} /> New Request
                </Link>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th>Departure / Return</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => {
                    const dep = r.departure_time || r.requested_time;
                    const arr = r.arrival_time;
                    const duration = r.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>{r.destination}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.purpose}</div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          <div style={{ fontWeight: 600 }}>{r.requested_date}</div>
                          <div style={{ color: 'var(--accent-teal)', fontSize: '0.72rem' }}>Depart: {formatTime12(dep)}</div>
                          {arr && <div style={{ color: 'var(--gold-300)', fontSize: '0.72rem' }}>Return: {formatTime12(arr)}</div>}
                          {duration && <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>⏱️ {duration}</div>}
                        </td>
                        <td><StatusBadge status={r.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Fleet Overview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3>Fleet Availability</h3>
            <Link to="/fleet-status" className="btn btn-sm btn-secondary">View All</Link>
          </div>
          <div className="grid grid-2" style={{ gap: '0.75rem' }}>
            {vehicles.slice(0, 4).map(v => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
          {vehicles.length > 4 && (
            <Link to="/fleet-status" className="btn btn-secondary btn-full mt-2" style={{ marginTop: '0.75rem' }}>
              View all {vehicles.length} vehicles
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
