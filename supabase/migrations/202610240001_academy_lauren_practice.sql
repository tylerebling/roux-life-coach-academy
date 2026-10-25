create table if not exists public.academy_lauren_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id uuid not null references public.academy_enrollments(id) on delete cascade,
  checkpoint_id text not null check (checkpoint_id in ('block-03-06','block-07-10','block-11-14','block-15-18','lesson-19-capstone')),
  reservation_id uuid not null unique default gen_random_uuid(),
  simulator_handle text,
  simulator_status text not null default 'new',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkpoint_id)
);

create table if not exists public.academy_lauren_results (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null unique,
  attempt_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id uuid not null references public.academy_enrollments(id) on delete cascade,
  checkpoint_id text not null,
  assignment_id text not null,
  reservation_id uuid not null,
  overall_score integer not null check (overall_score between 0 and 100),
  competency_scores jsonb not null default '[]'::jsonb,
  critical_safety_failure boolean not null default false,
  status text not null check (status in ('passed','needs_remediation','pending_instructor_review')),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.academy_lauren_reservations enable row level security;
alter table public.academy_lauren_results enable row level security;

-- These tables are intentionally service-only. The Edge Function authenticates
-- the learner and returns only that learner's compact status. No browser role
-- receives a direct table policy.
revoke all on public.academy_lauren_reservations from anon, authenticated;
revoke all on public.academy_lauren_results from anon, authenticated;

create index if not exists academy_lauren_results_user_checkpoint_idx
  on public.academy_lauren_results (user_id, checkpoint_id, completed_at desc);

