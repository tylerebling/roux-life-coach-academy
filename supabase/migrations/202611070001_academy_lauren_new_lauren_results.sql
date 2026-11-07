-- NEW Lauren block practice (2026-11-07). Additive to 202610240001 (applied together; neither table held rows).
-- NEW Lauren's evaluation is a written review with no percentage, so a checkpoint completion may carry no score.
-- It is recorded with status 'completed'; graded statuses still require a score (enforced in academy-lauren).
alter table public.academy_lauren_results alter column overall_score drop not null;
alter table public.academy_lauren_results drop constraint if exists academy_lauren_results_status_check;
alter table public.academy_lauren_results add constraint academy_lauren_results_status_check
  check (status in ('passed','needs_remediation','pending_instructor_review','completed'));
alter table public.academy_lauren_results drop constraint if exists academy_lauren_results_score_for_status;
alter table public.academy_lauren_results add constraint academy_lauren_results_score_for_status
  check ((status = 'completed') or (overall_score is not null));
-- Rollback: delete rows with status 'completed', then restore NOT NULL and the original three-status check.
