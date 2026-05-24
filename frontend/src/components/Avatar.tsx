interface Props { name: string; size?: "sm" | "md"; url?: string | null; }

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

function colorFromName(name: string) {
  const colors = ["#4f46e5", "#0891b2", "#16a34a", "#ea580c", "#db2777", "#9333ea", "#65a30d"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

export default function Avatar({ name, size = "md", url }: Props) {
  if (url) {
    return <img src={url} className={"avatar " + (size === "sm" ? "sm" : "")} alt={name} />;
  }
  return (
    <div className={"avatar " + (size === "sm" ? "sm" : "")} style={{ background: colorFromName(name) }} title={name}>
      {initials(name) || "?"}
    </div>
  );
}
