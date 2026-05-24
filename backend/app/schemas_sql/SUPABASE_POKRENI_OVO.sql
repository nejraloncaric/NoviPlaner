-- =============================================================================
-- PLANNER — sve nadogradnje baze (jednom u Supabase SQL Editoru)
-- =============================================================================
-- Kako pokrenuti:
--   1. Otvori https://supabase.com → tvoj projekat → SQL → New query
--   2. Zalijepi CIJELI ovaj fajl
--   3. Klikni Run (ili Ctrl+Enter)
--
-- Ako aplikacija NIJE nikad radila (nema tabela users, projects…):
--   PRVO pokreni cijeli fajl init.sql, PA ONDA ovaj fajl.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Bilješke na zadacima (notes)
-- -----------------------------------------------------------------------------
alter table public.tasks
    add column if not exists notes text;

-- -----------------------------------------------------------------------------
-- 2) Linkovi na fajlove (Teams / SharePoint) u materials
-- -----------------------------------------------------------------------------
alter table public.materials
    add column if not exists external_url text;

alter table public.materials
    alter column storage_path drop not null;

create index if not exists idx_materials_external_url on public.materials(external_url)
    where external_url is not null;

-- -----------------------------------------------------------------------------
-- 3) Katalog materijala + stavke po zadatku (Photowall, Banner, …)
-- -----------------------------------------------------------------------------
create table if not exists public.material_types (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    is_print boolean not null default true,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz default now()
);

create unique index if not exists idx_material_types_name_lower
    on public.material_types (lower(trim(name)));

create table if not exists public.task_material_items (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    material_type_id uuid not null references public.material_types(id) on delete restrict,
    dimensions_format text not null,
    quantity text not null,
    visual_content text not null,
    print_shop text,
    installation_deadline date,
    other_notes text,
    sort_order integer not null default 0,
    created_at timestamptz default now()
);

create index if not exists idx_task_material_items_task on public.task_material_items(task_id);

-- Početni materijali (preskače ako već postoje)
insert into public.material_types (name, is_print, sort_order)
select v.name, v.is_print, v.sort_order
from (values
    ('Photowall', true, 10),
    ('Banner', true, 20),
    ('Rotirajući paneli', true, 30),
    ('Posteri', true, 40)
) as v(name, is_print, sort_order)
where not exists (
    select 1 from public.material_types mt
    where lower(trim(mt.name)) = lower(trim(v.name))
);

-- -----------------------------------------------------------------------------
-- 4) Statusi zadataka (samo ako ste ranije imali stare: todo, in_progress…)
--    Sigurno je pokrenuti i kad već imate nove statuse — ništa se neće pokvariti.
-- -----------------------------------------------------------------------------
update public.tasks set status = 'design' where status = 'todo';
update public.tasks set status = 'approval' where status = 'in_progress';
update public.tasks set status = 'sent_to_print' where status = 'review';
update public.tasks set status = 'placed' where status = 'done';

alter table public.tasks alter column status set default 'design';

-- -----------------------------------------------------------------------------
-- 5) Dozvole za backend (service_role) + nove tabele
-- -----------------------------------------------------------------------------
grant usage on schema public to service_role;

grant all privileges on table public.users to service_role;
grant all privileges on table public.projects to service_role;
grant all privileges on table public.project_members to service_role;
grant all privileges on table public.tasks to service_role;
grant all privileges on table public.comments to service_role;
grant all privileges on table public.materials to service_role;
grant all privileges on table public.activities to service_role;
grant all privileges on table public.material_types to service_role;
grant all privileges on table public.task_material_items to service_role;

alter table public.users disable row level security;
alter table public.projects disable row level security;
alter table public.project_members disable row level security;
alter table public.tasks disable row level security;
alter table public.comments disable row level security;
alter table public.materials disable row level security;
alter table public.activities disable row level security;
alter table public.material_types disable row level security;
alter table public.task_material_items disable row level security;

-- =============================================================================
-- Gotovo. U Storageu provjeri da postoji bucket "materials" (za upload fajlova).
-- =============================================================================
