import { useState, useEffect, useMemo } from 'react';
import { authApi, vehicleApi, assignmentApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import { formatTime12, calculateDuration } from '../utils/timeFormat';
import { X, UserCheck, ArrowRight, AlertTriangle, Users, Car, Loader2 } from 'lucide-react';

export default function AssignModal({ request, onClose, onAssigned }) {
  const [drivers, setDrivers] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [driverId, setDriverId] = useState(request.assignment?.driver_id?.toString() || '');
  const [vehicleId, setVehicleId] = useState(request.assignment?.vehicle_id?.toString() || '');
  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditing = request.status === 'approved' && !!request.assignment;
  const requiredPax = parseInt(request.pax_count, 10) || 1;

  const dep = request.departure_time || request.requested_time;
  const arr = request.arrival_time;
  const duration = request.trip_duration || (dep && arr ? calculateDuration(dep, arr).formatted : '');

  useEffect(() => {
    setDataLoading(true);
    Promise.all([
      authApi.getUsers(),
      vehicleApi.list()
    ])
      .then(([usersRes, vehiclesRes]) => {
        setDrivers(usersRes.data.filter(u => u.role === 'driver'));
        setAllVehicles(vehiclesRes.data || []);
      })
      .catch(err => {
        console.error('Failed to load assignment options', err);
      })
      .finally(() => {
        setDataLoading(false);
      });
  }, []);

  // Group all vehicles by their seat capacity in ascending order
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
          const isAvailable = v.status === 'available' || isCurrent;
          const hasCapacity = (v.capacity || 0) >= requiredPax;
          const isEligible = isAvailable && hasCapacity;

          let disabledReason = '';
          if (!hasCapacity) {
            disabledReason = `[Disabled: Insufficient capacity (${v.capacity}/${requiredPax} pax)]`;
          } else if (!isAvailable) {
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
  }, [allVehicles, request, requiredPax]);

  // Total count of available vehicles that can fit the required passengers
  const eligibleCount = useMemo(() => {
    const currentVehId = request.assignment?.vehicle_id;
    return allVehicles.filter(v => (v.status === 'available' || v.id === currentVehId) && (v.capacity || 0) >= requiredPax).length;
  }, [allVehicles, request, requiredPax]);

  const handleAssign = async () => {
    if (!driverId || !vehicleId) {
      toast({ type: 'warning', title: 'Selection Required', message: 'Please select both a driver and a vehicle.' });
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

          {/* Driver Selection */}
          <div className="form-group">
            <label className="form-label" htmlFor="assign-driver-select">
              <Users size={13} style={{ display: 'inline', marginRight: 4 }} />
              Assign Driver <span style={{ color: 'var(--accent-red)' }}>*</span>
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
              {drivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.email}) {d.id === request.assignment?.driver_id ? '★ Current' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Selection separated by Seat Capacity */}
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

            {/* Capacity hint */}
            <div className="form-hint" style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
              <span>Required: <strong>{requiredPax} pax</strong></span>
              {dataLoading ? (
                <span style={{ color: 'var(--text-muted)' }}>Loading fleet data…</span>
              ) : (
                <span style={{ color: eligibleCount > 0 ? 'var(--accent-teal)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {eligibleCount > 0
                    ? `✓ ${eligibleCount} vehicle(s) can accommodate this trip`
                    : `✕ No available vehicles with ≥ ${requiredPax} seats`}
                </span>
              )}
            </div>
          </div>

          {/* Warning if no vehicles meet capacity (only after data finishes loading) */}
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
                <strong>Insufficient Capacity:</strong> All available vehicles have fewer seats than the <strong>{requiredPax} passengers</strong> requested.
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
