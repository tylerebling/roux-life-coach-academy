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
for (const required of ["studentDashboard", "dashboardSidebar", "resumeLesson", "nextLessonAction", "milestoneTrack", "practiceLabAction"]) {
  if (!ids.includes(required)) throw new Error(`Missing dashboard control: ${required}`);
}
console.log("html-smoke: local targets, unique IDs, and dashboard controls passed");

