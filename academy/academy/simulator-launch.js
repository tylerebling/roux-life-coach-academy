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
   */
  const button = () => document.getElementById("openSimulator");
  const status = () => document.getElementById("simulatorStatus");

  const say = (message) => {
    const el = status();
    if (el) el.textContent = message;
  };

  async function openSimulator() {
    const cloud = window.rouxAcademyCloud;
    const trigger = button();
    if (!cloud) return say("The Academy is still loading. Try again in a moment.");
    if (!cloud.session) {
      cloud.showAuth?.();
      return say("Sign in to open the simulator.");
    }

    trigger?.setAttribute("disabled", "disabled");
    say("Preparing your practice room…");

    let launch;
    try {
      const { data, error } = await cloud.client.functions.invoke("simulator-launch", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      launch = data;
    } catch (error) {
      trigger?.removeAttribute("disabled");
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
    const target = event.target instanceof Element ? event.target.closest("#openSimulator") : null;
    if (target === null) return;
    event.preventDefault();
    void openSimulator();
  });
})();
