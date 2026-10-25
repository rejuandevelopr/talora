import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cx } from '../lib/format';
import { Checkbox, Input } from '../ui/ui';

export const DEMO_SESSION = { name: 'Sam Rivera', email: 'sam@duneandco.studio' };
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "jane.doe@studio.com" -> "Jane Doe". The demo email maps to the demo name. */
export function nameFromEmail(email: string) {
  const e = email.trim().toLowerCase();
  if (e === DEMO_SESSION.email) return DEMO_SESSION.name;
  const local = e.split('@')[0] ?? '';
  const parts = local.split(/[._\-+]+/).filter(Boolean);
  if (!parts.length) return DEMO_SESSION.name;
  return parts.slice(0, 2).map((p) => p.replace(/\d+/g, '')).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ') || DEMO_SESSION.name;
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-7">
      {eyebrow && <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-soft">{eyebrow}</p>}
      <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em]">{title}</h1>
      {subtitle && <p className="mt-2 text-[13px] leading-relaxed text-mist-400">{subtitle}</p>}
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <span id={id} role="alert" className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-orange-300">
      <AlertCircle className="size-3" />{children}
    </span>
  );
}

/** Text input with an invalid ring. */
export function AuthInput({ invalid, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <Input aria-invalid={invalid || undefined} className={cx('h-10', invalid && '!ring-orange-400/60', className)} {...p} />;
}

export function PasswordInput({ invalid, ...p }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <AuthInput {...p} invalid={invalid} type={show ? 'text' : 'password'} className="pr-10" />
      <button type="button" onClick={(e) => { e.preventDefault(); setShow((v) => !v); }} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
        className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-mist-400 transition hover:bg-white/5 hover:text-white">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cx('size-4 animate-spin', className)} aria-hidden="true" />;

/** Full width primary submit button with loading state. */
export function SubmitButton({ loading, children, loadingText }: { loading: boolean; children: ReactNode; loadingText: string }) {
  return (
    <button type="submit" disabled={loading} aria-busy={loading}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber text-[13px] font-semibold text-ink-950 transition hover:bg-amber-soft disabled:cursor-wait disabled:opacity-80">
      {loading ? <><Spinner />{loadingText}</> : children}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
      <path fill="#34A853" d="M3.4 7.5l3.2 2.3C7.5 7.9 9.5 6.4 12 6.4c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 8.2 2.3 5 4.4 3.4 7.5z" opacity=".9" />
      <path fill="#FBBC05" d="M12 21.7c2.5 0 4.7-.8 6.3-2.3l-2.9-2.4c-.8.6-1.9 1-3.4 1-3.8 0-5.3-2.6-5.5-3.9l-3.2 2.5c1.6 3.1 4.8 5.1 8.7 5.1z" opacity=".9" />
      <path fill="#4285F4" d="M21.3 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.2-1 2.2-2.1 2.9l2.9 2.4c1.8-1.6 3-4.1 3-7.6z" />
    </svg>
  );
}
function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" />
    </svg>
  );
}

export function SsoButtons({ onPick, disabled, verb = 'Continue' }: { onPick: (provider: 'Google' | 'Apple') => void; disabled?: boolean; verb?: string }) {
  const cls = 'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-white/[0.03] text-[13px] font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/[0.07] disabled:opacity-50';
  return (
    <div className="flex gap-2">
      <button type="button" className={cls} onClick={() => onPick('Google')} disabled={disabled} aria-label={`${verb} with Google`}><GoogleMark />Google</button>
      <button type="button" className={cls} onClick={() => onPick('Apple')} disabled={disabled} aria-label={`${verb} with Apple`}><AppleMark />Apple</button>
    </div>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-mist-400">
      <span className="h-px flex-1 bg-white/[0.08]" />{children}<span className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}

/** Checkbox from the kit plus a clickable text label. */
export function CheckRow({ checked, onChange, children, label }: { checked: boolean; onChange: () => void; children: ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="pt-0.5"><Checkbox checked={checked} onChange={onChange} label={label} /></span>
      <span onClick={onChange} className="cursor-pointer select-none text-[12px] leading-snug text-mist-300">{children}</span>
    </div>
  );
}
