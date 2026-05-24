-- ============================================================
-- POKRENI OVO U SUPABASE SQL EDITORU ako dobijes grešku
-- "permission denied for table users" ili slično.
-- ============================================================

grant usage on schema public to service_role;

grant all privileges on table public.users           to service_role;
grant all privileges on table public.projects        to service_role;
grant all privileges on table public.project_members to service_role;
grant all privileges on table public.tasks           to service_role;
grant all privileges on table public.comments        to service_role;
grant all privileges on table public.materials       to service_role;
grant all privileges on table public.activities      to service_role;

-- Isključi RLS (Row Level Security) na svim tabelama
-- Backend koristi service_role koji ionako zaobilazi RLS,
-- ali ovo otklanja eventualne probleme.
alter table public.users           disable row level security;
alter table public.projects        disable row level security;
alter table public.project_members disable row level security;
alter table public.tasks           disable row level security;
alter table public.comments        disable row level security;
alter table public.materials       disable row level security;
alter table public.activities      disable row level security;
