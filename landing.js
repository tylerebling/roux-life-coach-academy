(() => {
  const route = action => '/academy/?action=' + encodeURIComponent(action);
  const activate = (el, handler, label) => {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    if (label) el.setAttribute('aria-label', label);
    el.addEventListener('click', handler);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler(e);
      }
    });
  };

  const chatMessages = [
    ['Great start. How are you feeling right now?', 'Warm opening recognized'],
    ['I’m nervous, but I want to try this.', 'Emotion and motivation identified'],
    ['What do you hear underneath that?', 'Powerful question recognized']
  ];
  document.querySelectorAll('.sim-chat p').forEach((message, index) => {
    activate(message, () => {
      document.querySelectorAll('.sim-chat p').forEach(item => item.classList.remove('selected'));
      message.classList.add('selected');
      const input = document.querySelector('.sim-chat label');
      input.textContent = chatMessages[index][1] + ' ✓';
      input.classList.add('confirmed');
    }, 'Select coaching response: ' + chatMessages[index][0]);
  });

  const phone = document.querySelector('.phone-ui');
  if (phone) activate(phone, () => location.href = route('dashboard-preview'), 'Explore the student dashboard');

  const play = document.querySelector('.play');
  if (play) activate(play, () => location.href = route('sample-lesson'), 'Watch a sample lesson');

  const journeyActions = ['courses', 'demo', 'feedback-preview', 'certification', 'enroll'];
  document.querySelectorAll('.journey-list li').forEach((step, index) => {
    activate(step, () => location.href = route(journeyActions[index]), 'Open step ' + (index + 1) + ': ' + step.querySelector('h3').textContent);
  });

  document.querySelectorAll('.comparison > div:not(.comparison-head)').forEach(row => {
    activate(row, () => {
      document.querySelectorAll('.comparison > div').forEach(item => item.classList.remove('is-selected'));
      row.classList.add('is-selected');
    }, 'Compare ' + row.firstElementChild.textContent);
  });

  document.querySelectorAll('.sim-scores span').forEach(score => {
    activate(score, () => score.classList.toggle('expanded'), 'Show details for ' + score.textContent.trim());
  });

  document.querySelectorAll('blockquote').forEach(quote => {
    activate(quote, () => quote.classList.toggle('expanded'), 'Expand testimonial');
  });

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', anchor.getAttribute('href'));
    });
  });
})();