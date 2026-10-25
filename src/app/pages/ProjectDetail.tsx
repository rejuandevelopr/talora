import { useRef, useState } from 'react';
import {
  ArrowUpRight, CalendarDays, Check, CheckCircle2, Clock, File, FileArchive, FileImage, FileText, FolderKanban, Gauge, MessageSquare,
  Plus, Receipt, Send, Square, Stamp, Timer, Upload, Wallet, PenTool,
} from 'lucide-react';
import { useStore, projectBilled, projectProgress, uid } from '../lib/store';
import { cx, date, dateLong, daysBetween, getParam, hours, money, relative, today } from '../lib/format';
import type { Health, ProjectFile, ProjectStatus } from '../lib/types';
import {
  Avatar, Button, Card, CardHeader, Checkbox, ClientLogo, EmptyState, Field, Input, Modal, PageHeader, Progress, Select, Tabs, Textarea,
  healthMeta, projectStatusMeta,
} from '../ui/ui';

type TabKey = 'overview' | 'tasks' | 'files' | 'discussion';
const TAGS = ['Design', 'Build', 'Copy', 'Client', 'Shoot', 'Research', 'General'];
const healthRing: Record<Health, string> = { on_track: 'text-emerald-300', at_risk: 'text-amber-soft', off_track: 'text-red-300' };

export default function ProjectDetail() {
  const [id] = useState(() => getParam('id') ?? '');
  const s = useStore();
  const p = s.projects.find((x) => x.id === id);
  const [tab, setTab] = useState<TabKey>('overview');
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [sentApproval, setSentApproval] = useState<string | null>(null);

  if (!p) {
    return (
      <Card>
        <EmptyState icon={<FolderKanban className="size-5" />} title="Project not found" body="It may have been removed, or the link is incomplete."
          action={<Button href="/app/projects" variant="primary">Back to projects</Button>} />
      </Card>
    );
  }

  const client = s.clients.find((c) => c.id === p.clientId);
  const now = today();
  const me = s.members.find((m) => m.id === s.meId)!;
  const prog = projectProgress(p);
  const billed = projectBilled(p, s.invoices);
  const billedPct = p.budget ? Math.round((billed / p.budget) * 100) : 0;
  const left = daysBetween(now, p.due);
  const totalDays = Math.max(1, daysBetween(p.start, p.due));
  const elapsedPct = Math.min(100, Math.max(0, Math.round((daysBetween(p.start, now) / totalDays) * 100)));
  const entries = s.timeEntries.filter((e) => e.projectId === p.id);
  const minutes = entries.reduce((a, e) => a + e.minutes, 0);
  const billableMin = entries.filter((e) => e.billable).reduce((a, e) => a + e.minutes, 0);
  const open = p.tasks.filter((t) => !t.done);
  const done = p.tasks.filter((t) => t.done);
  const timing = s.timer?.projectId === p.id;
  const nextMilestone = p.milestones.find((m) => m.status === 'current') ?? p.milestones.find((m) => m.status === 'upcoming');

  const logTime = () => {
    if (timing) { s.stopTimer(); return; }
    if (s.timer) {
      const other = s.projects.find((x) => x.id === s.timer!.projectId);
      s.stopTimer();
      s.toast(`Stopped timer on ${other?.name ?? 'another project'}`, 'info');
    }
    s.startTimer(p.id, nextMilestone ? nextMilestone.title : 'Project work');
    s.toast(`Timer started on ${p.name}`);
  };

  const changeStatus = (status: ProjectStatus) => { s.moveProject(p.id, status); s.toast(`Moved to ${projectStatusMeta[status].label}`); };
  const changeHealth = (health: Health) => {
    s.updateProject(p.id, { health });
    s.log({ actor: me.name, photo: me.photo, text: `marked ${p.name} as ${healthMeta[health].label.toLowerCase()}`, kind: 'project' });
    s.toast(`Health set to ${healthMeta[health].label}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/app/projects', label: 'Projects' }}
        title={p.name}
        subtitle={
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {client && <a href={`/app/clients/view?id=${client.id}`} className="inline-flex items-center gap-2 text-mist-300 hover:text-white"><ClientLogo client={client} size={20} />{client.name}</a>}
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{date(p.start)} to {dateLong(p.due)}</span>
          </span>
        }
        actions={<>
          <Button icon={timing ? <Square className="size-3.5 fill-current" /> : <Timer className="size-4" />} onClick={logTime} className={cx(timing && 'ring-amber/50 text-amber-soft')}>{timing ? 'Stop timer' : 'Log time'}</Button>
          <Button icon={<Stamp className="size-4" />} onClick={() => setApprovalOpen(true)}>Request approval</Button>
          <Button variant="primary" href={`/app/invoices/new?client=${p.clientId}&project=${p.id}`} icon={<Receipt className="size-4" />}>Invoice milestone</Button>
        </>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[12px] text-mist-400">
          <span>Status</span>
          <Select value={p.status} onChange={(e) => changeStatus(e.target.value as ProjectStatus)} className="h-8 w-[140px] text-[12px]">
            {(Object.keys(projectStatusMeta) as ProjectStatus[]).map((k) => <option key={k} value={k}>{projectStatusMeta[k].label}</option>)}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-[12px] text-mist-400">
          <span>Health</span>
          <Select value={p.health} onChange={(e) => changeHealth(e.target.value as Health)} className={cx('h-8 w-[130px] text-[12px] font-semibold', healthRing[p.health])}>
            {(Object.keys(healthMeta) as Health[]).map((k) => <option key={k} value={k}>{healthMeta[k].label}</option>)}
          </Select>
        </label>
        {timing && <span className="inline-flex items-center gap-1.5 rounded-md bg-amber/15 px-2 py-1 text-[11px] font-semibold text-amber-soft"><span className="size-1.5 animate-pulse rounded-full bg-amber" />Timer running</span>}
      </div>

      {sentApproval && (
        <div role="status" className="flex flex-col gap-2 rounded-xl bg-emerald-500/[0.07] px-4 py-3 text-[13px] ring-1 ring-emerald-400/20 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-emerald-200"><CheckCircle2 className="size-4" />Sent to {client?.name ?? 'the client'} for approval. They will see it in their portal.</span>
          <span className="flex gap-2"><Button size="sm" href={`/app/approvals?id=${sentApproval}`}>View approval <ArrowUpRight className="size-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => setSentApproval(null)}>Dismiss</Button></span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between text-[12px] text-mist-400"><span>Progress</span><Gauge className="size-4" /></div>
          <p className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">{prog}%</p>
          <Progress value={prog} className="mt-2" tone={prog === 100 ? 'green' : 'amber'} />
          <p className="mt-2 text-[12px] text-mist-400">{done.length} of {p.tasks.length} tasks done</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-[12px] text-mist-400"><span>Billed vs budget</span><Wallet className="size-4" /></div>
          <p className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">{money(billed, 'USD', billed >= 10000)}</p>
          <Progress value={billedPct} className="mt-2" tone={billedPct > 100 ? 'red' : 'green'} />
          <p className="mt-2 text-[12px] text-mist-400">{billedPct}% of {money(p.budget)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-[12px] text-mist-400"><span>{p.status === 'done' ? 'Delivered' : left >= 0 ? 'Days left' : 'Days late'}</span><CalendarDays className="size-4" /></div>
          <p className={cx('mt-2 text-[26px] font-semibold tracking-tight tabular-nums', p.status !== 'done' && left < 7 && 'text-orange-300')}>{p.status === 'done' ? date(p.due) : Math.abs(left)}</p>
          <Progress value={elapsedPct} className="mt-2" tone={left < 0 && p.status !== 'done' ? 'red' : 'amber'} />
          <p className="mt-2 text-[12px] text-mist-400">{elapsedPct}% of timeline elapsed</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-[12px] text-mist-400"><span>Hours logged</span><Clock className="size-4" /></div>
          <p className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">{hours(minutes)}</p>
          <Progress value={minutes ? (billableMin / minutes) * 100 : 0} className="mt-2" tone="green" />
          <p className="mt-2 text-[12px] text-mist-400">{minutes ? Math.round((billableMin / minutes) * 100) : 0}% billable</p>
        </Card>
      </div>

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'tasks', label: 'Tasks', count: open.length },
          { value: 'files', label: 'Files', count: p.files.length },
          { value: 'discussion', label: 'Discussion', count: p.comments.length },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="text-[14px] font-semibold">About this project</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-mist-200">{p.description}</p>
            </Card>
            <Card>
              <CardHeader title="Milestones" subtitle={`${p.milestones.filter((m) => m.status === 'done').length} of ${p.milestones.length} complete · ${money(p.milestones.reduce((a, m) => a + m.amount, 0))} scheduled`} />
              {p.milestones.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-mist-400">No milestones yet. Add them when the scope is confirmed.</p>
              ) : (
                <ol className="relative px-5 pb-5 pt-4">
                  {p.milestones.map((m, i) => {
                    const last = i === p.milestones.length - 1;
                    return (
                      <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
                        {!last && <span className={cx('absolute left-[11px] top-7 h-[calc(100%-20px)] w-px', m.status === 'done' ? 'bg-emerald-400/40' : 'bg-white/[0.08]')} aria-hidden />}
                        <span className={cx('relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ring-1',
                          m.status === 'done' ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-400/40' : m.status === 'current' ? 'bg-amber text-ink-950 ring-amber shadow-[0_0_0_4px_rgba(244,166,74,0.15)]' : 'bg-ink-850 text-mist-400 ring-white/15')}>
                          {m.status === 'done' ? <Check className="size-3.5" strokeWidth={3} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                        </span>
                        <div className={cx('flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1 rounded-xl p-3 ring-1', m.status === 'current' ? 'bg-amber/[0.05] ring-amber/25' : 'bg-ink-850 ring-white/[0.05]')}>
                          <div className="min-w-0">
                            <p className={cx('text-[13px] font-semibold', m.status === 'upcoming' && 'text-mist-200')}>{m.title}</p>
                            <p className="text-[12px] text-mist-400">{m.status === 'done' ? 'Completed' : m.status === 'current' ? 'In progress' : 'Upcoming'} · due {dateLong(m.due)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13px] font-semibold tabular-nums">{money(m.amount)}</p>
                            {m.status !== 'upcoming' && <a href={`/app/invoices/new?client=${p.clientId}&project=${p.id}`} className="text-[11px] text-amber-soft hover:underline">Invoice</a>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader title="Team" subtitle={`${p.memberIds.length} people`} />
              <ul className="space-y-3 p-5 pt-4">
                {p.memberIds.map((mid) => {
                  const m = s.members.find((x) => x.id === mid);
                  if (!m) return null;
                  const mm = entries.filter((e) => e.memberId === mid).reduce((a, e) => a + e.minutes, 0);
                  const tasksOpen = open.filter((t) => t.assigneeId === mid).length;
                  return (
                    <li key={mid} className="flex items-center gap-3">
                      <Avatar name={m.name} photo={m.photo} size={32} />
                      <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-[13px] font-medium">{m.name}{mid === p.leadId && <span className="rounded-md bg-amber/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-soft">Lead</span>}</span><span className="block truncate text-[11px] text-mist-400">{m.title}</span></span>
                      <span className="text-right text-[12px]"><span className="block font-semibold tabular-nums">{hours(mm)}</span><span className="text-[11px] text-mist-400">{tasksOpen} open</span></span>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Open tasks" subtitle="Next up" action={<Button size="sm" variant="ghost" onClick={() => setTab('tasks')}>All <ArrowUpRight className="size-3.5" /></Button>} />
              <ul className="divide-y divide-white/[0.05] px-5 pb-2 pt-2">
                {open.length === 0 && <li className="py-6 text-center text-[13px] text-mist-400">All tasks are done.</li>}
                {[...open].sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4).map((t) => {
                  const m = s.members.find((x) => x.id === t.assigneeId);
                  const d = daysBetween(now, t.due);
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <Checkbox checked={false} onChange={() => s.toggleTask(p.id, t.id)} label={`Mark ${t.title} as done`} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13px]">{t.title}</span><span className={cx('text-[11px]', d < 0 ? 'text-orange-300' : 'text-mist-400')}>{date(t.due)} · {t.tag}</span></span>
                      {m && <Avatar name={m.name} photo={m.photo} size={24} />}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === 'tasks' && <TasksTab projectId={p.id} />}
      {tab === 'files' && <FilesTab projectId={p.id} />}
      {tab === 'discussion' && <DiscussionTab projectId={p.id} />}

      <ApprovalModal open={approvalOpen} onClose={() => setApprovalOpen(false)} projectId={p.id} onSent={(aid) => { setSentApproval(aid); setApprovalOpen(false); }} />
    </div>
  );
}

function TasksTab({ projectId }: { projectId: string }) {
  const s = useStore();
  const p = s.projects.find((x) => x.id === projectId)!;
  const now = today();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(p.leadId);
  const [due, setDue] = useState(() => { const d = new Date(`${now}T12:00:00`); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); });
  const [tag, setTag] = useState('Design');
  const open = [...p.tasks.filter((t) => !t.done)].sort((a, b) => a.due.localeCompare(b.due));
  const done = p.tasks.filter((t) => t.done);
  const team = s.members.filter((m) => p.memberIds.includes(m.id) || m.id === s.meId);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    s.addTask(p.id, title.trim(), assignee, due, tag);
    s.toast('Task added');
    setTitle('');
  };

  const row = (t: typeof p.tasks[number]) => {
    const m = s.members.find((x) => x.id === t.assigneeId);
    const d = daysBetween(now, t.due);
    return (
      <li key={t.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.02]">
        <Checkbox checked={t.done} onChange={() => s.toggleTask(p.id, t.id)} label={t.done ? `Reopen ${t.title}` : `Mark ${t.title} as done`} />
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-[13px]', t.done && 'text-mist-400 line-through decoration-white/20')}>{t.title}</span>
          <span className="text-[11px] text-mist-400">{t.tag}</span>
        </span>
        <span className={cx('hidden text-[12px] tabular-nums sm:block', !t.done && d < 0 ? 'text-orange-300' : !t.done && d <= 2 ? 'text-amber-soft' : 'text-mist-400')}>
          {!t.done && d < 0 ? `${-d}d late` : date(t.due)}
        </span>
        {m && <Avatar name={m.name} photo={m.photo} size={24} />}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_160px_150px_130px_auto] sm:items-end">
          <Field label="New task"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" /></Field>
          <Field label="Assignee">
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Due"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label="Tag">
            <Select value={tag} onChange={(e) => setTag(e.target.value)}>{TAGS.map((t) => <option key={t}>{t}</option>)}</Select>
          </Field>
          <button type="submit" disabled={!title.trim()} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-amber px-3.5 text-[13px] font-semibold text-ink-950 transition hover:bg-amber-soft disabled:pointer-events-none disabled:opacity-50"><Plus className="size-4" />Add</button>
        </form>
      </Card>
      <Card>
        <CardHeader title="Open" subtitle={`${open.length} ${open.length === 1 ? 'task' : 'tasks'}`} />
        <ul className="mt-2 divide-y divide-white/[0.04] pb-2">
          {open.length === 0 ? <li className="px-5 py-8 text-center text-[13px] text-mist-400">Nothing open. Add the next task above.</li> : open.map(row)}
        </ul>
      </Card>
      {done.length > 0 && (
        <Card>
          <CardHeader title="Done" subtitle={`${done.length} completed`} />
          <ul className="mt-2 divide-y divide-white/[0.04] pb-2">{done.map(row)}</ul>
        </Card>
      )}
    </div>
  );
}

const kindIcon: Record<ProjectFile['kind'], { icon: React.ReactNode; cls: string; label: string }> = {
  pdf: { icon: <FileText className="size-4" />, cls: 'bg-red-500/10 text-red-300', label: 'PDF' },
  image: { icon: <FileImage className="size-4" />, cls: 'bg-sky-500/10 text-sky-300', label: 'Image' },
  doc: { icon: <File className="size-4" />, cls: 'bg-blue-500/10 text-blue-300', label: 'Document' },
  zip: { icon: <FileArchive className="size-4" />, cls: 'bg-amber/10 text-amber-soft', label: 'Archive' },
  fig: { icon: <PenTool className="size-4" />, cls: 'bg-violet-500/10 text-violet-300', label: 'Figma' },
};

const kindFromName = (name: string): ProjectFile['kind'] => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'].includes(ext)) return 'image';
  if (['zip', 'rar', '7z'].includes(ext)) return 'zip';
  if (ext === 'fig') return 'fig';
  return 'doc';
};
const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

function FilesTab({ projectId }: { projectId: string }) {
  const s = useStore();
  const p = s.projects.find((x) => x.id === projectId)!;
  const inputRef = useRef<HTMLInputElement>(null);
  const files = [...p.files].sort((a, b) => b.addedAt.localeCompare(a.addedAt));

  const addFiles = (list: { name: string; size: string }[]) => {
    const now = today();
    const added: ProjectFile[] = list.map((f) => ({ id: uid('f'), name: f.name, size: f.size, kind: kindFromName(f.name), addedAt: now }));
    s.update((st) => ({ projects: st.projects.map((x) => (x.id === projectId ? { ...x, files: [...added, ...x.files] } : x)) }));
    const me = st().members.find((m) => m.id === st().meId)!;
    s.log({ actor: me.name, photo: me.photo, text: `uploaded ${added.length === 1 ? added[0].name : `${added.length} files`} to ${p.name}`, kind: 'project' });
    s.toast(added.length === 1 ? `${added[0].name} uploaded` : `${added.length} files uploaded`);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) addFiles(picked.map((f) => ({ name: f.name, size: fmtSize(f.size) })));
    e.target.value = '';
  };

  return (
    <Card>
      <CardHeader title="Files" subtitle="Shared with the client portal" action={
        <Button size="sm" variant="primary" icon={<Upload className="size-3.5" />} onClick={() => inputRef.current?.click()}>Upload</Button>
      } />
      <input ref={inputRef} type="file" multiple className="hidden" onChange={onPick} aria-label="Upload files" />
      {files.length === 0 ? (
        <EmptyState icon={<Upload className="size-5" />} title="No files yet" body="Upload briefs, references and deliverables. Clients see them in their portal."
          action={<Button size="sm" onClick={() => inputRef.current?.click()}>Choose files</Button>} />
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.04] pb-2">
          {files.map((f) => {
            const k = kindIcon[f.kind];
            return (
              <li key={f.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.02]">
                <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg', k.cls)}>{k.icon}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{f.name}</span><span className="text-[11px] text-mist-400">{k.label} · {f.size} · added {date(f.addedAt)}</span></span>
                <Button size="sm" variant="ghost" onClick={() => s.toast(`Preparing ${f.name}`, 'info')} aria-label={`Download ${f.name}`}>Download</Button>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={() => inputRef.current?.click()}
        className="mx-5 mb-5 mt-2 flex w-[calc(100%-2.5rem)] flex-col items-center gap-1 rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center text-[12px] text-mist-400 transition hover:border-amber/40 hover:text-mist-200">
        <Upload className="size-4" />Click to add files. PDF, images, Figma and zip up to 2 GB.
      </button>
    </Card>
  );
}
const st = () => useStore.getState();

function DiscussionTab({ projectId }: { projectId: string }) {
  const s = useStore();
  const p = s.projects.find((x) => x.id === projectId)!;
  const me = s.members.find((m) => m.id === s.meId)!;
  const [text, setText] = useState('');
  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    s.addProjectComment(p.id, text.trim());
    setText('');
  };
  return (
    <Card>
      <CardHeader title="Discussion" subtitle="Visible to your team and the client" />
      <ul className="space-y-5 p-5">
        {p.comments.length === 0 && (
          <li className="flex flex-col items-center py-6 text-center"><MessageSquare className="size-5 text-mist-400" /><p className="mt-2 text-[13px] text-mist-400">No comments yet. Start the conversation.</p></li>
        )}
        {p.comments.map((c) => {
          const mine = c.author === me.name;
          return (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.author} photo={c.photo} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px]"><span className="font-semibold text-white">{c.author}</span>{mine && <span className="text-mist-400"> (you)</span>}<span className="text-mist-400"> · {relative(c.at)}</span></p>
                <p className={cx('mt-1 inline-block max-w-full whitespace-pre-wrap rounded-xl rounded-tl-sm px-3.5 py-2.5 text-[13px] leading-relaxed ring-1', mine ? 'bg-amber/[0.07] ring-amber/15' : 'bg-ink-850 ring-white/[0.05]')}>{c.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <form onSubmit={send} className="flex items-end gap-3 border-t border-white/[0.06] p-4">
        <Avatar name={me.name} photo={me.photo} size={32} />
        <label htmlFor="comment" className="sr-only">Write a comment</label>
        <Textarea id="comment" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment. Press Cmd+Enter to send."
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }} className="flex-1 resize-none" />
        <Button type="submit" variant="primary" disabled={!text.trim()} icon={<Send className="size-3.5" />}>Send</Button>
      </form>
    </Card>
  );
}

const PREVIEWS = [
  ['from-amber/80 to-ember/70', 'from-cream to-amber-soft/70', 'from-ink-500 to-ink-700'],
  ['from-sky-400/80 to-indigo-600/70', 'from-slate-200 to-sky-300/60'],
  ['from-violet-400/80 to-fuchsia-600/70', 'from-ink-500 to-violet-500/50'],
  ['from-emerald-400/70 to-teal-700/70', 'from-lime-200/70 to-ink-600'],
];

function ApprovalModal({ open, onClose, projectId, onSent }: { open: boolean; onClose: () => void; projectId: string; onSent: (id: string) => void }) {
  const s = useStore();
  const p = s.projects.find((x) => x.id === projectId)!;
  const client = s.clients.find((c) => c.id === p.clientId);
  const current = p.milestones.find((m) => m.status === 'current');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const placeholder = current ? `${current.title} review` : `${p.name} review`;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const me = s.members.find((m) => m.id === s.meId)!;
    const id = uid('a');
    const finalTitle = title.trim() || placeholder;
    const previews = PREVIEWS[Math.floor(Math.random() * PREVIEWS.length)];
    s.update((st) => ({
      approvals: [{ id, projectId: p.id, clientId: p.clientId, title: finalTitle, version: 1, submittedAt: new Date().toISOString(), status: 'pending', previews, description: desc.trim() || `Please review and approve ${finalTitle.toLowerCase()}.`, comments: [] }, ...st.approvals],
    }));
    s.log({ actor: me.name, photo: me.photo, text: `requested approval on ${finalTitle} from ${client?.name ?? 'the client'}`, kind: 'approval' });
    s.toast(`Approval requested from ${client?.name ?? 'the client'}`);
    setTitle(''); setDesc('');
    onSent(id);
  };

  return (
    <Modal open={open} onClose={onClose} title="Request approval" subtitle={`${client?.contacts[0]?.name ?? client?.name ?? 'The client'} will be notified and can approve in the portal.`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<Send className="size-3.5" />} onClick={() => submit()}>Send for approval</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="What are you sharing?"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} /></Field>
        <Field label="Note for the client" hint="Explain what feedback you need and by when."><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Two directions attached. We recommend option A. Could you confirm by Friday?" /></Field>
        <div className="flex items-center gap-2 rounded-lg bg-ink-850 p-3 text-[12px] text-mist-400 ring-1 ring-white/[0.05]">
          <span className="flex -space-x-1.5">{PREVIEWS[0].map((g) => <span key={g} className={cx('size-6 rounded-md bg-gradient-to-br ring-2 ring-ink-850', g)} />)}</span>
          Version 1 · latest artboards attached automatically
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
