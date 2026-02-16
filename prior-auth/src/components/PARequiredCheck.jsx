import Card from './ui/Card';
import StatusBadge from './ui/StatusBadge';
import Spinner from './ui/Spinner';
import { formatDate } from '../utils/formatters';

export default function PARequiredCheck({ result, loading, error }) {
  if (loading) {
    return (
      <Card title="Prior Authorization Required?">
        <Spinner label="Checking PA requirement..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Prior Authorization Required?" status="warn">
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  if (!result) return null;

  const status = result.required ? 'fail' : 'pass';

  return (
    <Card title="Prior Authorization Required?" status={status}>
      <StatusBadge
        status={result.required ? 'warn' : 'pass'}
        label={result.required ? 'PA Required' : 'PA Not Required'}
      />
      <p className="mt-2 text-sm text-gray-600">{result.message}</p>
      {result.required && result.matches?.length > 0 && (
        <div className="mt-3 space-y-2">
          {result.matches.map((m, i) => (
            <div key={i} className="p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <p className="font-mono font-medium">{m.hcpcs}</p>
              <p className="text-gray-600">{m.description}</p>
              <p className="text-gray-500 mt-1">
                List: <span className="font-medium">{m.list}</span>
                {m.effectiveDate && ` | Effective: ${formatDate(m.effectiveDate)}`}
                {m.states && ` | States: ${m.states.join(', ')}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
