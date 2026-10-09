import Link from "next/link";
import { ShieldCheck, ClipboardList, HeartPulse, Building2, Lock, FileCheck2 } from "lucide-react";
import { Wordmark } from "@/components/ui/primitives";

const features = [
  { icon: ClipboardList, title: "Pflegeberichte und Planung", text: "Strukturierte Berichte, SIS-orientierte Einschätzung und Pflegepläne mit nachvollziehbarer Korrekturhistorie." },
  { icon: HeartPulse, title: "Vitalwerte und Medikation", text: "Messwerte mit konfigurierbaren Prüfhinweisen und Dokumentation der Verabreichung." },
  { icon: Building2, title: "Stationär, ambulant, AKI", text: "Standorte, Besuche, Schichten und Übergaben in einer Organisation." },
  { icon: Lock, title: "Mandantentrennung", text: "Jede Organisation arbeitet in einem getrennten Datenraum, abgesichert in der Datenbank." },
  { icon: FileCheck2, title: "Unveränderliche Einträge", text: "Finalisierte Einträge bleiben erhalten. Korrekturen werden mit Autor und Zeitstempel ergänzt." },
  { icon: ShieldCheck, title: "Private Dokumente", text: "Dateien liegen in privatem Speicher, Zugriffe erfolgen über kurzlebige Links und werden protokolliert." },
];

export default function Home() {
  return (
    <div>
      <header className="flex items-center justify-between px-6 py-4">
        <Wordmark />
        <nav className="flex items-center gap-3 text-sm font-medium">
          <Link href="/login" className="rounded-lg px-3 py-2 hover:bg-white">Anmelden</Link>
          <Link href="/registrieren" className="rounded-lg bg-teal px-3.5 py-2 text-white hover:bg-tealdark">Konto erstellen</Link>
        </nav>
      </header>
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="text-4xl font-semibold leading-tight text-navy sm:text-5xl">Pflegedokumentation, die den Pflegealltag einfacher macht.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">Vitalo unterstützt Pflegeeinrichtungen und ambulante Dienste bei der täglichen Dokumentation, mit klaren Rollen und sauberer Nachvollziehbarkeit.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/registrieren" className="rounded-lg bg-teal px-5 py-3 font-medium text-white hover:bg-tealdark">Jetzt starten</Link>
          <Link href="/login" className="rounded-lg border border-line bg-surface px-5 py-3 font-medium hover:bg-bg">Anmelden</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-line bg-surface p-5">
            <f.icon className="mb-3 text-teal" size={24} aria-hidden />
            <h2 className="font-semibold text-navy">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>
      <footer className="border-t border-line px-6 py-6 text-center text-xs text-muted">
        Impressum, Datenschutzerklärung und AGB: Platzhalter, vom Betreiber bereitzustellen. Vitalo ersetzt keine ärztliche oder pflegefachliche Beurteilung.
      </footer>
    </div>
  );
}
