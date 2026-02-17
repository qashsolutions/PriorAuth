# PriorAuth — Medicare Prior Authorization Assistant

## Table of Contents
- [Project Overview](#project-overview)
- [Deployed URL](#deployed-url)
- [Repository Structure](#repository-structure)
- [Environment Variables](#environment-variables)
- [Supabase](#supabase)
  - [Tables](#tables)
  - [Row-Level Security](#row-level-security)
  - [Roles](#roles)
  - [Migrations](#migrations)
- [Authentication](#authentication--supabase-auth)
- [Demo Mode](#demo-mode)
- [Stedi Eligibility API](#stedi-eligibility-api)
  - [Sandbox Testing](#sandbox-testing)
  - [CMS Mock Test Subscriber](#cms-mock-test-subscriber)
  - [Production](#production)
- [Session Persistence](#session-persistence)
- [Audit Logging](#audit-logging)
- [API Endpoints](#api-endpoints)
- [Key Decisions](#key-decisions)

---

## Project Overview
Medicare Prior Authorization Assistant MVP for Radiation Oncology.
React 18 + Vite 5 + Tailwind CSS, deployed on Vercel.
Product name in UI: "Denali.health" (branding only — no domain yet).

## Deployed URL
https://pa-qash.vercel.app/

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

## Environment Variables

Set in Vercel dashboard, **NOT** in `.env.local`.

| Variable | Scope | Used in |
|----------|-------|---------|
| `STEDI_API_KEY` | Server-side | `api/eligibility.js` — Stedi 270/271 eligibility. **Currently a sandbox/test key.** |
| `ANTHROPIC_API_KEY` | Server-side | `api/generate-letter.js` — Claude letter generation |
| `VITE_SUPABASE_URL` | Client-side | Supabase project URL (public) |
| `VITE_SUPABASE_ANON_KEY` | Client-side | Supabase anon key (public, RLS enforces access) |

Server-side keys are in Vercel project settings. Supabase keys prefixed with `VITE_` are safe
to expose client-side — Row-Level Security (RLS) enforces access control at the DB level.

---

## Supabase
- Project URL: `https://jtpxzsrtumwtfqzbhfiz.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/jtpxzsrtumwtfqzbhfiz`
- Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) set in Vercel

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

### Migrations
- `001_initial_schema.sql` — tables, RLS policies, indexes
- `002_fix_rls_recursion.sql` — fix infinite recursion in profiles RLS
- `003_onboard_practice_rpc.sql` — atomic practice+profile creation RPC

---

## Authentication — Supabase Auth
- **Provider onboarding**: Sign up with email + password + NPI
  - NPPES validates NPI is real and active
  - Auto-creates Practice record from NPPES data via `onboard_practice` RPC
  - User profile created with role = 'provider'
- **Staff onboarding**: Provider sends email invite with role
  - Staff clicks invite link → sign up with email + password
  - Profile auto-linked to the provider's practice
- **Session timeout**: 15 minutes of inactivity
  - Warning displayed 2 min before logout
  - Auto-logout calls supabase.auth.signOut() + clears sessionStorage
  - Tracked events: mousemove, mousedown, keydown, touchstart, scroll

---

## Demo Mode

Available via "Skip login — Enter Demo Mode" on the login screen.
Bypasses Supabase auth — uses local-only mock provider data.

### Demo seed data uses Stedi CMS test subscribers
All intake form fields are pre-filled with **Stedi's predefined CMS mock data** so that
the eligibility check flows end-to-end through the real Stedi sandbox API:

| Field | Value | Notes |
|-------|-------|-------|
| MBI | `1AA2-CC3-DD45` | Stedi CMS test MBI |
| First Name | `Jane` | Must match exactly (Stedi requirement) |
| Last Name | `Doe` | Must match exactly |
| DOB | `1900-01-01` | Must match exactly |
| NPI | `1497758544` | Any Luhn-valid NPI works for Stedi test mode |
| Practice ZIP | `78701` | Austin, TX |
| ICD-10 | `C34.90` | Lung cancer |
| CPT | `77385` | IMRT delivery |
| Place of Service | `22` | On-campus outpatient hospital |

**Do NOT change the patient fields** (MBI, name, DOB) — Stedi test keys reject any
subscriber data that doesn't match their predefined mock requests exactly.

---

## Stedi Eligibility API

Endpoint: `POST /api/eligibility` → proxies to Stedi 270/271.

Stedi URL: `https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3`

### Sandbox Testing

The `STEDI_API_KEY` in Vercel is currently a **sandbox/test key**. Test keys:
- Only accept Stedi's **predefined mock requests** (exact subscriber data required)
- Return realistic mock 271 responses without hitting CMS/HETS
- Are free — no charges
- Provider NPI can be any Luhn-valid 10-digit number
- **Subscriber data must match Stedi's exact predefined values** — other names/MBIs/DOBs return errors

### CMS Mock Test Subscriber

From [Stedi's mock request list](https://www.stedi.com/docs/api-reference/healthcare/mock-requests-eligibility-checks):

```json
{
  "tradingPartnerServiceId": "CMS",
  "subscriber": {
    "memberId": "1AA2CC3DD45",
    "firstName": "JANE",
    "lastName": "DOE",
    "dateOfBirth": "19000101"
  },
  "provider": {
    "organizationName": "Any Name",
    "npi": "<any Luhn-valid NPI>"
  },
  "encounter": {
    "serviceTypeCodes": ["30"]
  }
}
```

**Warning:** CMS (HETS) prohibits sending fake/test transactions to their production system.
They may block your access. Only use production keys with real patient data.

### Production

When ready for real patients:
1. Generate a **production API key** from Stedi dashboard
2. Replace `STEDI_API_KEY` in Vercel env vars
3. Use real patient MBI, name, DOB from their Medicare card
4. Include `X-Forwarded-For` header (already implemented — CMS traceability requirement since Nov 2025)

---

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
- Stedi sandbox key for testing — CMS test subscriber: Jane Doe / 1AA2CC3DD45
- Client-side public APIs: NPPES, CMS Coverage, ICD-10 (no keys needed)
- Static data for MVP: PA-required codes, NCCI edits as JSON files, updated manually
