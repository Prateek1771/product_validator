import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/welcome") return NextResponse.redirect(new URL("/", request.url), 308);  // one canonical URL
  // Signed-out visitors (and crawlers) get the public landing page at "/" with a 200 instead of a login redirect.
  const signedOut = !request.cookies.get("insforge_access_token") && !request.cookies.get("insforge_refresh_token");
  const response = request.nextUrl.pathname === "/" && signedOut
    ? NextResponse.rewrite(new URL("/welcome", request.url))
    : NextResponse.next({ request });
  await updateSession({ requestCookies: request.cookies, responseCookies: response.cookies });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|robots.txt|sitemap.xml|manifest.webmanifest|screens/|api/auth).*)"],
};
