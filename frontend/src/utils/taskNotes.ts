import type { Task } from "../types";

/** Bilješke za prikaz (uključuje stare uvozne podatke iz description). */
export function taskNotesText(task: Pick<Task, "notes" | "description">): string {
  return (task.notes || task.description || "").trim();
}

export function taskHasNotes(task: Pick<Task, "notes" | "description">): boolean {
  return !!taskNotesText(task);
}
