const dt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const d = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

export const fmtDateTime = (v?: string | null) => (v ? dt.format(new Date(v)) : "–");
export const fmtDate = (v?: string | null) => (v ? d.format(new Date(v.length === 10 ? v + "T12:00:00" : v)) : "–");
export const fullName = (p?: { first_name: string; last_name: string } | null) =>
  p ? `${p.last_name}, ${p.first_name}` : "–";

export function safeFilename(name: string) {
  const base = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "_").slice(-120);
  return base || "datei";
}
