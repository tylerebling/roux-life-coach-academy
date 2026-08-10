(() => {
  const match = location.pathname.match(/lesson-(\d{2})/i);
  if (!match) return;
  const lesson = Number(match[1]);
  const recordKey = `rouxAcademyLesson${lesson}Record`;
  const presentationKey = `rouxLesson${lesson}PresentationComplete`;
  const isLab = /LEARNING_LAB/i.test(location.pathname);
  const read = (key, fallback = null) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const getQuiz = () => {
    if (lesson === 2) {
      const lab = read("rouxLesson2LearningLabV1", {});
      return { passed: Number(lab.best || 0) >= 10, score: Math.round(Number(lab.best || 0) / 12 * 100) };
    }
    const passed = localStorage.getItem(`rouxLesson${lesson}Complete`) === "true";
    return { passed, score: passed ? 80 : 0 };
  };
  const workbookComplete = () => {
    if (!isLab) return Boolean(read(recordKey, {}).workbookComplete);
    const fields = [...document.querySelectorAll("textarea")];
    return fields.length > 0 && fields.every(field => field.value.trim().length >= 12);
  };
  const sync = () => {
    const old = read(recordKey, {});
    const quiz = getQuiz();
    const record = {
      lesson,
      presentationComplete: localStorage.getItem(presentationKey) === "true",
      workbookComplete: workbookComplete(),
      quizPassed: quiz.passed,
      quizScore: Math.max(Number(old.quizScore || 0), quiz.score),
      updatedAt: new Date().toISOString()
    };
    record.complete = record.presentationComplete && record.workbookComplete && record.quizPassed;
    record.completedAt = record.complete ? (old.completedAt || record.updatedAt) : null;
    localStorage.setItem(recordKey, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent("roux-academy-progress", { detail: record }));
    renderStatus(record);
  };
  const renderStatus = record => {
    let bar = document.getElementById("rouxAcademyBridge");
    if (!bar) {
      bar = document.createElement("aside");
      bar.id = "rouxAcademyBridge";
      bar.setAttribute("aria-label", "Academy lesson navigation");
      bar.innerHTML = `<a data-nav="academy">Academy</a><span data-status></span><nav><a data-nav="previous">← Previous</a><a data-nav="next">Next →</a></nav>`;
      document.body.appendChild(bar);
      const style = document.createElement("style");
      style.textContent = `#rouxAcademyBridge{position:fixed;z-index:99999;left:18px;right:18px;bottom:16px;display:flex;align-items:center;gap:18px;padding:12px 16px;border:1px solid #d8b87488;border-radius:16px;background:#0b2119ee;color:#fff7e8;box-shadow:0 12px 40px #0007;backdrop-filter:blur(14px);font:700 14px/1.2 Arial,sans-serif}#rouxAcademyBridge a{color:#fff7e8;text-decoration:none;cursor:pointer}#rouxAcademyBridge [data-status]{margin-right:auto;color:#e1c17c}#rouxAcademyBridge nav{display:flex;gap:18px}@media(max-width:640px){#rouxAcademyBridge{left:8px;right:8px;bottom:8px;font-size:12px;gap:10px}#rouxAcademyBridge nav{gap:10px}}`;
      document.head.appendChild(style);
      bar.querySelector('[data-nav="academy"]').href = "../../index.html";
      const previous = bar.querySelector('[data-nav="previous"]');
      previous.href = lesson > 1 ? `../lesson-${String(lesson - 1).padStart(2, "0")}/index.html` : "../../index.html";
      const next = bar.querySelector('[data-nav="next"]');
      next.href = lesson < 19 ? `../lesson-${String(lesson + 1).padStart(2, "0")}/index.html` : "../../index.html#certification";
    }
    bar.querySelector("[data-status]").textContent = record.complete ? `Lesson ${lesson} complete ✓` : `Lesson ${lesson} · requirements in progress`;
  };
  const renderAdminPreview = () => {
    if (!window.ROUX_ADMIN_PREVIEW || document.getElementById("rouxAdminPreviewBar")) return;
    const bar = document.createElement("aside");
    bar.id = "rouxAdminPreviewBar";
    bar.setAttribute("aria-label", "Administrator lesson preview controls");
    bar.innerHTML = `<strong>ADMIN QA</strong><label>Lesson <select aria-label="Choose lesson">${Array.from({length:19},(_,i)=>`<option value="${i+1}" ${i+1===lesson?"selected":""}>${String(i+1).padStart(2,"0")}</option>`).join("")}</select></label><button data-qa="back">Previous</button><button data-qa="play">Play / pause</button><button data-qa="next">Next</button><button data-qa="learner">Learner view</button><a href="/academy/admin/">Exit QA</a>`;
    document.body.appendChild(bar);
    const style = document.createElement("style");
    style.textContent = `#rouxAdminPreviewBar{position:fixed;z-index:100000;top:10px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:7px 9px;border:1px solid #d4c9b9;border-radius:12px;background:#fbf8f2f2;color:#202820;box-shadow:0 10px 30px #20282033;backdrop-filter:blur(14px);font:700 12px/1.1 Arial,sans-serif}#rouxAdminPreviewBar strong{color:#52654c;letter-spacing:.1em;font-size:10px}#rouxAdminPreviewBar label{display:flex;align-items:center;gap:5px}#rouxAdminPreviewBar select,#rouxAdminPreviewBar button,#rouxAdminPreviewBar a{min-height:32px;border:1px solid #d4c9b9;border-radius:8px;background:#fff;color:#202820;padding:6px 8px;text-decoration:none;font:700 11px Arial,sans-serif;cursor:pointer}#rouxAdminPreviewBar button:hover,#rouxAdminPreviewBar a:hover{background:#52654c;color:#fff;border-color:#52654c}#rouxAdminPreviewBar [data-qa="learner"]{background:#e8c77c;border-color:#e8c77c}@media(max-width:760px){#rouxAdminPreviewBar{top:5px;max-width:calc(100vw - 10px);overflow-x:auto;justify-content:flex-start}#rouxAdminPreviewBar strong,#rouxAdminPreviewBar label{display:none}}`;
    document.head.appendChild(style);
    bar.querySelector("select").onchange = event => {
      location.href = `../lesson-${String(event.target.value).padStart(2,"0")}/index.html?adminPreview=1`;
    };
    bar.querySelector('[data-qa="back"]').onclick = () => {
      const control = document.getElementById("back");
      if (control) control.click();
      else if (lesson > 1) location.href = `../lesson-${String(lesson-1).padStart(2,"0")}/index.html?adminPreview=1`;
    };
    bar.querySelector('[data-qa="next"]').onclick = () => {
      const control = document.getElementById("next");
      if (control) control.click();
      else if (lesson < 19) location.href = `../lesson-${String(lesson+1).padStart(2,"0")}/index.html?adminPreview=1`;
    };
    bar.querySelector('[data-qa="play"]').onclick = () => {
      const control = document.getElementById("toggle");
      if (control) { control.click(); return; }
      const media = document.querySelector("video,audio");
      if (media) media.paused ? media.play().catch(()=>{}) : media.pause();
    };
    bar.querySelector('[data-qa="learner"]').onclick = () => {
      const clean = new URL(location.href);
      clean.searchParams.delete("adminPreview");
      location.href = clean.pathname + clean.search + clean.hash;
    };
  };
  window.addEventListener("roux-admin-preview-ready", renderAdminPreview);
  if (window.ROUX_ADMIN_PREVIEW) renderAdminPreview();
  document.addEventListener("input", () => setTimeout(sync, 0));
  document.addEventListener("change", () => setTimeout(sync, 0));
  document.addEventListener("click", () => setTimeout(sync, 150));
  window.addEventListener("storage", sync);
  setInterval(sync, 2500);
  sync();
})();
