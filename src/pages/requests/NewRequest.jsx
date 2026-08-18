import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { requestApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Send, MapPin, FileText, Users, Calendar, Clock, Building2, StickyNote } from 'lucide-react';

const DEPARTMENTS = [
  'City Administrator', 'City Planning Office', 'Health Department', 'Engineering Office',
  'Social Welfare', 'Agriculture Office', 'Treasurer\'s Office', 'Civil Registry',
  'Human Resources', 'Disaster Risk Reduction', 'Tourism Office', 'Other'
];

const PURPOSES = [
  'Official Meeting', 'Site Visit / Inspection', 'Medical / Health Mission',
  'Training / Seminar', 'Document Delivery', 'Supplies Pickup', 'Inter-LGU Coordination', 'Other'
];

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    destination: '',
    purpose: '',
    department: user?.department || '',
    pax_count: 1,
    requested_date: '',
    requested_time: '08:00',
    notes: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination || !form.purpose || !form.department || !form.requested_date) {
      toast({ type: 'warning', title: 'Incomplete Form', message: 'Please fill in all required fields.' });
      return;
    }
    // Validate date is in the future
    const now = new Date();
    const reqDate = new Date(`${form.requested_date}T${form.requested_time}`);
    if (reqDate < now) {
      toast({ type: 'warning', title: 'Invalid Date', message: 'Requested date/time must be in the future.' });
      return;
    }
    setLoading(true);
    try {
      await requestApi.create({ ...form, pax_count: parseInt(form.pax_count) });
      toast({ type: 'success', title: 'Request Submitted!', message: 'Your transport request has been sent for admin review.' });
      navigate('/my-requests');
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to submit request' });
    } finally { setLoading(false); }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1>New Transport Request</h1>
        <p>Fill in the details below to request a government vehicle</p>
      </div>

      <div style={{ maxWidth: 720 }}>
        <form onSubmit={handleSubmit} id="request-form">
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="var(--gold-400)" /> Trip Details
            </h3>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="destination">
                  Destination <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  id="destination"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Nueva Ecija University, Cabanatuan City Hall..."
                  value={form.destination}
                  onChange={e => set('destination', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="requested_date">
                  <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Date <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  id="requested_date"
                  type="date"
                  className="form-control"
                  min={today}
                  value={form.requested_date}
                  onChange={e => set('requested_date', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="requested_time">
                  <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Time <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  id="requested_time"
                  type="time"
                  className="form-control"
                  value={form.requested_time}
                  onChange={e => set('requested_time', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--gold-400)" /> Purpose & Department
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="purpose">
                  Purpose <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <select
                  id="purpose"
                  className="form-control"
                  value={form.purpose}
                  onChange={e => set('purpose', e.target.value)}
                  required
                >
                  <option value="">-- Select purpose --</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="department">
                  <Building2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Department <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <select
                  id="department"
                  className="form-control"
                  value={form.department}
                  onChange={e => set('department', e.target.value)}
                  required
                >
                  <option value="">-- Select department --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pax_count">
                  <Users size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Number of Passengers
                </label>
                <input
                  id="pax_count"
                  type="number"
                  className="form-control"
                  min={1} max={50}
                  value={form.pax_count}
                  onChange={e => set('pax_count', e.target.value)}
                />
                <div className="form-hint">Include the driver in the count</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <StickyNote size={18} color="var(--gold-400)" /> Additional Notes
            </h3>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea
                id="notes"
                className="form-control"
                placeholder="Any special instructions, preferred vehicle type, route details, etc..."
                rows={4}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Summary preview */}
          {form.destination && form.requested_date && (
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--gold-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                Request Preview
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{form.destination}</strong>
                {form.requested_date && ` on ${new Date(form.requested_date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                {form.requested_time && ` at ${form.requested_time}`}
                {` · ${form.pax_count} passenger(s)`}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button
              id="submit-request"
              type="submit"
              className={`btn btn-primary${loading ? ' btn-loading' : ''}`}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {!loading && <><Send size={16} /> Submit Request</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
