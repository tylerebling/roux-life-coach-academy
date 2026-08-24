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
   * TWO things start this: the sidebar item and the card's button. They share
   * one implementation deliberately — two copies of a signed handoff is one
   * copy too many. Triggers opt in with `data-simulator-launch` rather than by
   * id, because an id can only belong to one of them.
   */
  const status = () => document.getElementById("simulatorStatus");
  const card = () => document.getElementById("life-coach-simulator");

  const say = (message) => {
    const el = status();
    if (el) el.textContent = message;
  };

  // One launch at a time. The card's trigger is a <button>, which can be
  // disabled; the sidebar's is an <a>, which cannot — so the guard is here
  // rather than in the DOM, and covers both.
  let launching = false;

  const setBusy = (trigger, busy) => {
    if (trigger instanceof HTMLButtonElement) trigger.disabled = busy;
    if (trigger) trigger.setAttribute("aria-busy", busy ? "true" : "false");
  };

  /**
   * The status line lives inside the card. A launch started from the sidebar
   * would otherwise write "Preparing your practice room…" — and any failure
   * message — somewhere the student is not looking.
   */
  const showTheCard = (trigger) => {
    if (trigger && trigger.id === "openSimulator") return;
    const el = card();
    if (!el) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: motion ? "auto" : "smooth" });
  };

  async function openSimulator(trigger) {
    if (launching) return;
    const cloud = window.rouxAcademyCloud;

    showTheCard(trigger);

    if (!cloud) return say("The Academy is still loading. Try again in a moment.");
    if (!cloud.session) {
      cloud.showAuth?.();
      return say("Sign in to open the simulator.");
    }

    launching = true;
    setBusy(trigger, true);
    say("Preparing your practice room…");

    let launch;
    try {
      const { data, error } = await cloud.client.functions.invoke("simulator-launch", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      launch = data;
    } catch (error) {
      launching = false;
      setBusy(trigger, false);
      // One sentence. The real reason is in the function log.
      return say("The simulator could not be opened just now. Please try again.");
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
    form.submit();
  }

  document.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element ? event.target.closest("[data-simulator-launch]") : null;
    if (target === null) return;
    // The sidebar trigger is an anchor to #life-coach-simulator. That href is
    // the no-JavaScript fallback — it points at the card on this page, never
    // at the simulator origin, so a naked link can never become the way in.
    event.preventDefault();
    void openSimulator(target);
  });
})();
