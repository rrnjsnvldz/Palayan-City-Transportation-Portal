import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

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

  const notesMeta = parseScheduleFromNotes(r.notes);
  const dep = r.departure_time || r.requested_time || notesMeta.embedded_departure || '08:00';
  const arr = r.arrival_time || notesMeta.embedded_arrival || null;
  const duration = r.trip_duration || (dep && arr ? calculateTripDuration(dep, arr) : notesMeta.embedded_duration) || '';

  return {
    ...r,
    departure_time: dep,
    arrival_time: arr,
    trip_duration: duration,
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
  const {
    destination,
    purpose,
    department,
    pax_count,
    requested_date,
    departure_time,
    arrival_time,
    trip_duration,
    requested_time,
    notes
  } = req.body;

  const depTime = departure_time || requested_time || '08:00';
  const arrTime = arrival_time || null;
  const calcDuration = trip_duration || (depTime && arrTime ? calculateTripDuration(depTime, arrTime) : '');

  if (!destination || !purpose || !department || !requested_date || (!departure_time && !requested_time)) {
    return res.status(400).json({ error: 'Missing required fields (destination, purpose, department, date, departure time)' });
  }

  // Format notes with schedule metadata tag to guarantee persistence across all environments
  let cleanUserNotes = notes ? notes.trim() : '';
  let metadataTag = arrTime ? `[Schedule: Depart ${depTime} | Return ${arrTime} | Duration ${calcDuration}]` : '';
  let finalNotes = cleanUserNotes
    ? (metadataTag ? `${cleanUserNotes}\n\n${metadataTag}` : cleanUserNotes)
    : (metadataTag || null);

  let insertedData = null;

  try {
    const { data, error } = await supabase.from('requests')
      .insert({
        requestor_id: req.user.id,
        destination,
        purpose,
        department,
        pax_count: pax_count || 1,
        requested_date,
        requested_time: depTime,
        departure_time: depTime,
        arrival_time: arrTime,
        trip_duration: calcDuration,
        notes: cleanUserNotes || null,
      })
      .select().single();

    if (!error && data) {
      insertedData = data;
    } else {
      // Fallback in case columns do not exist in DB schema yet
      const { data: fbData, error: fbError } = await supabase.from('requests')
        .insert({
          requestor_id: req.user.id,
          destination,
          purpose,
          department,
          pax_count: pax_count || 1,
          requested_date,
          requested_time: depTime,
          notes: finalNotes,
        })
        .select().single();

      if (fbError) return res.status(500).json({ error: fbError.message });
      insertedData = fbData;
    }
  } catch (err) {
    const { data: fbData, error: fbError } = await supabase.from('requests')
      .insert({
        requestor_id: req.user.id,
        destination,
        purpose,
        department,
        pax_count: pax_count || 1,
        requested_date,
        requested_time: depTime,
        notes: finalNotes,
      })
      .select().single();

    if (fbError) return res.status(500).json({ error: fbError.message });
    insertedData = fbData;
  }

  const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
  if (admins) {
    const timeDetail = arrTime ? `${depTime} – ${arrTime} (${calcDuration})` : depTime;
    await Promise.all(admins.map(a => notifyUser(
      a.id,
      'New Transport Request',
      `${req.user.name} submitted a request to ${destination} on ${requested_date} [Depart: ${depTime}, Return: ${arrTime || 'N/A'}]`,
      'info'
    )));
  }
  res.status(201).json(await enrichRequest(insertedData));
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
