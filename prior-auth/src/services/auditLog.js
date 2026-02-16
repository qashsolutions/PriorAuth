/**
 * Audit Logging — writes to Supabase audit_logs table.
 * PHI is minimized: only codes (CPT/ICD-10), never names or MBI.
 */

import { supabase } from '../lib/supabase';

/**
 * Log an action. Silently fails if Supabase is unavailable (demo mode).
 * @param {string} action - e.g. 'login', 'case_submitted', 'letter_generated'
 * @param {object} detail - JSON-safe metadata (no PHI names/MBI)
 * @param {object} context - { userId, practiceId } from current auth
 */
export async function logAction(action, detail = {}, context = {}) {
  if (!supabase) return; // Demo mode — no Supabase

  try {
    await supabase.from('audit_logs').insert({
      user_id: context.userId || null,
      practice_id: context.practiceId || null,
      action,
      detail,
    });
  } catch {
    // Audit logging should never break the app
    console.warn('Audit log failed:', action);
  }
}
