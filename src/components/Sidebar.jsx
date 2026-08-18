import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Car, FileText, Users, Truck, ClipboardList, LogOut, ShieldCheck, X } from 'lucide-react';

const ROLE_NAVS = {
  requestor: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/my-requests',  icon: FileText,        label: 'My Requests' },
    { to: '/new-request',  icon: ClipboardList,   label: 'New Request' },
    { to: '/fleet-status', icon: Car,             label: 'Fleet Status' },
  ],
  admin: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/requests',     icon: FileText,        label: 'All Requests' },
    { to: '/vehicles',     icon: Car,             label: 'Vehicles' },
    { to: '/users',        icon: Users,           label: 'Users' },
  ],
  driver: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/my-trips',     icon: Truck,           label: 'My Trips' },
  ],
};

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = ROLE_NAVS[user?.role] || [];

  const handleLogout = () => { logout(); navigate('/login'); onClose?.(); };
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
          <button className="logout-btn" onClick={handleLogout} title="Logout" aria-label="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}
