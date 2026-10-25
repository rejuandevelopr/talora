import { useEffect, useMemo, useState } from 'react';
import { Clock, Flag, Plus, Send, Trash2, Save } from 'lucide-react';
import { useStore, uid } from '../lib/store';
import { addDays, cx, getParam, hours, money, today } from '../lib/format';
import type { LineItem } from '../lib/types';
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from '../ui/ui';
import { InvoicePaper, nextInvoiceNumber, subtotalOf } from '../ui/invoice-paper';

const blankItem = (): LineItem => ({ id: uid('l'), description: '', qty: 1, rate: 0 });

export default function InvoiceNew() {
  const s = useStore();
  const cur = s.workspace.currency;
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [issued, setIssued] = useState(today());
  const [due, setDue] = useState(addDays(today(), s.workspace.paymentTerms));
  const [dueTouched, setDueTouched] = useState(false);
  const [items, setItems] = useState<LineItem[]>([blankItem()]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('Thank you for working with Dune & Co. It is a pleasure building this with you.');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const qc = getParam('client');
    const qp = getParam('project');
    const proj = qp ? s.projects.find((p) => p.id === qp) : undefined;
    if (proj) { setClientId(proj.clientId); setProjectId(proj.id); }
    else if (qc && s.clients.some((c) => c.id === qc)) setClientId(qc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (!dueTouched && issued) setDue(addDays(issued, s.workspace.paymentTerms)); }, [issued, dueTouched, s.workspace.paymentTerms]);

  const client = s.clients.find((c) => c.id === clientId);
  const clientProjects = s.projects.filter((p) => p.clientId === clientId);
  const project = s.projects.find((p) => p.id === projectId);
  const milestone = project?.milestones.find((m) => m.status === 'current');
  const number = nextInvoiceNumber(s.invoices, s.workspace.invoicePrefix);

  const projectEntries = useMemo(() => s.timeEntries.filter((e) => e.projectId === projectId && e.billable), [s.timeEntries, projectId]);
  const loggedMinutes = projectEntries.reduce((a, e) => a + e.minutes, 0);
  const loggedValue = projectEntries.reduce((a, e) => a + (e.minutes / 60) * (s.members.find((m) => m.id === e.memberId)?.rate ?? 0), 0);

  const sub = subtotalOf(items);
  const total = sub + (sub * (taxRate || 0)) / 100;

  const errors = {
    client: !clientId ? 'Choose who this invoice is for.' : '',
    items: !items.some((i) => i.description.trim() && i.qty * i.rate > 0) ? 'Add at least one line item with a description and an amount above zero.' : '',
    due: due && issued && due < issued ? 'Due date cannot be before the issue date.' : '',
  };
  const valid = !errors.client && !errors.items && !errors.due;

  const setItem = (id: string, patch: Partial<LineItem>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const pushItem = (item: LineItem) => setItems((list) => {
    const cleaned = list.filter((i) => i.description.trim() || i.rate);
    return [...cleaned, item];
  });

  const addMilestone = () => {
    if (!milestone || !project) return;
    const desc = `Milestone: ${milestone.title}`;
    if (items.some((i) => i.description === desc)) { s.toast('That milestone is already on this invoice', 'info'); return; }
    pushItem({ id: uid('l'), description: desc, qty: 1, rate: milestone.amount });
    s.toast(`Added ${milestone.title}`, 'info');
  };
  const addLogged = () => {
    if (!project || !loggedMinutes) return;
    const h = Math.round((loggedMinutes / 60) * 100) / 100;
    const rate = Math.round(loggedValue / h);
    pushItem({ id: uid('l'), description: `${project.name}: logged studio time (${hours(loggedMinutes)})`, qty: h, rate });
    s.toast(`Added ${hours(loggedMinutes)} of billable time`, 'info');
  };

  const save = (status: 'draft' | 'sent') => {
    setTried(true);
    if (!valid) { s.toast('Fix the highlighted fields first', 'error'); return; }
    setSaving(true);
    const inv = s.addInvoice({
      clientId, projectId: projectId || undefined, issued, due, status,
      items: items.filter((i) => i.description.trim() && i.qty * i.rate > 0).map((i) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) })),
      taxRate: Number(taxRate) || 0, notes,
    });
    if (status === 'sent') s.notify('Invoice sent', `${inv.number} for ${money(total, cur)} was emailed to ${client?.name}.`, `/app/invoices/view?id=${inv.id}`);
    setTimeout(() => { window.location.href = `/app/invoices/view?id=${inv.id}`; }, 350);
  };

  const err = (msg: string) => (tried && msg ? <p className="mt-1.5 text-[12px] text-red-300" role="alert">{msg}</p> : null);

  return (
    <div className="pb-24">
      <PageHeader title="New invoice" subtitle={`Will be numbered ${number} · Net ${s.workspace.paymentTerms} terms`} back={{ href: '/app/invoices', label: 'Invoices' }} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Client and project" subtitle="Who is being billed, and for what" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <Field label="Client">
                  <Select value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(''); }} aria-invalid={tried && !!errors.client} className={cx(tried && errors.client && 'ring-red-400/60')}>
                    <option value="">Select a client</option>
                    {s.clients.filter((c) => c.status !== 'archived' || c.id === clientId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                {err(errors.client)}
              </div>
              <Field label="Project" hint={clientId && !clientProjects.length ? 'This client has no projects yet' : undefined}>
                <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!clientId}>
                  <option value="">{clientId ? 'No project (general)' : 'Choose a client first'}</option>
                  {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              {project && (
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Button size="sm" icon={<Flag className="size-3.5" />} onClick={addMilestone} disabled={!milestone}>
                    {milestone ? `Add current milestone (${money(milestone.amount, cur)})` : 'No current milestone'}
                  </Button>
                  <Button size="sm" icon={<Clock className="size-3.5" />} onClick={addLogged} disabled={!loggedMinutes}>
                    {loggedMinutes ? `Add logged time (${hours(loggedMinutes)}, ${money(Math.round(loggedValue), cur)})` : 'No billable time logged'}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Dates" subtitle={`Due date follows your net ${s.workspace.paymentTerms} terms unless you change it`} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Issue date"><Input type="date" value={issued} onChange={(e) => setIssued(e.target.value)} /></Field>
              <div>
                <Field label="Due date"><Input type="date" value={due} onChange={(e) => { setDue(e.target.value); setDueTouched(true); }} /></Field>
                {err(errors.due)}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Line items" subtitle={`${items.length} item${items.length === 1 ? '' : 's'} · ${money(sub, cur)} subtotal`} action={<Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setItems((l) => [...l, blankItem()])}>Add item</Button>} />
            <div className="p-5 pt-4">
              <div className="hidden grid-cols-[minmax(0,1fr)_72px_104px_96px_32px] gap-2 px-1 pb-2 text-[11px] font-medium uppercase tracking-wider text-mist-400 sm:grid">
                <span>Description</span><span>Qty</span><span>Rate</span><span className="text-right">Amount</span><span />
              </div>
              <ul className="space-y-2">
                {items.map((it, idx) => (
                  <li key={it.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-xl bg-ink-850 p-2.5 ring-1 ring-white/[0.05] sm:grid-cols-[minmax(0,1fr)_72px_104px_96px_32px] sm:items-center sm:bg-transparent sm:p-0 sm:ring-0">
                    <Input className="col-span-3 sm:col-span-1" value={it.description} onChange={(e) => setItem(it.id, { description: e.target.value })} placeholder="e.g. Homepage design, round 2" aria-label={`Item ${idx + 1} description`} />
                    <Input type="number" min={0} step="0.25" inputMode="decimal" value={it.qty} onChange={(e) => setItem(it.id, { qty: parseFloat(e.target.value) || 0 })} aria-label={`Item ${idx + 1} quantity`} className="tabular-nums" />
                    <Input type="number" min={0} step="5" inputMode="decimal" value={it.rate} onChange={(e) => setItem(it.id, { rate: parseFloat(e.target.value) || 0 })} aria-label={`Item ${idx + 1} rate`} className="tabular-nums" />
                    <span className="col-span-2 self-center text-[13px] font-semibold tabular-nums sm:col-span-1 sm:text-right">{money(it.qty * it.rate, cur)}</span>
                    <button onClick={() => setItems((l) => (l.length > 1 ? l.filter((x) => x.id !== it.id) : [blankItem()]))} className="grid size-8 place-items-center justify-self-end rounded-lg text-mist-400 hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove item ${idx + 1}`}><Trash2 className="size-4" /></button>
                  </li>
                ))}
              </ul>
              {err(errors.items)}
              <button onClick={() => setItems((l) => [...l, blankItem()])} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2.5 text-[12px] font-medium text-mist-300 transition hover:border-amber/40 hover:text-white"><Plus className="size-3.5" />Add item</button>

              <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-[140px_1fr]">
                <Field label="Tax %"><Input type="number" min={0} max={50} step="0.5" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="tabular-nums" /></Field>
                <dl className="space-y-1.5 self-end text-[13px]">
                  <div className="flex justify-between text-mist-300"><dt>Subtotal</dt><dd className="tabular-nums">{money(sub, cur)}</dd></div>
                  <div className="flex justify-between text-mist-300"><dt>Tax</dt><dd className="tabular-nums">{money(total - sub, cur)}</dd></div>
                  <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(total, cur)}</dd></div>
                </dl>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Notes" subtitle="Shown at the bottom of the invoice" />
            <div className="p-5"><Field label="Note to client"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <p className="mb-3 flex items-center gap-2 text-[12px] text-mist-400"><span className="size-1.5 rounded-full bg-emerald-400" />Live preview, exactly what {client?.contacts[0]?.name.split(' ')[0] ?? 'your client'} will see</p>
          <InvoicePaper number={number} status="draft" client={client} project={project} issued={issued} due={due} items={items} taxRate={taxRate} notes={notes} workspace={s.workspace} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-ink-950/90 backdrop-blur-xl lg:left-[248px]">
        <div className="mx-auto flex max-w-[1480px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="mr-auto min-w-0">
            <p className="text-[11px] text-mist-400">Total due{client ? ` from ${client.name}` : ''}</p>
            <p className="text-[18px] font-semibold tracking-tight tabular-nums">{money(total, cur)}</p>
          </div>
          <Button href="/app/invoices" variant="ghost" className="hidden sm:inline-flex">Cancel</Button>
          <Button icon={<Save className="size-4" />} onClick={() => save('draft')} disabled={saving}>Save draft</Button>
          <Button variant="primary" icon={<Send className="size-4" />} onClick={() => save('sent')} disabled={saving}>Send invoice</Button>
        </div>
      </div>
    </div>
  );
}
