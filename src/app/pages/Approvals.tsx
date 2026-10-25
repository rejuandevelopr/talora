import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BellRing, CheckCircle2, ChevronLeft, ChevronRight, FileCheck2, Layers, MessageSquare, Plus, Send, Upload } from 'lucide-react';
import { useStore, uid } from '../lib/store';
import { cx, dateLong, getParam, relative, time } from '../lib/format';
import type { Approval, ApprovalStatus } from '../lib/types';
import { ApprovalStatusBadge, Avatar, Button, Card, ClientLogo, EmptyState, Field, Input, Modal, PageHeader, Select, Tabs, Textarea, useMe } from '../ui/ui';

type Filter = 'pending' | 'changes' | 'approved' | 'all';

const PREVIEW_SETS = [
  ['from-amber/80 to-ember/70', 'from-cream to-amber-soft/70', 'from-ink-500 to-ink-700'],
  ['from-sky-400/80 to-indigo-600/70', 'from-slate-200 to-sky-300/60'],
  ['from-emerald-400/80 to-teal-600/70', 'from-lime-200/70 to-emerald-500/60', 'from-ink-500 to-teal-700/60'],
  ['from-violet-400/80 to-fuchsia-600/70', 'from-fuchsia-300/60 to-ink-600'],
  ['from-rose-400/80 to-orange-500/70', 'from-cream to-rose-300/60', 'from-ink-500 to-rose-600/50'],
];

/** A mock design frame drawn with divs, varied by index so the artboards feel distinct. */
function Artboard({ gradient, variant, compact }: { gradient: string; variant: number; compact?: boolean }) {
  const v = variant % 3;
  return (
    <div className={cx('relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10', gradient)}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
      {!compact && (
        <div className="absolute inset-x-0 top-0 flex items-center gap-1.5 bg-black/15 px-3 py-2 backdrop-blur-[2px]">
          <span className="h-1.5 w-8 rounded-full bg-white/60" />
          <span className="ml-auto h-1.5 w-5 rounded-full bg-white/35" />
          <span className="h-1.5 w-5 rounded-full bg-white/35" />
          <span className="h-1.5 w-5 rounded-full bg-white/35" />
        </div>
      )}
      {v === 0 && (
        <div className={cx('absolute flex flex-col', compact ? 'inset-2 gap-1' : 'inset-x-[8%] bottom-[12%] top-[22%] gap-2')}>
          <span className="h-[14%] w-[70%] rounded-md bg-white/80" />
          <span className="h-[8%] w-[45%] rounded-md bg-white/45" />
          <span className="mt-auto flex gap-2"><span className="h-5 w-16 rounded-full bg-ink-950/70" /><span className="h-5 w-12 rounded-full bg-white/40" /></span>
        </div>
      )}
      {v === 1 && (
        <div className={cx('absolute grid grid-cols-3', compact ? 'inset-2 gap-1' : 'inset-x-[8%] bottom-[10%] top-[22%] gap-2.5')}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-lg bg-white/25 p-1.5 ring-1 ring-white/20">
              <span className="flex-1 rounded-md bg-white/45" />
              <span className="h-1.5 w-3/4 rounded-full bg-white/70" />
              <span className="h-1.5 w-1/2 rounded-full bg-white/40" />
            </div>
          ))}
        </div>
      )}
      {v === 2 && (
        <div className={cx('absolute flex items-center', compact ? 'inset-2 gap-1' : 'inset-x-[8%] bottom-[12%] top-[22%] gap-4')}>
          <div className="grid aspect-square h-[78%] place-items-center rounded-full bg-white/25 ring-1 ring-white/30">
            <span className="size-1/2 rounded-full bg-white/70" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <span className="h-2.5 w-4/5 rounded-full bg-white/75" />
            <span className="h-2 w-3/5 rounded-full bg-white/45" />
            <span className="h-2 w-2/3 rounded-full bg-white/45" />
            <span className="mt-2 h-6 w-24 rounded-md bg-ink-950/60" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Approvals() {
  const s = useStore();
  const me = useMe();
  const [filter, setFilter] = useState<Filter>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [comment, setComment] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ projectId: '', title: '', description: '' });

  useEffect(() => {
    const id = getParam('id');
    const exists = id && useStore.getState().approvals.find((a) => a.id === id);
    if (exists) {
      setSelectedId(exists.id);
      setFilter(exists.status === 'pending' ? 'pending' : 'all');
      setMobileOpen(true);
    } else {
      const first = useStore.getState().approvals.find((a) => a.status === 'pending') ?? useStore.getState().approvals[0];
      if (first) setSelectedId(first.id);
    }
    if (getParam('new') === '1') { setNewOpen(true); history.replaceState(null, '', '/app/approvals'); }
  }, []);

  const sorted = useMemo(() => [...s.approvals].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [s.approvals]);
  const counts = {
    pending: s.approvals.filter((a) => a.status === 'pending').length,
    changes: s.approvals.filter((a) => a.status === 'changes').length,
    approved: s.approvals.filter((a) => a.status === 'approved').length,
    all: s.approvals.length,
  };
  const list = filter === 'all' ? sorted : sorted.filter((a) => a.status === filter);
  const selected = s.approvals.find((a) => a.id === selectedId) ?? null;

  const select = (a: Approval) => {
    setSelectedId(a.id);
    setSlide(0);
    setMobileOpen(true);
    history.replaceState(null, '', `/app/approvals?id=${a.id}`);
  };

  const patch = (id: string, fn: (a: Approval) => Approval) => s.update((st) => ({ approvals: st.approvals.map((a) => (a.id === id ? fn(a) : a)) }));

  const addComment = () => {
    if (!selected || !comment.trim()) return;
    const text = comment.trim();
    patch(selected.id, (a) => ({ ...a, comments: [...a.comments, { id: uid('ac'), author: me.name, photo: me.photo, text, at: new Date().toISOString() }] }));
    setComment('');
    s.toast('Comment added');
  };

  const nudge = () => {
    if (!selected) return;
    const c = s.clients.find((x) => x.id === selected.clientId);
    const contact = c?.contacts[0];
    s.notify('Reminder sent', `${contact?.name ?? c?.name} was nudged about ${selected.title}.`, `/app/approvals?id=${selected.id}`);
    s.log({ actor: me.name, photo: me.photo, text: `nudged ${c?.name} about ${selected.title}`, kind: 'approval' });
    s.toast(`Reminder sent to ${contact?.name ?? c?.name}`);
  };

  const uploadVersion = () => {
    if (!selected) return;
    const n = selected.version + 1;
    patch(selected.id, (a) => ({
      ...a, version: n, status: 'pending', submittedAt: new Date().toISOString(),
      comments: [...a.comments, { id: uid('ac'), author: me.name, photo: me.photo, text: `v${n} uploaded`, at: new Date().toISOString() }],
    }));
    s.log({ actor: me.name, photo: me.photo, text: `uploaded v${n} of ${selected.title}`, kind: 'approval' });
    s.toast(`v${n} uploaded and sent for review`);
    setSlide(0);
  };

  const approveOnBehalf = () => {
    if (!selected) return;
    s.decideApproval(selected.id, 'approved', 'Approved on the client\'s behalf after a call.');
  };

  const createRequest = () => {
    const project = s.projects.find((p) => p.id === form.projectId);
    if (!project || !form.title.trim()) return;
    const previews = PREVIEW_SETS[Math.floor(Math.random() * PREVIEW_SETS.length)];
    const a: Approval = {
      id: uid('a'), projectId: project.id, clientId: project.clientId, title: form.title.trim(), version: 1,
      submittedAt: new Date().toISOString(), status: 'pending', previews, description: form.description.trim() || 'New work ready for review.', comments: [],
    };
    s.update((st) => ({ approvals: [a, ...st.approvals] }));
    const c = s.clients.find((x) => x.id === project.clientId);
    s.log({ actor: me.name, photo: me.photo, text: `sent ${a.title} to ${c?.name} for approval`, kind: 'approval' });
    s.toast(`Approval request sent to ${c?.name}`);
    setNewOpen(false);
    setForm({ projectId: '', title: '', description: '' });
    setFilter('pending');
    select(a);
  };

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: 'pending', label: 'Waiting', count: counts.pending },
    { value: 'changes', label: 'Changes requested', count: counts.changes },
    { value: 'approved', label: 'Approved', count: counts.approved },
    { value: 'all', label: 'All', count: counts.all },
  ];

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle={`${counts.pending} waiting on clients · ${counts.changes} with requested changes`}
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setNewOpen(true)}>New approval request</Button>}
      />

      <div className="grid gap-4 lg:h-[calc(100dvh-14rem)] lg:min-h-[560px] lg:grid-cols-[360px_1fr]">
        {/* List */}
        <Card className={cx('flex min-h-0 flex-col overflow-hidden', mobileOpen && 'hidden lg:flex')}>
          <Tabs tabs={tabs} value={filter} onChange={setFilter} className="px-2" />
          <ul className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto p-2.5">
            {list.length === 0 && <li><EmptyState icon={<FileCheck2 className="size-5" />} title="Nothing here" body="No approvals match this filter right now." /></li>}
            {list.map((a) => {
              const c = s.clients.find((x) => x.id === a.clientId);
              const active = a.id === selectedId;
              return (
                <li key={a.id}>
                  <button onClick={() => select(a)} aria-current={active}
                    className={cx('flex w-full items-center gap-3 rounded-xl p-2.5 text-left ring-1 transition', active ? 'bg-white/[0.06] ring-amber/40' : 'bg-ink-850 ring-white/[0.05] hover:ring-white/15')}>
                    <span className={cx('size-12 shrink-0 rounded-lg bg-gradient-to-br ring-1 ring-white/10', a.previews[0])} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2"><span className="truncate text-[13px] font-semibold">{a.title}</span></span>
                      <span className="block truncate text-[12px] text-mist-400">{c?.name} · v{a.version} · {relative(a.submittedAt)}</span>
                      <span className="mt-1 block"><ApprovalStatusBadge status={a.status} /></span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Review */}
        <Card className={cx('min-h-0 overflow-hidden', !mobileOpen && 'hidden lg:block')}>
          {!selected ? (
            <EmptyState icon={<Layers className="size-5" />} title="Select an approval" body="Pick a request on the left to review the artboards and comments." />
          ) : (
            <Review
              key={selected.id}
              a={selected}
              slide={slide}
              setSlide={setSlide}
              onBack={() => setMobileOpen(false)}
              comment={comment}
              setComment={setComment}
              addComment={addComment}
              nudge={nudge}
              uploadVersion={uploadVersion}
              approve={approveOnBehalf}
            />
          )}
        </Card>
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New approval request" subtitle="Send work to a client for sign off in their portal."
        footer={<>
          <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
          <Button variant="primary" icon={<Send className="size-4" />} disabled={!form.projectId || !form.title.trim()} onClick={createRequest}>Send for approval</Button>
        </>}>
        <div className="space-y-4">
          <Field label="Project">
            <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Choose a project</option>
              {s.projects.filter((p) => p.status !== 'done').map((p) => {
                const c = s.clients.find((x) => x.id === p.clientId);
                return <option key={p.id} value={p.id}>{p.name} · {c?.name}</option>;
              })}
            </Select>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Label system, round 1" /></Field>
          <Field label="Description" hint="Tell the client what to focus on in this round.">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Three directions for the bottle label. We recommend option B." />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Review({ a, slide, setSlide, onBack, comment, setComment, addComment, nudge, uploadVersion, approve }: {
  a: Approval; slide: number; setSlide: (n: number) => void; onBack: () => void;
  comment: string; setComment: (v: string) => void; addComment: () => void;
  nudge: () => void; uploadVersion: () => void; approve: () => void;
}) {
  const c = useStore((st) => st.clients.find((x) => x.id === a.clientId));
  const project = useStore((st) => st.projects.find((p) => p.id === a.projectId));
  const count = a.previews.length;
  const idx = Math.min(slide, count - 1);
  const statusLine: Record<ApprovalStatus, string> = {
    pending: `Waiting on ${c?.contacts[0]?.name ?? c?.name} since ${relative(a.submittedAt)}`,
    changes: 'The client asked for changes. Upload a new version when ready.',
    approved: 'Signed off. This version is locked.',
  };

  return (
    <div className="scrollbar-thin flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-[12px] text-mist-400 hover:text-white lg:hidden"><ArrowLeft className="size-3.5" />All approvals</button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-semibold tracking-tight">{a.title}</h2>
            <span className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[11px] font-semibold text-mist-200">v{a.version}</span>
            <ApprovalStatusBadge status={a.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mist-400">
            {c && <a href={`/app/clients/view?id=${c.id}`} className="flex items-center gap-2 hover:text-white"><ClientLogo client={c} size={20} />{c.name}</a>}
            {project && <a href={`/app/projects/view?id=${project.id}`} className="inline-flex items-center gap-0.5 hover:text-white">{project.name}<ArrowUpRight className="size-3" /></a>}
            <span>Sent {dateLong(a.submittedAt.slice(0, 10))}</span>
          </div>
          <p className="mt-1.5 text-[12px] text-mist-300">{statusLine[a.status]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.status === 'pending' && <Button size="sm" icon={<BellRing className="size-3.5" />} onClick={nudge}>Nudge client</Button>}
          <Button size="sm" icon={<Upload className="size-3.5" />} onClick={uploadVersion}>Upload new version</Button>
          {a.status !== 'approved' && <Button size="sm" variant="primary" icon={<CheckCircle2 className="size-3.5" />} onClick={approve}>Mark approved on client's behalf</Button>}
        </div>
      </div>

      {/* Preview stage */}
      <div className="border-b border-white/[0.06] bg-ink-850/60 p-5">
        <div className="relative mx-auto max-w-3xl">
          <Artboard gradient={a.previews[idx]} variant={idx} />
          {count > 1 && <>
            <button onClick={() => setSlide((idx - 1 + count) % count)} aria-label="Previous artboard" className="absolute left-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-ink-950/70 text-white ring-1 ring-white/10 backdrop-blur hover:bg-ink-950"><ChevronLeft className="size-4" /></button>
            <button onClick={() => setSlide((idx + 1) % count)} aria-label="Next artboard" className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-ink-950/70 text-white ring-1 ring-white/10 backdrop-blur hover:bg-ink-950"><ChevronRight className="size-4" /></button>
          </>}
          <span className="absolute bottom-3 left-3 rounded-md bg-ink-950/70 px-2 py-0.5 text-[11px] font-semibold text-mist-200 backdrop-blur">Option {String.fromCharCode(65 + idx)} · {idx + 1} of {count}</span>
        </div>
        {count > 1 && (
          <div className="mx-auto mt-4 flex max-w-3xl gap-2.5">
            {a.previews.map((g, i) => (
              <button key={i} onClick={() => setSlide(i)} aria-label={`Show option ${String.fromCharCode(65 + i)}`}
                className={cx('w-24 rounded-xl p-0.5 ring-2 transition', i === idx ? 'ring-amber' : 'ring-transparent opacity-70 hover:opacity-100')}>
                <Artboard gradient={g} variant={i} compact />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[1fr_1.2fr]">
        <div>
          <h3 className="text-[14px] font-semibold">About this round</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-mist-300">{a.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-xl bg-ink-850 p-3 ring-1 ring-white/[0.05]"><dt className="text-mist-400">Artboards</dt><dd className="mt-0.5 text-[15px] font-semibold">{count}</dd></div>
            <div className="rounded-xl bg-ink-850 p-3 ring-1 ring-white/[0.05]"><dt className="text-mist-400">Version</dt><dd className="mt-0.5 text-[15px] font-semibold">v{a.version}</dd></div>
          </dl>
          {c && <Button size="sm" variant="ghost" className="mt-3 -ml-2" href={`/portal?client=${c.id}`}>Open client portal <ArrowUpRight className="size-3.5" /></Button>}
        </div>
        <div>
          <h3 className="flex items-center gap-2 text-[14px] font-semibold"><MessageSquare className="size-4 text-mist-400" />Comments <span className="text-[12px] font-normal text-mist-400">{a.comments.length}</span></h3>
          <ul className="mt-3 space-y-3">
            {a.comments.length === 0 && <li className="rounded-xl bg-ink-850 p-4 text-[13px] text-mist-400 ring-1 ring-white/[0.05]">No comments yet. Client feedback from the portal shows up here.</li>}
            {a.comments.map((cm) => (
              <li key={cm.id} className="flex gap-3">
                <Avatar name={cm.author} photo={cm.photo} size={28} />
                <div className="min-w-0 flex-1 rounded-xl bg-ink-850 px-3.5 py-2.5 ring-1 ring-white/[0.05]">
                  <p className="text-[12px]"><span className="font-semibold">{cm.author}</span> <span className="text-mist-400">· {relative(cm.at)} at {time(cm.at)}</span></p>
                  <p className="mt-1 text-[13px] leading-relaxed text-mist-200">{cm.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-xl bg-ink-850 p-2 ring-1 ring-white/10 focus-within:ring-amber/50">
            <label htmlFor="approval-comment" className="sr-only">Add a comment</label>
            <textarea id="approval-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addComment(); }}
              placeholder="Reply to the client or leave a note for the team"
              className="w-full resize-none bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-mist-400/70" />
            <div className="flex items-center justify-between px-1.5">
              <span className="text-[11px] text-mist-400">Visible to the client in their portal</span>
              <Button size="sm" variant="primary" disabled={!comment.trim()} onClick={addComment} icon={<Send className="size-3.5" />}>Comment</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
