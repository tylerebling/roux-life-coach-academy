import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const SOURCE_PRODUCT = "ROUX_LIFE_ACADEMY";
const TENANT_ID = "roux-life-coach-academy";
const SIMULATOR_ORIGIN = Deno.env.get("LCIQ_SIM_ORIGIN") ?? "https://simulator.clientgatehq.com";
const ACADEMY_ORIGIN = Deno.env.get("ACADEMY_ORIGIN") ?? "https://www.rouxlifecoachacademy.com";
const LAUNCH_KID = Deno.env.get("LCIQ_SIM_LAUNCH_KID") ?? "roux-2026-01";
const PREWARM_KID = Deno.env.get("LCIQ_SIM_PREWARM_KID") ?? "roux-prewarm-2026-01";
const RESULT_KID = Deno.env.get("LCIQ_SIM_RESULT_KID") ?? "simulator-result-2026-01";

const CHECKPOINTS = Object.freeze({
  "block-03-06": { lesson: 6, assignmentId: "sim-career-change", scenarioSlug: "confidence-career-change", durationSeconds: 300 },
  "block-07-10": { lesson: 10, assignmentId: "sim-relationship-disconnection", scenarioSlug: "relationship-disconnection", durationSeconds: 300 },
  "block-11-14": { lesson: 14, assignmentId: "sim-life-transition", scenarioSlug: "life-transition-identity", durationSeconds: 300 },
  "block-15-18": { lesson: 18, assignmentId: "sim-workplace-burnout", scenarioSlug: "workplace-burnout-identity", durationSeconds: 300 },
  "lesson-19-capstone": { lesson: 19, assignmentId: "sim-capstone", scenarioSlug: "capstone-integrated", durationSeconds: 600 },
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
  const material = Deno.env.get("LCIQ_SIM_RESULT_PUBLIC_KEY") ?? "";
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
function canonicalPrewarm(c: Record<string, unknown>) {
  return JSON.stringify({contractVersion:c.contractVersion,purpose:c.purpose,kid:c.kid,reservationId:c.reservationId,
    sourceProduct:c.sourceProduct,userId:c.userId,checkpointId:c.checkpointId,scenarioSlug:c.scenarioSlug,
    durationSeconds:c.durationSeconds,issuedAtSec:c.issuedAtSec,expiresAtSec:c.expiresAtSec});
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
  const signature = Uint8Array.from(atob(body.signature), ch => ch.charCodeAt(0));
  const verified = await crypto.subtle.verify("Ed25519", await resultPublicKey(), signature, new TextEncoder().encode(body.payload));
  if (!verified) return json({error:"invalid_result"},401);
  const cp = CHECKPOINTS[id];
  if (claims.assignmentId !== cp.assignmentId || claims.durationSeconds !== cp.durationSeconds ||
      typeof claims.userId !== "string" || typeof claims.resultId !== "string" || typeof claims.attemptId !== "string" ||
      typeof claims.reservationId !== "string" || typeof claims.overallScore !== "number") return json({error:"invalid_result"},401);
  const owned = await admin.from("academy_lauren_reservations").select("enrollment_id,reservation_id")
    .eq("user_id", claims.userId).eq("checkpoint_id", id).eq("reservation_id", claims.reservationId).maybeSingle();
  if (owned.error || !owned.data) return json({error:"reservation_mismatch"},403);
  const inserted = await admin.from("academy_lauren_results").insert({
    result_id:claims.resultId,attempt_id:claims.attemptId,user_id:claims.userId,enrollment_id:owned.data.enrollment_id,
    checkpoint_id:id,assignment_id:claims.assignmentId,reservation_id:claims.reservationId,
    overall_score:Math.round(claims.overallScore),competency_scores:claims.targetCompetencyScores,
    critical_safety_failure:claims.criticalSafetyFailure,status:claims.status,
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
    // Prewarming starts while the trigger presentation is still playing. It is
    // allowed only after the preceding lesson is fully complete, which proves
    // the learner legitimately reached this block boundary. Launching remains
    // stricter and requires the trigger presentation itself to be complete.
    if (body.action === "prewarm" || body.action === "cancel-prewarm") {
      if (!await lessonComplete(admin, auth.enrollment.id, cp.lesson - 1)) return json({error:"checkpoint_locked"},403);
    } else if (!await presentationComplete(admin, auth.enrollment.id, cp.lesson)) {
      return json({error:"lesson_incomplete"},403);
    }
    const row = await reservation(admin, auth.user.id, auth.enrollment.id, id);
    if (body.action === "status") {
      const result = await admin.from("academy_lauren_results").select("overall_score,status,critical_safety_failure,completed_at")
        .eq("user_id",auth.user.id).eq("checkpoint_id",id).order("completed_at",{ascending:false}).limit(1).maybeSingle();
      if (result.error) throw result.error;
      return json(result.data ? {completed:true,overallScore:result.data.overall_score,passed:result.data.status !== "needs_remediation",status:result.data.status,
        summary:result.data.critical_safety_failure ? "Your evaluation needs a safety-focused review." : "Your block-practice evaluation has been saved."} :
        {completed:false,ready:row.simulator_status === "ready",status:row.simulator_status});
    }
    const now = Math.floor(Date.now()/1000);
    if (body.action === "cancel-prewarm") {
      const claims = {contractVersion:"1.0.0",purpose:"cancel-prewarm",kid:PREWARM_KID,reservationId:row.reservation_id,
        sourceProduct:SOURCE_PRODUCT,userId:auth.user.id,checkpointId:id,scenarioSlug:cp.scenarioSlug,durationSeconds:cp.durationSeconds,
        issuedAtSec:now,expiresAtSec:now+300};
      const payload = canonicalPrewarm(claims);
      const response = await fetch(`${SIMULATOR_ORIGIN}/api/integrations/roux-academy/prewarm/cancel`,{method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({payload,signature:await sign(payload,"LCIQ_SIM_PREWARM_PRIVATE_KEY"),claims})});
      if (response.status === 409) return json({cancelled:false,claimed:true});
      if (!response.ok) return json({error:"cancellation_unavailable"},503);
      await admin.from("academy_lauren_reservations").update({reservation_id:crypto.randomUUID(),simulator_handle:null,
        simulator_status:"cancelled",expires_at:null,updated_at:new Date().toISOString()}).eq("id",row.id);
      return json({cancelled:true});
    }
    if (body.action === "prewarm") {
      const claims = {contractVersion:"1.0.0",purpose:"prewarm",kid:PREWARM_KID,reservationId:row.reservation_id,
        sourceProduct:SOURCE_PRODUCT,userId:auth.user.id,checkpointId:id,scenarioSlug:cp.scenarioSlug,durationSeconds:cp.durationSeconds,
        issuedAtSec:now,expiresAtSec:now+300};
      const payload = canonicalPrewarm(claims);
      const response = await fetch(`${SIMULATOR_ORIGIN}/api/integrations/roux-academy/prewarm`,{method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({payload,signature:await sign(payload,"LCIQ_SIM_PREWARM_PRIVATE_KEY"),claims})});
      const data = await response.json().catch(()=>({})) as Record<string, unknown>;
      if (!response.ok) return json({error:"prewarm_unavailable"},503);
      await admin.from("academy_lauren_reservations").update({simulator_handle:data.reservation ?? null,simulator_status:data.status ?? "preparing",
        expires_at:typeof data.expiresAtSec === "number" ? new Date(data.expiresAtSec*1000).toISOString() : null,updated_at:new Date().toISOString()}).eq("id",row.id);
      return json({ready:data.status === "ready",status:data.status ?? "preparing"});
    }
    if (body.action === "launch") {
      const claims = {contractVersion:"1.1.0",launchId:crypto.randomUUID(),sourceProduct:SOURCE_PRODUCT,kid:LAUNCH_KID,userId:auth.user.id,
        tenantId:TENANT_ID,simulatorEntitlement:true,scenarioScope:[cp.scenarioSlug],returnUrl:`${ACADEMY_ORIGIN}/academy/block-practice.html?checkpoint=${encodeURIComponent(id)}`,
        issuedAtSec:now,expiresAtSec:now+120,checkpointId:id,assignmentId:cp.assignmentId,durationSeconds:cp.durationSeconds,reservationId:row.reservation_id};
      const payload = canonicalLaunch(claims);
      return json({simulatorUrl:`${SIMULATOR_ORIGIN}/api/simulator/launch`,payload,signature:await sign(payload,"LCIQ_SIM_LAUNCH_PRIVATE_KEY"),claims});
    }
    return json({error:"unknown_action"},400);
  } catch (error) {
    console.error("academy-lauren failed", error instanceof Error ? error.message : "unknown");
    return json({error:"integration_unavailable"},500);
  }
});

