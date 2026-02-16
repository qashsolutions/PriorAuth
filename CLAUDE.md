# Denali.health — Medicare Prior Authorization Assistant

## Project Overview
Medicare Prior Authorization Assistant MVP for Radiation Oncology.
React 18 + Vite 5 + Tailwind CSS, deployed on Vercel.

## Deployed URL
https://pa-qash.vercel.app/

## Repository Structure
- `prior-auth/` — main app (Vite + React)
  - `api/eligibility.js` — Vercel serverless: Stedi 270/271 eligibility check
  - `api/generate-letter.js` — Vercel serverless: Anthropic Claude letter generation
  - `src/components/` — React components (IntakeForm, Dashboard, checks, letter)
  - `src/services/` — API clients (eligibilityApi, letterApi, nppes, icd10, etc.)
  - `public/data/` — static JSON (PA-required codes, NCCI edits, MUE limits)
- `PLAN.md` — implementation plan (6 phases)
- `filestr.md` — full file structure reference

## Environment Variables (set in Vercel dashboard, NOT in .env.local)
- `STEDI_API_KEY` — Stedi healthcare eligibility API (used in api/eligibility.js)
- `ANTHROPIC_API_KEY` — Anthropic Claude API (used in api/generate-letter.js)

Both keys are configured in Vercel project settings. No .env.local needed for deployed app.
For local dev, use `vercel dev` (reads from Vercel env vars) or create .env.local.

## API Endpoints
- `POST /api/eligibility` — proxies Stedi 270/271 for Medicare eligibility
- `POST /api/generate-letter` — proxies Anthropic Claude for medical necessity letter

## Database
None. This is intentional for MVP:
- All state lives in React memory (useReducer in App.jsx), cleared on refresh
- No PHI storage, no server-side persistence, no backend database
- Session-only architecture — no patient data is saved anywhere

## Key Decisions
- No database — session-only, in-memory state (no PHI storage)
- No .env.local in repo — keys live in Vercel env vars only
- Model: claude-sonnet-4-20250514 for letter generation
- Stedi endpoint: https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3
- Client-side public APIs: NPPES, CMS Coverage, ICD-10 (no keys needed)
- Static data for MVP: PA-required codes, NCCI edits as JSON files, updated manually
