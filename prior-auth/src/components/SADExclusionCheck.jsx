import Card from './ui/Card';
import StatusBadge from './ui/StatusBadge';
import Spinner from './ui/Spinner';

export default function SADExclusionCheck({ result, loading, error }) {
  if (loading) {
    return (
      <Card title="SAD Exclusion Check">
        <Spinner label="Checking self-administered drug list..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="SAD Exclusion Check" status="warn">
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  if (!result) return null;

  // Not applicable for non-drug codes
  if (result.billingRoute === 'partB' && result.message?.includes('not a drug')) {
    return (
      <Card title="SAD Exclusion Check" status="info">
        <StatusBadge status="info" label="N/A" />
        <p className="mt-2 text-sm text-gray-500">{result.message}</p>
      </Card>
    );
  }

  const status = result.excluded ? 'fail' : 'pass';

  return (
    <Card title="SAD Exclusion Check" status={status}>
      <StatusBadge
        status={status}
        label={result.excluded ? 'Excluded — Part D' : 'Not Excluded — Part B'}
      />
      <p className="mt-2 text-sm text-gray-600">{result.message}</p>
    </Card>
  );
}
