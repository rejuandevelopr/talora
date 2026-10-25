import { useState, type FormEvent } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store';
import { photos } from '../lib/seed';
import { Avatar, Field } from '../ui/ui';
import { AuthHeading, AuthInput, CheckRow, DEMO_SESSION, Divider, EMAIL_RE, FieldError, PasswordInput, Spinner, SsoButtons, SubmitButton, nameFromEmail, wait } from './shared';

const SAM_PHOTO = photos.sam;

export default function Login() {
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState<null | 'form' | 'demo' | 'sso'>(null);

  const go = async (session: { name: string; email: string }, kind: 'form' | 'demo' | 'sso') => {
    setLoading(kind);
    await wait(700);
    login(session);
    window.location.href = '/app';
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Enter your work email.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'That email does not look quite right.';
    if (!password) next.password = 'Enter your password.';
    else if (password.length < 6) next.password = 'Passwords are at least 6 characters.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.email ? 'login-email' : 'login-password')?.focus();
      return;
    }
    go({ name: nameFromEmail(email), email: email.trim().toLowerCase() }, 'form');
  };

  const busy = loading !== null;

  return (
    <div className="animate-[pop-in_.35s_ease]">
      <AuthHeading title="Welcome back" subtitle="Sign in to your studio workspace. In this demo any email and password will work." />

      <button type="button" onClick={() => go(DEMO_SESSION, 'demo')} disabled={busy}
        className="group flex w-full items-center gap-3 rounded-xl bg-amber/[0.08] p-3 text-left ring-1 ring-amber/30 transition hover:bg-amber/[0.13] hover:ring-amber/50 disabled:opacity-70">
        <Avatar name="Sam Rivera" photo={SAM_PHOTO} size={36} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white"><Sparkles className="size-3.5 text-amber" />Continue with demo account</span>
          <span className="block truncate text-[12px] text-mist-400">Sam Rivera · sam@duneandco.studio</span>
        </span>
        {loading === 'demo' ? <Spinner className="text-amber" /> : <ArrowRight className="size-4 text-amber transition group-hover:translate-x-0.5" />}
      </button>

      <Divider>or sign in</Divider>

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Work email">
          <AuthInput id="login-email" type="email" autoComplete="email" inputMode="email" placeholder="you@studio.com" value={email}
            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: undefined })); }}
            invalid={!!errors.email} aria-describedby={errors.email ? 'login-email-err' : undefined} autoFocus />
          <FieldError id="login-email-err">{errors.email}</FieldError>
        </Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="text-[12px] font-medium text-mist-300">Password</label>
            <a href="/forgot-password" className="text-[12px] font-medium text-amber-soft hover:underline">Forgot password?</a>
          </div>
          <PasswordInput id="login-password" autoComplete="current-password" placeholder="Your password" value={password}
            onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: undefined })); }}
            invalid={!!errors.password} aria-describedby={errors.password ? 'login-password-err' : undefined} />
          <FieldError id="login-password-err">{errors.password}</FieldError>
        </div>
        <CheckRow checked={remember} onChange={() => setRemember((v) => !v)} label="Remember me">Remember me on this device for 30 days</CheckRow>
        <SubmitButton loading={loading === 'form'} loadingText="Signing in">Sign in</SubmitButton>
      </form>

      <div className="mt-4"><SsoButtons onPick={() => go(DEMO_SESSION, 'sso')} disabled={busy} /></div>
      {loading === 'sso' && <p className="mt-3 flex items-center justify-center gap-2 text-[12px] text-mist-400" role="status"><Spinner className="size-3.5" />Connecting to your account</p>}

      <p className="mt-8 text-center text-[13px] text-mist-400">
        New to Talora? <a href="/signup" className="font-semibold text-white hover:text-amber-soft">Create a workspace</a>
      </p>
    </div>
  );
}
