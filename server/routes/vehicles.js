import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('vehicles').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/available/list', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('vehicles').select('*').eq('status', 'available').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(data);
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { plate_no, name, type, capacity, status, fuel_level, current_lat, current_lng } = req.body;
  if (!plate_no || !name || !type) return res.status(400).json({ error: 'plate_no, name, type required' });

  const { data, error } = await supabase
    .from('vehicles')
    .insert({ plate_no, name, type, capacity: capacity || 5, status: status || 'available', fuel_level: fuel_level ?? 100, current_lat: current_lat || null, current_lng: current_lng || null })
    .select().single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Plate number already exists' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { plate_no, name, type, capacity, status, fuel_level } = req.body;
  const { data, error } = await supabase
    .from('vehicles')
    .update({ plate_no, name, type, capacity, status, fuel_level, last_updated: new Date().toISOString() })
    .eq('id', req.params.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  await supabase.from('vehicles').delete().eq('id', req.params.id);
  res.json({ success: true });
});

export default router;
