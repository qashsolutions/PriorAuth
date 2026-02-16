import Card from './ui/Card';
import StatusBadge from './ui/StatusBadge';
import Spinner from './ui/Spinner';

export default function NCCIBundlingCheck({ ptpResult, mueResult, loading, error }) {
  if (loading) {
    return (
      <Card title="NCCI Bundling Check">
        <Spinner label="Checking NCCI edits..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="NCCI Bundling Check" status="warn">
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  const hasConflicts = ptpResult?.hasConflicts;
  const status = hasConflicts ? 'warn' : 'pass';

  return (
    <Card title="NCCI Bundling Check" status={status}>
      {/* PTP Edits */}
      <div className="mb-3">
        <StatusBadge
          status={hasConflicts ? 'warn' : 'pass'}
          label={hasConflicts ? `${ptpResult.conflicts.length} PTP Conflict(s)` : 'No PTP Conflicts'}
        />
      </div>

      {hasConflicts && (
        <div className="space-y-2 mb-4">
          {ptpResult.conflicts.map((c, i) => (
            <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
              <p className="font-mono font-bold">
                {c.code1} + {c.code2}
              </p>
              <p className="text-gray-600 mt-1">
                {c.code1Desc} + {c.code2Desc}
              </p>
              <p className={`mt-1 font-medium ${c.modifier === 1 ? 'text-amber-700' : 'text-red-700'}`}>
                {c.modifierNote}
              </p>
            </div>
          ))}
        </div>
      )}

      {!hasConflicts && ptpResult && (
        <p className="text-sm text-gray-500">{ptpResult.message}</p>
      )}

      {/* MUE */}
      {mueResult?.found && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            Medically Unlikely Edit (MUE)
          </p>
          <p className="text-sm text-gray-600">
            Max units per day: <span className="font-mono font-bold">{mueResult.mueValue}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">{mueResult.rationale}</p>
        </div>
      )}
    </Card>
  );
}
