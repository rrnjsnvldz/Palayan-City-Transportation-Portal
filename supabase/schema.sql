-- ============================================================
-- City of Palayan Transportation Portal — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────
create table if not exists users (
  id          bigserial primary key,
  name        text not null,
  email       text unique not null,
  password    text not null,
  role        text not null check (role in ('requestor','driver','admin')),
  department  text,
  created_at  timestamptz default now()
);

-- ── Vehicles ──────────────────────────────────────────────────
create table if not exists vehicles (
  id           bigserial primary key,
  plate_no     text unique not null,
  name         text not null,
  type         text not null,
  capacity     integer not null default 5,
  status       text not null default 'available'
               check (status in ('available','in_use','maintenance')),
  fuel_level   numeric default 100,
  current_lat  numeric,
  current_lng  numeric,
  speed        numeric default 0,
  odometer     numeric default 0,
  last_updated timestamptz default now(),
  image_url    text
);

-- ── Requests ──────────────────────────────────────────────────
create table if not exists requests (
  id             bigserial primary key,
  requestor_id   bigint not null references users(id) on delete cascade,
  destination    text not null,
  purpose        text not null,
  department     text not null,
  pax_count      integer not null default 1,
  requested_date date not null,
  requested_time time not null,
  departure_time time,
  arrival_time   time,
  trip_duration  text,
  notes          text,
  status         text not null default 'pending'
                 check (status in ('pending','approved','denied','in_progress','completed','cancelled')),
  denial_reason  text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── Assignments ───────────────────────────────────────────────
create table if not exists assignments (
  id             bigserial primary key,
  request_id     bigint not null references requests(id) on delete cascade,
  driver_id      bigint not null references users(id),
  vehicle_id     bigint not null references vehicles(id),
  assigned_at    timestamptz default now(),
  started_at     timestamptz,
  ended_at       timestamptz,
  start_odometer numeric,
  end_odometer   numeric,
  start_fuel     numeric,
  end_fuel       numeric
);

-- ── GPS Logs ──────────────────────────────────────────────────
create table if not exists gps_logs (
  id          bigserial primary key,
  vehicle_id  bigint not null references vehicles(id) on delete cascade,
  lat         numeric not null,
  lng         numeric not null,
  speed       numeric default 0,
  fuel        numeric,
  heading     numeric,
  status      text default 'moving',
  recorded_at timestamptz default now()
);

-- ── Notifications ─────────────────────────────────────────────
create table if not exists notifications (
  id          bigserial primary key,
  user_id     bigint not null references users(id) on delete cascade,
  title       text not null,
  message     text not null,
  type        text default 'info',
  is_read     boolean default false,
  created_at  timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_requests_requestor    on requests(requestor_id);
create index if not exists idx_requests_status       on requests(status);
create index if not exists idx_assignments_driver    on assignments(driver_id);
create index if not exists idx_assignments_vehicle   on assignments(vehicle_id);
create index if not exists idx_gps_logs_vehicle      on gps_logs(vehicle_id);
create index if not exists idx_notifications_user    on notifications(user_id);

-- ── Enable Realtime on vehicles table ────────────────────────
-- This makes GPS updates broadcast to all connected clients automatically
alter publication supabase_realtime add table vehicles;
alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table notifications;

-- ── Row Level Security (RLS) ──────────────────────────────────
-- We use service role key in the backend (bypasses RLS)
-- Frontend uses anon key (read-only for public tables)
-- For now, disable RLS so backend service role works cleanly
alter table users         disable row level security;
alter table vehicles      disable row level security;
alter table requests      disable row level security;
alter table assignments   disable row level security;
alter table gps_logs      disable row level security;
alter table notifications disable row level security;
