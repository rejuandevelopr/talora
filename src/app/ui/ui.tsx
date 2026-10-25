import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { X, Check, Info, AlertTriangle, Search } from 'lucide-react';
import { avatarUrl, cx, initials } from '../lib/format';
import { useStore } from '../lib/store';
import type { ApprovalStatus, Client, Health, InvoiceStatus, ProjectStatus } from '../lib/types';

/* ---------- Buttons ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-amber text-ink-950 hover:bg-amber-soft',
  secondary: 'bg-cream text-ink-950 hover:bg-white',
  ghost: 'text-mist-200 hover:bg-white/5 hover:text-white',
  outline: 'bg-white/[0.03] text-white ring-1 ring-white/10 hover:bg-white/[0.07]',
  danger: 'bg-red-500/10 text-red-300 ring-1 ring-red-400/20 hover:bg-red-500/20',
};
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: 'sm' | 'md'; icon?: ReactNode; href?: string }
export function Button({ variant = 'outline', size = 'md', icon, href, className, children, ...rest }: BtnProps) {
  const cls = cx(
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition disabled:pointer-events-none disabled:opacity-50',
    size === 'sm' ? 'h-8 px-2.5 text-[12px]' : 'h-9 px-3.5 text-[13px]',
    variants[variant], className,
  );
  if (href) return <a href={href} className={cls}>{icon}{children}</a>;
  return <button type="button" className={cls} {...rest}>{icon}{children}</button>;
}

/* ---------- Layout ---------- */
export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && <a href={back.href} className="mb-2 inline-flex items-center gap-1 text-[12px] text-mist-400 hover:text-white">← {back.label}</a>}
        <h1 className="truncate text-[26px] font-semibold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-mist-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-2xl bg-ink-900 ring-1 ring-white/[0.07]', className)} {...rest}>{children}</div>;
}
export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div><h2 className="text-[14px] font-semibold">{title}</h2>{subtitle && <p className="mt-0.5 text-[12px] text-mist-400">{subtitle}</p>}</div>
      {action}
    </div>
  );
}

export function Stat({ label, value, delta, tone = 'neutral', icon }: { label: string; value: ReactNode; delta?: string; tone?: 'up' | 'down' | 'neutral'; icon?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-[12px] text-mist-400"><span>{label}</span>{icon && <span className="text-mist-400">{icon}</span>}</div>
      <p className="mt-2 text-[26px] font-semibold tracking-tight tabular-nums">{value}</p>
      {delta && <p className={cx('mt-1 text-[12px]', tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-orange-300' : 'text-mist-400')}>{delta}</p>}
    </Card>
  );
}

/* ---------- Badges ---------- */
type Tone = 'neutral' | 'amber' | 'green' | 'red' | 'blue' | 'violet';
const tones: Record<Tone, string> = {
  neutral: 'bg-white/[0.07] text-mist-200',
  amber: 'bg-amber/15 text-amber-soft',
  green: 'bg-emerald-500/15 text-emerald-300',
  red: 'bg-red-500/15 text-red-300',
  blue: 'bg-sky-500/15 text-sky-300',
  violet: 'bg-violet-500/15 text-violet-300',
};
export function Badge({ tone = 'neutral', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}{children}
    </span>
  );
}
export const projectStatusMeta: Record<ProjectStatus, { label: string; tone: Tone }> = {
  planning: { label: 'Planning', tone: 'blue' },
  in_progress: { label: 'In progress', tone: 'amber' },
  review: { label: 'In review', tone: 'violet' },
  done: { label: 'Done', tone: 'green' },
};
export const healthMeta: Record<Health, { label: string; tone: Tone }> = {
  on_track: { label: 'On track', tone: 'green' },
  at_risk: { label: 'At risk', tone: 'amber' },
  off_track: { label: 'Off track', tone: 'red' },
};
export const invoiceStatusMeta: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Sent', tone: 'blue' },
  paid: { label: 'Paid', tone: 'green' },
  overdue: { label: 'Overdue', tone: 'red' },
};
export const approvalStatusMeta: Record<ApprovalStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Waiting', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  changes: { label: 'Changes requested', tone: 'red' },
};
export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => <Badge tone={projectStatusMeta[status].tone} dot>{projectStatusMeta[status].label}</Badge>;
export const HealthBadge = ({ health }: { health: Health }) => <Badge tone={healthMeta[health].tone}>{healthMeta[health].label}</Badge>;
export const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => <Badge tone={invoiceStatusMeta[status].tone} dot>{invoiceStatusMeta[status].label}</Badge>;
export const ApprovalStatusBadge = ({ status }: { status: ApprovalStatus }) => <Badge tone={approvalStatusMeta[status].tone} dot>{approvalStatusMeta[status].label}</Badge>;

/* ---------- People & clients ---------- */
export function Avatar({ name, photo, size = 28, className }: { name: string; photo?: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cx('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-amber/70 to-ember/70 font-semibold text-ink-950', className)} style={{ width: size, height: size, fontSize: Math.max(9, size * 0.36) }} title={name}>
      {initials(name)}
      {photo && !failed && <img src={avatarUrl(photo, size)} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />}
    </span>
  );
}
export function AvatarStack({ people, size = 26, max = 4 }: { people: { name: string; photo?: string }[]; size?: number; max?: number }) {
  const shown = people.slice(0, max);
  return (
    <span className="flex -space-x-2">
      {shown.map((p) => <Avatar key={p.name} {...p} size={size} className="ring-2 ring-ink-900" />)}
      {people.length > max && <span className="grid place-items-center rounded-full bg-ink-600 text-[10px] font-semibold ring-2 ring-ink-900" style={{ width: size, height: size }}>+{people.length - max}</span>}
    </span>
  );
}
export function ClientLogo({ client, size = 32 }: { client: Pick<Client, 'name' | 'tone'>; size?: number }) {
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-lg bg-gradient-to-br font-serif italic text-ink-950', client.tone)} style={{ width: size, height: size, fontSize: size * 0.48 }}>
      {client.name[0]}
    </span>
  );
}

/* ---------- Form controls ---------- */
const field = 'w-full rounded-lg bg-ink-850 px-3 text-[13px] text-white ring-1 ring-white/10 placeholder:text-mist-400/70 outline-none transition focus:ring-amber/60';
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cx(field, 'h-9', className)} {...p} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cx(field, 'py-2 leading-relaxed', className)} {...p} />;
export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cx(field, 'h-9 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 fill=%27none%27 stroke=%27%23aea9b0%27 stroke-width=%272%27%3E%3Cpath d=%27m3 4.5 3 3 3-3%27/%3E%3C/svg%3E")] bg-[position:right_10px_center] bg-no-repeat pr-8', className)} {...p}>{children}</select>;
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[12px] font-medium text-mist-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mist-400">{hint}</span>}
    </label>
  );
}
export function SearchInput({ value, onChange, placeholder = 'Search', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-mist-400" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
    </div>
  );
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cx('relative h-5 w-9 shrink-0 rounded-full transition', checked ? 'bg-amber' : 'bg-ink-600')}>
      <span className={cx('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
    </button>
  );
}
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange}
      className={cx('grid size-4 shrink-0 place-items-center rounded-[5px] ring-1 transition', checked ? 'bg-amber text-ink-950 ring-amber' : 'ring-white/25 hover:ring-white/50')}>
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}

/* ---------- Tabs / segmented ---------- */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('flex gap-1 overflow-x-auto border-b border-white/[0.07] [scrollbar-width:none]', className)}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cx('-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition', value === t.value ? 'border-amber text-white' : 'border-transparent text-mist-400 hover:text-white')}>
          {t.label}{t.count !== undefined && <span className="rounded-md bg-white/[0.07] px-1.5 text-[10px] text-mist-300">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-ink-850 p-0.5 ring-1 ring-white/[0.07]">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cx('flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition', value === o.value ? 'bg-ink-600 text-white' : 'text-mist-400 hover:text-white')}>{o.label}</button>
      ))}
    </div>
  );
}

/* ---------- Feedback ---------- */
export function Progress({ value, className, tone = 'amber' }: { value: number; className?: string; tone?: 'amber' | 'green' | 'red' }) {
  const color = tone === 'green' ? 'bg-emerald-400' : tone === 'red' ? 'bg-red-400' : 'bg-amber';
  return <div className={cx('h-1.5 overflow-hidden rounded-full bg-white/[0.07]', className)}><div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <span className="grid size-11 place-items-center rounded-xl bg-white/[0.05] text-mist-300 ring-1 ring-white/10">{icon}</span>}
      <p className="mt-4 text-[14px] font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-xs text-[13px] text-mist-400">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, wide }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,textarea,select,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade-in_.2s_ease]" onClick={onClose} />
      <div ref={ref} className={cx('relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-ink-900 ring-1 ring-white/10 shadow-2xl animate-[pop-in_.25s_cubic-bezier(.2,.7,.2,1)] sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <div><h2 className="text-[15px] font-semibold">{title}</h2>{subtitle && <p className="mt-0.5 text-[12px] text-mist-400">{subtitle}</p>}</div>
          <button onClick={onClose} className="grid size-7 place-items-center rounded-md text-mist-400 hover:bg-white/5 hover:text-white" aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Toaster() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded-xl bg-ink-800 px-4 py-3 text-[13px] shadow-xl ring-1 ring-white/10 animate-[pop-in_.25s_ease]">
          <span className={cx('grid size-6 place-items-center rounded-full', t.tone === 'error' ? 'bg-red-500/15 text-red-300' : t.tone === 'info' ? 'bg-sky-500/15 text-sky-300' : 'bg-emerald-500/15 text-emerald-300')}>
            {t.tone === 'error' ? <AlertTriangle className="size-3.5" /> : t.tone === 'info' ? <Info className="size-3.5" /> : <Check className="size-3.5" />}
          </span>
          <span className="flex-1">{t.text}</span>
          <button onClick={() => dismiss(t.id)} className="text-mist-400 hover:text-white" aria-label="Dismiss"><X className="size-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

/** Small click-outside dropdown. */
export function Dropdown({ trigger, children, align = 'right', className }: { trigger: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div className={cx('absolute top-full z-40 mt-2 min-w-[200px] overflow-hidden rounded-xl bg-ink-800 p-1 shadow-2xl ring-1 ring-white/10 animate-[pop-in_.15s_ease]', align === 'right' ? 'right-0' : 'left-0', className)}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
export function MenuItem({ icon, children, onClick, href, danger }: { icon?: ReactNode; children: ReactNode; onClick?: () => void; href?: string; danger?: boolean }) {
  const cls = cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-white/[0.06]', danger ? 'text-red-300' : 'text-mist-200 hover:text-white');
  return href ? <a href={href} className={cls}>{icon}{children}</a> : <button type="button" onClick={onClick} className={cls}>{icon}{children}</button>;
}

/** Lookup hooks */
export const useClient = (id?: string) => useStore((s) => s.clients.find((c) => c.id === id));
export const useMember = (id?: string) => useStore((s) => s.members.find((m) => m.id === id));
export const useMe = () => useStore((s) => s.members.find((m) => m.id === s.meId)!);
