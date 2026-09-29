-- Market-level playbooks: landscape, customer pain, market sizing, opportunity.
alter table public.research_runs drop constraint if exists research_runs_playbook_check;
alter table public.research_runs add constraint research_runs_playbook_check
  check (playbook in ('brief','profile','pricing','battlecard','landscape','pain','sizing','opportunity'));
