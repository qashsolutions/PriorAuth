/**
 * POST /api/generate-letter
 *
 * Vercel Serverless Function — proxies Anthropic Claude for medical necessity letter.
 * ANTHROPIC_API_KEY is injected from Vercel Environment Variables.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { patientInfo, providerInfo, icd10, cpt, ncdText, lcdText, clinicalSummary, citations } = req.body;

  if (!patientInfo || !providerInfo || !icd10 || !cpt) {
    return res.status(400).json({ error: 'Missing required fields: patientInfo, providerInfo, icd10, cpt' });
  }

  const systemPrompt = `You are a medical documentation specialist drafting a Medicare medical necessity letter.

RULES:
- Use formal medical terminology appropriate for Medicare Administrative Contractor review.
- Cite specific NCD section numbers and LCD paragraph references when provided.
- Include all ICD-10 and CPT/HCPCS codes with their descriptions.
- Include PubMed citations when provided (PMID, title, journal).
- The letter must follow CMS-recognized format.
- Clearly mark the output as "DRAFT — Requires provider review and signature before submission."
- Do not fabricate clinical details. Use only what is provided.
- Do not include any disclaimer about not being medical advice — this is a template for provider use.`;

  const userPrompt = `Draft a medical necessity letter for Medicare prior authorization with the following details:

PROVIDER:
Name: ${providerInfo.name || 'N/A'}
NPI: ${providerInfo.npi || 'N/A'}
Specialty: ${providerInfo.specialty || 'N/A'}
Address: ${providerInfo.address || 'N/A'}

PATIENT:
Name: ${patientInfo.firstName || ''} ${patientInfo.lastName || ''}
MBI: ${patientInfo.mbi || 'N/A'}
Date of Birth: ${patientInfo.dob || 'N/A'}

DIAGNOSIS:
ICD-10: ${icd10.code || 'N/A'} — ${icd10.description || 'N/A'}

PROCEDURE REQUESTED:
CPT/HCPCS: ${cpt.code || 'N/A'} — ${cpt.description || '(description not available — AMA license pending)'}

NATIONAL COVERAGE DETERMINATION (NCD):
${ncdText || 'No NCD found for this procedure/diagnosis combination.'}

LOCAL COVERAGE DETERMINATION (LCD):
${lcdText || 'No LCD found for this MAC jurisdiction.'}

CLINICAL SUMMARY:
${clinicalSummary || 'No clinical summary provided.'}

SUPPORTING LITERATURE:
${citations?.length ? citations.map((c) => `- ${c.title} (PMID: ${c.pmid}, ${c.journal})`).join('\n') : 'No citations provided.'}

Generate the letter in the standard CMS-recognized format:
1. Provider header with NPI and address
2. RE: Patient identification line
3. Procedure requested with CPT code
4. Diagnosis with ICD-10 code
5. Medical necessity narrative citing NCD/LCD sections
6. Supporting clinical evidence
7. Literature citations
8. Conclusion requesting approval
9. Signature line marked as DRAFT`;

  try {
    const anthropicRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      return res.status(anthropicRes.status).json({
        error: `Anthropic API error (${anthropicRes.status})`,
        details: errBody,
      });
    }

    const data = await anthropicRes.json();
    const letterText = data.content?.[0]?.text || '';

    return res.status(200).json({
      letterText,
      model: data.model,
      usage: data.usage,
    });
  } catch (err) {
    return res.status(500).json({ error: `Letter generation failed: ${err.message}` });
  }
}
