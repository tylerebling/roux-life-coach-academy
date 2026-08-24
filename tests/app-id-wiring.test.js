/**
 * app.js may not dereference an element that is not on the page.
 *
 * The bug this file exists for: app.js did
 *
 *     const practiceAction = document.getElementById("practiceLabAction");
 *     if (view.activities.presentation && view.current.number > 1) {
 *       practiceAction.href = ...
 *
 * The null check guarded the CONDITION, not the LOOKUP. No element of that id
 * has ever existed in academy/index.html, so for any student whose current
 * lesson is past Lesson 1 and whose lesson has a presentation activity, that
 * assignment threw and dashboard rendering stopped there. Every student who
 * made real progress hit it; the ones still on Lesson 1 did not, which is why
 * it survived.
 *
 * So the general rule, not just the one instance: an id handed to a bare
 * `getElementById` and then used must exist in the markup. `dashboardText`
 * and `?.` are exempt because they check before they touch — that is what
 * makes `profileInitial` a dangling reference rather than a crash.
 *
 * academy/index.html is the only page that loads app.js, so its ids are the
 * complete set.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "academy/academy/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "academy/index.html"), "utf8");
const model = require("../academy/academy/dashboard-model.js");

const idsInMarkup = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));

// ── app.js is the only consumer of these ids ────────────────────────────────
{
  const pages = fs
    .readdirSync(path.join(root, "academy"))
    .filter((f) => f.endsWith(".html"))
    .filter((f) => fs.readFileSync(path.join(root, "academy", f), "utf8").includes("app.js"));
  assert.deepEqual(pages, ["index.html"], "another page loads app.js — the id set is incomplete");
}

// ── the rule ────────────────────────────────────────────────────────────────
{
  // A bare lookup: `document.getElementById("x")` NOT immediately followed by
  // `?.`, which would be self-guarding.
  const bare = [...app.matchAll(/getElementById\("([^"]+)"\)(?!\s*\?\.)/g)].map((m) => m[1]);
  assert.ok(bare.length > 0, "no lookups found — the matcher has drifted from the source");

  const dangling = [...new Set(bare)].filter((id) => !idsInMarkup.has(id));
  assert.deepEqual(
    dangling,
    [],
    `app.js dereferences ids that are not in academy/index.html: ${dangling.join(", ")}`,
  );
}

// ── the specific corpse stays buried ────────────────────────────────────────
assert.ok(!app.includes("practiceLabAction"), "practiceLabAction wiring is back in app.js");
assert.ok(!app.includes("practiceRecommendation"), "practiceRecommendation wiring is back");
assert.ok(
  !idsInMarkup.has("practiceLabAction"),
  "a practiceLabAction element was recreated to satisfy the old code",
);

// ── dashboardText must stay the null-safe writer the exemption assumes ──────
{
  const body = app.match(/function dashboardText\([^)]*\)\{([^}]*)\}/);
  assert.ok(body, "dashboardText not found");
  assert.match(
    body[1],
    /if\s*\(\s*element\s*\)/,
    "dashboardText no longer checks the element before writing",
  );
}

// ── the state that used to crash is real and reachable ──────────────────────
// Lesson 1 complete, Lesson 2's presentation done: current.number === 2 (past
// Lesson 1) and activities.presentation === true — both halves of the old
// crash condition, from the model rather than from a hand-written fixture.
{
  const lessons = [
    { number: 1, title: "One", minutes: 30 },
    { number: 2, title: "Two", minutes: 30 },
    { number: 3, title: "Three", minutes: 30 },
  ];
  const storage = (values) => ({ getItem: (key) => values[key] || null });
  const view = model.buildDashboard(
    lessons,
    storage({
      rouxAcademyLesson1Record: JSON.stringify({ complete: true }),
      rouxAcademyLesson2Record: JSON.stringify({ presentationComplete: true }),
    }),
  );

  assert.equal(view.current.number, 2, "expected a post-Lesson-1 state");
  assert.equal(view.activities.presentation, true, "expected a completed presentation activity");
  assert.ok(view.activities.presentation && view.current.number > 1, "the old crash condition");

  // Presentation progress still drives the rest of the dashboard.
  assert.equal(view.completed, 1);
  assert.equal(view.lessonPercent, 25);
  assert.equal(model.nextIncompleteActivity({ presentationComplete: true }), "workbook");
  assert.equal(
    model.lessonDestination(view.current.number, "practice"),
    "lessons/lesson-02/LEARNING_LAB.html#practice",
    "guided practice is still routable — only the dead DOM wiring went away",
  );
}

// ── both simulator triggers still share the one signed launch ───────────────
{
  const launcher = fs.readFileSync(
    path.join(root, "academy/academy/simulator-launch.js"),
    "utf8",
  );
  const triggers = html.match(/data-simulator-launch/g) || [];
  assert.equal(triggers.length, 2, "expected the sidebar item and the card CTA");
  assert.ok(
    html.includes('href="#life-coach-simulator" data-simulator-launch'),
    "the sidebar trigger is gone or no longer points at the on-page card",
  );
  assert.ok(
    html.includes('id="openSimulator" data-simulator-launch'),
    "the card CTA is gone or is no longer a launch trigger",
  );
  assert.ok(
    launcher.includes('closest("[data-simulator-launch]")'),
    "the triggers no longer share one delegated handler",
  );
  assert.equal(
    (launcher.match(/invoke\("simulator-launch"/g) || []).length,
    1,
    "expected exactly one signed-launch call for both triggers",
  );
  assert.ok(
    !launcher.includes("simulator.clientgatehq.com") && launcher.includes("launch.simulatorUrl"),
    "the POST target must come from the signed response, not a hard-coded origin",
  );
}

console.log("app-id-wiring: no dangling dereference, crash state reachable, triggers shared");
