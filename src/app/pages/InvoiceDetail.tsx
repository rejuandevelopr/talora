import { useEffect, useRef } from 'react';
import { BellRing, Check, CheckCircle2, ChevronDown, Copy, Download, Eye, FilePlus2, FileText, FolderKanban, Link2, Mail, Send } from 'lucide-react';
import { useStore, invoiceTotal } from '../lib/store';
import { addDays, cx, date, dateLong, daysBetween, getParam, money, today } from '../lib/format';
import type { InvoiceStatus } from '../lib/types';
import { Avatar, Button, Card, CardHeader, ClientLogo, Dropdown, EmptyState, InvoiceStatusBadge, MenuItem, PageHeader, invoiceStatusMeta } from '../ui/ui';
import { InvoicePaper } from '../ui/invoice-paper';

const PRINT_CSS = `@media print {
  #sidebar, #sidebar-scrim, body header, .no-print { display: none !important; }
  body, html { background: #fff !important; }
  #main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .invoice-paper { box-shadow: none !important; border-radius: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-wrap { display: block !important; }
  @page { margin: 12mm; }
}`;

export default function InvoiceDetail() {
  const id = getParam('id') ?? '';
  const s = useStore();
  const inv = s.invoices.find((i) => i.id === id);
  const printed = useRef(false);

  useEffect(() => {
    if (!inv || printed.current || getParam('print') !== '1') return;
    printed.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete('print');
    window.history.replaceState({}, '', url.toString());
    setTimeout(() => window.print(), 400);
  }, [inv]);

  if (!inv) {
    return (
      <Card>
        <EmptyState icon={<FileText className="size-5" />} title="Invoice not found" body="It may have been deleted, or the link is incomplete." action={<Button href="/app/invoices" variant="primary">Back to invoices</Button>} />
      </Card>
    );
  }

  const now = today();
  const cur = s.workspace.currency;
  const client = s.clients.find((c) => c.id === inv.clientId);
  const project = s.projects.find((p) => p.id === inv.projectId);
  const contact = client?.contacts[0];
  const status: InvoiceStatus = inv.status === 'sent' && inv.due < now ? 'overdue' : inv.status;
  const total = invoiceTotal(inv);
  const portalUrl = `${window.location.origin}/portal?client=${inv.clientId}`;

  const send = () => {
    s.setInvoiceStatus(inv.id, 'sent');
    s.notify('Invoice sent', `${inv.number} was emailed to ${client?.name ?? 'the client'}.`, `/app/invoices/view?id=${inv.id}`);
  };
  const remind = () => {
    s.log({ actor: 'Sam Rivera', text: `sent a payment reminder for ${inv.number}`, kind: 'invoice' });
    s.toast(`Reminder sent to ${contact?.email ?? client?.name ?? 'the client'}`);
  };
  const duplicate = () => {
    const copy = s.addInvoice({
      clientId: inv.clientId, projectId: inv.projectId, issued: now, due: addDays(now, s.workspace.paymentTerms), status: 'draft',
      items: inv.items.map((it) => ({ ...it, id: Math.random().toString(36).slice(2, 9) })), taxRate: inv.taxRate, notes: inv.notes,
    });
    window.location.href = `/app/invoices/view?id=${copy.id}`;
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(portalUrl); s.toast('Payment link copied'); }
    catch { s.toast('Could not access clipboard. Link: ' + portalUrl, 'info'); }
  };

  // Payment timeline. "Viewed" is simulated one day after sending.
  const sentOn = inv.status !== 'draft' ? inv.issued : undefined;
  const viewedOn = sentOn ? addDays(sentOn, 1) : undefined;
  const timeline: { label: string; at?: string; detail: string; done: boolean; tone?: 'red' }[] = [
    { label: 'Created', at: inv.issued, detail: `Drafted by Sam Rivera`, done: true },
    { label: 'Sent', at: sentOn, detail: sentOn ? `Emailed to ${contact?.email ?? client?.name}` : 'Not sent yet', done: !!sentOn },
    { label: 'Viewed', at: viewedOn && viewedOn <= now ? viewedOn : undefined, detail: viewedOn && viewedOn <= now ? `Opened by ${contact?.name ?? 'client'} in the portal` : 'Waiting for the client to open it', done: !!viewedOn && viewedOn <= now },
    status === 'overdue'
      ? { label: 'Overdue', at: inv.due, detail: `${daysBetween(inv.due, now)} days past the due date`, done: true, tone: 'red' }
      : { label: 'Paid', at: inv.paidAt, detail: inv.paidAt ? `Paid by card via Stripe, ${daysBetween(inv.issued, inv.paidAt)} days after issue` : `Due ${dateLong(inv.due)}`, done: inv.status === 'paid' },
  ];

  const daysLeft = daysBetween(now, inv.due);

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <PageHeader
          back={{ href: '/app/invoices', label: 'Invoices' }}
          title={<span className="flex items-center gap-3">{inv.number}<InvoiceStatusBadge status={status} /></span>}
          subtitle={<>{client?.name ?? 'Unknown client'} · {money(total, cur)} · {inv.status === 'paid' && inv.paidAt ? `Paid ${dateLong(inv.paidAt)}` : status === 'overdue' ? `${-daysLeft} days overdue` : inv.status === 'draft' ? 'Draft, not sent' : `Due in ${daysLeft} days`}</>}
          actions={<>
            {inv.status === 'draft' && <Button variant="primary" icon={<Send className="size-4" />} onClick={send}>Send invoice</Button>}
            {(inv.status === 'sent' || inv.status === 'overdue') && <Button icon={<BellRing className="size-4" />} onClick={remind}>Send reminder</Button>}
            {inv.status !== 'paid' && <Button variant={inv.status === 'draft' ? 'outline' : 'primary'} icon={<CheckCircle2 className="size-4" />} onClick={() => s.setInvoiceStatus(inv.id, 'paid')}>Mark as paid</Button>}
            <Dropdown trigger={(open) => <Button icon={<ChevronDown className={cx('size-4 transition', open && 'rotate-180')} />} aria-haspopup="menu">Status</Button>}>
              {(close) => (<>
                <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-mist-400">Set status</p>
                {(Object.keys(invoiceStatusMeta) as InvoiceStatus[]).map((st) => (
                  <MenuItem key={st} icon={<span className="grid size-4 place-items-center">{inv.status === st ? <Check className="size-4 text-amber" /> : null}</span>} onClick={() => { close(); if (inv.status !== st) s.setInvoiceStatus(inv.id, st); }}>{invoiceStatusMeta[st].label}</MenuItem>
                ))}
              </>)}
            </Dropdown>
            <Button icon={<Copy className="size-4" />} onClick={duplicate}>Duplicate</Button>
            <Button icon={<Download className="size-4" />} onClick={() => window.print()}>Download PDF</Button>
          </>}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="print-wrap min-w-0">
          <div className="mx-auto max-w-[820px]">
            <InvoicePaper number={inv.number} status={inv.status} client={client} project={project} issued={inv.issued} due={inv.due} items={inv.items} taxRate={inv.taxRate} notes={inv.notes} workspace={s.workspace} paidAt={inv.paidAt} />
          </div>
        </div>

        <aside className="no-print space-y-4">
          <Card>
            <CardHeader title="Payment status" subtitle={inv.status === 'paid' ? 'Settled in full' : `${money(total, cur)} outstanding`} />
            <ol className="relative p-5 pt-4">
              {timeline.map((t, i) => (
                <li key={t.label} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < timeline.length - 1 && <span className={cx('absolute left-[11px] top-6 h-[calc(100%-18px)] w-px', t.done && timeline[i + 1].done ? 'bg-amber/50' : 'bg-white/10')} />}
                  <span className={cx('relative z-10 grid size-6 shrink-0 place-items-center rounded-full ring-1', t.tone === 'red' ? 'bg-red-500/15 text-red-300 ring-red-400/30' : t.done ? 'bg-amber text-ink-950 ring-amber' : 'bg-ink-850 text-mist-400 ring-white/10')}>
                    {t.label === 'Created' ? <FilePlus2 className="size-3" /> : t.label === 'Sent' ? <Mail className="size-3" /> : t.label === 'Viewed' ? <Eye className="size-3" /> : <CheckCircle2 className="size-3" />}
                  </span>
                  <div className="min-w-0 flex-1 text-[13px]">
                    <p className="flex items-center justify-between gap-2"><span className={cx('font-semibold', !t.done && 'text-mist-400')}>{t.label}</span>{t.at && <span className="text-[11px] tabular-nums text-mist-400">{date(t.at)}</span>}</p>
                    <p className="text-[12px] text-mist-400">{t.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {client && (
            <Card>
              <CardHeader title="Client" action={<Button size="sm" variant="ghost" href={`/app/clients/view?id=${client.id}`}>Open</Button>} />
              <div className="space-y-4 p-5 pt-4">
                <a href={`/app/clients/view?id=${client.id}`} className="flex items-center gap-3">
                  <ClientLogo client={client} size={36} />
                  <span className="min-w-0"><span className="block truncate text-[13px] font-semibold hover:underline">{client.name}</span><span className="text-[12px] text-mist-400">{client.industry} · {client.location}</span></span>
                </a>
                {contact && (
                  <div className="flex items-center gap-3 rounded-xl bg-ink-850 p-3 ring-1 ring-white/[0.05]">
                    <Avatar name={contact.name} photo={contact.photo} size={30} />
                    <div className="min-w-0 flex-1 text-[12px]"><p className="truncate text-[13px] font-medium">{contact.name}</p><p className="truncate text-mist-400">{contact.role} · {contact.email}</p></div>
                    <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Invoice ${inv.number}`)}`} className="grid size-8 place-items-center rounded-lg text-mist-400 hover:bg-white/5 hover:text-white" aria-label={`Email ${contact.name}`}><Mail className="size-4" /></a>
                  </div>
                )}
                {project && (
                  <a href={`/app/projects/view?id=${project.id}`} className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-white/[0.06] transition hover:bg-white/[0.02] hover:ring-white/15">
                    <span className="grid size-8 place-items-center rounded-lg bg-white/[0.05] text-mist-300"><FolderKanban className="size-4" /></span>
                    <span className="min-w-0 flex-1 text-[12px]"><span className="block truncate text-[13px] font-medium">{project.name}</span><span className="text-mist-400">Budget {money(project.budget, cur)}</span></span>
                  </a>
                )}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Payment link" subtitle="Your client can pay by card or bank transfer from their portal" />
            <div className="p-5 pt-4">
              <div className="flex items-center gap-2 rounded-lg bg-ink-850 px-3 py-2 ring-1 ring-white/10">
                <Link2 className="size-3.5 shrink-0 text-mist-400" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-mist-300">{portalUrl.replace(/^https?:\/\//, '')}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="primary" icon={<Copy className="size-3.5" />} onClick={copyLink} className="flex-1">Copy link</Button>
                <Button size="sm" href={`/portal?client=${inv.clientId}`} className="flex-1">Preview portal</Button>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

