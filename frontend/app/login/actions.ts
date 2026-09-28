"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions, createServerClient } from "@insforge/sdk/ssr";

export type AuthState = { step: "signin" | "signup" | "verify"; email?: string; error?: string; info?: string };

export async function authAction(prev: AuthState, form: FormData): Promise<AuthState> {
  const intent = String(form.get("intent"));
  const email = String(form.get("email") ?? prev.email ?? "").trim();
  const password = String(form.get("password") ?? "");
  const auth = createAuthActions({ cookies: await cookies() });

  if (intent === "signin") {
    const { error } = await auth.signInWithPassword({ email, password });
    if (error?.statusCode === 403) return { step: "verify", email, info: "Verify your email to continue. We sent you a code." };
    if (error) return { step: "signin", email, error: error.message };
    redirect("/");
  }
  if (intent === "signup") {
    const { data, error } = await auth.signUp({ email, password, name: String(form.get("name") ?? "") || undefined });
    if (error) return { step: "signup", email, error: error.message };
    if (data?.requireEmailVerification) return { step: "verify", email, info: `We sent a 6-digit code to ${email}.` };
    redirect("/");
  }
  if (intent === "verify") {
    const { error } = await auth.verifyEmail({ email, otp: String(form.get("otp")).trim() });
    if (error) return { step: "verify", email, error: error.message };
    redirect("/");
  }
  if (intent === "resend") {
    const { error } = await createServerClient({ cookies: await cookies() }).auth.resendVerificationEmail({ email });
    return { step: "verify", email, ...(error ? { error: error.message } : { info: "New code sent." }) };
  }
  return prev;
}

export async function oauth(provider: "google" | "github") {
  const store = await cookies();
  const { data, error } = await createAuthActions({ cookies: store }).signInWithOAuth(provider, {
    redirectTo: new URL("/api/auth/callback", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").toString(),
    skipBrowserRedirect: true,
  });
  if (error || !data.url || !data.codeVerifier) redirect("/login?error=oauth_failed");
  store.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600,
  });
  redirect(data.url);
}

export async function signOut() {
  await createAuthActions({ cookies: await cookies() }).signOut();
  redirect("/login");
}
