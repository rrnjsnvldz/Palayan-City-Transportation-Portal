import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ToastContainer from './components/ToastContainer';
import BottomNav from './components/BottomNav';

import Login from './pages/Login';
import RequestorDashboard from './pages/dashboard/RequestorDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import DriverDashboard from './pages/dashboard/DriverDashboard';
import NewRequest from './pages/requests/NewRequest';
import RequestList from './pages/requests/RequestList';
import VehicleManagement from './pages/vehicles/VehicleManagement';
import FleetStatus from './pages/vehicles/FleetStatus';
import LiveMap from './pages/tracking/LiveMap';
import UserManagement from './pages/admin/UserManagement';
import TransportCalendar from './pages/calendar/TransportCalendar';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy-900)', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: 48, height: 48, border: '3px solid var(--border)', borderTop: '3px solid var(--gold-500)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === 'admin')  return <AdminDashboard />;
  if (user?.role === 'driver') return <DriverDashboard />;
  return <RequestorDashboard />;
}

function AppShell({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header title={title} onMenuClick={() => setSidebarOpen(o => !o)} />
        {children}
      </div>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={
            <ProtectedRoute><AppShell title="Dashboard"><DashboardRouter /></AppShell></ProtectedRoute>
          } />
          <Route path="/live-map" element={
            <ProtectedRoute><AppShell title="Live Map"><LiveMap /></AppShell></ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute><AppShell title="Transport Calendar"><TransportCalendar /></AppShell></ProtectedRoute>
          } />
          <Route path="/new-request" element={
            <ProtectedRoute roles={['requestor']}><AppShell title="New Request"><NewRequest /></AppShell></ProtectedRoute>
          } />
          <Route path="/my-requests" element={
            <ProtectedRoute roles={['requestor']}><AppShell title="My Requests"><RequestList /></AppShell></ProtectedRoute>
          } />
          <Route path="/fleet-status" element={
            <ProtectedRoute roles={['requestor']}><AppShell title="Fleet Status"><FleetStatus /></AppShell></ProtectedRoute>
          } />
          <Route path="/requests" element={
            <ProtectedRoute roles={['admin']}><AppShell title="All Requests"><RequestList /></AppShell></ProtectedRoute>
          } />
          <Route path="/vehicles" element={
            <ProtectedRoute roles={['admin']}><AppShell title="Vehicle Management"><VehicleManagement /></AppShell></ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute roles={['admin']}><AppShell title="User Management"><UserManagement /></AppShell></ProtectedRoute>
          } />
          <Route path="/my-trips" element={
            <ProtectedRoute roles={['driver']}><AppShell title="My Trips"><RequestList /></AppShell></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}
