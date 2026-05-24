-- Pokreni ovaj SQL u Supabase SQL Editoru prije prvog koristenja API-ja.
-- Pretpostavlja postojanje gen_random_uuid() (pgcrypto je default u Supabase projektima).

create extension if not exists "pgcrypto";

-- USERS
create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    full_name text not null,
    password_hash text not null,
    avatar_url text,
    created_at timestamptz default now()
);

-- PROJECTS
create table if not exists projects (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    start_date date,
    end_date date,
    status text not null default 'active', -- active | archived | completed
    owner_id uuid not null references users(id) on delete cascade,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_projects_owner on projects(owner_id);
create index if not exists idx_projects_status on projects(status);

-- PROJECT MEMBERS (many-to-many users <-> projects)
create table if not exists project_members (
    project_id uuid not null references projects(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    role text not null default 'member', -- owner | manager | member
    added_at timestamptz default now(),
    primary key (project_id, user_id)
);

-- TASKS
create table if not exists tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references projects(id) on delete cascade,
    title text not null,
    description text,
    notes text,
    status text not null default 'design', -- design | approval | sent_to_print | ready_pickup | placed
    priority text not null default 'medium', -- low | medium | high | urgent
    assignee_id uuid references users(id) on delete set null,
    creator_id uuid not null references users(id),
    due_date date,
    position integer not null default 0, -- za drag&drop redoslijed unutar kolone
    parent_task_id uuid references tasks(id) on delete cascade, -- subtask
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_assignee on tasks(assignee_id);
create index if not exists idx_tasks_parent on tasks(parent_task_id);

-- KATALOG TIPOVA MATERIJALA (Photowall, Banner, …)
create table if not exists material_types (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    is_print boolean not null default true,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz default now()
);

create unique index if not exists idx_material_types_name_lower
    on material_types (lower(trim(name)));

-- STAVKE MATERIJALA PO ZADATKU
create table if not exists task_material_items (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references tasks(id) on delete cascade,
    material_type_id uuid not null references material_types(id) on delete restrict,
    dimensions_format text not null,
    quantity text not null,
    visual_content text not null,
    print_shop text,
    installation_deadline date,
    other_notes text,
    sort_order integer not null default 0,
    created_at timestamptz default now()
);

create index if not exists idx_task_material_items_task on task_material_items(task_id);

insert into material_types (name, is_print, sort_order)
select v.name, v.is_print, v.sort_order
from (values
    ('Photowall', true, 10),
    ('Banner', true, 20),
    ('Rotirajući paneli', true, 30),
    ('Posteri', true, 40)
) as v(name, is_print, sort_order)
where not exists (
    select 1 from material_types mt where lower(trim(mt.name)) = lower(trim(v.name))
);

-- COMMENTS
create table if not exists comments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references tasks(id) on delete cascade,
    author_id uuid not null references users(id),
    content text not null,
    mentions uuid[] default '{}', -- array of user ids
    created_at timestamptz default now()
);

create index if not exists idx_comments_task on comments(task_id);

-- MATERIALS / FILES
create table if not exists materials (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references projects(id) on delete cascade,
    task_id uuid references tasks(id) on delete set null,
    uploader_id uuid not null references users(id),
    file_name text not null,
    storage_path text, -- Supabase Storage path (null za eksterne linkove)
    external_url text, -- Teams / SharePoint / drugi URL
    mime_type text,
    size_bytes bigint,
    created_at timestamptz default now()
);

create index if not exists idx_materials_project on materials(project_id);
create index if not exists idx_materials_task on materials(task_id);

-- ACTIVITY LOG
create table if not exists activities (
    id uuid primary key default gen_random_uuid(),
    project_id uuid references projects(id) on delete cascade,
    task_id uuid references tasks(id) on delete cascade,
    actor_id uuid not null references users(id),
    action text not null, -- e.g. task.created, task.status_changed, project.archived...
    payload jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

create index if not exists idx_activities_project on activities(project_id);
create index if not exists idx_activities_task on activities(task_id);
create index if not exists idx_activities_created on activities(created_at desc);

-- Storage bucket (kreirati rucno u Supabase Studio: "materials", public ili privatan po zelji)

-- ============================================================
-- GRANTS — obavezno pokrenuti da service_role ima pristup
-- ============================================================
grant usage on schema public to service_role;

grant all privileges on table public.users          to service_role;
grant all privileges on table public.projects       to service_role;
grant all privileges on table public.project_members to service_role;
grant all privileges on table public.tasks          to service_role;
grant all privileges on table public.material_types to service_role;
grant all privileges on table public.task_material_items to service_role;
grant all privileges on table public.comments       to service_role;
grant all privileges on table public.materials      to service_role;
grant all privileges on table public.activities     to service_role;

-- Ako zelite dozvoliti i anon/autentifikovane Supabase korisnike (opcionalno):
-- grant select on all tables in schema public to anon;
-- grant all on all tables in schema public to authenticated;

-- RLS: isključeno jer backend koristi service_role koji ga zaobilazi.
-- Ako ga uključite, dodajte policies ili koristite SECURITY DEFINER funkcije.
alter table public.users           disable row level security;
alter table public.projects        disable row level security;
alter table public.project_members disable row level security;
alter table public.tasks           disable row level security;
alter table public.material_types  disable row level security;
alter table public.task_material_items disable row level security;
alter table public.comments        disable row level security;
alter table public.materials       disable row level security;
alter table public.activities      disable row level security;
