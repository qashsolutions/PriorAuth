/**
 * NPI Lookup — direct call to public NPPES API (no key needed).
 * Flowchart: Phase 2, Node 2 — NPI Validation
 */

const NPPES_BASE = 'https://npiregistry.cms.hhs.gov/api/';

export async function lookupNPI(npi) {
  const url = `${NPPES_BASE}?number=${encodeURIComponent(npi)}&version=2.1`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`NPPES lookup failed (${res.status})`);
  }

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    return { found: false, active: false, name: null, specialty: null, address: null };
  }

  const r = data.results[0];
  const isOrg = r.enumeration_type === 'NPI-2';
  const name = isOrg
    ? r.basic?.organization_name
    : `${r.basic?.first_name || ''} ${r.basic?.last_name || ''}`.trim();

  const taxonomy = r.taxonomies?.find((t) => t.primary) || r.taxonomies?.[0];
  const address = r.addresses?.find((a) => a.address_purpose === 'LOCATION') || r.addresses?.[0];

  return {
    found: true,
    active: r.basic?.status === 'A',
    name,
    credential: r.basic?.credential || null,
    specialty: taxonomy?.desc || null,
    taxonomyCode: taxonomy?.code || null,
    state: taxonomy?.state || address?.state || null,
    address: address
      ? `${address.address_1 || ''}, ${address.city || ''}, ${address.state || ''} ${address.postal_code?.slice(0, 5) || ''}`
      : null,
  };
}
