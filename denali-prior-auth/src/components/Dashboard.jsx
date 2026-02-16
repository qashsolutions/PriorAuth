import EligibilityCheck from './EligibilityCheck';
import PARequiredCheck from './PARequiredCheck';
import CoverageDetermination from './CoverageDetermination';
import NCCIBundlingCheck from './NCCIBundlingCheck';
import SADExclusionCheck from './SADExclusionCheck';
import MedNecessityLetter from './MedNecessityLetter';
import Alert from './ui/Alert';

export default function Dashboard({ caseData, results, onGenerateLetter, onNewCase }) {
  const {
    eligibility = {},
    paRequired = {},
    coverage = {},
    ncci = {},
    sad = {},
    letter = {},
  } = results;

  // Check if MA was detected — block all subsequent results
  const isMA = eligibility.result?.payerType === 'MA';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Case Summary Header */}
      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Coverage Determination Results</h2>
            <p className="text-sm text-gray-500 mt-1">
              Patient: {caseData.firstName} {caseData.lastName} |
              Dx: <span className="font-mono">{caseData.icd10}</span> |
              Px: <span className="font-mono">{caseData.cpt}</span>
            </p>
          </div>
          <button
            onClick={onNewCase}
            className="px-4 py-2 text-sm font-medium text-denali-700 border border-denali-300 rounded-lg hover:bg-denali-50 no-print"
          >
            New Case
          </button>
        </div>
      </div>

      {/* Results Cards */}
      <div className="space-y-4">
        {/* 1. Eligibility */}
        <EligibilityCheck
          result={eligibility.result}
          loading={eligibility.loading}
          error={eligibility.error}
        />

        {/* If MA, stop here */}
        {isMA && (
          <Alert type="error" title="Workflow Stopped">
            This tool supports Original Medicare FFS only. Medicare Advantage plans have
            plan-specific prior authorization rules not covered here.
          </Alert>
        )}

        {/* Continue only for FFS */}
        {!isMA && (
          <>
            {/* 2. PA Required */}
            <PARequiredCheck
              result={paRequired.result}
              loading={paRequired.loading}
              error={paRequired.error}
            />

            {/* 3. Coverage Determination */}
            <CoverageDetermination
              ncdResult={coverage.ncdResult}
              lcdResult={coverage.lcdResult}
              loading={coverage.loading}
              error={coverage.error}
            />

            {/* 4. NCCI Bundling */}
            <NCCIBundlingCheck
              ptpResult={ncci.ptpResult}
              mueResult={ncci.mueResult}
              loading={ncci.loading}
              error={ncci.error}
            />

            {/* 5. SAD Exclusion */}
            <SADExclusionCheck
              result={sad.result}
              loading={sad.loading}
              error={sad.error}
            />

            {/* 6. Medical Necessity Letter */}
            <MedNecessityLetter
              letterText={letter.text}
              loading={letter.loading}
              error={letter.error}
              onGenerate={onGenerateLetter}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 py-4 border-t border-gray-200 text-center no-print">
        <p className="text-xs text-gray-400">
          Denali.health Medicare PA Assistant — Decision support only.
          All determinations require provider review. Not a substitute for clinical judgment.
        </p>
      </div>
    </div>
  );
}
