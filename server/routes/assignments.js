import express from 'express';
import { supabase } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

async function notifyUser(user_id, title, message, type = 'info') {
  await supabase.from('notifications').insert({ user_id, title, message, type });
}

// POST /api/assignments — admin creates or replaces an assignment for a request
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { request_id, driver_id, vehicle_id } = req.body;
  if (!request_id || !driver_id || !vehicle_id) {
    return res.status(400).json({ error: 'request_id, driver_id, and vehicle_id are required' });
  }

  // Remove any existing assignment for this request (re-assignment support)
  await supabase.from('assignments').delete().eq('request_id', request_id);

  const { data, error } = await supabase
    .from('assignments')
    .insert({ request_id, driver_id, vehicle_id, trip_stage: 'scheduled' })
    .select()
    .single();

  if (error) {
    // If trip_stage column doesn't exist yet, insert without it
    const fallback = await supabase
      .from('assignments')
      .insert({ request_id, driver_id, vehicle_id })
      .select()
      .single();
    if (fallback.error) return res.status(500).json({ error: fallback.error.message });
  }

  // Update request status to 'approved'
  await supabase.from('requests').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', request_id);

  // Notify driver & requestor
  const { data: request } = await supabase.from('requests').select('*, requestor:requestor_id(name)').eq('id', request_id).single();
  const { data: vehicle } = await supabase.from('vehicles').select('*').eq('id', vehicle_id).single();

  if (request && vehicle) {
    await notifyUser(driver_id, 'Trip Assignment 🚗', `You are assigned to drive to ${request.destination} on ${request.requested_date}`, 'info');
    await notifyUser(request.requestor_id, 'Driver & Vehicle Assigned', `${vehicle.name} (${vehicle.plate_no}) assigned to your request`, 'success');
  }

  res.status(201).json(data || { success: true });
});

// GET /api/assignments
router.get('/', authenticate, async (req, res) => {
  let query = supabase.from('assignments').select(`
    *,
    driver:driver_id(id, name, email, phone),
    vehicle:vehicle_id(id, plate_no, name, type, capacity, fuel_level, status),
    request:request_id(id, destination, purpose, requested_date, requested_time, departure_time, arrival_time, trip_duration, pax_count, status, department)
  `).order('id', { ascending: false });

  if (req.user.role === 'driver') {
    query = query.eq('driver_id', req.user.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const flat = (data || []).map(a => {
    return {
      id:             a.id,
      request_id:     a.request_id,
      driver_id:      a.driver_id,
      vehicle_id:     a.vehicle_id,
      assigned_at:    a.assigned_at,
      started_at:     a.started_at,
      arrived_at:     a.arrived_at,
      departed_destination_at: a.departed_destination_at,
      ended_at:       a.ended_at,
      trip_stage:     a.trip_stage || (a.ended_at ? 'completed' : a.departed_destination_at ? 'returning' : a.arrived_at ? 'arrived' : a.started_at ? 'en_route' : 'scheduled'),
      start_odometer: a.start_odometer,
      end_odometer:   a.end_odometer,
      destination:    a.request?.destination,
      purpose:        a.request?.purpose,
      requested_date: a.request?.requested_date,
      requested_time: a.request?.requested_time,
      departure_time: a.request?.departure_time || a.request?.requested_time,
      arrival_time:   a.request?.arrival_time,
      trip_duration:  a.request?.trip_duration,
      pax_count:      a.request?.pax_count,
      department:     a.request?.department,
      request_status: a.request?.status,
      driver_name:    a.driver?.name,
      driver_email:   a.driver?.email,
      vehicle_name:   a.vehicle?.name,
      plate_no:       a.vehicle?.plate_no,
      vehicle_type:   a.vehicle?.type,
      capacity:       a.vehicle?.capacity,
      fuel_level:     a.vehicle?.fuel_level,
    };
  });
  res.json(flat);
});

// PATCH /api/assignments/:id/start — Stage 1: Depart City Hall / Start Travel
router.patch('/:id/start', authenticate, requireRole('driver'), async (req, res) => {
  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', req.params.id).single();
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  if (assignment.driver_id !== req.user.id) return res.status(403).json({ error: 'Not your assignment' });
  if (assignment.started_at) return res.status(400).json({ error: 'Already started' });

  const now = new Date().toISOString();
  const { data: vehicle } = await supabase.from('vehicles').select('*').eq('id', assignment.vehicle_id).single();

  await supabase.from('assignments').update({
    started_at: now,
    trip_stage: 'en_route_to_destination',
    start_odometer: vehicle?.odometer || 0
  }).eq('id', assignment.id);

  await supabase.from('vehicles').update({ status: 'in_use', last_updated: now }).eq('id', assignment.vehicle_id);
  await supabase.from('requests').update({ status: 'in_progress', updated_at: now }).eq('id', assignment.request_id);

  const { data: request } = await supabase.from('requests').select('requestor_id, destination').eq('id', assignment.request_id).single();
  if (request) await notifyUser(request.requestor_id, 'Trip Started 🚀', `Your transport to ${request.destination} has departed City Hall and is en route!`, 'success');

  res.json({ success: true, started_at: now, trip_stage: 'en_route_to_destination' });
});

// PATCH /api/assignments/:id/arrive-destination — Stage 2: Arrived at Destination / Pickup Point
router.patch('/:id/arrive-destination', authenticate, requireRole('driver'), async (req, res) => {
  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', req.params.id).single();
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  if (assignment.driver_id !== req.user.id) return res.status(403).json({ error: 'Not your assignment' });
  if (!assignment.started_at) return res.status(400).json({ error: 'Trip has not started yet' });

  const now = new Date().toISOString();
  await supabase.from('assignments').update({
    arrived_at: now,
    trip_stage: 'arrived_at_destination'
  }).eq('id', assignment.id);

  const { data: request } = await supabase.from('requests').select('requestor_id, destination').eq('id', assignment.request_id).single();
  if (request) await notifyUser(request.requestor_id, 'Driver Arrived 📍', `Vehicle has arrived at ${request.destination} for passenger pickup/activity!`, 'info');

  res.json({ success: true, arrived_at: now, trip_stage: 'arrived_at_destination' });
});

// PATCH /api/assignments/:id/depart-destination — Stage 3: Depart Destination (Return to City Hall)
router.patch('/:id/depart-destination', authenticate, requireRole('driver'), async (req, res) => {
  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', req.params.id).single();
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  if (assignment.driver_id !== req.user.id) return res.status(403).json({ error: 'Not your assignment' });

  const now = new Date().toISOString();
  await supabase.from('assignments').update({
    departed_destination_at: now,
    trip_stage: 'returning_to_city_hall'
  }).eq('id', assignment.id);

  const { data: request } = await supabase.from('requests').select('requestor_id, destination').eq('id', assignment.request_id).single();
  if (request) await notifyUser(request.requestor_id, 'Return Trip Started 🛬', `Vehicle has departed ${request.destination} and is heading back to Palayan City Hall.`, 'info');

  res.json({ success: true, departed_destination_at: now, trip_stage: 'returning_to_city_hall' });
});

// PATCH /api/assignments/:id/end — Stage 4: End Transportation (Arrived at City Hall)
router.patch('/:id/end', authenticate, requireRole('driver'), async (req, res) => {
  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', req.params.id).single();
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  if (assignment.driver_id !== req.user.id) return res.status(403).json({ error: 'Not your assignment' });
  if (!assignment.started_at) return res.status(400).json({ error: 'Not started' });
  if (assignment.ended_at) return res.status(400).json({ error: 'Already ended' });

  const now = new Date().toISOString();
  const { end_odometer, end_fuel } = req.body;
  await supabase.from('assignments').update({
    ended_at: now,
    trip_stage: 'completed',
    end_odometer: end_odometer || null,
    end_fuel: end_fuel || null
  }).eq('id', assignment.id);

  await supabase.from('vehicles').update({ status: 'available', last_updated: now }).eq('id', assignment.vehicle_id);
  await supabase.from('requests').update({ status: 'completed', updated_at: now }).eq('id', assignment.request_id);

  const { data: request } = await supabase.from('requests').select('requestor_id, destination').eq('id', assignment.request_id).single();
  if (request) await notifyUser(request.requestor_id, 'Trip Completed ✅', `Your transport to ${request.destination} has safely returned to City Hall. Transportation completed!`, 'success');

  res.json({ success: true, ended_at: now, trip_stage: 'completed' });
});

export default router;
