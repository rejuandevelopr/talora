import { useEffect, useMemo, useState } from 'react';
import { Bell, Plus, Search, LogOut, Settings, RotateCcw, Users, Layers, Receipt, Square, ExternalLink, CornerDownLeft } from 'lucide-react';
import { useStore } from '../lib/store';
import { cx, hours, relative } from '../lib/format';
import { Avatar, Dropdown, MenuItem, Toaster, useMe } from '../ui/ui';

/** Topbar for every app page: search palette, timer, quick create, notifications, account. */
export default function AppChrome() {
  const session = useStore((s) => s.session);
  const me = useMe();
  const notifications = useStore((s) => s.notifications);
  const markAll = useStore((s) => s.markAllNotificationsRead);
  const markOne = useStore((s) => s.markNotificationRead);
  const logout = useStore((s) => s.logout);
  const reset = useStore((s) => s.reset);
  const pendingApprovals = useStore((s) => s.approvals.filter((a) => a.status === 'pending').length);
  const unread = useStore((s) => s.threads.reduce((a, t) => a + t.unread, 0));
  const overdue = useStore((s) => s.invoices.filter((i) => i.status === 'overdue').length);
  const [palette, setPalette] = useState(false);

  // Demo auth guard
  useEffect(() => { if (!session) window.location.replace('/login'); }, [session]);

  // Sidebar count badges (sidebar is static Astro markup)
  useEffect(() => {
    const set = (href: string, n: number) => {
      const el = document.querySelector<HTMLElement>(`[data-badge="${href}"]`);
      if (!el) return;
      el.textContent = String(n);
      el.classList.toggle('hidden', n === 0);
    };
    set('/app/approvals', pendingApprovals);
    set('/app/messages', unread);
    set('/app/invoices', overdue);
  }, [pendingApprovals, unread, overdue]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <button onClick={() => setPalette(true)} aria-label="Search" className="flex h-9 min-w-0 max-w-md items-center gap-2 rounded-lg px-2.5 text-left text-[13px] text-mist-400 transition hover:text-white sm:flex-1 sm:bg-ink-900 sm:px-3 sm:ring-1 sm:ring-white/[0.07] sm:hover:ring-white/15">
        <Search className="size-4 shrink-0" /><span className="hidden flex-1 truncate sm:inline">Search clients, projects, invoices</span>
        <kbd className="hidden rounded bg-ink-700 px-1.5 py-0.5 font-sans text-[10px] text-mist-300 sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        <TimerPill />
        <Dropdown trigger={() => <button className="flex h-9 items-center gap-1.5 rounded-lg bg-amber px-3 text-[13px] font-semibold text-ink-950 hover:bg-amber-soft"><Plus className="size-4" /><span className="hidden sm:inline">New</span></button>}>
          {() => (<>
            <MenuItem href="/app/clients?new=1" icon={<Users className="size-4" />}>New client</MenuItem>
            <MenuItem href="/app/projects?new=1" icon={<Layers className="size-4" />}>New project</MenuItem>
            <MenuItem href="/app/invoices/new" icon={<Receipt className="size-4" />}>New invoice</MenuItem>
          </>)}
        </Dropdown>
        <Dropdown className="w-[340px]" trigger={() => (
          <button className="relative grid size-9 place-items-center rounded-lg text-mist-300 hover:bg-white/5 hover:text-white" aria-label="Notifications">
            <Bell className="size-[18px]" />
            {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-amber text-[9px] font-bold text-ink-950">{unreadCount}</span>}
          </button>
        )}>
          {(close) => (
            <div>
              <div className="flex items-center justify-between px-2.5 py-2"><p className="text-[13px] font-semibold">Notifications</p><button onClick={markAll} className="text-[11px] text-amber-soft hover:underline">Mark all read</button></div>
              <ul className="max-h-80 overflow-y-auto">
                {notifications.length === 0 && <li className="px-3 py-6 text-center text-[12px] text-mist-400">You are all caught up.</li>}
                {notifications.map((n) => (
                  <li key={n.id}>
                    <a href={n.href} onClick={() => { markOne(n.id); close(); }} className="flex gap-2.5 rounded-lg px-2.5 py-2.5 hover:bg-white/[0.05]">
                      <span className={cx('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-amber')} />
                      <span className="min-w-0"><span className="block text-[13px] font-medium">{n.title}</span><span className="block text-[12px] text-mist-400">{n.body}</span><span className="text-[11px] text-mist-400/70">{relative(n.at)}</span></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Dropdown>
        <Dropdown trigger={() => <button className="ml-1 rounded-full ring-2 ring-transparent transition hover:ring-white/15" aria-label="Account menu"><Avatar name={me?.name ?? 'You'} photo={me?.photo} size={32} /></button>}>
          {() => (<>
            <div className="border-b border-white/[0.07] px-2.5 pb-2.5 pt-1.5"><p className="text-[13px] font-semibold">{session?.name ?? me?.name}</p><p className="text-[12px] text-mist-400">{session?.email}</p></div>
            <div className="pt-1">
              <MenuItem href="/app/settings" icon={<Settings className="size-4" />}>Settings</MenuItem>
              <MenuItem href="/portal?client=c1" icon={<ExternalLink className="size-4" />}>Client portal preview</MenuItem>
              <MenuItem onClick={reset} icon={<RotateCcw className="size-4" />}>Reset demo data</MenuItem>
              <MenuItem onClick={() => { logout(); window.location.href = '/login'; }} icon={<LogOut className="size-4" />} danger>Sign out</MenuItem>
            </div>
          </>)}
        </Dropdown>
      </div>
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      <Toaster />
    </>
  );
}

function TimerPill() {
  const timer = useStore((s) => s.timer);
  const stop = useStore((s) => s.stopTimer);
  const project = useStore((s) => s.projects.find((p) => p.id === s.timer?.projectId));
  const [, tick] = useState(0);
  useEffect(() => { if (!timer) return; const i = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(i); }, [timer]);
  if (!timer) return null;
  const secs = Math.floor((Date.now() - timer.startedAt) / 1000);
  const hh = String(Math.floor(secs / 3600)).padStart(2, '0'), mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
  return (
    <div className="hidden items-center gap-2 rounded-lg bg-emerald-500/10 py-1 pl-3 pr-1 text-[12px] text-emerald-300 ring-1 ring-emerald-400/20 md:flex">
      <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
      <a href="/app/time" className="max-w-[140px] truncate hover:underline">{project?.name ?? 'Timer'}</a>
      <span className="font-mono tabular-nums">{hh}:{mm}:{ss}</span>
      <button onClick={stop} className="grid size-7 place-items-center rounded-md hover:bg-emerald-500/20" aria-label="Stop timer"><Square className="size-3 fill-current" /></button>
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const invoices = useStore((s) => s.invoices);
  const timeLogged = useStore((s) => s.timeEntries.reduce((a, e) => a + e.minutes, 0));

  const items = useMemo(() => {
    const pages = [
      ['Dashboard', '/app'], ['Clients', '/app/clients'], ['Projects', '/app/projects'], ['Timeline', '/app/timeline'], ['Approvals', '/app/approvals'],
      ['Invoices', '/app/invoices'], ['New invoice', '/app/invoices/new'], ['Time tracking', '/app/time'], ['Reports', '/app/reports'], ['AI Briefs', '/app/briefs'],
      ['Messages', '/app/messages'], ['Settings', '/app/settings'],
    ].map(([label, href]) => ({ group: 'Pages', label, sub: '', href }));
    const all = [
      ...pages,
      ...clients.map((c) => ({ group: 'Clients', label: c.name, sub: c.industry, href: `/app/clients/view?id=${c.id}` })),
      ...projects.map((p) => ({ group: 'Projects', label: p.name, sub: clients.find((c) => c.id === p.clientId)?.name ?? '', href: `/app/projects/view?id=${p.id}` })),
      ...invoices.map((i) => ({ group: 'Invoices', label: i.number, sub: clients.find((c) => c.id === i.clientId)?.name ?? '', href: `/app/invoices/view?id=${i.id}` })),
    ];
    const t = q.trim().toLowerCase();
    return (t ? all.filter((i) => `${i.label} ${i.sub}`.toLowerCase().includes(t)) : all.slice(0, 12)).slice(0, 30);
  }, [q, clients, projects, invoices]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
      if (e.key === 'Enter' && items[idx]) window.location.href = items[idx].href;
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [items, idx, onClose]);

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-ink-900 shadow-2xl ring-1 ring-white/10 animate-[pop-in_.2s_ease]">
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-4">
          <Search className="size-4 text-mist-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search..." className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-mist-400" />
          <kbd className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] text-mist-300">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-mist-400">No results for "{q}"</li>}
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? (lastGroup = it.group) : null;
            return (
              <li key={it.href + it.label}>
                {head && <p className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-mist-400">{head}</p>}
                <a href={it.href} onMouseEnter={() => setIdx(i)} className={cx('flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px]', i === idx ? 'bg-white/[0.07] text-white' : 'text-mist-200')}>
                  <span className="flex-1 truncate">{it.label}{it.sub && <span className="ml-2 text-mist-400">{it.sub}</span>}</span>
                  {i === idx && <CornerDownLeft className="size-3.5 text-mist-400" />}
                </a>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between border-t border-white/[0.07] px-4 py-2 text-[11px] text-mist-400"><span>↑↓ to navigate · Enter to open</span><span>{hours(timeLogged)} logged this month</span></div>
      </div>
    </div>
  );
}
