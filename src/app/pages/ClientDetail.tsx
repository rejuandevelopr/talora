import { useState } from 'react';
import { ArrowUpRight, CalendarDays, Clock, Copy, ExternalLink, FolderKanban, Globe, Mail, MapPin, MessageSquare, Plus, Receipt, UserPlus, Users, Wallet, AlertCircle } from 'lucide-react';
import { useStore, invoiceTotal, projectProgress } from '../lib/store';
import { cx, date, dateLong, daysBetween, getParam, hours, money, relative, today } from '../lib/format';
import type { Client, Contact } from '../lib/types';
import {
  Avatar, AvatarStack, Button, Card, CardHeader, ClientLogo, EmptyState, Field, HealthBadge, Input, InvoiceStatusBadge, Modal,
  PageHeader, Progress, ProjectStatusBadge, Select, Stat, Tabs, Textarea,
} from '../ui/ui';
import { ClientStatusBadge, NewProjectModal } from '../ui/work';

type TabKey = 'overview' | 'projects' | 'invoices' | 'contacts' | 'notes';

export default function ClientDetail() {
  const [id] = useState(() => getParam('id') ?? '');
  const s = useStore();
  const client = s.clients.find((c) => c.id === id);
  const [tab, setTab] = useState<TabKey>('overview');
  const [projectOpen, setProjectOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  if (!client) {
    return (
      <Card>
        <EmptyState icon={<Users className="size-5" />} title="Client not found" body="This client may have been removed, or the link is incomplete."
          action={<Button href="/app/clients" variant="primary">Back to clients</Button>} />
      </Card>
    );
  }

  const now = today();
  const projects = s.projects.filter((p) => p.clientId === client.id);
  const active = projects.filter((p) => p.status !== 'done');
  const invoices = s.invoices.filter((i) => i.clientId === client.id).sort((a, b) => b.issued.localeCompare(a.issued));
  const billed = invoices.filter((i) => i.status !== 'draft').reduce((a, i) => a + invoiceTotal(i), 0);
  const outstandingInv = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue');
  const outstanding = outstandingInv.reduce((a, i) => a + invoiceTotal(i), 0);
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const projectIds = new Set(projects.map((p) => p.id));
  const minutes = s.timeEntries.filter((e) => projectIds.has(e.projectId)).reduce((a, e) => a + e.minutes, 0);
  const activity = s.activity.filter((a) => a.text.includes(client.name) || a.actor === client.name || client.contacts.some((c) => c.name === a.actor) || projects.some((p) => a.text.includes(p.name))).slice(0, 6);
  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/portal?client=${client.id}` : `/portal?client=${client.id}`;

  const message = () => {
    const contact = client.contacts[0]?.name.split(' ')[0];
    const threadId = s.startThread(client.id, `Hello from ${s.workspace.name}`, `Hi${contact ? ` ${contact}` : ''}, just checking in on how things are going on your side. Anything you need from us this week?`);
    window.location.href = `/app/messages?thread=${threadId}`;
  };

  const copyPortal = async () => {
    try { await navigator.clipboard.writeText(portalUrl); s.toast('Portal link copied'); }
    catch { s.toast('Could not copy. Select the link and copy it manually.', 'error'); }
  };

  const changeStatus = (status: Client['status']) => {
    s.updateClient(client.id, { status });
    s.log({ actor: s.members.find((m) => m.id === s.meId)!.name, photo: s.members.find((m) => m.id === s.meId)!.photo, text: `set ${client.name} to ${status}`, kind: 'client' });
    s.toast(`${client.name} marked as ${status === 'lead' ? 'a lead' : status}`);
  };

  const websiteHref = client.website ? (client.website.startsWith('http') ? client.website : `https://${client.website}`) : '';

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/app/clients', label: 'Clients' }}
        title={
          <span className="flex items-center gap-4">
            <ClientLogo client={client} size={52} />
            <span className="min-w-0 truncate">{client.name}</span>
          </span>
        }
        subtitle={
          <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span>{client.industry}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{client.location}</span>
            {client.website && <a href={websiteHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white"><Globe className="size-3.5" />{client.website}</a>}
            <ClientStatusBadge status={client.status} />
          </span>
        }
        actions={<>
          <label className="sr-only" htmlFor="client-status">Client status</label>
          <Select id="client-status" value={client.status} onChange={(e) => changeStatus(e.target.value as Client['status'])} className="w-[130px]">
            <option value="active">Active</option>
            <option value="lead">Lead</option>
            <option value="archived">Archived</option>
          </Select>
          <Button icon={<MessageSquare className="size-4" />} onClick={message}>Message</Button>
          <Button icon={<ExternalLink className="size-4" />} onClick={() => window.open(`/portal?client=${client.id}`, '_blank', 'noopener')}>Open portal</Button>
          <Button href={`/app/invoices/new?client=${client.id}`} icon={<Receipt className="size-4" />}>New invoice</Button>
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setProjectOpen(true)}>New project</Button>
        </>}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Lifetime billed" value={money(billed)} delta={`${invoices.filter((i) => i.status !== 'draft').length} invoices issued`} icon={<Wallet className="size-4" />} />
        <Stat label="Outstanding" value={money(outstanding)} delta={overdueCount ? `${overdueCount} overdue` : outstanding ? 'Within terms' : 'All settled'} tone={overdueCount ? 'down' : 'neutral'} icon={<AlertCircle className="size-4" />} />
        <Stat label="Active projects" value={active.length} delta={`${projects.length} total`} icon={<FolderKanban className="size-4" />} />
        <Stat label="Hours logged" value={hours(minutes)} delta="All projects, all time" icon={<Clock className="size-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Tabs<TabKey>
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'overview', label: 'Overview' },
              { value: 'projects', label: 'Projects', count: projects.length },
              { value: 'invoices', label: 'Invoices', count: invoices.length },
              { value: 'contacts', label: 'Contacts', count: client.contacts.length },
              { value: 'notes', label: 'Notes' },
            ]}
          />

          {tab === 'overview' && (
            <div className="space-y-4">
              <Card>
                <CardHeader title="Projects" subtitle={`${active.length} active`} action={<Button size="sm" variant="ghost" onClick={() => setTab('projects')}>View all <ArrowUpRight className="size-3.5" /></Button>} />
                <ProjectRows projects={active.length ? active : projects.slice(0, 3)} onNew={() => setProjectOpen(true)} />
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Recent invoices" subtitle={outstanding ? `${money(outstanding)} outstanding` : 'Nothing outstanding'} action={<Button size="sm" variant="ghost" onClick={() => setTab('invoices')}>All <ArrowUpRight className="size-3.5" /></Button>} />
                  <ul className="divide-y divide-white/[0.05] px-5 pb-2 pt-2">
                    {invoices.length === 0 && <li className="py-6 text-center text-[13px] text-mist-400">No invoices yet.</li>}
                    {invoices.slice(0, 4).map((i) => (
                      <li key={i.id}>
                        <a href={`/app/invoices/view?id=${i.id}`} className="flex items-center gap-3 py-3">
                          <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold hover:underline">{i.number}</span><span className="text-[12px] text-mist-400">Issued {date(i.issued)} · due {date(i.due)}</span></span>
                          <span className="text-right"><span className="block text-[13px] font-semibold tabular-nums">{money(invoiceTotal(i))}</span><InvoiceStatusBadge status={i.status} /></span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card>
                  <CardHeader title="Recent activity" subtitle="Across this account" />
                  <ul className="space-y-4 p-5">
                    {activity.length === 0 && <li className="py-2 text-center text-[13px] text-mist-400">No activity yet. It will appear as you work.</li>}
                    {activity.map((a) => (
                      <li key={a.id} className="flex gap-3 text-[13px]">
                        {a.photo ? <Avatar name={a.actor} photo={a.photo} size={28} /> : <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-mist-300">{a.actor[0]}</span>}
                        <p className="flex-1 leading-snug"><span className="font-semibold">{a.actor}</span> <span className="text-mist-300">{a.text}</span><span className="block text-[11px] text-mist-400">{relative(a.at)}</span></p>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {tab === 'projects' && (
            <Card>
              <CardHeader title="All projects" subtitle={`${projects.length} for ${client.name}`} action={<Button size="sm" variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setProjectOpen(true)}>New project</Button>} />
              <ProjectRows projects={projects} onNew={() => setProjectOpen(true)} showStatus />
            </Card>
          )}

          {tab === 'invoices' && (
            <Card>
              <CardHeader title="Invoices" subtitle={`${money(billed)} billed, ${money(outstanding)} outstanding`} action={<Button size="sm" variant="primary" href={`/app/invoices/new?client=${client.id}`} icon={<Plus className="size-3.5" />}>New invoice</Button>} />
              {invoices.length === 0 ? (
                <EmptyState icon={<Receipt className="size-5" />} title="No invoices yet" body="Bill a milestone or a retainer and it will show up here." action={<Button size="sm" href={`/app/invoices/new?client=${client.id}`}>Create invoice</Button>} />
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-[13px]">
                    <thead className="text-[11px] uppercase tracking-wider text-mist-400"><tr className="border-b border-white/[0.06]"><th className="px-5 py-2.5 font-medium">Invoice</th><th className="px-3 py-2.5 font-medium">Project</th><th className="px-3 py-2.5 font-medium">Issued</th><th className="px-3 py-2.5 font-medium">Due</th><th className="px-3 py-2.5 text-right font-medium">Amount</th><th className="px-5 py-2.5 font-medium">Status</th></tr></thead>
                    <tbody>
                      {invoices.map((i) => {
                        const p = s.projects.find((x) => x.id === i.projectId);
                        return (
                          <tr key={i.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                            <td className="px-5 py-3"><a href={`/app/invoices/view?id=${i.id}`} className="font-semibold hover:underline">{i.number}</a></td>
                            <td className="px-3 py-3 text-mist-300">{p ? p.name : <span className="text-mist-400">General</span>}</td>
                            <td className="px-3 py-3 text-mist-300">{dateLong(i.issued)}</td>
                            <td className="px-3 py-3 text-mist-300">{dateLong(i.due)}</td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(invoiceTotal(i))}</td>
                            <td className="px-5 py-3"><InvoiceStatusBadge status={i.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {tab === 'contacts' && (
            <div className="space-y-3">
              <div className="flex justify-end"><Button size="sm" icon={<UserPlus className="size-3.5" />} onClick={() => setContactOpen(true)}>Add contact</Button></div>
              {client.contacts.length === 0 ? (
                <Card><EmptyState icon={<Users className="size-5" />} title="No contacts yet" body="Add the people you work with so they can be invited to the portal." action={<Button size="sm" variant="primary" onClick={() => setContactOpen(true)}>Add contact</Button>} /></Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {client.contacts.map((c, idx) => (
                    <Card key={c.email + idx} className="flex items-start gap-3 p-4">
                      <Avatar name={c.name} photo={c.photo} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold">{c.name}{idx === 0 && <span className="ml-2 rounded-md bg-amber/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-soft">Primary</span>}</p>
                        <p className="text-[12px] text-mist-400">{c.role}</p>
                        {c.email && <a href={`mailto:${c.email}`} className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-mist-300 hover:text-white"><Mail className="size-3.5" />{c.email}</a>}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'notes' && <NotesCard client={client} />}
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="text-[14px] font-semibold">Client portal</h2><span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" />Live</span></div>
            <p className="mt-1 text-[12px] text-mist-400">Approvals, invoices and files in one branded link.</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-850 px-3 py-2 ring-1 ring-white/[0.06]">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-mist-300">{portalUrl.replace(/^https?:\/\//, '')}</span>
              <button type="button" onClick={copyPortal} aria-label="Copy portal link" className="grid size-7 shrink-0 place-items-center rounded-md text-mist-300 hover:bg-white/5 hover:text-white"><Copy className="size-3.5" /></button>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1" onClick={copyPortal} icon={<Copy className="size-3.5" />}>Copy link</Button>
              <Button size="sm" className="flex-1" onClick={() => window.open(`/portal?client=${client.id}`, '_blank', 'noopener')} icon={<ExternalLink className="size-3.5" />}>Preview</Button>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="text-[14px] font-semibold">Contacts</h2><button type="button" onClick={() => setContactOpen(true)} className="grid size-7 place-items-center rounded-md text-mist-400 hover:bg-white/5 hover:text-white" aria-label="Add contact"><UserPlus className="size-4" /></button></div>
            <ul className="mt-3 space-y-3">
              {client.contacts.length === 0 && <li className="text-[12px] text-mist-400">No contacts yet.</li>}
              {client.contacts.map((c, idx) => (
                <li key={c.email + idx} className="flex items-center gap-3">
                  <Avatar name={c.name} photo={c.photo} size={30} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{c.name}</span><span className="block truncate text-[11px] text-mist-400">{c.role}</span></span>
                  {c.email && <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} className="grid size-7 place-items-center rounded-md text-mist-400 hover:bg-white/5 hover:text-white"><Mail className="size-3.5" /></a>}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold">Details</h2>
            <dl className="mt-3 space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="inline-flex items-center gap-1.5 text-mist-400"><CalendarDays className="size-3.5" />Client since</dt><dd>{dateLong(client.since)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-mist-400">Relationship</dt><dd>{relationship(client.since, now)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-mist-400">Portal slug</dt><dd className="font-mono text-[12px] text-mist-300">{client.portalSlug}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-mist-400">Payment terms</dt><dd>Net {s.workspace.paymentTerms}</dd></div>
            </dl>
          </Card>
        </aside>
      </div>

      <NewProjectModal open={projectOpen} onClose={() => setProjectOpen(false)} defaultClientId={client.id} />
      <AddContactModal open={contactOpen} onClose={() => setContactOpen(false)} client={client} />
    </div>
  );
}

function relationship(since: string, now: string) {
  const days = daysBetween(since, now);
  if (days < 31) return days <= 1 ? 'New this week' : `${days} days`;
  const months = Math.floor(days / 30.4);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} ${y === 1 ? 'year' : 'years'}${m ? `, ${m} mo` : ''}`;
}

function ProjectRows({ projects, onNew, showStatus }: { projects: ReturnType<typeof useStore.getState>['projects']; onNew: () => void; showStatus?: boolean }) {
  const members = useStore((s) => s.members);
  const now = today();
  if (projects.length === 0) {
    return <EmptyState icon={<FolderKanban className="size-5" />} title="No projects yet" body="Kick off the first project for this client." action={<Button size="sm" variant="primary" onClick={onNew}>New project</Button>} />;
  }
  return (
    <ul className="space-y-2 p-5 pt-4">
      {projects.map((p) => {
        const prog = projectProgress(p);
        const left = daysBetween(now, p.due);
        return (
          <li key={p.id}>
            <a href={`/app/projects/view?id=${p.id}`} className="flex flex-col gap-3 rounded-xl bg-ink-850 p-3.5 ring-1 ring-white/[0.05] transition hover:ring-white/15 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className="truncate text-[13px] font-semibold">{p.name}</span>{showStatus && <ProjectStatusBadge status={p.status} />}</span>
                <span className="text-[12px] text-mist-400">{money(p.budget)} · due {date(p.due)}{p.status !== 'done' && <span className={cx(left < 7 && 'text-orange-300')}> · {left >= 0 ? `${left} days left` : `${-left} days late`}</span>}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-2"><Progress value={prog} className="w-24" tone={p.status === 'done' ? 'green' : 'amber'} /><span className="w-8 text-[12px] tabular-nums text-mist-300">{prog}%</span></span>
                <AvatarStack people={p.memberIds.map((id) => members.find((m) => m.id === id)!).filter(Boolean)} size={24} />
                <HealthBadge health={p.health} />
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function NotesCard({ client }: { client: Client }) {
  const updateClient = useStore((s) => s.updateClient);
  const toast = useStore((s) => s.toast);
  const [text, setText] = useState(client.notes);
  const dirty = text !== client.notes;
  return (
    <Card>
      <CardHeader title="Notes" subtitle="Private to your team. Clients never see these." />
      <div className="p-5 pt-4">
        <label htmlFor="client-notes" className="sr-only">Client notes</label>
        <Textarea id="client-notes" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Preferences, decision makers, billing quirks, things to remember before the next call..." />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[12px] text-mist-400">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <div className="flex gap-2">
            {dirty && <Button size="sm" variant="ghost" onClick={() => setText(client.notes)}>Discard</Button>}
            <Button size="sm" variant="primary" disabled={!dirty} onClick={() => { updateClient(client.id, { notes: text }); toast('Notes saved'); }}>Save notes</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AddContactModal({ open, onClose, client }: { open: boolean; onClose: () => void; client: Client }) {
  const updateClient = useStore((s) => s.updateClient);
  const toast = useStore((s) => s.toast);
  const [f, setF] = useState<Contact>({ name: '', email: '', role: '' });
  const [error, setError] = useState('');
  const close = () => { setF({ name: '', email: '', role: '' }); setError(''); onClose(); };
  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!f.name.trim()) return setError('Add a name.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError('Add a valid email address.');
    updateClient(client.id, { contacts: [...client.contacts, { name: f.name.trim(), email: f.email.trim(), role: f.role.trim() || 'Team member' }] });
    toast(`${f.name.trim()} added to ${client.name}`);
    close();
  };
  return (
    <Modal open={open} onClose={close} title="Add contact" subtitle={`They can be invited to the ${client.name} portal.`}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" onClick={() => submit()}>Add contact</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Alex Moreno" /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder={`alex@${client.website || 'company.com'}`} /></Field>
        <Field label="Role"><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Marketing Manager" /></Field>
        {error && <p role="alert" className="text-[12px] text-orange-300">{error}</p>}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
