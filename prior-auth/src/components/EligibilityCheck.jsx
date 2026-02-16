import Card from './ui/Card';
import StatusBadge from './ui/StatusBadge';
import Spinner from './ui/Spinner';
import Alert from './ui/Alert';
import { formatDate } from '../utils/formatters';

export default function EligibilityCheck({ result, loading, error }) {
  if (loading) {
    return (
      <Card title="Patient Eligibility (270/271)">
        <Spinner label="Checking eligibility via Stedi..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Patient Eligibility (270/271)" status="fail">
        <Alert type="error" title="Eligibility check failed">{error}</Alert>
      </Card>
    );
  }

  if (!result) return null;

  // Medicare Advantage gate — STOP
  if (result.payerType === 'MA') {
    return (
      <Card title="Patient Eligibility (270/271)" status="fail">
        <StatusBadge status="fail" label="Medicare Advantage" />
        <Alert type="error" title="Medicare Advantage Detected" className="mt-3">
          This patient is enrolled in Medicare Advantage plan
          {result.maPlanName ? ` (${result.maPlanName})` : ''}.
          This tool is designed for Original Medicare FFS only.
          MA plans have plan-specific PA rules that are not covered by this tool.
        </Alert>
      </Card>
    );
  }

  const status = result.eligible ? 'pass' : 'fail';

  return (
    <Card title="Patient Eligibility (270/271)" status={status}>
      <div className="flex items-center gap-2 mb-3">
        <StatusBadge
          status={status}
          label={result.eligible ? 'Active — Original Medicare FFS' : 'Not Eligible'}
        />
      </div>
      {result.eligible && (
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium">Coverage:</span>{' '}
            Part {result.parts?.join(' + Part ') || 'A + B'}
          </p>
          {result.effectiveDates?.partA && (
            <p>
              <span className="font-medium">Part A effective:</span>{' '}
              {formatDate(result.effectiveDates.partA)}
            </p>
          )}
          {result.effectiveDates?.partB && (
            <p>
              <span className="font-medium">Part B effective:</span>{' '}
              {formatDate(result.effectiveDates.partB)}
            </p>
          )}
          {result.secondaryPayer && (
            <p>
              <span className="font-medium">Secondary payer:</span> {result.secondaryPayer}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
