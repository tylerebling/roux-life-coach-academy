import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

/**
 * Hand an authenticated Academy student to the Life Coach Simulator.
 *
 * The simulator is a separate product on a separate domain and it trusts
 * nobody. What it does trust is a short-lived statement this backend signs:
 * who the student is, which organisation they belong to, and that the Academy
 * says they are entitled. This function is the only place that statement can
 * be made, because it is the only place the private key exists.
 *
 * ---
 *
 * **The browser never sees the key and never mints anything.** It asks for a
 * launch, receives one already signed, and posts it onward. A student who
 * edits the request gets a launch for themselves, because every field is taken
 * from the verified session rather than from the request body.
 *
 * **Entitlement is checked here, not there.** The simulator cannot know what an
 * Academy enrollment is. It only knows this backend asserted one, which is
 * exactly the division of responsibility the contract is built on.
 *
 * **Two minutes.** Long enough to cross a redirect, short enough that a
 * captured launch is worthless before anyone could use it — and it is single
 * use regardless, because the simulator burns the id.
 */

const SIMULATOR_ORIGIN = Deno.env.get("LCIQ_SIM_ORIGIN") ?? "https://simulator.clientgatehq.com";
const KID = Deno.env.get("LCIQ_SIM_LAUNCH_KID") ?? "roux-2026-01";
const SOURCE_PRODUCT = "ROUX_LIFE_ACADEMY";
const CONTRACT_VERSION = "1.0.0";
/** Two minutes. The simulator clamps anything longer to five regardless. */
const TTL_SEC = 120;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const serviceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

/**
 * The exact bytes both sides sign.
 *
 * Key order is fixed and `scenarioScope` is sorted, because the simulator
 * rebuilds this string independently and compares. Two languages serialising
 * "the same" object differently is the whole reason this is written out by
 * hand rather than left to a JSON library's key ordering.
 */
function canonicalise(c: Record<string, unknown>): string {
  return JSON.stringify({
    contractVersion: c.contractVersion,
    launchId: c.launchId,
    sourceProduct: c.sourceProduct,
    kid: c.kid,
    userId: c.userId,
    tenantId: c.tenantId,
    simulatorEntitlement: c.simulatorEntitlement,
    scenarioScope: [...(c.scenarioScope as string[])].sort(),
    returnUrl: c.returnUrl,
    issuedAtSec: c.issuedAtSec,
    expiresAtSec: c.expiresAtSec,
  });
}

/** Import the PKCS#8 PEM held as a function secret. Never logged, never returned. */
async function signingKey(): Promise<CryptoKey> {
  const pem = Deno.env.get("LCIQ_SIM_LAUNCH_PRIVATE_KEY") ?? "";
  if (pem === "") throw new Error("LAUNCH_KEY_MISSING");
  const body = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (ch) => ch.charCodeAt(0));
  return await crypto.subtle.importKey("pkcs8", der, { name: "Ed25519" }, false, ["sign"]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    // WHO IS ASKING. From the bearer token, never from the body — a body-supplied
    // user id would let any student launch as any other.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "auth_required" }, 401);

    const admin = serviceClient();
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "auth_required" }, 401);
    const user = auth.user;

    // ENTITLEMENT. An active enrollment is what the Academy means by "may use
    // the simulator", and asserting it is this backend's job alone.
    const { data: enrollment, error: enrollmentError } = await admin
      .from("academy_enrollments")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (enrollmentError) return json({ error: "entitlement_unavailable" }, 503);
    const entitled = enrollment !== null && enrollment.status !== "revoked";
    if (!entitled) {
      // Refused HERE, so no launch is ever minted for a student without one.
      return json({ error: "not_entitled" }, 403);
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const claims = {
      contractVersion: CONTRACT_VERSION,
      launchId: crypto.randomUUID(),
      sourceProduct: SOURCE_PRODUCT,
      kid: KID,
      userId: user.id,
      // One Academy, one tenant. The field exists so the simulator can keep
      // products apart; it is not an Academy-side multi-tenancy feature.
      tenantId: "roux-life-coach-academy",
      simulatorEntitlement: true,
      // Empty means "whatever the simulator offers this tenant". A scope is a
      // narrowing, never a widening.
      scenarioScope: [] as string[],
      returnUrl: `${Deno.env.get("ACADEMY_ORIGIN") ?? "https://rouxlife.com"}/academy/#practice-lab`,
      issuedAtSec: nowSec,
      expiresAtSec: nowSec + TTL_SEC,
    };

    const payload = canonicalise(claims);
    const signature = new Uint8Array(
      await crypto.subtle.sign({ name: "Ed25519" }, await signingKey(), new TextEncoder().encode(payload)),
    );

    return json({
      simulatorUrl: `${SIMULATOR_ORIGIN}/api/simulator/launch`,
      payload,
      signature: btoa(String.fromCharCode(...signature)),
      claims,
    });
  } catch (error) {
    // The reason goes to the function log, where it is useful. The caller gets
    // one word, because the difference between "no key configured" and "not
    // entitled" is not a student's business.
    console.error("simulator-launch failed:", error instanceof Error ? error.message : "unknown");
    return json({ error: "launch_unavailable" }, 500);
  }
});
