import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { newLaurenHealthy, newLaurenTarget } from "../simulator-launch/new-lauren-target.ts";

/*
 * ONE SIMULATOR (owner, 2026-11-07): block practice opens NEW Lauren Full-Duplex - the same simulator, origin and
 * signing key as `simulator-launch` (shared helper above). There is no legacy destination and no fallback: when NEW
 * Lauren is not configured or not healthy the student is told practice is unavailable (503), never sent elsewhere.
 *
 * - Launch: contract 1.1.0 = the 1.0 claims plus the signed checkpoint (id, assignment, length, reservation).
 *   NEW Lauren fixes the checkpoint's case and length on its side.
 * - Prewarm: NEW Lauren rents a GPU only when the student presses Begin, so background warm-up during a lesson is a
 *   no-op (it would rent capacity nobody may use, against the $30 budget and the one-GPU limit). The actions are
 *   kept so the lesson pages' existing calls succeed quietly.
 * - Completion: NEW Lauren signs a completion with its own result key (NEW_LAUREN_RESULT_PUBLIC_KEY / _KID) once the
 *   written evaluation exists. That evaluation has no percentage, so a completion may carry overallScore null with
 *   status "completed" - the page shows "Practice complete", never an invented number.
 */
const SOURCE_PRODUCT = "ROUX_LIFE_ACADEMY";
const TENANT_ID = "roux-life-coach-academy";
const ACADEMY_ORIGIN = Deno.env.get("ACADEMY_ORIGIN") ?? "https://roux-life-coach-academy.vercel.app";
const RESULT_KID = Deno.env.get("NEW_LAUREN_RESULT_KID") ?? "new-lauren-result-2026-11";
const LAUNCH_TTL_SEC = 120;

/** `newLaurenCase`: the NEW Lauren case each block practises (null = the student's rotation across all cases). */
const CHECKPOINTS = Object.freeze({
  "block-03-06": { lesson: 6, assignmentId: "sim-career-change", scenarioSlug: "confidence-career-change", newLaurenCase: "lauren-career-change", durationSeconds: 300 },
  "block-07-10": { lesson: 10, assignmentId: "sim-relationship-disconnection", scenarioSlug: "relationship-disconnection", newLaurenCase: "lauren-relationship-disconnection", durationSeconds: 300 },
  "block-11-14": { lesson: 14, assignmentId: "sim-life-transition", scenarioSlug: "life-transition-identity", newLaurenCase: "lauren-divorce-rebuilding", durationSeconds: 300 },
  "block-15-18": { lesson: 18, assignmentId: "sim-workplace-burnout", scenarioSlug: "workplace-burnout-identity", newLaurenCase: "workplace-burnout-identity", durationSeconds: 300 },
  "lesson-19-capstone": { lesson: 19, assignmentId: "sim-capstone", scenarioSlug: "capstone-integrated", newLaurenCase: null, durationSeconds: 600 },
} as const);

type CheckpointId = keyof typeof CHECKPOINTS;
const corsHeaders = {
  "Access-Control-Allow-Origin": ACADEMY_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const serviceClient = () => createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);
type Admin = ReturnType<typeof serviceClient>;
const checkpoint = (value: unknown) => typeof value === "string" && value in CHECKPOINTS ? value as CheckpointId : null;
const b64 = (bytes: Uint8Array) => {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
};
const derBytes = (material: string) => Uint8Array.from(
  atob(material.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "")),
  ch => ch.charCodeAt(0),
);
async function privateKey(secretName: string) {
  const material = Deno.env.get(secretName) ?? "";
  if (!material) throw new Error(`${secretName}_MISSING`);
  return crypto.subtle.importKey("pkcs8", derBytes(material), { name: "Ed25519" }, false, ["sign"]);
}
async function resultPublicKey() {
  const material = Deno.env.get("NEW_LAUREN_RESULT_PUBLIC_KEY") ?? "";
  if (!material) throw new Error("RESULT_PUBLIC_KEY_MISSING");
  const bytes = derBytes(material);
  return crypto.subtle.importKey(bytes.length === 32 ? "raw" : "spki", bytes, { name: "Ed25519" }, false, ["verify"]);
}
async function sign(payload: string, secretName: string) {
  return b64(new Uint8Array(await crypto.subtle.sign("Ed25519", await privateKey(secretName), new TextEncoder().encode(payload))));
}
function canonicalLaunch(c: Record<string, unknown>) {
  return JSON.stringify({
    contractVersion:c.contractVersion,launchId:c.launchId,sourceProduct:c.sourceProduct,kid:c.kid,userId:c.userId,
    tenantId:c.tenantId,simulatorEntitlement:c.simulatorEntitlement,scenarioScope:[...(c.scenarioScope as string[])].sort(),
    returnUrl:c.returnUrl,issuedAtSec:c.issuedAtSec,expiresAtSec:c.expiresAtSec,checkpointId:c.checkpointId,
    assignmentId:c.assignmentId,durationSeconds:c.durationSeconds,reservationId:c.reservationId,
  });
}
function canonicalCompletion(c: Record<string, unknown>) {
  const scores = Array.isArray(c.targetCompetencyScores) ? [...c.targetCompetencyScores] as Record<string, unknown>[] : [];
  scores.sort((a,b) => String(a.key).localeCompare(String(b.key)));
  return JSON.stringify({contractVersion:c.contractVersion,purpose:c.purpose,kid:c.kid,resultId:c.resultId,
    sourceProduct:c.sourceProduct,userId:c.userId,attemptId:c.attemptId,reservationId:c.reservationId,
    checkpointId:c.checkpointId,assignmentId:c.assignmentId,startedAtSec:c.startedAtSec,completedAtSec:c.completedAtSec,
    durationSeconds:c.durationSeconds,overallScore:c.overallScore,targetCompetencyScores:scores.map(s=>({key:s.key,score:s.score})),
    criticalSafetyFailure:c.criticalSafetyFailure,status:c.status,issuedAtSec:c.issuedAtSec,expiresAtSec:c.expiresAtSec});
}
/** A numeric score in 0..100 with a graded status, or - NEW Lauren's written evaluation - no score and "completed". */
function scoreOk(score: unknown, status: unknown) {
  if (score === null) return status === "completed";
  return typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100 &&
    (status === "passed" || status === "needs_remediation" || status === "pending_instructor_review");
}
async function learner(req: Request, admin: Admin) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = await admin.auth.getUser(token);
  if (auth.error || !auth.data.user) return null;
  const enrolled = await admin.from("academy_enrollments").select("id,status").eq("user_id", auth.data.user.id).maybeSingle();
  if (enrolled.error || !enrolled.data || enrolled.data.status === "revoked" || enrolled.data.status === "refunded") return null;
  return { user: auth.data.user, enrollment: enrolled.data };
}
async function presentationComplete(admin: Admin, enrollmentId: string, lessonNumber: number) {
  const lesson = await admin.from("academy_lessons").select("id").eq("lesson_number", lessonNumber).maybeSingle();
  if (lesson.error || !lesson.data) return false;
  const progress = await admin.from("academy_lesson_progress").select("presentation_complete")
    .eq("enrollment_id", enrollmentId).eq("lesson_id", lesson.data.id).maybeSingle();
  return !progress.error && progress.data?.presentation_complete === true;
}
async function lessonComplete(admin: Admin, enrollmentId: string, lessonNumber: number) {
  const lesson = await admin.from("academy_lessons").select("id").eq("lesson_number", lessonNumber).maybeSingle();
  if (lesson.error || !lesson.data) return false;
  const progress = await admin.from("academy_lesson_progress").select("completed_at")
    .eq("enrollment_id", enrollmentId).eq("lesson_id", lesson.data.id).maybeSingle();
  return !progress.error && typeof progress.data?.completed_at === "string";
}
async function reservation(admin: Admin, userId: string, enrollmentId: string, id: CheckpointId) {
  const existing = await admin.from("academy_lauren_reservations").select("*").eq("user_id", userId).eq("checkpoint_id", id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;
  const created = await admin.from("academy_lauren_reservations").insert({ user_id:userId,enrollment_id:enrollmentId,checkpoint_id:id })
    .select("*").single();
  if (created.error) {
    const raced = await admin.from("academy_lauren_reservations").select("*").eq("user_id", userId).eq("checkpoint_id", id).single();
    if (raced.error) throw created.error;
    return raced.data;
  }
  return created.data;
}
async function handleCallback(admin: Admin, body: Record<string, unknown>) {
  const claims = body.claims as Record<string, unknown> | undefined;
  if (!claims || typeof body.payload !== "string" || typeof body.signature !== "string") return json({error:"invalid_result"},401);
  const now = Math.floor(Date.now()/1000);
  const id = checkpoint(claims.checkpointId);
  if (!id || claims.contractVersion !== "1.0.0" || claims.purpose !== "completion" || claims.kid !== RESULT_KID ||
      claims.sourceProduct !== SOURCE_PRODUCT || typeof claims.issuedAtSec !== "number" || typeof claims.expiresAtSec !== "number" ||
      claims.issuedAtSec > now + 30 || claims.expiresAtSec < now - 30 || body.payload !== canonicalCompletion(claims)) return json({error:"invalid_result"},401);
  let signature: Uint8Array<ArrayBuffer>;
  try { signature = Uint8Array.from(atob(body.signature), ch => ch.charCodeAt(0)); } catch { return json({error:"invalid_result"},401); }
  const verified = await crypto.subtle.verify("Ed25519", await resultPublicKey(), signature, new TextEncoder().encode(body.payload));
  if (!verified) return json({error:"invalid_result"},401);
  const cp = CHECKPOINTS[id];
  if (claims.assignmentId !== cp.assignmentId || claims.durationSeconds !== cp.durationSeconds ||
      typeof claims.userId !== "string" || typeof claims.resultId !== "string" || typeof claims.attemptId !== "string" ||
      typeof claims.reservationId !== "string" || !scoreOk(claims.overallScore, claims.status)) return json({error:"invalid_result"},401);
  const owned = await admin.from("academy_lauren_reservations").select("enrollment_id,reservation_id")
    .eq("user_id", claims.userId).eq("checkpoint_id", id).eq("reservation_id", claims.reservationId).maybeSingle();
  if (owned.error || !owned.data) return json({error:"reservation_mismatch"},403);
  const inserted = await admin.from("academy_lauren_results").insert({
    result_id:claims.resultId,attempt_id:claims.attemptId,user_id:claims.userId,enrollment_id:owned.data.enrollment_id,
    checkpoint_id:id,assignment_id:claims.assignmentId,reservation_id:claims.reservationId,
    overall_score:typeof claims.overallScore === "number" ? Math.round(claims.overallScore) : null,
    competency_scores:Array.isArray(claims.targetCompetencyScores) ? claims.targetCompetencyScores : [],
    critical_safety_failure:claims.criticalSafetyFailure === true,status:claims.status,
    started_at:new Date(Number(claims.startedAtSec)*1000).toISOString(),completed_at:new Date(Number(claims.completedAtSec)*1000).toISOString(),
  });
  if (inserted.error?.code === "23505") return json({accepted:true,replayed:true},409);
  if (inserted.error) throw inserted.error;
  return json({accepted:true});
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:corsHeaders});
  if (req.method !== "POST") return json({error:"method_not_allowed"},405);
  try {
    const admin = serviceClient();
    const body = await req.json().catch(()=>({})) as Record<string, unknown>;
    if (body.claims && body.payload && body.signature) return await handleCallback(admin, body);
    const auth = await learner(req, admin);
    if (!auth) return json({error:"auth_required"},401);
    const id = checkpoint(body.checkpointId);
    if (!id) return json({error:"checkpoint_invalid"},400);
    const cp = CHECKPOINTS[id];
    // Warm-up requests (now no-ops) are allowed once the preceding lesson is complete; launching remains stricter
    // and requires the trigger presentation itself to be complete.
    if (body.action === "prewarm" || body.action === "cancel-prewarm") {
      if (!await lessonComplete(admin, auth.enrollment.id, cp.lesson - 1)) return json({error:"checkpoint_locked"},403);
    } else if (!await presentationComplete(admin, auth.enrollment.id, cp.lesson)) {
      return json({error:"lesson_incomplete"},403);
    }
    if (body.action === "prewarm") {
      // Deliberately no simulator call and no reservation write: NEW Lauren rents capacity only at Begin.
      return json({ready:false,status:"on_demand"});
    }
    if (body.action === "cancel-prewarm") {
      // Nothing was warmed, so there is nothing to release.
      return json({cancelled:true});
    }
    const row = await reservation(admin, auth.user.id, auth.enrollment.id, id);
    if (body.action === "status") {
      const result = await admin.from("academy_lauren_results").select("overall_score,status,critical_safety_failure,completed_at")
        .eq("user_id",auth.user.id).eq("checkpoint_id",id).order("completed_at",{ascending:false}).limit(1).maybeSingle();
      if (result.error) throw result.error;
      // NEW Lauren starts on Begin, so an open checkpoint is always "ready": there is nothing to warm in advance.
      return json(result.data ? {completed:true,overallScore:result.data.overall_score,passed:result.data.status !== "needs_remediation",status:result.data.status,
        summary:result.data.critical_safety_failure ? "Your evaluation needs a safety-focused review." : "Your block-practice evaluation has been saved."} :
        {completed:false,ready:true,status:"on_demand"});
    }
    if (body.action === "launch") {
      const target = newLaurenTarget((name) => Deno.env.get(name));
      if (target === null) {
        console.error("academy-lauren: NEW Lauren is not configured");
        return json({error:"simulator_unavailable"},503);
      }
      if (!(await newLaurenHealthy(target.origin))) {
        console.error("academy-lauren: NEW Lauren health check failed");
        return json({error:"simulator_unavailable"},503);
      }
      const now = Math.floor(Date.now()/1000);
      const claims = {contractVersion:"1.1.0",launchId:crypto.randomUUID(),sourceProduct:SOURCE_PRODUCT,kid:target.kid,userId:auth.user.id,
        tenantId:TENANT_ID,simulatorEntitlement:true,scenarioScope:cp.newLaurenCase === null ? [] as string[] : [cp.newLaurenCase as string],
        returnUrl:`${ACADEMY_ORIGIN}/academy/block-practice.html?checkpoint=${encodeURIComponent(id)}`,
        issuedAtSec:now,expiresAtSec:now+LAUNCH_TTL_SEC,checkpointId:id,assignmentId:cp.assignmentId,durationSeconds:cp.durationSeconds,
        reservationId:row.reservation_id};
      const payload = canonicalLaunch(claims);
      return json({simulatorUrl:`${target.origin}/api/simulator/launch`,payload,signature:await sign(payload,target.keySecret),claims});
    }
    return json({error:"unknown_action"},400);
  } catch (error) {
    console.error("academy-lauren failed", error instanceof Error ? error.message : "unknown");
    return json({error:"integration_unavailable"},500);
  }
});
