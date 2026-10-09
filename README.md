# Vitalo

Pflegedokumentation (Next.js 16, TypeScript, Tailwind 4, Supabase). Multi-tenant, Row Level Security, deutsche Oberfläche, nur Icon-Grafiken (lucide), keine Emojis.

## Start
1. `cp .env.example .env.local` und die Supabase-URL sowie den **publishable** Key eintragen. Der Service-Role-Key gehört nie in den Browser-Code.
2. Migrationen aus `supabase/migrations/` der Reihe nach anwenden (001, 002, 003).
3. In Supabase unter Authentication > URL Configuration die Site-URL und `…/auth/callback` als Redirect eintragen.
4. `npm install && npm run dev`

## Aufbau
- `lib/entities.ts`: Konfiguration aller Module (Felder, Spalten, Aktionen, Schreibrollen).
- `app/actions/*`: Server Actions mit Zod-Validierung und Berechtigungsprüfung; die Datenbank erzwingt zusätzlich RLS.
- `proxy.ts`: Session-Refresh und Weiterleitung nicht angemeldeter Nutzer.
- Finalisierte Berichte, SIS und abgeschlossene Ereignisse sind per Trigger unveränderlich; Korrekturen laufen über `record_corrections`.

## Noch offen
Stripe-Anbindung, E-Mail-Versand für Einladungen (Link wird kopiert), Marketing-Unterseiten, Malware-Scan für Uploads, Rate Limiting, Jest/Playwright-Tests, AVV/DSFA/Impressum/Datenschutz (Betreiber), fachliche Freigabe von Medikations- und AKI-Workflows.
