/**
 * ICD-10 Code Validation — public ClinicalTable API (NLM).
 * Flowchart: Phase 2, Node 3 — ICD-10 Validation
 *
 * Uses the NLM Clinical Table Search Service which provides free
 * ICD-10-CM code lookup without any API key.
 */

const ICD10_API = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search';

export async function validateICD10(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, billable: false, description: null, error: 'ICD-10 code is required' };
  }

  const cleaned = code.replace(/[.\s]/g, '').toUpperCase();

  // Basic format: letter + 2 digits + optional up to 4 alphanumeric
  if (!/^[A-Z]\d{2}[A-Z0-9]{0,4}$/.test(cleaned)) {
    return { valid: false, billable: false, description: null, error: 'Invalid ICD-10 format' };
  }

  // Format with dot for API: X99.XXXX
  const formatted = cleaned.length > 3
    ? `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`
    : cleaned;

  try {
    const url = `${ICD10_API}?sf=code&terms=${encodeURIComponent(formatted)}&maxList=5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ICD-10 API error (${res.status})`);

    const data = await res.json();
    // Response format: [total, codes[], extra, displayStrings[]]
    const codes = data[1] || [];
    const descriptions = data[3] || [];

    const idx = codes.findIndex((c) => c.replace('.', '') === cleaned);

    if (idx === -1) {
      return {
        valid: false,
        billable: false,
        description: null,
        error: `Code ${formatted} not found in ICD-10-CM`,
        suggestions: codes.slice(0, 3),
      };
    }

    // A code is billable if it's at maximum specificity (has a decimal portion)
    const billable = cleaned.length >= 4;

    return {
      valid: true,
      billable,
      code: formatted,
      description: descriptions[idx]?.[0] || codes[idx],
      error: billable ? null : 'This is a header code — use a more specific code for billing',
    };
  } catch (err) {
    // Fallback: accept the code format but note that we couldn't verify
    return {
      valid: true,
      billable: null,
      code: formatted,
      description: null,
      error: `Could not verify against ICD-10 database: ${err.message}`,
    };
  }
}
