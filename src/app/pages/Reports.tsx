import { useMemo, useState } from 'react';
import { Download, Gauge, PiggyBank, Timer, TrendingUp } from 'lucide-react';
import { useStore, invoiceTotal, projectBilled } from '../lib/store';
import { addDays, cx, daysBetween, hours, money, today } from '../lib/format';
import type { Project } from '../lib/types';
import { AreaChart, BarChart, Donut, Sparkline } from '../ui/charts';
import { Avatar, Badge, Button, Card, CardHeader, ClientLogo, PageHeader, Progress, Segmented } from '../ui/ui';

type Range = '30d' | 'quarter' | 'year';
const RANGE_DAYS: Record<Range, number> = { '30d': 30, quarter: 91, year: 365 };
const RANGE_LABEL: Record<Range, string> = { '30d': 'Last 30 days', quarter: 'Last quarter', year: 'Last 12 months' };

// Recognised revenue by month, matches the dashboard series.
const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const REVENUE = [18200, 21400, 19800, 24600, 22100, 27300, 25900, 29800, 31200, 28400, 33600, 36100];
const PREV = [14100, 16800, 17200, 18900, 19400, 21300, 20800, 22900, 24100, 23800, 25200, 27400];
const WEEKS = ['Sep 28', 'Oct 5', 'Oct 12', 'Oct 19'];
const WEEK_REV = [7400, 8200, 9600, 10900];
const WEEK_PREV = [6100, 6900, 7300, 7100];

const TYPE_COLORS: Record<string, string> = { Branding: '#f4a64a', Web: '#f5eee3', Product: '#a78bfa', Campaign: '#e0683a', 'Print and decks': '#7dd3fc', Other: '#3d3a41' };
const projectType = (p?: Project) => {
  if (!p) return 'Other';
  const t = `${p.name} ${p.description}`.toLowerCase();
  if (/rebrand|brand|identity|logo|packaging/.test(t)) return 'Branding';
  if (/website|site|cms|web/.test(t)) return 'Web';
  if (/app|onboarding|design system|component|product/.test(t)) return 'Product';
  if (/campaign|shoot|email|social/.test(t)) return 'Campaign';
  if (/report|print|deck|pitch/.test(t)) return 'Print and decks';
  return 'Other';
};

const TARGET_HOURS = 32;
const COST_RATIO = 0.55; // internal cost of an hour, as a share of the billing rate

export default function Reports() {
  const s = useStore();
  const now = today();
  const cur = s.workspace.currency;
  const [range, setRange] = useState<Range>('quarter');
  const from = addDays(now, -RANGE_DAYS[range]);

  const series = range === '30d' ? { data: WEEK_REV, prev: WEEK_PREV, labels: WEEKS } : range === 'quarter' ? { data: REVENUE.slice(-3), prev: PREV.slice(-3), labels: MONTHS.slice(-3) } : { data: REVENUE, prev: PREV, labels: MONTHS };
  const revenue = series.data.reduce((a, b) => a + b, 0);
  const prevRevenue = series.prev.reduce((a, b) => a + b, 0);
  const growth = Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10;

  const rangeInvoices = useMemo(() => s.invoices.filter((i) => i.issued >= from && i.issued <= now), [s.invoices, from, now]);
  const billedInvoices = rangeInvoices.filter((i) => i.status !== 'draft');

  /* time */
  const rateOf = (id: string) => s.members.find((m) => m.id === id)?.rate ?? 0;
  const rangeTime = s.timeEntries.filter((e) => e.date >= from && e.date <= now);
  const totalMin = rangeTime.reduce((a, e) => a + e.minutes, 0);
  const deliveryCost = rangeTime.reduce((a, e) => a + (e.minutes / 60) * rateOf(e.memberId) * COST_RATIO, 0);
  const overhead = 2600 * (RANGE_DAYS[range] / 30);
  const margin = revenue ? Math.round(((revenue - deliveryCost - overhead) / revenue) * 100) : 0;

  // Utilization over the last 7 days against a 32 hour week
  const weekFrom = addDays(now, -6);
  const active = s.members.filter((m) => m.status === 'active');
  const team = s.members.map((m) => {
    const list = s.timeEntries.filter((e) => e.memberId === m.id && e.date >= weekFrom && e.date <= now);
    const min = list.reduce((a, e) => a + e.minutes, 0);
    const bill = list.filter((e) => e.billable).reduce((a, e) => a + e.minutes, 0);
    return { m, min, billPct: min ? Math.round((bill / min) * 100) : 0, revenue: (bill / 60) * m.rate, util: Math.round((min / 60 / TARGET_HOURS) * 100) };
  }).sort((a, b) => b.min - a.min);
  const teamMin = team.reduce((a, t) => a + t.min, 0);
  const utilization = active.length ? Math.round((teamMin / 60 / (TARGET_HOURS * active.length)) * 100) : 0;

  const paid = billedInvoices.filter((i) => i.status === 'paid' && i.paidAt);
  const avgDays = paid.length ? Math.round(paid.reduce((a, i) => a + Math.max(0, daysBetween(i.issued, i.paidAt!)), 0) / paid.length) : 0;

  /* revenue by client */
  const byClient = Object.values(billedInvoices.reduce<Record<string, { id: string; total: number }>>((acc, i) => {
    acc[i.clientId] = acc[i.clientId] ?? { id: i.clientId, total: 0 };
    acc[i.clientId].total += invoiceTotal(i);
    return acc;
  }, {})).sort((a, b) => b.total - a.total).slice(0, 6);
  const clientName = (id: string) => s.clients.find((c) => c.id === id)?.name ?? 'Other';

  /* time by type */
  const byType = Object.entries(rangeTime.reduce<Record<string, number>>((acc, e) => {
    const t = projectType(s.projects.find((p) => p.id === e.projectId));
    acc[t] = (acc[t] ?? 0) + e.minutes;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: TYPE_COLORS[label] ?? '#3d3a41' }));

  /* project profitability */
  const projects = s.projects.map((p) => {
    const billed = projectBilled(p, s.invoices);
    const cost = s.timeEntries.filter((e) => e.projectId === p.id).reduce((a, e) => a + (e.minutes / 60) * rateOf(e.memberId), 0);
    const marginPct = billed ? Math.round(((billed - cost) / billed) * 100) : null;
    return { p, billed, cost, marginPct };
  }).filter((r) => r.billed || r.cost).sort((a, b) => b.billed - a.billed);

  const exportCsv = () => {
    const esc = (v: string | number) => { const t = String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const header = ['Number', 'Client', 'Project', 'Issued', 'Due', 'Status', 'Subtotal', 'Tax rate %', 'Total', 'Paid on', 'Currency'];
    const rows = rangeInvoices.slice().sort((a, b) => a.issued.localeCompare(b.issued)).map((i) => {
      const sub = i.items.reduce((a, it) => a + it.qty * it.rate, 0);
      return [i.number, clientName(i.clientId), s.projects.find((p) => p.id === i.projectId)?.name ?? '', i.issued, i.due, i.status, sub.toFixed(2), i.taxRate, invoiceTotal(i).toFixed(2), i.paidAt ?? '', cur];
    });
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `dune-invoices-${range}-${now}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    s.toast(`Exported ${rows.length} invoices to CSV`);
  };

  const kpis = [
    { label: 'Revenue', value: money(revenue, cur), delta: `${growth >= 0 ? '+' : ''}${growth}% vs prior period`, up: growth >= 0, icon: <TrendingUp className="size-4" />, spark: series.data },
    { label: 'Profit margin (est.)', value: `${margin}%`, delta: 'After delivery cost and overheads', up: margin >= 35, icon: <PiggyBank className="size-4" />, spark: [31, 34, 33, 36, 38, 37, 39, margin] },
    { label: 'Utilization', value: `${utilization}%`, delta: `Last 7 days vs ${TARGET_HOURS}h weeks`, up: utilization >= 70, icon: <Gauge className="size-4" />, spark: [58, 62, 60, 66, 64, 69, 67, utilization] },
    { label: 'Avg. days to pay', value: `${avgDays} days`, delta: `Net ${s.workspace.paymentTerms} terms`, up: avgDays <= s.workspace.paymentTerms, icon: <Timer className="size-4" />, spark: [16, 14, 15, 12, 13, 11, 10, avgDays || 9] },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={`${RANGE_LABEL[range]} · ${billedInvoices.length} invoices billed · ${hours(totalMin)} logged`}
        actions={<>
          <Segmented<Range> value={range} onChange={setRange} options={[{ value: '30d', label: '30 days' }, { value: 'quarter', label: 'Quarter' }, { value: 'year', label: 'Year' }]} />
          <Button icon={<Download className="size-4" />} onClick={exportCsv}>Export CSV</Button>
        </>}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-center justify-between text-[12px] text-mist-400"><span>{k.label}</span>{k.icon}</div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-[26px] font-semibold tracking-tight tabular-nums">{k.value}</p>
              <span className="hidden shrink-0 pb-1.5 sm:block" aria-hidden="true"><Sparkline data={k.spark} width={80} color={k.up ? '#f4a64a' : '#e0683a'} /></span>
            </div>
            <p className={cx('mt-1 text-[12px]', k.up ? 'text-emerald-400' : 'text-orange-300')}>{k.delta}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader title="Revenue" subtitle={`${range === '30d' ? 'By week' : 'By month'}, dashed line is the prior year`} />
          <div className="px-5 pb-4 pt-2">
            <p className="text-[28px] font-semibold tracking-tight tabular-nums">{money(revenue, cur)}<span className={cx('ml-2 text-[13px] font-medium', growth >= 0 ? 'text-emerald-400' : 'text-orange-300')}>{growth >= 0 ? '+' : ''}{growth}%</span></p>
            <AreaChart data={series.data} compare={series.prev} labels={series.labels} format={(n) => money(n, cur)} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Time by project type" subtitle={`${hours(totalMin)} logged, ${RANGE_LABEL[range].toLowerCase()}`} />
          <div className="flex flex-col items-center gap-5 p-5 sm:flex-row xl:flex-col 2xl:flex-row">
            <Donut segments={byType.length ? byType : [{ label: 'None', value: 1, color: '#2d2b31' }]} center={<div><p className="text-[11px] text-mist-400">Hours</p><p className="text-[17px] font-semibold tabular-nums">{Math.round(totalMin / 60)}</p></div>} />
            <ul className="w-full space-y-2.5 text-[13px]">
              {byType.length === 0 && <li className="text-mist-400">No time logged in this range</li>}
              {byType.map((x) => (
                <li key={x.label} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: x.color }} />
                  <span className="flex-1 text-mist-300">{x.label}</span>
                  <span className="text-[12px] tabular-nums text-mist-400">{Math.round((x.value / (totalMin || 1)) * 100)}%</span>
                  <span className="w-14 text-right font-semibold tabular-nums">{hours(x.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="Revenue by client" subtitle={`Top ${Math.min(6, byClient.length)} by billed amount`} />
          <div className="p-5 pt-8">
            {byClient.length ? (<>
              <BarChart data={byClient.map((c) => c.total)} labels={byClient.map((c) => clientName(c.id).split(' ')[0])} highlight={0} format={(n) => money(n, cur)} />
              <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-4 text-[13px]">
                {byClient.slice(0, 3).map((c) => {
                  const cl = s.clients.find((x) => x.id === c.id);
                  return (
                    <li key={c.id} className="flex items-center gap-2.5">
                      {cl && <ClientLogo client={cl} size={22} />}
                      <a href={`/app/clients/view?id=${c.id}`} className="flex-1 truncate hover:underline">{clientName(c.id)}</a>
                      <span className="text-[12px] tabular-nums text-mist-400">{Math.round((c.total / byClient.reduce((a, b) => a + b.total, 0)) * 100)}%</span>
                      <span className="w-20 text-right font-semibold tabular-nums">{money(c.total, cur)}</span>
                    </li>
                  );
                })}
              </ul>
            </>) : <p className="py-10 text-center text-[13px] text-mist-400">No invoices billed in this range</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Team utilization" subtitle={`Last 7 days against a ${TARGET_HOURS}h target`} action={<Button size="sm" variant="ghost" href="/app/time">Timesheets</Button>} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-mist-400">
                <tr className="border-b border-white/[0.06]"><th className="px-5 py-2.5 font-medium">Member</th><th className="px-3 py-2.5 text-right font-medium">Logged</th><th className="px-3 py-2.5 text-right font-medium">Billable</th><th className="px-3 py-2.5 font-medium">Vs target</th><th className="px-5 py-2.5 text-right font-medium">Revenue</th></tr>
              </thead>
              <tbody>
                {team.map((t) => (
                  <tr key={t.m.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3"><span className="flex items-center gap-2.5"><Avatar name={t.m.name} photo={t.m.photo} size={28} /><span><span className="block font-semibold">{t.m.name}</span><span className="text-[12px] text-mist-400">{t.m.title}</span></span></span></td>
                    <td className="px-3 py-3 text-right tabular-nums">{hours(t.min)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-mist-300">{t.min ? `${t.billPct}%` : '0%'}</td>
                    <td className="px-3 py-3"><div className="flex items-center gap-2"><Progress value={t.util} tone={t.util >= 100 ? 'red' : 'amber'} className="w-24" /><span className="text-[12px] tabular-nums text-mist-300">{t.util}%</span></div></td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{money(Math.round(t.revenue), cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Project profitability" subtitle="Billed to date against delivery cost (logged time at member rates)" action={<Button size="sm" variant="ghost" href="/app/projects">Projects</Button>} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-mist-400">
              <tr className="border-b border-white/[0.06]"><th className="px-5 py-2.5 font-medium">Project</th><th className="px-3 py-2.5 text-right font-medium">Budget</th><th className="px-3 py-2.5 text-right font-medium">Billed</th><th className="px-3 py-2.5 font-medium">Budget used</th><th className="px-3 py-2.5 text-right font-medium">Cost</th><th className="px-5 py-2.5 text-right font-medium">Margin</th></tr>
            </thead>
            <tbody>
              {projects.map(({ p, billed, cost, marginPct }) => {
                const c = s.clients.find((x) => x.id === p.clientId);
                const used = p.budget ? Math.round((billed / p.budget) * 100) : 0;
                return (
                  <tr key={p.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3"><a href={`/app/projects/view?id=${p.id}`} className="flex items-center gap-3">{c && <ClientLogo client={c} size={28} />}<span><span className="block font-semibold hover:underline">{p.name}</span><span className="text-[12px] text-mist-400">{c?.name} · {projectType(p)}</span></span></a></td>
                    <td className="px-3 py-3 text-right tabular-nums text-mist-300">{money(p.budget, cur)}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">{money(Math.round(billed), cur)}</td>
                    <td className="px-3 py-3"><div className="flex items-center gap-2"><Progress value={used} tone={used > 100 ? 'red' : 'green'} className="w-20" /><span className="text-[12px] tabular-nums text-mist-300">{used}%</span></div></td>
                    <td className="px-3 py-3 text-right tabular-nums text-mist-300">{money(Math.round(cost), cur)}</td>
                    <td className="px-5 py-3 text-right">
                      {marginPct === null ? <Badge>Not billed yet</Badge> : <Badge tone={marginPct >= 50 ? 'green' : marginPct >= 20 ? 'amber' : 'red'}>{marginPct}%</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
