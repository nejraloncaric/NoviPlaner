import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "./Modal";
import TaskMaterialItemFields, { validateMaterialItemInput } from "./TaskMaterialItemFields";
import type { Project, TaskPriority, TaskStatus } from "../types";
import type { MaterialType, TaskMaterialItemInput } from "../types";
import { TASK_STATUSES, DEFAULT_TASK_STATUS, emptyMaterialItemInput } from "../types";
import { materialTypesApi, tasksApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";

interface Props {
  open: boolean;
  project: Project;
  parentTaskId?: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTaskModal({ open, project, parentTaskId, onClose, onCreated }: Props) {
  const isSubtask = !!parentTaskId;

  if (isSubtask) {
    return (
      <SubtaskCreateForm
        open={open}
        project={project}
        parentTaskId={parentTaskId!}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
  }

  return (
    <MainTaskCreateForm open={open} project={project} onClose={onClose} onCreated={onCreated} />
  );
}

function SubtaskCreateForm({
  open, project, parentTaskId, onClose, onCreated,
}: {
  open: boolean;
  project: Project;
  parentTaskId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setNotes("");
      setError("");
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await tasksApi.create({
        project_id: project.id,
        title,
        notes: notes || null,
        parent_task_id: parentTaskId,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novi podzadatak">
      <form onSubmit={submit}>
        <div className="field">
          <label>Naslov</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>Bilješke</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Odustani</button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Snimam..." : "Kreiraj"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MainTaskCreateForm({
  open, project, onClose, onCreated,
}: {
  open: boolean;
  project: Project;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemByTypeId, setItemByTypeId] = useState<Record<string, TaskMaterialItemInput>>({});
  const [status, setStatus] = useState<TaskStatus>(DEFAULT_TASK_STATUS);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setTaskNotes("");
    setSelectedIds([]);
    setItemByTypeId({});
    setStatus(DEFAULT_TASK_STATUS);
    setPriority("medium");
    setAssigneeId("");
    setDueDate("");
    setError("");
    setLoadingTypes(true);
    materialTypesApi.list(true)
      .then(setMaterialTypes)
      .catch(() => setError("Katalog materijala nije učitan"))
      .finally(() => setLoadingTypes(false));
  }, [open]);

  const toggleMaterial = (type: MaterialType) => {
    setSelectedIds((prev) => {
      if (prev.includes(type.id)) {
        return prev.filter((id) => id !== type.id);
      }
      setItemByTypeId((items) => ({
        ...items,
        [type.id]: items[type.id] ?? emptyMaterialItemInput(type.id),
      }));
      return [...prev, type.id];
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedIds.length) {
      setError("Odaberite barem jedan materijal");
      return;
    }

    if (!dueDate) {
      setError("Unesite rok dostave finalnog materijala (datum zadatka)");
      return;
    }

    for (const typeId of selectedIds) {
      const type = materialTypes.find((t) => t.id === typeId);
      const item = itemByTypeId[typeId];
      if (!type || !item) {
        setError("Popunite podatke za sve odabrane materijale");
        return;
      }
      const err = validateMaterialItemInput(item);
      if (err) {
        setError(`${type.name}: ${err}`);
        return;
      }
    }

    setSaving(true);
    try {
      await tasksApi.create({
        project_id: project.id,
        title,
        notes: taskNotes.trim() || null,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        material_items: selectedIds.map((typeId) => {
          const item = itemByTypeId[typeId];
          return {
            material_type_id: typeId,
            dimensions_format: item.dimensions_format.trim(),
            quantity: item.quantity.trim(),
            visual_content: item.visual_content.trim(),
            print_shop: item.print_shop.trim() || null,
            installation_deadline: item.installation_deadline || null,
          };
        }),
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novi zadatak" width={760}>
      <form onSubmit={submit} className="create-task-form">
        <div className="field">
          <label>Naziv zadatka</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            placeholder="npr. Promo kampanja maj 2026"
          />
        </div>

        <div className="task-detail-status create-task-meta">
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
            <label>
              Rok dostave finalnog materijala <span className="required">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label-block">
            Koji materijal / materijale želite? <span className="required">*</span>
          </label>
          {loadingTypes ? (
            <p className="muted">Učitavam materijale…</p>
          ) : materialTypes.length === 0 ? (
            <p className="error">
              Nema definisanih materijala. Dodajte ih u{" "}
              <Link to="/settings/materials">postavkama materijala</Link>.
            </p>
          ) : (
            <div className="material-type-picker">
              {materialTypes.map((type) => {
                const selected = selectedIds.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    className={"material-type-chip" + (selected ? " selected" : "")}
                    onClick={() => toggleMaterial(type)}
                    aria-pressed={selected}
                  >
                    {type.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedIds.map((typeId) => {
          const type = materialTypes.find((t) => t.id === typeId);
          const item = itemByTypeId[typeId];
          if (!type || !item) return null;
          return (
            <section key={typeId} className="material-item-section">
              <h4 className="material-item-section-title">{type.name}</h4>
              <TaskMaterialItemFields
                type={type}
                value={item}
                idPrefix={`mat-${typeId}`}
                onChange={(next) => setItemByTypeId((prev) => ({ ...prev, [typeId]: next }))}
              />
            </section>
          );
        })}

        <div className="field">
          <label>Bilješke zadatka (opciono)</label>
          <textarea
            rows={2}
            value={taskNotes}
            onChange={(e) => setTaskNotes(e.target.value)}
            placeholder="Dodatne napomene uz zadatak…"
          />
        </div>

        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Odustani</button>
          <button type="submit" className="primary" disabled={saving || loadingTypes}>
            {saving ? "Snimam..." : "Kreiraj zadatak"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
