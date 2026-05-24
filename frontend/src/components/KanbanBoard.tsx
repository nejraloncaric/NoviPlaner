import { useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

import type { Task, TaskStatus } from "../types";
import { TASK_STATUSES, DEFAULT_TASK_STATUS, isTaskCompleted } from "../types";
import { taskStatusTheme } from "../taskStatuses";
import { useTheme } from "../context/ThemeContext";
import { tasksApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import Avatar from "./Avatar";
import { taskHasNotes } from "../utils/taskNotes";

const COLUMNS = TASK_STATUSES;

interface Props {
  tasks: Task[];
  onChange: () => void;
  onOpenTask: (t: Task) => void;
}

export default function KanbanBoard({ tasks, onChange, onOpenTask }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const suppressClickRef = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const g = Object.fromEntries(COLUMNS.map((c) => [c.key, [] as Task[]])) as Record<TaskStatus, Task[]>;
    for (const t of tasks) {
      const col = (t.status in g ? t.status : DEFAULT_TASK_STATUS) as TaskStatus;
      g[col].push(t);
    }
    for (const k of Object.keys(g) as TaskStatus[]) g[k].sort((a, b) => a.position - b.position);
    return g;
  }, [tasks]);

  const findTask = (id: string) => tasks.find((t) => t.id === id);
  const findContainerForTask = (id: string): TaskStatus | undefined => {
    for (const c of COLUMNS) if (grouped[c.key].some((t) => t.id === id)) return c.key;
    return undefined;
  };

  const onDragStart = (e: DragStartEvent) => {
    const t = findTask(String(e.active.id));
    if (t) setActiveTask(t);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const fromCol = findContainerForTask(activeId);
    if (!fromCol) return;

    let toCol: TaskStatus | undefined;
    let toIndex = 0;
    if (COLUMNS.some((c) => c.key === overId)) {
      // dropped on column itself - end of column
      toCol = overId as TaskStatus;
      toIndex = grouped[toCol].length;
    } else {
      toCol = findContainerForTask(overId);
      if (!toCol) return;
      const arr = grouped[toCol];
      toIndex = arr.findIndex((t) => t.id === overId);
      if (toIndex < 0) toIndex = arr.length;
    }
    if (fromCol === toCol) {
      const arr = grouped[toCol];
      const oldIndex = arr.findIndex((t) => t.id === activeId);
      if (oldIndex === toIndex) return;
      // Kad vučemo prema dolje u istoj koloni, indeks cilja mora se smanjiti za 1
      if (oldIndex < toIndex) toIndex -= 1;
    }
    suppressClickRef.current = true;
    try {
      await tasksApi.move(activeId, toCol, toIndex);
      onChange();
    } catch (err) {
      suppressClickRef.current = false;
      alert(apiErrorMessage(err, "Premještanje zadatka nije uspjelo"));
      onChange();
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners}
                onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="kanban-board">
        {COLUMNS.map((col) => (
          <Column key={col.key} status={col.key} label={col.label}
                  tasks={grouped[col.key]} onOpen={onOpenTask} suppressClickRef={suppressClickRef} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCardView task={activeTask} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ status, label, tasks, onOpen, suppressClickRef }: {
  status: TaskStatus; label: string; tasks: Task[];
  onOpen: (t: Task) => void;
  suppressClickRef: MutableRefObject<boolean>;
}) {
  const { resolvedTheme } = useTheme();
  const theme = taskStatusTheme(status, resolvedTheme);
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      className={`kanban-column column-${status}${isOver ? " is-over" : ""}`}
      ref={setNodeRef}
      style={{ backgroundColor: theme.column }}
    >
      <div className="kanban-column-header">
        <span className="status-dot" style={{ backgroundColor: theme.dot }} />
        <span className="kanban-column-title">{label}</span>
        <span className="kanban-count">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-cards">
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} onOpen={onOpen} suppressClickRef={suppressClickRef} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ task, onOpen, suppressClickRef }: {
  task: Task; onOpen: (t: Task) => void;
  suppressClickRef: MutableRefObject<boolean>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onOpen(task);
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={handleClick}>
      <TaskCardView task={task} />
    </div>
  );
}

function TaskCardView({ task, dragging }: { task: Task; dragging?: boolean }) {
  const { resolvedTheme } = useTheme();
  const theme = taskStatusTheme(task.status, resolvedTheme);
  return (
    <div
      className={"task-card status-" + task.status + (dragging ? " dragging" : "")}
      style={{ ["--status-accent" as string]: theme.dot }}
    >
      <div className="title">{task.title}</div>
      <div className="meta">
        <span className={`priority ${task.priority}`}>{task.priority}</span>
        <span className="meta-icons">
          {task.due_date && <span>{task.due_date}</span>}
          {task.subtasks?.length > 0 && (
            <span>{task.subtasks.filter((s) => isTaskCompleted(s.status)).length}/{task.subtasks.length}</span>
          )}
          {(task.material_items?.length ?? 0) > 0 && (
            <span title="Materijali">{task.material_items!.length} mat.</span>
          )}
          {taskHasNotes(task) && <span title="Ima bilješki">📝</span>}
          {task.comments_count > 0 && <span>{task.comments_count} kom.</span>}
          {task.materials_count > 0 && <span>{task.materials_count} pril.</span>}
        </span>
        <span style={{ marginLeft: "auto" }}>
          {task.assignee_name && <Avatar name={task.assignee_name} size="sm" />}
        </span>
      </div>
    </div>
  );
}
