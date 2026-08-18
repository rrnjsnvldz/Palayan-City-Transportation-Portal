import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { requestApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { calculateDuration, formatTime12 } from '../../utils/timeFormat';
import { Send, MapPin, FileText, Users, Calendar, Clock, Building2, StickyNote, ArrowRight, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

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
    specific_purpose: '',
    department: user?.department || '',
    pax_count: 1,
    requested_date: '',
    departure_time: '08:00',
    arrival_time: '17:00',
    notes: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Automatically calculate trip duration whenever departure or arrival time changes
  const durationInfo = useMemo(() => {
    return calculateDuration(form.departure_time, form.arrival_time);
  }, [form.departure_time, form.arrival_time]);

  const finalPurpose = form.purpose === 'Other'
    ? form.specific_purpose?.trim()
    : form.purpose;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination || !form.purpose || !form.department || !form.requested_date || !form.departure_time || !form.arrival_time) {
      toast({ type: 'warning', title: 'Incomplete Form', message: 'Please fill in all required fields.' });
      return;
    }

    if (form.purpose === 'Other' && !form.specific_purpose?.trim()) {
      toast({ type: 'warning', title: 'Specific Purpose Required', message: 'Please specify the purpose of the trip.' });
      return;
    }

    if (!durationInfo.isValid) {
      toast({ type: 'error', title: 'Invalid Trip Schedule', message: 'Estimated return time must be later than departure time.' });
      return;
    }

    // Validate date & departure is in the future
    const now = new Date();
    const reqDate = new Date(`${form.requested_date}T${form.departure_time}`);
    if (reqDate < now) {
      toast({ type: 'warning', title: 'Invalid Date/Time', message: 'Departure date & time must be in the future.' });
      return;
    }

    setLoading(true);
    try {
      await requestApi.create({
        ...form,
        purpose: finalPurpose,
        pax_count: parseInt(form.pax_count, 10) || 1,
        requested_time: form.departure_time, // backward compatibility
        departure_time: form.departure_time,
        arrival_time: form.arrival_time,
        trip_duration: durationInfo.formatted,
      });
      toast({ type: 'success', title: 'Request Submitted!', message: 'Your transport request has been sent for admin dispatch.' });
      navigate('/my-requests');
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to submit request' });
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <h1>New Transport Request</h1>
        <p>Specify departure from City Hall and expected return time to calculate trip duration</p>
      </div>

      <div style={{ maxWidth: 760 }}>
        <form onSubmit={handleSubmit} id="request-form">
          {/* Trip Destination & Schedule */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="var(--gold-400)" /> Trip Schedule & Route
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
                  placeholder="e.g. Nueva Ecija University, Cabanatuan Provincial Capitol, Gapan City Hall..."
                  value={form.destination}
                  onChange={e => set('destination', e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="requested_date">
                  <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Date of Trip <span style={{ color: 'var(--accent-red)' }}>*</span>
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

              {/* Departure Time from City Hall */}
              <div className="form-group">
                <label className="form-label" htmlFor="departure_time">
                  <Clock size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--accent-teal)' }} />
                  Departure from City Hall <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  id="departure_time"
                  type="time"
                  className="form-control"
                  value={form.departure_time}
                  onChange={e => set('departure_time', e.target.value)}
                  required
                />
                <div className="form-hint" style={{ color: 'var(--text-muted)' }}>
                  Time leaving Palayan City Hall ({formatTime12(form.departure_time)})
                </div>
              </div>

              {/* Estimated Arrival / Return Time to City Hall */}
              <div className="form-group">
                <label className="form-label" htmlFor="arrival_time">
                  <Clock size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--gold-400)' }} />
                  Return Arrival at City Hall <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  id="arrival_time"
                  type="time"
                  className="form-control"
                  value={form.arrival_time}
                  onChange={e => set('arrival_time', e.target.value)}
                  required
                />
                <div className="form-hint" style={{ color: 'var(--text-muted)' }}>
                  Estimated time back at City Hall ({formatTime12(form.arrival_time)})
                </div>
              </div>
            </div>

            {/* Live Calculated Trip Duration Display */}
            <div style={{
              marginTop: '1rem',
              padding: '0.875rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              background: durationInfo.isValid ? 'rgba(20, 184, 166, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${durationInfo.isValid ? 'rgba(20, 184, 166, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              transition: 'var(--transition)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                {durationInfo.isValid ? (
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(20, 184, 166, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-teal)' }}>
                    <CheckCircle2 size={18} />
                  </div>
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-red)' }}>
                    <AlertTriangle size={18} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Trip Duration Calculation
                  </div>
                  <div style={{ fontSize: '0.85rem', color: durationInfo.isValid ? 'var(--text-primary)' : 'var(--accent-red)', fontWeight: 600 }}>
                    {durationInfo.isValid
                      ? `${formatTime12(form.departure_time)} → ${formatTime12(form.arrival_time)}`
                      : 'Return time must be after departure time'}
                  </div>
                </div>
              </div>

              {durationInfo.isValid && (
                <div style={{
                  background: 'rgba(201, 168, 76, 0.15)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--gold-300)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  ⏱️ Duration: <span>{durationInfo.formatted}</span>
                </div>
              )}
            </div>
          </div>

          {/* Purpose & Department */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--gold-400)" /> Purpose & Department
            </h3>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: form.purpose === 'Other' ? '1 / -1' : undefined }}>
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

              {/* Conditional Specific Purpose input when "Other" is selected */}
              {form.purpose === 'Other' && (
                <div className="form-group fade-in" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" htmlFor="specific_purpose">
                    <HelpCircle size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--gold-400)' }} />
                    Specific Purpose <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    id="specific_purpose"
                    type="text"
                    className="form-control"
                    placeholder="Please enter the specific purpose of the trip (e.g. Relief distribution, Barangay outreach, Equipment transport)..."
                    value={form.specific_purpose}
                    onChange={e => set('specific_purpose', e.target.value)}
                    required
                    autoFocus
                  />
                  <div className="form-hint">Please provide detailed information for admin approval and driver reference</div>
                </div>
              )}

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
                <div className="form-hint">Total personnel including requestor</div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <StickyNote size={18} color="var(--gold-400)" /> Additional Notes
            </h3>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea
                id="notes"
                className="form-control"
                placeholder="Any special instructions, preferred vehicle type, route stops, etc..."
                rows={3}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Summary preview */}
          {form.destination && form.requested_date && (
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 'var(--radius-lg)', padding: '1.125rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--gold-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                Trip Summary Preview
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Destination:</span> <strong style={{ color: 'var(--text-primary)' }}>{form.destination}</strong>
                </div>
                {form.purpose && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Purpose:</span>{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {form.purpose === 'Other' ? (form.specific_purpose || 'Other (Please specify)') : form.purpose}
                    </strong>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Date:</span> {new Date(form.requested_date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Schedule:</span>
                  <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>Depart City Hall {formatTime12(form.departure_time)}</span>
                  <ArrowRight size={14} color="var(--text-muted)" />
                  <span style={{ color: 'var(--gold-300)', fontWeight: 600 }}>Return {formatTime12(form.arrival_time)}</span>
                  {durationInfo.isValid && (
                    <span style={{ color: 'var(--text-primary)', background: 'var(--surface-3)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem' }}>
                      ⏱️ {durationInfo.formatted}
                    </span>
                  )}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Passengers:</span> {form.pax_count} pax ({form.department})
                </div>
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
              disabled={loading || !durationInfo.isValid}
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
