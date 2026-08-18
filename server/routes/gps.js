import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/gps/update — accepts GPS from Android/hardware/simulator
router.post('/update', async (req, res) => {
  const deviceKey = req.headers['x-device-key'];
  const DEVICE_API_KEY = process.env.GPS_DEVICE_KEY || 'gps_device_palayan_2026';

  const isDeviceAuth = deviceKey === DEVICE_API_KEY;
  const isBearerAuth = req.headers.authorization?.startsWith('Bearer ');
  if (!isDeviceAuth && !isBearerAuth) return res.status(401).json({ error: 'Authentication required' });

  const { vehicleId, lat, lng, speed = 0, fuel, heading = 0, status = 'moving' } = req.body;
  if (!vehicleId || lat === undefined || lng === undefined) return res.status(400).json({ error: 'vehicleId, lat, lng required' });

  const { data: vehicle } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single();
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  // Update vehicle — Supabase Realtime will broadcast this change to all frontend subscribers
  const { error: updateErr } = await supabase.from('vehicles').update({
    current_lat: lat,
    current_lng: lng,
    speed,
    fuel_level: fuel ?? vehicle.fuel_level,
    last_updated: new Date().toISOString(),
  }).eq('id', vehicleId);

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  // Log to gps_logs
  await supabase.from('gps_logs').insert({ vehicle_id: vehicleId, lat, lng, speed, fuel: fuel ?? vehicle.fuel_level, heading, status });

  res.json({ success: true, vehicleId });
});

// GET /api/gps/vehicles
router.get('/vehicles', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('vehicles').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/gps/history/:vehicleId
router.get('/history/:vehicleId', authenticate, async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const { data, error } = await supabase.from('gps_logs')
    .select('*')
    .eq('vehicle_id', req.params.vehicleId)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.reverse());
});

// GET /api/gps/notifications
router.get('/notifications', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('notifications')
    .select('*').eq('user_id', req.user.id)
    .order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/gps/notifications/:id/read
router.patch('/notifications/:id/read', authenticate, async (req, res) => {
  await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.user.id);
  res.json({ success: true });
});

// PATCH /api/gps/notifications/read-all
router.patch('/notifications/read-all', authenticate, async (req, res) => {
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', req.user.id);
  res.json({ success: true });
});

export default router;
