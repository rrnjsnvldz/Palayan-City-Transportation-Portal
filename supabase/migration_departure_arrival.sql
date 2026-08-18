-- ============================================================
-- Migration: Add Departure Time, Arrival Time, and Trip Duration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Project: https://supabase.com/dashboard/project/dthwxvgikdaqsmyrtrkt/sql/new
-- ============================================================

-- 1. Add departure_time, arrival_time, and trip_duration to requests table
alter table requests
  add column if not exists departure_time time,
  add column if not exists arrival_time   time,
  add column if not exists trip_duration  text;

-- 2. Backfill existing records: set departure_time from requested_time if null
update requests
set
  departure_time = requested_time,
  arrival_time = (requested_time + interval '4 hours')::time,
  trip_duration = '4 hrs'
where departure_time is null;
