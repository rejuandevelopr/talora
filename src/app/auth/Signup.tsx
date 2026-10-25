import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { useStore } from '../lib/store';
import { cx, getParam } from '../lib/format';
import { Field } from '../ui/ui';
import { AuthHeading, AuthInput, CheckRow, DEMO_SESSION, Divider, EMAIL_RE, FieldError, PasswordInput, SsoButtons, SubmitButton, wait } from './shared';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'studio' | 'terms', string>>;

function strength(pw: string) {
  const checks = [pw.length >= 8, /[A-Z]/.test(pw) && /[a-z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  let score = checks.filter(Boolean).length;
  if (pw.length >= 14 && score >= 3) score = 4;
  if (!pw) score = 0;
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-white/10', 'bg-red-400', 'bg-orange-300', 'bg-amber', 'bg-emerald-400'];
  return { score, label: labels[score], color: colors[score], checks };
}

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studio, setStudio] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { const e = getParam('email'); if (e) setEmail(e); }, []);
  const pw = useMemo(() => strength(password), [password]);

  const finish = async (session: { name: string; email: string }, studioName: string) => {
    setLoading(true);
    await wait(900);
    const st = useStore.getState();
    st.login(session);
    st.update((s) => ({
      onboarded: false,
      workspace: { ...s.workspace, name: studioName },
      members: s.members.map((m) => (m.id === s.meId ? { ...m, name: session.name, email: session.email } : m)),
    }));
    window.location.href = '/onboarding';
  };

  const clear = (k: keyof Errors) => errors[k] && setErrors((x) => ({ ...x, [k]: undefined }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Tell us your name.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid work email.';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (studio.trim().length < 2) next.studio = 'Name your studio. You can change it later.';
    if (!terms) next.terms = 'Please accept the terms to continue.';
    setErrors(next);
    const first = (['name', 'email', 'password', 'studio'] as const).find((k) => next[k]);
    if (first) { document.getElementById(`su-${first}`)?.focus(); return; }
    if (next.terms) return;
    finish({ name: name.trim(), email: email.trim().toLowerCase() }, studio.trim());
  };

  return (
    <div className="animate-[pop-in_.35s_ease]">
      <AuthHeading eyebrow="14 day free trial" title="Create your workspace" subtitle="No card needed. Set up clients, projects and your branded portal in a few minutes." />

      <SsoButtons verb="Sign up" disabled={loading} onPick={() => finish(DEMO_SESSION, 'Dune & Co')} />
      <Divider>or with email</Divider>

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Full name">
          <AuthInput id="su-name" autoComplete="name" placeholder="Sam Rivera" value={name} invalid={!!errors.name} aria-describedby={errors.name ? 'su-name-err' : undefined}
            onChange={(e) => { setName(e.target.value); clear('name'); }} autoFocus />
          <FieldError id="su-name-err">{errors.name}</FieldError>
        </Field>
        <Field label="Work email">
          <AuthInput id="su-email" type="email" inputMode="email" autoComplete="email" placeholder="you@studio.com" value={email} invalid={!!errors.email} aria-describedby={errors.email ? 'su-email-err' : undefined}
            onChange={(e) => { setEmail(e.target.value); clear('email'); }} />
          <FieldError id="su-email-err">{errors.email}</FieldError>
        </Field>
        <div>
          <label htmlFor="su-password" className="mb-1.5 block text-[12px] font-medium text-mist-300">Password</label>
          <PasswordInput id="su-password" autoComplete="new-password" placeholder="At least 8 characters" value={password} invalid={!!errors.password}
            aria-describedby="su-password-meter" onChange={(e) => { setPassword(e.target.value); clear('password'); }} />
          <div id="su-password-meter" className="mt-2" aria-live="polite">
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => <span key={i} className={cx('h-1 flex-1 rounded-full transition-colors duration-300', pw.score >= i ? pw.color : 'bg-white/[0.08]')} />)}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
              <span className={cx('font-medium', password ? 'text-mist-200' : 'text-mist-400')}>Strength: {password ? pw.label : 'not set'}</span>
              <span className="flex gap-2.5 text-mist-400">
                {(['8+ chars', 'Aa', '123', '#?!'] as const).map((l, i) => (
                  <span key={l} className={cx('inline-flex items-center gap-0.5', pw.checks[i] && 'text-emerald-300')}>{pw.checks[i] && <Check className="size-3" />}{l}</span>
                ))}
              </span>
            </div>
          </div>
          <FieldError id="su-password-err">{errors.password}</FieldError>
        </div>
        <Field label="Studio name" hint={errors.studio ? undefined : 'Shown to clients in your portal and on invoices.'}>
          <AuthInput id="su-studio" autoComplete="organization" placeholder="Dune & Co" value={studio} invalid={!!errors.studio} aria-describedby={errors.studio ? 'su-studio-err' : undefined}
            onChange={(e) => { setStudio(e.target.value); clear('studio'); }} />
          <FieldError id="su-studio-err">{errors.studio}</FieldError>
        </Field>
        <div>
          <CheckRow checked={terms} onChange={() => { setTerms((v) => !v); clear('terms'); }} label="I agree to the Terms and Privacy Policy">
            I agree to the <a href="/terms" onClick={(e) => e.stopPropagation()} className="text-white underline-offset-2 hover:underline">Terms</a> and <a href="/privacy" onClick={(e) => e.stopPropagation()} className="text-white underline-offset-2 hover:underline">Privacy Policy</a>.
          </CheckRow>
          <FieldError id="su-terms-err">{errors.terms}</FieldError>
        </div>
        <SubmitButton loading={loading} loadingText="Creating your workspace">Create workspace</SubmitButton>
      </form>

      <p className="mt-8 text-center text-[13px] text-mist-400">
        Already have an account? <a href="/login" className="font-semibold text-white hover:text-amber-soft">Sign in</a>
      </p>
    </div>
  );
}
