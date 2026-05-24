import type { TaskStatus } from "../types";
import { taskStatusLabel, taskStatusTheme } from "../taskStatuses";
import { useTheme } from "../context/ThemeContext";

interface Props {
  status: TaskStatus;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: Props) {
  const { resolvedTheme } = useTheme();
  const t = taskStatusTheme(status, resolvedTheme);
  return (
    <span
      className={`status-badge ${size}`}
      style={{
        color: t.text,
        backgroundColor: t.bg,
        borderColor: `${t.dot}33`,
      }}
    >
      <span className="status-badge-dot" style={{ backgroundColor: t.dot }} />
      {taskStatusLabel(status)}
    </span>
  );
}
