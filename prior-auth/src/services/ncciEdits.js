/**
 * NCCI Bundling Edit Check — local JSON lookup.
 * Flowchart: Phase 4, Node 4 — NCCI Bundling Check
 *
 * Checks Procedure-to-Procedure (PTP) edits and Medically Unlikely
 * Edits (MUE) from pre-parsed CMS NCCI data files.
 */

let ptpCache = null;
let mueCache = null;

async function loadPTP() {
  if (ptpCache) return ptpCache;
  const res = await fetch('/data/ncci-ptp-onc.json');
  if (!res.ok) throw new Error('Failed to load NCCI PTP data');
  ptpCache = await res.json();
  return ptpCache;
}

async function loadMUE() {
  if (mueCache) return mueCache;
  const res = await fetch('/data/ncci-mue-onc.json');
  if (!res.ok) throw new Error('Failed to load NCCI MUE data');
  mueCache = await res.json();
  return mueCache;
}

/**
 * Check PTP edits for a set of CPT codes billed together.
 * Returns all conflicts between any pair of codes.
 */
export async function checkPTPEdits(cptCodes) {
  const data = await loadPTP();
  const codes = cptCodes.map((c) => c.trim());
  const conflicts = [];

  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const a = codes[i];
      const b = codes[j];

      const match = data.edits.find(
        (e) =>
          (e.col1 === a && e.col2 === b) ||
          (e.col1 === b && e.col2 === a)
      );

      if (match) {
        const modifierNote =
          match.modifier === 1
            ? 'Modifier allowed — use modifier -59 (distinct procedural service) if services are truly separate.'
            : 'No modifier override — these codes cannot be billed together on the same claim.';

        conflicts.push({
          code1: match.col1,
          code2: match.col2,
          code1Desc: match.col1Desc,
          code2Desc: match.col2Desc,
          modifier: match.modifier,
          modifierNote,
          context: match.context,
          effectiveDate: match.effectiveDate,
        });
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    message: conflicts.length > 0
      ? `WARNING: ${conflicts.length} NCCI PTP edit conflict(s) found.`
      : 'No NCCI PTP conflicts found for this code combination.',
  };
}

/**
 * Check MUE for a single CPT code.
 * Returns the maximum units allowed per day per beneficiary.
 */
export async function checkMUE(cpt) {
  const data = await loadMUE();
  const cleaned = cpt?.trim();

  const match = data.edits.find((e) => e.cpt === cleaned);

  if (!match) {
    return { found: false, mueValue: null, rationale: null };
  }

  return {
    found: true,
    mueValue: match.mueValue,
    adjudicationType: match.adjudicationType,
    rationale: match.rationale,
  };
}
