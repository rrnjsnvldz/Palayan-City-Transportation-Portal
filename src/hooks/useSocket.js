import { useEffect, useRef } from 'react';
import supabase from '../services/supabase';

/**
 * useRealtime — subscribes to Supabase Realtime for live GPS + status updates.
 * Replaces Socket.IO. Works on Vercel serverless (no persistent connection needed).
 *
 * @param {function} onVehicleUpdate - called with updated vehicle row
 * @param {function} onRequestUpdate - called with updated request row (optional)
 */
export function useRealtime({ onVehicleUpdate, onRequestUpdate } = {}) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!supabase) {
      // Supabase not configured yet (env vars missing) — silently skip
      return;
    }

    const channel = supabase.channel('transport-realtime')
      // Listen for vehicle GPS/status changes
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'vehicles',
      }, (payload) => {
        onVehicleUpdate?.(payload.new);
      })
      // Listen for request status changes
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'requests',
      }, (payload) => {
        onRequestUpdate?.(payload.new);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to Supabase Realtime ✅');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

export default useRealtime;
