/**
 * NEW Lauren is the Academy's only Life Coach Simulator (owner, 2026-11-07). Pure, so it is testable without Deno:
 *   node --test supabase/functions/simulator-launch/new-lauren-target.test.ts
 *
 * Every entitled student is launched into NEW Lauren. There is no invitation list and no fallback to the legacy
 * simulator: when NEW Lauren is not configured or not healthy the student gets a professional "unavailable" message,
 * never OLD Lauren. (The secret names still carry "BETA" from the invitation-only phase; they hold the production
 * NEW Lauren origin and signing key.)
 */
export type Target = { readonly origin: string; readonly kid: string; readonly keySecret: string };

export function newLaurenTarget(env: (name: string) => string | undefined): Target | null {
  const origin = (env("NEW_LAUREN_BETA_ORIGIN") ?? "").trim().replace(/\/+$/, "");
  const kid = (env("NEW_LAUREN_BETA_KID") ?? "roux-beta-2026-11").trim();
  const key = env("NEW_LAUREN_BETA_PRIVATE_KEY") ?? "";
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin) || kid === "" || key.trim() === "") return null;
  return { origin, kid, keySecret: "NEW_LAUREN_BETA_PRIVATE_KEY" };
}

/** True only for a 200 from NEW Lauren's /health within the time limit. Anything else is "unavailable". */
export async function newLaurenHealthy(
  origin: string,
  fetcher: (url: string, init: { signal: AbortSignal }) => Promise<{ ok: boolean; status: number }> = fetch,
  timeoutMs = 4000,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetcher(`${origin}/health`, { signal: controller.signal });
    return r.ok && r.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
