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
   */
  const status = () => document.getElementById("simulatorStatus");

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
   * The status line now sits directly beneath the sidebar item, so there is
   * nothing to scroll to and nowhere else for a message to land. It used to
   * live inside the dashboard card, which is why a launch had to drag that card
   * into view first — and why deleting the card once made every message,
   * including every failure, disappear in silence.
   */

  async function openSimulator(trigger) {
    if (launching) return;
    const cloud = window.rouxAcademyCloud;

    if (!cloud) return say("The Academy is still loading. Try again in a moment.");
    if (!cloud.session) {
      cloud.showAuth?.();
      return say("Sign in to open the simulator.");
    }

    launching = true;
    setBusy(trigger, true);
    say("Opening simulator…");

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
    // The trigger is an anchor, and its href points at ITSELF — the sidebar
    // item carries `id="life-coach-simulator"`. That keeps it keyboard-
    // reachable and keeps the fallback honest: with JavaScript off it is a
    // no-op rather than a dangling `#` or, far worse, a naked link to the
    // simulator origin, which would drop an unauthenticated stranger on
    // another product's front door with no signed statement.
    event.preventDefault();
    void openSimulator(target);
  });
})();
