-- Pokreni u Supabase SQL Editoru ako tabela tasks već postoji bez bilješki.

alter table public.tasks
    add column if not exists notes text;
