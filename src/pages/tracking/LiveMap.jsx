import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { vehicleApi, gpsApi } from '../../services/api';
import { useRealtime } from '../../hooks/useSocket';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../../components/StatusBadge';
import { Wifi, WifiOff, Gauge, Play, Square, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const VEHICLE_EMOJIS = { Van: '🚐', SUV: '🚙', Pickup: '🛻', Ambulance: '🚑', Sedan: '🚗', Bus: '🚌', Truck: '🚚' };
const STATUS_COLORS  = { available: '#22c55e', in_use: '#14b8a6', maintenance: '#f59e0b' };

function createVehicleIcon(vehicle) {
  const emoji = VEHICLE_EMOJIS[vehicle.type] || '🚗';
  const color = STATUS_COLORS[vehicle.status] || '#22c55e';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:rgba(7,15,31,0.92);border:2.5px solid ${color};border-radius:50%;
      width:38px;height:38px;display:flex;align-items:center;justify-content:center;
      font-size:19px;box-shadow:0 0 14px ${color}55;transition:all .3s;
    ">${emoji}</div>`,
    iconSize:    [38, 38],
    iconAnchor:  [19, 19],
    popupAnchor: [0, -22],
  });
}

// GPS Simulator panel
function GpsSimulator({ vehicles, onUpdate }) {
  const [simVehicle, setSimVehicle] = useState('');
  const [running, setRunning]       = useState(false);
  const [expanded, setExpanded]     = useState(false);
  const intervalRef = useRef(null);
  const posRef      = useRef({ lat: 15.5413, lng: 121.1082 });
  const { toast } = useToast();

  const startSim = () => {
    if (!simVehicle) { toast({ type: 'warning', title: 'Select a vehicle first' }); return; }
    const v = vehicles.find(v => v.id === parseInt(simVehicle));
    if (!v) return;
    posRef.current = { lat: v.current_lat || 15.5413, lng: v.current_lng || 121.1082 };
    setRunning(true);
    intervalRef.current = setInterval(async () => {
      posRef.current.lat += (Math.random() - 0.5) * 0.0015;
      posRef.current.lng += (Math.random() - 0.5) * 0.0015;
      try {
        await gpsApi.update({
          vehicleId: v.id,
          lat:   posRef.current.lat,
          lng:   posRef.current.lng,
          speed: 25 + Math.random() * 55,
          fuel:  Math.max(10, (v.fuel_level || 80) - Math.random() * 0.2),
          heading: Math.random() * 360,
          status: 'moving',
        });
        onUpdate?.();
      } catch {}
    }, 2500);
  };

  const stopSim = () => { clearInterval(intervalRef.current); setRunning(false); };
  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div style={{ background: 'rgba(7,15,31,0.9)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius-md)' }}>
      <button
        style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700 }}
        onClick={() => setExpanded(!expanded)}
      >
        <span>📡 GPS Simulator</span>
        {running && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div style={{ padding: '0 1rem 0.875rem' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
            Simulates GPS hardware. Your future devices will use the same API endpoint.
          </p>
          <select className="form-control" style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}
            value={simVehicle} onChange={e => setSimVehicle(e.target.value)} disabled={running}>
            <option value="">-- Select Vehicle --</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate_no})</option>)}
          </select>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-sm btn-success" style={{ flex: 1 }} onClick={startSim} disabled={running}>
              <Play size={12} /> Start
            </button>
            <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={stopSim} disabled={!running}>
              <Square size={12} /> Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveMap() {
  const [vehicles,    setVehicles]    = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [trail,       setTrail]       = useState([]);
  const [connected,   setConnected]   = useState(false);
  const [lastUpdate,  setLastUpdate]  = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const mapRef = useRef(null);

  const loadVehicles = () => {
    gpsApi.vehicles().then(r => setVehicles(r.data)).catch(() => {});
  };

  useEffect(() => { loadVehicles(); }, []);

  // Load trail when vehicle selected
  useEffect(() => {
    if (!selected) { setTrail([]); return; }
    gpsApi.history(selected.id, 60).then(r => {
      setTrail(r.data.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]));
    }).catch(() => {});
  }, [selected?.id]);

  // Supabase Realtime — live GPS
  useRealtime({
    onVehicleUpdate: (updatedVehicle) => {
      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? { ...v, ...updatedVehicle } : v));
      if (selected?.id === updatedVehicle.id) {
        setSelected(prev => ({ ...prev, ...updatedVehicle }));
        if (updatedVehicle.current_lat && updatedVehicle.current_lng) {
          setTrail(prev => [...prev.slice(-59), [updatedVehicle.current_lat, updatedVehicle.current_lng]]);
          mapRef.current?.setView([updatedVehicle.current_lat, updatedVehicle.current_lng]);
        }
      }
      setConnected(true);
      setLastUpdate(new Date().toLocaleTimeString());
    },
  });

  const center  = [15.5413, 121.1082];
  const located = vehicles.filter(v => v.current_lat && v.current_lng);

  return (
    <div className="page-content fade-in" style={{ height: 'calc(100dvh - var(--header-height))', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header flex items-center justify-between" style={{ flexShrink: 0, marginBottom: '0.875rem' }}>
        <div>
          <h1>Live Map</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {connected
              ? <><Wifi size={13} color="#22c55e" /> Live · {lastUpdate}</>
              : <><WifiOff size={13} color="var(--accent-amber)" /> Waiting for GPS…</>
            }
          </p>
        </div>
        {/* Mobile toggle for sidebar */}
        <button className="btn btn-sm btn-secondary" style={{ display: 'none' }}
          id="map-sidebar-toggle"
          onClick={() => setShowSidebar(!showSidebar)}
          aria-label="Toggle fleet panel"
        >
          <MapPin size={14} /> Fleet
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Sidebar — fleet panel */}
        <div style={{
          width: 270, flexShrink: 0, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '0.625rem',
        }}
          className={`map-fleet-panel${showSidebar ? ' open' : ''}`}
        >
          <GpsSimulator vehicles={vehicles} onUpdate={loadVehicles} />

          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ padding: '0.625rem 0.875rem', borderBottom: '1px solid var(--border)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fleet ({vehicles.length})
            </div>
            {vehicles.map(v => (
              <button
                key={v.id}
                onClick={() => { setSelected(selected?.id === v.id ? null : v); setShowSidebar(false); }}
                style={{
                  width: '100%', padding: '0.625rem 0.875rem', textAlign: 'left',
                  background: selected?.id === v.id ? 'rgba(201,168,76,0.08)' : 'transparent',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  borderLeft: selected?.id === v.id ? '2px solid var(--gold-500)' : '2px solid transparent',
                  transition: 'var(--transition)', border: 'none', fontFamily: 'inherit',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.15rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{v.name}</span>
                  <StatusBadge status={v.status} />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{v.plate_no}</div>
                {v.current_lat ? (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', fontSize: '0.68rem', color: '#22c55e' }}>
                    <span><Gauge size={10} style={{ display: 'inline', marginRight: 2 }} />{(v.speed || 0).toFixed(0)} km/h</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>No GPS signal</div>
                )}
              </button>
            ))}
          </div>

          {/* Selected vehicle detail */}
          {selected && (
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--gold-500)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--gold-400)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{selected.name}</div>
              {[
                ['Plate',   selected.plate_no],
                ['Status',  selected.status],
                ['Speed',   `${(selected.speed || 0).toFixed(0)} km/h`],
                ['Coords',  selected.current_lat ? `${selected.current_lat.toFixed(4)}, ${selected.current_lng.toFixed(4)}` : 'N/A'],
                ['Updated', selected.last_updated ? new Date(selected.last_updated).toLocaleTimeString() : '—'],
              ].map(([k, val]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ flex: 1, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', minWidth: 0 }}>
          <MapContainer
            center={center}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {located.map(v => (
              <Marker
                key={v.id}
                position={[v.current_lat, v.current_lng]}
                icon={createVehicleIcon(v)}
                eventHandlers={{ click: () => setSelected(v) }}
              >
                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{v.plate_no}</div>
                    <div style={{ fontSize: 12 }}>🏎️ Speed: {(v.speed || 0).toFixed(0)} km/h</div>
                    <div style={{ fontSize: 12, textTransform: 'capitalize' }}>📍 {v.status?.replace('_', ' ')}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
            {trail.length > 1 && (
              <Polyline positions={trail} color="#c9a84c" weight={2.5} opacity={0.7} dashArray="8,5" />
            )}
          </MapContainer>
        </div>
      </div>

      {/* Mobile: show fleet toggle button */}
      <style>{`
        @media (max-width: 640px) {
          #map-sidebar-toggle { display: flex !important; }
          .map-fleet-panel {
            position: fixed; inset: 0; top: auto;
            height: 60dvh; z-index: 300;
            background: var(--navy-900);
            border-top: 1px solid var(--border);
            transform: translateY(100%);
            transition: transform 0.3s var(--ease-smooth);
            overflow-y: auto; padding: 1rem;
          }
          .map-fleet-panel.open { transform: translateY(0); }
        }
        @media (max-width: 1024px) and (min-width: 641px) {
          .map-fleet-panel { width: 240px; }
        }
      `}</style>
    </div>
  );
}
