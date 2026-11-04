import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

/**
 * STAGING ONLY: hand an ALLOWLISTED test account to the NEW Lauren's staging simulator.
 *
 * The production function `simulator-launch` is untouched and keeps sending every student to the
 * live simulator. This one exists so the new Lauren can be tested through the academy's real login and
 * signed hand-off without moving anybody:
 *
 *   - It signs ONLY for accounts whose email is in STAGING_TEST_EMAILS. Everyone else gets 403 and no
 *     launch is minted.
 *   - It signs with its OWN key pair (LCIQ_SIM_STAGING_LAUNCH_PRIVATE_KEY, kid LCIQ_SIM_STAGING_LAUNCH_KID),
 *     which only the staging simulator trusts. The production key is never used here, and the live
 *     simulator does not hold this public key, so a staging launch cannot open the live simulator.
 *   - Its destination has NO default (LCIQ_SIM_STAGING_ORIGIN): unset, it refuses.
 *   - The claims are the production contract byte for byte (same canonical form, same 120 s), so the
 *     staging test exercises exactly the hand-off production will use.
 */

const STAGING_ORIGIN = (Deno.env.get("LCIQ_SIM_STAGING_ORIGIN") ?? "").trim();
const KID = (Deno.env.get("LCIQ_SIM_STAGING_LAUNCH_KID") ?? "").trim();
const ALLOWED = new Set(
  (Deno.env.get("STAGING_TEST_EMAILS") ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
);
const RETURN_ORIGIN = (Deno.env.get("ACADEMY_STAGING_ORIGIN") ?? "").trim();
const SOURCE_PRODUCT = "ROUX_LIFE_ACADEMY";
const CONTRACT_VERSION = "1.0.0";
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

/** Byte for byte the production function's canonical form. */
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

async function signingKey(): Promise<CryptoKey> {
  const pem = Deno.env.get("LCIQ_SIM_STAGING_LAUNCH_PRIVATE_KEY") ?? "";
  if (pem === "") throw new Error("STAGING_LAUNCH_KEY_MISSING");
  const body = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (ch) => ch.charCodeAt(0));
  return await crypto.subtle.importKey("pkcs8", der, { name: "Ed25519" }, false, ["sign"]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  // Misconfigured = closed. Never a default destination, never the production key id.
  if (!/^https:\/\//.test(STAGING_ORIGIN) || KID === "" || KID === "roux-2026-01" || ALLOWED.size === 0 || !/^https:\/\//.test(RETURN_ORIGIN)) {
    return json({ error: "staging_launch_not_configured" }, 503);
  }
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "auth_required" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "auth_required" }, 401);
    const user = auth.user;
    // ONLY the named test accounts. Checked before enrollment, so no other student is ever signed for.
    if (!ALLOWED.has((user.email ?? "").toLowerCase())) return json({ error: "not_a_staging_test_account" }, 403);

    const { data: enrollment, error: enrollmentError } = await admin
      .from("academy_enrollments").select("id, status").eq("user_id", user.id).maybeSingle();
    if (enrollmentError) return json({ error: "entitlement_unavailable" }, 503);
    if (enrollment === null || enrollment.status === "revoked") return json({ error: "not_entitled" }, 403);

    const nowSec = Math.floor(Date.now() / 1000);
    const claims = {
      contractVersion: CONTRACT_VERSION,
      launchId: crypto.randomUUID(),
      sourceProduct: SOURCE_PRODUCT,
      kid: KID,
      userId: user.id,
      tenantId: "roux-life-coach-academy",
      simulatorEntitlement: true,
      scenarioScope: [] as string[],
      returnUrl: `${RETURN_ORIGIN}/academy/#practice-lab`,
      issuedAtSec: nowSec,
      expiresAtSec: nowSec + TTL_SEC,
    };
    const payload = canonicalise(claims);
    const signature = new Uint8Array(
      await crypto.subtle.sign({ name: "Ed25519" }, await signingKey(), new TextEncoder().encode(payload)),
    );
    return json({
      simulatorUrl: `${STAGING_ORIGIN}/api/simulator/launch`,
      payload,
      signature: btoa(String.fromCharCode(...signature)),
      claims,
    });
  } catch (error) {
    console.error("simulator-launch-staging failed:", error instanceof Error ? error.message : "unknown");
    return json({ error: "launch_unavailable" }, 500);
  }
});
