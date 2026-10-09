import { NextResponse } from "next/server";
import { getContext } from "@/lib/context";
import { canAccess } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { csvCell, currentMonth, loadBilling, MONTH_RE } from "@/lib/billing";

export async function GET(req: Request) {
  const ctx = await getContext();
  if (!canAccess("abrechnung", ctx.roles)) return new NextResponse("Keine Berechtigung.", { status: 403 });
  const raw = new URL(req.url).searchParams.get("month") ?? "";
  const month = MONTH_RE.test(raw) ? raw : currentMonth();
  const rows = await loadBilling(await createClient(), ctx.orgId, month);
  const de = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
  const head = ["Monat", "Nachname", "Vorname", "Geburtsdatum", "Pflegegrad", "Besuch", "Besuchsstatus", "Leistung", "Minuten"];
  const lines = rows.map((r) => {
    const p = r.visit.patient;
    return [month, p?.last_name, p?.first_name, p?.birth_date, p?.pflegegrad, de.format(new Date(r.visit.planned_start)), r.visit.status, r.service, r.duration_min].map(csvCell).join(";");
  });
  const body = "﻿" + [head.map(csvCell).join(";"), ...lines].join("\r\n") + "\r\n";
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leistungsnachweise-${month}.csv"`, "Cache-Control": "no-store" },
  });
}
