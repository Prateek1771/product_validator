"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { authAction, oauth, type AuthState } from "./actions";

export function LoginForm({ oauthError }: { oauthError?: string }) {
  const [state, action, pending] = useActionState(authAction, { step: "signin" } as AuthState);
  const [step, setStep] = useState<AuthState["step"] | null>(null);
  const current = step ?? state.step;
  const verify = state.step === "verify";

  const title = verify ? "Check your email" : current === "signup" ? "Create your account" : "Welcome back";
  const subtitle = verify ? `Enter the 6-digit code we sent to ${state.email}`
    : current === "signup" ? "Free to start. Your first report takes minutes." : "Sign in to see your reports and signals.";

  return (
    <div>
      <p className="label"><span className="text-amber">&gt;</span> {verify ? "verify" : current === "signup" ? "sign-up" : "sign-in"}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-dim">{subtitle}</p>

      {(state.error || oauthError) && (
        <p role="alert" className="mt-5 rounded border border-down/40 bg-down-soft px-3 py-2 font-mono text-[12px] text-down">
          {state.error ?? "Sign-in with that provider failed. Try again or use email."}
        </p>
      )}
      {state.info && !state.error && <p className="mt-5 rounded border border-amber/40 bg-amber-soft px-3 py-2 font-mono text-[12px] text-amber">{state.info}</p>}

      {verify ? (
        <form action={action} className="mt-6 space-y-3">
          <input type="hidden" name="email" value={state.email} />
          <input name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required placeholder="123456" autoFocus
                 aria-label="Verification code" className="field h-12 text-center text-lg tracking-[0.5em]" />
          <button name="intent" value="verify" disabled={pending} className="btn-amber h-10 w-full">
            {pending && <Loader2 className="size-4 animate-spin" />} Verify & continue
          </button>
          <button name="intent" value="resend" formNoValidate disabled={pending} className="w-full font-mono text-[11px] uppercase tracking-wider text-dim hover:text-fg">
            Resend code
          </button>
        </form>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button onClick={() => oauth("google")} className="btn h-10"><GoogleIcon /> Google</button>
            <button onClick={() => oauth("github")} className="btn h-10"><GitHubIcon /> GitHub</button>
          </div>
          <div className="label my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" /> or with email <div className="h-px flex-1 bg-line" />
          </div>
          <form action={action} className="space-y-3">
            {current === "signup" && (
              <label className="block">
                <span className="label mb-1.5 block">Name</span>
                <input name="name" autoComplete="name" className="field h-10" placeholder="Ada Lovelace" />
              </label>
            )}
            <label className="block">
              <span className="label mb-1.5 block">Email</span>
              <input name="email" type="email" required autoComplete="email" defaultValue={state.email} className="field h-10" placeholder="you@company.com" />
            </label>
            <label className="block">
              <span className="label mb-1.5 block">Password</span>
              <input name="password" type="password" required minLength={6}
                     autoComplete={current === "signup" ? "new-password" : "current-password"} className="field h-10" placeholder="••••••••" />
            </label>
            <button name="intent" value={current} disabled={pending} className="btn-amber h-10 w-full">
              {pending && <Loader2 className="size-4 animate-spin" />} {current === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-dim">
            {current === "signup" ? "Already have an account? " : "New here? "}
            <button onClick={() => setStep(current === "signup" ? "signin" : "signup")} className="font-medium text-amber hover:underline">
              {current === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}
