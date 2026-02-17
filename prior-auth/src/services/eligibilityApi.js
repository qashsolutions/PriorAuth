/**
 * Patient Eligibility Check — calls /api/eligibility (Stedi 270/271 proxy).
 * Flowchart: Phase 2, Node 1 — Patient Eligibility (270/271)
 *
 * Demo mode uses Stedi's predefined CMS test subscriber data so the request
 * flows end-to-end through the real Stedi sandbox API (test key in Vercel).
 */

export async function checkEligibility({ mbi, firstName, lastName, dob, providerNpi, providerName }) {
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
