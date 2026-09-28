import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

/** RLS-scoped client for Server Components / Actions. */
export async function serverClient() {
  return createServerClient({ cookies: await cookies() });
}

export async function currentUser() {
  const { data } = await (await serverClient()).auth.getCurrentUser();
  return data?.user ?? null;
}
