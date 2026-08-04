(() => {
  const SUPABASE_URL = "https://dwkjwzissuaahieapkxo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_KyYzYYxFcf7icqODS0WEcw_mBmEvb-_";
  const reveal = () => document.documentElement.classList.remove("academy-auth-check");
  if (!window.supabase?.createClient) {
    location.replace("/academy/?action=signin");
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  client.auth.getSession().then(({ data, error }) => {
    if (error || !data.session) {
      const next = encodeURIComponent(location.pathname + location.search + location.hash);
      location.replace(`/academy/?action=signin&next=${next}`);
      return;
    }
    reveal();
  }).catch(() => location.replace("/academy/?action=signin"));
})();
