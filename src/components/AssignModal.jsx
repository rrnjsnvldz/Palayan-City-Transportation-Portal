import { useState, useEffect, useMemo } from 'react';
import { authApi, vehicleApi, assignmentApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import { formatTime12, calculateDuration } from '../utils/timeFormat';
import { X, UserCheck, ArrowRight, AlertTriangle, Users, Car } from 'lucide-react';

function timeToMinutes(t) {
  if (!t) return 0;
  const parts = t.toString().split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function hasTimeOverlap(depA, arrA, depB, arrB) {
  const startA = timeToMinutes(depA || '08:00');
  const endA = arrA ? timeToMinutes(arrA) : startA + 240;
  const startB = timeToMinutes(depB || '08:00');
  const endB = arrB ? timeToMinutes(arrB) : startB + 240;

  return startA < endB && startB < endA;
}

export default function AssignModal({ request, onClose, onAssigned }) {
  const [rawDrivers, setRawDrivers] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [driverId, setDriverId] = useState(request.assignment?.driver_id?.toString() || '');
  const [vehicleId, setVehicleId] = useState(request.assignment?.vehicle_id?.toString() || '');
  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditing = request.status === 'approved' && !!request.assignment;
  const requiredPax = parseInt(request.pax_count, 10) || 1;

  const dep = request.departure_time || request.requested_time || '08:00';
  const arr = request.arrival_time;
  const duration = request.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

  useEffect(() => {
    setDataLoading(true);
    Promise.all([
      authApi.getUsers(),
      vehicleApi.list(),
      assignmentApi.list()
    ])
      .then(([usersRes, vehiclesRes, assignmentsRes]) => {
        setRawDrivers(usersRes.data.filter(u => u.role === 'driver'));
        setAllVehicles(vehiclesRes.data || []);
        setAllAssignments(assignmentsRes.data || []);
      })
      .catch(err => {
        console.error('Failed to load assignment options', err);
      })
      .finally(() => {
        setDataLoading(false);
      });
  }, []);

  // Process Drivers with date & time schedule overlap detection
  const processedDrivers = useMemo(() => {
    const currentDriverId = request.assignment?.driver_id;

    return rawDrivers.map(d => {
      const isCurrent = d.id === currentDriverId;

      // Find any conflicting active/approved assignment on the same date and overlapping time
      const conflict = allAssignments.find(a => {
        if (a.request_id === request.id) return false;
        if (a.driver_id !== d.id) return false;
        if (a.ended_at) return false;
        if (!['approved', 'in_progress'].includes(a.request_status)) return false;
        if (a.requested_date !== request.requested_date) return false;

        return hasTimeOverlap(dep, arr, a.departure_time || a.requested_time, a.arrival_time);
      });

      let disabledReason = '';
      let isEligible = true;

      if (conflict) {
        isEligible = false;
        const conflictDep = formatTime12(conflict.departure_time || conflict.requested_time);
        const conflictArr = conflict.arrival_time ? formatTime12(conflict.arrival_time) : 'end';
        disabledReason = `[Disabled: Assigned to "${conflict.destination}" (${conflictDep} - ${conflictArr})]`;
      }

      return {
        ...d,
        isCurrent,
        isEligible,
        disabledReason,
      };
    });
  }, [rawDrivers, allAssignments, request, dep, arr]);

  const availableDriversCount = useMemo(() => {
    return processedDrivers.filter(d => d.isEligible).length;
  }, [processedDrivers]);

  // Group all vehicles by seat capacity with capacity & schedule overlap detection
  const capacityGroups = useMemo(() => {
    const distinctCapacities = [...new Set(allVehicles.map(v => v.capacity))].sort((a, b) => a - b);
    const currentVehId = request.assignment?.vehicle_id;

    return distinctCapacities.map(cap => ({
      capacity: cap,
      label: `${cap}-Seater Vehicles (Max ${cap} Pax)`,
      vehicles: allVehicles
        .filter(v => v.capacity === cap)
        .map(v => {
          const isCurrent = v.id === currentVehId;
          const isAvailableStatus = v.status === 'available' || isCurrent;
          const hasCapacity = (v.capacity || 0) >= requiredPax;

          // Check if vehicle is already assigned to another overlapping trip on this date/time
          const conflict = allAssignments.find(a => {
            if (a.request_id === request.id) return false;
            if (a.vehicle_id !== v.id) return false;
            if (a.ended_at) return false;
            if (!['approved', 'in_progress'].includes(a.request_status)) return false;
            if (a.requested_date !== request.requested_date) return false;

            return hasTimeOverlap(dep, arr, a.departure_time || a.requested_time, a.arrival_time);
          });

          let disabledReason = '';
          let isEligible = isAvailableStatus && hasCapacity && !conflict;

          if (!hasCapacity) {
            disabledReason = `[Disabled: Insufficient capacity (${v.capacity}/${requiredPax} pax)]`;
          } else if (conflict) {
            const conflictDep = formatTime12(conflict.departure_time || conflict.requested_time);
            const conflictArr = conflict.arrival_time ? formatTime12(conflict.arrival_time) : 'end';
            disabledReason = `[Disabled: Assigned to "${conflict.destination}" (${conflictDep} - ${conflictArr})]`;
          } else if (!isAvailableStatus) {
            disabledReason = `[Disabled: Vehicle is ${v.status}]`;
          }

          return {
            ...v,
            isCurrent,
            isEligible,
            disabledReason,
          };
        })
    }));
  }, [allVehicles, allAssignments, request, requiredPax, dep, arr]);

  // Total count of available vehicles that can fit the required passengers and have no schedule conflict
  const eligibleCount = useMemo(() => {
    let count = 0;
    capacityGroups.forEach(g => {
      count += g.vehicles.filter(v => v.isEligible).length;
    });
    return count;
  }, [capacityGroups]);

  const handleAssign = async () => {
    if (!driverId || !vehicleId) {
      toast({ type: 'warning', title: 'Selection Required', message: 'Please select both a driver and a vehicle.' });
      return;
    }

    const selectedDriver = processedDrivers.find(d => d.id.toString() === driverId.toString());
    if (selectedDriver && !selectedDriver.isEligible) {
      toast({
        type: 'error',
        title: 'Driver Unavailable',
        message: selectedDriver.disabledReason || 'Selected driver is assigned to another trip on this date/time.'
      });
      return;
    }

    const selectedVehicle = allVehicles.find(v => v.id.toString() === vehicleId.toString());
    if (selectedVehicle && selectedVehicle.capacity < requiredPax) {
      toast({
        type: 'error',
        title: 'Insufficient Capacity',
        message: `Selected vehicle only has ${selectedVehicle.capacity} seats, but trip requires ${requiredPax} pax.`
      });
      return;
    }

    setLoading(true);
    try {
      await assignmentApi.create({
        request_id: request.id,
        driver_id: parseInt(driverId, 10),
        vehicle_id: parseInt(vehicleId, 10)
      });
      toast({
        type: 'success',
        title: isEditing ? 'Assignment Updated!' : 'Request Approved & Assigned!',
        message: isEditing ? 'Driver and vehicle assignment updated successfully.' : 'Driver and vehicle assigned successfully.'
      });
      onAssigned();
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to complete assignment' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Assigned Driver & Vehicle' : 'Approve & Assign Vehicle'}</h3>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body">
          {/* Trip Overview Card */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.875rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              {request.destination}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span>📅 <strong>{request.requested_date}</strong></span>
                <span style={{
                  background: 'rgba(20, 184, 166, 0.12)',
                  color: 'var(--accent-teal)',
                  padding: '0.1rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700
                }}>
                  👥 {requiredPax} Passenger{requiredPax !== 1 ? 's' : ''} ({request.department})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>Depart: {formatTime12(dep)}</span>
                {arr && (
                  <>
                    <ArrowRight size={12} color="var(--text-muted)" />
                    <span style={{ color: 'var(--gold-300)', fontWeight: 600 }}>Return: {formatTime12(arr)}</span>
                  </>
                )}
                {duration && (
                  <span style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold-300)', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.72rem' }}>
                    ⏱️ {duration}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Driver Selection with Schedule Conflict Detection */}
          <div className="form-group">
            <label className="form-label" htmlFor="assign-driver-select">
              <Users size={13} style={{ display: 'inline', marginRight: 4 }} />
              Assign Driver (Schedule Check) <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <select
              id="assign-driver-select"
              className="form-control"
              value={driverId}
              onChange={e => setDriverId(e.target.value)}
              disabled={dataLoading}
              required
            >
              <option value="">{dataLoading ? '-- Loading drivers… --' : '-- Choose an official driver --'}</option>
              {processedDrivers.map(d => (
                <option
                  key={d.id}
                  value={d.id}
                  disabled={!d.isEligible}
                  style={{
                    background: d.isEligible ? '#131d31' : '#0c121e',
                    color: d.isEligible ? '#f1f5f9' : '#64748b',
                    fontWeight: d.isEligible ? '500' : 'normal'
                  }}
                >
                  {d.name} ({d.email}) {d.isCurrent ? '★ Current' : ''} {d.disabledReason ? `— ${d.disabledReason}` : ''}
                </option>
              ))}
            </select>
            <div className="form-hint" style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
              <span>Trip Window: <strong>{formatTime12(dep)} {arr ? `➔ ${formatTime12(arr)}` : ''}</strong></span>
              {!dataLoading && (
                <span style={{ color: availableDriversCount > 0 ? 'var(--accent-teal)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {availableDriversCount > 0
                    ? `✓ ${availableDriversCount} driver(s) available`
                    : `✕ No drivers free for this schedule`}
                </span>
              )}
            </div>
          </div>

          {/* Vehicle Selection separated by Seat Capacity with Schedule Conflict Detection */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="assign-vehicle-select">
              <Car size={13} style={{ display: 'inline', marginRight: 4 }} />
              Assign Vehicle (Separated by Seat Capacity) <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <select
              id="assign-vehicle-select"
              className="form-control"
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              disabled={dataLoading}
              required
            >
              <option value="">{dataLoading ? '-- Loading available vehicles… --' : '-- Select an available vehicle --'}</option>

              {capacityGroups.map(group => (
                <optgroup
                  key={group.capacity}
                  label={`━━ ${group.label} ━━`}
                  style={{ background: '#0a101d', color: '#f59e0b', fontWeight: 'bold' }}
                >
                  {group.vehicles.map(v => (
                    <option
                      key={v.id}
                      value={v.id}
                      disabled={!v.isEligible}
                      style={{
                        background: v.isEligible ? '#131d31' : '#0c121e',
                        color: v.isEligible ? '#f1f5f9' : '#64748b',
                        fontWeight: v.isEligible ? '500' : 'normal'
                      }}
                    >
                      {v.name} ({v.plate_no}) — {v.type} · {v.capacity} Seats · {v.fuel_level?.toFixed(0)}% Fuel {v.isCurrent ? '★ Current' : ''} {v.disabledReason ? `— ${v.disabledReason}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Capacity & Schedule hint */}
            <div className="form-hint" style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
              <span>Required: <strong>{requiredPax} pax</strong></span>
              {dataLoading ? (
                <span style={{ color: 'var(--text-muted)' }}>Loading fleet data…</span>
              ) : (
                <span style={{ color: eligibleCount > 0 ? 'var(--accent-teal)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {eligibleCount > 0
                    ? `✓ ${eligibleCount} vehicle(s) fit and available`
                    : `✕ No available vehicles for this trip`}
                </span>
              )}
            </div>
          </div>

          {/* Warning if no vehicles meet capacity or schedule */}
          {!dataLoading && eligibleCount === 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginTop: '1rem',
              fontSize: '0.8rem',
              color: 'var(--accent-red)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>No Vehicles Available:</strong> All vehicles are either already assigned to other trips during this schedule, under maintenance, or have insufficient seats for <strong>{requiredPax} passengers</strong>.
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            id="confirm-assign"
            className={`btn btn-primary${loading ? ' btn-loading' : ''}`}
            onClick={handleAssign}
            disabled={loading || dataLoading || !driverId || !vehicleId}
          >
            {!loading && <><UserCheck size={16} /> {isEditing ? 'Save Changes' : 'Approve & Assign'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
