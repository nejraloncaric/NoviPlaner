import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "./Modal";
import { projectsApi, usersApi } from "../api/endpoints";
import type { ExcelImportResult, User } from "../types";

type ImportMode = "file" | "link";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportExcelModal({ open, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("file");
  const [shareUrl, setShareUrl] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExcelImportResult | null>(null);

  useEffect(() => {
    if (open) {
      usersApi.list().then(setUsers);
      setMode("file");
      setShareUrl("");
      setMemberIds([]);
      setError("");
      setResult(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUploading(true);
    try {
      let data: ExcelImportResult;
      if (mode === "file") {
        const file = fileRef.current?.files?.[0];
        if (!file) {
          setError("Odaberite Excel datoteku (.xlsx ili .xls)");
          return;
        }
        data = await projectsApi.importExcel(file, memberIds);
      } else {
        const url = shareUrl.trim();
        if (!url) {
          setError("Zalijepite link s Teams ili SharePointa");
          return;
        }
        data = await projectsApi.importExcelFromUrl(url, memberIds);
      }
      setResult(data);
      onImported();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Uvoz nije uspio");
    } finally {
      setUploading(false);
    }
  };

  const close = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Uvoz iz Excela">
      {result ? (
        <div>
          <p>
            Kreirano <strong>{result.total_projects}</strong> projekata i{" "}
            <strong>{result.total_tasks}</strong> zadataka.
          </p>
          <ul style={{ margin: "12px 0", paddingLeft: 20 }}>
            {result.sheets.map((s) => (
              <li key={s.project_id}>
                <Link to={`/projects/${s.project_id}`}>{s.project_name}</Link>
                {" — "}
                {s.tasks_created} zadataka
                {s.skipped_rows > 0 && (
                  <span className="muted"> ({s.skipped_rows} redova preskočeno)</span>
                )}
              </li>
            ))}
          </ul>
          <div className="modal-actions">
            <button type="button" className="primary" onClick={close}>Zatvori</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p className="muted" style={{ marginTop: 0 }}>
            Svaki <strong>sheet</strong> u tablici postaje jedan projekat (naziv sheeta = naziv projekta).
            U prvom redu su zaglavlja: prva kolona je naziv zadatka, ostale kolone (npr. Sadržaj, dimenzije,
            štamparija, količina, rok izrade…) idu u <strong>bilješke</strong> zadatka.
          </p>

          <div className="row" style={{ gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              className={mode === "file" ? "primary" : ""}
              onClick={() => setMode("file")}
            >
              Datoteka
            </button>
            <button
              type="button"
              className={mode === "link" ? "primary" : ""}
              onClick={() => setMode("link")}
            >
              Teams / SharePoint link
            </button>
          </div>

          {mode === "file" ? (
            <div className="field">
              <label>Excel datoteka (.xlsx ili .xls)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              />
            </div>
          ) : (
            <div className="field">
              <label>Link na Excel tablicu</label>
              <input
                type="url"
                value={shareUrl}
                onChange={(e) => setShareUrl(e.target.value)}
                placeholder="https://…sharepoint.com/… ili https://1drv.ms/…"
                autoComplete="off"
              />
              <small className="muted">
                U Teams ili SharePointu: Otvori tablicu → Dijeli → Kopiraj link.
                Dijeljenje mora biti „Svi s linkom mogu pregledati” (ili preuzimanje).
              </small>
            </div>
          )}

          <div className="field">
            <label>Članovi projekata (opciono)</label>
            <select
              multiple
              value={memberIds}
              size={Math.min(6, Math.max(3, users.length))}
              onChange={(e) =>
                setMemberIds(Array.from(e.target.selectedOptions).map((o) => o.value))
              }
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>
            <small className="muted">Ctrl/Cmd + klik za više članova</small>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            <button type="button" onClick={close}>Odustani</button>
            <button type="submit" className="primary" disabled={uploading}>
              {uploading ? "Uvozim..." : "Uvezi"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
