-- Migration: Add trip stages to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS arrived_at timestamptz;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS departed_destination_at timestamptz;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS trip_stage text DEFAULT 'scheduled';
