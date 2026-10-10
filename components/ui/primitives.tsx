import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const base = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const variants = {
  primary: "bg-teal text-white hover:bg-tealdark",
  secondary: "border border-line bg-surface text-ink hover:bg-bg",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-ink hover:bg-bg",
};

export function Button({ variant = "primary", loading, children, className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; loading?: boolean }) {
  return (
    <button {...p} disabled={p.disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const tones: Record<string, string> = {
  ok: "bg-oksoft text-ok", warn: "bg-warnsoft text-warn", danger: "bg-dangersoft text-danger", neutral: "bg-bg text-muted border border-line", info: "bg-tealsoft text-tealdark",
};
const TONE: Record<string, string> = {
  aktiv: "ok", erledigt: "ok", abgeschlossen: "ok", final: "ok", gegeben: "ok", abgeheilt: "neutral", entlassen: "neutral",
  draft: "warn", offen: "warn", geplant: "info", begonnen: "info", in_pruefung: "warn", pruefung: "warn", aufnahme_geplant: "info", hoch: "danger", verweigert: "danger", ausgelassen: "warn", storniert: "neutral", ausgefallen: "neutral",
  besonderes_vorkommnis: "warn", btm: "danger", bedarf: "info", regulaer: "neutral",
};
export const LABELS: Record<string, string> = {
  draft: "Entwurf", final: "Final", in_pruefung: "In Prüfung", pruefung: "Zur Prüfung", aufnahme_geplant: "Aufnahme geplant", besonderes_vorkommnis: "Besonderes Vorkommnis",
  regulaer: "Regelmedikation", bedarf: "Bedarf", btm: "BtM", frueh: "Frühdienst", spaet: "Spätdienst", nacht: "Nachtdienst", tag: "Tagdienst", spo2: "SpO2", massnahme: "Maßnahme",
};
export function Badge({ value, tone }: { value: string; tone?: string }) {
  const label = LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone ?? TONE[value] ?? "neutral"]}`}>{label}</span>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-navy">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface ${className}`}>{children}</section>;
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center text-muted">
      <div className="mb-3 text-teal">{icon}</div>
      <p className="font-medium text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm">{text}</p>}
    </div>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xl font-semibold tracking-tight ${light ? "text-white" : "text-navy"}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <rect width="26" height="26" rx="7" fill="#0b8f83" />
        <path d="M6 8l5 11 3-7 2 4 4-8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Vitalo
    </span>
  );
}

export const inputCls = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-teal";
