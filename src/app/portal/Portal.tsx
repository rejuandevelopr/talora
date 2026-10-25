import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, Calendar, Check, CheckCircle2, ChevronDown, CreditCard, Download, Eye, File, FileArchive, FileImage, FileText,
  Shapes, Lock, MessageSquare, PenLine, Receipt, Send, ShieldCheck, Sparkles, Undo2,
} from 'lucide-react';
import { useStore, invoiceTotal, projectProgress, uid } from '../lib/store';
import { cx, date, dateLong, daysBetween, money, relative, time, today, getParam } from '../lib/format';
import type { Approval, Client, Contact, Invoice, Project, ProjectFile, Thread } from '../lib/types';
import { ApprovalStatusBadge, Avatar, AvatarStack, Badge, Button, ClientLogo, EmptyState, Field, Input, InvoiceStatusBadge, Modal, Progress, Textarea, Toaster } from '../ui/ui';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'files', label: 'Files' },
  { id: 'messages', label: 'Messages' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

const fgFor = (hex: string) => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#08070a';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#08070a' : '#ffffff';
};

export default function Portal() {
  const [clientId] = useState(() => getParam('client') || 'c1');
  const client = useStore((s) => s.clients.find((c) => c.id === clientId || c.portalSlug === clientId));
  const workspace = useStore((s) => s.workspace);

  if (!client) return <><Toaster /><UnknownClient id={clientId} studio={workspace.name} /></>;
  return <><Toaster /><PortalView client={client} /></>;
}

/* ------------------------------------------------------------------ */

function StudioMark({ size = 32 }: { size?: number }) {
  const ws = useStore((s) => s.workspace);
  return (
    <span className="grid shrink-0 place-items-center rounded-lg font-serif italic" style={{ width: size, height: size, fontSize: size * 0.5, background: ws.brandColor, color: fgFor(ws.brandColor) }} aria-hidden="true">
      {(ws.name.trim()[0] ?? 'S').toUpperCase()}
    </span>
  );
}

function DemoBanner() {
  return (
    <div className="relative z-30 border-b border-amber/20 bg-amber/[0.08]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 text-[12px] sm:px-6">
        <span className="flex min-w-0 items-center gap-2 text-amber-soft"><Eye className="size-3.5 shrink-0" /><span className="truncate"><span className="font-semibold">Demo:</span> viewing as the client</span></span>
        <a href="/app" className="inline-flex shrink-0 items-center gap-1 font-semibold text-white hover:text-amber-soft"><ArrowLeft className="size-3.5" />Back to studio</a>
      </div>
    </div>
  );
}

function UnknownClient({ id, studio }: { id: string; studio: string }) {
  return (
    <>
      <DemoBanner />
      <main id="main" className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <StudioMark size={48} />
        <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.03em]">We could not find that portal</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-mist-400">
          The link for <span className="font-mono text-mist-200">{id}</span> may have expired or been moved. Ask your contact at {studio} for a fresh link, or open the sample client portal.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="primary" href="/portal?client=c1">Open sample portal</Button>
          <Button href="/app/clients">Studio clients</Button>
        </div>
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */

function PortalView({ client }: { client: Client }) {
  const s = useStore();
  const contact: Contact = client.contacts[0] ?? { name: `${client.name} team`, email: `hello@${client.website}`, role: 'Client' };
  const author = { name: contact.name, photo: contact.photo };
  const first = contact.name.split(' ')[0];

  const projects = s.projects.filter((p) => p.clientId === client.id);
  const active = projects.filter((p) => p.status !== 'done');
  const completed = projects.filter((p) => p.status === 'done');
  const approvals = s.approvals.filter((a) => a.clientId === client.id);
  const pending = approvals.filter((a) => a.status === 'pending');
  const invoices = s.invoices.filter((i) => i.clientId === client.id && i.status !== 'draft').sort((a, b) => b.issued.localeCompare(a.issued));
  const unpaid = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue');
  const dueTotal = unpaid.reduce((a, i) => a + invoiceTotal(i), 0);
  const files = projects.flatMap((p) => p.files.map((f) => ({ ...f, project: p }))).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const threads = s.threads.filter((t) => t.clientId === client.id);
  const team = useMemo(() => {
    const ids = Array.from(new Set(projects.flatMap((p) => [p.leadId, ...p.memberIds])));
    return ids.map((id) => s.members.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m);
  }, [projects, s.members]);
  const lead = s.members.find((m) => m.id === (active[0] ?? projects[0])?.leadId) ?? team[0];

  const [section, setSection] = useState<SectionId>('overview');
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setSection(vis[0].target.id as SectionId);
    }, { rootMargin: '-120px 0px -55% 0px' });
    SECTIONS.forEach((x) => { const el = document.getElementById(x.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const counts: Partial<Record<SectionId, number>> = { approvals: pending.length, invoices: unpaid.length };

  const hour = new Date().getHours();
  const nextDeadline = active.map((p) => nextDate(p)).filter(Boolean).sort((a, b) => a!.due.localeCompare(b!.due))[0];

  return (
    <>
      <DemoBanner />
      {/* Top bar */}
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <StudioMark />
            <span className="hidden text-[14px] font-semibold sm:inline">{s.workspace.name}</span>
            <span className="text-[13px] text-mist-400" aria-hidden="true">×</span>
            <ClientLogo client={client} size={30} />
            <span className="truncate text-[14px] font-semibold">{client.name}</span>
            <span className="sr-only">Client portal for {client.name} by {s.workspace.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="hidden text-right text-[12px] leading-tight sm:block"><span className="block text-mist-400">Viewing as</span><span className="font-semibold">{contact.name}</span></span>
            <Avatar name={contact.name} photo={contact.photo} size={34} className="ring-2 ring-white/10" />
          </div>
        </div>
      </header>

      {/* Sticky in-page nav */}
      <nav aria-label="Portal sections" className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
          {SECTIONS.map((x) => (
            <a key={x.id} href={`#${x.id}`} aria-current={section === x.id ? 'location' : undefined} onClick={() => setSection(x.id)}
              className={cx('-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3.5 text-[13px] font-medium transition', section === x.id ? 'border-amber text-white' : 'border-transparent text-mist-400 hover:text-white')}>
              {x.label}
              {!!counts[x.id] && <span className="rounded-md bg-amber px-1.5 text-[10px] font-bold text-ink-950">{counts[x.id]}</span>}
            </a>
          ))}
        </div>
      </nav>

      <main id="main" className="mx-auto max-w-5xl space-y-20 px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        {/* Overview */}
        <section id="overview" aria-labelledby="overview-h" className="scroll-mt-20">
          <p className="text-[12px] font-medium text-mist-400">{hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'} from {s.workspace.name}</p>
          <h1 id="overview-h" className="mt-2 text-[32px] font-semibold leading-[1.1] tracking-[-0.04em] sm:text-[42px]">
            Good to see you, <span className="serif-accent text-amber-soft">{first}</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-mist-300">
            {pending.length
              ? `There ${pending.length === 1 ? 'is 1 design' : `are ${pending.length} designs`} waiting for your feedback. Everything else is moving along nicely.`
              : 'You are all caught up. Here is where your projects stand today.'}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <SummaryTile href="#approvals" label="Waiting on you" value={pending.length ? `${pending.length} approval${pending.length > 1 ? 's' : ''}` : 'Nothing'} tone={pending.length ? 'amber' : 'neutral'} icon={<PenLine className="size-4" />} />
            <SummaryTile href="#invoices" label="Balance due" value={dueTotal ? money(dueTotal) : 'All paid'} tone={unpaid.some((i) => i.status === 'overdue') ? 'red' : 'neutral'} icon={<Receipt className="size-4" />} />
            <SummaryTile href="#overview-projects" label="Next deadline" value={nextDeadline ? date(nextDeadline.due, { month: 'short', day: 'numeric' }) : 'None scheduled'} sub={nextDeadline?.label} icon={<Calendar className="size-4" />} />
          </div>

          <div id="overview-projects" className="mt-10 scroll-mt-24 space-y-4">
            {active.length === 0 && completed.length === 0 && (
              <div className="rounded-2xl bg-ink-900 ring-1 ring-white/[0.07]"><EmptyState icon={<Sparkles className="size-5" />} title="No projects yet" body={`When ${s.workspace.name} kicks off your first project, progress and milestones will appear here.`} /></div>
            )}
            {active.map((p) => <ProjectCard key={p.id} project={p} pending={pending.filter((a) => a.projectId === p.id).length} />)}
            {completed.length > 0 && (
              <div className="rounded-2xl bg-ink-900/60 p-5 ring-1 ring-white/[0.06]">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-mist-400">Completed</p>
                <ul className="mt-3 divide-y divide-white/[0.05]">
                  {completed.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3 text-[13px]">
                      <span className="grid size-7 place-items-center rounded-full bg-emerald-500/15 text-emerald-300"><Check className="size-3.5" /></span>
                      <span className="flex-1"><span className="block font-semibold">{p.name}</span><span className="text-[12px] text-mist-400">Delivered {dateLong(p.due)}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {lead && (
            <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-ink-900 p-5 ring-1 ring-white/[0.07] sm:flex-row sm:items-center">
              <Avatar name={lead.name} photo={lead.photo} size={44} />
              <div className="flex-1">
                <p className="text-[14px] font-semibold">{lead.name} <span className="font-normal text-mist-400">is your main contact</span></p>
                <p className="text-[12px] text-mist-400">{lead.title} at {s.workspace.name} · usually replies within a few hours</p>
              </div>
              <div className="flex items-center gap-3">
                <AvatarStack people={team} size={28} />
                <Button href="#messages" icon={<MessageSquare className="size-4" />}>Message</Button>
              </div>
            </div>
          )}
        </section>

        <ApprovalsSection client={client} contactAuthor={author} approvals={approvals} projects={projects} />
        <InvoicesSection client={client} contact={contact} invoices={invoices} projects={projects} />
        <FilesSection files={files} />
        <MessagesSection client={client} contact={contact} threads={threads} lead={lead} />
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-[12px] text-mist-400 sm:flex-row sm:px-6">
          <span className="flex items-center gap-2"><Lock className="size-3.5" />Private portal for {client.name}. Shared securely by {s.workspace.name}.</span>
          <span>Powered by <a href="/" className="font-semibold text-mist-200 hover:text-white">Talora</a></span>
        </div>
      </footer>
    </>
  );
}

function nextDate(p: Project) {
  const now = today();
  const ms = p.milestones.filter((m) => m.status !== 'done' && m.due >= now).sort((a, b) => a.due.localeCompare(b.due))[0];
  if (ms) return { due: ms.due, label: `${ms.title}, ${p.name}` };
  return p.due >= now ? { due: p.due, label: `${p.name} wraps up` } : null;
}

function SummaryTile({ label, value, sub, icon, href, tone = 'neutral' }: { label: string; value: string; sub?: string; icon: ReactNode; href: string; tone?: 'neutral' | 'amber' | 'red' }) {
  return (
    <a href={href} className="group rounded-2xl bg-ink-900 p-5 ring-1 ring-white/[0.07] transition hover:ring-white/15">
      <span className="flex items-center justify-between text-[12px] text-mist-400">{label}<span className={cx(tone === 'amber' ? 'text-amber' : tone === 'red' ? 'text-orange-300' : 'text-mist-400')}>{icon}</span></span>
      <span className={cx('mt-2 block text-[22px] font-semibold tracking-tight', tone === 'red' && 'text-orange-200')}>{value}</span>
      <span className="mt-0.5 block truncate text-[12px] text-mist-400">{sub ?? <span className="inline-flex items-center gap-1 transition group-hover:text-white">View <ArrowRight className="size-3" /></span>}</span>
    </a>
  );
}

function ProjectCard({ project: p, pending }: { project: Project; pending: number }) {
  const prog = projectProgress(p);
  const current = p.milestones.find((m) => m.status === 'current');
  const nd = nextDate(p);
  const left = nd ? daysBetween(today(), nd.due) : null;
  const statusLabel = { planning: 'Getting started', in_progress: 'In progress', review: 'Ready for your review', done: 'Delivered' }[p.status];
  return (
    <article className="rounded-2xl bg-ink-900 p-5 ring-1 ring-white/[0.07] sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-semibold tracking-tight">{p.name}</h2>
            <Badge tone={p.status === 'review' ? 'violet' : p.status === 'planning' ? 'blue' : 'amber'} dot>{statusLabel}</Badge>
            {pending > 0 && <a href="#approvals"><Badge tone="amber">{pending} awaiting you</Badge></a>}
          </div>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-mist-400">{p.description}</p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{prog}%</p>
          <p className="mt-1 text-[11px] text-mist-400">complete</p>
        </div>
      </div>
      <Progress value={prog} className="mt-5 h-2" />

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-ink-850 px-4 py-3 ring-1 ring-white/[0.05]">
          <dt className="text-[11px] uppercase tracking-wider text-mist-400">Current milestone</dt>
          <dd className="mt-1 text-[13px] font-semibold">{current?.title ?? 'Wrapping up'}</dd>
        </div>
        <div className="rounded-xl bg-ink-850 px-4 py-3 ring-1 ring-white/[0.05]">
          <dt className="text-[11px] uppercase tracking-wider text-mist-400">Next deadline</dt>
          <dd className="mt-1 text-[13px] font-semibold">
            {nd ? <>{dateLong(nd.due)} <span className={cx('font-normal', left !== null && left <= 7 ? 'text-orange-300' : 'text-mist-400')}>· {left === 0 ? 'today' : `in ${left} days`}</span></> : 'To be scheduled'}
          </dd>
        </div>
      </dl>

      {p.milestones.length > 0 && (
        <ol className="mt-6 flex flex-col gap-0 sm:flex-row" aria-label={`${p.name} milestones`}>
          {p.milestones.map((m, i) => (
            <li key={m.id} className="relative flex gap-3 pb-5 last:pb-0 sm:flex-1 sm:flex-col sm:gap-2 sm:pb-0 sm:pr-4">
              {i < p.milestones.length - 1 && (
                <span className={cx('absolute left-[11px] top-6 h-[calc(100%-24px)] w-px sm:left-7 sm:right-0 sm:top-[11px] sm:h-px sm:w-auto', m.status === 'done' ? 'bg-amber/60' : 'bg-white/10')} aria-hidden="true" />
              )}
              <span className={cx('relative z-10 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ring-1',
                m.status === 'done' ? 'bg-amber text-ink-950 ring-amber' : m.status === 'current' ? 'bg-ink-900 text-amber ring-amber' : 'bg-ink-900 text-mist-400 ring-white/15')}>
                {m.status === 'done' ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                {m.status === 'current' && <span className="absolute inset-0 animate-ping rounded-full ring-1 ring-amber/50" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className={cx('block text-[13px] font-semibold', m.status === 'upcoming' && 'text-mist-300')}>{m.title}</span>
                <span className="block text-[11px] text-mist-400">{m.status === 'done' ? 'Done' : m.status === 'current' ? 'In progress' : 'Up next'} · {date(m.due)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

/* ---------------- Approvals ---------------- */

function SectionHead({ id, title, subtitle, action }: { id: string; title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id={`${id}-h`} className="text-[24px] font-semibold tracking-[-0.03em]">{title}</h2>
        <p className="mt-1 text-[13px] text-mist-400">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

/** A gradient "artboard" with mock interface shapes drawn inside. */
function DesignFrame({ tone, variant = 0, large }: { tone: string; variant?: number; large?: boolean }) {
  const v = variant % 3;
  return (
    <div className={cx('relative overflow-hidden rounded-xl bg-gradient-to-br', tone, large ? 'aspect-[16/10]' : 'aspect-[4/3]')} aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_0%,rgba(255,255,255,0.25),transparent)]" />
      <div className={cx('absolute rounded-lg bg-ink-950/25 ring-1 ring-white/20 backdrop-blur-[2px]', large ? 'inset-[7%] p-[3.5%]' : 'inset-[9%] p-[5%]')}>
        <div className="flex items-center justify-between">
          <span className="h-[7%] min-h-1.5 w-[18%] rounded-full bg-white/80" />
          <span className="flex gap-[6%]" style={{ width: '34%' }}>{[0, 1, 2].map((i) => <span key={i} className="h-1.5 flex-1 rounded-full bg-white/40" />)}</span>
        </div>
        {v === 0 && (
          <div className="mt-[8%] grid h-[70%] grid-cols-[1.1fr_1fr] gap-[6%]">
            <div className="flex flex-col justify-center gap-[8%]">
              <span className="h-[14%] w-[90%] rounded bg-white/85" /><span className="h-[14%] w-[70%] rounded bg-white/85" />
              <span className="h-[6%] w-[80%] rounded-full bg-white/45" /><span className="h-[6%] w-[60%] rounded-full bg-white/45" />
              <span className="mt-[4%] h-[14%] w-[38%] rounded-full bg-ink-950/70" />
            </div>
            <div className="relative rounded-lg bg-white/25 ring-1 ring-white/30">
              <span className="absolute bottom-[12%] left-1/2 h-[55%] w-[46%] -translate-x-1/2 rounded-t-[40%] rounded-b-lg bg-white/60" />
              <span className="absolute bottom-[12%] left-[18%] h-[22%] w-[22%] rounded-full bg-white/35" />
            </div>
          </div>
        )}
        {v === 1 && (
          <div className="mt-[8%] flex h-[72%] flex-col gap-[7%]">
            <span className="h-[12%] w-[55%] self-center rounded bg-white/85" />
            <span className="h-[5%] w-[40%] self-center rounded-full bg-white/45" />
            <div className="grid flex-1 grid-cols-3 gap-[4%]">
              {[0, 1, 2].map((i) => <span key={i} className={cx('rounded-lg ring-1 ring-white/25', i === 1 ? 'bg-white/45' : 'bg-white/20')} />)}
            </div>
          </div>
        )}
        {v === 2 && (
          <div className="mt-[8%] grid h-[72%] grid-cols-[0.8fr_1.2fr] gap-[6%]">
            <div className="flex flex-col gap-[6%] rounded-lg bg-white/15 p-[8%]">
              {[0, 1, 2, 3, 4].map((i) => <span key={i} className={cx('h-[10%] rounded-full', i === 1 ? 'bg-white/80' : 'bg-white/35')} style={{ width: `${90 - i * 9}%` }} />)}
            </div>
            <div className="flex flex-col gap-[6%]">
              <span className="h-[40%] rounded-lg bg-white/40" />
              <div className="grid flex-1 grid-cols-2 gap-[6%]"><span className="rounded-lg bg-white/25" /><span className="rounded-lg bg-white/25" /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalsSection({ client, contactAuthor, approvals, projects }: { client: Client; contactAuthor: { name: string; photo?: string }; approvals: Approval[]; projects: Project[] }) {
  const pending = approvals.filter((a) => a.status === 'pending').sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const decided = approvals.filter((a) => a.status !== 'pending').sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return (
    <section id="approvals" aria-labelledby="approvals-h" className="scroll-mt-20">
      <SectionHead id="approvals" title="Approvals" subtitle={pending.length ? 'Take a look and let the studio know if it is good to go. Your feedback goes straight to the team.' : 'Nothing is waiting for your sign off right now.'} />
      <div className="space-y-5">
        {pending.length === 0 && (
          <div className="rounded-2xl bg-ink-900 ring-1 ring-white/[0.07]"><EmptyState icon={<CheckCircle2 className="size-5" />} title="You are all caught up" body="New designs will appear here as soon as the studio shares them." /></div>
        )}
        {pending.map((a) => <PendingApproval key={a.id} approval={a} client={client} author={contactAuthor} project={projects.find((p) => p.id === a.projectId)} />)}
      </div>
      {decided.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-mist-400">Previously reviewed</p>
          <ul className="space-y-2">{decided.map((a) => <DecidedApproval key={a.id} approval={a} project={projects.find((p) => p.id === a.projectId)} />)}</ul>
        </div>
      )}
    </section>
  );
}

function PendingApproval({ approval: a, client, author, project }: { approval: Approval; client: Client; author: { name: string; photo?: string }; project?: Project }) {
  const decide = useStore((s) => s.decideApproval);
  const notify = useStore((s) => s.notify);
  const toast = useStore((s) => s.toast);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<'idle' | 'changes'>('idle');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const taId = `ap-note-${a.id}`;
  const focusTa = () => document.getElementById(taId)?.focus();
  const previews = a.previews.length ? a.previews : ['from-ink-500 to-ink-700'];
  const optionName = (i: number) => (previews.length > 1 ? `Option ${String.fromCharCode(65 + i)}` : 'Design');

  useEffect(() => { if (mode === 'changes') focusTa(); }, [mode]);

  const approve = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    const comment = previews.length > 1 ? `Approved. Going with ${optionName(active)}.` : undefined;
    decide(a.id, 'approved', comment, author);
    notify('Approval received', `${author.name} approved ${a.title}${previews.length > 1 ? ` (${optionName(active)})` : ''}.`, `/app/approvals?id=${a.id}`);
  };
  const requestChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (note.trim().length < 4) { setErr('Add a short note so the team knows what to change.'); focusTa(); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    decide(a.id, 'changes', note.trim(), author);
    notify('Changes requested', `${author.name} requested changes on ${a.title}.`, `/app/approvals?id=${a.id}`);
  };

  return (
    <article className="overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-white/[0.07]" aria-labelledby={`ap-${a.id}`}>
      <div className="p-3 sm:p-4">
        <div className="relative">
          <DesignFrame tone={previews[active]} variant={active} large />
          <span className="absolute left-3 top-3 rounded-md bg-ink-950/60 px-2 py-1 text-[11px] font-semibold backdrop-blur">{optionName(active)} · v{a.version}</span>
          <button type="button" onClick={() => toast(`Opening ${a.title} in full screen`, 'info')} className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-ink-950/60 px-2 py-1 text-[11px] font-semibold backdrop-blur transition hover:bg-ink-950/80">
            <Eye className="size-3.5" />Full view
          </button>
        </div>
        {previews.length > 1 && (
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4" role="tablist" aria-label="Design options">
            {previews.map((p, i) => (
              <button key={i} type="button" role="tab" aria-selected={active === i} onClick={() => setActive(i)}
                className={cx('rounded-xl p-1 text-left ring-2 transition', active === i ? 'ring-amber' : 'ring-transparent hover:ring-white/20')}>
                <DesignFrame tone={p} variant={i} />
                <span className="mt-1.5 block px-1 pb-0.5 text-[11px] font-semibold text-mist-300">{optionName(i)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-white/[0.06] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h3 id={`ap-${a.id}`} className="text-[17px] font-semibold tracking-tight">{a.title}</h3><ApprovalStatusBadge status={a.status} /></div>
            <p className="mt-1 text-[13px] leading-relaxed text-mist-400">{a.description}</p>
            <p className="mt-2 text-[12px] text-mist-400">{project?.name ?? client.name} · Version {a.version} · shared {relative(a.submittedAt)}</p>
          </div>
          {mode === 'idle' && (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button onClick={() => setMode('changes')} disabled={busy} icon={<Undo2 className="size-4" />} className="h-10 px-4">Request changes</Button>
              <Button variant="primary" onClick={approve} disabled={busy} className="h-10 px-5" icon={busy ? <span className="size-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" /> : <Check className="size-4" />}>
                {previews.length > 1 ? `Approve ${optionName(active)}` : 'Approve'}
              </Button>
            </div>
          )}
        </div>
        {mode === 'changes' && (
          <form onSubmit={requestChanges} className="mt-5 animate-[pop-in_.25s_ease]">
            <Field label={`What would you like changed on ${optionName(active)}?`}>
              <Textarea id={taId} rows={4} value={note} onChange={(e) => { setNote(e.target.value); setErr(''); }}
                placeholder="For example: love the palette, but could the wordmark sit a little lower on the lid?"
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) requestChanges(e as unknown as FormEvent); }} />
            </Field>
            {err && <p role="alert" className="mt-1.5 text-[11px] font-medium text-orange-300">{err}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <span className="mr-auto text-[11px] text-mist-400">Ctrl + Enter to send</span>
              <Button variant="ghost" onClick={() => { setMode('idle'); setNote(''); setErr(''); }} disabled={busy}>Cancel</Button>
              <button type="submit" disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-cream px-4 text-[13px] font-semibold text-ink-950 transition hover:bg-white disabled:opacity-60">
                <Send className="size-4" />{busy ? 'Sending' : 'Send feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </article>
  );
}

function DecidedApproval({ approval: a, project }: { approval: Approval; project?: Project }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="overflow-hidden rounded-xl bg-ink-900 ring-1 ring-white/[0.06]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/[0.02]">
        <span className={cx('size-10 shrink-0 rounded-lg bg-gradient-to-br', a.previews[0])} aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{a.title}</span><span className="text-[12px] text-mist-400">{project?.name} · v{a.version}</span></span>
        <ApprovalStatusBadge status={a.status} />
        <ChevronDown className={cx('size-4 shrink-0 text-mist-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-white/[0.06] p-4 animate-[fade-in_.2s_ease]">
          <p className="text-[13px] text-mist-300">{a.description}</p>
          {a.comments.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {a.comments.map((c) => (
                <li key={c.id} className="flex gap-2.5 text-[13px]"><Avatar name={c.author} photo={c.photo} size={26} /><p><span className="font-semibold">{c.author}</span> <span className="text-[11px] text-mist-400">{relative(c.at)}</span><span className="block text-mist-300">{c.text}</span></p></li>
              ))}
            </ul>
          ) : <p className="mt-2 text-[12px] text-mist-400">No comments were left.</p>}
        </div>
      )}
    </li>
  );
}

/* ---------------- Invoices ---------------- */

function InvoicesSection({ client, contact, invoices, projects }: { client: Client; contact: Contact; invoices: Invoice[]; projects: Project[] }) {
  const toast = useStore((s) => s.toast);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const now = today();
  return (
    <section id="invoices" aria-labelledby="invoices-h" className="scroll-mt-20">
      <SectionHead id="invoices" title="Invoices" subtitle="Pay securely by card. Receipts are emailed automatically." />
      <div className="overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-white/[0.07]">
        {invoices.length === 0 ? (
          <EmptyState icon={<Receipt className="size-5" />} title="No invoices yet" body="Invoices from the studio will show up here." />
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {invoices.map((inv) => {
              const total = invoiceTotal(inv);
              const project = projects.find((p) => p.id === inv.projectId);
              const late = daysBetween(inv.due, now);
              const unpaid = inv.status === 'sent' || inv.status === 'overdue';
              return (
                <li key={inv.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <span className={cx('hidden size-10 shrink-0 place-items-center rounded-xl ring-1 sm:grid', unpaid ? 'bg-amber/10 text-amber ring-amber/20' : 'bg-white/[0.03] text-mist-400 ring-white/[0.07]')}><Receipt className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">{inv.number}<InvoiceStatusBadge status={inv.status} /></p>
                    <p className="mt-0.5 truncate text-[12px] text-mist-400">{inv.items[0]?.description}{project ? ` · ${project.name}` : ''}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="sm:text-right">
                      <p className="text-[15px] font-semibold tabular-nums">{money(total)}</p>
                      <p className={cx('text-[11px]', inv.status === 'overdue' ? 'text-orange-300' : 'text-mist-400')}>
                        {inv.status === 'paid' ? `Paid ${date(inv.paidAt ?? inv.due)}` : inv.status === 'overdue' || late > 0 ? `${late} days overdue` : `Due ${date(inv.due)}`}
                      </p>
                    </div>
                    {unpaid
                      ? <Button variant="primary" onClick={() => setPaying(inv)} icon={<CreditCard className="size-4" />}>Pay now</Button>
                      : <Button onClick={() => toast(`Receipt for ${inv.number} downloaded`)} icon={<Download className="size-4" />}>Receipt</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-mist-400"><ShieldCheck className="size-3.5" />Payments are processed by Stripe. {client.name} card details are never stored by the studio.</p>
      {paying && <PayModal invoice={paying} client={client} contact={contact} onClose={() => setPaying(null)} />}
    </section>
  );
}

const fmtCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const fmtExp = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d; };

function PayModal({ invoice, client, contact, onClose }: { invoice: Invoice; client: Client; contact: Contact; onClose: () => void }) {
  const setStatus = useStore((s) => s.setInvoiceStatus);
  const notify = useStore((s) => s.notify);
  const studio = useStore((s) => s.workspace.name);
  const total = invoiceTotal(invoice);
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState(contact.name);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'form' | 'processing' | 'done'>('form');

  const fillTest = () => { setCard('4242 4242 4242 4242'); setExp('12 / 28'); setCvc('123'); setName(contact.name); setErrors({}); };

  const pay = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (card.replace(/\s/g, '').length < 16) next.card = 'Enter the 16 digit card number.';
    const [mm, yy] = exp.split('/').map((x) => parseInt(x.trim(), 10));
    if (!mm || mm > 12 || yy === undefined || isNaN(yy)) next.exp = 'Use MM / YY.';
    if (cvc.length < 3) next.cvc = '3 or 4 digits.';
    if (name.trim().length < 2) next.name = 'Name as shown on the card.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setPhase('processing');
    await new Promise((r) => setTimeout(r, 1200));
    setStatus(invoice.id, 'paid');
    notify('Payment received', `${client.name} paid ${invoice.number} (${money(total)}) through the portal.`, `/app/invoices/view?id=${invoice.id}`);
    setPhase('done');
  };

  const err = (k: string) => errors[k] && <span role="alert" className="mt-1 block text-[11px] font-medium text-orange-300">{errors[k]}</span>;

  return (
    <Modal open onClose={phase === 'processing' ? () => {} : onClose} title={phase === 'done' ? 'Payment complete' : `Pay ${invoice.number}`} subtitle={phase === 'done' ? undefined : `To ${studio} · due ${dateLong(invoice.due)}`}>
      {phase === 'done' ? (
        <div className="flex flex-col items-center py-4 text-center" role="status">
          <span className="grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25 animate-[pop-in_.35s_ease]"><Check className="size-7" strokeWidth={3} /></span>
          <p className="mt-5 text-[26px] font-semibold tracking-tight tabular-nums">{money(total)}</p>
          <p className="mt-1 text-[13px] text-mist-300">Thank you, {contact.name.split(' ')[0]}. {invoice.number} is paid.</p>
          <p className="mt-1 text-[12px] text-mist-400">A receipt is on its way to {contact.email}.</p>
          <div className="mt-6 w-full rounded-xl bg-ink-850 p-4 text-left text-[12px] ring-1 ring-white/[0.06]">
            <div className="flex justify-between py-1"><span className="text-mist-400">Paid to</span><span className="font-medium">{studio}</span></div>
            <div className="flex justify-between py-1"><span className="text-mist-400">Card</span><span className="font-medium">Visa ending {card.replace(/\s/g, '').slice(-4) || '4242'}</span></div>
            <div className="flex justify-between py-1"><span className="text-mist-400">Date</span><span className="font-medium">{dateLong(today())}</span></div>
          </div>
          <Button variant="primary" className="mt-5 w-full" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={pay} noValidate className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-ink-850 px-4 py-3 ring-1 ring-white/[0.06]">
            <span className="text-[12px] text-mist-400">Amount due</span>
            <span className="text-[20px] font-semibold tabular-nums">{money(total)}</span>
          </div>
          <button type="button" onClick={fillTest} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2 text-[12px] font-semibold text-amber-soft transition hover:border-amber/40 hover:bg-amber/[0.05]">
            <Sparkles className="size-3.5" />Use test card
          </button>
          <Field label="Card number">
            <div className="relative">
              <CreditCard className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist-400" />
              <Input className="h-10 pl-9 font-mono tracking-wider tabular-nums" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" value={card}
                onChange={(e) => setCard(fmtCard(e.target.value))} aria-invalid={!!errors.card || undefined} />
            </div>
            {err('card')}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry">
              <Input className="h-10 font-mono tabular-nums" inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY" value={exp} onChange={(e) => setExp(fmtExp(e.target.value))} aria-invalid={!!errors.exp || undefined} />
              {err('exp')}
            </Field>
            <Field label="CVC">
              <Input className="h-10 font-mono tabular-nums" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} aria-invalid={!!errors.cvc || undefined} />
              {err('cvc')}
            </Field>
          </div>
          <Field label="Name on card">
            <Input className="h-10" autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name || undefined} />
            {err('name')}
          </Field>
          <button type="submit" disabled={phase === 'processing'} aria-busy={phase === 'processing'}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber text-[14px] font-semibold text-ink-950 transition hover:bg-amber-soft disabled:cursor-wait disabled:opacity-80">
            {phase === 'processing' ? <><span className="size-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />Processing payment</> : <><Lock className="size-4" />Pay {money(total)}</>}
          </button>
          <p className="text-center text-[11px] text-mist-400">Demo checkout. No real card is charged.</p>
        </form>
      )}
    </Modal>
  );
}

/* ---------------- Files ---------------- */

const fileIcon: Record<ProjectFile['kind'], ReactNode> = {
  pdf: <FileText className="size-4" />, image: <FileImage className="size-4" />, doc: <File className="size-4" />, zip: <FileArchive className="size-4" />, fig: <Shapes className="size-4" />,
};
const fileTone: Record<ProjectFile['kind'], string> = {
  pdf: 'bg-red-500/10 text-red-300 ring-red-400/20', image: 'bg-sky-500/10 text-sky-300 ring-sky-400/20', doc: 'bg-white/[0.04] text-mist-300 ring-white/10',
  zip: 'bg-amber/10 text-amber-soft ring-amber/20', fig: 'bg-violet-500/10 text-violet-300 ring-violet-400/20',
};

function FilesSection({ files }: { files: (ProjectFile & { project: Project })[] }) {
  const toast = useStore((s) => s.toast);
  return (
    <section id="files" aria-labelledby="files-h" className="scroll-mt-20">
      <SectionHead id="files" title="Files" subtitle="Everything the studio has shared with you, newest first."
        action={files.length > 1 ? <Button size="sm" onClick={() => toast(`Preparing ${files.length} files as a zip`, 'info')} icon={<Download className="size-3.5" />}>Download all</Button> : undefined} />
      {files.length === 0 ? (
        <div className="rounded-2xl bg-ink-900 ring-1 ring-white/[0.07]"><EmptyState icon={<FileText className="size-5" />} title="No files shared yet" body="Moodboards, exports and final assets will be collected here." /></div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-ink-900 p-4 ring-1 ring-white/[0.07] transition hover:ring-white/15">
              <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl ring-1', fileTone[f.kind])}>{fileIcon[f.kind]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{f.name}</span>
                <span className="block truncate text-[12px] text-mist-400">{f.project.name} · {f.size} · {date(f.addedAt)}</span>
              </span>
              <button type="button" onClick={() => toast(`Downloading ${f.name}`)} aria-label={`Download ${f.name}`}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-mist-300 ring-1 ring-white/10 transition hover:bg-white/[0.06] hover:text-white"><Download className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Messages ---------------- */

function MessagesSection({ client, contact, threads, lead }: { client: Client; contact: Contact; threads: Thread[]; lead?: { name: string; photo: string } }) {
  const sendMessage = useStore((s) => s.sendMessage);
  const notify = useStore((s) => s.notify);
  const toast = useStore((s) => s.toast);
  const studio = useStore((s) => s.workspace.name);
  const [activeId, setActiveId] = useState<string | undefined>(threads[0]?.id);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const thread = threads.find((t) => t.id === activeId) ?? threads[0];

  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [thread?.id, thread?.messages.length]);

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    const who = { name: contact.name, photo: contact.photo };
    let id = thread?.id;
    if (!id) {
      id = uid('th');
      const newId = id;
      useStore.getState().update((s) => ({
        threads: [{ id: newId, clientId: client.id, subject: `Message from ${client.name}`, unread: 1, messages: [{ id: uid('mg'), from: who.name, photo: who.photo, mine: false, text: body, at: new Date().toISOString() }] }, ...s.threads],
      }));
      setActiveId(newId);
    } else {
      sendMessage(id, body, who);
      const tid = id;
      useStore.getState().update((s) => ({ threads: s.threads.map((t) => (t.id === tid ? { ...t, unread: t.unread + 1 } : t)) }));
    }
    notify(`New message from ${contact.name}`, body.length > 80 ? `${body.slice(0, 77)}...` : body, `/app/messages?thread=${id}`);
    toast(`Message sent to ${studio}`);
    setText('');
  };

  return (
    <section id="messages" aria-labelledby="messages-h" className="scroll-mt-20">
      <SectionHead id="messages" title="Messages" subtitle={`Talk to the ${studio} team directly. Everyone on your project sees these.`} />
      <div className="overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-white/[0.07]">
        {threads.length > 1 && (
          <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] p-2 [scrollbar-width:none]" role="tablist" aria-label="Conversations">
            {threads.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={thread?.id === t.id} onClick={() => setActiveId(t.id)}
                className={cx('whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition', thread?.id === t.id ? 'bg-white/[0.08] text-white' : 'text-mist-400 hover:text-white')}>{t.subject}</button>
            ))}
          </div>
        )}
        {thread && (
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5">
            <MessageSquare className="size-4 text-mist-400" />
            <p className="flex-1 truncate text-[13px] font-semibold">{thread.subject}</p>
            <span className="text-[11px] text-mist-400">{thread.messages.length} message{thread.messages.length === 1 ? '' : 's'}</span>
          </div>
        )}
        <div ref={listRef} className="scrollbar-thin max-h-[460px] min-h-[220px] space-y-5 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite">
          {!thread && (
            <div className="flex flex-col items-center py-8 text-center">
              {lead ? <Avatar name={lead.name} photo={lead.photo} size={44} /> : <StudioMark size={44} />}
              <p className="mt-4 text-[14px] font-semibold">Start a conversation</p>
              <p className="mt-1 max-w-xs text-[13px] text-mist-400">Questions, ideas or a quick hello. {lead ? lead.name.split(' ')[0] : 'The team'} will get back to you here.</p>
            </div>
          )}
          {thread?.messages.map((m, i) => {
            const fromClient = !m.mine;
            const prev = thread.messages[i - 1];
            const showDay = !prev || prev.at.slice(0, 10) !== m.at.slice(0, 10);
            return (
              <div key={m.id}>
                {showDay && <p className="mb-4 text-center text-[11px] font-medium text-mist-400">{dateLong(m.at)}</p>}
                <div className={cx('flex items-end gap-2.5', fromClient && 'flex-row-reverse')}>
                  <Avatar name={m.from} photo={m.photo} size={28} />
                  <div className={cx('max-w-[78%] sm:max-w-[65%]', fromClient && 'text-right')}>
                    <p className="mb-1 text-[11px] text-mist-400"><span className="font-semibold text-mist-300">{fromClient ? (m.from === contact.name ? 'You' : m.from) : m.from}</span> · {time(m.at)}</p>
                    <p className={cx('inline-block whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-[13px] leading-relaxed', fromClient ? 'rounded-br-md bg-cream text-ink-950' : 'rounded-bl-md bg-ink-800 text-mist-200 ring-1 ring-white/[0.06]')}>{m.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={send} className="flex items-end gap-2 border-t border-white/[0.06] p-3 sm:p-4">
          <Avatar name={contact.name} photo={contact.photo} size={32} className="mb-0.5 hidden sm:inline-grid" />
          <label className="sr-only" htmlFor="portal-composer">Message to {studio}</label>
          <Textarea id="portal-composer" rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Write to ${studio}`}
            className="max-h-40 min-h-10 flex-1 resize-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <Button type="submit" variant="primary" className="h-10" disabled={!text.trim()} aria-label="Send message" icon={<Send className="size-4" />}><span className="hidden sm:inline">Send</span></Button>
        </form>
        <p className="px-4 pb-3 text-[11px] text-mist-400 sm:px-5">Enter to send, Shift + Enter for a new line.</p>
      </div>
    </section>
  );
}
