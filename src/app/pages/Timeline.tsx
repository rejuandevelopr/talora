import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Diamond, Plus } from 'lucide-react';
import { useStore } from '../lib/store';
import { cx, date, dateLong, daysBetween, money, today } from '../lib/format';
import type { ProjectStatus } from '../lib/types';
import { Button, Card, CardHeader, ClientLogo, EmptyState, PageHeader, ProjectStatusBadge, Segmented, Select, projectStatusMeta } from '../ui/ui';

const barTone: Record<ProjectStatus, string> = {
  planning: 'bg-sky-400/25 ring-sky-400/40 text-sky-100',
  in_progress: 'bg-amber/30 ring-amber/50 text-amber-soft',
  review: 'bg-violet-400/25 ring-violet-400/45 text-violet-100',
  done: 'bg-emerald-400/20 ring-emerald-400/40 text-emerald-100',
};
const barFill: Record<ProjectStatus, string> = { planning: 'bg-sky-400/40', in_progress: 'bg-amber/60', review: 'bg-violet-400/45', done: 'bg-emerald-400/40' };

const monthStart = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
const LABEL_W = 240;

export default function Timeline() {
  const s = useStore();
  const now = today();
  const [zoom, setZoom] = useState<'3' | '6'>('6');
  const [clientId, setClientId] = useState('all');
  const [offset, setOffset] = useState(0); // months from Sep 2026

  const months = Number(zoom);
  const baseY = 2026, baseM = 8 + offset; // Sep 2026 = month index 8
  const winStart = monthStart(baseY, baseM);
  const winEnd = monthStart(baseY, baseM + months);
  const totalDays = daysBetween(winStart, winEnd);
  const pxPerDay = zoom === '3' ? 12 : 6;
  const width = totalDays * pxPerDay;
  const x = (iso: string) => Math.min(totalDays, Math.max(0, daysBetween(winStart, iso))) * pxPerDay;

  const monthCols = Array.from({ length: months }, (_, i) => {
    const start = monthStart(baseY, baseM + i);
    const end = monthStart(baseY, baseM + i + 1);
    return { start, left: x(start), width: x(end) - x(start), label: date(start, { month: 'long', year: 'numeric' }) };
  });
  // Monday gridlines
  const weeks: string[] = [];
  {
    const d = new Date(`${winStart}T12:00:00`);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    while (d.toISOString().slice(0, 10) < winEnd) { weeks.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 7); }
  }

  const visible = s.projects
    .filter((p) => s.clients.find((c) => c.id === p.clientId)?.status !== 'archived')
    .filter((p) => clientId === 'all' || p.clientId === clientId)
    .sort((a, b) => a.start.localeCompare(b.start));
  const inWindow = visible.filter((p) => p.due >= winStart && p.start < winEnd);
  const todayIn = now >= winStart && now < winEnd;
  const clientsWithProjects = s.clients.filter((c) => c.status !== 'archived' && s.projects.some((p) => p.clientId === c.id));

  const month = now.slice(0, 7);
  const milestonesThisMonth = visible
    .flatMap((p) => p.milestones.filter((m) => m.due.startsWith(month)).map((m) => ({ ...m, project: p })))
    .sort((a, b) => a.due.localeCompare(b.due));

  const rangeLabel = `${date(winStart, { month: 'short', year: 'numeric' })} to ${date(monthStart(baseY, baseM + months - 1), { month: 'short', year: 'numeric' })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline"
        subtitle={`${inWindow.length} projects scheduled · ${rangeLabel}`}
        actions={<Button variant="primary" href="/app/projects?new=1" icon={<Plus className="size-4" />}>New project</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<'3' | '6'> value={zoom} onChange={setZoom} options={[{ value: '3', label: '3 months' }, { value: '6', label: '6 months' }]} />
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Previous month" className="grid size-9 place-items-center rounded-lg bg-white/[0.03] text-mist-300 ring-1 ring-white/10 hover:bg-white/[0.07] hover:text-white"><ChevronLeft className="size-4" /></button>
          <Button onClick={() => setOffset(0)} disabled={offset === 0}>Reset</Button>
          <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Next month" className="grid size-9 place-items-center rounded-lg bg-white/[0.03] text-mist-300 ring-1 ring-white/10 hover:bg-white/[0.07] hover:text-white"><ChevronRight className="size-4" /></button>
        </div>
        <label className="sr-only" htmlFor="tl-client">Filter by client</label>
        <Select id="tl-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-auto min-w-[160px] sm:ml-auto">
          <option value="all">All clients</option>
          {clientsWithProjects.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState icon={<CalendarDays className="size-5" />} title="Nothing scheduled" body="No projects for this client yet." action={<Button size="sm" onClick={() => setClientId('all')}>Show all clients</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <div className="relative" style={{ width: LABEL_W + width, minWidth: '100%' }}>
              {/* header */}
              <div className="sticky top-0 z-20 flex border-b border-white/[0.06] bg-ink-900">
                <div className="sticky left-0 z-30 shrink-0 border-r border-white/[0.06] bg-ink-900 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-mist-400" style={{ width: LABEL_W }}>Project</div>
                <div className="relative h-11" style={{ width }}>
                  {monthCols.map((m) => (
                    <div key={m.start} className="absolute inset-y-0 border-l border-white/[0.06] px-3 py-3 text-[12px] font-semibold text-mist-200" style={{ left: m.left, width: m.width }}>
                      <span className="truncate">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* body */}
              <div className="relative">
                {/* gridlines */}
                <div className="pointer-events-none absolute inset-y-0 z-0" style={{ left: LABEL_W, width }} aria-hidden>
                  {weeks.map((w) => <div key={w} className="absolute inset-y-0 w-px bg-white/[0.03]" style={{ left: x(w) }} />)}
                  {monthCols.map((m) => <div key={m.start} className="absolute inset-y-0 w-px bg-white/[0.07]" style={{ left: m.left }} />)}
                  {todayIn && (
                    <div className="absolute inset-y-0 z-10 w-px bg-ember" style={{ left: x(now) }}>
                      <span className="absolute -left-[21px] top-1 rounded-md bg-ember px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">Today</span>
                    </div>
                  )}
                </div>

                {inWindow.length === 0 && (
                  <div className="flex">
                    <div className="sticky left-0 shrink-0 bg-ink-900" style={{ width: LABEL_W }} />
                    <p className="py-12 text-center text-[13px] text-mist-400" style={{ width }}>No projects in this window. Use the arrows to look further ahead or back.</p>
                  </div>
                )}

                {inWindow.map((p) => {
                  const c = s.clients.find((cl) => cl.id === p.clientId);
                  const left = x(p.start);
                  const right = x(p.due);
                  const w = Math.max(right - left, 10);
                  const clippedL = p.start < winStart;
                  const clippedR = p.due > winEnd;
                  const prog = p.tasks.length ? p.tasks.filter((t) => t.done).length / p.tasks.length : p.status === 'done' ? 1 : 0;
                  const go = () => { window.location.href = `/app/projects/view?id=${p.id}`; };
                  return (
                    <div key={p.id} className="group relative flex border-b border-white/[0.04] last:border-0 hover:bg-white/[0.015]">
                      <a href={`/app/projects/view?id=${p.id}`} className="sticky left-0 z-20 flex shrink-0 items-center gap-3 border-r border-white/[0.06] bg-ink-900 px-5 py-3 group-hover:bg-[#111014]" style={{ width: LABEL_W }}>
                        {c && <ClientLogo client={c} size={28} />}
                        <span className="min-w-0"><span className="block truncate text-[13px] font-semibold hover:underline">{p.name}</span><span className="block truncate text-[11px] text-mist-400">{c?.name}</span></span>
                      </a>
                      <div className="relative h-[60px]" style={{ width }}>
                        <button
                          type="button"
                          onClick={go}
                          title={`${p.name} · ${dateLong(p.start)} to ${dateLong(p.due)} · ${projectStatusMeta[p.status].label}`}
                          aria-label={`Open ${p.name}, ${date(p.start)} to ${date(p.due)}, ${projectStatusMeta[p.status].label}`}
                          className={cx('absolute top-1/2 z-[5] flex h-8 -translate-y-1/2 items-center overflow-hidden px-2.5 text-left text-[11px] font-semibold ring-1 transition hover:brightness-125', barTone[p.status], clippedL ? 'rounded-l-sm' : 'rounded-l-lg', clippedR ? 'rounded-r-sm' : 'rounded-r-lg')}
                          style={{ left, width: w }}
                        >
                          <span className={cx('absolute inset-y-0 left-0', barFill[p.status])} style={{ width: `${prog * 100}%` }} aria-hidden />
                          <span className="relative truncate">{w > 90 ? p.name : ''}</span>
                        </button>
                        {p.milestones.filter((m) => m.due >= winStart && m.due < winEnd).map((m) => (
                          <span
                            key={m.id}
                            title={`${m.title} · ${dateLong(m.due)} · ${money(m.amount)}${m.status === 'done' ? ' · done' : ''}`}
                            className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: x(m.due) }}
                          >
                            <span className={cx('block size-3 rotate-45 rounded-[2px] ring-2 ring-ink-900', m.status === 'done' ? 'bg-emerald-300' : m.status === 'current' ? 'bg-amber' : 'bg-cream')} />
                            <span className="sr-only">{m.title}, {date(m.due)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] px-5 py-3 text-[11px] text-mist-400">
          {(Object.keys(projectStatusMeta) as ProjectStatus[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className={cx('h-2.5 w-5 rounded-sm ring-1', barTone[k])} />{projectStatusMeta[k].label}</span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rotate-45 rounded-[2px] bg-amber" />Current milestone</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rotate-45 rounded-[2px] bg-emerald-300" />Done</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-px bg-ember" />Today</span>
        </div>
      </Card>

      <Card>
        <CardHeader title="Milestones this month" subtitle={`${date(now, { month: 'long', year: 'numeric' })} · ${money(milestonesThisMonth.reduce((a, m) => a + m.amount, 0))} scheduled`} />
        {milestonesThisMonth.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-mist-400">No milestones fall in this month.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05] px-5 pb-2 pt-2">
            {milestonesThisMonth.map((m) => {
              const c = s.clients.find((cl) => cl.id === m.project.clientId);
              const d = daysBetween(now, m.due);
              return (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <span className={cx('grid w-11 shrink-0 place-items-center rounded-lg py-1 text-center ring-1', m.status !== 'done' && d >= 0 && d <= 3 ? 'bg-ember/10 text-orange-300 ring-ember/20' : 'bg-white/[0.03] ring-white/[0.07]')}>
                    <span className="text-[10px] uppercase">{date(m.due, { month: 'short' })}</span><span className="text-[15px] font-semibold leading-none">{date(m.due, { day: 'numeric' })}</span>
                  </span>
                  <a href={`/app/projects/view?id=${m.project.id}`} className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><Diamond className={cx('size-3', m.status === 'done' ? 'text-emerald-300' : m.status === 'current' ? 'text-amber' : 'text-mist-300')} /><span className="truncate text-[13px] font-medium hover:underline">{m.title}</span></span>
                    <span className="text-[12px] text-mist-400">{m.project.name} · {c?.name}</span>
                  </a>
                  <span className="hidden sm:block"><ProjectStatusBadge status={m.project.status} /></span>
                  <span className="w-20 text-right text-[13px] font-semibold tabular-nums">{money(m.amount)}</span>
                  <span className={cx('hidden w-20 text-right text-[11px] md:block', m.status === 'done' ? 'text-emerald-300' : d < 0 ? 'text-orange-300' : 'text-mist-400')}>
                    {m.status === 'done' ? 'Completed' : d === 0 ? 'Due today' : d > 0 ? `In ${d} days` : `${-d} days late`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
