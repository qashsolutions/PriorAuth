/**
 * CMS Coverage Database — NCD, LCD, and MAC lookups.
 * Flowchart: Phase 3, Nodes 2-3 — NCD Lookup + LCD/MAC Routing
 *
 * Uses the public CMS Medicare Coverage Database API (no key needed).
 */

const CMS_COVERAGE_BASE = 'https://www.cms.gov/medicare-coverage-database/search';

/**
 * Search National Coverage Determinations by ICD-10 and CPT.
 */
export async function searchNCD(icd10, cpt) {
  try {
    // CMS Coverage Database search API
    const params = new URLSearchParams({
      q: `${icd10} ${cpt}`,
      type: 'NCD',
      format: 'json',
    });

    const res = await fetch(`${CMS_COVERAGE_BASE}?${params}`);
    if (!res.ok) {
      return { found: false, results: [], error: `CMS NCD API error (${res.status})` };
    }

    const data = await res.json();
    const results = (data.results || []).map((r) => ({
      ncdId: r.id || r.ncd_id,
      title: r.title,
      covered: r.covered,
      criteria: r.criteria || [],
      docRequirements: r.documentation_requirements || [],
      url: r.url,
    }));

    return {
      found: results.length > 0,
      results,
    };
  } catch (err) {
    return { found: false, results: [], error: err.message };
  }
}

/**
 * Get MAC (Medicare Administrative Contractor) by practice ZIP code.
 */
export async function getContractors(zip) {
  try {
    const res = await fetch(
      `https://www.cms.gov/medicare-coverage-database/search?q=MAC+${encodeURIComponent(zip)}&type=contractor&format=json`
    );
    if (!res.ok) return { found: false, macId: null, macName: null };

    const data = await res.json();
    const mac = data.results?.[0];

    return {
      found: !!mac,
      macId: mac?.id || null,
      macName: mac?.name || null,
      jurisdiction: mac?.jurisdiction || null,
    };
  } catch (err) {
    return { found: false, macId: null, macName: null, error: err.message };
  }
}

/**
 * Search Local Coverage Determinations by CPT and practice ZIP.
 */
export async function searchLCD(cpt, zip) {
  try {
    const params = new URLSearchParams({
      q: cpt,
      type: 'LCD',
      zip: zip,
      format: 'json',
    });

    const res = await fetch(`${CMS_COVERAGE_BASE}?${params}`);
    if (!res.ok) {
      return { found: false, results: [], error: `CMS LCD API error (${res.status})` };
    }

    const data = await res.json();
    const results = (data.results || []).map((r) => ({
      lcdId: r.id || r.lcd_id,
      macId: r.mac_id,
      title: r.title,
      localCriteria: r.criteria || [],
      localDocs: r.documentation_requirements || [],
      url: r.url,
    }));

    return { found: results.length > 0, results };
  } catch (err) {
    return { found: false, results: [], error: err.message };
  }
}
