(() => {
  'use strict';
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNavigation = document.getElementById('mobile-navigation');
  const closeMenu = () => { menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); mobileNavigation.hidden = true; };
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    mobileNavigation.hidden = !open;
  });
  mobileNavigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') { closeMenu(); menuButton.focus(); } });

  const hoursInput = document.getElementById('study-hours');
  const updatePace = () => {
    const hours = Number(hoursInput.value), weeks = Math.ceil(40 / hours);
    document.getElementById('hours-output').textContent = `${hours} hours`;
    document.getElementById('weeks-output').textContent = String(weeks);
    hoursInput.setAttribute('aria-valuetext', `${hours} hours per week, approximately ${weeks} weeks`);
  };
  hoursInput.addEventListener('input', updatePace); updatePace();

  const responses = {
    open: 'This open question gives Lauren room to identify her priorities. You’re inviting her perspective before choosing a direction together.',
    advice: 'This question introduces your solution early. Try exploring what matters to Lauren before focusing on whether she should change jobs.'
  };
  document.querySelectorAll('[data-response]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-response]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    document.querySelector('.reflection-feedback').textContent = responses[button.dataset.response];
  }));

  // Accessible feature panels: click/tap, Arrow keys, Home and End.
  const platformTabs = [...document.querySelectorAll('.platform-tabs [role="tab"]')];
  const selectTab = index => {
    platformTabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = i !== index;
    });
  };
  platformTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % platformTabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + platformTabs.length) % platformTabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = platformTabs.length - 1;
      else return;
      event.preventDefault(); selectTab(next); platformTabs[next].focus();
    });
  });

  // Exact original hero clips. The source bytes are unchanged.
  const videos = [...document.querySelectorAll('.hero-scene')];
  const sceneButtons = [...document.querySelectorAll('[data-select-scene]')];
  const motionButton = document.querySelector('.motion-toggle');
  const progress = document.getElementById('cinema-progress');
  const notice = document.getElementById('video-notice');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = [
    ['SMART COACH SIMULATOR', 'Practice from the place you call home.'],
    ['YOUR ONLINE ACADEMY', 'Your learning. Your progress. Your next step.'],
    ['LEARN FROM ANYWHERE', 'Your classroom goes where you go.']
  ];
  let activeScene = 0, userPaused = reducedMotion.matches, heroVisible = true;
  const canPlay = () => !userPaused && heroVisible && !document.hidden && !document.querySelector('dialog[open]');
  const updateMotion = () => {
    const playing = !videos[activeScene].paused && !videos[activeScene].ended;
    motionButton.setAttribute('aria-label', playing ? 'Pause hero video' : 'Play hero video');
    motionButton.firstElementChild.textContent = playing ? 'Ⅱ' : '▷';
  };
  const pauseAll = () => { videos.forEach(video => video.pause()); updateMotion(); };
  const playActive = () => {
    if (!canPlay()) { pauseAll(); return; }
    const video = videos[activeScene];
    video.muted = true;
    const playPromise = video.play();
    if (playPromise) playPromise.catch(error => {
      if (video !== videos[activeScene] || !canPlay()) return;
      if (error.name === 'AbortError') return;
      userPaused = true; updateMotion();
      if (error.name !== 'NotAllowedError') { notice.textContent = 'This video couldn’t play. Try another scene or press play to retry.'; notice.hidden = false; }
    });
  };
  const selectScene = index => {
    if (!Number.isInteger(index) || index < 0 || index >= videos.length) return;
    videos.forEach(video => video.pause()); activeScene = index;
    videos.forEach((video, i) => video.classList.toggle('is-active', i === index));
    sceneButtons.forEach((button, i) => { button.classList.toggle('is-active', i === index); button.setAttribute('aria-pressed', String(i === index)); });
    document.getElementById('scene-kicker').textContent = scenes[index][0];
    document.getElementById('scene-caption').textContent = scenes[index][1];
    progress.style.width = '0%'; notice.hidden = true;
    try { videos[index].currentTime = 0; } catch (_) { /* Metadata loads on demand. */ }
    updateMotion(); playActive();
  };
  sceneButtons.forEach(button => button.addEventListener('click', () => selectScene(Number(button.dataset.selectScene))));
  motionButton.addEventListener('click', () => {
    if (!videos[activeScene].paused) { userPaused = true; pauseAll(); }
    else { userPaused = false; notice.hidden = true; if (videos[activeScene].ended) videos[activeScene].currentTime = 0; playActive(); }
  });
  videos.forEach((video, index) => {
    video.muted = true;
    video.addEventListener('play', () => { if (index === activeScene) { notice.hidden = true; updateMotion(); } });
    video.addEventListener('pause', () => { if (index === activeScene) updateMotion(); });
    video.addEventListener('timeupdate', () => { if (index === activeScene && Number.isFinite(video.duration) && video.duration > 0) progress.style.width = `${Math.min(100, (video.currentTime / video.duration) * 100)}%`; });
    video.addEventListener('ended', () => { if (index === activeScene && canPlay()) selectScene((activeScene + 1) % videos.length); });
    video.addEventListener('error', () => { if (index === activeScene) { notice.textContent = 'This video is unavailable. Choose another scene to continue.'; notice.hidden = false; userPaused = true; updateMotion(); } });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); else playActive(); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { userPaused = true; pauseAll(); document.querySelectorAll('.reveal-ready').forEach(element => element.classList.add('is-visible')); } });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; if (heroVisible) playActive(); else pauseAll(); }, { threshold: .08 }).observe(document.getElementById('hero-cinema'));
  }
  updateMotion(); playActive();

  document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => {
    const dialog = document.getElementById(button.dataset.dialog);
    dialog.showModal(); document.body.style.overflow = 'hidden'; pauseAll();
  }));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => { document.body.style.overflow = ''; playActive(); });
  });

  // Native horizontal swiping, with optional buttons and keyboard navigation.
  const comparisonViewport = document.getElementById('comparison-viewport');
  const comparisonCards = [...comparisonViewport.querySelectorAll('.path-card')];
  const comparisonArrows = document.querySelector('.comparison-arrows');
  const previousPath = comparisonArrows.querySelector('[data-compare-direction="previous"]');
  const nextPath = comparisonArrows.querySelector('[data-compare-direction="next"]');
  const comparisonStops = () => {
    const maximum = Math.max(0, comparisonViewport.scrollWidth - comparisonViewport.clientWidth);
    return [...new Set(comparisonCards.map(card => Math.min(maximum, card.offsetLeft - comparisonCards[0].offsetLeft)))];
  };
  const updateComparisonControls = () => {
    const maximum = comparisonViewport.scrollWidth - comparisonViewport.clientWidth;
    previousPath.disabled = comparisonViewport.scrollLeft <= 2;
    nextPath.disabled = comparisonViewport.scrollLeft >= maximum - 2;
    if (maximum > 2) comparisonViewport.setAttribute('aria-describedby', 'comparison-swipe-hint');
    else comparisonViewport.removeAttribute('aria-describedby');
  };
  const scrollComparison = direction => {
    const stops = comparisonStops(), current = comparisonViewport.scrollLeft;
    let destination;
    if (direction === 'first') destination = stops[0];
    else if (direction === 'last') destination = stops[stops.length - 1];
    else if (direction === 'previous') destination = [...stops].reverse().find(stop => stop < current - 2) ?? stops[0];
    else destination = stops.find(stop => stop > current + 2) ?? stops[stops.length - 1];
    comparisonViewport.scrollTo({ left: destination, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  };
  comparisonArrows.hidden = false;
  previousPath.addEventListener('click', () => scrollComparison('previous'));
  nextPath.addEventListener('click', () => scrollComparison('next'));
  comparisonViewport.addEventListener('scroll', updateComparisonControls, { passive: true });
  comparisonViewport.addEventListener('keydown', event => {
    if (event.target !== comparisonViewport) return;
    const direction = { ArrowLeft: 'previous', ArrowRight: 'next', Home: 'first', End: 'last' }[event.key];
    if (!direction) return;
    event.preventDefault(); scrollComparison(direction);
  });
  window.addEventListener('resize', updateComparisonControls);
  updateComparisonControls();

  // Subtle, one-time entrances; all content remains visible without JavaScript.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
    }), { threshold: .07, rootMargin: '0px 0px 30px 0px' });
    document.querySelectorAll('.section-heading,.lauren-stage,.journey-pillars>div,.pace-card,.dashboard-button,.business-media,.tuition-card').forEach((element, i) => {
      element.classList.add('reveal-ready'); element.style.transitionDelay = `${Math.min(i % 3, 2) * 55}ms`; revealObserver.observe(element);
    });
  }
  let scrollFrame = 0;
  const updatePageProgress = () => {
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    document.getElementById('page-progress').style.width = `${distance > 0 ? Math.max(0, Math.min(100, (window.scrollY / distance) * 100)) : 0}%`;
    scrollFrame = 0;
  };
  window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updatePageProgress); }, { passive: true });
  window.addEventListener('resize', updatePageProgress); updatePageProgress();

  // Connects to an existing analytics dataLayer only; loads no tracking service.
  document.addEventListener('click', event => {
    const link = event.target.closest('a'); if (!link) return;
    const href = link.getAttribute('href') || '';
    const eventName = href.includes('action=enroll') ? 'academy_enrollment_click' : href.includes('action=demo') ? 'academy_demo_click' : null;
    if (eventName && Array.isArray(window.dataLayer)) window.dataLayer.push({ event: eventName, cta_text: link.textContent.trim(), cta_location: link.closest('section')?.id || 'navigation' });
  });
})();
