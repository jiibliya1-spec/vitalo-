export function Sparkline({ points, label }: { points: { t: number; v: number }[]; label: string }) {
  if (points.length < 2) return <p className="text-sm text-muted">Für einen Verlauf werden mindestens zwei Messwerte benötigt.</p>;
  const w = 320, h = 90, pad = 8;
  const xs = points.map((p) => p.t), ys = points.map((p) => p.v);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)], [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const sx = (x: number) => pad + ((x - x0) / (x1 - x0 || 1)) * (w - 2 * pad);
  const sy = (y: number) => h - pad - ((y - y0) / (y1 - y0 || 1)) * (h - 2 * pad);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(p.t).toFixed(1)},${sy(p.v).toFixed(1)}`).join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full max-w-sm" role="img" aria-label={`Verlauf ${label}: ${ys[0]} bis ${ys[ys.length - 1]}`}>
        <path d={d} fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={sx(p.t)} cy={sy(p.v)} r="3" fill="var(--teal)" />)}
      </svg>
      <figcaption className="text-xs text-muted">{label}: {y0} – {y1}</figcaption>
    </figure>
  );
}
