-- ============================================================
-- Denali.health — Initial Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Practices — one per provider NPI
create table if not exists public.practices (
  id         uuid primary key default gen_random_uuid(),
  npi        text unique not null,
  name       text not null,
  specialty  text,
  address    text,
  created_at timestamptz default now()
);

alter table public.practices enable row level security;

-- 2. Profiles — extends auth.users with role + practice link
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  practice_id uuid references public.practices(id) on delete set null,
  full_name   text not null,
  role        text not null check (role in ('provider', 'ma', 'psr', 'rn', 'admin')),
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- 3. Invitations — provider invites staff
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('ma', 'psr', 'rn')),
  invited_by  uuid not null references public.profiles(id),
  token       text unique not null default encode(gen_random_bytes(32), 'hex'),
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz default now()
);

alter table public.invitations enable row level security;

-- 4. Audit Logs — append-only, HIPAA compliance
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  practice_id uuid references public.practices(id),
  action      text not null,
  detail      jsonb default '{}'::jsonb,
  ip_address  text,
  created_at  timestamptz default now()
);

alter table public.audit_logs enable row level security;

-- ============================================================
-- Row-Level Security Policies
-- ============================================================

-- Practices: users see only their own practice
create policy "Users can view own practice"
  on public.practices for select
  using (id = (select practice_id from public.profiles where id = auth.uid()));

create policy "Providers can update own practice"
  on public.practices for update
  using (id = (select practice_id from public.profiles where id = auth.uid()
               and role in ('provider', 'admin')));

-- Allow insert during onboarding (user just signed up, no profile yet)
create policy "Authenticated users can create a practice"
  on public.practices for insert
  with check (auth.uid() is not null);

-- Profiles: users see same-practice members, can update only self
create policy "Users can view same-practice profiles"
  on public.profiles for select
  using (practice_id = (select practice_id from public.profiles where id = auth.uid())
         or id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Invitations: providers can manage, staff can view own
create policy "Providers can manage invitations"
  on public.invitations for all
  using (practice_id = (select practice_id from public.profiles where id = auth.uid()
                        and role in ('provider', 'admin')));

-- Anyone authenticated can read invitations by token (for accepting)
create policy "Anyone can read invitation by token"
  on public.invitations for select
  using (auth.uid() is not null);

-- Audit logs: insert-only for authenticated users, read for same practice
create policy "Users can insert audit logs"
  on public.audit_logs for insert
  with check (auth.uid() is not null);

create policy "Users can view own practice audit logs"
  on public.audit_logs for select
  using (practice_id = (select practice_id from public.profiles where id = auth.uid()
                        and role in ('provider', 'admin')));

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_profiles_practice on public.profiles(practice_id);
create index if not exists idx_invitations_token on public.invitations(token);
create index if not exists idx_invitations_email on public.invitations(email);
create index if not exists idx_audit_logs_practice on public.audit_logs(practice_id, created_at desc);
create index if not exists idx_audit_logs_user on public.audit_logs(user_id, created_at desc);
