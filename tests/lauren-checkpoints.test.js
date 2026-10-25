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

console.log("lauren-checkpoints: approved block map, five-minute policy, and one-way eight-minute crossing");

