import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

async function enrichRequest(r) {
  const { data: requestor } = await supabase
    .from('users').select('id, name, email, department').eq('id', r.requestor_id).single();
  const { data: assignment } = await supabase
    .from('assignments')
    .select(`*, driver:users!assignments_driver_id_fkey(name, email), vehicle:vehicles(name, plate_no, type)`)
    .eq('request_id', r.id)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ...r,
    requestor: requestor || null,
    assignment: assignment
      ? {
          ...assignment,
          driver_name: assignment.driver?.name,
          vehicle_name: assignment.vehicle?.name,
          plate_no: assignment.vehicle?.plate_no,
          vehicle_type: assignment.vehicle?.type,
        }
      : null,
  };
}

async function notifyUser(user_id, title, message, type = 'info') {
  await supabase.from('notifications').insert({ user_id, title, message, type });
}

// GET /api/requests
router.get('/', authenticate, async (req, res) => {
  let query = supabase.from('requests').select('*').order('created_at', { ascending: false });
  if (req.user.role === 'requestor') query = query.eq('requestor_id', req.user.id);
  else if (req.user.role === 'driver') {
    const { data: assigns } = await supabase.from('assignments').select('request_id').eq('driver_id', req.user.id);
    const ids = assigns?.map(a => a.request_id) || [];
    if (ids.length === 0) return res.json([]);
    query = query.in('id', ids);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const enriched = await Promise.all(data.map(enrichRequest));
  res.json(enriched);
});

// GET /api/requests/stats/summary
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const [pending, approved, inProgress, completed, denied, available, inUse, maintenance] = await Promise.all([
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'denied'),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('status', 'available'),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('status', 'in_use'),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('status', 'maintenance'),
      ]);
      return res.json({
        pending: pending.count || 0, approved: approved.count || 0,
        inProgress: inProgress.count || 0, completed: completed.count || 0, denied: denied.count || 0,
        available: available.count || 0, inUse: inUse.count || 0, maintenance: maintenance.count || 0,
      });
    } else if (req.user.role === 'requestor') {
      const uid = req.user.id;
      const [total, pending, approved, completed, available] = await Promise.all([
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('requestor_id', uid),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('requestor_id', uid).eq('status', 'pending'),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('requestor_id', uid).eq('status', 'approved'),
        supabase.from('requests').select('id', { count: 'exact', head: true }).eq('requestor_id', uid).eq('status', 'completed'),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('status', 'available'),
      ]);
      return res.json({
        total: total.count || 0, pending: pending.count || 0,
        approved: approved.count || 0, completed: completed.count || 0, available: available.count || 0,
      });
    } else if (req.user.role === 'driver') {
      const today = new Date().toISOString().split('T')[0];
      const { data: assigns } = await supabase.from('assignments').select('request_id, ended_at').eq('driver_id', req.user.id);
      const requestIds = assigns?.map(a => a.request_id) || [];
      const totalTrips = assigns?.filter(a => a.ended_at).length || 0;

      let todayTrips = 0;
      if (requestIds.length > 0) {
        const { count } = await supabase.from('requests').select('id', { count: 'exact', head: true })
          .in('id', requestIds).eq('requested_date', today);
        todayTrips = count || 0;
      }

      const { data: activeTrip } = requestIds.length > 0
        ? await supabase.from('requests').select(`*, assignments(id, vehicle_id, vehicles(name, plate_no))`)
            .in('id', requestIds).eq('status', 'in_progress').limit(1).maybeSingle()
        : { data: null };

      return res.json({ todayTrips, totalTrips, activeTrip: activeTrip || null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/requests/:id
router.get('/:id', authenticate, async (req, res) => {
  const { data: r, error } = await supabase.from('requests').select('*').eq('id', req.params.id).single();
  if (error || !r) return res.status(404).json({ error: 'Request not found' });
  if (req.user.role === 'requestor' && r.requestor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json(await enrichRequest(r));
});

// POST /api/requests
router.post('/', authenticate, requireRole('requestor'), async (req, res) => {
  const { destination, purpose, department, pax_count, requested_date, requested_time, notes } = req.body;
  if (!destination || !purpose || !department || !requested_date || !requested_time)
    return res.status(400).json({ error: 'Missing required fields' });

  const { data, error } = await supabase.from('requests')
    .insert({ requestor_id: req.user.id, destination, purpose, department, pax_count: pax_count || 1, requested_date, requested_time, notes: notes || null })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });

  const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
  if (admins) {
    await Promise.all(admins.map(a => notifyUser(a.id, 'New Transport Request', `${req.user.name} submitted a request to ${destination}`, 'info')));
  }
  res.status(201).json(await enrichRequest(data));
});

// PATCH /api/requests/:id/approve
router.patch('/:id/approve', authenticate, requireRole('admin'), async (req, res) => {
  const { data: r } = await supabase.from('requests').select('*').eq('id', req.params.id).single();
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (r.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be approved' });

  const { data, error } = await supabase.from('requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', r.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await notifyUser(r.requestor_id, 'Request Approved ✅', `Your request to ${r.destination} has been approved!`, 'success');
  res.json(await enrichRequest(data));
});

// PATCH /api/requests/:id/deny
router.patch('/:id/deny', authenticate, requireRole('admin'), async (req, res) => {
  const { reason } = req.body;
  const { data: r } = await supabase.from('requests').select('*').eq('id', req.params.id).single();
  if (!r) return res.status(404).json({ error: 'Not found' });

  const { data, error } = await supabase.from('requests')
    .update({ status: 'denied', denial_reason: reason || 'No reason provided', updated_at: new Date().toISOString() })
    .eq('id', r.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await notifyUser(r.requestor_id, 'Request Denied', `Your request to ${r.destination} was denied. ${reason ? 'Reason: ' + reason : ''}`, 'warning');
  res.json(await enrichRequest(data));
});

// PATCH /api/requests/:id/cancel
router.patch('/:id/cancel', authenticate, requireRole('requestor'), async (req, res) => {
  const { data: r } = await supabase.from('requests').select('*').eq('id', req.params.id).single();
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (r.requestor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (!['pending', 'approved'].includes(r.status)) return res.status(400).json({ error: 'Cannot cancel' });

  const { data, error } = await supabase.from('requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', r.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(await enrichRequest(data));
});

export default router;
