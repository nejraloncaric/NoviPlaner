-- Migracija sa starih statusa (todo / in_progress / review / done) na nove.
-- Pokreni u Supabase SQL Editoru jednom.

update public.tasks set status = 'design' where status = 'todo';
update public.tasks set status = 'approval' where status = 'in_progress';
update public.tasks set status = 'sent_to_print' where status = 'review';
update public.tasks set status = 'placed' where status = 'done';

alter table public.tasks alter column status set default 'design';
