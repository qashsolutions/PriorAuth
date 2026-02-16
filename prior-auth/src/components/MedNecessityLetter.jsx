import { useState } from 'react';
import Card from './ui/Card';
import Spinner from './ui/Spinner';
import Alert from './ui/Alert';

export default function MedNecessityLetter({ letterText, loading, error, onGenerate }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!letterText) return;
    try {
      await navigator.clipboard.writeText(letterText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = letterText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <Card title="Medical Necessity Letter">
        <Spinner label="Generating draft letter via Claude..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Medical Necessity Letter" status="fail">
        <Alert type="error" title="Letter generation failed">{error}</Alert>
        {onGenerate && (
          <button
            onClick={onGenerate}
            className="mt-3 px-4 py-2 bg-denali-600 text-white rounded-lg text-sm font-medium hover:bg-denali-700"
          >
            Retry
          </button>
        )}
      </Card>
    );
  }

  if (!letterText && onGenerate) {
    return (
      <Card title="Medical Necessity Letter" status="info">
        <p className="text-sm text-gray-600 mb-3">
          Generate a draft medical necessity letter using the case details and coverage findings above.
        </p>
        <button
          onClick={onGenerate}
          className="px-4 py-2 bg-denali-600 text-white rounded-lg text-sm font-medium hover:bg-denali-700"
        >
          Generate Draft Letter
        </button>
      </Card>
    );
  }

  if (!letterText) return null;

  return (
    <Card title="Medical Necessity Letter" status="pass">
      <Alert type="warn" title="DRAFT">
        This letter requires provider review and signature before submission.
      </Alert>

      <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg font-serif text-sm leading-relaxed whitespace-pre-wrap print:border-none print:p-0">
        {letterText}
      </div>

      <div className="mt-4 flex gap-3 no-print">
        <button
          onClick={handleCopy}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Print / Save as PDF
        </button>
      </div>
    </Card>
  );
}
