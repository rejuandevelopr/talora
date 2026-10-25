import { useEffect, useState, type ReactNode } from 'react';
import { Bell, Building2, Check, CreditCard, Download, KeyRound, Plug, RotateCcw, Trash2, User, UserPlus, Users } from 'lucide-react';
import { useStore, uid } from '../lib/store';
import { cx, dateLong, getParam, money } from '../lib/format';
import type { Member, Workspace } from '../lib/types';
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Modal, PageHeader, Progress, Segmented, Select, Toggle, useMe } from '../ui/ui';

type Tab = 'profile' | 'workspace' | 'team' | 'billing' | 'notifications' | 'integrations';
const TABS: { value: Tab; label: string; icon: ReactNode }[] = [
  { value: 'profile', label: 'Profile', icon: <User className="size-4" /> },
  { value: 'workspace', label: 'Workspace', icon: <Building2 className="size-4" /> },
  { value: 'team', label: 'Team', icon: <Users className="size-4" /> },
  { value: 'billing', label: 'Billing', icon: <CreditCard className="size-4" /> },
  { value: 'notifications', label: 'Notifications', icon: <Bell className="size-4" /> },
  { value: 'integrations', label: 'Integrations', icon: <Plug className="size-4" /> },
];

const TIMEZONES = ['Asia/Dhaka', 'Europe/London', 'Europe/Lisbon', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'America/Toronto', 'Asia/Singapore', 'Australia/Sydney'];

const setWorkspace = (patch: Partial<Workspace>) => useStore.getState().update((s) => ({ workspace: { ...s.workspace, ...patch } }));

export default function Settings() {
  const [tab, setTab] = useState<Tab>('profile');
  useEffect(() => {
    const t = getParam('tab') as Tab | null;
    if (t && TABS.some((x) => x.value === t)) setTab(t);
  }, []);
  const go = (t: Tab) => { setTab(t); history.replaceState(null, '', `/app/settings?tab=${t}`); };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile, studio workspace, team and billing." />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
          <ul className="flex gap-1 lg:sticky lg:top-24 lg:flex-col">
            {TABS.map((t) => (
              <li key={t.value}>
                <button onClick={() => go(t.value)} aria-current={tab === t.value ? 'page' : undefined}
                  className={cx('flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition', tab === t.value ? 'bg-white/[0.07] text-white' : 'text-mist-300 hover:bg-white/[0.04] hover:text-white')}>
                  <span className={tab === t.value ? 'text-amber-soft' : 'text-mist-400'}>{t.icon}</span>{t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-4">
          {tab === 'profile' && <Profile />}
          {tab === 'workspace' && <WorkspaceTab />}
          {tab === 'team' && <Team />}
          {tab === 'billing' && <Billing />}
          {tab === 'notifications' && <Notifications />}
          {tab === 'integrations' && <Integrations />}
        </div>
      </div>
    </div>
  );
}

function SaveBar({ onSave, disabled, label = 'Save changes' }: { onSave: () => void; disabled?: boolean; label?: string }) {
  return <div className="flex justify-end border-t border-white/[0.06] px-5 py-3.5"><Button variant="primary" onClick={onSave} disabled={disabled}>{label}</Button></div>;
}

/* ---------- Profile ---------- */
function Profile() {
  const me = useMe();
  const s = useStore();
  const [f, setF] = useState({ name: me.name, email: me.email, title: me.title, timezone: s.workspace.timezone });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const dirty = f.name !== me.name || f.email !== me.email || f.title !== me.title || f.timezone !== s.workspace.timezone;

  const save = () => {
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) { s.toast('Enter a valid name and email', 'error'); return; }
    s.update((st) => ({
      members: st.members.map((m) => (m.id === st.meId ? { ...m, name: f.name.trim(), email: f.email.trim(), title: f.title.trim() } : m)),
      session: { name: f.name.trim(), email: f.email.trim() },
      workspace: { ...st.workspace, timezone: f.timezone },
    }));
    s.toast('Profile updated');
  };

  const changePw = () => {
    if (!pw.current) return setPwError('Enter your current password.');
    if (pw.next.length < 8) return setPwError('New password must be at least 8 characters.');
    if (pw.next !== pw.confirm) return setPwError('The new passwords do not match.');
    setPwError('');
    setPw({ current: '', next: '', confirm: '' });
    s.toast('Password updated');
  };

  return (<>
    <Card>
      <CardHeader title="Profile" subtitle="How you appear to your team and clients." />
      <div className="p-5">
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={me.name} photo={me.photo} size={64} />
          <div>
            <p className="text-[14px] font-semibold">{me.name}</p>
            <p className="text-[12px] text-mist-400">{me.role} · {me.title}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => s.toast('Demo: photo upload is simulated', 'info')}>Change photo</Button>
              <Button size="sm" variant="ghost" onClick={() => s.toast('Demo: your photo stays as is', 'info')}>Remove</Button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
          <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Timezone">
            <Select value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>
              {TIMEZONES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </Select>
          </Field>
        </div>
      </div>
      <SaveBar onSave={save} disabled={!dirty} />
    </Card>

    <Card>
      <CardHeader title="Password" subtitle="Use at least 8 characters. You will stay signed in on this device." />
      <form className="grid gap-4 p-5 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); changePw(); }}>
        <Field label="Current password"><Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></Field>
        <Field label="New password"><Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" /></Field>
        <Field label="Confirm new password"><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" /></Field>
        {pwError && <p role="alert" className="text-[12px] text-red-300 sm:col-span-3">{pwError}</p>}
        <div className="flex justify-end sm:col-span-3"><Button type="submit" icon={<KeyRound className="size-4" />}>Update password</Button></div>
      </form>
    </Card>
  </>);
}

/* ---------- Workspace ---------- */
const SWATCHES = ['#f4a64a', '#e0683a', '#38bdf8', '#818cf8', '#34d399', '#f472b6', '#a3e635', '#f5eee3'];

function WorkspaceTab() {
  const s = useStore();
  const w = s.workspace;
  const [f, setF] = useState({ name: w.name, slug: w.slug, brandColor: w.brandColor, currency: w.currency, invoicePrefix: w.invoicePrefix, paymentTerms: w.paymentTerms });
  const [resetOpen, setResetOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const dirty = (Object.keys(f) as (keyof typeof f)[]).some((k) => f[k] !== w[k]);

  const save = () => {
    if (!f.name.trim() || !f.slug.trim()) { s.toast('Studio name and slug are required', 'error'); return; }
    setWorkspace({ ...f, name: f.name.trim(), invoicePrefix: f.invoicePrefix.trim().toUpperCase() || 'INV' });
    s.toast('Workspace settings saved');
  };

  return (<>
    <Card>
      <CardHeader title="Studio" subtitle="Shown on invoices, emails and your client portal." />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Studio name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Portal slug" hint={`portal.talora.app/${f.slug || 'your-studio'}`}>
          <Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
        </Field>
      </div>
    </Card>

    <Card>
      <CardHeader title="Brand" subtitle="Your accent color in the client portal and on invoices." />
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="mb-2 text-[12px] font-medium text-mist-300">Brand color</p>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button key={c} onClick={() => setF({ ...f, brandColor: c })} aria-label={`Use ${c}`} aria-pressed={f.brandColor === c}
                className={cx('grid size-8 place-items-center rounded-lg ring-2 transition', f.brandColor === c ? 'ring-white' : 'ring-transparent hover:ring-white/30')} style={{ background: c }}>
                {f.brandColor === c && <Check className="size-4 text-ink-950" strokeWidth={3} />}
              </button>
            ))}
            <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-lg ring-1 ring-white/15" title="Custom color">
              <span className="sr-only">Custom brand color</span>
              <input type="color" value={f.brandColor} onChange={(e) => setF({ ...f, brandColor: e.target.value })} className="absolute inset-0 size-full cursor-pointer opacity-0" />
              <span className="size-full bg-[conic-gradient(#f87171,#fbbf24,#34d399,#38bdf8,#a78bfa,#f87171)]" />
            </label>
            <span className="ml-1 font-mono text-[12px] text-mist-400">{f.brandColor}</span>
          </div>
        </div>
        <div aria-label="Portal header preview" className="overflow-hidden rounded-xl bg-cream text-ink-950 ring-1 ring-white/10">
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: f.brandColor }}>
            <span className="grid size-6 place-items-center rounded-md bg-ink-950/90 font-serif text-[12px] italic text-white">{(f.name || 'S')[0]}</span>
            <span className="text-[13px] font-semibold">{f.name || 'Your studio'}</span>
            <span className="ml-auto rounded-md bg-ink-950/15 px-2 py-0.5 text-[10px] font-semibold">Client portal</span>
          </div>
          <div className="space-y-2 p-4">
            <p className="text-[12px] font-semibold">Welcome back, Amara</p>
            <div className="flex gap-2">
              <span className="h-12 flex-1 rounded-lg bg-ink-950/[0.07]" />
              <span className="h-12 flex-1 rounded-lg bg-ink-950/[0.07]" />
            </div>
            <span className="inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold" style={{ background: f.brandColor }}>Review approvals</span>
          </div>
        </div>
      </div>
    </Card>

    <Card>
      <CardHeader title="Invoicing defaults" subtitle="Applied to new invoices. Existing invoices are not changed." />
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Currency">
          <Select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value as Workspace['currency'] })}>
            <option value="USD">USD, US dollar</option><option value="EUR">EUR, Euro</option><option value="GBP">GBP, British pound</option>
          </Select>
        </Field>
        <Field label="Invoice prefix" hint={`Next: ${f.invoicePrefix || 'INV'}-0143`}><Input value={f.invoicePrefix} maxLength={5} onChange={(e) => setF({ ...f, invoicePrefix: e.target.value.toUpperCase() })} /></Field>
        <Field label="Payment terms">
          <Select value={String(f.paymentTerms)} onChange={(e) => setF({ ...f, paymentTerms: Number(e.target.value) })}>
            <option value="7">Net 7</option><option value="14">Net 14</option><option value="30">Net 30</option>
          </Select>
        </Field>
      </div>
      <SaveBar onSave={save} disabled={!dirty} />
    </Card>

    <Card className="ring-red-400/20">
      <CardHeader title={<span className="text-red-300">Danger zone</span>} subtitle="These actions affect the whole workspace." />
      <div className="divide-y divide-white/[0.06] p-5 pt-3">
        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[13px] font-semibold">Reset demo data</p><p className="text-[12px] text-mist-400">Restore every client, project and invoice to the original demo state.</p></div>
          <Button icon={<RotateCcw className="size-4" />} onClick={() => setResetOpen(true)}>Reset demo data</Button>
        </div>
        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[13px] font-semibold">Delete workspace</p><p className="text-[12px] text-mist-400">Permanently remove {w.name}, its clients, files and invoices.</p></div>
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setDelOpen(true)}>Delete workspace</Button>
        </div>
      </div>
    </Card>

    <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset demo data?" subtitle="Any changes you made in this browser will be lost."
      footer={<><Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => { s.reset(); setResetOpen(false); setTimeout(() => window.location.reload(), 600); }}>Reset data</Button></>}>
      <p className="text-[13px] text-mist-300">Clients, projects, invoices, messages and settings go back to how they were when you first opened the demo.</p>
    </Modal>

    <Modal open={delOpen} onClose={() => { setDelOpen(false); setConfirmName(''); }} title="Delete workspace" subtitle="This cannot be undone."
      footer={<>
        <Button variant="ghost" onClick={() => { setDelOpen(false); setConfirmName(''); }}>Cancel</Button>
        <Button variant="danger" disabled={confirmName !== w.name} onClick={() => { setDelOpen(false); setConfirmName(''); s.toast('Demo: nothing was deleted', 'info'); }}>Delete forever</Button>
      </>}>
      <Field label={`Type "${w.name}" to confirm`}><Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={w.name} /></Field>
    </Modal>
  </>);
}

/* ---------- Team ---------- */
const SEATS: Record<Workspace['plan'], number> = { Solo: 1, Studio: 8, Agency: 25 };

function Team() {
  const s = useStore();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [f, setF] = useState({ name: '', email: '', role: 'Member' as Member['role'] });
  const seats = SEATS[s.workspace.plan];
  const used = s.members.length;

  const setRole = (id: string, role: Member['role']) => {
    s.update((st) => ({ members: st.members.map((m) => (m.id === id ? { ...m, role } : m)) }));
    const m = s.members.find((x) => x.id === id);
    s.toast(`${m?.name} is now ${role === 'Admin' ? 'an Admin' : 'a Member'}`);
  };

  const invite = () => {
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) return;
    if (used >= seats) { s.toast(`Your ${s.workspace.plan} plan includes ${seats} seats. Upgrade to add more.`, 'error'); return; }
    const m: Member = { id: uid('m'), name: f.name.trim(), email: f.email.trim(), title: 'Invited', role: f.role, photo: '', rate: 100, status: 'invited' };
    s.update((st) => ({ members: [...st.members, m] }));
    s.toast(`Invite sent to ${m.email}`);
    setInviteOpen(false);
    setF({ name: '', email: '', role: 'Member' });
  };

  const remove = () => {
    if (!removing) return;
    s.update((st) => ({ members: st.members.filter((m) => m.id !== removing.id) }));
    s.toast(`${removing.name} removed from the workspace`);
    setRemoving(null);
  };

  return (<>
    <Card>
      <CardHeader title="Team members" subtitle={`${used} people in ${s.workspace.name}`} action={<Button size="sm" variant="primary" icon={<UserPlus className="size-3.5" />} onClick={() => setInviteOpen(true)}>Invite member</Button>} />
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between text-[12px]"><span className="text-mist-400">Seats used</span><span className="font-semibold tabular-nums">{used} of {seats}</span></div>
        <Progress value={(used / seats) * 100} className="mt-2" tone={used >= seats ? 'red' : 'amber'} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wider text-mist-400"><tr className="border-b border-white/[0.06]"><th className="px-5 py-2.5 font-medium">Member</th><th className="px-3 py-2.5 font-medium">Role</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-5 py-2.5 text-right font-medium"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {s.members.map((m) => (
              <tr key={m.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={m.name} photo={m.photo || undefined} size={32} /><span className="min-w-0"><span className="block font-semibold">{m.name}{m.id === s.meId && <span className="ml-1.5 text-[11px] font-normal text-mist-400">(you)</span>}</span><span className="text-[12px] text-mist-400">{m.email}</span></span></div></td>
                <td className="px-3 py-3">
                  {m.role === 'Owner' ? <span className="text-[13px] text-mist-200">Owner</span> : (
                    <Select aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => setRole(m.id, e.target.value as Member['role'])} className="h-8 w-32">
                      <option value="Admin">Admin</option><option value="Member">Member</option>
                    </Select>
                  )}
                </td>
                <td className="px-3 py-3">{m.status === 'active' ? <Badge tone="green" dot>Active</Badge> : <Badge tone="amber" dot>Invited</Badge>}</td>
                <td className="px-5 py-3 text-right">
                  {m.role !== 'Owner' && <div className="flex justify-end gap-1">
                    {m.status === 'invited' && <Button size="sm" variant="ghost" onClick={() => s.toast(`Invite resent to ${m.email}`)}>Resend</Button>}
                    <button onClick={() => setRemoving(m)} className="grid size-8 place-items-center rounded-lg text-mist-400 hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove ${m.name}`}><Trash2 className="size-4" /></button>
                  </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a team member" subtitle="They get an email with a link to join your workspace."
      footer={<><Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button><Button variant="primary" disabled={!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email)} onClick={invite}>Send invite</Button></>}>
      <div className="space-y-4">
        <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Jordan Lee" /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="jordan@duneandco.studio" /></Field>
        <Field label="Role" hint="Admins can manage billing, clients and team. Members work on projects they are added to.">
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Member['role'] })}><option value="Member">Member</option><option value="Admin">Admin</option></Select>
        </Field>
      </div>
    </Modal>

    <Modal open={!!removing} onClose={() => setRemoving(null)} title={`Remove ${removing?.name ?? ''}?`} subtitle="They lose access to this workspace immediately."
      footer={<><Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Remove member</Button></>}>
      <p className="text-[13px] text-mist-300">Their logged time and comments stay on projects. You can invite them again at any time.</p>
    </Modal>
  </>);
}

/* ---------- Billing ---------- */
const PLANS: { name: Workspace['plan']; monthly: number; yearly: number; blurb: string; features: string[] }[] = [
  { name: 'Solo', monthly: 12, yearly: 10, blurb: 'For independent designers.', features: ['1 seat', 'Unlimited clients', 'Branded portal'] },
  { name: 'Studio', monthly: 29, yearly: 23, blurb: 'For small studios that bill monthly.', features: ['Up to 8 seats', 'Approvals and time tracking', 'AI briefs'] },
  { name: 'Agency', monthly: 59, yearly: 47, blurb: 'For agencies with many accounts.', features: ['Up to 25 seats', 'Custom portal domain', 'Priority support'] },
];
const RECEIPTS = [
  { id: 'R-2026-10', date: '2026-10-01', amount: 276 },
  { id: 'R-2025-10', date: '2025-10-01', amount: 276 },
  { id: 'R-2025-09', date: '2025-09-01', amount: 29 },
  { id: 'R-2025-08', date: '2025-08-01', amount: 29 },
  { id: 'R-2025-07', date: '2025-07-01', amount: 12 },
];

function Billing() {
  const s = useStore();
  const w = s.workspace;
  const [cycle, setCycle] = useState<Workspace['billing']>(w.billing);
  const current = PLANS.find((p) => p.name === w.plan)!;
  const price = (p: typeof PLANS[number], c: Workspace['billing']) => (c === 'yearly' ? p.yearly : p.monthly);

  const switchPlan = (name: Workspace['plan']) => {
    setWorkspace({ plan: name, billing: cycle });
    s.toast(`Switched to ${name}, billed ${cycle}`);
  };

  return (<>
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] text-mist-400">Current plan</p>
          <p className="mt-1 flex items-center gap-2 text-[22px] font-semibold tracking-tight">{w.plan} <Badge tone="amber">{w.billing === 'yearly' ? 'Yearly' : 'Monthly'}</Badge></p>
          <p className="mt-1 text-[13px] text-mist-300">{money(price(current, w.billing))} per seat per month{w.billing === 'yearly' ? ', billed annually' : ''}. Renews Oct 1, 2027.</p>
        </div>
        <div className="sm:w-56">
          <div className="flex justify-between text-[12px]"><span className="text-mist-400">Seats</span><span className="font-semibold">{s.members.length} of {SEATS[w.plan]}</span></div>
          <Progress value={(s.members.length / SEATS[w.plan]) * 100} className="mt-2" />
        </div>
      </div>
    </Card>

    <Card>
      <CardHeader title="Plans" subtitle="Change plans any time. We prorate the difference." action={<Segmented options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly, save 20%' }]} value={cycle} onChange={setCycle} />} />
      <div className="grid gap-3 p-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.name === w.plan && cycle === w.billing;
          return (
            <div key={p.name} className={cx('flex flex-col rounded-xl p-4 ring-1', p.name === w.plan ? 'bg-amber/[0.06] ring-amber/40' : 'bg-ink-850 ring-white/[0.06]')}>
              <div className="flex items-center justify-between"><p className="text-[14px] font-semibold">{p.name}</p>{p.name === 'Studio' && <Badge tone="amber">Popular</Badge>}</div>
              <p className="mt-1 text-[12px] text-mist-400">{p.blurb}</p>
              <p className="mt-3 text-[26px] font-semibold tracking-tight">{money(price(p, cycle))}<span className="text-[12px] font-normal text-mist-400"> / seat / mo</span></p>
              <ul className="mt-3 flex-1 space-y-1.5 text-[12px] text-mist-300">{p.features.map((x) => <li key={x} className="flex items-center gap-2"><Check className="size-3.5 text-amber-soft" />{x}</li>)}</ul>
              <Button className="mt-4" variant={isCurrent ? 'outline' : 'primary'} disabled={isCurrent} onClick={() => switchPlan(p.name)}>{isCurrent ? 'Current plan' : 'Switch plan'}</Button>
            </div>
          );
        })}
      </div>
    </Card>

    <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr]">
      <Card>
        <CardHeader title="Payment method" />
        <div className="p-5">
          <div className="flex items-center gap-3 rounded-xl bg-ink-850 p-3.5 ring-1 ring-white/[0.06]">
            <span className="grid h-8 w-12 place-items-center rounded-md bg-gradient-to-br from-sky-500 to-indigo-700 text-[10px] font-bold italic tracking-wider text-white">VISA</span>
            <div className="flex-1"><p className="text-[13px] font-semibold">Visa ending 4242</p><p className="text-[12px] text-mist-400">Expires 08/28 · sam@duneandco.studio</p></div>
          </div>
          <Button size="sm" className="mt-3" onClick={() => s.toast('Demo: card details are not stored', 'info')}>Update card</Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Billing history" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-mist-400"><tr className="border-b border-white/[0.06]"><th className="px-5 py-2.5 font-medium">Receipt</th><th className="px-3 py-2.5 font-medium">Date</th><th className="px-3 py-2.5 font-medium">Amount</th><th className="px-5 py-2.5 text-right font-medium"><span className="sr-only">Download</span></th></tr></thead>
            <tbody>
              {RECEIPTS.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-medium">{r.id}</td>
                  <td className="px-3 py-3 text-mist-300">{dateLong(r.date)}</td>
                  <td className="px-3 py-3 tabular-nums">{money(r.amount)} <Badge tone="green" className="ml-1.5">Paid</Badge></td>
                  <td className="px-5 py-3 text-right"><Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => s.toast(`${r.id}.pdf downloaded`)}>Download</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </>);
}

/* ---------- Notifications ---------- */
const NOTIFS: { key: string; label: string; body: string }[] = [
  { key: 'approvals', label: 'Approvals', body: 'When a client approves work or requests changes.' },
  { key: 'payments', label: 'Payments', body: 'When an invoice is paid or a payment fails.' },
  { key: 'messages', label: 'Client messages', body: 'New messages from clients in their portal.' },
  { key: 'mentions', label: 'Mentions', body: 'When a teammate mentions you in a comment.' },
  { key: 'overdue', label: 'Overdue reminders', body: 'A daily nudge for invoices past their due date.' },
  { key: 'weeklyDigest', label: 'Weekly digest', body: 'A Monday summary of revenue, hours and deadlines.' },
];

function Notifications() {
  const s = useStore();
  const n = s.workspace.notifications;
  const set = (key: string, v: boolean) => {
    setWorkspace({ notifications: { ...n, [key]: v } });
    s.toast(`${NOTIFS.find((x) => x.key === key)?.label} notifications ${v ? 'on' : 'off'}`, 'info');
  };
  return (
    <Card>
      <CardHeader title="Email and in app notifications" subtitle="Choose what you want to hear about." />
      <ul className="divide-y divide-white/[0.05] px-5 py-2">
        {NOTIFS.map((x) => (
          <li key={x.key} className="flex items-center justify-between gap-4 py-3.5">
            <div><p className="text-[13px] font-semibold">{x.label}</p><p className="text-[12px] text-mist-400">{x.body}</p></div>
            <Toggle checked={!!n[x.key]} onChange={(v) => set(x.key, v)} label={x.label} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- Integrations ---------- */
const INTEGRATIONS: { key: string; name: string; tile: string; body: string }[] = [
  { key: 'stripe', name: 'Stripe', tile: 'bg-indigo-500 text-white', body: 'Accept card and bank payments on invoices. Payouts in 2 days.' },
  { key: 'slack', name: 'Slack', tile: 'bg-fuchsia-700 text-white', body: 'Post approvals, payments and client messages to a channel.' },
  { key: 'figma', name: 'Figma', tile: 'bg-gradient-to-br from-orange-500 via-pink-500 to-violet-500 text-white', body: 'Attach frames to approvals and keep versions in sync.' },
  { key: 'google', name: 'Google Calendar', tile: 'bg-sky-500 text-white', body: 'Show project deadlines and milestones on your calendar.' },
  { key: 'notion', name: 'Notion', tile: 'bg-white text-ink-950', body: 'Export briefs and meeting notes to your Notion workspace.' },
  { key: 'quickbooks', name: 'QuickBooks', tile: 'bg-emerald-500 text-white', body: 'Sync paid invoices and clients to your books automatically.' },
];

function Integrations() {
  const s = useStore();
  const on = s.workspace.integrations;
  const toggle = (key: string, name: string) => {
    const v = !on[key];
    setWorkspace({ integrations: { ...on, [key]: v } });
    s.toast(v ? `${name} connected` : `${name} disconnected`, v ? 'success' : 'info');
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {INTEGRATIONS.map((i) => (
        <Card key={i.key} className="flex flex-col p-5">
          <div className="flex items-start gap-3">
            <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl text-[15px] font-bold', i.tile)} aria-hidden>{i.name[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[14px] font-semibold">{i.name}{on[i.key] && <Badge tone="green" dot>Connected</Badge>}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-mist-400">{i.body}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" variant={on[i.key] ? 'outline' : 'primary'} onClick={() => toggle(i.key, i.name)}>{on[i.key] ? 'Disconnect' : 'Connect'}</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
