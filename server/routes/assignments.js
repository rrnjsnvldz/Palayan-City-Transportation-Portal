import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

async function notifyUser(user_id, title, message, type = 'info') {
  await supabase.from('notifications').insert({ user_id, title, message, type });
}

// POST /api/assignments
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { request_id, driver_id, vehicle_id } = req.body;
  if (!request_id || !driver_id || !vehicle_id) return res.status(400).json({ error: 'request_id, driver_id, vehicle_id required' });

  const { data: request } = await supabase.from('requests').select('*').eq('id', request_id).single();
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (!['approved', 'pending'].includes(request.status)) return res.status(400).json({ error: 'Request must be approved or pending' });

  const { data: vehicle } = await supabase.from('vehicles').select('*').eq('id', vehicle_id).single();
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  // Remove old assignment
  await supabase.from('assignments').delete().eq('request_id', request_id);

  const { data, error } = await supabase.from('assignments')
    .insert({ request_id, driver_id, vehicle_id })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (request.status === 'pending') {
    await supabase.from('requests').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', request_id);
  }

  await notifyUser(driver_id, 'Trip Assignment 🚗', `You are assigned to drive to ${request.destination} on ${request.requested_date}`, 'info');
  await notifyUser(request.requestor_id, 'Driver & Vehicle Assigned', `${vehicle.name} (${vehicle.plate_no}) assigned to your request`, 'success');

  res.status(201).json(data);
});

function calculateTripDuration(depTime, arrTime) {
  if (!depTime || !arrTime) return '';
  const d = depTime.toString().split(':');
  const a = arrTime.toString().split(':');
  if (d.length < 2 || a.length < 2) return '';
  const depM = parseInt(d[0], 10) * 60 + parseInt(d[1], 10);
  const arrM = parseInt(a[0], 10) * 60 + parseInt(a[1], 10);
  if (isNaN(depM) || isNaN(arrM)) return '';
  const diff = arrM - depM;
  if (diff <= 0) return '';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h} hr${h > 1 ? 's' : ''} ${m} min${m > 1 ? 's' : ''}`;
  if (h > 0) return `${h} hr${h > 1 ? 's' : ''}`;
  if (m > 0) return `${m} min${m > 1 ? 's' : ''}`;
  return '0 mins';
}

function parseScheduleFromNotes(notes) {
  if (!notes) return { embedded_departure: null, embedded_arrival: null, embedded_duration: null };
  const match = notes.match(/\[Schedule:\s*Depart\s*([0-9:]+(?:\s*[AP]M)?)\s*\|\s*Return\s*([0-9:]+(?:\s*[AP]M)?)\s*\|\s*Duration\s*([^\]]+)\]/i);
  if (match) {
    return {
      embedded_departure: match[1]?.trim() || null,
      embedded_arrival: match[2]?.trim() || null,
      embedded_duration: match[3]?.trim() || null,
    };
  }
  return { embedded_departure: null, embedded_arrival: null, embedded_duration: null };
}

// GET /api/assignments
router.get('/', authenticate, async (req, res) => {
  let query = supabase.from('assignments').select(`
    *,
    request:requests(*),
    driver:users!assignments_driver_id_fkey(name, email),
    vehicle:vehicles(name, plate_no, type, capacity, fuel_level)
  `).order('assigned_at', { ascending: false });

  if (req.user.role === 'driver') query = query.eq('driver_id', req.user.id);
  else if (req.user.role === 'requestor') return res.json([]);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Flatten for frontend consumption
  const flat = data.map(a => {
    const r = a.request || {};
    const notesMeta = parseScheduleFromNotes(r.notes);
    const dep = r.departure_time || r.requested_time || notesMeta.embedded_departure || '08:00';
    const arr = r.arrival_time || notesMeta.embedded_arrival || null;
    const duration = r.trip_duration || (dep && arr ? calculateTripDuration(dep, arr) : notesMeta.embedded_duration) || '';

    return {
      ...a,
      destination:    r.destination,
      purpose:        r.purpose,
      requested_date: r.requested_date,
      requested_time: dep,
      departure_time: dep,
      arrival_time:   arr,
      trip_duration:  duration,
      request_status: r.status,
      pax_count:      r.pax_count,
      notes:          r.notes,
      requestor_id:   r.requestor_id,
      driver_name:    a.driver?.name,
      vehicle_name:   a.vehicle?.name,
      plate_no:       a.vehicle?.plate_no,
      vehicle_type:   a.vehicle?.type,
      capacity:       a.vehicle?.capacity,
      fuel_level:     a.vehicle?.fuel_level,
    };
  });
  res.json(flat);
});

// PATCH /api/assignments/:id/start
router.patch('/:id/start', authenticate, requireRole('driver'), async (req, res) => {
  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', req.params.id).single();
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  if (assignment.driver_id !== req.user.id) return res.status(403).json({ error: 'Not your assignment' });
  if (assignment.started_at) return res.status(400).json({ error: 'Already started' });

  const { data: vehicle } = await supabase.from('vehicles').select('*').eq('id', assignment.vehicle_id).single();

  await supabase.from('assignments').update({ started_at: new Date().toISOString(), start_odometer: vehicle?.odometer || 0, start_fuel: vehicle?.fuel_level || 100 }).eq('id', assignment.id);
  await supabase.from('vehicles').update({ status: 'in_use', last_updated: new Date().toISOString() }).eq('id', assignment.vehicle_id);
  await supabase.from('requests').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', assignment.request_id);

  const { data: request } = await supabase.from('requests').select('requestor_id, destination').eq('id', assignment.request_id).single();
  if (request) await notifyUser(request.requestor_id, 'Trip Started 🚀', `Your transport to ${request.destination} is now en route!`, 'success');

  res.json({ success: true, started_at: new Date().toISOString() });
});

// PATCH /api/assignments/:id/end
router.patch('/:id/end', authenticate, requireRole('driver'), async (req, res) => {
  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', req.params.id).single();
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  if (assignment.driver_id !== req.user.id) return res.status(403).json({ error: 'Not your assignment' });
  if (!assignment.started_at) return res.status(400).json({ error: 'Not started' });
  if (assignment.ended_at) return res.status(400).json({ error: 'Already ended' });

  const { end_odometer, end_fuel } = req.body;
  await supabase.from('assignments').update({ ended_at: new Date().toISOString(), end_odometer: end_odometer || null, end_fuel: end_fuel || null }).eq('id', assignment.id);
  await supabase.from('vehicles').update({ status: 'available', last_updated: new Date().toISOString() }).eq('id', assignment.vehicle_id);
  await supabase.from('requests').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', assignment.request_id);

  const { data: request } = await supabase.from('requests').select('requestor_id, destination').eq('id', assignment.request_id).single();
  if (request) await notifyUser(request.requestor_id, 'Trip Completed ✅', `Your transport to ${request.destination} is complete. Thank you!`, 'success');

  res.json({ success: true, ended_at: new Date().toISOString() });
});

export default router;
