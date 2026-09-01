(() => {
  /**
   * "Open Simulator" — the crossing from the Academy into the Life Coach
   * Simulator.
   *
   * Not a link. A link would drop an unauthenticated stranger on another
   * product's front door and hope it recognised them. Instead the Academy
   * backend is asked for a short-lived signed statement, and the browser
   * carries that statement across in a top-level form POST.
   *
   * A form POST rather than a redirect with query parameters, because a launch
   * in a URL lands in browser history, in the Referer header of the next
   * request, and in every log between here and there. The POST body goes to
   * one place and is gone.
   *
   * ONE thing starts this: the sidebar item. There was a second — a card in the
   * Certification Journey grid — and the simulator is not a step of that
   * journey, so it no longer appears there. The trigger still opts in with
   * `data-simulator-launch` rather than by id: the attribute is what makes a
   * second entry point a markup change rather than a code change, and that is
   * worth keeping even at one.
   *
   * ---
   *
   * **THE LATCH THAT STRANDED STUDENTS.** `launching` was set true before the
   * handoff was requested and cleared in exactly one place: the invoke failure
   * path. The success path submitted the form and cleared nothing, on the
   * assumption that a submitted form destroys this page for good.
   *
   * It does not. A student who finishes a session and comes back — history
   * navigation, the back button, or a bfcache restore — gets this document
   * returned with its JavaScript heap intact and `launching` still true. Every
   * later click then hit `if (launching) return` and did nothing at all, and
   * the status line still read "Opening simulator…" from the attempt that had
   * already succeeded. The launcher was permanently busy on a page that had
   * already been used once.
   *
   * So an attempt is now BOUNDED. It ends in one of exactly two states —
   * navigated away, or ready to retry — and never in neither. Every path that
   * can leave the page still here resets it: a failed invoke, an invoke that
   * never settles, a malformed response, a submit that throws, a navigation
   * that does not happen, and the page being shown again.
   *
   * **A reset invalidates whatever was in flight.** Each attempt takes a
   * generation, and every resumption checks it before touching the DOM. Without
   * that, a request abandoned at timeout could resolve minutes later and
   * navigate a student who had moved on — the reset would have "worked" and the
   * page would still leave underneath them.
   *
   * The signed handoff itself is untouched: same function, same three fields,
   * same top-level POST, and every retry asks for a NEW statement rather than
   * reusing one that has already been spent.
   */
  const status = () => document.getElementById("simulatorStatus");

  const say = (message) => {
    const el = status();
    if (el) el.textContent = message;
  };

  /** The transient message. Its presence with no live attempt is the defect. */
  const OPENING = "Opening simulator…";
  const RETRY = "The simulator could not be opened just now. Please try again.";
  const DID_NOT_OPEN = "The simulator did not open. Please try again.";

  /**
   * How long the signed statement may take before the student gets their
   * button back. Generous — this is a cold function call, not a keystroke —
   * but finite, which is the whole point.
   */
  const INVOKE_TIMEOUT_MS = 15000;

  /**
   * How long after submitting to conclude the navigation is not happening.
   *
   * Longer than any real handoff. If the page does leave, this timer leaves
   * with it and the value never mattered; it only ever fires on the path where
   * the student is still sitting here looking at a busy button.
   */
  const NAVIGATION_TIMEOUT_MS = 12000;

  // One launch at a time. The card's trigger is a <button>, which can be
  // disabled; the sidebar's is an <a>, which cannot — so the guard is here
  // rather than in the DOM, and covers both.
  let launching = false;
  /** Bumped by every attempt AND every reset, so a stale resumption can tell. */
  let generation = 0;
  let navigationTimer = null;
  let activeTrigger = null;

  const setBusy = (trigger, busy) => {
    if (trigger instanceof HTMLButtonElement) trigger.disabled = busy;
    if (trigger) trigger.setAttribute("aria-busy", busy ? "true" : "false");
  };

  const clearNavigationWatch = () => {
    if (navigationTimer !== null) {
      clearTimeout(navigationTimer);
      navigationTimer = null;
    }
  };

  /**
   * Return the launcher to READY, and orphan anything still in flight.
   *
   * Incrementing the generation is what makes this safe to call at any moment:
   * a request that resolves after it sees a generation that is no longer its
   * own and stops before it can navigate anybody.
   *
   * `message` of `undefined` leaves the status line alone; the empty string
   * clears it. A reset that always wrote would erase a real failure message
   * with a blank one on the next page restore.
   */
  const resetLauncher = (message) => {
    generation += 1;
    launching = false;
    clearNavigationWatch();
    setBusy(activeTrigger, false);
    activeTrigger = null;
    if (message !== undefined) say(message);
  };

  /** Reject rather than hang. The caller treats a timeout as any other failure. */
  const withTimeout = (promise, ms) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("launch_timeout")), ms);
      const settle = (fn) => (value) => {
        clearTimeout(timer);
        fn(value);
      };
      Promise.resolve(promise).then(settle(resolve), settle(reject));
    });

  const isText = (value) => typeof value === "string" && value.length > 0;

  /**
   * Everything the POST needs, present and the right shape.
   *
   * A partial response used to be submitted anyway, which sends a student to
   * the simulator carrying a statement it cannot verify — a failure that
   * happens on the other product's front door, where this page cannot explain
   * it or offer a retry.
   */
  const usableLaunch = (launch) =>
    launch !== null &&
    typeof launch === "object" &&
    isText(launch.simulatorUrl) &&
    isText(launch.payload) &&
    isText(launch.signature) &&
    launch.claims !== null &&
    typeof launch.claims === "object";

  /* eslint-disable-next-line complexity */
  async function openSimulator(trigger) {
    if (launching) return;
    const cloud = window.rouxAcademyCloud;

    if (!cloud) return say("The Academy is still loading. Try again in a moment.");
    if (!cloud.session) {
      cloud.showAuth?.();
      return say("Sign in to open the simulator.");
    }

    launching = true;
    activeTrigger = trigger;
    const attempt = (generation += 1);
    setBusy(trigger, true);
    say(OPENING);

    let launch;
    try {
      const { data, error } = await withTimeout(
        cloud.client.functions.invoke("simulator-launch", { body: {} }),
        INVOKE_TIMEOUT_MS,
      );
      // Abandoned while we were waiting — by a timeout, or by the student
      // coming back to this page. Navigating now would move somebody who has
      // already been given their button back.
      if (attempt !== generation) return;
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      launch = data;
    } catch (error) {
      if (attempt !== generation) return;
      // One sentence. The real reason is in the function log.
      resetLauncher(RETRY);
      return;
    }

    if (!usableLaunch(launch)) {
      resetLauncher(RETRY);
      return;
    }

    // A top-level POST. The simulator verifies the signature, sets its own
    // first-party session cookie, and redirects to its app — so nothing
    // sensitive is ever in a URL and no cross-origin cookie is needed.
    const form = document.createElement("form");
    form.method = "POST";
    form.action = launch.simulatorUrl;
    form.style.display = "none";
    for (const [name, value] of Object.entries({
      payload: launch.payload,
      signature: launch.signature,
      claims: JSON.stringify(launch.claims),
    })) {
      const field = document.createElement("input");
      field.type = "hidden";
      field.name = name;
      field.value = value;
      form.appendChild(field);
    }
    document.body.appendChild(form);

    try {
      form.submit();
    } catch (error) {
      resetLauncher(RETRY);
      return;
    }

    /*
     * Stay busy while the navigation is expected.
     *
     * Clearing the latch here instead would open a window in which a second
     * click mints a second signed statement for a student who is already
     * leaving. So the button remains busy, and this timer is the promise that
     * "busy" ends: if the page goes, the timer goes with it; if it does not,
     * the student gets their button back with something to read.
     */
    clearNavigationWatch();
    navigationTimer = setTimeout(() => {
      navigationTimer = null;
      resetLauncher(DID_NOT_OPEN);
    }, NAVIGATION_TIMEOUT_MS);
  }

  document.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element ? event.target.closest("[data-simulator-launch]") : null;
    if (target === null) return;
    // The trigger is an anchor, and its href points at ITSELF — the sidebar
    // item carries `id="life-coach-simulator"`. That keeps it keyboard-
    // reachable and keeps the fallback honest: with JavaScript off it is a
    // no-op rather than a dangling `#` or, far worse, a naked link to the
    // simulator origin, which would drop an unauthenticated stranger on
    // another product's front door with no signed statement.
    event.preventDefault();
    void openSimulator(target);
  });

  /*
   * The page is being shown again, so no launch of ours is still in progress.
   *
   * This is the fix for the reported defect. `event.persisted` is true for a
   * bfcache restore, but the listener deliberately does not check it: an
   * ordinary back-navigation can also return this document with its heap
   * intact, and the launcher must not depend on guessing which kind of restore
   * it got. Resetting is correct for every one of them.
   *
   * It launches nothing. It restores the button, and replaces the stale
   * "Opening simulator…" while leaving any real failure message alone — a
   * student who came back to a genuine error should still be able to read it.
   *
   * Idempotent: repeated restores land on the same READY state.
   */
  window.addEventListener("pageshow", () => {
    const el = status();
    const stale = el !== null && el.textContent === OPENING;
    resetLauncher(stale ? "" : undefined);
  });
})();
