/**
 * A student must not have to hunt for the simulator.
 *
 * It used to be the fourth card of a five-card grid sitting under a 153px
 * milestone panel, reachable from a sidebar item called "Practice Lab" that
 * scrolled to a photograph of a journal. Two separate problems — a name that
 * did not say what it was, and a position below the fold — so both are pinned
 * here.
 *
 * Deliberately a separate file from html-smoke.test.js: that one currently
 * fails on `practiceLabAction`, a control app.js still drives but the markup
 * no longer contains. That is a real defect and silencing it to make room for
 * these checks would trade a caught bug for a tidy run.
 */
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../academy/index.html"), "utf8");
const launcher = fs.readFileSync(
  path.join(__dirname, "../academy/academy/simulator-launch.js"),
  "utf8",
);

const check = (label, condition) => {
  if (!condition) throw new Error(`simulator-entry: ${label}`);
};

// ── the sidebar says what it is ─────────────────────────────────────────────
check("sidebar still says 'Practice Lab'", !html.includes("<b>Practice Lab</b>"));
check("sidebar is not labelled 'Life Coach Simulator'", html.includes("<b>Life Coach Simulator</b>"));
check(
  "sidebar is missing its supporting line",
  html.includes("<small>Practice your coaching skills</small>"),
);

// ── two triggers, one signed launch ─────────────────────────────────────────
const triggers = html.match(/data-simulator-launch/g) || [];
check(`expected 2 launch triggers, found ${triggers.length}`, triggers.length === 2);
check(
  "the launcher no longer delegates on the shared trigger attribute",
  launcher.includes('closest("[data-simulator-launch]")'),
);
check(
  "the launcher no longer performs a signed function invoke",
  launcher.includes('invoke("simulator-launch"'),
);
check("the launcher no longer POSTs the signed claims", launcher.includes('form.method = "POST"'));

// ── never a naked link to the simulator ─────────────────────────────────────
// The sidebar item is an anchor. Its href must point at the card on this page,
// so that with JavaScript off a student lands here rather than on another
// product's front door with no signed statement.
check(
  "the sidebar anchor does not point at the on-page card",
  html.includes('href="#life-coach-simulator" data-simulator-launch'),
);
check(
  "a raw simulator URL appears in the markup",
  !/href="https?:\/\/simulator\./.test(html),
);
check(
  "the simulator origin is hard-coded in the launcher instead of coming from the signed response",
  !launcher.includes("simulator.clientgatehq.com") && launcher.includes("launch.simulatorUrl"),
);

// ── the card, in the words that were asked for ──────────────────────────────
check("card label changed", html.includes('<p class="card-label">LIFE COACH SIMULATOR</p>'));
check("card headline changed", html.includes("Practice with a real client, safely."));
check(
  "card body is missing the mentor-guidance clause",
  html.includes(
    "Practice realistic coaching conversations with interactive client scenarios and private mentor guidance.",
  ),
);
check("CTA is not 'Open Simulator →'", /Open Simulator <span aria-hidden="true">&rarr;<\/span>/.test(html));

// ── high enough to see ──────────────────────────────────────────────────────
// Document order is the part that can be asserted without a browser; the
// rendered geometry is verified separately against the deployed page.
const at = (id) => html.indexOf(`id="${id}"`);
check("the simulator card is missing", at("life-coach-simulator") >= 0);
check(
  "the simulator card sits below the journey panel again",
  at("life-coach-simulator") < at("certification-dashboard"),
);
check(
  "the simulator card is no longer the first card in the info grid",
  html.indexOf('<div class="dashboard-info-grid">') < at("life-coach-simulator") &&
    at("life-coach-simulator") < at("mentor-feedback"),
);

// ── ids stay unique, or delegation breaks ───────────────────────────────────
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
check(`duplicate ids: ${dupes.join(", ")}`, dupes.length === 0);

console.log("simulator-entry: sidebar, triggers, card copy, and position passed");
