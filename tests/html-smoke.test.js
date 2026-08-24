const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "../academy/index.html"), "utf8");
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) throw new Error(`Duplicate IDs: ${duplicateIds.join(", ")}`);
const targets = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)]
  .map(match => match[1]).filter(value => !value.includes(":") && !value.startsWith("/"));
for (const target of targets) {
  const clean = target.split(/[?#]/)[0];
  if (!fs.existsSync(path.join(__dirname, "../academy", clean))) throw new Error(`Missing local target: ${target}`);
}
// "practiceLabAction" used to be on this list. No element of that id has ever
// existed in academy/index.html, and the Practice Lab action it belonged to is
// now the Life Coach Simulator. The dead wiring that referenced it has been
// removed from app.js; app-id-wiring.test.js proves nothing references it any
// more, so requiring the element here would be requiring a control the product
// does not have.
for (const required of ["studentDashboard", "dashboardSidebar", "resumeLesson", "nextLessonAction", "milestoneTrack"]) {
  if (!ids.includes(required)) throw new Error(`Missing dashboard control: ${required}`);
}
console.log("html-smoke: local targets, unique IDs, and dashboard controls passed");

