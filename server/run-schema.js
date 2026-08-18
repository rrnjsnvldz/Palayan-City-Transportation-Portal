/**
 * Runs the full schema + seed against Supabase via the SQL REST endpoint.
 * Usage: node run-schema.js
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runSQL(sql, label) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'params=single-object',
    },
  });
  // Use the pg connection via Supabase JS client's rpc
  const { data, error } = await sb.rpc('version');
  return { data, error };
}

// ── We create tables by upserting into known endpoints if they don't exist ─
// Supabase doesn't expose raw SQL via REST, so we use the JS client to check
// table existence and then tell the user exactly what to copy-paste.

async function main() {
  console.log('\n🔌 Testing Supabase connection...');
  console.log(`   ${SUPABASE_URL}\n`);

  // Try querying a table that might exist
  const { error: usersErr } = await sb.from('users').select('id').limit(1);

  if (!usersErr) {
    console.log('✅ Database tables already exist!');
    await seedIfEmpty();
    return;
  }

  if (usersErr.code === '42P01') {
    console.log('⚠️  Tables not found. You need to run the schema SQL manually.');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  STEP 1: Open this URL in your browser:');
    console.log('  https://supabase.com/dashboard/project/dthwxvgikdaqsmyrtrkt/sql/new');
    console.log('');
    console.log('  STEP 2: Copy the contents of:');
    console.log('  C:\\Users\\User\\.gemini\\antigravity-ide\\scratch\\palayan-transport\\supabase\\schema.sql');
    console.log('');
    console.log('  STEP 3: Paste into the SQL Editor and click RUN');
    console.log('');
    console.log('  STEP 4: Then run this script again:');
    console.log('  node run-schema.js');
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(0);
  }

  console.error('❌ Unexpected error:', usersErr.message);
  console.error('   Code:', usersErr.code);
  process.exit(1);
}

async function seedIfEmpty() {
  const { count } = await sb.from('users').select('*', { count: 'exact', head: true });

  if (count > 0) {
    console.log(`✅ Data exists: ${count} user(s) found. No seeding needed.\n`);

    // Show login info
    const { data: users } = await sb.from('users').select('name, email, role');
    if (users) {
      console.log('Current users:');
      users.forEach(u => console.log(`  [${u.role.padEnd(9)}] ${u.email}`));
    }
    console.log('');
    return;
  }

  console.log('🌱 Seeding demo data into Supabase...\n');
  const { default: bcrypt } = await import('bcryptjs');

  // Seed users
  const users = [
    { name: 'Administrator',  email: 'admin@palayan.gov.ph',  password: bcrypt.hashSync('admin123',  10), role: 'admin',     department: 'City Administrator' },
    { name: 'Juan Dela Cruz', email: 'juan@palayan.gov.ph',   password: bcrypt.hashSync('pass123',   10), role: 'requestor', department: 'City Planning Office' },
    { name: 'Maria Santos',   email: 'maria@palayan.gov.ph',  password: bcrypt.hashSync('pass123',   10), role: 'requestor', department: 'Health Department' },
    { name: 'Pedro Reyes',    email: 'pedro@palayan.gov.ph',  password: bcrypt.hashSync('pass123',   10), role: 'requestor', department: 'Engineering Office' },
    { name: 'Manny Lopez',    email: 'manny@palayan.gov.ph',  password: bcrypt.hashSync('driver123', 10), role: 'driver',    department: 'Motor Pool' },
    { name: 'Ben Aquino',     email: 'ben@palayan.gov.ph',    password: bcrypt.hashSync('driver123', 10), role: 'driver',    department: 'Motor Pool' },
    { name: 'Carlo Ramos',    email: 'carlo@palayan.gov.ph',  password: bcrypt.hashSync('driver123', 10), role: 'driver',    department: 'Motor Pool' },
  ];

  const { error: uErr } = await sb.from('users').insert(users);
  if (uErr) { console.error('  ❌ Users failed:', uErr.message); return; }
  console.log('  ✅ 7 users seeded');

  // Seed vehicles
  const vehicles = [
    { plate_no: 'NE-1001', name: 'City Van 1',    type: 'Van',       capacity: 12, status: 'available',   fuel_level: 85, current_lat: 15.5413, current_lng: 121.1082 },
    { plate_no: 'NE-1002', name: 'City Van 2',    type: 'Van',       capacity: 12, status: 'available',   fuel_level: 72, current_lat: 15.5420, current_lng: 121.1091 },
    { plate_no: 'NE-1003', name: 'SUV Patrol',    type: 'SUV',       capacity: 7,  status: 'available',   fuel_level: 90, current_lat: 15.5405, current_lng: 121.1074 },
    { plate_no: 'NE-1004', name: 'Pick-up Truck', type: 'Pickup',    capacity: 5,  status: 'maintenance', fuel_level: 60, current_lat: 15.5398, current_lng: 121.1066 },
    { plate_no: 'NE-1005', name: 'Ambulance 1',   type: 'Ambulance', capacity: 4,  status: 'available',   fuel_level: 95, current_lat: 15.5430, current_lng: 121.1100 },
    { plate_no: 'NE-1006', name: 'Sedan 1',       type: 'Sedan',     capacity: 5,  status: 'available',   fuel_level: 78, current_lat: 15.5415, current_lng: 121.1085 },
  ];

  const { error: vErr } = await sb.from('vehicles').insert(vehicles);
  if (vErr) { console.error('  ❌ Vehicles failed:', vErr.message); return; }
  console.log('  ✅ 6 vehicles seeded');

  // Get user IDs for requests
  const { data: dbUsers } = await sb.from('users').select('id, email');
  const uid = (email) => dbUsers?.find(u => u.email === email)?.id;

  const requests = [
    { requestor_id: uid('juan@palayan.gov.ph'),  destination: 'Nueva Ecija University',  purpose: 'Student Site Visit',        department: 'City Planning Office', pax_count: 8, requested_date: '2026-08-25', requested_time: '08:00', status: 'pending',   notes: 'Please prepare a van' },
    { requestor_id: uid('maria@palayan.gov.ph'), destination: 'Cabanatuan City Hospital', purpose: 'Medical Consultation',      department: 'Health Department',    pax_count: 3, requested_date: '2026-08-24', requested_time: '09:00', status: 'approved',  notes: null },
    { requestor_id: uid('pedro@palayan.gov.ph'), destination: 'Pantabangan Dam',          purpose: 'Infrastructure Inspection', department: 'Engineering Office',   pax_count: 5, requested_date: '2026-08-26', requested_time: '07:00', status: 'pending',   notes: null },
    { requestor_id: uid('juan@palayan.gov.ph'),  destination: 'Gapan City Hall',          purpose: 'Inter-LGU Coordination',   department: 'City Planning Office', pax_count: 2, requested_date: '2026-08-23', requested_time: '10:00', status: 'completed', notes: null },
  ];

  const { error: rErr } = await sb.from('requests').insert(requests);
  if (rErr) { console.error('  ❌ Requests failed:', rErr.message); return; }
  console.log('  ✅ 4 sample requests seeded');

  console.log('\n🎉 Database ready!\n');
  console.log('Demo accounts:');
  console.log('  Admin:     admin@palayan.gov.ph  /  admin123');
  console.log('  Requestor: juan@palayan.gov.ph   /  pass123');
  console.log('  Driver:    manny@palayan.gov.ph  /  driver123');
  console.log('');
}

main();
