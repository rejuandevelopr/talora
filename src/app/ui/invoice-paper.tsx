import type { Client, Invoice, LineItem, Project, Workspace } from '../lib/types';
import { cx, dateLong, money } from '../lib/format';

/** Shared helpers for the invoice pages (owned by the invoices module). */
export const subtotalOf = (items: LineItem[]) => items.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);

export const isPastDue = (inv: Pick<Invoice, 'status' | 'due'>, now: string) => inv.status === 'overdue' || (inv.status === 'sent' && inv.due < now);

export const nextInvoiceNumber = (invoices: Invoice[], prefix: string) => {
  const max = Math.max(0, ...invoices.map((i) => parseInt(i.number.split('-')[1] ?? '0', 10)));
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
};

interface PaperProps {
  number: string;
  status?: Invoice['status'];
  client?: Client;
  project?: Project;
  issued: string;
  due: string;
  items: LineItem[];
  taxRate: number;
  notes: string;
  workspace: Workspace;
  paidAt?: string;
  className?: string;
}

/** The invoice as a printable paper document: cream stock, ink type. */
export function InvoicePaper({ number, status, client, project, issued, due, items, taxRate, notes, workspace, paidAt, className }: PaperProps) {
  const cur = workspace.currency;
  const sub = subtotalOf(items);
  const tax = (sub * (taxRate || 0)) / 100;
  const total = sub + tax;
  const contact = client?.contacts[0];
  const shown = items.filter((i) => i.description.trim() || i.rate);

  return (
    <article className={cx('invoice-paper relative overflow-hidden rounded-2xl bg-cream text-ink-950 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-black/5', className)} aria-label={`Invoice ${number}`}>
      <div className="h-1.5 bg-gradient-to-r from-amber via-amber-soft to-ember" />
      {status === 'paid' && (
        <span className="pointer-events-none absolute right-6 top-24 rotate-[-12deg] rounded-md border-2 border-emerald-700/50 px-3 py-1 text-[13px] font-bold uppercase tracking-[0.2em] text-emerald-800/60 sm:right-10">Paid{paidAt ? ` ${dateLong(paidAt)}` : ''}</span>
      )}
      <div className="p-6 sm:p-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-ink-950 font-serif text-[22px] italic text-amber">D</span>
            <div className="leading-tight">
              <p className="text-[17px] font-semibold tracking-tight">{workspace.name}</p>
              <p className="text-[11px] text-ink-950/55">Brand, digital and campaign studio</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="font-serif text-[30px] italic font-light leading-none">Invoice</p>
            <p className="mt-1.5 text-[13px] font-semibold tabular-nums">{number}</p>
          </div>
        </header>

        <div className="mt-8 grid gap-6 text-[12px] sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-950/45">Bill to</p>
            {client ? (
              <div className="mt-1.5 leading-relaxed">
                <p className="text-[13px] font-semibold">{client.name}</p>
                {contact && <p>Attn: {contact.name}, {contact.role}</p>}
                {contact && <p className="text-ink-950/60">{contact.email}</p>}
                <p className="text-ink-950/60">{client.location}</p>
              </div>
            ) : <p className="mt-1.5 text-ink-950/40">Choose a client</p>}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-950/45">From</p>
            <div className="mt-1.5 leading-relaxed">
              <p className="text-[13px] font-semibold">{workspace.name}</p>
              <p>Sam Rivera</p>
              <p className="text-ink-950/60">billing@duneandco.studio</p>
              <p className="text-ink-950/60">Rua das Flores 28, Lisbon</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:text-right">
            <dt className="text-ink-950/50">Issued</dt><dd className="font-medium tabular-nums">{issued ? dateLong(issued) : '-'}</dd>
            <dt className="text-ink-950/50">Due</dt><dd className="font-medium tabular-nums">{due ? dateLong(due) : '-'}</dd>
            {project && <><dt className="text-ink-950/50">Project</dt><dd className="font-medium">{project.name}</dd></>}
          </dl>
        </div>

        <table className="mt-9 w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-ink-950/15 text-[10px] uppercase tracking-[0.12em] text-ink-950/50">
              <th className="py-2 pr-3 font-semibold">Description</th>
              <th className="w-14 py-2 px-2 text-right font-semibold">Qty</th>
              <th className="hidden w-24 py-2 px-2 text-right font-semibold sm:table-cell">Rate</th>
              <th className="w-28 py-2 pl-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-ink-950/40">Line items appear here as you add them</td></tr>}
            {shown.map((i) => (
              <tr key={i.id} className="border-b border-ink-950/[0.08] align-top">
                <td className="py-3 pr-3 font-medium">{i.description || 'Untitled item'}<span className="block text-[11px] font-normal text-ink-950/50 sm:hidden">{i.qty} x {money(i.rate, cur)}</span></td>
                <td className="py-3 px-2 text-right tabular-nums">{i.qty}</td>
                <td className="hidden py-3 px-2 text-right tabular-nums sm:table-cell">{money(i.rate, cur)}</td>
                <td className="py-3 pl-2 text-right font-medium tabular-nums">{money((Number(i.qty) || 0) * (Number(i.rate) || 0), cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex justify-end">
          <dl className="w-full max-w-[260px] space-y-1.5 text-[12px]">
            <div className="flex justify-between"><dt className="text-ink-950/55">Subtotal</dt><dd className="tabular-nums">{money(sub, cur)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-950/55">Tax ({taxRate || 0}%)</dt><dd className="tabular-nums">{money(tax, cur)}</dd></div>
            <div className="mt-2 flex items-baseline justify-between border-t border-ink-950/20 pt-3"><dt className="text-[13px] font-semibold">Total due</dt><dd className="text-[20px] font-semibold tracking-tight tabular-nums">{money(total, cur)}</dd></div>
          </dl>
        </div>

        <div className="mt-10 grid gap-6 border-t border-ink-950/10 pt-6 text-[11px] leading-relaxed text-ink-950/65 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-950/45">Notes</p>
            <p className="mt-1.5 whitespace-pre-line">{notes || 'Thank you for working with us.'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-950/45">Payment terms</p>
            <p className="mt-1.5">Net {workspace.paymentTerms} days. Pay online by card or bank transfer from your client portal. Bank: Atlantic Business Bank, IBAN PT50 0035 0995 0001 2345 6789 0, SWIFT ABBKPTPL. Please quote {number} as the reference.</p>
          </div>
        </div>
      </div>
    </article>
  );
}
