import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, DollarSign, Play, Plus, Square, Trash2, Trophy, Timer as TimerIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { addDays, cx, date, hours, money, today } from '../lib/format';
import { Avatar, Badge, Button, Card, CardHeader, ClientLogo, EmptyState, Field, Input, Modal, PageHeader, Progress, Select, Stat, Toggle } from '../ui/ui';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`).getDay(); // 0 = Sun
  return addDays(iso, d === 0 ? -6 : 1 - d);
};
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
};
const fmtH = (m: number) => (m ? (m / 60).toFixed(m % 60 === 0 ? 0 : 1) : '');

export default function Time() {
  const s = useStore();
  const now = today();
  const cur = s.workspace.currency;
  const activeProjects = s.projects.filter((p) => p.status !== 'done');

  /* ---------- timer ---------- */
  const [timerProject, setTimerProject] = useState(s.timer?.projectId ?? activeProjects[0]?.id ?? '');
  const [timerNote, setTimerNote] = useState(s.timer?.note ?? '');
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    if (!s.timer) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [s.timer]);
  const running = !!s.timer;
  const runningProject = s.projects.find((p) => p.id === s.timer?.projectId);

  /* ---------- week ---------- */
  const [weekStart, setWeekStart] = useState(mondayOf(now));
  const days = DAY_NAMES.map((_, i) => addDays(weekStart, i));
  const weekEnd = days[6];
  const isThisWeek = weekStart === mondayOf(now);
  const weekEntries = useMemo(() => s.timeEntries.filter((e) => e.date >= weekStart && e.date <= weekEnd), [s.timeEntries, weekStart, weekEnd]);

  const [extraRows, setExtraRows] = useState<string[]>([]);
  const rowIds = useMemo(() => {
    const ids = Array.from(new Set(weekEntries.map((e) => e.projectId)));
    extraRows.forEach((id) => { if (!ids.includes(id)) ids.push(id); });
    return ids;
  }, [weekEntries, extraRows]);
  const cellMinutes = (pid: string, d: string) => weekEntries.filter((e) => e.projectId === pid && e.date === d).reduce((a, e) => a + e.minutes, 0);
  const dayTotal = (d: string) => weekEntries.filter((e) => e.date === d).reduce((a, e) => a + e.minutes, 0);
  const weekTotal = weekEntries.reduce((a, e) => a + e.minutes, 0);
  const billableMin = weekEntries.filter((e) => e.billable).reduce((a, e) => a + e.minutes, 0);
  const billablePct = weekTotal ? Math.round((billableMin / weekTotal) * 100) : 0;
  const rateOf = (memberId: string) => s.members.find((m) => m.id === memberId)?.rate ?? 0;
  const billableAmount = weekEntries.filter((e) => e.billable).reduce((a, e) => a + (e.minutes / 60) * rateOf(e.memberId), 0);
  const byProject = rowIds.map((id) => ({ id, minutes: weekEntries.filter((e) => e.projectId === id).reduce((a, e) => a + e.minutes, 0) })).sort((a, b) => b.minutes - a.minutes);
  const top = byProject[0]?.minutes ? s.projects.find((p) => p.id === byProject[0].id) : undefined;

  /* ---------- cell modal ---------- */
  const [cell, setCell] = useState<{ projectId: string; date: string } | null>(null);
  const [cellMins, setCellMins] = useState(60);
  const [cellNote, setCellNote] = useState('');
  const openCell = (projectId: string, d: string) => { setCell({ projectId, date: d }); setCellMins(60); setCellNote(''); };
  const saveCell = () => {
    if (!cell || cellMins <= 0) return;
    s.addTimeEntry({ memberId: s.meId, projectId: cell.projectId, date: cell.date, minutes: Math.round(cellMins), note: cellNote.trim() || 'Studio work', billable: true });
    setCell(null);
  };

  /* ---------- add entry modal ---------- */
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ memberId: s.meId, projectId: activeProjects[0]?.id ?? '', date: now, h: 1, m: 0, note: '', billable: true });
  const [formTried, setFormTried] = useState(false);
  const formMinutes = (Number(form.h) || 0) * 60 + (Number(form.m) || 0);
  const openAdd = () => { setForm({ memberId: s.meId, projectId: activeProjects[0]?.id ?? '', date: isThisWeek ? now : weekStart, h: 1, m: 0, note: '', billable: true }); setFormTried(false); setAddOpen(true); };
  const saveAdd = () => {
    setFormTried(true);
    if (!form.projectId || formMinutes <= 0) return;
    s.addTimeEntry({ memberId: form.memberId, projectId: form.projectId, date: form.date, minutes: formMinutes, note: form.note.trim() || 'Studio work', billable: form.billable });
    setAddOpen(false);
    if (form.date < weekStart || form.date > weekEnd) setWeekStart(mondayOf(form.date));
  };

  /* ---------- delete confirm ---------- */
  const [toDelete, setToDelete] = useState<string | null>(null);
  const delEntry = s.timeEntries.find((e) => e.id === toDelete);

  const grouped = days.slice().reverse().map((d) => ({ d, list: weekEntries.filter((e) => e.date === d) })).filter((g) => g.list.length);
  const unusedProjects = activeProjects.filter((p) => !rowIds.includes(p.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time"
        subtitle={`Week of ${date(weekStart, { month: 'long', day: 'numeric' })} · ${hours(weekTotal)} logged by the team`}
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={openAdd}>Add entry</Button>}
      />

      {/* Timer */}
      <Card className={cx('overflow-hidden', running && 'ring-amber/30')}>
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
          <div className="grid flex-1 gap-3 sm:grid-cols-[220px_1fr]">
            <Field label="Project">
              <Select value={running ? s.timer!.projectId : timerProject} onChange={(e) => setTimerProject(e.target.value)} disabled={running}>
                {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.name} · {s.clients.find((c) => c.id === p.clientId)?.name}</option>)}
              </Select>
            </Field>
            <Field label="What are you working on?">
              <Input value={running ? s.timer!.note : timerNote} onChange={(e) => setTimerNote(e.target.value)} disabled={running} placeholder="e.g. Packaging revisions for round 3"
                onKeyDown={(e) => { if (e.key === 'Enter' && !running && timerProject) s.startTimer(timerProject, timerNote); }} />
            </Field>
          </div>
          <div className="flex items-center gap-4 lg:pl-4">
            <div className="text-right" aria-live="polite">
              <p className={cx('font-mono text-[30px] font-semibold leading-none tracking-tight tabular-nums', running ? 'text-white' : 'text-mist-400/60')}>{running ? clock(tick - s.timer!.startedAt) : '00:00:00'}</p>
              <p className="mt-1 text-[11px] text-mist-400">{running ? <span className="inline-flex items-center gap-1.5"><span className="size-1.5 animate-pulse rounded-full bg-red-400" />Tracking {runningProject?.name}</span> : 'Timer stopped'}</p>
            </div>
            {running ? (
              <button onClick={() => { s.stopTimer(); setTimerNote(''); }} className="grid size-14 shrink-0 place-items-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20 transition hover:bg-red-400" aria-label="Stop timer"><Square className="size-5" fill="currentColor" /></button>
            ) : (
              <button onClick={() => timerProject && s.startTimer(timerProject, timerNote)} disabled={!timerProject} className="grid size-14 shrink-0 place-items-center rounded-full bg-amber text-ink-950 shadow-lg shadow-amber/20 transition hover:bg-amber-soft disabled:opacity-50" aria-label="Start timer"><Play className="ml-0.5 size-5" fill="currentColor" /></button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          {/* Timesheet */}
          <Card>
            <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-[14px] font-semibold">Timesheet</h2><p className="mt-0.5 text-[12px] text-mist-400">{date(weekStart)} to {date(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })} · click a cell to log time</p></div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="grid size-8 place-items-center rounded-lg text-mist-300 ring-1 ring-white/10 hover:bg-white/5 hover:text-white" aria-label="Previous week"><ChevronLeft className="size-4" /></button>
                <Button size="sm" variant={isThisWeek ? 'ghost' : 'outline'} onClick={() => setWeekStart(mondayOf(now))} disabled={isThisWeek}>This week</Button>
                <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="grid size-8 place-items-center rounded-lg text-mist-300 ring-1 ring-white/10 hover:bg-white/5 hover:text-white" aria-label="Next week"><ChevronRight className="size-4" /></button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead className="text-[11px] uppercase tracking-wider text-mist-400">
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-5 py-2.5 text-left font-medium">Project</th>
                    {days.map((d, i) => (
                      <th key={d} className={cx('w-[68px] px-1 py-2.5 text-center font-medium', d === now && 'text-amber')}>
                        <span className="block">{DAY_NAMES[i]}</span><span className="text-[10px] normal-case tracking-normal text-mist-400">{date(d, { day: 'numeric' })}</span>
                      </th>
                    ))}
                    <th className="w-20 px-5 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rowIds.length === 0 && (
                    <tr><td colSpan={9} className="px-5 py-10 text-center text-[13px] text-mist-400">No time logged this week yet. Add a row below or start the timer.</td></tr>
                  )}
                  {rowIds.map((pid) => {
                    const p = s.projects.find((x) => x.id === pid);
                    const c = s.clients.find((x) => x.id === p?.clientId);
                    const rowTotal = days.reduce((a, d) => a + cellMinutes(pid, d), 0);
                    return (
                      <tr key={pid} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-5 py-2">
                          <span className="flex items-center gap-2.5">{c && <ClientLogo client={c} size={24} />}<span className="min-w-0"><span className="block truncate font-medium">{p?.name ?? 'Removed project'}</span><span className="text-[11px] text-mist-400">{c?.name}</span></span></span>
                        </td>
                        {days.map((d) => {
                          const m = cellMinutes(pid, d);
                          return (
                            <td key={d} className="px-1 py-2 text-center">
                              <button onClick={() => openCell(pid, d)} aria-label={`Log time on ${p?.name} for ${date(d, { weekday: 'long', month: 'short', day: 'numeric' })}${m ? `, ${hours(m)} logged` : ''}`}
                                className={cx('h-9 w-full rounded-lg text-[13px] tabular-nums transition', m ? 'bg-amber/10 font-semibold text-amber-soft ring-1 ring-amber/20 hover:bg-amber/20' : 'text-mist-400/50 ring-1 ring-white/[0.05] hover:bg-white/[0.04] hover:text-mist-200', d === now && !m && 'ring-amber/20')}>
                                {m ? fmtH(m) : '+'}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-5 py-2 text-right font-semibold tabular-nums">{hours(rowTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/[0.08] bg-white/[0.015] text-[12px]">
                    <td className="px-5 py-3">
                      {unusedProjects.length > 0 ? (
                        <Select value="" onChange={(e) => e.target.value && setExtraRows((r) => [...r, e.target.value])} aria-label="Add a project row" className="h-8 max-w-[200px] text-[12px]">
                          <option value="">+ Add row</option>
                          {unusedProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                      ) : <span className="text-mist-400">All active projects shown</span>}
                    </td>
                    {days.map((d) => <td key={d} className="px-1 py-3 text-center font-medium tabular-nums text-mist-300">{dayTotal(d) ? fmtH(dayTotal(d)) : '0'}</td>)}
                    <td className="px-5 py-3 text-right text-[14px] font-semibold tabular-nums">{hours(weekTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.06] px-5 py-3 text-[12px] text-mist-400">
              <span>Hours shown in decimals</span>
              <span className="flex items-center gap-2">Billable <span className="font-semibold text-white tabular-nums">{billablePct}%</span><Progress value={billablePct} tone="green" className="w-24" /></span>
            </div>
          </Card>

          {/* Entries */}
          <Card>
            <CardHeader title="Entries" subtitle={`${weekEntries.length} entries this week`} action={<Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={openAdd}>Add entry</Button>} />
            {grouped.length === 0 ? (
              <EmptyState icon={<Clock className="size-5" />} title="Nothing logged this week" body="Start the timer, click a timesheet cell, or add an entry manually." action={<Button size="sm" variant="primary" onClick={openAdd}>Add entry</Button>} />
            ) : (
              <div className="space-y-5 p-5 pt-4">
                {grouped.map((g) => (
                  <section key={g.d} aria-label={date(g.d, { weekday: 'long', month: 'long', day: 'numeric' })}>
                    <div className="mb-2 flex items-center justify-between text-[12px]">
                      <h3 className="font-semibold text-mist-200">{g.d === now ? 'Today' : g.d === addDays(now, -1) ? 'Yesterday' : date(g.d, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                      <span className="tabular-nums text-mist-400">{hours(g.list.reduce((a, e) => a + e.minutes, 0))}</span>
                    </div>
                    <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-xl bg-ink-850 ring-1 ring-white/[0.05]">
                      {g.list.map((e) => {
                        const m = s.members.find((x) => x.id === e.memberId);
                        const p = s.projects.find((x) => x.id === e.projectId);
                        return (
                          <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                            {m && <Avatar name={m.name} photo={m.photo} size={28} />}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium">{e.note}</p>
                              <p className="truncate text-[12px] text-mist-400">{m?.name.split(' ')[0]} · {p ? <a href={`/app/projects/view?id=${p.id}`} className="hover:text-white hover:underline">{p.name}</a> : 'Removed project'}</p>
                            </div>
                            {e.billable ? <Badge tone="green" className="hidden sm:inline-flex">Billable</Badge> : <Badge className="hidden sm:inline-flex">Non billable</Badge>}
                            <span className="w-14 text-right text-[13px] font-semibold tabular-nums">{hours(e.minutes)}</span>
                            <button onClick={() => setToDelete(e.id)} className="grid size-8 place-items-center rounded-lg text-mist-400 hover:bg-red-500/10 hover:text-red-300" aria-label={`Delete entry ${e.note}`}><Trash2 className="size-4" /></button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Side stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1 xl:self-start">
          <Stat label={isThisWeek ? 'This week' : 'Selected week'} value={hours(weekTotal)} delta={`${billablePct}% billable`} tone={billablePct >= 75 ? 'up' : 'neutral'} icon={<TimerIcon className="size-4" />} />
          <Stat label="Billable amount" value={money(Math.round(billableAmount), cur)} delta={`${hours(billableMin)} at member rates`} tone="up" icon={<DollarSign className="size-4" />} />
          <Card className="p-5">
            <div className="flex items-center justify-between text-[12px] text-mist-400"><span>Top project</span><Trophy className="size-4" /></div>
            {top ? (<>
              <p className="mt-2 truncate text-[17px] font-semibold tracking-tight">{top.name}</p>
              <p className="mt-0.5 text-[12px] text-mist-400">{hours(byProject[0].minutes)} · {Math.round((byProject[0].minutes / (weekTotal || 1)) * 100)}% of the week</p>
              <ul className="mt-4 space-y-2.5">
                {byProject.slice(0, 4).map((b) => {
                  const p = s.projects.find((x) => x.id === b.id);
                  return (
                    <li key={b.id} className="text-[12px]">
                      <div className="mb-1 flex justify-between"><span className="truncate text-mist-300">{p?.name}</span><span className="tabular-nums text-mist-400">{hours(b.minutes)}</span></div>
                      <Progress value={(b.minutes / (byProject[0].minutes || 1)) * 100} />
                    </li>
                  );
                })}
              </ul>
            </>) : <p className="mt-2 text-[13px] text-mist-400">No time logged yet</p>}
          </Card>
        </div>
      </div>

      {/* Cell modal */}
      <Modal open={!!cell} onClose={() => setCell(null)} title="Log time"
        subtitle={cell ? `${s.projects.find((p) => p.id === cell.projectId)?.name} · ${date(cell.date, { weekday: 'long', month: 'short', day: 'numeric' })}` : ''}
        footer={<><Button variant="ghost" onClick={() => setCell(null)}>Cancel</Button><Button variant="primary" onClick={saveCell} disabled={cellMins <= 0}>Add {hours(Math.max(0, Math.round(cellMins)))}</Button></>}>
        <div className="space-y-4">
          <Field label="Minutes">
            <Input type="number" min={5} step={15} value={cellMins} onChange={(e) => setCellMins(parseInt(e.target.value, 10) || 0)} onKeyDown={(e) => e.key === 'Enter' && saveCell()} className="tabular-nums" />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {[15, 30, 60, 90, 120, 240].map((m) => (
              <button key={m} onClick={() => setCellMins(m)} className={cx('rounded-md px-2.5 py-1 text-[12px] font-medium ring-1 transition', cellMins === m ? 'bg-amber/15 text-amber-soft ring-amber/30' : 'text-mist-300 ring-white/10 hover:bg-white/5')}>{hours(m)}</button>
            ))}
          </div>
          <Field label="Note"><Input value={cellNote} onChange={(e) => setCellNote(e.target.value)} placeholder="What did you work on?" /></Field>
          {cell && cellMinutes(cell.projectId, cell.date) > 0 && <p className="text-[12px] text-mist-400">Already logged that day: {hours(cellMinutes(cell.projectId, cell.date))}. This adds to it.</p>}
        </div>
      </Modal>

      {/* Add entry modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add time entry" subtitle="Log time manually for anyone on the team"
        footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveAdd}>Save entry</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Team member">
            <Select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              {s.members.map((m) => <option key={m.id} value={m.id}>{m.name} ({money(m.rate, cur)}/h)</option>)}
            </Select>
          </Field>
          <Field label="Project">
            <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              {s.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Hours"><Input type="number" min={0} max={16} value={form.h} onChange={(e) => setForm({ ...form, h: parseInt(e.target.value, 10) || 0 })} className="tabular-nums" /></Field>
            <Field label="Minutes"><Input type="number" min={0} max={59} step={5} value={form.m} onChange={(e) => setForm({ ...form, m: Math.min(59, parseInt(e.target.value, 10) || 0) })} className="tabular-nums" /></Field>
          </div>
          <Field label="Note" className="sm:col-span-2"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Client call about round 2 feedback" /></Field>
          <div className="flex items-center justify-between rounded-xl bg-ink-850 px-3 py-2.5 ring-1 ring-white/[0.05] sm:col-span-2">
            <div className="text-[13px]"><p className="font-medium">Billable</p><p className="text-[12px] text-mist-400">{form.billable ? `Worth ${money(Math.round((formMinutes / 60) * rateOf(form.memberId)), cur)} at this rate` : 'Will not appear on invoices'}</p></div>
            <Toggle checked={form.billable} onChange={(v) => setForm({ ...form, billable: v })} label="Billable" />
          </div>
          {formTried && formMinutes <= 0 && <p className="text-[12px] text-red-300 sm:col-span-2" role="alert">Enter a duration greater than zero.</p>}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!delEntry} onClose={() => setToDelete(null)} title="Delete this entry?" subtitle={delEntry ? `${hours(delEntry.minutes)} on ${s.projects.find((p) => p.id === delEntry.projectId)?.name ?? 'a project'}, ${date(delEntry.date)}` : ''}
        footer={<><Button variant="ghost" onClick={() => setToDelete(null)}>Keep it</Button><Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => { if (delEntry) { s.deleteTimeEntry(delEntry.id); s.toast('Time entry deleted', 'info'); } setToDelete(null); }}>Delete entry</Button></>}>
        <p className="text-[13px] text-mist-300">This removes the entry from timesheets and reports. Invoices already sent are not affected.</p>
      </Modal>
    </div>
  );
}
