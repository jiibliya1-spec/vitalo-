"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriteContext } from "@/lib/context";
import { hasAnyRole } from "@/lib/permissions";
import { DOCUMENT_CATEGORY_KEYS } from "@/lib/document-categories";
import { safeFilename } from "@/lib/format";
import type { ActionResult } from "./records";

const MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX = 10 * 1024 * 1024;
const UPLOAD_ROLES = ["pdl", "pflegefachkraft"];

function sniff(buf: Uint8Array, mime: string) {
  const h = (...b: number[]) => b.every((v, i) => buf[i] === v);
  if (mime === "application/pdf") return h(0x25, 0x50, 0x44, 0x46);
  if (mime === "image/png") return h(0x89, 0x50, 0x4e, 0x47);
  if (mime === "image/jpeg") return h(0xff, 0xd8, 0xff);
  return false;
}

export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  const { supabase, orgId, roles, user } = await requireWriteContext();
  if (!hasAnyRole(roles, UPLOAD_ROLES)) return { ok: false, message: "Keine Berechtigung zum Hochladen." };
  const meta = z
    .object({ patient_id: z.string().uuid("Patient auswählen"), category: z.enum(DOCUMENT_CATEGORY_KEYS) })
    .safeParse(Object.fromEntries(formData));
  const file = formData.get("file");
  if (!meta.success) return { ok: false, message: meta.error.issues[0].message };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Bitte eine Datei auswählen." };
  if (!MIME.has(file.type)) return { ok: false, message: "Nur PDF, JPEG und PNG sind erlaubt." };
  if (file.size > MAX) return { ok: false, message: "Datei zu groß (maximal 10 MB)." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniff(bytes, file.type)) return { ok: false, message: "Dateiinhalt passt nicht zum Dateityp." };

  const { data: patient } = await supabase.from("patients").select("id").eq("id", meta.data.patient_id).eq("organization_id", orgId).maybeSingle();
  if (!patient) return { ok: false, message: "Patient nicht gefunden." };

  const name = safeFilename(file.name);
  const path = `${orgId}/${meta.data.patient_id}/${crypto.randomUUID()}-${name}`;
  const up = await supabase.storage.from("patient-documents").upload(path, bytes, { contentType: file.type, upsert: false });
  if (up.error) return { ok: false, message: "Upload fehlgeschlagen." };
  const { data: doc, error } = await supabase
    .from("documents")
    .insert({ organization_id: orgId, patient_id: meta.data.patient_id, category: meta.data.category, filename: name, storage_path: path, mime_type: file.type, size_bytes: file.size, created_by: user.id })
    .select("id")
    .single();
  if (error || !doc) {
    await supabase.storage.from("patient-documents").remove([path]);
    return { ok: false, message: "Dokument konnte nicht gespeichert werden." };
  }
  await supabase.from("document_access_logs").insert({ organization_id: orgId, document_id: doc.id, user_id: user.id, action: "upload" });
  revalidatePath("/dokumente");
  return { ok: true, message: "Dokument hochgeladen." };
}

/** Returns a 60-second signed URL after verifying access via RLS and writing an access log entry. */
export async function getDocumentUrl(id: string): Promise<ActionResult & { url?: string }> {
  const { supabase, orgId, user } = await requireWriteContext();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Ungültig." };
  const { data: doc } = await supabase.from("documents").select("id, storage_path").eq("id", id).eq("organization_id", orgId).maybeSingle();
  if (!doc) return { ok: false, message: "Dokument nicht gefunden oder kein Zugriff." };
  const { data, error } = await supabase.storage.from("patient-documents").createSignedUrl(doc.storage_path, 60);
  if (error || !data) return { ok: false, message: "Zugriff nicht möglich." };
  await supabase.from("document_access_logs").insert({ organization_id: orgId, document_id: doc.id, user_id: user.id, action: "download" });
  return { ok: true, message: "OK", url: data.signedUrl };
}
