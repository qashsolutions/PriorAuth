import { useReducer, useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { logAction } from './services/auditLog';
import IntakeForm from './components/IntakeForm/IntakeForm';
import Dashboard from './components/Dashboard';
import LoginScreen from './components/LoginScreen';
import TeamPanel from './components/TeamPanel';
import Spinner from './components/ui/Spinner';
import useInactivityTimeout from './hooks/useInactivityTimeout';

// Services
import { checkEligibility } from './services/eligibilityApi';
import { checkPARequired } from './services/paRequired';
import { searchNCD, searchLCD } from './services/cmsCoverage';
import { checkSADExclusion } from './services/sadExclusion';
import { checkPTPEdits, checkMUE } from './services/ncciEdits';
import { generateLetter } from './services/letterApi';

// ─── Storage Keys ───────────────────────────────────────────────

const SESSION_KEY = 'denali_pa_session';
const DEMO_AUTH_KEY = 'denali_pa_auth';

// ─── Case State Machine ─────────────────────────────────────────

const INITIAL_STATE = {
  view: 'intake',
  caseData: null,
  results: {
    eligibility: { result: null, loading: false, error: null },
    paRequired: { result: null, loading: false, error: null },
    coverage: { ncdResult: null, lcdResult: null, loading: false, error: null },
    ncci: { ptpResult: null, mueResult: null, loading: false, error: null },
    sad: { result: null, loading: false, error: null },
    letter: { text: null, loading: false, error: null },
  },
};

function loadPersistedState() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return INITIAL_STATE;
    const saved = JSON.parse(raw);
    if (saved.view === 'processing') saved.view = 'results';
    for (const key of Object.keys(saved.results || {})) {
      if (saved.results[key]?.loading) saved.results[key].loading = false;
    }
    return saved;
  } catch {
    return INITIAL_STATE;
  }
}

function saveState(state) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch { /* non-critical */ }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SUBMIT_CASE':
      return {
        ...state,
        view: 'processing',
        caseData: action.payload,
        results: {
          eligibility: { result: null, loading: true, error: null },
          paRequired: { result: null, loading: true, error: null },
          coverage: { ncdResult: null, lcdResult: null, loading: true, error: null },
          ncci: { ptpResult: null, mueResult: null, loading: true, error: null },
          sad: { result: null, loading: true, error: null },
          letter: { text: null, loading: false, error: null },
        },
      };
    case 'SET_RESULT':
      return {
        ...state,
        view: 'results',
        results: {
          ...state.results,
          [action.key]: { ...state.results[action.key], ...action.payload, loading: false },
        },
      };
    case 'SET_LETTER_LOADING':
      return { ...state, results: { ...state.results, letter: { ...state.results.letter, loading: true, error: null } } };
    case 'SET_LETTER_RESULT':
      return { ...state, results: { ...state.results, letter: { text: action.payload, loading: false, error: null } } };
    case 'SET_LETTER_ERROR':
      return { ...state, results: { ...state.results, letter: { text: null, loading: false, error: action.payload } } };
    case 'NEW_CASE':
      sessionStorage.removeItem(SESSION_KEY);
      return INITIAL_STATE;
    default:
      return state;
  }
}

// ─── App ────────────────────────────────────────────────────────

export default function App() {
  // Auth state: null = loading, false = not logged in, object = logged in
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoutMessage, setLogoutMessage] = useState(null);
  const [showTeam, setShowTeam] = useState(false);

  const [state, dispatch] = useReducer(reducer, null, loadPersistedState);
  const isLoggedIn = !!profile;

  // Persist case state
  useEffect(() => { saveState(state); }, [state]);

  // ─── Supabase auth listener ─────────────────────────────────

  useEffect(() => {
    if (!supabase) {
      // No Supabase — check for demo auth in sessionStorage
      try {
        const demo = sessionStorage.getItem(DEMO_AUTH_KEY);
        if (demo) setProfile(JSON.parse(demo));
      } catch { /* ignore */ }
      setAuthLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, practices(*)')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // 500 from RLS when profile row is missing (orphaned auth user) — not fatal,
        // the login screen's seed flow will create the missing rows and retry.
        console.warn('Profile load failed (will retry after seed):', error.message);
        setAuthLoading(false);
        return;
      }

      if (data) {
        const p = {
          userId: data.id,
          practiceId: data.practice_id,
          name: data.full_name,
          role: data.role,
          specialty: data.practices?.specialty || null,
          npi: data.practices?.npi || null,
          practiceName: data.practices?.name || null,
          address: data.practices?.address || null,
          isDemo: false,
        };
        setProfile(p);

        await logAction('login', { method: 'session' }, { userId: p.userId, practiceId: p.practiceId });
      }
    } catch (err) {
      console.warn('Profile load exception:', err);
    }
    setAuthLoading(false);
  }

  // ─── Auth handlers ──────────────────────────────────────────

  const handleDemoLogin = useCallback((demoData) => {
    sessionStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(demoData));
    setProfile(demoData);
    setLogoutMessage(null);
  }, []);

  const handleLogout = useCallback(async (message) => {
    if (profile && !profile.isDemo) {
      await logAction('logout', {}, { userId: profile.userId, practiceId: profile.practiceId });
    }

    if (supabase) {
      await supabase.auth.signOut();
    }
    sessionStorage.removeItem(DEMO_AUTH_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setProfile(null);
    dispatch({ type: 'NEW_CASE' });
    setShowTeam(false);
    setLogoutMessage(message || 'You have been signed out. All case data has been cleared.');
  }, [profile]);

  const handleTimeout = useCallback(async () => {
    if (profile && !profile.isDemo) {
      await logAction('timeout', {}, { userId: profile.userId, practiceId: profile.practiceId });
    }

    if (supabase) {
      await supabase.auth.signOut();
    }
    sessionStorage.removeItem(DEMO_AUTH_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setProfile(null);
    dispatch({ type: 'NEW_CASE' });
    setShowTeam(false);
    setLogoutMessage(
      'Your session expired after 15 minutes of inactivity. All case data has been cleared for security.'
    );
  }, [profile]);

  const { showWarning, remainingSeconds } = useInactivityTimeout(handleTimeout, isLoggedIn);

  // ─── Case handlers ─────────────────────────────────────────

  const handleSubmit = useCallback(async (caseData) => {
    dispatch({ type: 'SUBMIT_CASE', payload: caseData });

    await logAction('case_submitted', {
      cpt: caseData.cpt,
      icd10: caseData.icd10,
    }, { userId: profile?.userId, practiceId: profile?.practiceId });

    const checks = [
      checkEligibility({
        mbi: caseData.mbi,
        firstName: caseData.firstName,
        lastName: caseData.lastName,
        dob: caseData.dob,
        providerNpi: caseData.npi,
        providerName: caseData.providerName,
      })
        .then((result) => dispatch({ type: 'SET_RESULT', key: 'eligibility', payload: { result } }))
        .catch((err) => dispatch({ type: 'SET_RESULT', key: 'eligibility', payload: { error: err.message } })),

      checkPARequired(caseData.cpt)
        .then((result) => dispatch({ type: 'SET_RESULT', key: 'paRequired', payload: { result } }))
        .catch((err) => dispatch({ type: 'SET_RESULT', key: 'paRequired', payload: { error: err.message } })),

      Promise.allSettled([
        searchNCD(caseData.icd10, caseData.cpt),
        searchLCD(caseData.cpt, caseData.practiceZip),
      ]).then(([ncdSettled, lcdSettled]) => {
        dispatch({
          type: 'SET_RESULT',
          key: 'coverage',
          payload: {
            ncdResult: ncdSettled.status === 'fulfilled' ? ncdSettled.value : null,
            lcdResult: lcdSettled.status === 'fulfilled' ? lcdSettled.value : null,
            error: ncdSettled.status === 'rejected' && lcdSettled.status === 'rejected' ? 'Coverage lookup failed' : null,
          },
        });
      }),

      Promise.allSettled([
        checkPTPEdits([caseData.cpt]),
        checkMUE(caseData.cpt),
      ]).then(([ptpSettled, mueSettled]) => {
        dispatch({
          type: 'SET_RESULT',
          key: 'ncci',
          payload: {
            ptpResult: ptpSettled.status === 'fulfilled' ? ptpSettled.value : null,
            mueResult: mueSettled.status === 'fulfilled' ? mueSettled.value : null,
          },
        });
      }),

      checkSADExclusion(caseData.cpt)
        .then((result) => dispatch({ type: 'SET_RESULT', key: 'sad', payload: { result } }))
        .catch((err) => dispatch({ type: 'SET_RESULT', key: 'sad', payload: { error: err.message } })),
    ];

    await Promise.allSettled(checks);

    await logAction('checks_completed', {
      cpt: caseData.cpt,
      icd10: caseData.icd10,
    }, { userId: profile?.userId, practiceId: profile?.practiceId });
  }, [profile]);

  const handleGenerateLetter = useCallback(async () => {
    if (!state.caseData) return;
    dispatch({ type: 'SET_LETTER_LOADING' });

    try {
      const { results, caseData } = state;
      const result = await generateLetter({
        patientInfo: { mbi: caseData.mbi, firstName: caseData.firstName, lastName: caseData.lastName, dob: caseData.dob },
        providerInfo: { npi: caseData.npi, name: caseData.providerName || 'Provider', specialty: caseData.providerSpecialty || '', address: caseData.providerAddress || '' },
        icd10: { code: caseData.icd10, description: caseData.icd10Description || '' },
        cpt: { code: caseData.cpt, description: '' },
        ncdText: results.coverage.ncdResult?.results?.[0]?.title || '',
        lcdText: results.coverage.lcdResult?.results?.[0]?.title || '',
        clinicalSummary: caseData.clinicalSummary || '',
        citations: [],
      });

      dispatch({ type: 'SET_LETTER_RESULT', payload: result.letterText });

      await logAction('letter_generated', {
        cpt: caseData.cpt,
        icd10: caseData.icd10,
      }, { userId: profile?.userId, practiceId: profile?.practiceId });
    } catch (err) {
      dispatch({ type: 'SET_LETTER_ERROR', payload: err.message });
    }
  }, [state, profile]);

  const handleNewCase = useCallback(() => {
    dispatch({ type: 'NEW_CASE' });
  }, []);

  // ─── Loading State ─────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" label="Loading..." />
      </div>
    );
  }

  // ─── Render: Login Screen ──────────────────────────────────

  if (!isLoggedIn) {
    return (
      <>
        {logoutMessage && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
            <p className="text-sm text-amber-800">{logoutMessage}</p>
            <button
              onClick={() => setLogoutMessage(null)}
              className="ml-3 text-xs text-amber-600 underline hover:text-amber-800"
            >
              Dismiss
            </button>
          </div>
        )}
        <LoginScreen onDemoLogin={handleDemoLogin} />
      </>
    );
  }

  // ─── Render: Authenticated App ─────────────────────────────

  const ROLE_DISPLAY = { provider: 'Provider', ma: 'MA', psr: 'PSR', rn: 'RN', admin: 'Admin' };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Team Panel Modal */}
      {showTeam && profile.practiceId && (
        <TeamPanel profile={profile} onClose={() => setShowTeam(false)} />
      )}

      {/* Inactivity Warning Banner */}
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 text-center shadow-lg">
          <p className="text-sm font-medium">
            Session expiring due to inactivity — logging out in {remainingSeconds}s.
            <span className="ml-1 opacity-75">Move your mouse or press a key to stay signed in.</span>
          </p>
        </div>
      )}

      {/* Header */}
      <header className={`bg-white border-b border-gray-200 no-print ${showWarning ? 'mt-12' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              <span className="text-denali-600">Denali</span>.health
            </h1>
            <p className="text-xs text-gray-400 font-mono">Medicare PA Assistant — Original FFS</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Provider / User Info */}
            <div className="text-right text-xs">
              <p className="font-medium text-gray-700">
                {profile.name}
                {profile.isDemo && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-mono">
                    DEMO
                  </span>
                )}
                {!profile.isDemo && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-mono">
                    {ROLE_DISPLAY[profile.role] || profile.role}
                  </span>
                )}
              </p>
              <p className="text-gray-400">
                {profile.practiceName || profile.specialty || (profile.npi && `NPI: ${profile.npi}`) || ''}
              </p>
            </div>

            {/* Team button (providers/admins only) */}
            {(profile.role === 'provider' || profile.role === 'admin') && !profile.isDemo && (
              <button
                onClick={() => setShowTeam(true)}
                className="px-3 py-1.5 text-xs text-denali-600 border border-denali-200 rounded-lg hover:bg-denali-50 transition-colors"
              >
                Team
              </button>
            )}

            {/* Sign Out */}
            <button
              onClick={() => handleLogout()}
              className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {state.view === 'intake' && <IntakeForm onSubmit={handleSubmit} isDemo={!!profile?.isDemo} />}

        {state.view === 'processing' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" label="Running coverage checks..." />
            <p className="mt-4 text-sm text-gray-400">
              Checking eligibility, PA requirements, NCD/LCD coverage, NCCI edits...
            </p>
          </div>
        )}

        {state.view === 'results' && (
          <Dashboard
            caseData={state.caseData}
            results={state.results}
            onGenerateLetter={handleGenerateLetter}
            onNewCase={handleNewCase}
          />
        )}
      </main>
    </div>
  );
}
