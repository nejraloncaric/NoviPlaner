import { useEffect, useState } from "react";
import Modal from "./Modal";
import CommentsList from "./CommentsList";
import MaterialsPanel from "./MaterialsPanel";
import SubtaskChecklist from "./SubtaskChecklist";
import type { Project, Task, TaskPriority, TaskStatus } from "../types";
import { TASK_STATUSES } from "../types";
import { tasksApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import TaskNotesEditor from "./TaskNotesEditor";
import TaskMaterialItemsView from "./TaskMaterialItemsView";
import { taskNotesText } from "../utils/taskNotes";

interface Props {
  taskId: string | null;
  project: Project;
  onClose: () => void;
  onChange: () => void;
}

export default function TaskDetailModal({ taskId, project, onClose, onChange }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);

  const load = async (id: string) => {
    setEditing(false);
    setLoadError("");
    try {
      const t = await tasksApi.get(id);
      setTask(t);
    } catch (err) {
      setTask(null);
      setLoadError(apiErrorMessage(err, "Zadatak nije učitan"));
    }
  };

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setLoadError("");
      return;
    }
    let cancelled = false;
    setTask(null);
    (async () => {
      setEditing(false);
      setLoadError("");
      try {
        const t = await tasksApi.get(taskId);
        if (!cancelled) setTask(t);
      } catch (err) {
        if (!cancelled) {
          setTask(null);
          setLoadError(apiErrorMessage(err, "Zadatak nije učitan"));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [taskId]);

  const close = () => {
    setTask(null);
    setEditing(false);
    setLoadError("");
    onClose();
  };

  const handleSubtaskUpdate = async () => {
    if (taskId) await load(taskId);
    onChange();
  };

  if (!taskId) return null;

  if (!task) {
    return (
      <Modal open onClose={close}>
        {loadError ? <p className="error">{loadError}</p> : <p>Učitavanje...</p>}
      </Modal>
    );
  }

  const updateField = async (field: string, value: unknown) => {
    try {
      await tasksApi.update(task.id, { [field]: value });
      await load(task.id);
      onChange();
    } catch (err) {
      alert(apiErrorMessage(err, "Ažuriranje nije uspjelo"));
    }
  };

  const remove = async () => {
    if (!confirm("Obrisati zadatak?")) return;
    try {
      await tasksApi.remove(task.id);
      onChange();
      close();
    } catch (err) {
      alert(apiErrorMessage(err, "Brisanje nije uspjelo"));
    }
  };

  const isSubtask = !!task.parent_task_id;
  const hasMaterialInfo = !isSubtask && (task.material_items?.length ?? 0) > 0;

  return (
    <Modal open onClose={close} width={820}>
      {editing ? (
        <EditTaskForm
          task={task}
          project={project}
          isSubtask={isSubtask}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            if (taskId) await load(taskId);
            onChange();
          }}
        />
      ) : (
        <>
          <div className="row between">
            <h3 style={{ margin: 0 }}>{task.title}</h3>
            <div className="row">
              <button type="button" onClick={() => setEditing(true)}>Uredi</button>
              <button type="button" className="danger" onClick={remove}>Obriši</button>
            </div>
          </div>

          {!isSubtask && (
            <div className="task-detail-status mt-3">
              <div className="field">
                <label>Status</label>
                <select value={task.status} onChange={(e) => updateField("status", e.target.value)}>
                  {TASK_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Prioritet</label>
                <select value={task.priority} onChange={(e) => updateField("priority", e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="field">
                <label>Izvršilac</label>
                <select
                  value={task.assignee_id || ""}
                  onChange={(e) => updateField("assignee_id", e.target.value || null)}
                >
                  <option value="">— Nije dodijeljen —</option>
                  {project.members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Rok dostave finalnog materijala</label>
                <input
                  type="date"
                  value={task.due_date || ""}
                  onChange={(e) => updateField("due_date", e.target.value || null)}
                />
              </div>
            </div>
          )}

          {hasMaterialInfo && (
            <div className="mt-4">
              <TaskMaterialItemsView items={task.material_items!} />
            </div>
          )}

          <div className="mt-4">
            <TaskNotesEditor
              taskId={task.id}
              notes={taskNotesText(task)}
              clearDescriptionOnSave={!!task.description && !task.notes}
              onSaved={async () => {
                if (taskId) await load(taskId);
                onChange();
              }}
            />
          </div>

          {!isSubtask && (
            <div className="mt-4">
              <SubtaskChecklist
                projectId={project.id}
                parentTaskId={task.id}
                members={project.members}
                subtasks={task.subtasks}
                onUpdate={handleSubtaskUpdate}
              />
            </div>
          )}

          <div className="mt-4 task-detail-section">
            <h4>Prilozi (fajlovi i linkovi)</h4>
            <MaterialsPanel projectId={project.id} taskId={task.id} compact />
          </div>

          <div className="mt-4 task-detail-section">
            <h4>Komentari</h4>
            <CommentsList taskId={task.id} project={project} onChange={onChange} />
          </div>
        </>
      )}
    </Modal>
  );
}

function EditTaskForm({
  task,
  project,
  isSubtask,
  onCancel,
  onSaved,
}: {
  task: Task;
  project: Project;
  isSubtask: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(taskNotesText(task));
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isSubtask) {
        await tasksApi.update(task.id, {
          title,
          notes: notes || null,
          description: task.description && !task.notes ? null : undefined,
          due_date: dueDate || null,
          assignee_id: assigneeId || null,
        });
      } else {
        await tasksApi.update(task.id, {
          title,
          notes: notes || null,
          description: task.description && !task.notes ? null : undefined,
          status,
          priority,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
        });
      }
      onSaved();
    } catch (err) {
      alert(apiErrorMessage(err, "Snimanje nije uspjelo"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h3>{isSubtask ? "Uredi stavku checkliste" : "Uredi zadatak"}</h3>
      <div className="field">
        <label>Naziv zadatka</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      {!isSubtask && (
        <div className="task-detail-status">
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Prioritet</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="field">
            <label>Izvršilac</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">— Nije dodijeljen —</option>
              {project.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Rok dostave finalnog materijala</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
      )}

      <div className="field mt-3">
        <label>Bilješke</label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Dodatne napomene uz zadatak…"
        />
      </div>

      {isSubtask && (
        <div className="row mt-3" style={{ gap: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ flex: 1, minWidth: 140 }}>
            <label>Rok</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label>Izvršilac</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">— Nije dodijeljen —</option>
              {project.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button type="button" onClick={onCancel}>Odustani</button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "Snimam..." : "Snimi"}
        </button>
      </div>
    </form>
  );
}
