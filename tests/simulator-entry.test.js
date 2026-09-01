/**
 * The one way into the simulator, and proof that pressing it does something.
 *
 * The simulator used to appear twice: a sidebar item and a card inside the
 * Certification Journey grid. The card is gone deliberately — the simulator is
 * not a step of the certification journey — so ONE trigger is now correct and a
 * second one reappearing is a product decision, not a repair.
 *
 * ---
 *
 * **This file changed requirement, not standard.** It used to demand two
 * triggers and a card with particular copy. Those assertions were right for the
 * product as it was and are wrong for the product as it is. What has NOT been
 * relaxed is the part that actually broke: the trigger must exist, it must
 * intercept its own default navigation, it must reach the signed launch exactly
 * once, and it must have somewhere to report failure.
 *
 * **The click is executed, not pattern-matched.** The earlier version read the
 * launcher as text and checked that the right strings were present. That is how
 * a launcher can be perfectly written and still never run — which is roughly
 * what happened when the element its messages were written to was deleted. So
 * the launcher is loaded into a small hand-built DOM below and a click is
 * dispatched through it.
 *
 * **The DOM is ~90 lines and has no dependencies.** That is deliberate: every
 * other test here is a plain Node script, and a suite that needs an install
 * step is a suite that gets skipped. The shim implements only what the launcher
 * touches, and anything it reaches for that is missing throws rather than
 * returning undefined — a silent stub would let the launcher drift away from
 * the browser it actually runs in.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "academy/index.html"), "utf8");
const launcherSource = fs.readFileSync(
  path.join(root, "academy/academy/simulator-launch.js"),
  "utf8",
);

/* ── Markup: one trigger, no card, somewhere to speak ────────────────────── */

const triggers = html.match(/data-simulator-launch/g) || [];
assert.equal(triggers.length, 1, `expected exactly one launch trigger, found ${triggers.length}`);

assert.ok(html.includes("<b>Life Coach Simulator</b>"), "the sidebar item lost its name");
assert.ok(
  html.includes("<small>Practice your coaching skills</small>"),
  "the sidebar item lost its supporting line",
);
assert.ok(
  html.includes('id="life-coach-simulator" href="#life-coach-simulator" data-simulator-launch'),
  "the sidebar trigger is gone, or its href no longer resolves to itself",
);

// The card, and everything that hung off it, must stay out of the journey grid.
assert.ok(!html.includes('id="openSimulator"'), "the simulator card CTA is back");
assert.ok(
  !html.includes('info-card dashboard-card" id="life-coach-simulator"'),
  "the simulator card is back in the certification journey grid",
);
assert.ok(
  !html.includes("Practice with a real client, safely."),
  "the simulator card copy is back in the dashboard",
);

// The four cards the journey grid is supposed to have, and no fifth.
{
  const grid = html.slice(html.indexOf('<div class="dashboard-info-grid">'));
  const labels = [...grid.matchAll(/<p class="card-label">([^<]+)</g)].map((m) => m[1]).slice(0, 4);
  assert.deepEqual(
    labels,
    ["YOUR PROGRESS", "THIS WEEK", "MENTOR FEEDBACK", "ACHIEVEMENTS"],
    "the certification journey grid is not the four expected cards",
  );
}

// Somewhere to report failure. Its absence is what made this fail in silence.
assert.ok(
  /id="simulatorStatus"[^>]*role="status"[^>]*aria-live="polite"/.test(html),
  "the sidebar status region is missing, or is not a polite live region",
);
assert.ok(
  html.indexOf('id="simulatorStatus"') > html.indexOf("data-simulator-launch"),
  "the status region is not beside the trigger it reports for",
);

// Never a naked link to another product's front door.
assert.ok(!/href="https?:\/\/simulator\./.test(html), "a raw simulator URL is in the markup");

// Ids stay unique, or delegation and getElementById both start lying.
{
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  assert.equal(dupes.length, 0, `duplicate ids: ${dupes.join(", ")}`);
}

/* ── Behaviour: run the launcher and click the thing ─────────────────────── */

/** The smallest DOM the launcher actually touches. Missing pieces throw. */
function makeDom() {
  const listeners = [];
  const created = [];

  class El {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this.children = [];
      this.attributes = {};
      this.style = {};
      this.id = "";
      this.textContent = "";
    }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    closest(selector) {
      assert.equal(selector, "[data-simulator-launch]", `unexpected selector ${selector}`);
      return this.attributes["data-simulator-launch"] !== undefined ? this : null;
    }
    submit() {
      this.submitted = true;
      document.submissions.push(this);
    }
  }

  const status = new El("p");
  status.id = "simulatorStatus";

  const document = {
    submissions: [],
    body: new El("body"),
    getElementById: (id) => (id === "simulatorStatus" ? status : null),
    createElement: (tag) => {
      const el = new El(tag);
      created.push(el);
      return el;
    },
    addEventListener: (type, fn) => listeners.push({ type, fn }),
  };

  // The launcher now listens on `window` too, for the page being restored.
  const windowListeners = [];

  return { document, listeners, windowListeners, created, status, El };
}

/** Load the launcher into a fresh DOM, with a cloud of the caller's choosing. */
function boot(cloud) {
  const dom = makeDom();
  const invocations = [];
  const timers = new Map();
  let timerId = 0;
  let clockMs = 0;
  const context = {
    document: dom.document,
    Element: dom.El,
    HTMLButtonElement: class HTMLButtonElement {},
    window: {
      rouxAcademyCloud: cloud === undefined ? undefined : cloud(invocations),
      matchMedia: () => ({ matches: false }),
      addEventListener: (type, fn) => dom.windowListeners.push({ type, fn }),
    },
    /*
     * Timers are the launcher's own, driven by hand.
     *
     * The bounded attempt is the fix being tested, so its clock cannot be the
     * real one — a suite that waited fifteen real seconds for a timeout is a
     * suite nobody runs. `tick` fires whatever is due.
     */
    setTimeout: (fn, ms) => {
      const id = ++timerId;
      timers.set(id, { fn, at: clockMs + (typeof ms === "number" ? ms : 0) });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  vm.createContext(context);
  vm.runInContext(launcherSource, context);
  assert.equal(dom.listeners.length, 1, "the launcher did not register one delegated listener");
  assert.equal(dom.listeners[0].type, "click", "the launcher listens for something other than click");

  /** Advance the launcher's clock and run whatever is due. */
  const tick = (ms) => {
    clockMs += ms;
    for (const [id, timer] of [...timers]) {
      if (timer.at <= clockMs) {
        timers.delete(id);
        timer.fn();
      }
    }
  };

  /** The browser showing this document again, as after a back-navigation. */
  const pageshow = (persisted) => {
    for (const listener of dom.windowListeners) {
      if (listener.type === "pageshow") listener.fn({ persisted });
    }
  };

  return { ...dom, invocations, tick, pageshow, pendingTimers: () => timers.size };
}

/** A click on the sidebar trigger, as the browser would deliver it. */
function clickTrigger(dom) {
  const trigger = new dom.El("a");
  trigger.setAttribute("data-simulator-launch", "");
  let prevented = false;
  dom.listeners[0].fn({ target: trigger, preventDefault: () => (prevented = true) });
  return { trigger, prevented };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

const signedLaunch = {
  simulatorUrl: "https://simulator.example.test/api/simulator/launch",
  payload: '{"contractVersion":"1.0.0"}',
  signature: "c2lnbmF0dXJl",
  claims: { contractVersion: "1.0.0" },
};

(async () => {
  // ── a click is intercepted, and reaches the signed launch exactly once ──
  {
    const dom = boot((invocations) => ({
      session: { user: "student" },
      client: {
        functions: {
          invoke: async (name, options) => {
            invocations.push({ name, options });
            return { data: signedLaunch, error: null };
          },
        },
      },
    }));

    const { prevented } = clickTrigger(dom);
    assert.ok(prevented, "the trigger's default #hash navigation was not prevented");
    await settle();
    await settle();

    assert.equal(dom.invocations.length, 1, "expected exactly one signed-launch invocation");
    assert.equal(dom.invocations[0].name, "simulator-launch", "the wrong function was invoked");

    // ── the top-level POST contract ──
    const form = dom.created.find((el) => el.tagName === "FORM");
    assert.ok(form, "no form was created for the handoff");
    assert.equal(form.method, "POST", "the handoff is not a POST");
    assert.equal(form.action, signedLaunch.simulatorUrl, "the POST target is not the signed URL");
    assert.ok(form.submitted, "the form was built and never submitted");

    const fields = Object.fromEntries(form.children.map((f) => [f.name, f.value]));
    assert.deepEqual(
      Object.keys(fields).sort(),
      ["claims", "payload", "signature"],
      "the POST body is not the three signed fields",
    );
    assert.equal(fields.payload, signedLaunch.payload, "payload was altered in transit");
    assert.equal(fields.signature, signedLaunch.signature, "signature was altered in transit");
    assert.equal(fields.claims, JSON.stringify(signedLaunch.claims), "claims were altered");
    for (const f of form.children) assert.equal(f.type, "hidden", "a launch field is visible");
  }

  // ── one launch at a time ──
  {
    let resolve;
    const dom = boot((invocations) => ({
      session: { user: "student" },
      client: {
        functions: {
          invoke: (name, options) => {
            invocations.push({ name, options });
            return new Promise((r) => (resolve = r));
          },
        },
      },
    }));
    clickTrigger(dom);
    await settle();
    clickTrigger(dom);
    clickTrigger(dom);
    await settle();
    assert.equal(dom.invocations.length, 1, "an impatient student rented two launches");
    resolve({ data: signedLaunch, error: null });
  }

  // ── signed out: told, not launched ──
  {
    let shown = 0;
    const dom = boot(() => ({ session: null, showAuth: () => (shown += 1), client: null }));
    clickTrigger(dom);
    await settle();
    assert.equal(shown, 1, "a signed-out student was not offered the sign-in");
    assert.match(dom.status.textContent, /sign in/i, "the signed-out reason was not reported");
  }

  // ── the Academy has not finished loading ──
  {
    const dom = boot(undefined);
    clickTrigger(dom);
    await settle();
    assert.match(dom.status.textContent, /still loading/i, "an early click reported nothing");
  }

  // ── a failing function says so, rather than failing silently ──
  {
    const dom = boot((invocations) => ({
      session: { user: "student" },
      client: {
        functions: {
          invoke: async (name, options) => {
            invocations.push({ name, options });
            return { data: null, error: new Error("boom") };
          },
        },
      },
    }));
    clickTrigger(dom);
    await settle();
    await settle();
    assert.match(
      dom.status.textContent,
      /could not be opened/i,
      "a failed launch left the student with no message at all",
    );
    assert.equal(
      dom.created.filter((el) => el.tagName === "FORM").length,
      0,
      "a form was submitted for a launch that failed",
    );
  }

  /* ── the bounded attempt: every path ends navigated or ready ───────────── */

  /** A cloud whose invoke resolves, fails or hangs, on demand. */
  const cloudWith = (invoke) => (invocations) => ({
    session: { user: "student" },
    client: {
      functions: {
        invoke: (name, options) => {
          invocations.push({ name, options });
          return invoke(invocations.length);
        },
      },
    },
  });

  const forms = (dom) => dom.created.filter((el) => el.tagName === "FORM");
  const busy = (trigger) => trigger.attributes["aria-busy"];

  // ── a failed invoke resets, and the NEXT click launches for real ──
  {
    let calls = 0;
    const dom = boot(
      cloudWith(async () => {
        calls += 1;
        return calls === 1
          ? { data: null, error: new Error("boom") }
          : { data: signedLaunch, error: null };
      }),
    );

    const first = clickTrigger(dom);
    await settle();
    await settle();
    assert.equal(busy(first.trigger), "false", "a failed launch left the trigger busy");

    clickTrigger(dom);
    await settle();
    await settle();
    assert.equal(dom.invocations.length, 2, "the retry after a failure never asked for a launch");
    assert.equal(forms(dom).length, 1, "the retry did not submit the handoff");
  }

  // ── an invoke that never settles must not hold the button forever ──
  {
    const dom = boot(cloudWith(() => new Promise(() => {})));
    const { trigger } = clickTrigger(dom);
    await settle();
    assert.equal(busy(trigger), "true", "the attempt did not mark the trigger busy");

    dom.tick(15000); // the invoke timeout
    await settle();
    await settle();
    assert.equal(busy(trigger), "false", "a stalled launch never released the trigger");
    assert.match(dom.status.textContent, /try again/i, "a stalled launch said nothing");

    clickTrigger(dom);
    await settle();
    assert.equal(dom.invocations.length, 2, "after a timeout the next click was still latched out");
  }

  // ── a timed-out request that resolves LATER must not navigate anybody ──
  {
    let release;
    const dom = boot(cloudWith(() => new Promise((r) => (release = r))));
    clickTrigger(dom);
    await settle();

    dom.tick(15000);
    await settle();
    await settle();

    // The student has their button back. The abandoned request now answers.
    release({ data: signedLaunch, error: null });
    await settle();
    await settle();

    assert.equal(
      forms(dom).length,
      0,
      "a launch abandoned at timeout came back and navigated the student anyway",
    );
  }

  // ── a submit that throws is a failure the student can retry ──
  {
    const dom = boot(cloudWith(async () => ({ data: signedLaunch, error: null })));
    // Every form this DOM makes refuses to submit, as a blocked navigation does.
    dom.El.prototype.submit = function submit() {
      throw new Error("navigation blocked");
    };

    const { trigger } = clickTrigger(dom);
    await settle();
    await settle();

    assert.equal(busy(trigger), "false", "a failed submit left the trigger busy forever");
    assert.match(dom.status.textContent, /try again/i, "a failed submit said nothing");
    delete dom.El.prototype.submit;
  }

  // ── a malformed launch is never POSTed ──
  {
    for (const bad of [
      { ...signedLaunch, payload: "" },
      { ...signedLaunch, signature: undefined },
      { ...signedLaunch, simulatorUrl: null },
      { ...signedLaunch, claims: "not-an-object" },
      {},
    ]) {
      const dom = boot(cloudWith(async () => ({ data: bad, error: null })));
      const { trigger } = clickTrigger(dom);
      await settle();
      await settle();

      assert.equal(
        forms(dom).length,
        0,
        `an incomplete launch was submitted: ${JSON.stringify(bad)}`,
      );
      assert.equal(busy(trigger), "false", "a malformed launch left the trigger busy");
      assert.match(dom.status.textContent, /try again/i, "a malformed launch said nothing");
    }
  }

  // ── submitted, but the page never left ──
  {
    const dom = boot(cloudWith(async () => ({ data: signedLaunch, error: null })));
    const { trigger } = clickTrigger(dom);
    await settle();
    await settle();
    assert.equal(forms(dom).length, 1, "the handoff was not submitted");
    // Busy is CORRECT here: navigation is expected, and clearing it would let a
    // second click mint a second statement for a student already leaving.
    assert.equal(busy(trigger), "true", "the trigger was released mid-navigation");

    dom.tick(12000);
    assert.equal(busy(trigger), "false", "a navigation that never happened stayed busy forever");
    assert.match(dom.status.textContent, /did not open/i, "a stuck navigation said nothing");
  }

  /* ── THE REPORTED DEFECT: coming back and clicking again ─────────────────── */

  // ── bfcache restore clears the latch the success path used to leave ──
  {
    const dom = boot(cloudWith(async () => ({ data: signedLaunch, error: null })));
    clickTrigger(dom);
    await settle();
    await settle();
    assert.equal(dom.status.textContent, "Opening simulator…", "the transient message never showed");

    dom.pageshow(true); // the student comes back

    assert.notEqual(
      dom.status.textContent,
      "Opening simulator…",
      "the stale transient message survived the return",
    );

    clickTrigger(dom);
    await settle();
    await settle();
    assert.equal(dom.invocations.length, 2, "the click after returning was latched out");
    assert.equal(forms(dom).length, 2, "the second launch built no handoff");
  }

  // ── an ordinary history restore, where persisted is false ──
  {
    const dom = boot(cloudWith(async () => ({ data: signedLaunch, error: null })));
    clickTrigger(dom);
    await settle();
    await settle();

    dom.pageshow(false);

    clickTrigger(dom);
    await settle();
    await settle();
    assert.equal(dom.invocations.length, 2, "a non-persisted restore left the launcher latched");
  }

  // ── repeated restores are idempotent ──
  {
    const dom = boot(cloudWith(async () => ({ data: signedLaunch, error: null })));
    clickTrigger(dom);
    await settle();
    await settle();
    dom.pageshow(true);
    dom.pageshow(true);
    dom.pageshow(false);

    clickTrigger(dom);
    await settle();
    await settle();
    assert.equal(dom.invocations.length, 2, "repeated restores broke the launcher");
  }

  // ── twenty complete launch → return → launch cycles ──
  {
    const dom = boot(cloudWith(async () => ({ data: signedLaunch, error: null })));
    for (let cycle = 1; cycle <= 20; cycle += 1) {
      const { trigger } = clickTrigger(dom);
      await settle();
      await settle();

      assert.equal(dom.invocations.length, cycle, `cycle ${cycle} did not ask for a NEW launch`);
      assert.equal(forms(dom).length, cycle, `cycle ${cycle} did not submit a handoff`);
      assert.equal(busy(trigger), "true", `cycle ${cycle} released the trigger mid-navigation`);

      // The student finishes and comes back.
      dom.pageshow(cycle % 2 === 0);
      assert.notEqual(
        dom.status.textContent,
        "Opening simulator…",
        `cycle ${cycle} came back to a stale busy message`,
      );
    }
    assert.equal(dom.invocations.length, 20, "twenty cycles did not produce twenty handoffs");

    const names = new Set(dom.invocations.map((i) => i.name));
    assert.deepEqual([...names], ["simulator-launch"], "something other than the launch was invoked");
  }

  console.log(
    "simulator-entry: one sidebar trigger, no journey card, click → single signed launch → POST; " +
      "bounded attempt resets on failure, timeout, malformed response, blocked submit, stalled " +
      "navigation and page restore; 20 launch→return→launch cycles",
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
