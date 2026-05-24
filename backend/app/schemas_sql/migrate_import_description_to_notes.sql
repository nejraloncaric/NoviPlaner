-- Opciono: prebaci stare uvozne podatke iz description u notes (jednokratno).

update public.tasks
set notes = description,
    description = null
where description is not null
  and description <> ''
  and (notes is null or notes = '');
