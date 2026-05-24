-- Pokreni u Supabase SQL Editoru ako tabela materials već postoji bez linkova.

alter table public.materials
    add column if not exists external_url text;

alter table public.materials
    alter column storage_path drop not null;

create index if not exists idx_materials_external_url on materials(external_url)
    where external_url is not null;
