import { useEffect, useMemo, useState } from 'react';
import { Building2, FolderKanban, LayoutGrid, List, Plus, Sparkles, Users, Wallet } from 'lucide-react';
import { useStore, invoiceTotal } from '../lib/store';
import { cx, date, getParam, money } from '../lib/format';
import type { Client } from '../lib/types';
import { Avatar, Button, Card, ClientLogo, EmptyState, Field, Input, Modal, PageHeader, SearchInput, Segmented, Select, Stat, Tabs } from '../ui/ui';
import { ClientStatusBadge } from '../ui/work';

const TONES = [
  'from-amber to-ember',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-600',
  'from-violet-400 to-fuchsia-600',
  'from-rose-400 to-orange-500',
  'from-lime-300 to-green-600',
  'from-cyan-300 to-blue-600',
  'from-yellow-200 to-amber',
  'from-pink-300 to-rose-600',
];

type TabKey = 'all' | Client['status'];

export default function Clients() {
  const s = useStore();
  const [tab, setTab] = useState<TabKey>('all');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (getParam('new') === '1') { setOpen(true); window.history.replaceState(null, '', window.location.pathname); }
  }, []);

  const rows = useMemo(() => s.clients.map((c) => {
    const projects = s.projects.filter((p) => p.clientId === c.id);
    const billed = s.invoices.filter((i) => i.clientId === c.id && i.status !== 'draft').reduce((a, i) => a + invoiceTotal(i), 0);
    return { client: c, active: projects.filter((p) => p.status !== 'done').length, total: projects.length, billed };
  }), [s.clients, s.projects, s.invoices]);

  const counts = { all: s.clients.length, active: 0, lead: 0, archived: 0 } as Record<TabKey, number>;
  s.clients.forEach((c) => { counts[c.status] += 1; });

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter(({ client: c }) =>
    (tab === 'all' || c.status === tab) &&
    (!needle || [c.name, c.industry, c.location, c.website, ...c.contacts.map((x) => x.name)].some((v) => v.toLowerCase().includes(needle))));

  const lifetime = rows.reduce((a, r) => a + r.billed, 0);
  const avgProject = s.projects.length ? s.projects.reduce((a, p) => a + p.budget, 0) / s.projects.length : 0;
  const newThisQuarter = s.clients.filter((c) => c.since >= '2026-07-01').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle={`${counts.active} active relationships, ${counts.lead} open ${counts.lead === 1 ? 'lead' : 'leads'}`}
        actions={<>
          <Button href="/app/briefs" icon={<Sparkles className="size-4" />}>Brief a lead</Button>
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>New client</Button>
        </>}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Active clients" value={counts.active} delta={`${newThisQuarter} joined since July`} tone="up" icon={<Users className="size-4" />} />
        <Stat label="Leads" value={counts.lead} delta="Proposal stage" icon={<Building2 className="size-4" />} />
        <Stat label="Lifetime billed" value={money(lifetime)} delta="Sent and paid invoices" icon={<Wallet className="size-4" />} />
        <Stat label="Avg project value" value={money(Math.round(avgProject))} delta={`Across ${s.projects.length} projects`} icon={<FolderKanban className="size-4" />} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 px-5 pt-3 lg:flex-row lg:items-end lg:justify-between">
          <Tabs<TabKey>
            className="-mx-1 border-b-0 lg:mx-0"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'active', label: 'Active', count: counts.active },
              { value: 'lead', label: 'Leads', count: counts.lead },
              { value: 'archived', label: 'Archived', count: counts.archived },
            ]}
          />
          <div className="flex items-center gap-2 pb-3">
            <SearchInput value={q} onChange={setQ} placeholder="Search clients or contacts" className="min-w-0 flex-1 lg:w-64 lg:flex-none" />
            <Segmented<'table' | 'cards'>
              value={view}
              onChange={setView}
              options={[
                { value: 'table', label: <><List className="size-3.5" /><span className="hidden sm:inline">Table</span><span className="sr-only sm:hidden">Table view</span></> },
                { value: 'cards', label: <><LayoutGrid className="size-3.5" /><span className="hidden sm:inline">Cards</span><span className="sr-only sm:hidden">Cards view</span></> },
              ]}
            />
          </div>
        </div>
        <div className="border-t border-white/[0.06]" />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title={needle ? 'No clients match your search' : 'Nothing here yet'}
            body={needle ? `Nothing found for "${q}". Try a company, contact or city.` : 'Clients in this group will show up here.'}
            action={needle || tab !== 'all'
              ? <Button size="sm" onClick={() => { setQ(''); setTab('all'); }}>Clear filters</Button>
              : <Button size="sm" variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>New client</Button>}
          />
        ) : view === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-mist-400">
                <tr className="border-b border-white/[0.06]">
                  <th className="px-5 py-2.5 font-medium">Client</th>
                  <th className="px-3 py-2.5 font-medium">Primary contact</th>
                  <th className="px-3 py-2.5 font-medium">Active projects</th>
                  <th className="px-3 py-2.5 text-right font-medium">Billed</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Since</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ client: c, active, total, billed }) => {
                  const contact = c.contacts[0];
                  const href = `/app/clients/view?id=${c.id}`;
                  return (
                    <tr key={c.id} onClick={() => { window.location.href = href; }} className="cursor-pointer border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <a href={href} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                          <ClientLogo client={c} size={32} />
                          <span className="min-w-0"><span className="block font-semibold hover:underline">{c.name}</span><span className="text-[12px] text-mist-400">{c.industry}</span></span>
                        </a>
                      </td>
                      <td className="px-3 py-3">
                        {contact ? (
                          <span className="flex items-center gap-2.5"><Avatar name={contact.name} photo={contact.photo} size={26} /><span><span className="block">{contact.name}</span><span className="text-[11px] text-mist-400">{contact.role}</span></span></span>
                        ) : <span className="text-mist-400">No contact yet</span>}
                      </td>
                      <td className="px-3 py-3"><span className="font-semibold tabular-nums">{active}</span><span className="text-[12px] text-mist-400"> of {total}</span></td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{billed ? money(billed) : <span className="font-normal text-mist-400">None yet</span>}</td>
                      <td className="px-3 py-3"><ClientStatusBadge status={c.status} /></td>
                      <td className="px-5 py-3 text-mist-300">{date(c.since, { month: 'short', year: 'numeric' })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(({ client: c, active, total, billed }) => {
              const contact = c.contacts[0];
              return (
                <a key={c.id} href={`/app/clients/view?id=${c.id}`} className="group flex flex-col rounded-xl bg-ink-850 p-4 ring-1 ring-white/[0.05] transition hover:ring-white/15">
                  <div className="flex items-start gap-3">
                    <ClientLogo client={c} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold group-hover:underline">{c.name}</p>
                      <p className="truncate text-[12px] text-mist-400">{c.industry} · {c.location}</p>
                    </div>
                    <ClientStatusBadge status={c.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-white/[0.02] p-3 ring-1 ring-white/[0.04]">
                    <div><p className="text-[11px] text-mist-400">Active</p><p className="text-[14px] font-semibold tabular-nums">{active}<span className="text-[11px] font-normal text-mist-400"> / {total}</span></p></div>
                    <div><p className="text-[11px] text-mist-400">Billed</p><p className="text-[14px] font-semibold tabular-nums">{money(billed, 'USD', true)}</p></div>
                    <div><p className="text-[11px] text-mist-400">Since</p><p className="text-[14px] font-semibold">{date(c.since, { month: 'short', year: '2-digit' })}</p></div>
                  </div>
                  <div className="mt-3 flex items-center gap-2.5 text-[12px]">
                    {contact ? <><Avatar name={contact.name} photo={contact.photo} size={24} /><span className="min-w-0 flex-1 truncate"><span className="text-white">{contact.name}</span><span className="text-mist-400"> · {contact.role}</span></span></> : <span className="text-mist-400">No contact yet</span>}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </Card>

      <NewClientModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function NewClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addClient = useStore((s) => s.addClient);
  const blank = { name: '', industry: '', location: '', website: '', contactName: '', contactEmail: '', status: 'active' as Client['status'] };
  const [f, setF] = useState(blank);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setF(blank); setError(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof blank, v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!f.name.trim()) return setError('Add the company name.');
    if (f.contactEmail && !/^\S+@\S+\.\S+$/.test(f.contactEmail)) return setError('That email address does not look right.');
    const c = addClient({
      name: f.name.trim(),
      industry: f.industry.trim() || 'General',
      location: f.location.trim() || 'Remote',
      website: f.website.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''),
      status: f.status,
      tone: TONES[Math.floor(Math.random() * TONES.length)],
      contacts: f.contactName.trim() ? [{ name: f.contactName.trim(), email: f.contactEmail.trim(), role: 'Primary contact' }] : [],
      notes: '',
    });
    onClose();
    window.location.href = `/app/clients/view?id=${c.id}`;
  };

  return (
    <Modal open={open} onClose={onClose} title="New client" subtitle="They get their own portal as soon as you create them." wide
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => submit()}>Create client</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Harbor Coffee Roasters" /></Field>
        <Field label="Industry"><Input value={f.industry} onChange={(e) => set('industry', e.target.value)} placeholder="Food & beverage" /></Field>
        <Field label="Location"><Input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="Portland, US" /></Field>
        <Field label="Website"><Input value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="harborcoffee.com" /></Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Active client</option>
            <option value="lead">Lead</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <Field label="Contact name"><Input value={f.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Jordan Lee" /></Field>
        <Field label="Contact email"><Input type="email" value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="jordan@harborcoffee.com" /></Field>
        {error && <p role="alert" className={cx('text-[12px] text-orange-300 sm:col-span-2')}>{error}</p>}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
