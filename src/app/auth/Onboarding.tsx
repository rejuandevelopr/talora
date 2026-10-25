import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Database, FileSpreadsheet, Mail, Plus, Sparkles, Trash2, Upload, Users } from 'lucide-react';
import { useStore, uid } from '../lib/store';
import { cx } from '../lib/format';
import type { Member } from '../lib/types';
import { Button, Field, Input, Toaster } from '../ui/ui';
import { EMAIL_RE, FieldError, Spinner, nameFromEmail, wait } from './shared';

const TEAM_SIZES = ['Just me', '2 to 5', '6 to 15', '16 to 50', '50+'];
const MAKES = ['Branding', 'Web', 'Product', 'Campaigns', 'Video'];
const SWATCHES = [
  { name: 'Amber', hex: '#f4a64a' },
  { name: 'Ember', hex: '#e0683a' },
  { name: 'Rose', hex: '#f472b6' },
  { name: 'Violet', hex: '#a78bfa' },
  { name: 'Sky', hex: '#38bdf8' },
  { name: 'Sage', hex: '#86efac' },
  { name: 'Cream', hex: '#f5eee3' },
];
const STEPS = [
  { title: 'Your studio', hint: 'The basics' },
  { title: 'Brand', hint: 'Portal look' },
  { title: 'Team', hint: 'Invite people' },
  { title: 'Clients', hint: 'Bring your data' },
];
const CSV_ROWS = [
  { name: 'Hollow Pines', contact: 'Rita Mendes', email: 'rita@hollowpines.co', industry: 'Hospitality' },
  { name: 'Marrow Coffee', contact: 'Ben Osei', email: 'ben@marrow.coffee', industry: 'Food & drink' },
  { name: 'Atlas Bikes', contact: 'Nina Ko', email: 'nina@atlasbikes.com', industry: 'Retail' },
];

type ImportMode = 'sample' | 'empty' | 'csv';

/** Hex -> readable foreground (ink or white). */
const fgFor = (hex: string) => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#08070a';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#08070a' : '#ffffff';
};
const validHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

function Chip({ active, onClick, children, multi }: { active: boolean; onClick: () => void; children: ReactNode; multi?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={multi ? active : undefined} role={multi ? undefined : 'radio'} aria-checked={multi ? undefined : active}
      className={cx('inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ring-1 transition',
        active ? 'bg-amber/15 text-amber-soft ring-amber/50' : 'bg-white/[0.03] text-mist-200 ring-white/10 hover:bg-white/[0.06] hover:text-white')}>
      {multi && active && <Check className="size-3.5" />}{children}
    </button>
  );
}

export default function Onboarding() {
  const session = useStore((s) => s.session);
  const workspace = useStore((s) => s.workspace);
  const toast = useStore((s) => s.toast);
  const [step, setStep] = useState(0);
  const [studio, setStudio] = useState(workspace.name);
  const [size, setSize] = useState('2 to 5');
  const [makes, setMakes] = useState<string[]>(['Branding', 'Web']);
  const [color, setColor] = useState(workspace.brandColor);
  const [hexDraft, setHexDraft] = useState(workspace.brandColor);
  const [invites, setInvites] = useState<string[]>(['', '']);
  const [inviteErr, setInviteErr] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<ImportMode>('sample');
  const [csv, setCsv] = useState<'idle' | 'reading' | 'ready'>('idle');
  const [studioErr, setStudioErr] = useState<string>();
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { if (!session) window.location.replace('/login'); }, [session]);
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const initial = (studio.trim()[0] ?? 'S').toUpperCase();
  const fg = fgFor(color);
  const firstName = (session?.name ?? 'there').split(' ')[0];
  const validInvites = useMemo(() => invites.map((e) => e.trim()).filter((e) => EMAIL_RE.test(e)), [invites]);

  const next = () => {
    if (step === 0) {
      if (studio.trim().length < 2) { setStudioErr('Give your studio a name.'); document.getElementById('ob-studio')?.focus(); return; }
      useStore.getState().update((s) => ({ workspace: { ...s.workspace, name: studio.trim(), slug: studio.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || s.workspace.slug } }));
    }
    if (step === 1) {
      useStore.getState().update((s) => ({ workspace: { ...s.workspace, brandColor: color } }));
    }
    if (step === 2) {
      const errs: Record<number, string> = {};
      invites.forEach((e, i) => { if (e.trim() && !EMAIL_RE.test(e.trim())) errs[i] = 'Check this email address.'; });
      setInviteErr(errs);
      if (Object.keys(errs).length) return;
      sendInvites(validInvites);
    }
    if (step < 3) setStep(step + 1);
    else finish();
  };

  const sendInvites = (emails: string[]) => {
    if (!emails.length) return;
    useStore.getState().update((s) => {
      const existing = new Set(s.members.map((m) => m.email.toLowerCase()));
      const fresh: Member[] = emails.filter((e) => !existing.has(e.toLowerCase())).map((e) => ({
        id: uid('m'), name: nameFromEmail(e), email: e.toLowerCase(), title: 'Team member', role: 'Member', photo: '', rate: 100, status: 'invited',
      }));
      return { members: [...s.members, ...fresh] };
    });
    toast(`${emails.length} invite${emails.length > 1 ? 's' : ''} sent`);
  };

  const finish = async () => {
    setFinishing(true);
    await wait(600);
    const st = useStore.getState();
    if (mode === 'empty') {
      st.update(() => ({ clients: [], projects: [], invoices: [], approvals: [], threads: [], timeEntries: [], briefs: [], activity: [] }));
    }
    st.update(() => ({ onboarded: true }));
    setFinishing(false);
    setDone(true);
    setTimeout(() => { window.location.href = '/app'; }, 1900);
  };

  const pickCsv = async () => {
    setMode('csv');
    setCsv('reading');
    await wait(1100);
    setCsv('ready');
  };

  const submit = (e: FormEvent) => { e.preventDefault(); if (!finishing && !done) next(); };

  if (done) return <Celebration color={color} name={firstName} studio={studio.trim()} />;

  return (
    <div className="w-full">
      <Toaster />
      <OnboardingStyles />

      {/* Progress */}
      <nav aria-label="Onboarding progress" className="mb-8">
        <p className="mb-3 text-[12px] text-mist-400">Step {step + 1} of {STEPS.length}</p>
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button type="button" disabled={i > step} onClick={() => i < step && setStep(i)} aria-current={i === step ? 'step' : undefined}
                className="group block w-full text-left disabled:cursor-default">
                <span className="block h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <span className={cx('block h-full rounded-full bg-amber transition-all duration-500', i < step ? 'w-full' : i === step ? 'w-1/2' : 'w-0')} />
                </span>
                <span className={cx('mt-2 flex items-center gap-1.5 text-[12px] font-semibold', i <= step ? 'text-white' : 'text-mist-400')}>
                  {i < step && <Check className="size-3 text-amber" />}<span className="truncate">{s.title}</span>
                </span>
                <span className="hidden text-[11px] text-mist-400 sm:block">{s.hint}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <form onSubmit={submit} noValidate className="rounded-2xl bg-ink-900 ring-1 ring-white/[0.07]">
        <div key={step} className="p-5 animate-[pop-in_.3s_ease] sm:p-8">
          {step === 0 && (
            <StepShell headingRef={headingRef} title={<>Welcome, {firstName}. Tell us about <span className="serif-accent text-amber-soft">your studio.</span></>} subtitle="We use this to tailor templates, pipeline stages and the starter brief prompts.">
              <div className="space-y-6">
                <Field label="Studio name">
                  <Input id="ob-studio" className="h-10" value={studio} onChange={(e) => { setStudio(e.target.value); setStudioErr(undefined); }} placeholder="Dune & Co" aria-invalid={!!studioErr || undefined} aria-describedby={studioErr ? 'ob-studio-err' : undefined} />
                  <FieldError id="ob-studio-err">{studioErr}</FieldError>
                </Field>
                <fieldset>
                  <legend className="mb-2 text-[12px] font-medium text-mist-300">Team size</legend>
                  <div role="radiogroup" aria-label="Team size" className="flex flex-wrap gap-2">
                    {TEAM_SIZES.map((t) => <Chip key={t} active={size === t} onClick={() => setSize(t)}>{t}</Chip>)}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-[12px] font-medium text-mist-300">What you make <span className="font-normal text-mist-400">(pick any)</span></legend>
                  <div className="flex flex-wrap gap-2">
                    {MAKES.map((m) => <Chip key={m} multi active={makes.includes(m)} onClick={() => setMakes((x) => (x.includes(m) ? x.filter((y) => y !== m) : [...x, m]))}>{m}</Chip>)}
                  </div>
                </fieldset>
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell headingRef={headingRef} title="Make the portal feel like yours" subtitle="Clients see your colour and mark in their portal, emails and invoices.">
              <div className="grid gap-6 md:grid-cols-[1fr_1.05fr]">
                <div className="space-y-6">
                  <fieldset>
                    <legend className="mb-2 text-[12px] font-medium text-mist-300">Brand colour</legend>
                    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Brand colour">
                      {SWATCHES.map((sw) => (
                        <button key={sw.hex} type="button" role="radio" aria-checked={color.toLowerCase() === sw.hex} aria-label={sw.name}
                          onClick={() => { setColor(sw.hex); setHexDraft(sw.hex); }}
                          className={cx('grid size-9 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-ink-900 transition', color.toLowerCase() === sw.hex ? 'ring-white' : 'ring-transparent hover:ring-white/30')}
                          style={{ background: sw.hex }}>
                          {color.toLowerCase() === sw.hex && <Check className="size-4" style={{ color: fgFor(sw.hex) }} strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <Field label="Custom colour" hint="Any hex value, for example #2f6bff">
                    <div className="flex items-center gap-2">
                      <label className="relative grid size-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg ring-1 ring-white/10" style={{ background: color }}>
                        <span className="sr-only">Pick a colour</span>
                        <input type="color" value={validHex(color) ? color : '#f4a64a'} onChange={(e) => { setColor(e.target.value); setHexDraft(e.target.value); }} className="absolute inset-0 cursor-pointer opacity-0" />
                      </label>
                      <Input className="h-10 font-mono uppercase" value={hexDraft} maxLength={7} aria-label="Hex colour"
                        onChange={(e) => { let v = e.target.value.trim(); if (v && !v.startsWith('#')) v = `#${v}`; setHexDraft(v); if (validHex(v)) setColor(v.toLowerCase()); }} />
                    </div>
                  </Field>
                  <div>
                    <p className="mb-2 text-[12px] font-medium text-mist-300">Logo mark</p>
                    <div className="flex items-center gap-3 rounded-xl bg-ink-850 p-3 ring-1 ring-white/[0.06]">
                      <span className="grid size-11 place-items-center rounded-xl font-serif text-[22px] italic transition-colors" style={{ background: color, color: fg }}>{initial}</span>
                      <span className="text-[12px] leading-snug text-mist-400">We generated a mark from your studio initial. Upload a logo any time in Settings.</span>
                    </div>
                  </div>
                </div>
                <PortalPreview color={color} fg={fg} initial={initial} studio={studio.trim() || 'Your studio'} />
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell headingRef={headingRef} title="Invite your team" subtitle="Teammates can track time, share work for approval and message clients. You can invite more later.">
              <div className="space-y-3">
                {invites.map((v, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist-400" />
                        <Input type="email" inputMode="email" className={cx('h-10 pl-9', inviteErr[i] && '!ring-orange-400/60')} placeholder={['priya@studio.com', 'tom@studio.com', 'felix@studio.com'][i]}
                          aria-label={`Teammate email ${i + 1}`} value={v} aria-invalid={!!inviteErr[i] || undefined}
                          onChange={(e) => { const n = [...invites]; n[i] = e.target.value; setInvites(n); setInviteErr((x) => ({ ...x, [i]: '' })); }} />
                      </div>
                      {invites.length > 1 && (
                        <button type="button" onClick={() => { setInvites(invites.filter((_, j) => j !== i)); setInviteErr({}); }} aria-label={`Remove email ${i + 1}`}
                          className="grid size-10 shrink-0 place-items-center rounded-lg text-mist-400 ring-1 ring-white/10 hover:bg-white/5 hover:text-white"><Trash2 className="size-4" /></button>
                      )}
                    </div>
                    <FieldError id={`ob-inv-${i}`}>{inviteErr[i]}</FieldError>
                  </div>
                ))}
                {invites.length < 3 && (
                  <button type="button" onClick={() => setInvites([...invites, ''])} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-soft hover:underline"><Plus className="size-4" />Add another</button>
                )}
                <div className="!mt-6 flex items-start gap-3 rounded-xl bg-ink-850 p-4 ring-1 ring-white/[0.06]">
                  <Users className="mt-0.5 size-4 shrink-0 text-mist-400" />
                  <p className="text-[12px] leading-relaxed text-mist-400">Invited teammates join as <span className="text-mist-200">Members</span>. Your Studio plan includes 6 seats, and clients never count as seats.</p>
                </div>
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell headingRef={headingRef} title="Bring in your clients" subtitle="Start exploring with realistic sample data, start fresh, or import from a spreadsheet.">
              <div role="radiogroup" aria-label="How to start" className="grid gap-3 sm:grid-cols-3">
                <ImportCard active={mode === 'sample'} onClick={() => setMode('sample')} icon={<Sparkles className="size-4" />} title="Start with sample data" body="8 clients, projects, invoices and approvals to explore." badge="Recommended" />
                <ImportCard active={mode === 'empty'} onClick={() => setMode('empty')} icon={<Database className="size-4" />} title="Start empty" body="A clean workspace. Add your first client when ready." />
                <ImportCard active={mode === 'csv'} onClick={pickCsv} icon={<Upload className="size-4" />} title="Import CSV" body="From HoneyBook, Dubsado, Notion or any spreadsheet." />
              </div>
              {mode === 'empty' && (
                <p className="mt-4 rounded-xl bg-ember/10 px-4 py-3 text-[12px] text-orange-200 ring-1 ring-ember/20">This clears the demo clients, projects, invoices, approvals, messages, time and briefs. Use Settings to restore the sample data later.</p>
              )}
              {mode === 'csv' && (
                <div className="mt-4 overflow-hidden rounded-xl bg-ink-850 ring-1 ring-white/[0.06]" aria-live="polite">
                  <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                    <FileSpreadsheet className="size-4 text-emerald-300" />
                    <span className="flex-1 truncate text-[13px] font-medium">clients_export.csv</span>
                    {csv === 'reading' ? <span className="flex items-center gap-1.5 text-[12px] text-mist-400"><Spinner className="size-3.5" />Reading file</span>
                      : <span className="flex items-center gap-1.5 text-[12px] text-emerald-300"><CheckCircle2 className="size-3.5" />3 rows, 4 columns mapped</span>}
                  </div>
                  {csv === 'reading' ? (
                    <div className="space-y-2 p-4"><div className="skeleton h-6" /><div className="skeleton h-6" /><div className="skeleton h-6" /></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-left text-[12px]">
                        <thead className="text-[11px] uppercase tracking-wider text-mist-400"><tr className="border-b border-white/[0.06]"><th className="px-4 py-2 font-medium">Client</th><th className="px-3 py-2 font-medium">Contact</th><th className="px-3 py-2 font-medium">Email</th><th className="px-4 py-2 font-medium">Industry</th></tr></thead>
                        <tbody>
                          {CSV_ROWS.map((r) => (
                            <tr key={r.email} className="border-b border-white/[0.04] last:border-0"><td className="px-4 py-2.5 font-semibold">{r.name}</td><td className="px-3 py-2.5 text-mist-300">{r.contact}</td><td className="px-3 py-2.5 text-mist-300">{r.email}</td><td className="px-4 py-2.5 text-mist-300">{r.industry}</td></tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="border-t border-white/[0.06] px-4 py-2.5 text-[11px] text-mist-400">Preview only. For this demo we keep the sample workspace so you have something to explore.</p>
                    </div>
                  )}
                </div>
              )}
            </StepShell>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-4 sm:px-8">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)} icon={<ArrowLeft className="size-4" />}>Back</Button> : <span />}
          <div className="flex items-center gap-2">
            {step === 2 && <Button variant="ghost" onClick={() => { setInvites(['']); setInviteErr({}); setStep(3); }}>Skip for now</Button>}
            <button type="submit" disabled={finishing || (step === 3 && mode === 'csv' && csv !== 'ready')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber px-4 text-[13px] font-semibold text-ink-950 transition hover:bg-amber-soft disabled:opacity-60">
              {finishing ? <><Spinner />Setting up</> : step === 3 ? <>Finish setup<Check className="size-4" /></> : step === 2 && validInvites.length ? <>Send {validInvites.length} invite{validInvites.length > 1 ? 's' : ''}<ArrowRight className="size-4" /></> : <>Continue<ArrowRight className="size-4" /></>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function StepShell({ title, subtitle, children, headingRef }: { title: ReactNode; subtitle: string; children: ReactNode; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="text-[24px] font-semibold leading-tight tracking-[-0.03em] outline-none sm:text-[28px]">{title}</h1>
      <p className="mb-7 mt-2 max-w-xl text-[13px] leading-relaxed text-mist-400">{subtitle}</p>
      {children}
    </div>
  );
}

function ImportCard({ active, onClick, icon, title, body, badge }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; body: string; badge?: string }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick}
      className={cx('relative flex flex-col items-start rounded-xl p-4 text-left ring-1 transition', active ? 'bg-amber/[0.07] ring-amber/50' : 'bg-ink-850 ring-white/[0.07] hover:ring-white/20')}>
      <span className={cx('grid size-8 place-items-center rounded-lg ring-1', active ? 'bg-amber text-ink-950 ring-amber' : 'bg-white/[0.04] text-mist-300 ring-white/10')}>{icon}</span>
      <span className="mt-3 text-[13px] font-semibold">{title}</span>
      <span className="mt-1 text-[12px] leading-snug text-mist-400">{body}</span>
      {badge && <span className="absolute right-3 top-3 rounded-md bg-amber/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-soft">{badge}</span>}
    </button>
  );
}

function PortalPreview({ color, fg, initial, studio }: { color: string; fg: string; initial: string; studio: string }) {
  return (
    <div aria-label="Client portal preview" className="overflow-hidden rounded-2xl bg-ink-950 ring-1 ring-white/[0.08]">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2">
        <span className="size-2 rounded-full bg-white/15" /><span className="size-2 rounded-full bg-white/15" /><span className="size-2 rounded-full bg-white/15" />
        <span className="ml-2 truncate rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-mist-400">portal.talora.app/kiln</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg font-serif text-[14px] italic transition-colors" style={{ background: color, color: fg }}>{initial}</span>
          <span className="text-[12px] font-semibold">{studio}</span>
          <span className="text-[11px] text-mist-400">×</span>
          <span className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-amber to-ember font-serif text-[11px] italic text-ink-950">K</span>
          <span className="truncate text-[12px] text-mist-300">Kiln Studio</span>
        </div>
        <p className="mt-4 text-[15px] font-semibold tracking-tight">Good to see you, Amara</p>
        <p className="text-[11px] text-mist-400">1 approval waiting for you</p>
        <div className="mt-3 rounded-xl bg-ink-900 p-3 ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between text-[11px]"><span className="font-semibold">Spring rebrand</span><span className="text-mist-400">60%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full w-3/5 rounded-full transition-colors" style={{ background: color }} /></div>
          <div className="mt-3 flex gap-1.5">
            {[0, 1, 2].map((i) => <span key={i} className="h-10 flex-1 rounded-md bg-gradient-to-br from-white/[0.08] to-white/[0.02]" style={i === 0 ? { background: `linear-gradient(135deg, ${color}, ${color}55)` } : undefined} />)}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <span className="flex h-7 flex-1 items-center justify-center rounded-md text-[11px] font-semibold transition-colors" style={{ background: color, color: fg }}>Approve</span>
          <span className="flex h-7 flex-1 items-center justify-center rounded-md text-[11px] font-semibold text-mist-200 ring-1 ring-white/10">Request changes</span>
        </div>
      </div>
    </div>
  );
}

function Celebration({ color, name, studio }: { color: string; name: string; studio: string }) {
  const pieces = useMemo(() => Array.from({ length: 44 }, (_, i) => {
    const angle = (i / 44) * Math.PI * 2 + (i % 3) * 0.2;
    const dist = 140 + ((i * 37) % 160);
    return {
      x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 40,
      r: (i * 47) % 360, d: (i % 6) * 40,
      c: [color, '#f5eee3', '#f7c58a', '#e0683a', '#f4a64a'][i % 5],
      w: i % 3 === 0 ? 6 : 8, h: i % 3 === 0 ? 6 : 14, round: i % 4 === 0,
    };
  }), [color]);
  return (
    <div className="relative flex flex-col items-center py-16 text-center" role="status" aria-live="polite">
      <OnboardingStyles />
      <div className="pointer-events-none absolute left-1/2 top-[120px]" aria-hidden="true">
        {pieces.map((p, i) => (
          <span key={i} className="ob-confetti absolute" style={{
            width: p.w, height: p.h, background: p.c, borderRadius: p.round ? 999 : 2, animationDelay: `${p.d}ms`,
            ['--x' as string]: `${p.x}px`, ['--y' as string]: `${p.y}px`, ['--r' as string]: `${p.r + 540}deg`,
          }} />
        ))}
      </div>
      <span className="ob-pop grid size-16 place-items-center rounded-2xl" style={{ background: color, color: fgFor(color) }}><Check className="size-8" strokeWidth={3} /></span>
      <h1 className="mt-7 text-[30px] font-semibold tracking-[-0.035em]">You are all set, {name}.</h1>
      <p className="mt-2 max-w-sm text-[14px] text-mist-400">{studio} is ready. Taking you to your dashboard.</p>
      <div className="mt-6 flex items-center gap-2 text-[12px] text-mist-400"><Spinner className="size-3.5" />Opening Talora</div>
    </div>
  );
}

function OnboardingStyles() {
  return (
    <style>{`
      @keyframes ob-burst { 0% { transform: translate(-50%, -50%) rotate(0); opacity: 1; } 70% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y) + 120px)) rotate(var(--r)); opacity: 0; } }
      .ob-confetti { left: 0; top: 0; animation: ob-burst 1.6s cubic-bezier(.15,.7,.3,1) both; }
      @keyframes ob-pop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
      .ob-pop { animation: ob-pop .6s cubic-bezier(.2,.7,.2,1) both; }
    `}</style>
  );
}
