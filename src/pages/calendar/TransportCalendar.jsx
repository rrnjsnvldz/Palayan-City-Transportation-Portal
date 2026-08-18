import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { requestApi } from '../../services/api';
import { formatTime12, calculateDuration } from '../../utils/timeFormat';
import StatusBadge from '../../components/StatusBadge';
import AssignModal from '../../components/AssignModal';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
  Users, Car, Building2, Search, ArrowRight,
  Edit2, CheckCircle, AlertTriangle, ChevronDown
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export default function TransportCalendar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const detailRef = useRef(null);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    const today = new Date();
    return formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [assignTarget, setAssignTarget] = useState(null);

  const loadData = () => {
    requestApi.list()
      .then(res => setRequests(res.data || []))
      .catch(err => console.error('Failed to fetch requests', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Navigation handlers
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateKey(formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  // Distinct departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    requests.forEach(r => {
      if (r.department) set.add(r.department);
      if (r.requestor?.department) set.add(r.requestor.department);
    });
    return [...set].sort();
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchDept = deptFilter === 'all' || (r.department === deptFilter || r.requestor?.department === deptFilter);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchSearch = !search || [
        r.destination,
        r.purpose,
        r.department,
        r.requestor?.name,
        r.requestor?.department,
        r.assignment?.driver_name,
        r.assignment?.vehicle_name,
        r.assignment?.plate_no
      ].some(val => val?.toLowerCase().includes(search.toLowerCase()));

      return matchDept && matchStatus && matchSearch;
    });
  }, [requests, deptFilter, statusFilter, search]);

  // Group requests by date key (YYYY-MM-DD)
  const requestsByDate = useMemo(() => {
    const map = {};
    filteredRequests.forEach(r => {
      if (!r.requested_date) return;
      if (!map[r.requested_date]) map[r.requested_date] = [];
      map[r.requested_date].push(r);
    });

    // Sort trips by departure time
    Object.keys(map).forEach(date => {
      map[date].sort((a, b) => {
        const timeA = a.departure_time || a.requested_time || '00:00';
        const timeB = b.departure_time || b.requested_time || '00:00';
        return timeA.localeCompare(timeB);
      });
    });

    return map;
  }, [filteredRequests]);

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateKey = formatDateKey(prevYear, prevMonthIdx, day);
      days.push({
        day,
        dateKey,
        isCurrentMonth: false,
        isPrevMonth: true,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateKey = formatDateKey(currentYear, currentMonth, day);
      days.push({
        day,
        dateKey,
        isCurrentMonth: true,
      });
    }

    // Next month padding days to complete 35 or 42 cells
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateKey = formatDateKey(nextYear, nextMonthIdx, day);
      days.push({
        day,
        dateKey,
        isCurrentMonth: false,
        isNextMonth: true,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const todayKey = useMemo(() => {
    const t = new Date();
    return formatDateKey(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const selectedDateTrips = requestsByDate[selectedDateKey] || [];

  const handleSelectDate = (dateKey) => {
    setSelectedDateKey(dateKey);
  };

  // Month total count
  const monthTripsCount = useMemo(() => {
    return filteredRequests.filter(r => {
      if (!r.requested_date) return false;
      const parts = r.requested_date.split('-');
      return parseInt(parts[0], 10) === currentYear && parseInt(parts[1], 10) - 1 === currentMonth;
    }).length;
  }, [filteredRequests, currentYear, currentMonth]);

  return (
    <div className="page-content fade-in">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Transport Schedule Calendar</h1>
          <p>City of Palayan — Monthly Fleet Schedule, Driver Assignments & Travel Manifest</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('grid')}
          >
            <CalendarIcon size={14} /> Month Grid
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            Schedule List
          </button>
        </div>
      </div>

      {/* Calendar Controls & Filters Bar */}
      <div className="card" style={{ padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Month Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-sm btn-secondary btn-icon" onClick={prevMonth} title="Previous Month">
              <ChevronLeft size={16} />
            </button>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.1rem', minWidth: 170, textAlign: 'center', color: 'var(--text-primary)' }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>
            <button className="btn btn-sm btn-secondary btn-icon" onClick={nextMonth} title="Next Month">
              <ChevronRight size={16} />
            </button>
            <button className="btn btn-sm btn-secondary" onClick={goToToday} style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>
              Today
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              ({monthTripsCount} trip{monthTripsCount !== 1 ? 's' : ''} in {MONTH_NAMES[currentMonth]})
            </span>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: 160 }}>
              <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search trip, driver, car…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '1.85rem', height: 32, fontSize: '0.75rem' }}
              />
            </div>

            {/* Department Filter */}
            <select
              className="form-control"
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              style={{ height: 32, fontSize: '0.75rem', minWidth: 140 }}
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="form-control"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ height: 32, fontSize: '0.75rem', minWidth: 120 }}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Loading transport schedule…
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Full-Width Month Calendar Grid */}
          <div className="card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
            {/* Day Header Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px', textAlign: 'center', marginBottom: '0.625rem' }}>
              {DAY_NAMES.map((d, i) => (
                <div
                  key={d}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: i === 0 || i === 6 ? 'var(--gold-400)' : 'var(--text-muted)',
                    padding: '0.25rem 0',
                    letterSpacing: '0.05em'
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days 7-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' }}>
              {calendarDays.map(cell => {
                const isSelected = cell.dateKey === selectedDateKey;
                const isToday = cell.dateKey === todayKey;
                const trips = requestsByDate[cell.dateKey] || [];
                const hasTrips = trips.length > 0;

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => handleSelectDate(cell.dateKey)}
                    style={{
                      minHeight: 90,
                      background: isSelected
                        ? 'rgba(201, 168, 76, 0.12)'
                        : cell.isCurrentMonth
                        ? 'var(--surface-2)'
                        : 'rgba(7, 15, 31, 0.4)',
                      border: isSelected
                        ? '2px solid var(--gold-400)'
                        : isToday
                        ? '1.5px solid var(--accent-teal)'
                        : '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.4rem 0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.15s ease',
                      opacity: cell.isCurrentMonth ? 1 : 0.4,
                      boxShadow: isSelected ? '0 0 12px rgba(201, 168, 76, 0.25)' : undefined
                    }}
                  >
                    {/* Date Number + Total Trips Count */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: isToday || isSelected ? 800 : 600,
                        color: isToday ? 'var(--accent-teal)' : isSelected ? 'var(--gold-300)' : 'var(--text-primary)',
                        borderRadius: '50%',
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isToday ? 'rgba(20, 184, 166, 0.2)' : 'transparent'
                      }}>
                        {cell.day}
                      </span>
                      {hasTrips && (
                        <span style={{
                          background: 'var(--gold-500)',
                          color: '#070f1f',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          borderRadius: '99px',
                          padding: '0.1rem 0.45rem',
                          lineHeight: 1
                        }}>
                          {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}
                        </span>
                      )}
                    </div>

                    {/* Trip Preview Chips in Date Cell */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                      {trips.slice(0, 2).map(r => {
                        const isApproved = ['approved', 'in_progress'].includes(r.status);
                        const dep = r.departure_time || r.requested_time;
                        return (
                          <div
                            key={r.id}
                            style={{
                              fontSize: '0.66rem',
                              padding: '2px 4px',
                              borderRadius: '3px',
                              background: isApproved ? 'rgba(59, 130, 246, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                              color: isApproved ? '#93c5fd' : '#fcd34d',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: 600,
                              lineHeight: 1.2
                            }}
                            title={`${formatTime12(dep)} - ${r.destination} (${r.department || r.requestor?.department}) · Driver: ${r.assignment?.driver_name || 'Unassigned'} · Car: ${r.assignment?.vehicle_name || 'Unassigned'}`}
                          >
                            <span style={{ opacity: 0.85, marginRight: 2 }}>{formatTime12(dep)}</span> {r.destination}
                          </div>
                        );
                      })}
                      {trips.length > 2 && (
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: 2 }}>
                          +{trips.length - 2} more trips
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Details Section */}
          <div ref={detailRef} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.875rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Trip Schedule & Travel Manifest
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold-400)', fontFamily: 'Montserrat', marginTop: 2 }}>
                  📅 {selectedDateKey}
                </div>
              </div>
              <span style={{
                background: selectedDateTrips.length > 0 ? 'rgba(20, 184, 166, 0.15)' : 'var(--surface-3)',
                color: selectedDateTrips.length > 0 ? 'var(--accent-teal)' : 'var(--text-muted)',
                padding: '0.3rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                fontSize: '0.82rem'
              }}>
                {selectedDateTrips.length} Scheduled Trip{selectedDateTrips.length !== 1 ? 's' : ''}
              </span>
            </div>

            {selectedDateTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <CalendarIcon size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>No trips scheduled for {selectedDateKey}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Click any date in the calendar above with scheduled trip badges to view details.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                {selectedDateTrips.map(trip => {
                  const dep = trip.departure_time || trip.requested_time;
                  const arr = trip.arrival_time;
                  const duration = trip.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');
                  const dept = trip.department || trip.requestor?.department || 'City Hall';

                  return (
                    <div
                      key={trip.id}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Destination & Status */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {trip.destination}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {trip.purpose}
                          </div>
                        </div>
                        <StatusBadge status={trip.status} />
                      </div>

                      {/* Timing & Duration Banner */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.78rem',
                        background: 'var(--surface-3)',
                        padding: '0.35rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        flexWrap: 'wrap'
                      }}>
                        <Clock size={13} color="var(--gold-400)" />
                        <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>Depart: {formatTime12(dep)}</span>
                        {arr && (
                          <>
                            <ArrowRight size={11} color="var(--text-muted)" />
                            <span style={{ color: 'var(--gold-300)', fontWeight: 600 }}>Return: {formatTime12(arr)}</span>
                          </>
                        )}
                        {duration && (
                          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600 }}>
                            ⏱️ {duration}
                          </span>
                        )}
                      </div>

                      {/* Department & Passengers info */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                          <Building2 size={13} color="var(--text-muted)" />
                          <span><strong>Dept:</strong> {dept}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                          <Users size={13} color="var(--text-muted)" />
                          <span><strong>Pax:</strong> {trip.pax_count} passenger{trip.pax_count !== 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ gridColumn: '1 / -1', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                          👤 Requestor: <strong style={{ color: 'var(--text-primary)' }}>{trip.requestor?.name || '—'}</strong> ({trip.requestor?.email})
                        </div>
                      </div>

                      {/* Assigned Driver & Car Card */}
                      <div style={{
                        background: trip.assignment ? 'rgba(59, 130, 246, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                        border: `1px solid ${trip.assignment ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.625rem 0.75rem',
                        fontSize: '0.78rem',
                        marginTop: 'auto'
                      }}>
                        {trip.assignment ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>
                                Assigned Fleet & Driver
                              </span>
                              {isAdmin && (
                                <button
                                  className="btn btn-sm btn-secondary"
                                  style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem', height: 'auto' }}
                                  onClick={() => setAssignTarget(trip)}
                                >
                                  <Edit2 size={11} /> Edit
                                </button>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                              <Car size={14} color="var(--accent-teal)" />
                              <span>{trip.assignment.vehicle_name} ({trip.assignment.plate_no}) · {trip.assignment.capacity} Seats</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                              👤 <span>Driver: {trip.assignment.driver_name}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <AlertTriangle size={14} /> Unassigned Driver & Car
                            </span>
                            {isAdmin && (
                              <button
                                className="btn btn-sm btn-success"
                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', height: 'auto' }}
                                onClick={() => setAssignTarget(trip)}
                              >
                                <CheckCircle size={12} /> Assign
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Schedule List View */
        <div className="card" style={{ padding: '1rem' }}>
          {filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No scheduled trips found matching your filters.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Destination & Purpose</th>
                    <th>Department & Requestor</th>
                    <th>Passengers</th>
                    <th>Assigned Driver</th>
                    <th>Assigned Vehicle</th>
                    <th>Status</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(r => {
                    const dep = r.departure_time || r.requested_time;
                    const arr = r.arrival_time;
                    const duration = r.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

                    return (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--gold-400)' }}>📅 {r.requested_date}</div>
                          <div style={{ color: 'var(--accent-teal)', marginTop: 2 }}>🛫 {formatTime12(dep)}</div>
                          {arr && <div style={{ color: 'var(--gold-300)' }}>🛬 {formatTime12(arr)}</div>}
                          {duration && <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>⏱️ {duration}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{r.destination}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.purpose}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{r.department || r.requestor?.department}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>👤 {r.requestor?.name}</div>
                        </td>
                        <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          👥 {r.pax_count} pax
                        </td>
                        <td>
                          {r.assignment ? (
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.assignment.driver_name}</span>
                          ) : (
                            <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          {r.assignment ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{r.assignment.vehicle_name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.assignment.plate_no} · {r.assignment.capacity} seats</div>
                            </div>
                          ) : (
                            <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        {isAdmin && (
                          <td>
                            {r.status === 'pending' ? (
                              <button className="btn btn-sm btn-success" onClick={() => setAssignTarget(r)}>
                                Approve & Assign
                              </button>
                            ) : (
                              <button className="btn btn-sm btn-secondary" onClick={() => setAssignTarget(r)}>
                                <Edit2 size={12} /> Edit
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {assignTarget && (
        <AssignModal
          request={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => { setAssignTarget(null); loadData(); }}
        />
      )}
    </div>
  );
}
