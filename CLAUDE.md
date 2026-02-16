# PriorAuth — Medicare Prior Authorization Assistant

## Project Overview
Medicare Prior Authorization Assistant MVP for Radiation Oncology.
React 18 + Vite 5 + Tailwind CSS, deployed on Vercel.
Product name in UI: "Denali.health" (branding only — no domain yet).

## Deployed URL
https://pa-qash.vercel.app/

## Supabase
- Project URL: `https://jtpxzsrtumwtfqzbhfiz.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/jtpxzsrtumwtfqzbhfiz`
- Migration `001_initial_schema.sql` has been executed
- Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) set in Vercel

## Repository Structure
- `prior-auth/` — main app (Vite + React)
  - `api/eligibility.js` — Vercel serverless: Stedi 270/271 eligibility check
  - `api/generate-letter.js` — Vercel serverless: Anthropic Claude letter generation
  - `src/components/` — React components (IntakeForm, Dashboard, checks, letter)
  - `src/services/` — API clients (eligibilityApi, letterApi, nppes, icd10, etc.)
  - `src/lib/supabase.js` — Supabase client init
  - `src/services/auditLog.js` — Audit logging service
  - `public/data/` — static JSON (PA-required codes, NCCI edits, MUE limits)
  - `supabase/migrations/` — SQL schema migrations
- `PLAN.md` — implementation plan (6 phases)
- `filestr.md` — full file structure reference

## Environment Variables (set in Vercel dashboard, NOT in .env.local)
- `STEDI_API_KEY` — Stedi healthcare eligibility API (used in api/eligibility.js)
- `ANTHROPIC_API_KEY` — Anthropic Claude API (used in api/generate-letter.js)
- `VITE_SUPABASE_URL` — Supabase project URL (public, used client-side)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (public, used client-side)

Server-side keys are in Vercel project settings. Supabase keys prefixed with VITE_ are safe
to expose client-side — Row-Level Security (RLS) enforces access control at the DB level.

## Database — Supabase (PostgreSQL)

### Tables
- **practices** — one per provider NPI. Created during provider onboarding.
  - `id` (uuid PK), `name`, `npi` (unique), `address`, `specialty`, `created_at`
- **profiles** — extends Supabase auth.users. One per logged-in user.
  - `id` (uuid PK, FK → auth.users), `practice_id` (FK → practices)
  - `full_name`, `role` (provider | ma | psr | rn | admin), `created_at`
- **invitations** — provider invites staff by email + role.
  - `id` (uuid PK), `practice_id`, `email`, `role`, `invited_by`, `token` (unique)
  - `accepted_at` (null until staff signs up), `expires_at`, `created_at`
- **audit_logs** — append-only log for HIPAA compliance.
  - `id` (uuid PK), `user_id`, `practice_id`, `action`, `detail` (jsonb)
  - `ip_address`, `created_at`

### Row-Level Security (RLS)
- All tables have RLS enabled
- Users can only read/write rows matching their `practice_id`
- `audit_logs` is insert-only (no updates, no deletes) for tamper resistance
- `profiles` can only be read/updated by the user themselves or same-practice members

### Roles
| Role | Can do | Cannot do |
|------|--------|-----------|
| **provider** | Everything + invite staff + manage practice | — |
| **ma** (Medical Assistant) | Create/view cases, run checks, generate letters | Invite staff, manage practice |
| **psr** (Patient Service Rep) | Create/view cases, run checks | Generate letters, invite staff |
| **rn** (Registered Nurse) | Create/view cases, run checks, generate letters | Invite staff, manage practice |
| **admin** | Everything (superadmin for demo/testing) | — |

## Authentication — Supabase Auth
- **Provider onboarding**: Sign up with email + password + NPI
  - NPPES validates NPI is real and active
  - Auto-creates Practice record from NPPES data
  - User profile created with role = 'provider'
- **Staff onboarding**: Provider sends email invite with role
  - Staff clicks invite link → sign up with email + password
  - Profile auto-linked to the provider's practice
- **Session timeout**: 15 minutes of inactivity
  - Warning displayed 2 min before logout
  - Auto-logout calls supabase.auth.signOut() + clears sessionStorage
  - Tracked events: mousemove, mousedown, keydown, touchstart, scroll
- **Demo mode**: Still available via "Demo Mode" link on login screen
  - Bypasses real auth for testing — uses mock provider data
  - No Supabase auth session (local-only demo)

## Session Persistence
- Case data persisted to `sessionStorage` (browser-only, per-tab)
- Survives page refresh — provider/staff won't lose intake data or check results
- Automatically cleared when the browser tab is closed (no PHI lingers)
- "New Case" button explicitly clears storage
- Storage key: `denali_pa_session`
- Auth session managed by Supabase (persists across refreshes via their token refresh)

## Audit Logging
Every significant action is logged to the `audit_logs` table:
- `login` / `logout` / `timeout` — auth events
- `case_submitted` — intake form submitted (logs CPT/ICD-10, no patient names)
- `checks_completed` — all coverage checks finished
- `letter_generated` — medical necessity letter created
- `staff_invited` / `invitation_accepted` — team management
- Logs include: user_id, practice_id, action, timestamp
- PHI is minimized in logs (codes only, no names/MBI)

## API Endpoints
- `POST /api/eligibility` — proxies Stedi 270/271 for Medicare eligibility
- `POST /api/generate-letter` — proxies Anthropic Claude for medical necessity letter

## Key Decisions
- Supabase for auth + DB + audit logs — HIPAA BAA available on Pro plan
- Practice-based access model — provider owns NPI, staff works under it
- Role-based permissions — provider, MA, PSR, RN, admin
- NPI validated via NPPES on provider signup (not on every login)
- sessionStorage for case data (no PHI in database beyond audit codes)
- 15-min inactivity timeout with Supabase signOut
- No .env.local in repo — keys live in Vercel env vars only
- Model: claude-sonnet-4-20250514 for letter generation
- Stedi endpoint: https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3
- Client-side public APIs: NPPES, CMS Coverage, ICD-10 (no keys needed)
- Static data for MVP: PA-required codes, NCCI edits as JSON files, updated manually
