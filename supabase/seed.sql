-- ============================================================
-- City of Palayan Transportation Portal — Seed Data
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- Passwords are bcrypt hashes:
--   admin123  → $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
--   pass123   → $2a$10$YnUvJVQy7NaS3/XN1yWaSOoaEcm9kAF3wr6WNbf5HG2WrJFx5Q8oi
--   driver123 → $2a$10$TKh8H1.PJy5e2dN.0MX1keKCPL8.U4L63xNSxE/E4xhB/P6lV8Ivi

insert into users (name, email, password, role, department) values
  ('Administrator',    'admin@palayan.gov.ph',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',     'City Administrator'),
  ('Juan Dela Cruz',   'juan@palayan.gov.ph',   '$2a$10$YnUvJVQy7NaS3/XN1yWaSOoaEcm9kAF3wr6WNbf5HG2WrJFx5Q8oi', 'requestor', 'City Planning Office'),
  ('Maria Santos',     'maria@palayan.gov.ph',  '$2a$10$YnUvJVQy7NaS3/XN1yWaSOoaEcm9kAF3wr6WNbf5HG2WrJFx5Q8oi', 'requestor', 'Health Department'),
  ('Pedro Reyes',      'pedro@palayan.gov.ph',  '$2a$10$YnUvJVQy7NaS3/XN1yWaSOoaEcm9kAF3wr6WNbf5HG2WrJFx5Q8oi', 'requestor', 'Engineering Office'),
  ('Manny Lopez',      'manny@palayan.gov.ph',  '$2a$10$TKh8H1.PJy5e2dN.0MX1keKCPL8.U4L63xNSxE/E4xhB/P6lV8Ivi', 'driver',    'Motor Pool'),
  ('Ben Aquino',       'ben@palayan.gov.ph',    '$2a$10$TKh8H1.PJy5e2dN.0MX1keKCPL8.U4L63xNSxE/E4xhB/P6lV8Ivi', 'driver',    'Motor Pool'),
  ('Carlo Ramos',      'carlo@palayan.gov.ph',  '$2a$10$TKh8H1.PJy5e2dN.0MX1keKCPL8.U4L63xNSxE/E4xhB/P6lV8Ivi', 'driver',    'Motor Pool')
on conflict (email) do nothing;

insert into vehicles (plate_no, name, type, capacity, status, fuel_level, current_lat, current_lng) values
  ('NE-1001', 'City Van 1',    'Van',       12, 'available',   85, 15.5413, 121.1082),
  ('NE-1002', 'City Van 2',    'Van',       12, 'available',   72, 15.5420, 121.1091),
  ('NE-1003', 'SUV Patrol',    'SUV',        7, 'available',   90, 15.5405, 121.1074),
  ('NE-1004', 'Pick-up Truck', 'Pickup',     5, 'maintenance', 60, 15.5398, 121.1066),
  ('NE-1005', 'Ambulance 1',   'Ambulance',  4, 'available',   95, 15.5430, 121.1100),
  ('NE-1006', 'Sedan 1',       'Sedan',      5, 'available',   78, 15.5415, 121.1085)
on conflict (plate_no) do nothing;

-- Sample requests (uses user IDs 2,3,4)
insert into requests (requestor_id, destination, purpose, department, pax_count, requested_date, requested_time, status, notes) values
  (2, 'Nueva Ecija University',   'Student Site Visit',       'City Planning Office', 8, '2026-08-20', '08:00', 'pending',     'Please prepare van'),
  (3, 'Cabanatuan City Hospital', 'Medical Consultation',      'Health Department',    3, '2026-08-19', '09:00', 'approved',    null),
  (4, 'Pantabangan Dam',          'Infrastructure Inspection', 'Engineering Office',   5, '2026-08-21', '07:00', 'in_progress', null),
  (2, 'Manila NEDA Office',       'Budget Coordination',       'City Planning Office', 2, '2026-08-18', '06:00', 'completed',   null),
  (3, 'Gapan City Hall',          'Inter-LGU Meeting',         'Health Department',    4, '2026-08-22', '08:00', 'pending',     null);

-- Assignment for in_progress request (request id=3, driver id=5, vehicle id=3)
insert into assignments (request_id, driver_id, vehicle_id, started_at, start_odometer, start_fuel)
  values (3, 5, 3, now(), 45230, 90);

update vehicles set status = 'in_use' where id = 3;

-- Assignment for approved request (request id=2, driver id=6, vehicle id=1)
insert into assignments (request_id, driver_id, vehicle_id) values (2, 6, 1);
