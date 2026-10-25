import { useEffect, useState, type DragEvent } from 'react';
import { CalendarDays, Columns3, FolderKanban, List, ListChecks, MoreHorizontal, Plus } from 'lucide-react';
import { useStore, projectProgress } from '../lib/store';
import { cx, date, daysBetween, getParam, money, today } from '../lib/format';
import type { Health, Project, ProjectStatus } from '../lib/types';
import {
  AvatarStack, Button, Card, ClientLogo, Dropdown, EmptyState, HealthBadge, MenuItem, PageHeader, Progress, ProjectStatusBadge,
  SearchInput, Segmented, Select, projectStatusMeta,
} from '../ui/ui';
import { NewProjectModal } from '../ui/work';

const COLUMNS: ProjectStatus[] = ['planning', 'in_progress', 'review', 'done'];
const columnDot: Record<ProjectStatus, string> = { planning: 'bg-sky-400', in_progress: 'bg-amber', review: 'bg-violet-400', done: 'bg-emerald-400' };

export default function Projects() {
  const s = useStore();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [clientId, setClientId] = useState('all');
  const [health, setHealth] = useState<'all' | Health>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    if (getParam('new') === '1') { setOpen(true); window.history.replaceState(null, '', window.location.pathname); }
  }, []);

  const needle = q.trim().toLowerCase();
  const filtered = s.projects.filter((p) => {
    const c = s.clients.find((x) => x.id === p.clientId);
    if (c?.status === 'archived') return false;
    if (clientId !== 'all' && p.clientId !== clientId) return false;
    if (health !== 'all' && p.health !== health) return false;
    if (needle && !`${p.name} ${c?.name ?? ''}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  const clientsWithProjects = s.clients.filter((c) => c.status !== 'archived' && s.projects.some((p) => p.clientId === c.id));
  const activeCount = s.projects.filter((p) => p.status !== 'done').length;
  const pipeline = s.projects.filter((p) => p.status !== 'done').reduce((a, p) => a + p.budget, 0);
  const isFiltered = clientId !== 'all' || health !== 'all' || !!needle;

  const move = (id: string, status: ProjectStatus) => {
    const p = s.projects.find((x) => x.id === id);
    if (!p || p.status === status) return;
    s.moveProject(id, status);
    s.toast(`${p.name} moved to ${projectStatusMeta[status].label}`);
  };

  const onDrop = (e: DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    if (id) move(id, status);
    setDragId(null); setOver(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle={`${activeCount} active · ${money(pipeline)} in active budgets`}
        actions={<>
          <Button href="/app/timeline" icon={<CalendarDays className="size-4" />}>Timeline</Button>
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>New project</Button>
        </>}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Segmented<'board' | 'list'>
          value={view}
          onChange={setView}
          options={[
            { value: 'board', label: <><Columns3 className="size-3.5" />Board</> },
            { value: 'list', label: <><List className="size-3.5" />List</> },
          ]}
        />
        <div className="grid flex-1 grid-cols-2 gap-2 md:flex md:justify-end">
          <label className="sr-only" htmlFor="pf-client">Filter by client</label>
          <Select id="pf-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="md:w-44">
            <option value="all">All clients</option>
            {clientsWithProjects.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <label className="sr-only" htmlFor="pf-health">Filter by health</label>
          <Select id="pf-health" value={health} onChange={(e) => setHealth(e.target.value as 'all' | Health)} className="md:w-40">
            <option value="all">Any health</option>
            <option value="on_track">On track</option>
            <option value="at_risk">At risk</option>
            <option value="off_track">Off track</option>
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder="Search projects" className="col-span-2 md:w-60" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<FolderKanban className="size-5" />} title={isFiltered ? 'No projects match these filters' : 'No projects yet'}
            body={isFiltered ? 'Try another client or health filter, or clear the search.' : 'Create your first project to start tracking work.'}
            action={isFiltered
              ? <Button size="sm" onClick={() => { setClientId('all'); setHealth('all'); setQ(''); }}>Clear filters</Button>
              : <Button size="sm" variant="primary" onClick={() => setOpen(true)}>New project</Button>} />
        </Card>
      ) : view === 'board' ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="grid min-w-[1040px] grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const items = filtered.filter((p) => p.status === col);
              const total = items.reduce((a, p) => a + p.budget, 0);
              return (
                <section
                  key={col}
                  aria-label={`${projectStatusMeta[col].label} column`}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== col) setOver(col); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === col ? null : o)); }}
                  onDrop={(e) => onDrop(e, col)}
                  className={cx('flex min-h-[420px] flex-col rounded-2xl bg-ink-900/60 p-2.5 ring-1 transition', over === col ? 'ring-amber/50 bg-amber/[0.03]' : 'ring-white/[0.06]')}
                >
                  <header className="flex items-center justify-between px-2 pb-3 pt-1.5">
                    <span className="flex items-center gap-2 text-[13px] font-semibold"><span className={cx('size-2 rounded-full', columnDot[col])} />{projectStatusMeta[col].label}<span className="rounded-md bg-white/[0.07] px-1.5 text-[10px] font-semibold text-mist-300">{items.length}</span></span>
                    <span className="text-[12px] tabular-nums text-mist-400">{money(total, 'USD', true)}</span>
                  </header>
                  <div className="flex flex-1 flex-col gap-2.5">
                    {items.map((p) => (
                      <BoardCard key={p.id} project={p} dragging={dragId === p.id} onMove={move}
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; setDragId(p.id); }}
                        onDragEnd={() => { setDragId(null); setOver(null); }} />
                    ))}
                    {items.length === 0 && (
                      <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-[12px] text-mist-400">Drag a project here</div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-mist-400"><tr className="border-b border-white/[0.06]"><th className="px-5 py-2.5 font-medium">Project</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 font-medium">Progress</th><th className="px-3 py-2.5 font-medium">Due</th><th className="px-3 py-2.5 text-right font-medium">Budget</th><th className="px-3 py-2.5 font-medium">Team</th><th className="px-5 py-2.5 font-medium">Health</th></tr></thead>
              <tbody>
                {[...filtered].sort((a, b) => COLUMNS.indexOf(a.status) - COLUMNS.indexOf(b.status) || a.due.localeCompare(b.due)).map((p) => {
                  const c = s.clients.find((x) => x.id === p.clientId);
                  const prog = projectProgress(p);
                  const left = daysBetween(today(), p.due);
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3"><a href={`/app/projects/view?id=${p.id}`} className="flex items-center gap-3">{c && <ClientLogo client={c} size={30} />}<span><span className="block font-semibold hover:underline">{p.name}</span><span className="text-[12px] text-mist-400">{c?.name}</span></span></a></td>
                      <td className="px-3 py-3"><ProjectStatusBadge status={p.status} /></td>
                      <td className="px-3 py-3"><div className="flex items-center gap-2"><Progress value={prog} className="w-24" tone={p.status === 'done' ? 'green' : 'amber'} /><span className="text-[12px] tabular-nums text-mist-300">{prog}%</span></div></td>
                      <td className="px-3 py-3"><span className="block">{date(p.due)}</span>{p.status === 'done' ? <span className="text-[11px] text-mist-400">Delivered</span> : <span className={cx('text-[11px]', left < 7 ? 'text-orange-300' : 'text-mist-400')}>{left >= 0 ? `${left} days left` : `${-left} days late`}</span>}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(p.budget)}</td>
                      <td className="px-3 py-3"><AvatarStack people={p.memberIds.map((id) => s.members.find((m) => m.id === id)!).filter(Boolean)} size={24} /></td>
                      <td className="px-5 py-3"><HealthBadge health={p.health} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === 'board' && filtered.length > 0 && <p className="text-center text-[12px] text-mist-400">Drag cards between columns, or use the menu on each card to change status.</p>}

      <NewProjectModal open={open} onClose={() => setOpen(false)} defaultClientId={clientId !== 'all' ? clientId : undefined} />
    </div>
  );
}

function BoardCard({ project: p, dragging, onMove, onDragStart, onDragEnd }: {
  project: Project; dragging: boolean; onMove: (id: string, s: ProjectStatus) => void;
  onDragStart: (e: DragEvent) => void; onDragEnd: () => void;
}) {
  const client = useStore((s) => s.clients.find((c) => c.id === p.clientId));
  const members = useStore((s) => s.members);
  const prog = projectProgress(p);
  const left = daysBetween(today(), p.due);
  const late = p.status !== 'done' && left < 0;
  const soon = p.status !== 'done' && left >= 0 && left < 7;
  const doneTasks = p.tasks.filter((t) => t.done).length;

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cx('group relative cursor-grab rounded-xl bg-ink-850 p-3.5 ring-1 ring-white/[0.06] transition hover:ring-white/15 active:cursor-grabbing', dragging && 'opacity-40')}
    >
      <div className="flex items-start gap-2.5">
        {client && <ClientLogo client={client} size={28} />}
        <div className="min-w-0 flex-1">
          <a href={`/app/projects/view?id=${p.id}`} className="block truncate text-[13px] font-semibold hover:underline" draggable={false}>{p.name}</a>
          <p className="truncate text-[12px] text-mist-400">{client?.name}</p>
        </div>
        <Dropdown
          trigger={(open) => (
            <button type="button" aria-label={`Move ${p.name}`} aria-expanded={open} className="-mr-1 -mt-1 grid size-7 place-items-center rounded-md text-mist-400 hover:bg-white/5 hover:text-white">
              <MoreHorizontal className="size-4" />
            </button>
          )}
        >
          {(close) => (<>
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-mist-400">Move to</p>
            {COLUMNS.filter((c) => c !== p.status).map((c) => (
              <MenuItem key={c} icon={<span className={cx('size-2 rounded-full', columnDot[c])} />} onClick={() => { onMove(p.id, c); close(); }}>{projectStatusMeta[c].label}</MenuItem>
            ))}
            <div className="my-1 border-t border-white/[0.06]" />
            <MenuItem href={`/app/projects/view?id=${p.id}`}>Open project</MenuItem>
          </>)}
        </Dropdown>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Progress value={prog} className="flex-1" tone={p.status === 'done' ? 'green' : 'amber'} />
        <span className="text-[11px] tabular-nums text-mist-300">{prog}%</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
        <span className={cx('inline-flex items-center gap-1', late || soon ? 'text-orange-300' : 'text-mist-400')}>
          <CalendarDays className="size-3.5" />{date(p.due)}{late && ` · ${-left}d late`}
        </span>
        <span className="inline-flex items-center gap-1 text-mist-400"><ListChecks className="size-3.5" />{doneTasks}/{p.tasks.length}</span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">
        <AvatarStack people={p.memberIds.map((id) => members.find((m) => m.id === id)!).filter(Boolean)} size={22} max={3} />
        <HealthBadge health={p.health} />
      </div>
    </article>
  );
}
