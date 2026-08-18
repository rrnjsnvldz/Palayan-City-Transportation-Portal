import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Car, Eye, EyeOff, MapPin, ShieldCheck, Truck, Wifi } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Admin',     email: 'admin@palayan.gov.ph',  password: 'admin123',  icon: ShieldCheck, color: '#c9a84c' },
  { label: 'Requestor', email: 'juan@palayan.gov.ph',   password: 'pass123',   icon: Car,         color: '#3b82f6' },
  { label: 'Driver',    email: 'manny@palayan.gov.ph',  password: 'driver123', icon: Truck,       color: '#14b8a6' },
];

const FEATURES = [
  { icon: Car,        title: 'Fleet Management',  desc: 'Real-time vehicle status and availability' },
  { icon: MapPin,     title: 'Live GPS Tracking', desc: 'Track vehicles on an interactive map' },
  { icon: Wifi,       title: 'Instant Updates',   desc: 'Live notifications via Supabase Realtime' },
  { icon: ShieldCheck,title: 'Role-Based Access', desc: 'Requestor, Driver, and Admin portals' },
];

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast({ type: 'warning', title: 'Enter your credentials' }); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      toast({ type: 'error', title: 'Login Failed', message: err.response?.data?.error || 'Invalid credentials' });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc) => { setEmail(acc.email); setPassword(acc.password); };

  return (
    <div className="login-page">
      {/* Left panel — hidden on mobile/tablet */}
      <div className="login-left">
        <div className="login-brand">
          <div className="seal" aria-hidden="true">🏛️</div>
          <h1>City of Palayan<br />Transportation Portal</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Centralized government vehicle management<br />for the City of Palayan, Nueva Ecija
          </p>
        </div>

        <div className="login-features">
          {FEATURES.map(f => (
            <div className="login-feature" key={f.title}>
              <div className="login-feature-icon"><f.icon size={18} color="var(--gold-400)" /></div>
              <div className="login-feature-text">
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: '2.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          © 2026 City Government of Palayan · Powered by Supabase + Vercel
        </p>
      </div>

      {/* Right panel — form */}
      <div className="login-right">
        <div className="login-form-card slide-up">
          {/* Mobile-only logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}
               className="mobile-only-header">
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,var(--gold-500),var(--gold-300))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Car size={20} color="#070f1f" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--gold-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>City of Palayan</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '0.95rem' }}>Transport Portal</div>
            </div>
          </div>

          <h2>Welcome back</h2>
          <p style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>Sign in to access the transportation system</p>

          {/* Demo quick-fill buttons */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Demo Accounts
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {DEMO_ACCOUNTS.map(a => (
                <button
                  key={a.label}
                  type="button"
                  id={`demo-${a.label.toLowerCase()}`}
                  onClick={() => fillDemo(a)}
                  style={{
                    flex: 1, minWidth: 80,
                    padding: '0.45rem 0.625rem',
                    background: `${a.color}12`,
                    border: `1px solid ${a.color}30`,
                    borderRadius: 'var(--radius-md)',
                    color: a.color,
                    fontSize: '0.72rem', fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                    transition: 'var(--transition)',
                    fontFamily: 'Inter',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = `${a.color}22`}
                  onMouseOut={e => e.currentTarget.style.background = `${a.color}12`}
                >
                  <a.icon size={12} /> {a.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} id="login-form" noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="you@palayan.gov.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-btn"
              type="submit"
              className={`btn btn-primary btn-full btn-lg${loading ? ' btn-loading' : ''}`}
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              {!loading && 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            © 2026 City Government of Palayan<br />
            For access issues, contact the City Administrator
          </p>
        </div>
      </div>
    </div>
  );
}
