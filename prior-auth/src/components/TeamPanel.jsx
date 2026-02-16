import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logAction } from '../services/auditLog';
import Spinner from './ui/Spinner';

const ROLE_LABELS = {
  provider: 'Provider',
  ma: 'Medical Assistant',
  psr: 'Patient Service Rep',
  rn: 'Registered Nurse',
  admin: 'Admin',
};

const INVITABLE_ROLES = [
  { value: 'ma', label: 'Medical Assistant (MA)' },
  { value: 'psr', label: 'Patient Service Rep (PSR)' },
  { value: 'rn', label: 'Registered Nurse (RN)' },
];

export default function TeamPanel({ profile, onClose }) {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ma');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);

  const canInvite = profile.role === 'provider' || profile.role === 'admin';

  // Load team members and pending invitations
  useEffect(() => {
    if (!supabase || !profile.practiceId) return;

    async function load() {
      const [membersRes, invitesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('practice_id', profile.practiceId),
        supabase.from('invitations').select('*').eq('practice_id', profile.practiceId).is('accepted_at', null),
      ]);
      setMembers(membersRes.data || []);
      setInvitations(invitesRes.data || []);
      setLoading(false);
    }

    load();
  }, [profile.practiceId]);

  const handleInvite = useCallback(async (e) => {
    e.preventDefault();
    if (!inviteEmail) { setInviteError('Email is required'); return; }

    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);

    const { data, error } = await supabase.from('invitations').insert({
      practice_id: profile.practiceId,
      email: inviteEmail,
      role: inviteRole,
      invited_by: profile.userId,
    }).select().single();

    if (error) {
      setInviteError(error.message);
      setInviteLoading(false);
      return;
    }

    await logAction('staff_invited', {
      email: inviteEmail,
      role: inviteRole,
    }, { userId: profile.userId, practiceId: profile.practiceId });

    // Build invite URL
    const inviteUrl = `${window.location.origin}?invite=${data.token}`;
    setInviteSuccess(inviteUrl);
    setInvitations((prev) => [...prev, data]);
    setInviteEmail('');
    setInviteLoading(false);
  }, [inviteEmail, inviteRole, profile]);

  return (
    <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Practice Team</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {loading ? (
            <div className="py-8 flex justify-center">
              <Spinner label="Loading team..." />
            </div>
          ) : (
            <>
              {/* Current Members */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Members</h3>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{m.full_name}</p>
                        <p className="text-xs text-gray-400">{ROLE_LABELS[m.role] || m.role}</p>
                      </div>
                      {m.id === profile.userId && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-denali-100 text-denali-700 rounded">
                          YOU
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Pending Invitations</h3>
                  <div className="space-y-2">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg">
                        <div>
                          <p className="text-sm text-amber-800">{inv.email}</p>
                          <p className="text-xs text-amber-600">{ROLE_LABELS[inv.role] || inv.role}</p>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                          PENDING
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite Form (providers/admins only) */}
              {canInvite && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Invite Staff</h3>
                  <form onSubmit={handleInvite} className="space-y-3">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); setInviteSuccess(null); }}
                      placeholder="staff@practice.com"
                      disabled={inviteLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-denali-500 focus:border-denali-500 disabled:opacity-50"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      disabled={inviteLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-denali-500 focus:border-denali-500 disabled:opacity-50"
                    >
                      {INVITABLE_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>

                    {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}

                    {inviteSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-xs text-emerald-800 font-medium mb-1">Invite link created!</p>
                        <p className="text-xs text-emerald-600 break-all font-mono">{inviteSuccess}</p>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(inviteSuccess)}
                          className="mt-2 text-xs text-denali-600 hover:text-denali-700 font-medium"
                        >
                          Copy to clipboard
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={inviteLoading || !inviteEmail}
                      className="w-full px-3 py-2 bg-denali-600 text-white rounded-lg text-sm font-medium hover:bg-denali-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviteLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Spinner size="sm" label="" /> Sending...
                        </span>
                      ) : 'Send Invite'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
