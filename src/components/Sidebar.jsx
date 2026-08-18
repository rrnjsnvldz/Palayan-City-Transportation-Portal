import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Car, FileText, Users, Truck, ClipboardList,
  LogOut, ShieldCheck, X, Calendar, AlertTriangle
} from 'lucide-react';

const ROLE_NAVS = {
  requestor: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/my-requests',  icon: FileText,        label: 'My Requests' },
    { to: '/calendar',     icon: Calendar,        label: 'Calendar' },
    { to: '/new-request',  icon: ClipboardList,   label: 'New Request' },
    { to: '/fleet-status', icon: Car,             label: 'Fleet Status' },
  ],
  admin: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/requests',     icon: FileText,        label: 'All Requests' },
    { to: '/calendar',     icon: Calendar,        label: 'Calendar' },
    { to: '/vehicles',     icon: Car,             label: 'Vehicles' },
    { to: '/users',        icon: Users,           label: 'Users' },
  ],
  driver: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/my-trips',     icon: Truck,           label: 'My Trips' },
    { to: '/calendar',     icon: Calendar,        label: 'Calendar' },
  ],
};

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function LogoutConfirmModal({ user, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 400 }}>
      <div className="modal" style={{ maxWidth: 420, textAlign: 'center', padding: '1.75rem 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1.5px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-red)',
            marginBottom: '1rem',
            boxShadow: '0 0 24px rgba(239, 68, 68, 0.2)'
          }}>
            <LogOut size={26} />
          </div>

          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'Montserrat', fontWeight: 800 }}>
            Sign Out Confirmation
          </h3>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
            Are you sure you want to sign out, <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>? You will need to sign in again to access the portal.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              id="confirm-logout-btn"
              className="btn btn-danger"
              onClick={onConfirm}
              style={{ flex: 1 }}
            >
              <LogOut size={15} /> Yes, Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navItems = ROLE_NAVS[user?.role] || [];

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
    onClose?.();
  };

  const handleNav = () => onClose?.();

  return (
    <>
      {/* Overlay (tablet) */}
      <div
        className={`sidebar-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Car size={18} color="#070f1f" strokeWidth={2.5} />
          </div>
          <div className="sidebar-logo-text">
            <span>City of Palayan</span>
            <strong>Transport Portal</strong>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={14} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" role="navigation">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNav}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <item.icon size={17} className="nav-icon" />
              {item.label}
            </NavLink>
          ))}

          <hr className="divider" style={{ margin: '0.75rem 1.25rem' }} />

          <div className="sidebar-section-label">Account</div>
          <div className="nav-item" style={{ opacity: 0.65, cursor: 'default', fontSize: '0.78rem' }}>
            {user?.role === 'admin'     && <ShieldCheck size={17} className="nav-icon" />}
            {user?.role === 'requestor' && <FileText    size={17} className="nav-icon" />}
            {user?.role === 'driver'    && <Truck       size={17} className="nav-icon" />}
            <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
          </div>
        </nav>

        {/* User Footer */}
        <div className="sidebar-user">
          <div className="user-avatar" aria-hidden="true">{getInitials(user?.name)}</div>
          <div className="user-info">
            <strong title={user?.name}>{user?.name}</strong>
            <span>{user?.department || user?.role}</span>
          </div>
          <button
            id="sidebar-logout-btn"
            className="logout-btn"
            onClick={handleLogoutClick}
            title="Sign Out"
            aria-label="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <LogoutConfirmModal
          user={user}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
        />
      )}
    </>
  );
}
