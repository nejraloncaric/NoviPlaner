import type { MaterialType, TaskMaterialItemInput } from "../types";

interface Props {
  type: MaterialType;
  value: TaskMaterialItemInput;
  onChange: (value: TaskMaterialItemInput) => void;
  idPrefix: string;
}

export default function TaskMaterialItemFields({ type, value, onChange, idPrefix }: Props) {
  const set = (field: keyof TaskMaterialItemInput, v: string) => {
    onChange({ ...value, [field]: v });
  };

  return (
    <div className="material-item-fields">
      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label htmlFor={`${idPrefix}-dim`}>
            Dimenzije / format <span className="required">*</span>
          </label>
          <input
            id={`${idPrefix}-dim`}
            value={value.dimensions_format}
            onChange={(e) => set("dimensions_format", e.target.value)}
            placeholder="npr. 300×200 cm"
            required
          />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 120 }}>
          <label htmlFor={`${idPrefix}-qty`}>
            Količina <span className="required">*</span>
          </label>
          <input
            id={`${idPrefix}-qty`}
            value={value.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            placeholder="npr. 5"
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-visual`}>
          Sadržaj vizuala / tekst <span className="required">*</span>
        </label>
        <textarea
          id={`${idPrefix}-visual`}
          rows={3}
          value={value.visual_content}
          onChange={(e) => set("visual_content", e.target.value)}
          required
        />
        <p className="field-warning">
          Tekst mora biti prethodno lektorisan ili unesite isključivo provjereni tekst.
        </p>
      </div>

      {type.is_print && (
        <div className="field">
          <label htmlFor={`${idPrefix}-print`}>Štamparija</label>
          <input
            id={`${idPrefix}-print`}
            value={value.print_shop}
            onChange={(e) => set("print_shop", e.target.value)}
            placeholder="Naziv štamparije (ako je printani materijal)"
          />
        </div>
      )}

      <div className="field" style={{ maxWidth: 280 }}>
        <label htmlFor={`${idPrefix}-install`}>Rok postavke materijala</label>
        <input
          id={`${idPrefix}-install`}
          type="date"
          value={value.installation_deadline}
          onChange={(e) => set("installation_deadline", e.target.value)}
        />
      </div>

    </div>
  );
}

export function validateMaterialItemInput(
  value: TaskMaterialItemInput,
): string | null {
  if (!value.dimensions_format.trim()) return "Unesite dimenzije / format";
  if (!value.quantity.trim()) return "Unesite količinu";
  if (!value.visual_content.trim()) return "Unesite sadržaj vizuala / tekst";
  return null;
}
