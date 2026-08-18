import { useState, useEffect } from 'react';
import { authApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import ConfirmModal from '../../components/ConfirmModal';
import { Plus, Trash2, X, ShieldCheck, UserCheck, Truck, Users } from 'lucide-react';

const ROLES = ['admin', 'requestor', 'driver'];
const DEPARTMENTS = [
  'City Administrator', 'City Planning Office', 'Health Department', 'Engineering Office',
  'Social Welfare', 'Agriculture Office', "Treasurer's Office", 'Civil Registry',
  'Human Resources', 'Disaster Risk Reduction', 'General Services', 'Other'
];

function AddUserModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'requestor', department: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast({ type: 'warning', title: 'Name, Email & Password required' }); return; }
    setLoading(true);
    try {
      await authApi.createUser(form);
      toast({ type: 'success', title: 'User Created', message: `${form.name} (${form.role}) added successfully` });
      onAdded();
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to create user' });
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h3>Add New User</h3>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input id="new-user-name" className="form-control" placeholder="e.g. Maria Santos" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input id="new-user-email" type="email" className="form-control" placeholder="e.g. maria@palayan.gov.ph" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input id="new-user-pass" type="password" className="form-control" placeholder="Min. 6 characters" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">System Role *</label>
                <select id="new-user-role" className="form-control" value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select id="new-user-dept" className="form-control" value={form.department} onChange={e => set('department', e.target.value)}>
                  <option value="">-- None / General --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button id="save-user-btn" type="submit" className={`btn btn-primary${loading ? ' btn-loading' : ''}`} disabled={loading}>
              {!loading && 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ROLE_CONFIG = {
  admin:     { label: 'Admin',     icon: ShieldCheck, color: '#c9a84c' },
  requestor: { label: 'Requestor', icon: UserCheck,   color: '#3b82f6' },
  driver:    { label: 'Driver',    icon: Truck,       color: '#22c55e' },
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const { toast } = useToast();

  const loadUsers = () => { authApi.getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { loadUsers(); }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await authApi.deleteUser(deleteTarget.id);
      toast({ type: 'success', title: 'User Removed', message: `${deleteTarget.name} has been removed.` });
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to remove user' });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = roleFilter === 'all' ? users : users.filter(u => u.role === roleFilter);

  const counts = { admin: 0, requestor: 0, driver: 0 };
  users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });

  return (
    <div className="page-content fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>User Management</h1>
          <p>{users.length} users · {counts.admin} admin · {counts.requestor} requestors · {counts.driver} drivers</p>
        </div>
        <button id="add-user-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="flex gap-1" style={{ marginBottom: '1.25rem' }}>
        {['all', 'admin', 'requestor', 'driver'].map(r => (
          <button key={r} className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRoleFilter(r)} style={{ textTransform: 'capitalize' }}>
            {r === 'all' ? `All (${users.length})` : `${r} (${counts[r] || 0})`}
          </button>
        ))}
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const RoleIcon = ROLE_CONFIG[u.role]?.icon || Users;
                const roleColor = ROLE_CONFIG[u.role]?.color || '#64748b';
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${roleColor}22`, border: `2px solid ${roleColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: roleColor, flexShrink: 0 }}>
                          {u.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: `${roleColor}15`, border: `1px solid ${roleColor}30`, borderRadius: '99px', padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, color: roleColor }}>
                        <RoleIcon size={11} />
                        {ROLE_CONFIG[u.role]?.label || u.role}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{u.department || '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(u)} title="Remove User">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <AddUserModal onClose={() => setShowModal(false)} onAdded={() => { setShowModal(false); loadUsers(); }} />}

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Remove User"
          message={`Are you sure you want to remove user "${deleteTarget.name}" (${deleteTarget.email})?`}
          confirmText="Yes, Remove"
          cancelText="Cancel"
          type="danger"
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
