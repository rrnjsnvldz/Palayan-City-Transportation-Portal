import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { requestApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { calculateDuration, formatTime12 } from '../../utils/timeFormat';
import {
  Send, MapPin, FileText, Users, Calendar, Clock, Building2,
  StickyNote, ArrowRight, AlertTriangle, CheckCircle2, HelpCircle, X
} from 'lucide-react';

const DEPARTMENTS = [
  'City Administrator', 'City Planning Office', 'Health Department', 'Engineering Office',
  'Social Welfare', 'Agriculture Office', 'Treasurer\'s Office', 'Civil Registry',
  'Human Resources', 'Disaster Risk Reduction', 'Tourism Office', 'Other'
];

const PURPOSES = [
  'Official Meeting', 'Site Visit / Inspection', 'Medical / Health Mission',
  'Training / Seminar', 'Document Delivery', 'Supplies Pickup', 'Inter-LGU Coordination', 'Other'
];

function RequestConfirmModal({ form, finalPurpose, durationInfo, user, onClose, onConfirm, loading }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 400 }}>
      <div className="modal" style={{ maxWidth: 520, padding: '1.5rem' }}>
        <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(20, 184, 166, 0.15)',
              color: 'var(--accent-teal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'Montserrat', fontWeight: 800 }}>Confirm Transport Request</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Please review your travel details before submitting</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={loading} aria-label="Close"><X size={14} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Trip Destination & Purpose Summary */}
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem'
          }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.35rem', fontFamily: 'Montserrat' }}>
              📍 {form.destination}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gold-300)', fontWeight: 600 }}>
              🎯 Purpose: {finalPurpose}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.78rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>🏢 {form.department}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Passengers:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>👥 {form.pax_count} Pax</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-muted)' }}>Schedule & Duration:</span>
                <div style={{ fontWeight: 600, color: 'var(--accent-teal)', marginTop: 2, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span>📅 {form.requested_date}</span>
                  <span>·</span>
                  <span>🛫 {formatTime12(form.departure_time)}</span>
                  <span>➔</span>
                  <span style={{ color: 'var(--gold-300)' }}>🛬 {formatTime12(form.arrival_time)}</span>
                  <span style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold-300)', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem' }}>
                    ⏱️ {durationInfo.formatted}
                  </span>
                </div>
              </div>
              {form.notes && (
                <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Notes:</span>
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>📝 {form.notes}</div>
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.625rem 0.85rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <HelpCircle size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
            <span>This request will be sent to the Transport Administrator for driver and vehicle dispatching.</span>
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Edit / Review
          </button>
          <button
            id="confirm-submit-request-btn"
            className={`btn btn-primary${loading ? ' btn-loading' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {!loading && <><Send size={15} /> Confirm & Submit Request</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  const handleValidateAndPrompt = (e) => {
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

    // Open clean confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
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
      setShowConfirmModal(false);
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
        <form onSubmit={handleValidateAndPrompt} id="request-form">
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

              <div className="form-group">
                <label className="form-label" htmlFor="requested_date">
                  Date of Trip <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  id="requested_date"
                  type="date"
                  min={today}
                  className="form-control"
                  value={form.requested_date}
                  onChange={e => set('requested_date', e.target.value)}
                  required
                />
              </div>

              {/* Departure Time */}
              <div className="form-group">
                <label className="form-label" htmlFor="departure_time">
                  Departure Time (City Hall) <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  id="departure_time"
                  type="time"
                  className="form-control"
                  value={form.departure_time}
                  onChange={e => set('departure_time', e.target.value)}
                  required
                />
                <div className="form-hint">Format: 12-hour AM/PM (e.g. 8:00 AM)</div>
              </div>

              {/* Estimated Arrival / Return Time */}
              <div className="form-group">
                <label className="form-label" htmlFor="arrival_time">
                  Estimated Return Time (City Hall) <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  id="arrival_time"
                  type="time"
                  className="form-control"
                  value={form.arrival_time}
                  onChange={e => set('arrival_time', e.target.value)}
                  required
                />
                <div className="form-hint">Expected return time back to Palayan City Hall</div>
              </div>

              {/* Calculated Trip Duration Display */}
              <div className="form-group">
                <label className="form-label">Calculated Trip Duration</label>
                <div
                  style={{
                    background: durationInfo.isValid ? 'var(--surface-2)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${durationInfo.isValid ? 'var(--border)' : 'var(--accent-red)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.625rem 0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 42,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} color={durationInfo.isValid ? 'var(--gold-400)' : 'var(--accent-red)'} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: durationInfo.isValid ? 'var(--text-primary)' : 'var(--accent-red)' }}>
                      {durationInfo.formatted}
                    </span>
                  </div>
                  {durationInfo.isValid && form.departure_time && form.arrival_time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>{formatTime12(form.departure_time)}</span>
                      <ArrowRight size={12} />
                      <span>{formatTime12(form.arrival_time)}</span>
                    </div>
                  )}
                </div>
                {!durationInfo.isValid && (
                  <div className="form-hint" style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <AlertTriangle size={12} /> Return time must be later than departure time.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Department & Purpose Details */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--gold-400)" /> Department & Purpose
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="department">
                  Department <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <select
                  id="department"
                  className="form-control"
                  value={form.department}
                  onChange={e => set('department', e.target.value)}
                  required
                >
                  <option value="">-- Select Department --</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pax_count">
                  Passenger Count (Pax) <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  id="pax_count"
                  type="number"
                  min={1}
                  max={60}
                  className="form-control"
                  value={form.pax_count}
                  onChange={e => set('pax_count', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  required
                />
                <div className="form-hint">Total city personnel joining this trip</div>
              </div>

              <div className="form-group" style={{ gridColumn: form.purpose === 'Other' ? '1 / 2' : '1 / -1' }}>
                <label className="form-label" htmlFor="purpose">
                  Purpose of Trip <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <select
                  id="purpose"
                  className="form-control"
                  value={form.purpose}
                  onChange={e => set('purpose', e.target.value)}
                  required
                >
                  <option value="">-- Select Purpose --</option>
                  {PURPOSES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Conditional Specific Purpose input when "Other" is selected */}
              {form.purpose === 'Other' && (
                <div className="form-group" style={{ gridColumn: '2 / 3' }}>
                  <label className="form-label" htmlFor="specific_purpose" style={{ color: 'var(--gold-400)' }}>
                    Specific Purpose Details <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    id="specific_purpose"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Provincial Athletic Meet, Regional Audit Support..."
                    value={form.specific_purpose}
                    onChange={e => set('specific_purpose', e.target.value)}
                    required
                    style={{ borderColor: 'var(--gold-500)' }}
                  />
                  <div className="form-hint">Please provide concise details for admin approval</div>
                </div>
              )}

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="notes">Additional Notes / Special Instructions</label>
                <textarea
                  id="notes"
                  className="form-control"
                  rows={3}
                  placeholder="e.g. VIP guest onboard, fragile medical equipment, specific pickup point at East Wing..."
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Trip Summary Card Preview */}
          {form.destination && form.requested_date && (
            <div
              className="card"
              style={{
                background: 'rgba(201, 168, 76, 0.06)',
                border: '1px solid rgba(201, 168, 76, 0.25)',
                marginBottom: '1.5rem',
                padding: '1rem 1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <CheckCircle2 size={16} color="var(--gold-400)" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Request Summary Preview
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Destination:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{form.destination}</strong>
                </div>
                {form.purpose && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Purpose:</span>{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {finalPurpose || 'Other'}
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
              className="btn btn-primary"
              disabled={loading || !durationInfo.isValid}
              style={{ flex: 1 }}
            >
              <Send size={16} /> Submit Request
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Alert Modal */}
      {showConfirmModal && (
        <RequestConfirmModal
          form={form}
          finalPurpose={finalPurpose}
          durationInfo={durationInfo}
          user={user}
          loading={loading}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </div>
  );
}
