/**
 * Medical Necessity Letter Generation — calls /api/generate-letter.
 * Flowchart: Phase 4, Node 3 — Medical Necessity Letter
 *
 * Proxies to Anthropic Claude API via serverless function.
 * The letter is always a DRAFT requiring provider review and signature.
 */

export async function generateLetter({
  patientInfo,
  providerInfo,
  icd10,
  cpt,
  ncdText,
  lcdText,
  clinicalSummary,
  citations,
}) {
  const res = await fetch('/api/generate-letter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientInfo,
      providerInfo,
      icd10,
      cpt,
      ncdText,
      lcdText,
      clinicalSummary,
      citations,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Letter generation failed (${res.status})`);
  }

  const data = await res.json();

  return {
    letterText: data.letterText,
    model: data.model,
    usage: data.usage,
  };
}
