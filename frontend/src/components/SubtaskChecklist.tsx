import { useState } from "react";
import type { ProjectMember, Task } from "../types";
import { COMPLETED_TASK_STATUS, DEFAULT_TASK_STATUS } from "../types";
import { tasksApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";
import Avatar from "./Avatar";

function isDone(task: Task) {
  return task.status === COMPLETED_TASK_STATUS;
}

function isOverdue(task: Task) {
  if (!task.due_date || isDone(task)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + "T12:00:00");
  return due < today;
}

function formatDueLabel(dateStr: string) {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("bs-BA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface Props {
  projectId: string;
  parentTaskId: string;
  members: ProjectMember[];
  subtasks: Task[];
  onUpdate: () => void | Promise<void>;
}

export default function SubtaskChecklist({
  projectId, parentTaskId, members, subtasks, onUpdate,
}: Props) {
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [draftAssigneeId, setDraftAssigneeId] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const doneCount = subtasks.filter(isDone).length;

  const refresh = async () => {
    await onUpdate();
  };

  const addSubtask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    setError("");
    try {
      await tasksApi.create({
        project_id: projectId,
        title,
        parent_task_id: parentTaskId,
        status: DEFAULT_TASK_STATUS,
        priority: "medium",
        due_date: newDueDate || null,
        assignee_id: newAssigneeId || null,
      });
      setNewTitle("");
      setNewDueDate("");
      setNewAssigneeId("");
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err, "Dodavanje podzadatka nije uspjelo"));
    } finally {
      setAdding(false);
    }
  };

  const toggleDone = async (sub: Task) => {
    try {
      await tasksApi.update(sub.id, {
        status: isDone(sub) ? DEFAULT_TASK_STATUS : COMPLETED_TASK_STATUS,
      });
      await refresh();
    } catch (err) {
      alert(apiErrorMessage(err, "Ažuriranje nije uspjelo"));
    }
  };

  const updateDueDate = async (sub: Task, dueDate: string) => {
    try {
      await tasksApi.update(sub.id, { due_date: dueDate || null });
      await refresh();
    } catch (err) {
      alert(apiErrorMessage(err, "Ažuriranje roka nije uspjelo"));
    }
  };

  const updateAssignee = async (sub: Task, assigneeId: string) => {
    try {
      await tasksApi.update(sub.id, { assignee_id: assigneeId || null });
      await refresh();
    } catch (err) {
      alert(apiErrorMessage(err, "Dodjela izvršioca nije uspjela"));
    }
  };

  const openDetails = (sub: Task) => {
    if (expandedId === sub.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sub.id);
    setDraftNotes(sub.notes || "");
    setDraftDueDate(sub.due_date || "");
    setDraftAssigneeId(sub.assignee_id || "");
  };

  const saveDetails = async (subId: string) => {
    setSavingId(subId);
    try {
      await tasksApi.update(subId, {
        notes: draftNotes.trim() || null,
        due_date: draftDueDate || null,
        assignee_id: draftAssigneeId || null,
      });
      await refresh();
    } catch (err) {
      alert(apiErrorMessage(err, "Snimanje nije uspjelo"));
    } finally {
      setSavingId(null);
    }
  };

  const removeSubtask = async (sub: Task) => {
    if (!confirm(`Obrisati podzadatak "${sub.title}"?`)) return;
    try {
      await tasksApi.remove(sub.id);
      if (expandedId === sub.id) setExpandedId(null);
      await refresh();
    } catch (err) {
      alert(apiErrorMessage(err, "Brisanje nije uspjelo"));
    }
  };

  return (
    <div className="subtask-checklist">
      <div className="row between mb-2">
        <h4 style={{ margin: 0 }}>
          Checklista ({doneCount}/{subtasks.length})
        </h4>
      </div>

      <form className="subtask-add-form" onSubmit={addSubtask}>
        <div className="subtask-add-row">
          <input
            type="text"
            placeholder="Novi podzadatak"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={adding}
          />
          <button type="submit" className="primary" disabled={adding || !newTitle.trim()}>
            {adding ? "..." : "+"}
          </button>
        </div>
        <div className="subtask-add-meta row" style={{ gap: 12, flexWrap: "wrap" }}>
          <div className="subtask-add-due">
            <label htmlFor="new-subtask-due">Rok</label>
            <input
              id="new-subtask-due"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              disabled={adding}
            />
          </div>
          <div className="subtask-add-assignee">
            <label htmlFor="new-subtask-assignee">Izvršilac</label>
            <select
              id="new-subtask-assignee"
              value={newAssigneeId}
              onChange={(e) => setNewAssigneeId(e.target.value)}
              disabled={adding}
            >
              <option value="">— Nije dodijeljen —</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </form>
      {error && <div className="error mt-2">{error}</div>}

      <div className="subtask-list mt-2">
        {subtasks.length === 0 ? (
          <div className="muted">Nema stavki na checklisti.</div>
        ) : (
          subtasks.map((s) => (
            <div key={s.id} className={"subtask-item" + (isDone(s) ? " done" : "")}>
              <div className="subtask-row">
                <input
                  type="checkbox"
                  checked={isDone(s)}
                  onChange={() => toggleDone(s)}
                  aria-label={`Označi: ${s.title}`}
                />
                <button
                  type="button"
                  className="subtask-title-btn"
                  onClick={() => openDetails(s)}
                >
                  {s.title}
                </button>
                <div className="subtask-row-meta" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="date"
                    className={"subtask-due-input" + (isOverdue(s) ? " overdue" : "")}
                    value={s.due_date || ""}
                    onChange={(e) => updateDueDate(s, e.target.value)}
                    title="Rok"
                    aria-label={`Rok za ${s.title}`}
                  />
                  <select
                    className="subtask-assignee-select"
                    value={s.assignee_id || ""}
                    onChange={(e) => updateAssignee(s, e.target.value)}
                    title="Izvršilac"
                    aria-label={`Izvršilac za ${s.title}`}
                  >
                    <option value="">—</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                    ))}
                  </select>
                  {s.assignee_name && (
                    <Avatar name={s.assignee_name} size="sm" />
                  )}
                </div>
                <button
                  type="button"
                  className="btn-ghost subtask-expand-btn"
                  onClick={() => openDetails(s)}
                  aria-expanded={expandedId === s.id}
                  title="Detalji"
                >
                  {expandedId === s.id ? "▾" : "▸"}
                </button>
              </div>
              {(s.due_date || s.assignee_name) && (
                <div className="subtask-meta-labels">
                  {s.due_date && (
                    <span className={"subtask-due-label" + (isOverdue(s) ? " overdue" : "")}>
                      Rok: {formatDueLabel(s.due_date)}
                      {isOverdue(s) && " · kasni"}
                    </span>
                  )}
                  {s.assignee_name && (
                    <span className="subtask-assignee-label">
                      Izvršilac: {s.assignee_name}
                    </span>
                  )}
                </div>
              )}

              {expandedId === s.id && (
                <div className="subtask-detail-panel">
                  <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                    <div className="field" style={{ flex: 1, minWidth: 140 }}>
                      <label>Rok</label>
                      <input
                        type="date"
                        value={draftDueDate}
                        onChange={(e) => setDraftDueDate(e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ flex: 1, minWidth: 160 }}>
                      <label>Izvršilac</label>
                      <select
                        value={draftAssigneeId}
                        onChange={(e) => setDraftAssigneeId(e.target.value)}
                      >
                        <option value="">— Nije dodijeljen —</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label>Bilješke</label>
                    <textarea
                      rows={3}
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Napomene ili rečenice za ovu stavku…"
                    />
                  </div>
                  <div className="row mt-2" style={{ gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" className="danger" onClick={() => removeSubtask(s)}>
                      Obriši
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={savingId === s.id}
                      onClick={() => saveDetails(s.id)}
                    >
                      {savingId === s.id ? "Snimam..." : "Snimi"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
