(() => {
  const lessonMatch = location.pathname.match(/lesson-(\d{2})/i);
  if (!lessonMatch || typeof quiz === 'undefined') return;
  const lesson = Number(lessonMatch[1]);
  const titleCase = text => text.replace(/\b\w[^\s]*/g, word => /^(a|an|and|as|at|but|by|for|from|in|into|nor|of|on|or|the|to|with)$/i.test(word) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1));
  const clean = text => text
    .replaceAll('ROUX LIFE ACADEMY', 'Roux Life Academy').replaceAll('ROUX', 'Roux').replaceAll('Â·', '·').replaceAll('â€”', '—')
    .replaceAll('â€™', '’').replaceAll('â€œ', '“').replaceAll('â€', '”')
    .replaceAll('rÃ©sumÃ©', 'résumé').replaceAll('âœ“', '✓');
  document.body.classList.add('learning-lab-v2');
  document.querySelectorAll('h1,h2,.eyebrow,nav a,.card strong,.download').forEach(node => {
    node.childNodes.forEach(child => { if (child.nodeType === Node.TEXT_NODE) child.textContent = clean(child.textContent); });
  });
  document.querySelectorAll('h2,.card strong').forEach(node => { node.textContent = titleCase(node.textContent.trim()); });
  document.querySelectorAll('*').forEach(node => {
    if (node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE) node.firstChild.textContent = clean(node.firstChild.textContent);
  });

  const main = document.querySelector('main');
  const quizSection = document.getElementById('quiz');
  const nav = document.querySelector('body>nav');
  if (!main || !quizSection || !nav) return;
  const review = document.createElement('section');
  review.id = 'review';
  review.innerHTML = `<div class="eyebrow">Lesson ${lesson} Review</div><h2>Bring the Lesson Into Focus</h2><p>Six concise review cards connect the lesson’s essential ideas to the judgment required on the assessment.</p><div class="rl-review-shell"><div class="rl-review-meta">Essential Coaching Judgment</div><div id="rlReviewCard"></div><div class="rl-review-controls"><button id="rlReviewBack" type="button" aria-label="Previous review card">←</button><span id="rlReviewCount"></span><button id="rlReviewNext" type="button" aria-label="Next review card">→</button><button id="rlBeginQuiz" type="button" class="rl-hidden">Begin the Assessment</button></div></div>`;
  main.insertBefore(review, quizSection);

  const oldLinks = [...nav.querySelectorAll('a')];
  const names = {case:['Welcome','Lesson Orientation'],workbook:['Workbook','Guided Application'],practice:['Practice','Practical Integration'],quiz:['Final Quiz','12 Questions · 80%'],downloads:['Completion','Results and Downloads']};
  nav.innerHTML = '';
  oldLinks.forEach(link => {
    const id = (link.getAttribute('href') || '').replace('#','');
    if (!document.getElementById(id)) return;
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.panel = id;
    const copy = names[id] || [titleCase(link.textContent.trim()),''];
    button.innerHTML = `${copy[0]}<small>${copy[1]}</small>`;
    nav.appendChild(button);
    if (id === 'practice') {
      const reviewButton = document.createElement('button');
      reviewButton.type = 'button'; reviewButton.dataset.panel = 'review';
      reviewButton.innerHTML = 'Lesson Review<small>Six Essential Takeaways</small>';
      nav.appendChild(reviewButton);
    }
  });

  const sections = [...main.querySelectorAll(':scope>section')];
  const buttons = [...nav.querySelectorAll('[data-panel]')];
  const reviewKey = `rouxLesson${lesson}ReviewComplete`;
  const quizButton = nav.querySelector('[data-panel="quiz"]');
  const show = id => {
    if (id === 'quiz' && localStorage.getItem(reviewKey) !== 'true') id = 'review';
    sections.forEach(section => section.classList.toggle('active', section.id === id));
    buttons.forEach(button => button.classList.toggle('active', button.dataset.panel === id));
    scrollTo({top:0,behavior:'smooth'});
    window.dispatchEvent(new CustomEvent('roux-lab-section-change',{detail:{id}}));
  };
  buttons.forEach(button => button.onclick = () => {
    if (button.disabled) return;
    show(button.dataset.panel);
  });
  sections.forEach(section => section.classList.remove('active'));
  show(sections[0]?.id || 'case');

  const reviewCards = quiz.slice(0,6).map((item,index) => {
    const answer = item.options[item.answer];
    return {
      number:String(index+1).padStart(2,'0'),
      title:item.q.replace(/[?]$/,''),
      answer,
      why:item.why,
      points:[`Best answer: ${answer}`,item.why,'Use this distinction in a real coaching conversation while preserving client ownership.']
    };
  });
  let reviewIndex = 0;
  const renderReview = () => {
    const item = reviewCards[reviewIndex];
    document.getElementById('rlReviewCard').innerHTML = `<article class="rl-review-card"><div><div class="eyebrow">Review ${item.number}</div><h3>${item.title}</h3><p>${item.why}</p><ul class="rl-review-points">${item.points.map(point=>`<li>${point}</li>`).join('')}</ul></div><aside class="rl-review-lens"><div><b>Decision Lens</b><strong>${item.answer}</strong></div><p>Connect the principle to the client’s language, context, choices, and scope of coaching.</p></aside></article>`;
    document.getElementById('rlReviewCount').textContent = `${reviewIndex+1} of ${reviewCards.length}`;
    document.getElementById('rlReviewBack').disabled = reviewIndex === 0;
    document.getElementById('rlReviewNext').classList.toggle('rl-hidden',reviewIndex === reviewCards.length-1);
    document.getElementById('rlBeginQuiz').classList.toggle('rl-hidden',reviewIndex !== reviewCards.length-1);
  };
  document.getElementById('rlReviewBack').onclick = () => { if(reviewIndex>0){reviewIndex--;renderReview();} };
  document.getElementById('rlReviewNext').onclick = () => { if(reviewIndex<reviewCards.length-1){reviewIndex++;renderReview();} };
  document.getElementById('rlBeginQuiz').onclick = () => { localStorage.setItem(reviewKey,'true'); quizButton.disabled=false; quizButton.title=''; show('quiz'); };
  quizButton.disabled = localStorage.getItem(reviewKey) !== 'true';
  quizButton.title = quizButton.disabled ? 'Complete the Lesson Review to unlock the Final Quiz.' : '';
  renderReview();
})();
