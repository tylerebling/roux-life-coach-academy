const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

/*
 * Prepare Lauren ahead of a block-practice checkpoint (owner directive 2026-11-08).
 * - The bytes the Academy signs are pinned to a fixed vector; NEW Lauren's suite pins the SAME vector
 *   (src/integration/launch/prepare-request.test.ts), so the two sides cannot drift apart silently.
 * - The page never shows Lauren as ready unless NEW Lauren reports a prepared session as ready.
 * - Prepare-ahead is OFF unless NEW_LAUREN_PREWARM_ENABLED is exactly "true".
 */
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

(async () => {
  const m = await import(pathToFileURL(path.join(root, "supabase/functions/academy-lauren/prepare-ahead.mjs")).href);

  // 1. The signed form (shared vector).
  const claims = m.prepareClaims({
    purpose: "prepare", requestId: "11111111-2222-4333-8444-555555555555", sourceProduct: "ROUX_LIFE_ACADEMY",
    kid: "roux-beta-2026-11", userId: "user-1", tenantId: "roux-life-coach-academy",
    checkpoint: { id: "block-03-06", assignmentId: "sim-career-change", durationSeconds: 300, newLaurenCase: "lauren-career-change" },
    reservationId: "66666666-7777-4888-8999-000000000000", nowSec: 1800000000,
  });
  assert.equal(
    m.canonicalPrepare(claims),
    'lciq-sim-academy-prepare/1\n{"contractVersion":"1.1.0","purpose":"prepare","requestId":"11111111-2222-4333-8444-555555555555","sourceProduct":"ROUX_LIFE_ACADEMY","kid":"roux-beta-2026-11","userId":"user-1","tenantId":"roux-life-coach-academy","scenarioScope":["lauren-career-change"],"checkpointId":"block-03-06","assignmentId":"sim-career-change","durationSeconds":300,"reservationId":"66666666-7777-4888-8999-000000000000","issuedAtSec":1800000000,"expiresAtSec":1800000060}',
  );
  assert.ok(m.canonicalPrepare(claims).startsWith(m.PREPARE_DOMAIN + "\n"), "own signing domain");
  assert.ok(claims.expiresAtSec - claims.issuedAtSec <= 120, "short-lived");
  const capstone = m.prepareClaims({ ...claims, purpose: "status", checkpoint: { id: "lesson-19-capstone", assignmentId: "sim-capstone", durationSeconds: 600, newLaurenCase: null }, nowSec: 1 });
  assert.deepEqual(capstone.scenarioScope, []);

  // 2. Status mapping: only "ready" is ready; anything unknown or missing is on_demand.
  assert.deepEqual(m.studentStatus({ status: "ready" }), { ready: true, status: "ready" });
  assert.deepEqual(m.studentStatus({ status: "preparing" }), { ready: false, status: "preparing" });
  assert.deepEqual(m.studentStatus({ status: "unavailable" }), { ready: false, status: "unavailable" });
  for (const answer of [null, undefined, {}, { status: "on_demand" }, { status: "BOOTING" }, { status: 7 }]) {
    assert.deepEqual(m.studentStatus(answer), { ready: false, status: "on_demand" });
  }
  for (const text of Object.values(m.STATUS_TEXT)) {
    assert.doesNotMatch(text, /gpu|runpod|vast|pod|provider|error|server|nvidia/i, "customer language only");
  }

  // 3. The page shows the four statuses truthfully and polls only while preparing.
  const page = read("academy/block-practice.html");
  for (const text of Object.values(m.STATUS_TEXT)) assert.ok(page.includes(text), `page shows: ${text}`);
  assert.ok(!page.includes("Lauren is ready when you are."), "no unconditional ready message");
  assert.ok(!page.includes("may already be ready"), "no claim that background warm-up happened");
  assert.match(page, /if\(shown==='preparing'\)window\.rouxPracticePoll=setTimeout/);

  // 4. The edge function: off by default, no false ready, cancel never ends a started session.
  const fn = read("supabase/functions/academy-lauren/index.ts");
  assert.match(fn, /NEW_LAUREN_PREWARM_ENABLED"\) \?\? ""\)\.trim\(\) === "true"/);
  assert.ok(!fn.includes('{completed:false,ready:true,status:"on_demand"}'), "the false ready is gone");
  assert.match(fn, /if \(!PREWARM_ENABLED\) return json\(\{ready:false,status:"on_demand"\}\);/);
  assert.match(fn, /\/api\/academy\/prewarm/);
  assert.match(fn, /answer\.cancelled !== false/);

  // 5. The lesson warm-up still releases a preparation after a one-minute pause (the existing, tested rule).
  const warm = read("academy/academy/lauren-prewarm.js");
  assert.match(warm, /setTimeout\(\(\) => void cancelPrewarm\(\), 60_000\)/);

  console.log("lauren-prepare-ahead: ok");
})().catch((error) => { console.error(error); process.exit(1); });
