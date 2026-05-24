import { useEffect, useState } from "react";
import { tasksApi } from "../api/endpoints";
import { apiErrorMessage } from "../api/client";

interface Props {
  taskId: string;
  notes: string | null | undefined;
  /** Stari uvoz je bio u description — pri snimanju prebaci u notes. */
  clearDescriptionOnSave?: boolean;
  onSaved: () => void;
  compact?: boolean;
}

export default function TaskNotesEditor({
  taskId, notes, clearDescriptionOnSave, onSaved, compact,
}: Props) {
  const [draft, setDraft] = useState(notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(notes || "");
    setError("");
  }, [taskId, notes]);

  const dirty = draft.trim() !== (notes || "").trim();

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await tasksApi.update(taskId, {
        notes: draft.trim() || null,
        ...(clearDescriptionOnSave ? { description: null } : {}),
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Snimanje bilješki nije uspjelo"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={"task-notes" + (compact ? " task-notes--compact" : "")}>
      <h4 style={{ margin: compact ? "0 0 8px" : undefined }}>Bilješke</h4>
      <textarea
        className="task-notes-input"
        rows={compact ? 3 : 5}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Sadržaj, dimenzije, štamparija, količina, rok… ili vlastite napomene"
      />
      <div className="row between mt-2" style={{ gap: 8, flexWrap: "wrap" }}>
        <small className="muted">
          {dirty ? "Nesačuvane izmjene" : notes ? "Sačuvano" : "Još nema bilješki"}
        </small>
        <button
          type="button"
          className="primary"
          disabled={!dirty || saving}
          onClick={save}
        >
          {saving ? "Snimam..." : "Snimi bilješke"}
        </button>
      </div>
      {error && <div className="error mt-2">{error}</div>}
    </div>
  );
}
