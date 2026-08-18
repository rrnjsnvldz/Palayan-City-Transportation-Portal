import { useState, useEffect } from 'react';
import { vehicleApi } from '../../services/api';
import VehicleCard from '../../components/VehicleCard';
import { Search } from 'lucide-react';

export default function FleetStatus() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    vehicleApi.list().then(r => setVehicles(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = vehicles.filter(v => {
    const matchFilter = filter === 'all' || v.status === filter;
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.plate_no.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1>Fleet Status</h1>
        <p>{vehicles.filter(v => v.status === 'available').length} of {vehicles.length} vehicles available</p>
      </div>

      <div className="flex gap-2" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.2rem' }} />
        </div>
        {['all', 'available', 'in_use', 'maintenance'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading fleet...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🚗</div><h3>No vehicles found</h3></div>
      ) : (
        <div className="grid grid-3">
          {filtered.map(v => <VehicleCard key={v.id} vehicle={v} />)}
        </div>
      )}
    </div>
  );
}
