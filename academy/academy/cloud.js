(() => {
  const SUPABASE_URL = "https://dwkjwzissuaahieapkxo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_KyYzYYxFcf7icqODS0WEcw_mBmEvb-_";
  if (!window.supabase?.createClient) return;
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let session = null, remoteState = null;

  async function invoke(name, body) {
    const { data, error } = await client.functions.invoke(name, { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  function authModal() {
    if (document.getElementById("academyAuthModal")) return;
    const shell = document.createElement("div");
    shell.id = "academyAuthModal";
    shell.hidden = true;
    shell.innerHTML = `<div class="academy-auth-card"><button class="academy-auth-close" aria-label="Close">Ã—</button><p>ROUX LIFE ACADEMY</p><h2>Continue your certification</h2><label>Full name<input id="academyAuthName" type="text" autocomplete="name" placeholder="Used on your certificate"></label><label>Email<input id="academyAuthEmail" type="email" autocomplete="email"></label><label>Password<input id="academyAuthPassword" type="password" autocomplete="current-password"></label><div class="academy-auth-actions"><button data-auth="signin">Sign in</button><button data-auth="signup">Create account</button></div><button class="academy-auth-link" data-auth="recover">Email a recovery link</button><span id="academyAuthMessage"></span></div>`;
    document.body.appendChild(shell);
    const style = document.createElement("style");
    style.textContent = `#academyAuthModal{position:fixed;inset:0;z-index:100000;background:#06120ddd;display:grid;place-items:center;padding:20px}#academyAuthModal[hidden]{display:none}.academy-auth-card{position:relative;width:min(460px,100%);padding:34px;border:1px solid #d8b87588;border-radius:24px;background:#f7f0e3;color:#13251b;box-shadow:0 30px 100px #0008}.academy-auth-card p{color:#9b6c37;letter-spacing:.16em;font-weight:800}.academy-auth-card h2{font:700 34px/1.05 Georgia,serif}.academy-auth-card label{display:block;font-weight:700;margin:16px 0}.academy-auth-card input{width:100%;margin-top:7px;padding:13px;border:1px solid #b9ad99;border-radius:10px;font:inherit}.academy-auth-actions{display:flex;gap:10px}.academy-auth-card button{border:0;border-radius:999px;padding:12px 18px;background:#173426;color:white;font-weight:800;cursor:pointer}.academy-auth-link{margin-top:12px!important;background:transparent!important;color:#6e4d2c!important}.academy-auth-close{position:absolute;right:15px;top:12px;background:transparent!important;color:#173426!important;font-size:24px}.academy-auth-card span{display:block;margin-top:12px;color:#79402d}`;
    document.head.appendChild(style);
    shell.querySelector(".academy-auth-close").onclick = () => shell.hidden = true;
    shell.querySelectorAll("[data-auth]").forEach(button => button.onclick = async () => {
      const email = document.getElementById("academyAuthEmail").value.trim();
      const password = document.getElementById("academyAuthPassword").value;
      const fullName = document.getElementById("academyAuthName").value.trim();
      const message = document.getElementById("academyAuthMessage");
      message.textContent = "Workingâ€¦";
      try {
        if (button.dataset.auth === "signin") {
          const result = await client.auth.signInWithPassword({ email, password });
          if (result.error) throw result.error;
          shell.hidden = true;
        } else if (button.dataset.auth === "signup") {
          if (fullName.length < 3) throw new Error("Enter the learnerâ€™s full name for the certificate record.");
          const result = await client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname, data: { full_name: fullName } } });
          if (result.error) throw result.error;
          message.textContent = result.data.session ? "Account created." : "Check your email to confirm your account.";
        } else {
          const result = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
          if (result.error) throw result.error;
          message.textContent = "Recovery email sent.";
        }
      } catch (error) { message.textContent = error.message || "Unable to continue."; }
    });
  }

  function showAuth(mode = "signin") {
    authModal();
    document.getElementById("academyAuthModal").hidden = false;
    const nameField = document.getElementById("academyAuthName");
    if (mode === "enroll") nameField?.focus(); else document.getElementById("academyAuthEmail")?.focus();
  }

  function requestedDestination() {
    const value = new URLSearchParams(location.search).get("next");
    return value && value.startsWith("/academy/") && !value.startsWith("/academy/admin/") ? value : "";
  }

  function renderAccess() {
    const gate = document.getElementById("academyGate");
    document.body.classList.toggle("academy-locked", !session);
    if (gate) gate.hidden = !!session;
    document.querySelectorAll("[data-gate-action]").forEach(button => {
      button.onclick = () => showAuth(button.dataset.gateAction === "enroll" ? "enroll" : "signin");
    });
  }

  function renderIdentity() {
    const chip = document.querySelector(".profile-chip");
    if (!chip) return;
    chip.textContent = session ? (session.user.email || "My academy") : "Sign in";
    chip.onclick = session ? async () => { if (confirm("Sign out of the academy?")) await client.auth.signOut(); } : showAuth;
    renderAccess();
  }

  async function pullProgress() {
    if (!session) return null;
    remoteState = await invoke("academy-progress", { action: "get" });
    for (const lesson of remoteState.lessons || []) {
      const progress = (remoteState.progress || []).find(item => item.lesson_id === lesson.id) || {};
      localStorage.setItem(`rouxAcademyLesson${lesson.lesson_number}Record`, JSON.stringify({
        lesson: lesson.lesson_number,
        presentationComplete: !!progress.presentation_complete,
        workbookComplete: !!progress.workbook_complete,
        practiceComplete: !!progress.practice_complete,
        quizScore: progress.quiz_score || 0,
        quizPassed: !!progress.quiz_passed,
        complete: !!progress.completed_at,
        completedAt: progress.completed_at,
        updatedAt: progress.updated_at,
      }));
    }
    if (typeof window.restore === "function" && typeof window.renderAll === "function") { window.restore(); window.renderAll(); }
    return remoteState;
  }

  async function pushLesson(record) {
    if (!session || !record?.lesson) return;
    const result = await invoke("academy-progress", {
      action: "update",
      lessonNumber: record.lesson,
      presentationComplete: !!record.presentationComplete,
      workbookComplete: !!record.workbookComplete,
      practiceComplete: !!(record.practiceComplete ?? record.workbookComplete),
      quizScore: Number(record.quizScore || (record.quizPassed ? 80 : 0)),
    });
    await pullProgress();
    return result;
  }

  async function loadFinalQuestions() {
    if (!session) { showAuth(); throw new Error("Sign in to take the final examination."); }
    return invoke("academy-final-exam", { action: "questions" });
  }

  async function submitFinal(answers) {
    if (!session) { showAuth(); throw new Error("Sign in to submit the final examination."); }
    return invoke("academy-final-exam", { action: "submit", answers });
  }

  window.rouxAcademyCloud = { client, showAuth, pullProgress, pushLesson, loadFinalQuestions, submitFinal, get session(){ return session; }, get remoteState(){ return remoteState; } };
  window.addEventListener("roux-academy-progress", event => pushLesson(event.detail).catch(() => {}));
  client.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    renderIdentity();
    if (session) {
      const destination = requestedDestination();
      if (destination) { location.replace(destination); return; }
      setTimeout(() => pullProgress().catch(console.error), 0);
    }
  });
  client.auth.getSession().then(({ data }) => {
    session = data.session;
    authModal();
    renderIdentity();
    if (session) pullProgress().then(() => window.renderAll?.()).catch(console.error);
    const requested = new URLSearchParams(location.search).get("action");
    if (!session && (requested === "signin" || requested === "enroll")) showAuth(requested);
  });
})();

