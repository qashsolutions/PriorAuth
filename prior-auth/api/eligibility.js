/**
 * POST /api/eligibility
 *
 * Vercel Serverless Function — proxies Stedi 270/271 eligibility check.
 * STEDI_API_KEY is injected from Vercel Environment Variables.
 */

const STEDI_URL = 'https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.STEDI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'STEDI_API_KEY not configured' });
  }

  const { mbi, firstName, lastName, dob, providerNpi, providerName } = req.body;

  if (!mbi || !firstName || !lastName || !dob || !providerNpi) {
    return res.status(400).json({ error: 'Missing required fields: mbi, firstName, lastName, dob, providerNpi' });
  }

  // Format DOB as YYYYMMDD for Stedi
  const formattedDOB = dob.replace(/-/g, '');

  const stediPayload = {
    controlNumber: String(Date.now()).slice(-9),
    tradingPartnerServiceId: 'CMS',
    provider: {
      organizationName: providerName || 'Provider',
      npi: providerNpi,
    },
    subscriber: {
      memberId: mbi.replace(/[-\s]/g, ''),
      firstName: firstName.toUpperCase(),
      lastName: lastName.toUpperCase(),
      dateOfBirth: formattedDOB,
    },
    encounter: {
      serviceTypeCodes: ['30'], // Health benefit plan coverage
    },
  };

  try {
    const stediRes = await fetch(STEDI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
        'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '0.0.0.0',
      },
      body: JSON.stringify(stediPayload),
    });

    if (!stediRes.ok) {
      const errBody = await stediRes.text();
      return res.status(stediRes.status).json({
        error: `Stedi API error (${stediRes.status})`,
        details: errBody,
      });
    }

    const raw = await stediRes.json();

    // Parse 271 response
    const parsed = parse271Response(raw);

    return res.status(200).json({ ...parsed, raw });
  } catch (err) {
    return res.status(500).json({ error: `Eligibility check failed: ${err.message}` });
  }
}

function parse271Response(data) {
  const planStatus = data.planStatus || data.subscriber?.planStatus;
  const eligible = planStatus === 'Active' || planStatus === '1';

  // Check insurance type — MA vs FFS
  const insuranceType = data.insuranceTypeCode || data.subscriber?.insuranceTypeCode;
  const isMA = insuranceType && !['MA', 'MB'].includes(insuranceType);
  const payerType = isMA ? 'MA' : 'FFS';

  const parts = [];
  if (insuranceType === 'MA' || data.partA) parts.push('A');
  if (insuranceType === 'MB' || data.partB) parts.push('B');
  if (parts.length === 0 && eligible) parts.push('A', 'B'); // default

  return {
    eligible,
    payerType,
    parts,
    effectiveDates: {
      partA: data.partAEffective || null,
      partB: data.partBEffective || null,
    },
    secondaryPayer: data.secondaryPayer || null,
    maPlanName: isMA ? (data.planName || data.payerName || null) : null,
  };
}
