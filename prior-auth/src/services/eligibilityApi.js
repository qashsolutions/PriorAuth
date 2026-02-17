/**
 * Patient Eligibility Check — calls /api/eligibility (Stedi 270/271 proxy).
 * Flowchart: Phase 2, Node 1 — Patient Eligibility (270/271)
 *
 * In demo mode, returns mock data instead of hitting the real CMS/HETS system.
 * CMS prohibits test transactions with fake patients on their production system.
 */

export async function checkEligibility({ mbi, firstName, lastName, dob, providerNpi, providerName, isDemo }) {
  // Demo mode — return realistic mock data without calling Stedi/CMS
  if (isDemo) {
    await new Promise((r) => setTimeout(r, 600)); // simulate network delay
    return {
      eligible: true,
      payerType: 'FFS',
      parts: ['A', 'B'],
      effectiveDates: {
        partA: '2019-07-01',
        partB: '2019-07-01',
      },
      secondaryPayer: null,
      maPlanName: null,
      raw: { _demo: true, note: 'Mock 271 response — demo mode' },
    };
  }

  const res = await fetch('/api/eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mbi, firstName, lastName, dob, providerNpi, providerName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Eligibility check failed (${res.status})`);
  }

  const data = await res.json();

  return {
    eligible: data.eligible,
    payerType: data.payerType,       // "FFS" | "MA"
    parts: data.parts,               // ["A", "B"]
    effectiveDates: data.effectiveDates,
    secondaryPayer: data.secondaryPayer,
    maPlanName: data.maPlanName,      // only if MA
    raw: data.raw,
  };
}
