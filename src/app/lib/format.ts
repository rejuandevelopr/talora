import { DEMO_TODAY } from './seed';

export const money = (n: number, currency = 'USD', compact = false) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: compact || Number.isInteger(n) ? 0 : 2, notation: compact ? 'compact' : 'standard' }).format(n);

export const date = (iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('en-US', opts);

export const dateLong = (iso: string) => date(iso, { month: 'short', day: 'numeric', year: 'numeric' });

export const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** "Today" for the demo: real time if it is after the seed date, otherwise the frozen demo date. */
export const today = () => {
  const real = new Date().toISOString().slice(0, 10);
  return real > DEMO_TODAY ? real : DEMO_TODAY;
};

export const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);

export const relative = (iso: string) => {
  const then = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).getTime();
  const base = Math.max(Date.now(), new Date(`${DEMO_TODAY}T18:00:00`).getTime());
  const diff = Math.round((base - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return date(iso);
};

export const hours = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
};

export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const avatarUrl = (id?: string, size = 64) => (id ? `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${size * 2}&h=${size * 2}&q=75&crop=faces` : '');

export const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const getParam = (key: string) => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(key));
