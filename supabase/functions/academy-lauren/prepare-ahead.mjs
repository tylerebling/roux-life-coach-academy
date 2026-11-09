/**
 * Prepare Lauren ahead of a block-practice checkpoint (owner directive 2026-11-08). Pure helpers shared by the
 * `academy-lauren` edge function (Deno) and the Academy test suite (Node), so the bytes the Academy signs are tested
 * against the exact form NEW Lauren verifies (`src/integration/launch/prepare-request.ts` in the simulator).
 *
 * The request is signed with the Academy's existing NEW Lauren launch key, but in its OWN domain: the signed bytes
 * start with `lciq-sim-academy-prepare/1`, so a prepare request can never be replayed as a launch (or the reverse).
 * Every request carries a fresh single-use requestId and lives at most two minutes.
 */
export const PREPARE_DOMAIN = "lciq-sim-academy-prepare/1";
export const PREPARE_TTL_SEC = 60;

export function canonicalPrepare(c) {
  return `${PREPARE_DOMAIN}\n${JSON.stringify({
    contractVersion: c.contractVersion, purpose: c.purpose, requestId: c.requestId, sourceProduct: c.sourceProduct,
    kid: c.kid, userId: c.userId, tenantId: c.tenantId, scenarioScope: [...c.scenarioScope].sort(),
    checkpointId: c.checkpointId, assignmentId: c.assignmentId, durationSeconds: c.durationSeconds,
    reservationId: c.reservationId, issuedAtSec: c.issuedAtSec, expiresAtSec: c.expiresAtSec,
  })}`;
}

/** The purposes NEW Lauren accepts (src/integration/launch/prepare-request.ts PREPARE_PURPOSES). */
export const PREPARE_PURPOSES = Object.freeze(["prepare", "status", "available", "hold", "restart", "cancel"]);

export function prepareClaims({ purpose, requestId, sourceProduct, kid, userId, tenantId, checkpoint, reservationId, nowSec }) {
  return {
    contractVersion: "1.1.0", purpose, requestId, sourceProduct, kid, userId, tenantId,
    scenarioScope: checkpoint.newLaurenCase === null ? [] : [checkpoint.newLaurenCase],
    checkpointId: checkpoint.id, assignmentId: checkpoint.assignmentId, durationSeconds: checkpoint.durationSeconds,
    reservationId, issuedAtSec: nowSec, expiresAtSec: nowSec + PREPARE_TTL_SEC,
  };
}

/**
 * What the block-practice page may say, from NEW Lauren's answer. Only "ready" ever shows Lauren as ready; anything
 * unknown, failed or unreachable is "on_demand" - she will be prepared when the student presses Begin, as today.
 */
export function studentStatus(answer) {
  const status = answer && typeof answer.status === "string" ? answer.status : "on_demand";
  if (status === "ready") {
    // The two-minute window, when it is open: NEW Lauren's end time and its clock, so every tab shows the same count.
    const window = typeof answer.availableUntilMs === "number" && typeof answer.serverNowMs === "number"
      ? { availableUntilMs: answer.availableUntilMs, serverNowMs: answer.serverNowMs } : {};
    return { ready: true, status: "ready", ...window };
  }
  if (status === "preparing") return { ready: false, status: "preparing" };
  if (status === "started") return { ready: false, status: "started" };
  if (status === "timed_out") return { ready: false, status: "timed_out" };
  if (status === "unavailable") return { ready: false, status: "unavailable" };
  return { ready: false, status: "on_demand" };
}

/** The page's words for each status. Customer language only: no GPU, provider, log or error text. */
export const STATUS_TEXT = Object.freeze({
  ready: "Lauren is ready for your session.",
  preparing: "Preparing your coaching session.",
  unavailable: "Your coaching session is temporarily unavailable. Please try again.",
  on_demand: "Lauren will be prepared for you when you click Start Simulator. This usually takes a few minutes.",
  timed_out: "Your Simulator Has Timed Out",
});
