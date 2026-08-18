import { useState, useEffect } from 'react';
import { vehicleApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../../components/StatusBadge';
import VehicleCard from '../../components/VehicleCard';
import { Plus, Edit2, Trash2, X, Car } from 'lucide-react';

const VEHICLE_TYPES = ['Van', 'SUV', 'Pickup', 'Ambulance', 'Sedan', 'Bus', 'Truck'];
const STATUSES = ['available', 'in_use', 'maintenance'];

function VehicleModal({ vehicle, onClose, onSaved }) {
  const isEdit = !!vehicle;
  const [form, setForm] = useState({
    plate_no: vehicle?.plate_no || '',
    name: vehicle?.name || '',
    type: vehicle?.type || 'Van',
    capacity: vehicle?.capacity || 5,
    status: vehicle?.status || 'available',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.plate_no || !form.name) { toast({ type: 'warning', title: 'Plate No & Name required' }); return; }
    setLoading(true);
    try {
      if (isEdit) await vehicleApi.update(vehicle.id, form);
      else await vehicleApi.create(form);
      toast({ type: 'success', title: isEdit ? 'Vehicle Updated' : 'Vehicle Added' });
      onSaved();
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to save' });
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Plate Number *</label>
              <input id="veh-plate" className="form-control" placeholder="e.g. NE-1007" value={form.plate_no} onChange={e => set('plate_no', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Name *</label>
              <input id="veh-name" className="form-control" placeholder="e.g. City Van 3" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select id="veh-type" className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
                {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Capacity (seats)</label>
              <input id="veh-capacity" type="number" min={1} max={60} className="form-control" value={form.capacity} onChange={e => set('capacity', parseInt(e.target.value, 10))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Status</label>
              <select id="veh-status" className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-vehicle" className={`btn btn-primary${loading ? ' btn-loading' : ''}`} onClick={handleSave} disabled={loading}>
            {!loading && 'Save Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const { toast } = useToast();

  const loadData = () => { vehicleApi.list().then(r => setVehicles(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Remove this vehicle?')) return;
    try {
      await vehicleApi.delete(id);
      toast({ type: 'success', title: 'Vehicle Removed' });
      loadData();
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.response?.data?.error }); }
  };

  const available   = vehicles.filter(v => v.status === 'available').length;
  const inUse       = vehicles.filter(v => v.status === 'in_use').length;
  const maintenance = vehicles.filter(v => v.status === 'maintenance').length;

  return (
    <div className="page-content fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Vehicle Management</h1>
          <p>{vehicles.length} vehicles · {available} available · {inUse} in use · {maintenance} in maintenance</p>
        </div>
        <div className="flex gap-1">
          <button className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('grid')}>Grid</button>
          <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('table')}>Table</button>
          <button id="add-vehicle-btn" className="btn btn-primary" onClick={() => { setEditTarget(null); setShowModal(true); }}>
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-3">
          {vehicles.map(v => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onEdit={veh => { setEditTarget(veh); setShowModal(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Plate No</th><th>Name</th><th>Type</th><th>Capacity</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{v.plate_no}</td>
                  <td>{v.name}</td>
                  <td>{v.type}</td>
                  <td>{v.capacity} seats</td>
                  <td><StatusBadge status={v.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditTarget(v); setShowModal(true); }}>
                        <Edit2 size={12} /> Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v.id)} disabled={v.status === 'in_use'}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <VehicleModal
          vehicle={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
}
