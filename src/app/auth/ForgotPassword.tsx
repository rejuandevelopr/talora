import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, MailCheck, RotateCw } from 'lucide-react';
import { useStore } from '../lib/store';
import { Button, Field, Toaster } from '../ui/ui';
import { AuthHeading, AuthInput, EMAIL_RE, FieldError, Spinner, SubmitButton, wait } from './shared';

export default function ForgotPassword() {
  const toast = useStore((s) => s.toast);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [left, setLeft] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setError('Enter the email you signed up with.'); document.getElementById('fp-email')?.focus(); return; }
    setLoading(true);
    await wait(800);
    setLoading(false);
    setSent(true);
    setLeft(30);
  };

  const resend = async () => {
    setResending(true);
    await wait(700);
    setResending(false);
    setLeft(30);
    toast(`Reset link sent again to ${email.trim()}`);
  };

  return (
    <div>
      <Toaster />
      {!sent ? (
        <div className="animate-[pop-in_.35s_ease]">
          <AuthHeading title="Reset your password" subtitle="Enter the email you use for Talora and we will send you a secure link to choose a new password." />
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Work email">
              <AuthInput id="fp-email" type="email" inputMode="email" autoComplete="email" placeholder="you@studio.com" value={email} invalid={!!error}
                aria-describedby={error ? 'fp-email-err' : undefined} onChange={(e) => { setEmail(e.target.value); setError(undefined); }} autoFocus />
              <FieldError id="fp-email-err">{error}</FieldError>
            </Field>
            <SubmitButton loading={loading} loadingText="Sending link">Send reset link</SubmitButton>
          </form>
        </div>
      ) : (
        <div className="animate-[pop-in_.35s_ease]" role="status">
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20"><MailCheck className="size-5" /></span>
          <div className="mt-6"><AuthHeading title="Check your inbox" subtitle={<>We sent a reset link to <span className="font-semibold text-white">{email.trim()}</span>. It expires in 60 minutes. If it is not there, check your spam folder.</>} /></div>
          <div className="rounded-xl bg-ink-900 p-4 ring-1 ring-white/[0.07]">
            <p className="text-[12px] text-mist-400">Did not get it?</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[13px] tabular-nums text-mist-300" aria-live="polite">{left > 0 ? `You can resend in 0:${String(left).padStart(2, '0')}` : 'Ready to resend'}</span>
              <Button size="sm" onClick={resend} disabled={left > 0 || resending} icon={resending ? <Spinner className="size-3.5" /> : <RotateCw className="size-3.5" />}>Resend email</Button>
            </div>
          </div>
          <button type="button" onClick={() => { setSent(false); setLeft(0); }} className="mt-4 text-[12px] text-mist-400 hover:text-white">Use a different email</button>
        </div>
      )}
      <a href="/login" className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-semibold text-mist-300 hover:text-white"><ArrowLeft className="size-4" />Back to sign in</a>
    </div>
  );
}
