"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Play, Flag, Lock, Archive, Loader2 } from "lucide-react";
import { runRowAction } from "@/app/actions/records";
import { useToast } from "@/components/ui/toast";

const ICONS = { check: Check, x: X, play: Play, flag: Flag, lock: Lock, archive: Archive };
export type ActionDef = { index: number; label: string; icon: keyof typeof ICONS; confirm?: string };

export function RowActions({ entityKey, id, actions }: { entityKey: string; id: string; actions: ActionDef[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {actions.map((a) => {
        const Icon = ICONS[a.icon];
        return (
          <button
            key={a.index}
            disabled={pending}
            onClick={() => {
              if (a.confirm && !window.confirm(a.confirm)) return;
              start(async () => {
                const res = await runRowAction(entityKey, id, a.index);
                toast(res.ok, res.message);
                if (res.ok) router.refresh();
              });
            }}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium hover:bg-bg disabled:opacity-60"
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} aria-hidden />}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
