import Link from "next/link";
import { Wordmark } from "@/components/ui/primitives";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6"><Wordmark /></Link>
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-sm">{children}</div>
    </div>
  );
}
