/**
 * Prior Authorization Required Check — local JSON lookup.
 * Flowchart: Phase 3, Node 1 — Prior Auth Required?
 *
 * Checks CMS PA-required procedure lists:
 *   - Hospital OPD (CMS-1716-F, 2020)
 *   - ASC Demonstration (2025, 10 states)
 *   - WISeR Model (2026, 6 states)
 *   - DMEPOS PA
 */

let cachedData = null;

async function loadData() {
  if (cachedData) return cachedData;
  const res = await fetch('/data/pa-required-codes.json');
  if (!res.ok) throw new Error('Failed to load PA required codes data');
  cachedData = await res.json();
  return cachedData;
}

export async function checkPARequired(hcpcs, practiceState = null) {
  const data = await loadData();
  const cleaned = hcpcs?.trim().toUpperCase();

  if (!cleaned) {
    return { required: false, matches: [], error: 'No procedure code provided' };
  }

  const matches = data.codes.filter((c) => c.hcpcs === cleaned);

  if (matches.length === 0) {
    return {
      required: false,
      matches: [],
      message: `PA NOT REQUIRED — Code ${cleaned} does not appear on any CMS prior authorization required list for Original Medicare FFS.`,
    };
  }

  // Filter state-specific lists if practice state is known
  const applicable = matches.filter((m) => {
    if (!m.states) return true; // national — always applies
    if (!practiceState) return true; // unknown state — show all
    return m.states.includes(practiceState.toUpperCase());
  });

  if (applicable.length === 0) {
    return {
      required: false,
      matches,
      message: `PA NOT REQUIRED in ${practiceState} — Code ${cleaned} appears on a state-specific PA list but not for your state.`,
    };
  }

  const listNames = applicable.map((m) => m.list).join(', ');
  return {
    required: true,
    matches: applicable,
    message: `PA REQUIRED — Code ${cleaned} appears on: ${listNames}. Authorization must be obtained before service.`,
  };
}
