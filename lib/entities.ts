import type { Role } from "@/lib/permissions";

export type Opt = { value: string; label: string };
export type FieldType =
  | "text" | "textarea" | "number" | "date" | "datetime" | "select" | "checkbox"
  | "patient" | "member" | "location" | "medication" | "wound" | "visit" | "careplan" | "sis";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Opt[];
  max?: number;
  min?: number;
  step?: number;
  now?: boolean; // default to current time
  hint?: string;
};

export type ColType = "text" | "datetime" | "date" | "badge" | "patient" | "member" | "bool" | "wrap";
export type Column = { key: string; label: string; type?: ColType };

export type RowAction = {
  label: string;
  icon: "check" | "x" | "play" | "flag" | "lock" | "archive";
  patch: Record<string, string | boolean | null>; // "$now" is replaced on the server
  when: (row: Record<string, unknown>) => boolean;
  confirm?: string;
};

export type Entity = {
  table: string;
  title: string;
  singular: string;
  description: string;
  fields: Field[];
  columns: Column[];
  order: { column: string; ascending: boolean };
  writeRoles: Role[];
  actions?: RowAction[];
  correctable?: boolean;
  patientFixed?: boolean;
  empty: string;
  /** adds derived columns before insert (server side) */
  derive?: (v: Record<string, unknown>) => Record<string, unknown>;
};

const o = (...vals: string[][]): Opt[] => vals.map(([value, label]) => ({ value, label }));

export const VITAL_KINDS = o(
  ["blutdruck", "Blutdruck (mmHg)"], ["puls", "Puls (/min)"], ["temperatur", "Körpertemperatur (°C)"],
  ["spo2", "Sauerstoffsättigung SpO2 (%)"], ["atemfrequenz", "Atemfrequenz (/min)"],
  ["gewicht", "Körpergewicht (kg)"], ["blutzucker", "Blutzucker (mg/dl)"],
);
export const VITAL_UNITS: Record<string, string> = {
  blutdruck: "mmHg", puls: "/min", temperatur: "°C", spo2: "%", atemfrequenz: "/min", gewicht: "kg", blutzucker: "mg/dl",
};
/** Plausibility ranges that only reject physically impossible input. They are NOT clinical thresholds. */
export const VITAL_LIMITS: Record<string, [number, number]> = {
  blutdruck: [20, 350], puls: [5, 300], temperatur: [20, 46], spo2: [30, 100], atemfrequenz: [1, 120], gewicht: [1, 500], blutzucker: [5, 1500],
};

const CLIN_WRITE: Role[] = ["pdl", "pflegefachkraft"];
const ALL_CARE: Role[] = ["pdl", "pflegefachkraft", "pflegehilfskraft"];

export const ENTITIES: Record<string, Entity> = {
  patients: {
    table: "patients", title: "Patienten", singular: "Patient", description: "Bewohner und Klienten Ihrer Organisation.",
    writeRoles: ["org_owner", "org_admin", "pdl", "pflegefachkraft"],
    order: { column: "last_name", ascending: true },
    empty: "Noch keine Patienten angelegt.",
    fields: [
      { name: "first_name", label: "Vorname", type: "text", required: true, max: 80 },
      { name: "last_name", label: "Nachname", type: "text", required: true, max: 80 },
      { name: "birth_date", label: "Geburtsdatum", type: "date", required: true },
      { name: "gender", label: "Geschlecht", type: "select", options: o(["w", "weiblich"], ["m", "männlich"], ["d", "divers"], ["x", "keine Angabe"]) },
      { name: "status", label: "Status", type: "select", required: true, options: o(["aktiv", "Aktiv"], ["aufnahme_geplant", "Aufnahme geplant"]) },
      { name: "location_id", label: "Standort / Wohnbereich", type: "location" },
      { name: "room", label: "Zimmer", type: "text", max: 20 },
      { name: "pflegegrad", label: "Pflegegrad", type: "select", options: o(["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]) },
    ],
    columns: [
      { key: "last_name", label: "Name" }, { key: "birth_date", label: "Geboren", type: "date" },
      { key: "room", label: "Zimmer" }, { key: "pflegegrad", label: "Pflegegrad" }, { key: "status", label: "Status", type: "badge" },
    ],
    actions: [
      { label: "Entlassen", icon: "archive", patch: { status: "entlassen" }, when: (r) => r.status === "aktiv", confirm: "Patient wirklich als entlassen markieren? Die Dokumentation bleibt erhalten." },
      { label: "Wieder aufnehmen", icon: "play", patch: { status: "aktiv" }, when: (r) => r.status === "entlassen" },
    ],
  },
  allergies: {
    table: "allergies", title: "Allergien und Unverträglichkeiten", singular: "Allergie", description: "Bekannte Allergien.",
    writeRoles: CLIN_WRITE, order: { column: "created_at", ascending: false },
    empty: "Keine Allergien erfasst.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "substance", label: "Auslöser", type: "text", required: true, max: 120 },
      { name: "reaction", label: "Reaktion", type: "text", max: 300 },
      { name: "severity", label: "Schweregrad", type: "select", options: o(["leicht", "Leicht"], ["mittel", "Mittel"], ["schwer", "Schwer"]) },
    ],
    columns: [{ key: "substance", label: "Auslöser" }, { key: "reaction", label: "Reaktion" }, { key: "severity", label: "Schweregrad", type: "badge" }],
  },
  diagnoses: {
    table: "diagnoses", title: "Diagnosen", singular: "Diagnose", description: "Ärztlich gestellte Diagnosen.",
    writeRoles: CLIN_WRITE, order: { column: "created_at", ascending: false },
    empty: "Keine Diagnosen erfasst.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "description", label: "Diagnose", type: "text", required: true, max: 300 },
      { name: "icd_code", label: "ICD-10-Code", type: "text", max: 12 },
      { name: "since", label: "Seit", type: "date" },
    ],
    columns: [{ key: "description", label: "Diagnose" }, { key: "icd_code", label: "ICD-10" }, { key: "since", label: "Seit", type: "date" }],
  },
  patient_contacts: {
    table: "patient_contacts", title: "Kontakte", singular: "Kontakt", description: "Angehörige und Bevollmächtigte.",
    writeRoles: ["org_owner", "org_admin", "pdl", "pflegefachkraft"], order: { column: "created_at", ascending: false },
    empty: "Keine Kontakte erfasst.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "name", label: "Name", type: "text", required: true, max: 120 },
      { name: "relation", label: "Beziehung", type: "text", max: 80 },
      { name: "phone", label: "Telefon", type: "text", max: 40 },
      { name: "is_authorized", label: "Auskunftsberechtigt", type: "checkbox" },
    ],
    columns: [{ key: "name", label: "Name" }, { key: "relation", label: "Beziehung" }, { key: "phone", label: "Telefon" }, { key: "is_authorized", label: "Auskunftsberechtigt", type: "bool" }],
  },
  sis_assessments: {
    table: "sis_assessments", title: "SIS-Einschätzungen", singular: "SIS-Einschätzung", description: "Strukturierte Informationssammlung nach Themenfeldern.",
    writeRoles: CLIN_WRITE, order: { column: "assessed_at", ascending: false }, correctable: true,
    empty: "Noch keine Einschätzung erfasst.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "kognitiv_kommunikativ", label: "Kognitive und kommunikative Fähigkeiten", type: "textarea", max: 4000 },
      { name: "mobilitaet", label: "Mobilität und Beweglichkeit", type: "textarea", max: 4000 },
      { name: "krankheitsbezogen", label: "Krankheitsbezogene Anforderungen und Belastungen", type: "textarea", max: 4000 },
      { name: "selbstversorgung", label: "Selbstversorgung", type: "textarea", max: 4000 },
      { name: "soziale_beziehungen", label: "Leben in sozialen Beziehungen", type: "textarea", max: 4000 },
      { name: "wohnen_haeuslichkeit", label: "Wohnen und Häuslichkeit", type: "textarea", max: 4000 },
      { name: "risks", label: "Risiken und Pflegebedarf", type: "textarea", max: 4000 },
    ],
    columns: [{ key: "patient_id", label: "Patient", type: "patient" }, { key: "assessed_at", label: "Erfasst", type: "datetime" }, { key: "risks", label: "Risiken", type: "wrap" }, { key: "status", label: "Status", type: "badge" }],
    actions: [{ label: "Finalisieren", icon: "lock", patch: { status: "final" }, when: (r) => r.status === "draft", confirm: "Finalisierte Einschätzungen können nur über einen Korrektureintrag ergänzt werden. Fortfahren?" }],
  },
  care_plans: {
    table: "care_plans", title: "Pflegepläne", singular: "Pflegeplan", description: "Ziele, Überprüfungstermine und Verknüpfung zur SIS.",
    writeRoles: CLIN_WRITE, order: { column: "created_at", ascending: false },
    empty: "Noch keine Pflegepläne vorhanden.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "sis_id", label: "Zugehörige SIS-Einschätzung", type: "sis" },
      { name: "goal", label: "Pflegeziel", type: "textarea", required: true, max: 1000 },
      { name: "review_date", label: "Überprüfung am", type: "date" },
    ],
    columns: [{ key: "patient_id", label: "Patient", type: "patient" }, { key: "goal", label: "Ziel", type: "wrap" }, { key: "review_date", label: "Überprüfung", type: "date" }, { key: "status", label: "Status", type: "badge" }],
    actions: [{ label: "Abschließen", icon: "check", patch: { status: "abgeschlossen" }, when: (r) => r.status === "aktiv" }],
  },
  care_plan_interventions: {
    table: "care_plan_interventions", title: "Maßnahmen", singular: "Maßnahme", description: "Pflegerische Maßnahmen je Pflegeplan.",
    writeRoles: CLIN_WRITE, order: { column: "created_at", ascending: false },
    empty: "Noch keine Maßnahmen erfasst.",
    fields: [
      { name: "care_plan_id", label: "Pflegeplan", type: "careplan", required: true },
      { name: "description", label: "Maßnahme", type: "textarea", required: true, max: 1000 },
      { name: "responsible", label: "Verantwortlich", type: "text", max: 120 },
      { name: "frequency", label: "Häufigkeit", type: "text", max: 120 },
    ],
    columns: [{ key: "description", label: "Maßnahme", type: "wrap" }, { key: "responsible", label: "Verantwortlich" }, { key: "frequency", label: "Häufigkeit" }],
  },
  nursing_reports: {
    table: "nursing_reports", title: "Pflegeberichte", singular: "Pflegebericht", description: "Tägliche Pflegedokumentation mit Korrekturhistorie.",
    writeRoles: ALL_CARE, order: { column: "event_time", ascending: false }, correctable: true,
    empty: "Noch keine Pflegeberichte vorhanden.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "category", label: "Kategorie", type: "select", required: true, options: o(["pflegebericht", "Pflegebericht"], ["beobachtung", "Beobachtung"], ["massnahme", "Maßnahme"], ["reaktion", "Reaktion"], ["verlauf", "Verlauf"], ["besonderes_vorkommnis", "Besonderes Vorkommnis"]) },
      { name: "event_time", label: "Zeitpunkt des Ereignisses", type: "datetime", required: true, now: true },
      { name: "content", label: "Bericht", type: "textarea", required: true, max: 8000 },
      { name: "status", label: "Speichern als", type: "select", required: true, options: o(["draft", "Entwurf"], ["final", "Final (nicht mehr änderbar)"]) },
    ],
    columns: [{ key: "event_time", label: "Ereignis", type: "datetime" }, { key: "patient_id", label: "Patient", type: "patient" }, { key: "category", label: "Kategorie", type: "badge" }, { key: "content", label: "Bericht", type: "wrap" }, { key: "created_by", label: "Autor", type: "member" }, { key: "status", label: "Status", type: "badge" }],
    actions: [{ label: "Finalisieren", icon: "lock", patch: { status: "final" }, when: (r) => r.status === "draft", confirm: "Nach der Finalisierung ist der Bericht unveränderlich. Korrekturen werden separat protokolliert." }],
  },
  vital_signs: {
    table: "vital_signs", title: "Vitalwerte", singular: "Messwert", description: "Messwerte mit Hinweisen auf Überschreitung konfigurierter Grenzwerte (keine Diagnose).",
    writeRoles: ALL_CARE, order: { column: "measured_at", ascending: false }, correctable: true,
    empty: "Noch keine Messwerte erfasst.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "kind", label: "Messgröße", type: "select", required: true, options: VITAL_KINDS },
      { name: "value", label: "Wert (bei Blutdruck: systolisch)", type: "number", required: true, step: 0.1 },
      { name: "value2", label: "Diastolisch (nur Blutdruck)", type: "number", step: 0.1 },
      { name: "measured_at", label: "Messzeitpunkt", type: "datetime", required: true, now: true },
      { name: "note", label: "Anmerkung", type: "text", max: 500 },
    ],
    columns: [{ key: "measured_at", label: "Gemessen", type: "datetime" }, { key: "patient_id", label: "Patient", type: "patient" }, { key: "kind", label: "Messgröße", type: "badge" }, { key: "display", label: "Wert" }, { key: "flagged", label: "Prüfhinweis", type: "bool" }, { key: "created_by", label: "Erfasst von", type: "member" }],
    derive: (v) => ({ ...v, unit: VITAL_UNITS[String(v.kind)] ?? "" }),
  },
  medication_records: {
    table: "medication_records", title: "Medikationsplan", singular: "Medikament", description: "Ärztlich verordnete Medikation – Eintrag nur durch berechtigte Fachkräfte, ohne Dosierungsempfehlung.",
    writeRoles: CLIN_WRITE, order: { column: "created_at", ascending: false },
    empty: "Noch keine Medikation erfasst.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "name", label: "Medikament", type: "text", required: true, max: 160 },
      { name: "dosage", label: "Dosierung laut Verordnung", type: "text", required: true, max: 160 },
      { name: "med_type", label: "Art", type: "select", required: true, options: o(["regulaer", "Regelmedikation"], ["bedarf", "Bedarfsmedikation"], ["btm", "Betäubungsmittel (BtM)"]) },
      { name: "schedule", label: "Einnahmezeiten", type: "text", required: true, max: 300 },
      { name: "indication", label: "Indikation / Grund der Gabe", type: "text", max: 300 },
      { name: "prescriber", label: "Verordnende Person", type: "text", max: 160 },
      { name: "instructions", label: "Hinweise", type: "textarea", max: 1000 },
      { name: "start_date", label: "Beginn", type: "date" },
      { name: "end_date", label: "Ende", type: "date" },
    ],
    columns: [{ key: "patient_id", label: "Patient", type: "patient" }, { key: "name", label: "Medikament" }, { key: "med_type", label: "Art", type: "badge" }, { key: "dosage", label: "Dosierung" }, { key: "schedule", label: "Zeiten" }, { key: "active", label: "Aktiv", type: "bool" }],
    actions: [
      { label: "Absetzen", icon: "archive", patch: { active: false }, when: (r) => r.active === true, confirm: "Medikament als nicht mehr aktiv markieren?" },
      { label: "Reaktivieren", icon: "play", patch: { active: true }, when: (r) => r.active === false },
    ],
  },
  medication_administrations: {
    table: "medication_administrations", title: "Verabreichungen", singular: "Verabreichung", description: "Dokumentation von Gabe, Verweigerung oder Auslassung.",
    writeRoles: CLIN_WRITE, order: { column: "administered_at", ascending: false }, correctable: true,
    empty: "Noch keine Verabreichungen dokumentiert.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "medication_id", label: "Medikament", type: "medication", required: true },
      { name: "status", label: "Ergebnis", type: "select", required: true, options: o(["gegeben", "Gegeben"], ["verweigert", "Verweigert"], ["ausgelassen", "Ausgelassen"]) },
      { name: "administered_at", label: "Zeitpunkt", type: "datetime", required: true, now: true },
      { name: "note", label: "Anmerkung", type: "text", max: 500 },
    ],
    columns: [{ key: "administered_at", label: "Zeitpunkt", type: "datetime" }, { key: "patient_id", label: "Patient", type: "patient" }, { key: "medication_id", label: "Medikament" }, { key: "status", label: "Ergebnis", type: "badge" }, { key: "created_by", label: "Dokumentiert von", type: "member" }],
  },
  wounds: {
    table: "wounds", title: "Wunden", singular: "Wunde", description: "Wundidentifikation und Verlauf.",
    writeRoles: CLIN_WRITE, order: { column: "created_at", ascending: false },
    empty: "Keine Wunden dokumentiert.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "body_location", label: "Lokalisation", type: "text", required: true, max: 160 },
      { name: "wound_type", label: "Wundart", type: "text", required: true, max: 120 },
    ],
    columns: [{ key: "patient_id", label: "Patient", type: "patient" }, { key: "body_location", label: "Lokalisation" }, { key: "wound_type", label: "Wundart" }, { key: "status", label: "Status", type: "badge" }],
    actions: [{ label: "Abgeheilt", icon: "check", patch: { status: "abgeheilt" }, when: (r) => r.status === "aktiv", confirm: "Wunde als abgeheilt markieren?" }],
  },
  wound_assessments: {
    table: "wound_assessments", title: "Wundverlauf", singular: "Wundbeurteilung", description: "Beurteilungen und Versorgung im Zeitverlauf.",
    writeRoles: CLIN_WRITE, order: { column: "assessed_at", ascending: false },
    empty: "Noch keine Beurteilungen erfasst.",
    fields: [
      { name: "wound_id", label: "Wunde", type: "wound", required: true },
      { name: "assessed_at", label: "Zeitpunkt", type: "datetime", required: true, now: true },
      { name: "size_text", label: "Größe", type: "text", max: 80 },
      { name: "observation", label: "Beobachtung", type: "textarea", required: true, max: 2000 },
      { name: "treatment", label: "Versorgung", type: "textarea", max: 2000 },
    ],
    columns: [{ key: "assessed_at", label: "Zeitpunkt", type: "datetime" }, { key: "size_text", label: "Größe" }, { key: "observation", label: "Beobachtung", type: "wrap" }, { key: "treatment", label: "Versorgung", type: "wrap" }],
  },
  incidents: {
    table: "incidents", title: "Ereignisse", singular: "Ereignis", description: "Besondere Vorkommnisse mit Nachverfolgung.",
    writeRoles: ALL_CARE, order: { column: "event_time", ascending: false }, correctable: true,
    empty: "Keine Ereignisse dokumentiert.",
    fields: [
      { name: "patient_id", label: "Patient (optional)", type: "patient" },
      { name: "category", label: "Kategorie", type: "select", required: true, options: o(["sturz", "Sturz"], ["medikation", "Medikation"], ["verhalten", "Verhalten"], ["verletzung", "Verletzung"], ["sonstiges", "Sonstiges"]) },
      { name: "event_time", label: "Zeitpunkt des Ereignisses", type: "datetime", required: true, now: true },
      { name: "description", label: "Beschreibung", type: "textarea", required: true, max: 4000 },
      { name: "actions_taken", label: "Eingeleitete Maßnahmen", type: "textarea", max: 2000 },
      { name: "follow_up", label: "Weitere Nachverfolgung", type: "textarea", max: 2000 },
    ],
    columns: [{ key: "event_time", label: "Ereignis", type: "datetime" }, { key: "patient_id", label: "Patient", type: "patient" }, { key: "category", label: "Kategorie", type: "badge" }, { key: "description", label: "Beschreibung", type: "wrap" }, { key: "review_status", label: "Prüfstatus", type: "badge" }],
    actions: [
      { label: "In Prüfung", icon: "flag", patch: { review_status: "in_pruefung" }, when: (r) => r.review_status === "offen" },
      { label: "Abschließen", icon: "lock", patch: { review_status: "abgeschlossen" }, when: (r) => r.review_status === "in_pruefung", confirm: "Abgeschlossene Ereignisse sind nicht mehr änderbar. Fortfahren?" },
    ],
  },
  tasks: {
    table: "tasks", title: "Aufgaben", singular: "Aufgabe", description: "Aufgaben mit Fälligkeit, Priorität und Zuständigkeit.",
    writeRoles: ["org_owner", "org_admin", "pdl", "pflegefachkraft", "pflegehilfskraft"], order: { column: "due_at", ascending: true },
    empty: "Keine Aufgaben vorhanden.",
    fields: [
      { name: "title", label: "Titel", type: "text", required: true, max: 200 },
      { name: "description", label: "Beschreibung", type: "textarea", max: 2000 },
      { name: "patient_id", label: "Patient (optional)", type: "patient" },
      { name: "assigned_to", label: "Zuständig", type: "member" },
      { name: "due_at", label: "Fällig am", type: "datetime" },
      { name: "priority", label: "Priorität", type: "select", required: true, options: o(["niedrig", "Niedrig"], ["normal", "Normal"], ["hoch", "Hoch"]) },
    ],
    columns: [{ key: "title", label: "Aufgabe", type: "wrap" }, { key: "patient_id", label: "Patient", type: "patient" }, { key: "assigned_to", label: "Zuständig", type: "member" }, { key: "due_at", label: "Fällig", type: "datetime" }, { key: "priority", label: "Priorität", type: "badge" }, { key: "status", label: "Status", type: "badge" }],
    actions: [
      { label: "Erledigt", icon: "check", patch: { status: "erledigt", completed_at: "$now" }, when: (r) => r.status === "offen" || r.status === "pruefung" },
      { label: "Zur Prüfung", icon: "flag", patch: { status: "pruefung" }, when: (r) => r.status === "offen" },
      { label: "Stornieren", icon: "x", patch: { status: "storniert" }, when: (r) => r.status === "offen" || r.status === "pruefung", confirm: "Aufgabe wirklich stornieren?" },
    ],
  },
  visits: {
    table: "visits", title: "Besuche", singular: "Besuch", description: "Besuchsplanung und Leistungsdokumentation für die ambulante Pflege.",
    writeRoles: ["org_owner", "org_admin", "pdl", "pflegefachkraft", "pflegehilfskraft"], order: { column: "planned_start", ascending: true },
    empty: "Keine Besuche geplant.",
    fields: [
      { name: "patient_id", label: "Patient", type: "patient", required: true },
      { name: "assigned_to", label: "Mitarbeiter", type: "member" },
      { name: "planned_start", label: "Geplanter Beginn", type: "datetime", required: true, now: true },
      { name: "planned_end", label: "Geplantes Ende", type: "datetime", required: true },
      { name: "note", label: "Notiz", type: "textarea", max: 2000 },
    ],
    columns: [{ key: "planned_start", label: "Geplant", type: "datetime" }, { key: "patient_id", label: "Patient", type: "patient" }, { key: "assigned_to", label: "Mitarbeiter", type: "member" }, { key: "started_at", label: "Begonnen", type: "datetime" }, { key: "ended_at", label: "Beendet", type: "datetime" }, { key: "status", label: "Status", type: "badge" }],
    actions: [
      { label: "Beginnen", icon: "play", patch: { status: "begonnen", started_at: "$now" }, when: (r) => r.status === "geplant" },
      { label: "Abschließen", icon: "check", patch: { status: "abgeschlossen", ended_at: "$now" }, when: (r) => r.status === "begonnen" },
      { label: "Ausgefallen", icon: "x", patch: { status: "ausgefallen" }, when: (r) => r.status === "geplant", confirm: "Besuch als ausgefallen markieren?" },
    ],
  },
  service_records: {
    table: "service_records", title: "Leistungsnachweise", singular: "Leistung", description: "Erbrachte Leistungen je Besuch.",
    writeRoles: ["org_owner", "org_admin", "pdl", "pflegefachkraft", "pflegehilfskraft"], order: { column: "created_at", ascending: false },
    empty: "Keine Leistungen erfasst.",
    fields: [
      { name: "visit_id", label: "Besuch", type: "visit", required: true },
      { name: "service", label: "Leistung", type: "text", required: true, max: 200 },
      { name: "duration_min", label: "Dauer (Minuten)", type: "number", min: 1, step: 1 },
    ],
    columns: [{ key: "created_at", label: "Erfasst", type: "datetime" }, { key: "service", label: "Leistung" }, { key: "duration_min", label: "Minuten" }, { key: "created_by", label: "Von", type: "member" }],
  },
  shifts: {
    table: "shifts", title: "Dienstplan", singular: "Schicht", description: "Schichten der Mitarbeiter.",
    writeRoles: ["org_owner", "org_admin", "pdl"], order: { column: "starts_at", ascending: true },
    empty: "Keine Schichten geplant.",
    fields: [
      { name: "user_id", label: "Mitarbeiter", type: "member", required: true },
      { name: "shift_type", label: "Schicht", type: "select", required: true, options: o(["frueh", "Frühdienst"], ["spaet", "Spätdienst"], ["nacht", "Nachtdienst"], ["tag", "Tagdienst"]) },
      { name: "location_id", label: "Standort", type: "location" },
      { name: "starts_at", label: "Beginn", type: "datetime", required: true, now: true },
      { name: "ends_at", label: "Ende", type: "datetime", required: true },
    ],
    columns: [{ key: "starts_at", label: "Beginn", type: "datetime" }, { key: "ends_at", label: "Ende", type: "datetime" }, { key: "user_id", label: "Mitarbeiter", type: "member" }, { key: "shift_type", label: "Schicht", type: "badge" }],
  },
  handovers: {
    table: "handovers", title: "Übergaben", singular: "Übergabe", description: "Schichtübergaben.",
    writeRoles: ALL_CARE, order: { column: "created_at", ascending: false },
    empty: "Keine Übergaben dokumentiert.",
    fields: [
      { name: "location_id", label: "Standort", type: "location" },
      { name: "note", label: "Übergabenotiz", type: "textarea", required: true, max: 4000 },
    ],
    columns: [{ key: "created_at", label: "Zeitpunkt", type: "datetime" }, { key: "note", label: "Notiz", type: "wrap" }, { key: "created_by", label: "Von", type: "member" }],
  },
};
