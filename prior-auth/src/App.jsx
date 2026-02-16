import { useReducer, useCallback } from 'react';
import IntakeForm from './components/IntakeForm/IntakeForm';
import Dashboard from './components/Dashboard';
import Spinner from './components/ui/Spinner';

// Services
import { checkEligibility } from './services/eligibilityApi';
import { checkPARequired } from './services/paRequired';
import { searchNCD, searchLCD } from './services/cmsCoverage';
import { checkSADExclusion } from './services/sadExclusion';
import { checkPTPEdits, checkMUE } from './services/ncciEdits';
import { generateLetter } from './services/letterApi';

// ─── State Machine ──────────────────────────────────────────────

const INITIAL_STATE = {
  view: 'intake', // intake | processing | results
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
      return {
        ...state,
        results: {
          ...state.results,
          letter: { ...state.results.letter, loading: true, error: null },
        },
      };

    case 'SET_LETTER_RESULT':
      return {
        ...state,
        results: {
          ...state.results,
          letter: { text: action.payload, loading: false, error: null },
        },
      };

    case 'SET_LETTER_ERROR':
      return {
        ...state,
        results: {
          ...state.results,
          letter: { text: null, loading: false, error: action.payload },
        },
      };

    case 'NEW_CASE':
      return INITIAL_STATE;

    default:
      return state;
  }
}

// ─── App ────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Run all Phase 2-3 checks concurrently after intake submission
  const handleSubmit = useCallback(async (caseData) => {
    dispatch({ type: 'SUBMIT_CASE', payload: caseData });

    const checks = [
      // 1. Eligibility (keyed — goes through /api/eligibility)
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

      // 2. PA Required (local JSON)
      checkPARequired(caseData.cpt)
        .then((result) => dispatch({ type: 'SET_RESULT', key: 'paRequired', payload: { result } }))
        .catch((err) => dispatch({ type: 'SET_RESULT', key: 'paRequired', payload: { error: err.message } })),

      // 3. Coverage — NCD + LCD in parallel
      Promise.allSettled([
        searchNCD(caseData.icd10, caseData.cpt),
        searchLCD(caseData.cpt, caseData.practiceZip),
      ])
        .then(([ncdSettled, lcdSettled]) => {
          dispatch({
            type: 'SET_RESULT',
            key: 'coverage',
            payload: {
              ncdResult: ncdSettled.status === 'fulfilled' ? ncdSettled.value : null,
              lcdResult: lcdSettled.status === 'fulfilled' ? lcdSettled.value : null,
              error:
                ncdSettled.status === 'rejected' && lcdSettled.status === 'rejected'
                  ? 'Coverage lookup failed'
                  : null,
            },
          });
        }),

      // 4. NCCI — PTP + MUE in parallel
      Promise.allSettled([
        checkPTPEdits([caseData.cpt]),
        checkMUE(caseData.cpt),
      ])
        .then(([ptpSettled, mueSettled]) => {
          dispatch({
            type: 'SET_RESULT',
            key: 'ncci',
            payload: {
              ptpResult: ptpSettled.status === 'fulfilled' ? ptpSettled.value : null,
              mueResult: mueSettled.status === 'fulfilled' ? mueSettled.value : null,
            },
          });
        }),

      // 5. SAD Exclusion
      checkSADExclusion(caseData.cpt)
        .then((result) => dispatch({ type: 'SET_RESULT', key: 'sad', payload: { result } }))
        .catch((err) => dispatch({ type: 'SET_RESULT', key: 'sad', payload: { error: err.message } })),
    ];

    await Promise.allSettled(checks);
  }, []);

  // Generate letter on demand (user clicks button)
  const handleGenerateLetter = useCallback(async () => {
    if (!state.caseData) return;

    dispatch({ type: 'SET_LETTER_LOADING' });

    try {
      const { results, caseData } = state;
      const result = await generateLetter({
        patientInfo: {
          mbi: caseData.mbi,
          firstName: caseData.firstName,
          lastName: caseData.lastName,
          dob: caseData.dob,
        },
        providerInfo: {
          npi: caseData.npi,
          name: caseData.providerName || 'Provider',
          specialty: caseData.providerSpecialty || '',
          address: caseData.providerAddress || '',
        },
        icd10: {
          code: caseData.icd10,
          description: caseData.icd10Description || '',
        },
        cpt: {
          code: caseData.cpt,
          description: '', // AMA license pending
        },
        ncdText: results.coverage.ncdResult?.results?.[0]?.title || '',
        lcdText: results.coverage.lcdResult?.results?.[0]?.title || '',
        clinicalSummary: caseData.clinicalSummary || '',
        citations: [],
      });

      dispatch({ type: 'SET_LETTER_RESULT', payload: result.letterText });
    } catch (err) {
      dispatch({ type: 'SET_LETTER_ERROR', payload: err.message });
    }
  }, [state]);

  const handleNewCase = useCallback(() => {
    dispatch({ type: 'NEW_CASE' });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 no-print">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              <span className="text-denali-600">Denali</span>.health
            </h1>
            <p className="text-xs text-gray-400 font-mono">Medicare PA Assistant — Original FFS</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="px-2 py-1 bg-gray-100 rounded font-mono">MVP</span>
            <span>Decision Support Only</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {state.view === 'intake' && <IntakeForm onSubmit={handleSubmit} />}

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
