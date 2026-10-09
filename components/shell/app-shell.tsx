"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Users, ClipboardList, FileText, HeartPulse, Pill, Bandage, TriangleAlert, ListChecks,
  CalendarClock, CalendarDays, FolderLock, Receipt, UserCog, Settings, Menu, X, LogOut, Building2, ChevronDown,
} from "lucide-react";
import { Wordmark } from "@/components/ui/primitives";
import { signOut } from "@/app/actions/auth";
import { switchOrganization } from "@/app/actions/org";

const ICONS = {
  dashboard: LayoutDashboard, patienten: Users, pflegeplanung: ClipboardList, pflegeberichte: FileText, vitalwerte: HeartPulse,
  medikation: Pill, wunden: Bandage, ereignisse: TriangleAlert, aufgaben: ListChecks, besuche: CalendarClock,
  dienstplanung: CalendarDays, dokumente: FolderLock, abrechnung: Receipt, mitarbeiter: UserCog, einstellungen: Settings,
};
export type NavItem = { key: keyof typeof ICONS; label: string };

export function AppShell({ nav, orgName, orgs, activeOrgId, userName, roleLabel, children }: {
  nav: NavItem[]; orgName: string; orgs: { id: string; name: string }[]; activeOrgId: string; userName: string; roleLabel: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const links = (
    <nav aria-label="Hauptnavigation" className="flex flex-col gap-0.5 px-3 py-3">
      {nav.map(({ key, label }) => {
        const Icon = ICONS[key];
        const active = path === `/${key}` || path.startsWith(`/${key}/`);
        return (
          <Link key={key} href={`/${key}`} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
            <Icon size={18} aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden bg-navy lg:block">
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto">
          <div className="px-5 py-5"><Wordmark light /></div>
          {links}
        </div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Menü schließen" className="absolute inset-0 bg-navy/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] overflow-y-auto bg-navy">
            <div className="flex items-center justify-between px-5 py-5"><Wordmark light /><button aria-label="Menü schließen" onClick={() => setOpen(false)} className="text-white"><X size={20} /></button></div>
            {links}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
          <button aria-label="Menü öffnen" className="rounded-lg p-2 hover:bg-bg lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-bg">
              <Building2 size={16} className="text-teal" aria-hidden /> <span className="max-w-[10rem] truncate sm:max-w-[16rem]">{orgName}</span> <ChevronDown size={14} aria-hidden />
            </summary>
            <div className="absolute left-0 mt-1 w-64 rounded-lg border border-line bg-surface p-1 shadow-lg">
              <p className="px-3 py-1.5 text-xs uppercase tracking-wide text-muted">Organisation wechseln</p>
              {orgs.map((o) => (
                <form key={o.id} action={switchOrganization.bind(null, o.id)}>
                  <button className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-bg ${o.id === activeOrgId ? "font-semibold text-tealdark" : ""}`}>{o.name}</button>
                </form>
              ))}
              <Link href="/onboarding" className="block rounded-md px-3 py-2 text-sm text-tealdark hover:bg-bg">Neue Organisation anlegen</Link>
            </div>
          </details>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right text-sm leading-tight sm:block">
              <div className="font-medium">{userName}</div>
              <div className="text-xs text-muted">{roleLabel}</div>
            </div>
            <form action={signOut}>
              <button className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-bg"><LogOut size={16} aria-hidden /> Abmelden</button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="border-t border-line px-6 py-3 text-xs text-muted">
          Vitalo ersetzt keine ärztliche oder pflegefachliche Beurteilung. Prüfhinweise sind keine Diagnosen.
        </footer>
      </div>
    </div>
  );
}
