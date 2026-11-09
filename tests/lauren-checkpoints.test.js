const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "academy/academy/lauren-checkpoints.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const config = context.window.rouxLaurenCheckpoints;
assert.equal(config.PREWARM_REMAINING_SECONDS, 480);
assert.deepEqual(
  Array.from(config.checkpoints, (x) => x.id),
  ["block-03-06", "block-07-10", "block-11-14", "block-15-18", "lesson-19-capstone"],
);
assert.deepEqual(
  Array.from(config.checkpoints.slice(0, 4), (x) => x.triggerLesson),
  [6, 10, 14, 18],
);
assert.ok(config.checkpoints.slice(0, 4).every((x) => x.durationSeconds === 300));
assert.equal(config.checkpointForLesson(19).durationSeconds, 600);
assert.equal(config.checkpointForLesson(6).scenarioSlug, "confidence-career-change");
assert.equal(config.checkpointForLesson(9), null);
assert.equal(config.checkpointForLesson(19).capstone, true);
assert.equal(config.checkpointById("block-15-18").triggerLesson, 18);
assert.equal(config.shouldRequestPrewarm({ checkpoint: config.checkpointForLesson(6), sceneIndex: 25, sceneTime: 1 }), true);
assert.equal(config.shouldRequestPrewarm({ checkpoint: config.checkpointForLesson(10), sceneIndex: 19, sceneTime: 10.9 }), false);
assert.equal(config.shouldRequestPrewarm({ checkpoint: config.checkpointForLesson(10), sceneIndex: 20, sceneTime: 0 }), true);
assert.equal(config.shouldRequestPrewarm({ checkpoint: config.checkpointForLesson(14), sceneIndex: 16, sceneTime: 11, alreadyRequested: true }), false);

assert.equal(
  config.crossedPrewarmThreshold({ previousRemaining: 481, remaining: 480 }),
  true,
);
assert.equal(
  config.crossedPrewarmThreshold({ previousRemaining: 700, remaining: 479 }),
  true,
);
assert.equal(
  config.crossedPrewarmThreshold({ previousRemaining: 470, remaining: 460 }),
  false,
);
assert.equal(
  config.crossedPrewarmThreshold({ previousRemaining: 481, remaining: 480, alreadyRequested: true }),
  false,
);
assert.equal(
  config.crossedPrewarmThreshold({ previousRemaining: Number.NaN, remaining: 480 }),
  false,
);

const edge = fs.readFileSync(path.join(root, "supabase/functions/academy-lauren/index.ts"), "utf8");
const checkpointPage = fs.readFileSync(path.join(root, "academy/block-practice.html"), "utf8");
const prewarmClient = fs.readFileSync(path.join(root, "academy/academy/lauren-prewarm.js"), "utf8");
for (const item of config.checkpoints) {
  assert.ok(edge.includes(`"${item.id}"`), `Edge Function is missing ${item.id}`);
  const lessonFile = path.join(root, `academy/lessons/lesson-${String(item.triggerLesson).padStart(2, "0")}/index.html`);
  const lesson = fs.readFileSync(lessonFile, "utf8");
  assert.ok(lesson.includes(`block-practice.html?checkpoint=${item.id}`), `Lesson ${item.triggerLesson} does not route through Lauren`);
  assert.ok(lesson.includes(`pushLesson?.({lesson:${item.triggerLesson},presentationComplete:true})`), `Lesson ${item.triggerLesson} can race its server progress save`);
}
assert.ok(edge.includes('body.action === "prewarm"'), "prewarm action is missing");
assert.ok(edge.includes('body.action === "launch"'), "launch action is missing");
assert.ok(edge.includes('body.action === "cancel-prewarm"'), "pause cancellation action is missing");
assert.ok(edge.includes('handleCallback(admin, body)'), "signed completion callback is missing");
assert.ok(checkpointPage.includes("Continue to Review"), "checkpoint does not return to the existing learning lab");
assert.ok(checkpointPage.includes("form.method='POST'"), "launch secret would be exposed in a URL");
assert.ok(prewarmClient.includes('get("adminPreview") === "1"'), "admin preview could create billable capacity");
assert.ok(prewarmClient.includes('60_000'), "paused playback does not release warm capacity after one minute");
assert.ok(prewarmClient.includes('visibilitychange'), "hidden tabs do not release warm capacity");
assert.ok(checkpointPage.includes("location.replace(lab)"), "completed practice does not continue into the Learning Lab");

// ONE SIMULATOR (2026-11-07): block practice opens NEW Lauren and nothing else.
assert.ok(!/clientgatehq|LCIQ_SIM_ORIGIN|LCIQ_SIM_LAUNCH|LCIQ_SIM_PREWARM|LCIQ_SIM_RESULT/.test(edge), "academy-lauren still names the legacy simulator");
assert.ok(edge.includes('from "../simulator-launch/new-lauren-target.ts"'), "academy-lauren must use the same NEW Lauren target as simulator-launch");
assert.ok(edge.includes('json({error:"simulator_unavailable"},503)'), "an unavailable NEW Lauren must be an honest 503, never a fallback");
assert.ok(edge.includes('contractVersion:"1.1.0"'), "checkpoint launches use contract 1.1.0");
{
  const prewarm = edge.slice(edge.indexOf('if (body.action === "prewarm") {'), edge.indexOf('if (body.action === "cancel-prewarm") {', edge.indexOf('if (body.action === "prewarm") {')));
  assert.ok(prewarm.length > 0 && !prewarm.includes("fetch("), "lesson warm-up must not call the simulator (no background GPU rental)");
}
// Prepare-ahead (owner directive 2026-11-08): the ONE outbound call is prepareAhead's, and it is gated by the flag
// (NEW_LAUREN_PREWARM_ENABLED, off by default) before anything is signed or sent.
assert.equal((edge.match(/fetch\(/g) || []).length, 1, "academy-lauren makes exactly one outbound call (prepare-ahead)");
{
  const helper = edge.slice(edge.indexOf("async function prepareAhead("), edge.indexOf("fetch("));
  assert.ok(helper.length > 0 && helper.includes("if (!PREWARM_ENABLED) return null;"), "prepare-ahead must be off unless enabled");
}
for (const [id, slug] of [["block-03-06","lauren-career-change"],["block-07-10","lauren-relationship-disconnection"],["block-11-14","lauren-divorce-rebuilding"],["block-15-18","workplace-burnout-identity"]]) {
  assert.ok(new RegExp(`"${id}":[^\n]*newLaurenCase: "${slug}"`).test(edge), `${id} must practise ${slug}`);
}
assert.ok(/"lesson-19-capstone":[^\r\n]*newLaurenCase: null/.test(edge), "the capstone draws from the student's rotation");
assert.ok(checkpointPage.includes("typeof data.overallScore==='number'"), "a scoreless NEW Lauren completion must not render as 0%");

console.log("lauren-checkpoints: approved block map, five-minute policy, and one-way eight-minute crossing");

