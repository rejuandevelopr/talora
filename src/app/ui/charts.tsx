import { useId, useState } from 'react';
import { cx } from '../lib/format';

/** Smooth area chart with hover tooltip. Pure SVG, no chart library. */
export function AreaChart({ data, labels, height = 220, format = (n: number) => String(n), compare }: { data: number[]; labels: string[]; height?: number; format?: (n: number) => string; compare?: number[] }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, pad = { t: 16, r: 8, b: 26, l: 8 };
  const all = [...data, ...(compare ?? [])];
  const max = Math.max(...all) * 1.15 || 1;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const path = (arr: number[]) => arr.map((v, i) => {
    if (i === 0) return `M${x(0)},${y(v)}`;
    const cx1 = (x(i - 1) + x(i)) / 2;
    return `C${cx1},${y(arr[i - 1])} ${cx1},${y(v)} ${x(i)},${y(v)}`;
  }).join(' ');
  const line = path(data);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f4a64a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f4a64a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
        {compare && <path d={path(compare)} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
        <path d={`${line} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`} fill={`url(#g${id})`} />
        <path d={line} fill="none" stroke="#f4a64a" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {data.map((v, i) => (
          <rect key={i} x={x(i) - (W / data.length) / 2} y={0} width={W / data.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgba(255,255,255,0.2)" vectorEffect="non-scaling-stroke" />}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-ink-700 px-2.5 py-1.5 text-[11px] shadow-xl ring-1 ring-white/10" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover]) / H) * 100 - 22}%` }}>
          <p className="text-mist-400">{labels[hover]}</p>
          <p className="font-semibold">{format(data[hover])}</p>
          {compare && <p className="text-mist-400">prev {format(compare[hover])}</p>}
        </div>
      )}
      <div className="mt-1 flex justify-between px-1 text-[10px] text-mist-400">
        {labels.map((l, i) => <span key={i} className={cx(labels.length > 8 && i % 2 === 1 && 'hidden sm:inline')}>{l}</span>)}
      </div>
    </div>
  );
}

export function BarChart({ data, labels, height = 180, format = (n: number) => String(n), highlight }: { data: number[]; labels: string[]; height?: number; format?: (n: number) => string; highlight?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data, 1);
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((v, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div className={cx('w-full rounded-t-md transition-all', (highlight ?? data.length - 1) === i ? 'bg-amber' : 'bg-white/15 group-hover:bg-white/25')} style={{ height: `${Math.max(2, (v / max) * 100)}%` }} />
            {hover === i && <span className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-700 px-2 py-1 text-[10px] font-semibold ring-1 ring-white/10">{format(v)}</span>}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 text-[10px] text-mist-400">{labels.map((l, i) => <span key={i} className="flex-1 truncate text-center">{l}</span>)}</div>
    </div>
  );
}

export function Donut({ segments, size = 140, thickness = 16, center }: { segments: { label: string; value: number; color: string }[]; size?: number; thickness?: number; center?: React.ReactNode }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const el = <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} strokeLinecap="butt" />;
          offset += len;
          return el;
        })}
      </svg>
      {center && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  );
}

export function Sparkline({ data, width = 90, height = 28, color = '#f4a64a' }: { data: number[]; width?: number; height?: number; color?: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / (max - min || 1)) * (height - 4) - 2}`).join(' ');
  return <svg width={width} height={height}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
