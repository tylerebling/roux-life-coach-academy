const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'academy/academy/lauren-transition-videos.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const transitions = context.window.ROUX_LAUREN_TRANSITIONS;
assert.deepEqual(
  Object.values(transitions).map(item => [item.afterLesson, item.nextLesson]),
  [[2,3],[6,7],[10,11],[14,15],[18,19]],
);
for (const [id, item] of Object.entries(transitions)) {
  const words = item.transcript.trim().split(/\s+/).length;
  assert.ok(words >= 160 && words <= 225, `${id} should be meaningful without becoming long (${words} words)`);
  assert.match(item.video, new RegExp(`^media/lauren-transitions/${id}\\.mp4\\?release=[a-f0-9]+$`));
  assert.ok(!/score|percent|passed with/i.test(item.transcript), `${id} must not fabricate a performance result`);
}
assert.match(transitions['foundations-to-self-knowledge'].transcript, /begin working with me/i);
assert.doesNotMatch(transitions['foundations-to-self-knowledge'].transcript, /in our simulation/i);

const bridge = fs.readFileSync(path.join(root, 'academy/academy/lesson-bridge.js'), 'utf8');
for (const id of Object.keys(transitions)) assert.ok(bridge.includes(id), `lesson bridge is missing ${id}`);

const page = fs.readFileSync(path.join(root, 'academy/block-transition.html'), 'utf8');
assert.match(page, /transitionVideo/);
assert.match(page, /Read Transcript/);
assert.match(page, /aria-disabled="true"/);
