import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

async function requireUser(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("AUTH_REQUIRED");
  const admin = serviceClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("AUTH_REQUIRED");
  return { user: data.user, admin };
}

async function getCourse(admin: ReturnType<typeof serviceClient>) {
  const { data, error } = await admin.from("academy_courses").select("*").eq("slug", "roux-life-certified-coach").single();
  if (error || !data) throw new Error("COURSE_NOT_FOUND");
  return data;
}

const allowedStatuses = new Set(["pending_payment", "active", "completed", "refunded", "revoked"]);

const bootstrapAdminEmails = () => Array.from(new Set([
  "tylerebling@gmail.com",
  ...(Deno.env.get("ACADEMY_ADMIN_EMAILS") || "")
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean),
]));

async function requireAdmin(req: Request) {
  const context = await requireUser(req);
  const record = await context.admin.from("academy_admins").select("role").eq("user_id", context.user.id).maybeSingle();
  const bootstrapped = bootstrapAdminEmails();
  const emailAllowed = !!context.user.email && bootstrapped.includes(context.user.email.toLowerCase());
  if (!record.data && !emailAllowed) throw new Error("ADMIN_REQUIRED");
  // A protected bootstrap owner must always resolve as owner, even when an older\n  // academy_admins row accidentally stores the account as "admin".\n  return { ...context, role: emailAllowed ? "owner" : record.data?.role };
}

async function audit(admin: any, actor: string, action: string, targetType: string, targetId?: string, details: Record<string, unknown> = {}) {
  const result = await admin.from("academy_admin_audit_log").insert({ actor_user_id: actor, action, target_type: targetType, target_id: targetId || null, details });
  if (result.error) throw result.error;
}

async function listAllUsers(admin: any) {
  const users: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw result.error;
    users.push(...result.data.users);
    if (result.data.users.length < 1000) break;
  }
  return users;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user, admin, role } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "overview");
    const course = await getCourse(admin);

    if (action === "overview") {
      const [users, profiles, enrollments, progress, certificates, attempts, auditLog, adminRecords] = await Promise.all([
        listAllUsers(admin),
        admin.from("academy_profiles").select("user_id,full_name,created_at,updated_at"),
        admin.from("academy_enrollments").select("id,user_id,status,stripe_checkout_session_id,stripe_payment_intent_id,enrolled_at,completed_at,created_at,updated_at").eq("course_id", course.id).order("created_at", { ascending: false }),
        admin.from("academy_lesson_progress").select("enrollment_id,completed_at,quiz_score,updated_at"),
        admin.from("academy_certificates").select("id,enrollment_id,user_id,certificate_number,recipient_name,final_score,issued_at,status,revoked_at,revocation_reason").order("issued_at", { ascending: false }),
        admin.from("academy_final_attempts").select("user_id,score,passed,submitted_at").order("submitted_at", { ascending: false }),
        admin.from("academy_admin_audit_log").select("id,actor_user_id,action,target_type,target_id,details,created_at").order("created_at", { ascending: false }).limit(100),
        admin.from("academy_admins").select("user_id,role,created_by,created_at,updated_at").order("created_at", { ascending: false }),
      ]);
      for (const result of [profiles, enrollments, progress, certificates, attempts, auditLog, adminRecords]) if (result.error) throw result.error;
      const profileMap = new Map((profiles.data || []).map((row: any) => [row.user_id, row]));
      const enrollmentRows = enrollments.data || [];
      const learnerRows = users.map((authUser: any) => {
        const enrollment = enrollmentRows.find((row: any) => row.user_id === authUser.id) || null;
        const lessonProgress = enrollment ? (progress.data || []).filter((row: any) => row.enrollment_id === enrollment.id) : [];
        const certificate = (certificates.data || []).find((row: any) => row.user_id === authUser.id) || null;
        const finalAttempt = (attempts.data || []).find((row: any) => row.user_id === authUser.id) || null;
        return {
          id: authUser.id,
          email: authUser.email,
          fullName: profileMap.get(authUser.id)?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || "",
          createdAt: authUser.created_at,
          lastSignInAt: authUser.last_sign_in_at,
          bannedUntil: authUser.banned_until,
          enrollment,
          lessonsComplete: lessonProgress.filter((row: any) => row.completed_at).length,
          averageQuizScore: lessonProgress.length ? Math.round(lessonProgress.reduce((sum: number, row: any) => sum + Number(row.quiz_score || 0), 0) / lessonProgress.length) : 0,
          certificate,
          finalAttempt,
        };
      });
      const recordMap = new Map((adminRecords.data || []).map((record: any) => [record.user_id, record]));
      const bootstrapEmails = bootstrapAdminEmails();
      const adminCandidates = users.filter((authUser: any) =>
        recordMap.has(authUser.id) ||
        authUser.user_metadata?.academy_admin_invitation === true ||
        bootstrapEmails.includes(String(authUser.email || "").toLowerCase())
      );
      const administrators = adminCandidates.map((authUser: any) => {
        const record: any = recordMap.get(authUser.id);
        const isBootstrapOwner = bootstrapEmails.includes(String(authUser.email || "").toLowerCase());
        return {
          userId: authUser.id,
          email: authUser?.email || "",
          fullName: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || "",
          role: isBootstrapOwner ? "owner" : record?.role || "admin",
          accessEnabled: isBootstrapOwner || Boolean(record),
          protectedOwner: isBootstrapOwner,
          isCurrentUser: authUser.id === user.id,
          invitedAt: record?.created_at || authUser?.invited_at || authUser?.created_at || null,
          lastSignInAt: authUser?.last_sign_in_at || null,
          confirmedAt: authUser?.email_confirmed_at || authUser?.confirmed_at || null,
        };
      });
      return json({ role, course, learners: learnerRows, certificates: certificates.data || [], auditLog: auditLog.data || [], administrators });
    }

    if (role === "support" && !["reset-password-email"].includes(action)) throw new Error("OWNER_OR_ADMIN_REQUIRED");

    if (action === "invite-admin") {
      if (role !== "owner") throw new Error("OWNER_REQUIRED");
      const email = String(body.email || "").trim().toLowerCase();
      const fullName = String(body.fullName || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
      if (fullName.length < 2) return json({ error: "Enter the administrator's name." }, 400);

      const redirectTo = "https://www.rouxlifecoachacademy.com/academy/admin/accept-invite/";
      const invited = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: fullName, academy_admin_invitation: true },
      });
      if (invited.error || !invited.data.user) {
        return json({ error: invited.error?.message || "The invitation could not be created." }, 400);
      }

      const granted = await admin.from("academy_admins").upsert({
        user_id: invited.data.user.id,
        role: "admin",
        created_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (granted.error) {
        await admin.auth.admin.deleteUser(invited.data.user.id).catch(() => undefined);
        throw granted.error;
      }

      await audit(admin, user.id, "invite_administrator", "academy_admin", invited.data.user.id, { email, role: "admin" });
      return json({ invited: true, email, userId: invited.data.user.id });
    }

    if (action === "set-admin-access") {
      if (role !== "owner") throw new Error("OWNER_REQUIRED");
      const targetUserId = String(body.userId || "").trim();
      const enabled = Boolean(body.enabled);
      if (!targetUserId) return json({ error: "Choose an administrator account." }, 400);
      if (targetUserId === user.id) return json({ error: "The owner cannot disable their own administrator access." }, 400);

      const targetResult = await admin.auth.admin.getUserById(targetUserId);
      const target = targetResult.data?.user;
      if (targetResult.error || !target) return json({ error: "Administrator account not found." }, 404);
      const targetEmail = String(target.email || "").toLowerCase();
      if (bootstrapAdminEmails().includes(targetEmail)) return json({ error: "The protected owner account cannot be disabled." }, 400);

      if (enabled) {
        const restored = await admin.from("academy_admins").upsert({
          user_id: targetUserId,
          role: "admin",
          created_by: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (restored.error) throw restored.error;
      } else {
        const disabled = await admin.from("academy_admins").delete().eq("user_id", targetUserId);
        if (disabled.error) throw disabled.error;
      }

      await audit(admin, user.id, enabled ? "restore_administrator" : "disable_administrator", "academy_admin", targetUserId, { email: targetEmail });
      return json({ updated: true, enabled, userId: targetUserId });
    }

    if (action === "update-enrollment") {
      const enrollmentId = String(body.enrollmentId || "");
      const status = String(body.status || "");
      if (!enrollmentId || !allowedStatuses.has(status)) return json({ error: "Invalid enrollment update." }, 400);
      const updated = await admin.from("academy_enrollments").update({ status, updated_at: new Date().toISOString(), ...(status === "active" ? { enrolled_at: new Date().toISOString() } : {}) }).eq("id", enrollmentId).select("id,status").single();
      if (updated.error) throw updated.error;
      await audit(admin, user.id, "update_enrollment", "enrollment", enrollmentId, { status });
      return json({ enrollment: updated.data });
    }

    if (action === "reset-progress") {
      if (role !== "owner") throw new Error("OWNER_REQUIRED");
      const enrollmentId = String(body.enrollmentId || "");
      if (!enrollmentId || body.confirm !== "RESET") return json({ error: "Reset confirmation is required." }, 400);
      const removed = await admin.from("academy_lesson_progress").delete().eq("enrollment_id", enrollmentId);
      if (removed.error) throw removed.error;
      await audit(admin, user.id, "reset_progress", "enrollment", enrollmentId);
      return json({ reset: true });
    }

    if (action === "certificate-status") {
      const certificateId = String(body.certificateId || "");
      const status = String(body.status || "");
      if (!certificateId || !["valid", "expired", "revoked"].includes(status)) return json({ error: "Invalid certificate update." }, 400);
      const reason = status === "revoked" ? String(body.reason || "").trim() : null;
      if (status === "revoked" && reason.length < 5) return json({ error: "A revocation reason is required." }, 400);
      const updated = await admin.from("academy_certificates").update({ status, revoked_at: status === "revoked" ? new Date().toISOString() : null, revocation_reason: reason }).eq("id", certificateId).select("*").single();
      if (updated.error) throw updated.error;
      await audit(admin, user.id, "certificate_status", "certificate", certificateId, { status, reason });
      return json({ certificate: updated.data });
    }

    if (action === "update-course") {
      if (role !== "owner") throw new Error("OWNER_REQUIRED");
      const priceCents = Math.max(0, Math.round(Number(body.priceCents || 0)));
      const values = { price_cents: priceCents, stripe_price_id: String(body.stripePriceId || "").trim() || null, is_published: Boolean(body.isPublished), updated_at: new Date().toISOString() };
      const updated = await admin.from("academy_courses").update(values).eq("id", course.id).select("*").single();
      if (updated.error) throw updated.error;
      await audit(admin, user.id, "update_course", "course", course.id, values);
      return json({ course: updated.data });
    }

    if (action === "refund-payment") {
      if (role !== "owner") throw new Error("OWNER_REQUIRED");
      const enrollmentId = String(body.enrollmentId || "");
      const enrollment = await admin.from("academy_enrollments").select("id,stripe_payment_intent_id,status").eq("id", enrollmentId).single();
      if (enrollment.error || !enrollment.data?.stripe_payment_intent_id) return json({ error: "No refundable payment was found." }, 400);
      const secret = Deno.env.get("STRIPE_SECRET_KEY");
      if (!secret) return json({ error: "Stripe is not configured." }, 503);
      const stripe = new Stripe(secret, { apiVersion: "2025-06-30.basil" });
      const refund = await stripe.refunds.create({ payment_intent: enrollment.data.stripe_payment_intent_id });
      await admin.from("academy_enrollments").update({ status: "refunded", updated_at: new Date().toISOString() }).eq("id", enrollmentId);
      await audit(admin, user.id, "refund_payment", "enrollment", enrollmentId, { refundId: refund.id });
      return json({ refunded: true, refundId: refund.id });
    }

    return json({ error: "Unknown administrator action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "AUTH_REQUIRED" ? 401 : message.includes("REQUIRED") ? 403 : 500;
    return json({ error: message }, status);
  }
});

