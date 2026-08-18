import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Car, FileText, Users, Truck, Plus, Calendar } from 'lucide-react';

const ROLE_TABS = {
  requestor: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
    { to: '/my-requests',  icon: FileText,        label: 'Requests' },
    { to: '/calendar',     icon: Calendar,        label: 'Calendar' },
    { to: '/new-request',  icon: Plus,            label: 'New' },
    { to: '/fleet-status', icon: Car,             label: 'Fleet' },
  ],
  admin: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
    { to: '/requests',     icon: FileText,        label: 'Requests' },
    { to: '/calendar',     icon: Calendar,        label: 'Calendar' },
    { to: '/vehicles',     icon: Car,             label: 'Fleet' },
    { to: '/users',        icon: Users,           label: 'Users' },
  ],
  driver: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
    { to: '/my-trips',     icon: Truck,           label: 'My Trips' },
    { to: '/calendar',     icon: Calendar,        label: 'Calendar' },
  ],
};

export default function BottomNav() {
  const { user } = useAuth();
  const tabs = ROLE_TABS[user?.role] || [];

  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      <div className="bottom-nav-inner">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            aria-label={tab.label}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
