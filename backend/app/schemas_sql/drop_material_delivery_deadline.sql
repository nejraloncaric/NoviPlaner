-- Ukloni dupli rok dostave sa stavke materijala (koristi se tasks.due_date).

alter table public.task_material_items
    drop column if exists delivery_deadline;
