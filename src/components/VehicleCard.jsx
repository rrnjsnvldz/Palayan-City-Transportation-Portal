import { Users, Gauge } from 'lucide-react';
import StatusBadge from './StatusBadge';

const VEHICLE_EMOJIS = {
  Van: '🚐', SUV: '🚙', Pickup: '🛻', Ambulance: '🚑', Sedan: '🚗', Bus: '🚌', Truck: '🚚'
};

function getStatusColor(status) {
  if (status === 'available')   return '#22c55e';
  if (status === 'in_use')      return '#14b8a6';
  if (status === 'maintenance') return '#f59e0b';
  return '#64748b';
}

export default function VehicleCard({ vehicle, showActions, onSelect }) {
  const emoji = VEHICLE_EMOJIS[vehicle.type] || '🚗';

  return (
    <div
      className="vehicle-card fade-in"
      style={{ '--veh-color': getStatusColor(vehicle.status), cursor: onSelect ? 'pointer' : 'default' }}
      onClick={() => onSelect?.(vehicle)}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '2rem' }}>{emoji}</span>
        <StatusBadge status={vehicle.status} />
      </div>

      <div className="veh-name">{vehicle.name}</div>
      <div className="veh-plate">{vehicle.plate_no} · {vehicle.type}</div>

      <div className="veh-meta">
        <div className="veh-meta-row">
          <Users size={13} /> {vehicle.capacity} seats
        </div>
        {vehicle.speed > 0 && (
          <div className="veh-meta-row">
            <Gauge size={13} /> {vehicle.speed.toFixed(0)} km/h
          </div>
        )}
      </div>

      {vehicle.last_updated && (
        <div className="text-xs text-muted mt-2">
          Updated: {new Date(vehicle.last_updated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
