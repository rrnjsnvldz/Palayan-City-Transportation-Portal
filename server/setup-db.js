/**
 * Setup script — runs schema SQL statements on Supabase
 * Usage: node setup-db.js
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function runSetup() {
  console.log('\n🔌 Connecting to Supabase...');
  console.log('   URL:', process.env.SUPABASE_URL);

  // ── 1. Test connection ──────────────────────────────────────
  const { error: pingErr } = await sb.from('users').select('id').limit(1);
  if (pingErr?.code === '42P01') {
    console.log('⚠️  Tables not found — they need to be created via SQL Editor first.');
    console.log('');
    console.log('📋 Open Supabase SQL Editor and run the file:');
    console.log('   C:\\Users\\User\\.gemini\\antigravity-ide\\scratch\\palayan-transport\\supabase\\schema.sql');
    console.log('   Then run: supabase\\seed.sql');
    console.log('');
    console.log('🔗 SQL Editor: https://supabase.com/dashboard/project/dthwxvgikdaqsmyrtrkt/sql');
    process.exit(0);
  }

  if (pingErr) {
    console.error('❌ Connection error:', pingErr.message);
    process.exit(1);
  }

  console.log('✅ Connected to Supabase!\n');

  // ── 2. Check existing data ──────────────────────────────────
  const { count: userCount }    = await sb.from('users').select('*', { count: 'exact', head: true });
  const { count: vehicleCount } = await sb.from('vehicles').select('*', { count: 'exact', head: true });
  const { count: reqCount }     = await sb.from('requests').select('*', { count: 'exact', head: true });

  console.log('📊 Current Database:');
  console.log(`   Users:    ${userCount ?? 0}`);
  console.log(`   Vehicles: ${vehicleCount ?? 0}`);
  console.log(`   Requests: ${reqCount ?? 0}`);

  // ── 3. Seed if empty ────────────────────────────────────────
  if (userCount === 0) {
    console.log('\n🌱 Seeding demo data...');
    const bcrypt = await import('bcryptjs');

    const users = [
      { name: 'Administrator',  email: 'admin@palayan.gov.ph',  password: bcrypt.hashSync('admin123', 10), role: 'admin',     department: 'City Administrator' },
      { name: 'Juan Dela Cruz', email: 'juan@palayan.gov.ph',   password: bcrypt.hashSync('pass123',  10), role: 'requestor', department: 'City Planning Office' },
      { name: 'Maria Santos',   email: 'maria@palayan.gov.ph',  password: bcrypt.hashSync('pass123',  10), role: 'requestor', department: 'Health Department' },
      { name: 'Pedro Reyes',    email: 'pedro@palayan.gov.ph',  password: bcrypt.hashSync('pass123',  10), role: 'requestor', department: 'Engineering Office' },
      { name: 'Manny Lopez',    email: 'manny@palayan.gov.ph',  password: bcrypt.hashSync('driver123',10), role: 'driver',    department: 'Motor Pool' },
      { name: 'Ben Aquino',     email: 'ben@palayan.gov.ph',    password: bcrypt.hashSync('driver123',10), role: 'driver',    department: 'Motor Pool' },
      { name: 'Carlo Ramos',    email: 'carlo@palayan.gov.ph',  password: bcrypt.hashSync('driver123',10), role: 'driver',    department: 'Motor Pool' },
    ];

    const { error: uErr } = await sb.from('users').insert(users);
    if (uErr) { console.error('   ❌ Users:', uErr.message); }
    else        console.log('   ✅ Users seeded (7)');

    const vehicles = [
      { plate_no: 'NE-1001', name: 'City Van 1',    type: 'Van',       capacity: 12, status: 'available',   fuel_level: 85, current_lat: 15.5413, current_lng: 121.1082 },
      { plate_no: 'NE-1002', name: 'City Van 2',    type: 'Van',       capacity: 12, status: 'available',   fuel_level: 72, current_lat: 15.5420, current_lng: 121.1091 },
      { plate_no: 'NE-1003', name: 'SUV Patrol',    type: 'SUV',       capacity: 7,  status: 'available',   fuel_level: 90, current_lat: 15.5405, current_lng: 121.1074 },
      { plate_no: 'NE-1004', name: 'Pick-up Truck', type: 'Pickup',    capacity: 5,  status: 'maintenance', fuel_level: 60, current_lat: 15.5398, current_lng: 121.1066 },
      { plate_no: 'NE-1005', name: 'Ambulance 1',   type: 'Ambulance', capacity: 4,  status: 'available',   fuel_level: 95, current_lat: 15.5430, current_lng: 121.1100 },
      { plate_no: 'NE-1006', name: 'Sedan 1',       type: 'Sedan',     capacity: 5,  status: 'available',   fuel_level: 78, current_lat: 15.5415, current_lng: 121.1085 },
    ];

    const { error: vErr } = await sb.from('vehicles').insert(vehicles);
    if (vErr) { console.error('   ❌ Vehicles:', vErr.message); }
    else        console.log('   ✅ Vehicles seeded (6)');

    // Fetch user IDs for requests
    const { data: dbUsers } = await sb.from('users').select('id, email');
    const uid = (email) => dbUsers?.find(u => u.email === email)?.id;

    const requests = [
      { requestor_id: uid('juan@palayan.gov.ph'),  destination: 'Nueva Ecija University',   purpose: 'Student Site Visit',       department: 'City Planning Office', pax_count: 8, requested_date: '2026-08-20', requested_time: '08:00', status: 'pending',     notes: 'Please prepare a van' },
      { requestor_id: uid('maria@palayan.gov.ph'), destination: 'Cabanatuan City Hospital',  purpose: 'Medical Consultation',     department: 'Health Department',    pax_count: 3, requested_date: '2026-08-19', requested_time: '09:00', status: 'approved',    notes: null },
      { requestor_id: uid('pedro@palayan.gov.ph'), destination: 'Pantabangan Dam',           purpose: 'Infrastructure Inspection',department: 'Engineering Office',   pax_count: 5, requested_date: '2026-08-21', requested_time: '07:00', status: 'in_progress', notes: null },
      { requestor_id: uid('juan@palayan.gov.ph'),  destination: 'Manila NEDA Office',        purpose: 'Budget Coordination',      department: 'City Planning Office', pax_count: 2, requested_date: '2026-08-18', requested_time: '06:00', status: 'completed',   notes: null },
      { requestor_id: uid('maria@palayan.gov.ph'), destination: 'Gapan City Hall',           purpose: 'Inter-LGU Meeting',        department: 'Health Department',    pax_count: 4, requested_date: '2026-08-22', requested_time: '08:00', status: 'pending',     notes: null },
    ];

    const { error: rErr } = await sb.from('requests').insert(requests);
    if (rErr) { console.error('   ❌ Requests:', rErr.message); }
    else        console.log('   ✅ Requests seeded (5)');
  } else {
    console.log('\n✅ Data already exists — skipping seed.');
  }

  console.log('\n🎉 Setup complete!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  Admin:     admin@palayan.gov.ph / admin123');
  console.log('  Requestor: juan@palayan.gov.ph  / pass123');
  console.log('  Driver:    manny@palayan.gov.ph / driver123');
  console.log('');
}

runSetup().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
