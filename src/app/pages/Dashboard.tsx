import { ArrowUpRight, Clock, FolderKanban, Plus, Sparkles, Wallet, AlertCircle } from 'lucide-react';
import { useStore, invoiceTotal, projectProgress } from '../lib/store';
import { cx, date, daysBetween, hours, money, relative, today, addDays } from '../lib/format';
import { AreaChart, Donut } from '../ui/charts';
import { Avatar, AvatarStack, Button, Card, CardHeader, ClientLogo, HealthBadge, PageHeader, Progress, Stat, useMe } from '../ui/ui';

export default function Dashboard() {
  const me = useMe();
  const s = useStore();
  const now = today();
  const month = now.slice(0, 7);

  const paidThisMonth = s.invoices.filter((i) => i.status === 'paid' && i.paidAt?.startsWith(month)).reduce((a, i) => a + invoiceTotal(i), 0);
  const outstanding = s.invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((a, i) => a + invoiceTotal(i), 0);
  const overdue = s.invoices.filter((i) => i.status === 'overdue').reduce((a, i) => a + invoiceTotal(i), 0);
  const active = s.projects.filter((p) => p.status !== 'done');
  const weekStart = addDays(now, -6);
  const weekMinutes = s.timeEntries.filter((e) => e.date >= weekStart && e.date <= now).reduce((a, e) => a + e.minutes, 0);

  const revenue = [18200, 21400, 19800, 24600, 22100, 27300, 25900, 29800, 31200, 28400, 33600, 36100];
  const prev = [14100, 16800, 17200, 18900, 19400, 21300, 20800, 22900, 24100, 23800, 25200, 27400];
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

  const pending = s.approvals.filter((a) => a.status === 'pending');
  const deadlines = s.projects
    .flatMap((p) => p.tasks.filter((t) => !t.done).map((t) => ({ ...t, project: p })))
    .filter((t) => daysBetween(now, t.due) <= 14)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 6);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>{greet}, {me.name.split(' ')[0]}</>}
        subtitle={`${date(now, { weekday: 'long', month: 'long', day: 'numeric' })} · ${pending.length} approvals waiting · ${s.invoices.filter((i) => i.status === 'overdue').length} invoice overdue`}
        actions={<>
          <Button href="/app/briefs" icon={<Sparkles className="size-4" />}>Generate brief</Button>
          <Button href="/app/invoices/new" variant="primary" icon={<Plus className="size-4" />}>New invoice</Button>
        </>}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Paid this month" value={money(paidThisMonth)} delta="+18% vs last month" tone="up" icon={<Wallet className="size-4" />} />
        <Stat label="Outstanding" value={money(outstanding)} delta={overdue ? `${money(overdue)} overdue` : 'Nothing overdue'} tone={overdue ? 'down' : 'neutral'} icon={<AlertCircle className="size-4" />} />
        <Stat label="Active projects" value={active.length} delta={`${active.filter((p) => p.health !== 'on_track').length} need attention`} icon={<FolderKanban className="size-4" />} />
        <Stat label="Hours this week" value={hours(weekMinutes)} delta="82% billable" tone="up" icon={<Clock className="size-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader title="Revenue" subtitle="Last 12 months vs previous year" action={<Button size="sm" variant="ghost" href="/app/reports">Reports <ArrowUpRight className="size-3.5" /></Button>} />
          <div className="px-5 pb-4 pt-2">
            <p className="text-[28px] font-semibold tracking-tight">{money(revenue.reduce((a, b) => a + b, 0))}<span className="ml-2 text-[13px] font-medium text-emerald-400">+24.6%</span></p>
            <AreaChart data={revenue} compare={prev} labels={months} format={(n) => money(n)} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Cash flow" subtitle="All open and paid invoices" />
          <div className="flex flex-col items-center gap-5 p-5 sm:flex-row xl:flex-col 2xl:flex-row">
            {(() => {
              const paid = s.invoices.filter((i) => i.status === 'paid').reduce((a, i) => a + invoiceTotal(i), 0);
              const sent = s.invoices.filter((i) => i.status === 'sent').reduce((a, i) => a + invoiceTotal(i), 0);
              const draft = s.invoices.filter((i) => i.status === 'draft').reduce((a, i) => a + invoiceTotal(i), 0);
              const segs = [
                { label: 'Paid', value: paid, color: '#f4a64a' },
                { label: 'Awaiting payment', value: sent, color: '#f5eee3' },
                { label: 'Overdue', value: overdue, color: '#e0683a' },
                { label: 'Draft', value: draft, color: '#3d3a41' },
              ];
              return (<>
                <Donut segments={segs} center={<div><p className="text-[11px] text-mist-400">Total</p><p className="text-[17px] font-semibold">{money(paid + sent + overdue + draft, 'USD', true)}</p></div>} />
                <ul className="w-full space-y-2.5 text-[13px]">
                  {segs.map((x) => <li key={x.label} className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: x.color }} /><span className="flex-1 text-mist-300">{x.label}</span><span className="font-semibold tabular-nums">{money(x.value)}</span></li>)}
                </ul>
              </>);
            })()}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader title="Active projects" subtitle={`${active.length} in flight`} action={<Button size="sm" variant="ghost" href="/app/projects">View all <ArrowUpRight className="size-3.5" /></Button>} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-mist-400"><tr className="border-b border-white/[0.06]"><th className="px-5 py-2.5 font-medium">Project</th><th className="px-3 py-2.5 font-medium">Progress</th><th className="px-3 py-2.5 font-medium">Due</th><th className="px-3 py-2.5 font-medium">Team</th><th className="px-5 py-2.5 font-medium">Health</th></tr></thead>
              <tbody>
                {active.slice(0, 6).map((p) => {
                  const c = s.clients.find((x) => x.id === p.clientId)!;
                  const prog = projectProgress(p);
                  const left = daysBetween(now, p.due);
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3"><a href={`/app/projects/view?id=${p.id}`} className="flex items-center gap-3"><ClientLogo client={c} size={30} /><span><span className="block font-semibold hover:underline">{p.name}</span><span className="text-[12px] text-mist-400">{c.name}</span></span></a></td>
                      <td className="px-3 py-3"><div className="flex items-center gap-2"><Progress value={prog} className="w-24" /><span className="text-[12px] tabular-nums text-mist-300">{prog}%</span></div></td>
                      <td className="px-3 py-3"><span className="block">{date(p.due)}</span><span className={cx('text-[11px]', left < 7 ? 'text-orange-300' : 'text-mist-400')}>{left >= 0 ? `${left} days left` : `${-left} days late`}</span></td>
                      <td className="px-3 py-3"><AvatarStack people={p.memberIds.map((id) => s.members.find((m) => m.id === id)!).filter(Boolean)} size={24} /></td>
                      <td className="px-5 py-3"><HealthBadge health={p.health} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Waiting on clients" subtitle={`${pending.length} approvals pending`} action={<Button size="sm" variant="ghost" href="/app/approvals">Open <ArrowUpRight className="size-3.5" /></Button>} />
          <ul className="space-y-2 p-5 pt-4">
            {pending.length === 0 && <li className="py-6 text-center text-[13px] text-mist-400">Nothing waiting. Nice.</li>}
            {pending.map((a) => {
              const c = s.clients.find((x) => x.id === a.clientId)!;
              return (
                <li key={a.id}>
                  <a href={`/app/approvals?id=${a.id}`} className="flex items-center gap-3 rounded-xl bg-ink-850 p-3 ring-1 ring-white/[0.05] transition hover:ring-white/15">
                    <span className={cx('size-10 shrink-0 rounded-lg bg-gradient-to-br', a.previews[0])} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{a.title}</span><span className="text-[12px] text-mist-400">{c.name} · v{a.version} · sent {relative(a.submittedAt)}</span></span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Upcoming deadlines" subtitle="Next 14 days" />
          <ul className="divide-y divide-white/[0.05] px-5 pb-2 pt-2">
            {deadlines.map((t) => {
              const m = s.members.find((x) => x.id === t.assigneeId);
              const left = daysBetween(now, t.due);
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span className={cx('grid w-11 shrink-0 place-items-center rounded-lg py-1 text-center ring-1', left <= 2 ? 'bg-ember/10 text-orange-300 ring-ember/20' : 'bg-white/[0.03] ring-white/[0.07]')}>
                    <span className="text-[10px] uppercase">{date(t.due, { month: 'short' })}</span><span className="text-[15px] font-semibold leading-none">{date(t.due, { day: 'numeric' })}</span>
                  </span>
                  <a href={`/app/projects/view?id=${t.project.id}`} className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium hover:underline">{t.title}</span><span className="text-[12px] text-mist-400">{t.project.name} · {t.tag}</span></a>
                  {m && <Avatar name={m.name} photo={m.photo} size={26} />}
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Activity" subtitle="Across your workspace" />
          <ul className="space-y-4 p-5">
            {s.activity.slice(0, 7).map((a) => (
              <li key={a.id} className="flex gap-3 text-[13px]">
                {a.photo ? <Avatar name={a.actor} photo={a.photo} size={28} /> : <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-mist-300">{a.actor[0]}</span>}
                <p className="flex-1 leading-snug"><span className="font-semibold">{a.actor}</span> <span className="text-mist-300">{a.text}</span><span className="block text-[11px] text-mist-400">{relative(a.at)}</span></p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
