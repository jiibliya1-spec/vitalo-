/** Document categories for patient files. Keep in sync with the CHECK constraint in migration 004. */
export const DOCUMENT_CATEGORIES = [
  { key: "arztbrief", label: "Arztbrief" },
  { key: "verordnung", label: "Verordnung" },
  { key: "medikationsplan", label: "Medikationsplan" },
  { key: "befund", label: "Befund / Laborwerte" },
  { key: "entlassbrief", label: "Entlassbrief" },
  { key: "pflegeplan", label: "Pflegeplan / SIS" },
  { key: "vertrag", label: "Pflegevertrag" },
  { key: "vollmacht", label: "Vollmacht / Betreuung" },
  { key: "patientenverfuegung", label: "Patientenverfügung" },
  { key: "einwilligung", label: "Einwilligung / Datenschutz" },
  { key: "pflegegrad", label: "Pflegegrad / Gutachten" },
  { key: "abrechnung", label: "Abrechnung / Kostenträger" },
  { key: "wunde", label: "Wunddokumentation" },
  { key: "sonstiges", label: "Sonstiges" },
] as const;

export const DOCUMENT_CATEGORY_KEYS = DOCUMENT_CATEGORIES.map((c) => c.key) as unknown as [string, ...string[]];

export function categoryLabel(key: string) {
  return DOCUMENT_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
