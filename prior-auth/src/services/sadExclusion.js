/**
 * Self-Administered Drug (SAD) Exclusion Check.
 * Flowchart: Phase 3, Node 4 — SAD Exclusion
 *
 * Checks if a drug HCPCS code is on the CMS Self-Administered Drug
 * exclusion list. If excluded, the drug is Part D (not Part B) and
 * cannot be billed under the physician fee schedule.
 *
 * This is critical for oncology drug administration cases (e.g., J-codes).
 */

const CMS_SAD_BASE = 'https://www.cms.gov/medicare-coverage-database/search';

export async function checkSADExclusion(hcpcs) {
  if (!hcpcs || typeof hcpcs !== 'string') {
    return { excluded: false, billingRoute: null, error: 'HCPCS code is required' };
  }

  const cleaned = hcpcs.trim().toUpperCase();

  // SAD exclusion is primarily relevant for J-codes (drug/biological)
  // and Q-codes (temporary codes for drugs)
  const isDrugCode = /^[JQ]\d{4}$/.test(cleaned);

  if (!isDrugCode) {
    return {
      excluded: false,
      billingRoute: 'partB',
      message: `Code ${cleaned} is not a drug/biological code — SAD exclusion check not applicable.`,
    };
  }

  try {
    const res = await fetch(
      `${CMS_SAD_BASE}?q=SAD+${encodeURIComponent(cleaned)}&type=SAD&format=json`
    );

    if (!res.ok) {
      // If API fails, report as unknown rather than blocking
      return {
        excluded: null,
        billingRoute: null,
        error: `Could not verify SAD status (${res.status}). Check manually.`,
      };
    }

    const data = await res.json();
    const match = data.results?.find(
      (r) => r.hcpcs === cleaned || r.code === cleaned
    );

    if (match) {
      return {
        excluded: true,
        billingRoute: 'partD',
        message: `EXCLUDED — Code ${cleaned} is on the CMS Self-Administered Drug exclusion list. Bill under Part D, not Part B.`,
        details: match,
      };
    }

    return {
      excluded: false,
      billingRoute: 'partB',
      message: `NOT EXCLUDED — Code ${cleaned} is not on the SAD list. Eligible for Part B billing.`,
    };
  } catch (err) {
    return {
      excluded: null,
      billingRoute: null,
      error: `SAD check failed: ${err.message}`,
    };
  }
}
