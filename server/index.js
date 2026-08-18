import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import requestRoutes from './routes/requests.js';
import assignmentRoutes from './routes/assignments.js';
import gpsRoutes from './routes/gps.js';

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  // Add your Vercel domain here after deploying:
  // 'https://palayan-transport.vercel.app',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// ── Request logger (dev only) ────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/vehicles',    vehicleRoutes);
app.use('/api/requests',    requestRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/gps',         gpsRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'City of Palayan Transportation Portal',
    version: '2.0.0',
    database: 'Supabase PostgreSQL',
    realtime: 'Supabase Realtime',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 & Error handlers ──────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.path} not found` }));
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Local dev server (not used in Vercel) ────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   City of Palayan Transportation Portal v2     ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║   REST API:  http://localhost:${PORT}/api           ║`);
    console.log(`║   DB:        Supabase PostgreSQL               ║`);
    console.log(`║   Realtime:  Supabase Realtime                 ║`);
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║   GPS POST:  /api/gps/update                   ║');
    console.log('║   GPS Key:   X-Device-Key header               ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
  });
}

// Export for Vercel serverless
export default app;
