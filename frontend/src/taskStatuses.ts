/** Kanban kolone, statusi i ClickUp-inspirisane boje (light + dark). */
export const TASK_STATUSES = [
  {
    key: "design",
    label: "Izrada dizajna",
    dot: "#7B68EE",
    bg: "#F3F0FF",
    text: "#5E4DB2",
    column: "#F8F7FC",
    darkBg: "rgba(123, 104, 238, 0.22)",
    darkText: "#C4B5FD",
    darkColumn: "#23202e",
  },
  {
    key: "approval",
    label: "Na odobrenju",
    dot: "#F59E0B",
    bg: "#FFF8E6",
    text: "#B45309",
    column: "#FFFBF0",
    darkBg: "rgba(245, 158, 11, 0.18)",
    darkText: "#FCD34D",
    darkColumn: "#2a2418",
  },
  {
    key: "sent_to_print",
    label: "Poslano na print",
    dot: "#3B82F6",
    bg: "#EFF6FF",
    text: "#1D4ED8",
    column: "#F5F9FF",
    darkBg: "rgba(59, 130, 246, 0.18)",
    darkText: "#93C5FD",
    darkColumn: "#1a2333",
  },
  {
    key: "ready_pickup",
    label: "Spremno za preuzimanje",
    dot: "#EC4899",
    bg: "#FDF2F8",
    text: "#BE185D",
    column: "#FEF7FB",
    darkBg: "rgba(236, 72, 153, 0.18)",
    darkText: "#F9A8D4",
    darkColumn: "#2a1a24",
  },
  {
    key: "placed",
    label: "Postavljeno na lokaciju",
    dot: "#10B981",
    bg: "#ECFDF5",
    text: "#047857",
    column: "#F4FBF8",
    darkBg: "rgba(16, 185, 129, 0.18)",
    darkText: "#6EE7B7",
    darkColumn: "#152622",
  },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["key"];

export const DEFAULT_TASK_STATUS: TaskStatus = "design";
export const COMPLETED_TASK_STATUS: TaskStatus = "placed";

const themeByKey = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.key, s])
) as Record<TaskStatus, (typeof TASK_STATUSES)[number]>;

export function taskStatusTheme(status: TaskStatus, mode: "light" | "dark" = "light") {
  const t = themeByKey[status] ?? themeByKey[DEFAULT_TASK_STATUS];
  if (mode === "dark") {
    return {
      dot: t.dot,
      label: t.label,
      bg: t.darkBg,
      text: t.darkText,
      column: t.darkColumn,
    };
  }
  return { dot: t.dot, label: t.label, bg: t.bg, text: t.text, column: t.column };
}

export function taskStatusLabel(status: TaskStatus): string {
  return taskStatusTheme(status).label;
}

export function isTaskCompleted(status: TaskStatus): boolean {
  return status === COMPLETED_TASK_STATUS;
}
