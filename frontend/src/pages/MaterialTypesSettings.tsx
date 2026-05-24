import { useEffect, useState } from "react";
import { materialTypesApi } from "../api/endpoints";
import type { MaterialType } from "../types";
import { apiErrorMessage } from "../api/client";

export default function MaterialTypesSettings() {
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newIsPrint, setNewIsPrint] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await materialTypesApi.list(false);
      setTypes(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Učitavanje nije uspjelo"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      await materialTypesApi.create({ name, is_print: newIsPrint });
      setNewName("");
      setNewIsPrint(true);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Dodavanje nije uspjelo"));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (t: MaterialType) => {
    if (!confirm(`Deaktivirati „${t.name}”? Neće se više nuditi pri kreiranju zadatka.`)) return;
    try {
      await materialTypesApi.deactivate(t.id);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err, "Deaktivacija nije uspjela"));
    }
  };

  const reactivate = async (t: MaterialType) => {
    try {
      await materialTypesApi.update(t.id, { is_active: true });
      await load();
    } catch (err) {
      alert(apiErrorMessage(err, "Aktivacija nije uspjela"));
    }
  };

  const active = types.filter((t) => t.is_active);
  const inactive = types.filter((t) => !t.is_active);

  return (
    <div>
      <div className="page-header">
        <h2>Tipovi materijala</h2>
      </div>
      <p className="muted" style={{ marginTop: 0, maxWidth: 640 }}>
        Katalog materijala koji se nudi pri kreiranju zadatka (Photowall, Banner, Posteri…).
        Kolegama možete dodati nove tipove bez izmjene koda.
      </p>

      <div className="card" style={{ maxWidth: 560, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Novi materijal</h3>
        <form onSubmit={add}>
          <div className="field">
            <label>Naziv</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="npr. Roll-up banner"
              required
            />
          </div>
          <label className="row" style={{ gap: 8, marginBottom: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={newIsPrint}
              onChange={(e) => setNewIsPrint(e.target.checked)}
            />
            Printani materijal (prikazuje polje štamparija)
          </label>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Dodajem..." : "Dodaj materijal"}
          </button>
        </form>
      </div>

      {error && <div className="error mb-3">{error}</div>}

      {loading ? (
        <p className="muted">Učitavanje…</p>
      ) : (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Aktivni ({active.length})</h3>
            {active.length === 0 ? (
              <p className="muted">Nema aktivnih materijala.</p>
            ) : (
              <ul className="material-types-list">
                {active.map((t) => (
                  <li key={t.id} className="row between">
                    <span>
                      <strong>{t.name}</strong>
                      {t.is_print ? (
                        <span className="muted"> · print</span>
                      ) : (
                        <span className="muted"> · digitalno</span>
                      )}
                    </span>
                    <button type="button" className="danger" onClick={() => deactivate(t)}>
                      Deaktiviraj
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {inactive.length > 0 && (
            <div className="card mt-3">
              <h3 style={{ marginTop: 0 }}>Neaktivni</h3>
              <ul className="material-types-list">
                {inactive.map((t) => (
                  <li key={t.id} className="row between">
                    <span className="muted">{t.name}</span>
                    <button type="button" onClick={() => reactivate(t)}>Aktiviraj</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
