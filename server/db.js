/**
 * Supabase client using the SERVICE ROLE key (backend only).
 * This bypasses Row Level Security — never expose this key to the frontend.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load from cwd and from server directory
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('[DB] ⚠️  Supabase env vars not set — check server/.env');
} else {
  console.log('[DB] ✅ Supabase connected:', SUPABASE_URL);
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
