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
    bar.querySelector("[data-status]").textContent = record.complete ? `Lesson ${lesson} complete ✓` : `Lesson ${lesson} · requirements in progress`;
  };
  document.addEventListener("input", () => setTimeout(sync, 0));
  document.addEventListener("change", () => setTimeout(sync, 0));
  document.addEventListener("click", () => setTimeout(sync, 150));
  window.addEventListener("storage", sync);
  setInterval(sync, 2500);
  sync();
})();
