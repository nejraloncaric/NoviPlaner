import type { TaskMaterialItem } from "../types";

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("bs-BA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

interface Props {
  items: TaskMaterialItem[];
}

export default function TaskMaterialItemsView({ items }: Props) {
  if (!items.length) return null;

  return (
    <div className="task-materials-view">
      <h4>Informacije o materijalu</h4>
      {items.map((item) => (
        <article key={item.id} className="material-item-card">
          <h5>{item.material_type_name || "Materijal"}</h5>
          <dl className="material-item-dl">
            <div>
              <dt>Dimenzije / format</dt>
              <dd>{item.dimensions_format}</dd>
            </div>
            <div>
              <dt>Količina</dt>
              <dd>{item.quantity}</dd>
            </div>
            <div className="full">
              <dt>Sadržaj vizuala / tekst</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{item.visual_content}</dd>
            </div>
            {item.is_print && item.print_shop && (
              <div>
                <dt>Štamparija</dt>
                <dd>{item.print_shop}</dd>
              </div>
            )}
            <div>
              <dt>Rok postavke</dt>
              <dd>{formatDate(item.installation_deadline)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
