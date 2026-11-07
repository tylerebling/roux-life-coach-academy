/**
 * NEW Lauren beta invitations (2026-11-07). Pure, so it is testable without Deno:
 *   node --test supabase/functions/simulator-launch/beta-invite.test.ts
 * Only a CONFIRMED email that is exactly on the list (case-insensitive) is invited. Anything else is not.
 */
export function betaInvited(email: string | null | undefined, confirmed: boolean, list: string | undefined): boolean {
  if (!confirmed || typeof email !== "string" || email.trim() === "") return false;
  const invited = (list ?? "").split(",").map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@"));
  return invited.includes(email.trim().toLowerCase());
}
