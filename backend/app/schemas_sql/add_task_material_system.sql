-- Katalog tipova materijala + stavke po zadatku.
-- Pokreni u Supabase SQL Editoru.

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

grant all privileges on table public.material_types to service_role;
grant all privileges on table public.task_material_items to service_role;

alter table public.material_types disable row level security;
alter table public.task_material_items disable row level security;
