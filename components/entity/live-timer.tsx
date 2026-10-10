"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

export function LiveTimer({ startedAt }: { startedAt: string }) {
  const start = Date.parse(startedAt);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-flex items-center gap-1 font-medium tabular-nums text-tealdark" aria-label="Laufende Besuchsdauer">
      <Timer size={14} aria-hidden /> {now === null ? "--:--" : fmt(now - start)}
    </span>
  );
}
