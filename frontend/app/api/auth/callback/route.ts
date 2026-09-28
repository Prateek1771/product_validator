import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const verifier = (await cookies()).get("insforge_code_verifier")?.value;
  if (!code || !verifier) return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));

  const response = NextResponse.redirect(new URL("/", request.url));
  const auth = createAuthActions({ requestCookies: request.cookies, responseCookies: response.cookies });
  const { error } = await auth.exchangeOAuthCode(code, verifier);
  if (error) return NextResponse.redirect(new URL("/login?error=exchange_failed", request.url));
  response.cookies.delete("insforge_code_verifier");
  return response;
}
