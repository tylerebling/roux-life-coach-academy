(() => {
  const match = location.pathname.match(/lesson-(\d{2})/i);
  if (!match) return;
  const lesson = Number(match[1]);
  const isAdminPreview = new URLSearchParams(location.search).get("adminPreview") === "1";
  const recordKey = `rouxAcademyLesson${lesson}Record`;
  const presentationKey = `rouxLesson${lesson}PresentationComplete`;
  const isLab = /LEARNING_LAB/i.test(location.pathname);
  if (lesson >= 3) {
    const polish = document.createElement("style");
    polish.id = "rouxLessonEditorialPolish";
    polish.textContent = `
      /* One restrained lesson identifier is enough; the scene kicker carries it. */
      .content > .brand,
      .question-panel .brand { display:none !important; }
      .content > .kicker,
      .question-panel .kicker { margin-top:0 !important; }

      /* Editorial concept controls: quiet, precise, and clearly interactive. */
      .cards { gap:10px !important; }
      .card {
        min-height:54px !important;
        align-items:center !important;
        gap:15px !important;
        padding:13px 18px !important;
        border:1px solid rgba(223,217,206,.9) !important;
        border-radius:8px !important;
        background:rgba(247,243,240,.94) !important;
        box-shadow:0 4px 14px rgba(15,32,23,.10) !important;
      }
      .card .marker {
        width:3px !important;
        height:25px !important;
        border-radius:2px !important;
        background:#B89E80 !important;
      }
      .card b {
        font-size:16px !important;
        line-height:1.3 !important;
        font-weight:650 !important;
        letter-spacing:-.01em !important;
      }
      .card.revealed:hover {
        transform:translateY(-1px) !important;
        border-color:#B89E80 !important;
        box-shadow:0 7px 20px rgba(15,32,23,.14) !important;
      }
      .card.is-active {
        background:#fffdf9 !important;
        border-color:#B89E80 !important;
        box-shadow:inset 3px 0 0 #B89E80, 0 7px 20px rgba(15,32,23,.14) !important;
      }
      @media (max-width:1000px) {
        .card { min-height:46px !important; padding:10px 13px !important; }
        .card b { font-size:14px !important; }
      }
    `;
    document.head.appendChild(polish);
  }
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
      bar.classList.toggle("is-admin-preview", isAdminPreview);
      bar.classList.toggle("is-presentation", !isLab);
      bar.setAttribute("aria-label", "Academy lesson navigation");
      bar.innerHTML = `<a data-nav="academy">Academy</a><span data-status></span><nav><a data-nav="previous">&larr; Previous</a><a data-nav="next">Next &rarr;</a></nav>`;
      document.body.appendChild(bar);
      const style = document.createElement("style");
      style.textContent = `
        #rouxAcademyBridge{
          position:fixed;z-index:99999;left:20px;right:20px;bottom:16px;
          min-height:50px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;
          padding:8px 10px 8px 18px;border:1px solid rgba(184,158,128,.58);border-radius:12px;
          background:rgba(20,42,30,.94);color:#f7f3f0;
          box-shadow:0 10px 28px rgba(9,22,15,.26);backdrop-filter:blur(14px);
          font:650 13px/1.2 Arial,sans-serif;letter-spacing:.01em
        }
        #rouxAcademyBridge.is-presentation{bottom:108px}
        #rouxAcademyBridge a{min-height:38px;display:inline-flex;align-items:center;padding:0 10px;border-radius:7px;color:#f7f3f0;text-decoration:none;cursor:pointer;transition:background .2s ease,color .2s ease}
        #rouxAcademyBridge a:hover{background:rgba(247,243,240,.1);color:#fff}
        #rouxAcademyBridge a:focus-visible{outline:2px solid #D8C599;outline-offset:2px}
        #rouxAcademyBridge [data-status]{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#D8C599;font-weight:600}
        #rouxAcademyBridge nav{display:flex;gap:3px;padding-left:8px;border-left:1px solid rgba(223,217,206,.22)}
        @media(max-width:640px){
          #rouxAcademyBridge{left:8px;right:8px;bottom:8px;grid-template-columns:auto 1fr auto;gap:6px;padding:6px 7px 6px 10px;font-size:11px}
          #rouxAcademyBridge.is-presentation{bottom:104px}
          #rouxAcademyBridge a{padding:0 7px}
          #rouxAcademyBridge [data-status]{font-size:0}
          #rouxAcademyBridge [data-status]::after{content:'Progress saved';font-size:11px}
        }
      `;
      document.head.appendChild(style);
      bar.querySelector('[data-nav="academy"]').href = "../../index.html";
      const previous = bar.querySelector('[data-nav="previous"]');
      previous.href = lesson > 1 ? `../lesson-${String(lesson - 1).padStart(2, "0")}/index.html` : "../../index.html";
      const next = bar.querySelector('[data-nav="next"]');
      next.href = lesson < 19 ? `../lesson-${String(lesson + 1).padStart(2, "0")}/index.html` : "../../index.html#certification";
    }
    if (isLab) {
      const sections = [...document.querySelectorAll('[data-panel]')];
      const activeIndex = Math.max(0, sections.findIndex(button => button.classList.contains('active')));
      const previous = bar.querySelector('[data-nav="previous"]');
      const next = bar.querySelector('[data-nav="next"]');
      const move = direction => event => {
        const current = Math.max(0, sections.findIndex(button => button.classList.contains('active')));
        const target = sections[current + direction];
        if (!target) return;
        event.preventDefault();
        if (target.disabled) {
          target.title = target.title || 'Complete the required section to continue.';
          return;
        }
        target.click();
      };
      previous.removeAttribute('href');
      next.removeAttribute('href');
      previous.onclick = move(-1);
      next.onclick = move(1);
      previous.setAttribute('aria-disabled', activeIndex === 0 ? 'true' : 'false');
      next.setAttribute('aria-disabled', sections[activeIndex + 1]?.disabled ? 'true' : 'false');
      previous.style.opacity = activeIndex === 0 ? '.42' : '1';
      next.style.opacity = sections[activeIndex + 1]?.disabled ? '.42' : '1';
      next.title = sections[activeIndex + 1]?.disabled ? 'Complete the lesson review to unlock the final quiz.' : '';
    }
    bar.querySelector("[data-status]").textContent = record.complete ? `Lesson ${lesson} complete \u2713` : `Lesson ${lesson} \u00b7 requirements in progress`;
  };
  document.addEventListener("input", () => setTimeout(sync, 0));
  document.addEventListener("change", () => setTimeout(sync, 0));
  document.addEventListener("click", () => setTimeout(sync, 150));
  window.addEventListener("storage", sync);
  setInterval(sync, 2500);
  sync();
})();

