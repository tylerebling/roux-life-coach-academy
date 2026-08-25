(() => {
  const SUPABASE_URL = "https://dwkjwzissuaahieapkxo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_KyYzYYxFcf7icqODS0WEcw_mBmEvb-_";
  const OWNER_EMAIL = "tylerebling@gmail.com";
  const requestedAdminPreview = new URLSearchParams(location.search).get("adminPreview") === "1";
  const reveal = () => document.documentElement.classList.remove("academy-auth-check");
  const signIn = () => {
    const next = encodeURIComponent(location.pathname + location.search + location.hash);
    location.replace(`/academy/?action=signin&next=${next}`);
  };

  function showAccessError(message) {
    reveal();
    const panel = document.createElement("div");
    panel.setAttribute("role", "alert");
    panel.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#f7f3f0;color:#261f15;font-family:Arial,sans-serif";
    panel.innerHTML = `<section style="width:min(560px,100%);padding:34px;border:1px solid #dfd9ce;border-radius:22px;background:#fff;box-shadow:0 24px 70px #261f1520"><p style="margin:0 0 10px;color:#b89e80;font-weight:800;letter-spacing:.14em">ROUX LIFE COACH ACADEMY</p><h1 style="margin:0 0 12px;font:700 34px/1.08 Georgia,serif">Administrator Preview Unavailable</h1><p style="margin:0 0 22px;line-height:1.55;color:#3e4939">${message}</p><a href="/academy/admin/" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#3e4939;color:#fff;text-decoration:none;font-weight:800">Return to Admin Center</a></section>`;
    document.body.appendChild(panel);
  }

  if (!window.supabase?.createClient) {
    signIn();
    return;
  }

  const client = window.rouxAcademyCloud?.client || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  client.auth.getSession().then(async ({ data, error }) => {
    const session = data?.session;
    if (error || !session) {
      signIn();
      return;
    }

    if (requestedAdminPreview) {
      const ownerFallback = String(session.user?.email || "").toLowerCase() === OWNER_EMAIL;
      try {
        const result = await client.functions.invoke("academy-admin", {
          body: { action: "authorize-preview" },
        });
        if (result.error || result.data?.error || result.data?.authorized !== true) {
          throw result.error || new Error(result.data?.error || "Administrator authorization failed.");
        }
      } catch (authorizationError) {
        // The authenticated bootstrap owner remains able to inspect lessons if
        // the lightweight authorization endpoint is temporarily unavailable.
        // Other accounts never receive a URL-only bypass.
        if (!ownerFallback) {
          console.error("Roux Academy administrator preview authorization failed", authorizationError);
          showAccessError("Your signed-in account could not be verified for administrator preview. Return to the Admin Center and sign in again.");
          return;
        }
      }
      window.ROUX_ADMIN_PREVIEW = true;
      window.dispatchEvent(new CustomEvent("roux-admin-preview-ready"));
    }

    reveal();
  }).catch(error => {
    console.error("Roux Academy lesson access check failed", error);
    signIn();
  });
})();
