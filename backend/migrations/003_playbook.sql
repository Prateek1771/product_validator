-- Research playbooks (brief | profile | pricing | battlecard). Deliverables live in reports.summary.deliverable.
alter table public.research_runs add column if not exists playbook text not null default 'brief'
  check (playbook in ('brief','profile','pricing','battlecard'));
