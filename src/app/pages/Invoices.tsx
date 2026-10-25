import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Download, Eye, FileText, MoreHorizontal, Plus, Send, Timer, Wallet, X, BellRing } from 'lucide-react';
import { useStore, invoiceTotal } from '../lib/store';
import { cx, date, daysBetween, money, today, addDays } from '../lib/format';
import type { Invoice, InvoiceStatus } from '../lib/types';
import { Button, Card, Checkbox, ClientLogo, Dropdown, EmptyState, InvoiceStatusBadge, MenuItem, PageHeader, SearchInput, Select, Stat, Tabs } from '../ui/ui';

type Tab = 'all' | InvoiceStatus;

export default function Invoices() {
  const s = useStore();
  const now = today();
  const cur = s.workspace.currency;
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [clientId, setClientId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const statusOf = (i: Invoice): InvoiceStatus => (i.status === 'sent' && i.due < now ? 'overdue' : i.status);

  const outstanding = s.invoices.filter((i) => i.status === 'sent' || i.status === 'overdue');
  const overdue = s.invoices.filter((i) => statusOf(i) === 'overdue');
  const since = addDays(now, -30);
  const paid30 = s.invoices.filter((i) => i.status === 'paid' && i.paidAt && i.paidAt >= since);
  const paidAll = s.invoices.filter((i) => i.status === 'paid' && i.paidAt);
  const avgDays = paidAll.length ? Math.round(paidAll.reduce((a, i) => a + Math.max(0, daysBetween(i.issued, i.paidAt!)), 0) / paidAll.length) : 0;
  const sum = (list: Invoice[]) => list.reduce((a, i) => a + invoiceTotal(i), 0);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: s.invoices.length, draft: 0, sent: 0, overdue: 0, paid: 0 };
    s.invoices.forEach((i) => { c[statusOf(i)] += 1; });
    return c;
  }, [s.invoices, now]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return s.invoices
      .filter((i) => tab === 'all' || statusOf(i) === tab)
      .filter((i) => !clientId || i.clientId === clientId)
      .filter((i) => {
        if (!term) return true;
        const c = s.clients.find((x) => x.id === i.clientId);
        const p = s.projects.find((x) => x.id === i.projectId);
        return [i.number, c?.name, p?.name, ...i.items.map((it) => it.description)].some((v) => v?.toLowerCase().includes(term));
      })
      .sort((a, b) => b.issued.localeCompare(a.issued) || b.number.localeCompare(a.number));
  }, [s.invoices, s.clients, s.projects, tab, q, clientId, now]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const toggle = (id: string) => setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((r) => r.id));

  const duplicate = (inv: Invoice) => {
    const copy = s.addInvoice({
      clientId: inv.clientId, projectId: inv.projectId, issued: now, due: addDays(now, s.workspace.paymentTerms), status: 'draft',
      items: inv.items.map((it) => ({ ...it, id: Math.random().toString(36).slice(2, 9) })), taxRate: inv.taxRate, notes: inv.notes,
    });
    window.location.href = `/app/invoices/view?id=${copy.id}`;
  };
  const send = (inv: Invoice) => {
    s.setInvoiceStatus(inv.id, 'sent');
    const c = s.clients.find((x) => x.id === inv.clientId);
    s.notify('Invoice sent', `${inv.number} was emailed to ${c?.name ?? 'the client'}.`, `/app/invoices/view?id=${inv.id}`);
  };

  const bulkPaid = () => {
    const ids = selected.filter((id) => s.invoices.find((i) => i.id === id)?.status !== 'paid');
    if (!ids.length) { s.toast('Selected invoices are already paid', 'info'); return; }
    useStore.getState().update((st) => ({ invoices: st.invoices.map((i) => (ids.includes(i.id) ? { ...i, status: 'paid', paidAt: now } : i)) }));
    s.log({ actor: 'Sam Rivera', text: `marked ${ids.length} invoice${ids.length > 1 ? 's' : ''} as paid`, kind: 'invoice' });
    s.toast(`${ids.length} invoice${ids.length > 1 ? 's' : ''} marked as paid`);
    setSelected([]);
  };
  const bulkRemind = () => {
    const open = selected.filter((id) => { const i = s.invoices.find((x) => x.id === id); return i && (i.status === 'sent' || i.status === 'overdue'); });
    if (!open.length) { s.toast('Reminders only go to sent or overdue invoices', 'info'); return; }
    s.toast(`Payment reminder sent for ${open.length} invoice${open.length > 1 ? 's' : ''}`);
    setSelected([]);
  };

  const totalShown = sum(rows);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle={`${counts.all} invoices · ${money(sum(outstanding), cur)} awaiting payment`}
        actions={<Button href="/app/invoices/new" variant="primary" icon={<Plus className="size-4" />}>New invoice</Button>}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Outstanding" value={money(sum(outstanding), cur)} delta={`${outstanding.length} open invoices`} icon={<Wallet className="size-4" />} />
        <Stat label="Overdue" value={money(sum(overdue), cur)} delta={overdue.length ? `${overdue.length} past due date` : 'Nothing overdue'} tone={overdue.length ? 'down' : 'neutral'} icon={<AlertCircle className="size-4" />} />
        <Stat label="Paid, last 30 days" value={money(sum(paid30), cur)} delta={`${paid30.length} payments received`} tone="up" icon={<CheckCircle2 className="size-4" />} />
        <Stat label="Avg. days to pay" value={`${avgDays} days`} delta={`Terms are net ${s.workspace.paymentTerms}`} tone={avgDays <= s.workspace.paymentTerms ? 'up' : 'down'} icon={<Timer className="size-4" />} />
      </div>

      <Card>
        <div className="px-5 pt-3">
          <Tabs<Tab>
            value={tab}
            onChange={(v) => { setTab(v); setSelected([]); }}
            tabs={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'draft', label: 'Draft', count: counts.draft },
              { value: 'sent', label: 'Sent', count: counts.sent },
              { value: 'overdue', label: 'Overdue', count: counts.overdue },
              { value: 'paid', label: 'Paid', count: counts.paid },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2 px-5 pt-4 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Search number, client or item" className="sm:w-72" />
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Filter by client" className="sm:w-52">
            <option value="">All clients</option>
            {s.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {(q || clientId) && <Button size="sm" variant="ghost" onClick={() => { setQ(''); setClientId(''); }}>Clear filters</Button>}
        </div>

        {selected.length > 0 && (
          <div className="mx-5 mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber/10 px-3 py-2 ring-1 ring-amber/20" role="region" aria-label="Bulk actions">
            <span className="mr-auto text-[13px] font-medium text-amber-soft">{selected.length} selected</span>
            <Button size="sm" variant="outline" icon={<CheckCircle2 className="size-3.5" />} onClick={bulkPaid}>Mark paid</Button>
            <Button size="sm" variant="outline" icon={<BellRing className="size-3.5" />} onClick={bulkRemind}>Send reminders</Button>
            <button onClick={() => setSelected([])} className="grid size-8 place-items-center rounded-lg text-mist-300 hover:bg-white/5 hover:text-white" aria-label="Clear selection"><X className="size-4" /></button>
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState icon={<FileText className="size-5" />} title="No invoices match" body="Try a different status, client or search term." action={<Button size="sm" onClick={() => { setTab('all'); setQ(''); setClientId(''); }}>Reset view</Button>} />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-mist-400">
                <tr className="border-b border-white/[0.06]">
                  <th className="w-10 py-2.5 pl-5 pr-1 font-medium"><Checkbox checked={allSelected} onChange={toggleAll} label="Select all invoices" /></th>
                  <th className="px-3 py-2.5 font-medium">Number</th>
                  <th className="px-3 py-2.5 font-medium">Client</th>
                  <th className="px-3 py-2.5 font-medium">Project</th>
                  <th className="px-3 py-2.5 font-medium">Issued</th>
                  <th className="px-3 py-2.5 font-medium">Due</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="w-12 py-2.5 pl-1 pr-5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const c = s.clients.find((x) => x.id === inv.clientId);
                  const p = s.projects.find((x) => x.id === inv.projectId);
                  const st = statusOf(inv);
                  const late = st === 'overdue';
                  const href = `/app/invoices/view?id=${inv.id}`;
                  const isSel = selected.includes(inv.id);
                  return (
                    <tr key={inv.id} className={cx('border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]', isSel && 'bg-amber/[0.04]')}>
                      <td className="py-3 pl-5 pr-1"><Checkbox checked={isSel} onChange={() => toggle(inv.id)} label={`Select ${inv.number}`} /></td>
                      <td className="px-3 py-3"><a href={href} className="font-semibold tabular-nums hover:underline">{inv.number}</a></td>
                      <td className="px-3 py-3">
                        {c ? <a href={href} className="flex items-center gap-2.5"><ClientLogo client={c} size={26} /><span className="font-medium">{c.name}</span></a> : <span className="text-mist-400">Unknown client</span>}
                      </td>
                      <td className="px-3 py-3 text-mist-300">{p ? <a href={`/app/projects/view?id=${p.id}`} className="hover:text-white hover:underline">{p.name}</a> : <span className="text-mist-400">General</span>}</td>
                      <td className="px-3 py-3 tabular-nums text-mist-300">{date(inv.issued)}</td>
                      <td className="px-3 py-3">
                        <span className={cx('block tabular-nums', late && 'text-red-300')}>{date(inv.due)}</span>
                        {late && <span className="text-[11px] text-red-300/80">{daysBetween(inv.due, now)} days late</span>}
                        {st === 'paid' && inv.paidAt && <span className="text-[11px] text-mist-400">Paid {date(inv.paidAt)}</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(invoiceTotal(inv), cur)}</td>
                      <td className="px-3 py-3"><InvoiceStatusBadge status={st} /></td>
                      <td className="py-3 pl-1 pr-5 text-right">
                        <Dropdown trigger={() => <button className="grid size-8 place-items-center rounded-lg text-mist-400 hover:bg-white/5 hover:text-white" aria-label={`Actions for ${inv.number}`}><MoreHorizontal className="size-4" /></button>}>
                          {(close) => (<>
                            <MenuItem href={href} icon={<Eye className="size-4" />}>View</MenuItem>
                            {inv.status === 'draft' && <MenuItem icon={<Send className="size-4" />} onClick={() => { close(); send(inv); }}>Send</MenuItem>}
                            {inv.status !== 'paid' && <MenuItem icon={<CheckCircle2 className="size-4" />} onClick={() => { close(); s.setInvoiceStatus(inv.id, 'paid'); }}>Mark as paid</MenuItem>}
                            <MenuItem icon={<Copy className="size-4" />} onClick={() => { close(); duplicate(inv); }}>Duplicate</MenuItem>
                            <MenuItem href={`${href}&print=1`} icon={<Download className="size-4" />}>Download PDF</MenuItem>
                          </>)}
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.08] bg-white/[0.015] text-[12px]">
                  <td className="py-3 pl-5" />
                  <td colSpan={5} className="px-3 py-3 font-medium text-mist-300">{rows.length} invoice{rows.length === 1 ? '' : 's'} shown</td>
                  <td className="px-3 py-3 text-right text-[14px] font-semibold tabular-nums">{money(totalShown, cur)}</td>
                  <td colSpan={2} className="px-3 py-3 pr-5 text-mist-400">Total</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
