import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { validateNPI } from '../utils/npiValidator';
import { lookupNPI } from '../services/nppes';
import { logAction } from '../services/auditLog';
import Spinner from './ui/Spinner';

const DEMO_PROVIDER = {
  npi: '0000000000',
  name: 'Dr. Demo Admin',
  credential: 'MD',
  role: 'admin',
  specialty: 'Radiation Oncology',
  address: '100 Demo Way, Austin, TX 78701',
  practiceId: null,
  isDemo: true,
};

// ─── Test Credentials ───────────────────────────────────────────

const TEST_EMAIL = 'demo@priorauth.test';
const TEST_PASSWORD = 'Demo1234!';

// ─── Sign In Tab ────────────────────────────────────────────────

function SignInForm({ onDemoMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fillTestCredentials = useCallback(() => {
    setEmail(TEST_EMAIL);
    setPassword(TEST_PASSWORD);
    setError(null);
  }, []);

  // Idempotent seed: ensure test auth user + practice + profile all exist.
  // Always tries sign-in first to get a real session, then falls back to sign-up.
  async function seedTestAccount() {
    try {
      let userId;

      // 1. Try sign-in first (works if user already exists)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (signInError) {
        // User doesn't exist yet — create it
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          options: { data: { is_test: true } },
        });

        if (signUpError) {
          setError('Could not create test account: ' + signUpError.message);
          return false;
        }

        userId = authData.user?.id;

        // If signUp didn't auto-sign-in (email confirmation ON), sign in explicitly
        if (!authData.session) {
          const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
          });
          if (retryErr) {
            setError('Account created but cannot sign in. Disable "Confirm email" in Supabase Auth → Providers → Email.');
            return false;
          }
          userId = retryData.user?.id;
        }
      } else {
        // Sign-in succeeded — we have a real session
        userId = signInData.user?.id;
      }

      if (!userId) {
        setError('Could not determine user ID for test account.');
        return false;
      }

      // 2. Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        return true; // Already fully set up
      }

      // 3. Create practice + profile atomically via RPC (bypasses RLS chicken-and-egg)
      const { error: onboardErr } = await supabase.rpc('onboard_practice', {
        p_npi: '0000000000',
        p_name: 'Demo Oncology Practice',
        p_specialty: 'Radiation Oncology',
        p_address: '100 Demo Way, Austin, TX 78701',
        p_full_name: 'Demo Admin',
        p_role: 'admin',
      });

      if (onboardErr) {
        setError('Practice setup failed: ' + onboardErr.message);
        return false;
      }

      return true;
    } catch {
      setError('Failed to seed test account.');
      return false;
    }
  }

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError(null);

    // For test account, always go through seed to ensure practice+profile exist.
    // This handles both fresh accounts AND orphaned users (auth exists, profile missing).
    if (email === TEST_EMAIL) {
      const ready = await seedTestAccount();
      if (!ready) {
        setLoading(false);
        return;
      }
      // seedTestAccount already signed us in — but the auth listener's loadProfile
      // may have fired before the profile rows were created. Refresh the session
      // to re-trigger loadProfile now that the profile definitely exists.
      await supabase.auth.refreshSession();
      setLoading(false);
      return;
    }

    // Regular sign-in for non-test accounts
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Invalid email or password. Check your credentials or sign up first.'
        : authError.message);
      setLoading(false);
      return;
    }

    // Auth state change listener in App.jsx handles the rest
    setLoading(false);
  }, [email, password]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500">
        Sign in with your existing account.
      </p>

      {/* Test credentials box */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-blue-800">Test Account</p>
          <button
            type="button"
            onClick={fillTestCredentials}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            Use these
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 font-mono">
          <div>
            <span className="text-blue-500">email:</span> {TEST_EMAIL}
          </div>
          <div>
            <span className="text-blue-500">pass:</span> {TEST_PASSWORD}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          placeholder="provider@practice.com"
          autoFocus
          disabled={loading}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-denali-500 focus:border-denali-500 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          placeholder="••••••••"
          disabled={loading}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-denali-500 focus:border-denali-500 disabled:opacity-50"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full px-4 py-3 bg-denali-600 text-white rounded-lg font-medium text-sm hover:bg-denali-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" label="" /> Signing in...
          </span>
        ) : 'Sign In'}
      </button>

      <div className="pt-3 border-t border-gray-100 text-center">
        <button type="button" onClick={onDemoMode}
          className="text-xs text-gray-400 hover:text-denali-600 transition-colors">
          Skip login — Enter Demo Mode
        </button>
      </div>
    </form>
  );
}

// ─── Provider Sign Up Tab ───────────────────────────────────────

function ProviderSignUpForm({ inviteToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [npi, setNpi] = useState('');
  const [npiInfo, setNpiInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [npiLoading, setNpiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // If there's an invite token, load the invitation details
  const [invitation, setInvitation] = useState(null);
  useEffect(() => {
    if (!inviteToken || !supabase) return;
    supabase.from('invitations').select('*').eq('token', inviteToken).single()
      .then(({ data }) => {
        if (data && !data.accepted_at) {
          setInvitation(data);
          setEmail(data.email);
        }
      });
  }, [inviteToken]);

  const handleNpiBlur = useCallback(async () => {
    if (!npi || npi.length < 10 || invitation) return; // Staff don't need NPI
    const validation = validateNPI(npi);
    if (!validation.valid) {
      setError(validation.error);
      setNpiInfo(null);
      return;
    }

    setNpiLoading(true);
    try {
      const info = await lookupNPI(npi);
      if (!info.found) { setError('NPI not found in NPPES registry'); setNpiInfo(null); }
      else if (!info.active) { setError('This NPI is registered but not active'); setNpiInfo(null); }
      else { setNpiInfo(info); setError(null); }
    } catch {
      setError('Could not reach NPPES. Try again.');
    } finally {
      setNpiLoading(false);
    }
  }, [npi, invitation]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    // Provider signup requires NPI; staff signup (via invite) does not
    if (!invitation) {
      if (!npi) { setError('NPI is required for provider signup'); return; }
      const v = validateNPI(npi);
      if (!v.valid) { setError(v.error); return; }
      if (!npiInfo) { setError('Please verify your NPI first (click out of the NPI field)'); return; }
    }

    setLoading(true);
    setError(null);

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setSuccess(true); // Email confirmation required
      setLoading(false);
      return;
    }

    try {
      if (invitation) {
        // Staff signup: link to existing practice
        await supabase.from('profiles').insert({
          id: userId,
          practice_id: invitation.practice_id,
          full_name: email.split('@')[0], // Placeholder — can update later
          role: invitation.role,
        });

        // Mark invitation as accepted
        await supabase.from('invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitation.id);

        await logAction('invitation_accepted', {
          invitation_id: invitation.id,
          role: invitation.role,
        }, { userId, practiceId: invitation.practice_id });
      } else {
        // Provider signup: create practice + profile atomically via RPC
        const { data: practiceId, error: onboardErr } = await supabase.rpc('onboard_practice', {
          p_npi: npi,
          p_name: npiInfo.name,
          p_specialty: npiInfo.specialty,
          p_address: npiInfo.address,
          p_full_name: npiInfo.name,
          p_role: 'provider',
        });

        if (onboardErr) throw onboardErr;

        await logAction('login', { method: 'signup', npi }, { userId, practiceId });
      }
    } catch (err) {
      setError('Account created but profile setup failed. Please contact support.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }, [email, password, npi, npiInfo, invitation]);

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Account Created</h3>
        <p className="text-sm text-gray-500">
          Check your email to confirm your account, then sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {invitation ? (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          You&apos;ve been invited to join a practice as <strong>{invitation.role.toUpperCase()}</strong>.
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          New provider? Create an account with your NPI. Your practice info is auto-verified via NPPES.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          placeholder="you@practice.com"
          autoFocus={!invitation}
          disabled={loading || !!invitation}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-denali-500 focus:border-denali-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          placeholder="Minimum 6 characters"
          autoFocus={!!invitation}
          disabled={loading}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-denali-500 focus:border-denali-500 disabled:opacity-50"
        />
      </div>

      {/* NPI field — only for provider signup (not staff via invite) */}
      {!invitation && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provider NPI <span className="text-gray-400 font-normal">(10 digits)</span>
          </label>
          <input
            type="text"
            value={npi}
            onChange={(e) => { setNpi(e.target.value.replace(/\D/g, '')); setError(null); setNpiInfo(null); }}
            onBlur={handleNpiBlur}
            placeholder="1234567890"
            maxLength={10}
            disabled={loading}
            className={`w-full px-4 py-3 border rounded-lg font-mono text-sm tracking-wider ${
              error && !npiInfo ? 'border-red-400 bg-red-50' : 'border-gray-300'
            } focus:ring-2 focus:ring-denali-500 focus:border-denali-500 disabled:opacity-50`}
          />
          {npiLoading && <p className="mt-1 text-xs text-gray-400">Verifying NPI...</p>}

          {npiInfo && (
            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
              <p className="font-medium text-emerald-800">
                {npiInfo.name}
                {npiInfo.credential && <span className="text-emerald-600">, {npiInfo.credential}</span>}
              </p>
              <p className="text-emerald-600 text-xs">{npiInfo.specialty}</p>
              {npiInfo.address && <p className="text-emerald-600 text-xs mt-1">{npiInfo.address}</p>}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-3 bg-denali-600 text-white rounded-lg font-medium text-sm hover:bg-denali-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" label="" /> Creating account...
          </span>
        ) : invitation ? 'Join Practice' : 'Create Account'}
      </button>
    </form>
  );
}

// ─── Main Login Screen ──────────────────────────────────────────

export default function LoginScreen({ onDemoLogin }) {
  const [tab, setTab] = useState('signin'); // signin | signup

  // Check for invite token in URL
  const inviteToken = new URLSearchParams(window.location.search).get('invite');

  // If there's an invite token, default to signup tab
  useEffect(() => {
    if (inviteToken) setTab('signup');
  }, [inviteToken]);

  // If Supabase is not configured, fall back to demo-only mode
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              <span className="text-denali-600">Denali</span>.health
            </h1>
            <p className="text-sm text-gray-400 font-mono mt-1">Medicare PA Assistant — Radiation Oncology</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Supabase is not configured. Running in demo mode only.
            </p>
            <button
              onClick={() => onDemoLogin(DEMO_PROVIDER)}
              className="px-6 py-3 bg-denali-600 text-white rounded-lg font-medium text-sm hover:bg-denali-700 transition-colors"
            >
              Enter Demo Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            <span className="text-denali-600">Denali</span>.health
          </h1>
          <p className="text-sm text-gray-400 font-mono mt-1">
            Medicare PA Assistant — Radiation Oncology
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setTab('signin')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'signin'
                  ? 'text-denali-600 border-b-2 border-denali-600 bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'signup'
                  ? 'text-denali-600 border-b-2 border-denali-600 bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {inviteToken ? 'Accept Invite' : 'Provider Sign Up'}
            </button>
          </div>

          {/* Form Content */}
          <div className="p-8">
            {tab === 'signin' ? (
              <SignInForm onDemoMode={() => onDemoLogin(DEMO_PROVIDER)} />
            ) : (
              <ProviderSignUpForm inviteToken={inviteToken} />
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 mt-6">
          Decision support only — not a substitute for clinical judgment.
        </p>
      </div>
    </div>
  );
}
