import { useState, useEffect } from 'react';
import { authApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Plus, Trash2, X, ShieldCheck, Car, Truck, User } from 'lucide-react';

const ROLE_CONFIG = {
  admin:     { icon: ShieldCheck, color: '#c9a84c', label: 'Admin' },
  requestor: { icon: Car,         color: '#3b82f6', label: 'Requestor' },
  driver:    { icon: Truck,       color: '#14b8a6', label: 'Driver' },
};

const DEPARTMENTS = [
  'City Administrator', 'City Planning Office', 'Health Department', 'Engineering Office',
  'Social Welfare', 'Motor Pool', 'Treasurer\'s Office', 'Human Resources', 'Other'
];

function AddUserModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', password: 'pass123', role: 'requestor', department: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) { toast({ type: 'warning', title: 'Fill all required fields' }); return; }
    setLoading(true);
    try {
      await authApi.createUser(form);
      toast({ type: 'success', title: 'User Created!' });
      onAdded();
    } catch (err) {
      toast({ type: 'error', title: 'Error', message: err.response?.data?.error });
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Add New User</h3>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input id="user-name" className="form-control" placeholder="Juan Dela Cruz" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input id="user-email" type="email" className="form-control" placeholder="user@palayan.gov.ph" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select id="user-role" className="form-control" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="requestor">Requestor</option>
                <option value="driver">Driver</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select id="user-dept" className="form-control" value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">-- Select --</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Initial Password *</label>
            <input id="user-password" type="text" className="form-control" value={form.password} onChange={e => set('password', e.target.value)} />
            <div className="form-hint">User should change this on first login</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="save-user" className={`btn btn-primary${loading ? ' btn-loading' : ''}`} onClick={handleAdd} disabled={loading}>
            {!loading && <><Plus size={16} /> Create User</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const { toast } = useToast();

  const loadUsers = () => { authApi.getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { loadUsers(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove user "${name}"?`)) return;
    try {
      await authApi.deleteUser(id);
      toast({ type: 'success', title: 'User removed' });
      loadUsers();
    } catch (err) { toast({ type: 'error', title: 'Error', message: err.response?.data?.error }); }
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
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const RoleIcon = ROLE_CONFIG[u.role]?.icon || User;
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
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id, u.name)}>
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
    </div>
  );
}
