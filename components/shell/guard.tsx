import { ShieldAlert } from "lucide-react";
import { getContext } from "@/lib/context";
import { canAccess } from "@/lib/permissions";
import { EmptyState, Card } from "@/components/ui/primitives";

/** Returns the context if the active role may open the area, otherwise a permission-denied element. */
export async function guard(area: string) {
  const ctx = await getContext();
  if (canAccess(area, ctx.role)) return { ctx, denied: null as React.ReactNode };
  return {
    ctx,
    denied: (
      <Card><EmptyState icon={<ShieldAlert size={36} />} title="Kein Zugriff" text="Ihre Rolle hat für diesen Bereich keine Berechtigung. Wenden Sie sich an Ihre Administration." /></Card>
    ),
  };
}
