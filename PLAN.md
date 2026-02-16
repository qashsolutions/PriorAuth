# Implementation Plan — Denali.health Medicare PA Assistant MVP

## Build Order (12 steps from prompt, grouped into 6 phases)

### Phase A: Project Scaffolding (Steps 1)
- [x] `package.json` — React 18, Vite 5, Tailwind 3, vite-plugin-pwa
- [x] `vite.config.js` — SPA fallback, PWA plugin config
- [x] `tailwind.config.js` — content globs, Denali color theme
- [x] `postcss.config.js` — tailwindcss + autoprefixer
- [x] `vercel.json` — SPA rewrites, /api/* function config
- [x] `.gitignore` — .env*, node_modules, dist
- [x] `.env.example` — template with placeholder keys
- [x] `index.html` — Vite entry point
- [x] `public/manifest.json` — PWA manifest
- [x] `src/styles/globals.css` — Tailwind directives + custom styles
- [x] `src/main.jsx` — React root mount

### Phase B: Utilities + Static Data (Steps 2 partial, 6, 8)
- [x] `src/utils/mbiValidator.js` — MBI format regex + validation
- [x] `src/utils/npiValidator.js` — Luhn-10 with 80840 prefix
- [x] `src/utils/formatters.js` — display formatting helpers
- [x] `public/data/pa-required-codes.json` — CMS PA required lists
- [x] `public/data/ncci-ptp-onc.json` — PTP edits (oncology subset)
- [x] `public/data/ncci-mue-onc.json` — MUE values (oncology subset)

### Phase C: Services Layer (Steps 3–5, 6–9)
- [x] `src/services/eligibilityApi.js` — POST /api/eligibility
- [x] `src/services/nppes.js` — GET NPPES API (public)
- [x] `src/services/icd10.js` — ICD-10 validation (public API)
- [x] `src/services/paRequired.js` — JSON lookup
- [x] `src/services/cmsCoverage.js` — CMS Coverage API (NCD+LCD+MAC)
- [x] `src/services/sadExclusion.js` — CMS SAD list (public API)
- [x] `src/services/ncciEdits.js` — JSON lookup (PTP + MUE)
- [x] `src/services/letterApi.js` — POST /api/generate-letter

### Phase D: Serverless API Routes (Step 3)
- [x] `api/eligibility.js` — Stedi proxy with STEDI_API_KEY
- [x] `api/generate-letter.js` — Anthropic proxy with ANTHROPIC_API_KEY

### Phase E: React Components (Steps 2, 10, 11)
- [x] Shared UI: StatusBadge, StepIndicator, Card, Spinner, Alert
- [x] IntakeForm: PatientStep, ProviderStep, ClinicalStep, wrapper
- [x] Results: EligibilityCheck, PARequiredCheck, CoverageDetermination
- [x] Results: NCCIBundlingCheck, SADExclusionCheck
- [x] Output: MedNecessityLetter
- [x] Assembly: Dashboard (7 status cards + gap list + letter)

### Phase F: App Assembly + Deploy (Steps 10, 12)
- [x] `src/App.jsx` — useReducer state machine, case router, view switcher
- [ ] Test locally with `vite dev`
- [ ] Deploy to Vercel, set env vars

## Key Architecture Decisions

1. **State machine in App.jsx**: useReducer with states: `intake → processing → results`
2. **Parallel API calls**: After intake submission, fire all independent checks concurrently via Promise.allSettled
3. **No database**: All state in React memory, cleared on refresh
4. **Server-side keys only**: Stedi + Anthropic calls go through /api/* routes
5. **Client-side public APIs**: NPPES, CMS Coverage, CMS data files called directly
6. **Static data for MVP**: PA required list, NCCI edits stored as JSON, updated quarterly manually
