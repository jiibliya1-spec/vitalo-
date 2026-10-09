import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/context";
import { Wordmark } from "@/components/ui/primitives";
import { AcceptButton } from "./accept";

export const metadata: Metadata = { title: "Einladung annehmen" };

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/einladung/${token}`)}`);
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="mb-6"><Wordmark /></div>
      <div className="rounded-xl border border-line bg-surface p-6">
        <h1 className="mb-2 text-xl font-semibold text-navy">Einladung annehmen</h1>
        <p className="mb-5 text-sm text-muted">Sie sind als {user.email} angemeldet. Die Einladung gilt nur für die E-Mail-Adresse, an die sie ausgestellt wurde.</p>
        <AcceptButton token={token} />
        <p className="mt-4 text-sm"><Link className="text-tealdark hover:underline" href="/dashboard">Zum Dashboard</Link></p>
      </div>
    </div>
  );
}
