# Denali.health Medicare Prior Authorization Assistant — File Structure

> Complete hierarchical tree for the MVP PWA.
> Maps to the 5-phase flowchart and the 12-step build order in `medicare_onco_PA`.

```
prior-auth/
│
├── .env.example                          # Template — never real keys
├── .env.local                            # Local dev keys (GITIGNORED)
├── .gitignore                            # .env*, node_modules, dist
├── index.html                            # Vite entry HTML (mounts #root)
├── package.json                          # Dependencies + scripts
├── vite.config.js                        # Vite config + PWA plugin
├── tailwind.config.js                    # Tailwind theme + content globs
├── postcss.config.js                     # PostCSS — autoprefixer + tailwind
├── vercel.json                           # Vercel rewrites for SPA + /api/*
├── README.md                             # Project overview + setup
│
│   ═══════════════════════════════════════════════════════════════════
│   SERVERLESS API ROUTES (Vercel Functions — secrets stay server-side)
│   ═══════════════════════════════════════════════════════════════════
│
├── api/
│   ├── eligibility.js                    # POST /api/eligibility
│   │                                     #   → proxies Stedi 270/271
│   │                                     #   → injects STEDI_API_KEY
│   │                                     #   → returns parsed 271 response
│   │
│   └── generate-letter.js               # POST /api/generate-letter
│                                         #   → proxies Anthropic Claude
│                                         #   → injects ANTHROPIC_API_KEY
│                                         #   → returns draft letter text
│
│   ═══════════════════════════════════════════════════════════════════
│   PUBLIC / STATIC ASSETS
│   ═══════════════════════════════════════════════════════════════════
│
├── public/
│   ├── favicon.ico                       # App favicon
│   ├── logo-192.png                      # PWA icon 192×192
│   ├── logo-512.png                      # PWA icon 512×512
│   ├── manifest.json                     # PWA manifest (name, icons, theme)
│   │
│   └── data/                             # Static CMS data (updated quarterly)
│       │
│       ├── pa-required-codes.json        # CMS PA-required procedure lists
│       │                                 #   Sources:
│       │                                 #     - Hospital OPD list (CMS-1716-F)
│       │                                 #     - ASC demonstration (10 states)
│       │                                 #     - WISeR model (6 states)
│       │                                 #     - DMEPOS PA list
│       │                                 #   Schema: [{
│       │                                 #     hcpcs, description, list,
│       │                                 #     effectiveDate, states[]
│       │                                 #   }]
│       │
│       ├── ncci-ptp-onc.json             # NCCI Procedure-to-Procedure edits
│       │                                 #   Pre-filtered to rad-onc + imaging
│       │                                 #   code ranges (77xxx, 78xxx, G-codes)
│       │                                 #   Schema: [{
│       │                                 #     col1, col2, modifier (0|1),
│       │                                 #     effectiveDate, context
│       │                                 #   }]
│       │
│       └── ncci-mue-onc.json             # NCCI Medically Unlikely Edits
│                                         #   Max units per CPT per day
│                                         #   Schema: [{
│                                         #     cpt, mueValue, rationale,
│                                         #     adjudicationType (1|2|3)
│                                         #   }]
│
│   ═══════════════════════════════════════════════════════════════════
│   SOURCE CODE
│   ═══════════════════════════════════════════════════════════════════
│
├── src/
│   ├── main.jsx                          # ReactDOM.createRoot → <App />
│   ├── App.jsx                           # Top-level router + state container
│   │                                     #   useReducer for case workflow state
│   │                                     #   Renders: IntakeForm → Dashboard
│   │
│   │   ───────────────────────────────────────────────────────────────
│   │   STYLES
│   │   ───────────────────────────────────────────────────────────────
│   │
│   ├── styles/
│   │   └── globals.css                   # @tailwind directives + base resets
│   │                                     #   Custom scrollbar, status colors,
│   │                                     #   print styles for letter export
│   │
│   │   ───────────────────────────────────────────────────────────────
│   │   UTILITIES — Pure functions, no side effects
│   │   ───────────────────────────────────────────────────────────────
│   │
│   ├── utils/
│   │   ├── mbiValidator.js               # MBI format: 1AN-A9AN-AA99
│   │   │                                 #   exports: validateMBI(mbi) → {valid, error}
│   │   │
│   │   ├── npiValidator.js               # NPI Luhn check with 80840 prefix
│   │   │                                 #   exports: validateNPI(npi) → {valid, error}
│   │   │
│   │   └── formatters.js                 # Display formatting helpers
│   │                                     #   exports: formatMBI, formatDate,
│   │                                     #   formatNPI, statusBadge, truncate
│   │
│   │   ───────────────────────────────────────────────────────────────
│   │   SERVICES — API calls + data lookups (one per data source)
│   │   Maps 1:1 to flowchart nodes
│   │   ───────────────────────────────────────────────────────────────
│   │
│   ├── services/
│   │   │
│   │   │  ┌─ Phase 2: Verify ────────────────────────────────────┐
│   │   │
│   │   ├── eligibilityApi.js             # Calls /api/eligibility (keyed)
│   │   │                                 #   → Stedi 270/271 → CMS HETS
│   │   │                                 #   exports: checkEligibility(params)
│   │   │                                 #   returns: {eligible, payerType,
│   │   │                                 #     parts[], effectiveDates,
│   │   │                                 #     secondaryPayer}
│   │   │
│   │   ├── nppes.js                      # Direct call — public, no key
│   │   │                                 #   GET npiregistry.cms.hhs.gov/api/
│   │   │                                 #   exports: lookupNPI(npi)
│   │   │                                 #   returns: {active, name, specialty,
│   │   │                                 #     taxonomy, address}
│   │   │
│   │   ├── icd10.js                      # Public API or bundled JSON lookup
│   │   │                                 #   exports: validateICD10(code)
│   │   │                                 #   returns: {valid, billable,
│   │   │                                 #     description, hierarchy}
│   │   │
│   │   │  ┌─ Phase 3: Coverage Determination ────────────────────┐
│   │   │
│   │   ├── paRequired.js                 # Local JSON lookup
│   │   │                                 #   Loads /data/pa-required-codes.json
│   │   │                                 #   exports: checkPARequired(hcpcs, state)
│   │   │                                 #   returns: {required, list, effectiveDate}
│   │   │
│   │   ├── cmsCoverage.js                # Direct call — public, no key
│   │   │                                 #   CMS Coverage Database API
│   │   │                                 #   exports:
│   │   │                                 #     searchNCD(icd10, cpt)
│   │   │                                 #       → {ncdId, covered, criteria[],
│   │   │                                 #          docRequirements[]}
│   │   │                                 #     searchLCD(cpt, zip)
│   │   │                                 #       → {lcdId, macId, localCriteria[],
│   │   │                                 #          localDocs[]}
│   │   │                                 #     getContractors(zip)
│   │   │                                 #       → {macId, macName, jurisdiction}
│   │   │
│   │   ├── sadExclusion.js               # Direct call — public, no key
│   │   │                                 #   CMS SAD exclusion list
│   │   │                                 #   exports: checkSADExclusion(hcpcs)
│   │   │                                 #   returns: {excluded, billingRoute}
│   │   │
│   │   ├── ncciEdits.js                  # Local JSON lookup
│   │   │                                 #   Loads /data/ncci-ptp-onc.json
│   │   │                                 #   and /data/ncci-mue-onc.json
│   │   │                                 #   exports:
│   │   │                                 #     checkPTPEdits(cptCodes[])
│   │   │                                 #       → {conflicts[], allowedCombos[]}
│   │   │                                 #     checkMUE(cpt)
│   │   │                                 #       → {mueValue, rationale}
│   │   │
│   │   │  ┌─ Phase 4: Documentation + Output ────────────────────┐
│   │   │
│   │   └── letterApi.js                  # Calls /api/generate-letter (keyed)
│   │                                     #   → Anthropic Claude claude-sonnet-4-20250514
│   │                                     #   exports: generateLetter(payload)
│   │                                     #   payload: {patientInfo, providerInfo,
│   │                                     #     icd10, cpt, ncdText, lcdText,
│   │                                     #     clinicalSummary, citations[]}
│   │                                     #   returns: {letterText, model, usage}
│   │
│   │   ───────────────────────────────────────────────────────────────
│   │   COMPONENTS — React UI (one per workflow node)
│   │   ───────────────────────────────────────────────────────────────
│   │
│   └── components/
│       │
│       │  ┌─ Phase 1: Intake ────────────────────────────────────┐
│       │
│       ├── IntakeForm/
│       │   ├── IntakeForm.jsx            # Multi-step wrapper
│       │   │                             #   Manages step index (1→2→3)
│       │   │                             #   Validates per-step before advance
│       │   │                             #   Emits completed case_object to App
│       │   │
│       │   ├── PatientStep.jsx           # Step 1: MBI, DOB, name
│       │   │                             #   Inline MBI format validation
│       │   │                             #   MBI mask: 1AN-A9AN-AA99
│       │   │
│       │   ├── ProviderStep.jsx          # Step 2: NPI, practice ZIP
│       │   │                             #   NPI Luhn check on blur
│       │   │                             #   Auto-lookup NPI → show provider name
│       │   │
│       │   └── ClinicalStep.jsx          # Step 3: ICD-10, CPT, POS, notes
│       │                                 #   ICD-10 format check + description
│       │                                 #   CPT accepted as-is (no AMA license)
│       │                                 #   Free-text clinical summary
│       │
│       │  ┌─ Phase 2–3: Verification + Coverage ─────────────────┐
│       │
│       ├── EligibilityCheck.jsx          # Displays 270/271 result
│       │                                 #   FFS ✅ → continue
│       │                                 #   MA ⛔ → stop with message
│       │                                 #   Shows Part A/B status + dates
│       │
│       ├── PARequiredCheck.jsx           # Displays PA requirement result
│       │                                 #   Shows which list, state, date
│       │
│       ├── CoverageDetermination.jsx     # Displays NCD + LCD results
│       │                                 #   Coverage status: Covered / Not / Gap
│       │                                 #   Shows NCD § + LCD paragraph citations
│       │                                 #   Documentation requirements list
│       │
│       ├── NCCIBundlingCheck.jsx         # Displays PTP + MUE results
│       │                                 #   Conflict warnings with modifier info
│       │
│       ├── SADExclusionCheck.jsx         # Displays SAD exclusion result
│       │                                 #   Part B vs Part D routing
│       │
│       │  ┌─ Phase 4: Documentation + Output ────────────────────┐
│       │
│       ├── MedNecessityLetter.jsx        # Draft letter display
│       │                                 #   Rendered preview
│       │                                 #   Copy-to-clipboard button
│       │                                 #   Print / download as PDF
│       │                                 #   "DRAFT — requires provider review"
│       │
│       │  ┌─ Assembly ───────────────────────────────────────────┐
│       │
│       ├── Dashboard.jsx                 # Single-screen results dashboard
│       │                                 #   Color-coded status cards (7 checks)
│       │                                 #   Documentation gap summary
│       │                                 #   Link to letter
│       │                                 #   "New Case" reset button
│       │
│       └── ui/                           # Shared presentational components
│           ├── StatusBadge.jsx           # ✅ ⚠️ ❌ badge with label
│           ├── StepIndicator.jsx         # Intake form step progress bar
│           ├── Card.jsx                  # Reusable card wrapper
│           ├── Spinner.jsx              # Loading indicator
│           └── Alert.jsx                 # Info / warning / error banners
│
│   ═══════════════════════════════════════════════════════════════════
│   REFERENCE DOCUMENTS (not part of build — design artifacts)
│   ═══════════════════════════════════════════════════════════════════
│
├── docs/
│   ├── medicare_onco_PA                  # System prompt / build spec
│   └── medicare-onc-prior-auth-flow.html # Flowchart — 5-phase data flow
│
└── (end)
```

## Component ↔ Flowchart Node Mapping

| Flowchart Node                | Component / Service File         | Status  |
|-------------------------------|----------------------------------|---------|
| Structured Intake Form        | `IntakeForm/*.jsx`               | BUILD   |
| Case Router                   | `App.jsx` (useReducer logic)     | BUILD   |
| Patient Eligibility (270/271) | `eligibilityApi.js` → `/api/eligibility.js` | READY (Stedi) |
| NPI Validation                | `nppes.js` → NPPES API           | READY (MCP) |
| ICD-10 Validation             | `icd10.js` → CMS data            | READY (MCP) |
| CPT/HCPCS Validation          | Manual input (no AMA license)    | PARTIAL |
| Prior Auth Required?          | `paRequired.js` → JSON           | BUILD   |
| NCD Lookup                    | `cmsCoverage.js` → CMS API       | READY (MCP) |
| LCD + MAC Routing             | `cmsCoverage.js` → CMS API       | READY (MCP) |
| SAD Exclusion                 | `sadExclusion.js` → CMS API      | READY (MCP) |
| NCCI Bundling Check           | `ncciEdits.js` → JSON            | BUILD   |
| Documentation Gap Check       | `CoverageDetermination.jsx`      | BUILD   |
| Evidence Retrieval            | `cmsCoverage.js` (PubMed ext.)   | READY (MCP) |
| Medical Necessity Letter      | `letterApi.js` → `/api/generate-letter.js` | BUILD |
| Coverage Dashboard            | `Dashboard.jsx`                  | BUILD   |
| Policy Change Alerts          | Deferred (Phase 2)               | —       |
| Denial Pattern Learning       | Deferred (Phase 2)               | —       |

## Data Flow Summary

```
                     ┌──────────────────┐
                     │   IntakeForm     │
                     │  (3-step wizard) │
                     └────────┬─────────┘
                              │ case_object
                              ▼
                     ┌──────────────────┐
                     │    App.jsx       │
                     │  Case Router     │
                     │  (useReducer)    │
                     └────────┬─────────┘
                              │ dispatches parallel checks
            ┌─────────┬───────┼───────┬──────────┐
            ▼         ▼       ▼       ▼          ▼
       Eligibility  NPI    ICD-10   PA Req   Coverage
       (Stedi)    (NPPES) (CMS)   (JSON)   (NCD+LCD)
            │         │       │       │          │
            └─────────┴───────┴───────┴──────────┘
                              │ all results
                              ▼
                     ┌──────────────────┐
                     │    Dashboard     │
                     │  (7 status cards │
                     │   + gap list     │
                     │   + letter link) │
                     └──────────────────┘
```
