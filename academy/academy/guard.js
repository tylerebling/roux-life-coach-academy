(() => {
  const SUPABASE_URL = "https://dwkjwzissuaahieapkxo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_KyYzYYxFcf7icqODS0WEcw_mBmEvb-_";
  const reveal = () => document.documentElement.classList.remove("academy-auth-check");
  const requestedAdminPreview = new URLSearchParams(location.search).get("adminPreview") === "1";
  if (!window.supabase?.createClient) {
    location.replace("/academy/?action=signin");
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  client.auth.getSession().then(async ({ data, error }) => {
    if (error || !data.session) {
      const next = encodeURIComponent(location.pathname + location.search + location.hash);
      location.replace(`/academy/?action=signin&next=${next}`);
      return;
    }
    if (requestedAdminPreview) {
      const result = await client.functions.invoke("academy-admin", { body: { action: "overview" } });
      if (result.error || result.data?.error) {
        const clean = new URL(location.href);
        clean.searchParams.delete("adminPreview");
        location.replace(clean.pathname + clean.search + clean.hash);
        return;
      }
      window.ROUX_ADMIN_PREVIEW = true;
      window.dispatchEvent(new CustomEvent("roux-admin-preview-ready"));
    }
    reveal();
  }).catch(() => location.replace("/academy/?action=signin"));
})();