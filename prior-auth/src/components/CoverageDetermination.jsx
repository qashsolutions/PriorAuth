import Card from './ui/Card';
import StatusBadge from './ui/StatusBadge';
import Spinner from './ui/Spinner';

export default function CoverageDetermination({ ncdResult, lcdResult, loading, error }) {
  if (loading) {
    return (
      <Card title="Coverage Determination (NCD + LCD)">
        <Spinner label="Looking up coverage policies..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Coverage Determination (NCD + LCD)" status="warn">
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  const hasNCD = ncdResult?.found && ncdResult.results?.length > 0;
  const hasLCD = lcdResult?.found && lcdResult.results?.length > 0;
  const status = hasNCD || hasLCD ? 'pass' : 'info';

  return (
    <Card title="Coverage Determination (NCD + LCD)" status={status}>
      {/* NCD Results */}
      <div className="mb-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          National Coverage Determinations
        </h4>
        {hasNCD ? (
          ncdResult.results.map((ncd, i) => (
            <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-2">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status="pass" label={`NCD ${ncd.ncdId || ''}`} />
              </div>
              <p className="text-sm font-medium text-gray-900">{ncd.title}</p>
              {ncd.criteria?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Coverage Criteria:</p>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    {ncd.criteria.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {ncd.docRequirements?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Required Documentation:</p>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    {ncd.docRequirements.map((d, j) => (
                      <li key={j}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No NCD found for this diagnosis/procedure combination.</p>
        )}
      </div>

      {/* LCD Results */}
      <div>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Local Coverage Determinations
        </h4>
        {hasLCD ? (
          lcdResult.results.map((lcd, i) => (
            <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-2">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status="info" label={`LCD ${lcd.lcdId || ''}`} />
                {lcd.macId && (
                  <span className="text-xs text-gray-400 font-mono">MAC: {lcd.macId}</span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900">{lcd.title}</p>
              {lcd.localCriteria?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Local Criteria:</p>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    {lcd.localCriteria.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No LCD found for this procedure in your MAC jurisdiction.</p>
        )}
      </div>
    </Card>
  );
}
