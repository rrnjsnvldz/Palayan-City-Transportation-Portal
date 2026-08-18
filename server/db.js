/**
 * Supabase client using the SERVICE ROLE key (backend only).
 * This bypasses Row Level Security — never expose this key to the frontend.
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('[DB] ⚠️  Supabase env vars not set — running in LOCAL MODE with sql.js fallback');
}

// Create Supabase admin client (service role)
export const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

/**
 * Helper: throw a formatted error if Supabase returns one
 */
export function assertNoError(error, context = '') {
  if (error) {
    console.error(`[DB Error] ${context}:`, error.message);
    throw new Error(error.message);
  }
}

export default supabase;
