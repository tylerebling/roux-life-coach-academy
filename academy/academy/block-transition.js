(() => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || 'foundations-to-self-knowledge';
  const transition = window.ROUX_LAUREN_TRANSITIONS?.[id];
  if (!transition) { location.replace('index.html#journey'); return; }
  const video = document.getElementById('transitionVideo');
  const poster = document.getElementById('transitionPoster');
  const play = document.getElementById('playButton');
  const preparing = document.getElementById('preparing');
  const next = document.getElementById('nextLesson');
  const transcript = document.getElementById('transcript');
  const captions = document.getElementById('captionsButton');
  const progress = document.getElementById('progressBar');
  document.getElementById('eyebrow').textContent = transition.eyebrow;
  document.getElementById('title').textContent = transition.title;
  document.getElementById('durationLabel').textContent = transition.duration;
  document.getElementById('stepLabel').textContent = `Lesson ${transition.afterLesson} Complete`;
  transcript.textContent = transition.transcript;
  poster.src = transition.poster;
  video.src = transition.video;
  video.poster = transition.poster;
  next.href = `lessons/lesson-${String(transition.nextLesson).padStart(2,'0')}/index.html`;
  const unlock = () => {
    next.setAttribute('aria-disabled','false');
    document.getElementById('gateNote').textContent = 'You are ready for the next block.';
    localStorage.setItem(`rouxTransition:${id}:complete`,'true');
  };
  if (localStorage.getItem(`rouxTransition:${id}:complete`) === 'true') unlock();
  video.addEventListener('timeupdate', () => {
    const ratio = video.duration ? video.currentTime / video.duration : 0;
    progress.style.width = `${Math.min(100, ratio * 100)}%`;
  });
  video.addEventListener('ended', unlock);
  video.addEventListener('play', () => { play.hidden = true; poster.hidden = true; });
  video.addEventListener('error', () => { preparing.hidden = false; play.hidden = true; });
  play.addEventListener('click', async () => {
    try { await video.play(); }
    catch { preparing.hidden = false; play.hidden = true; }
  });
  captions.addEventListener('click', () => {
    transcript.hidden = !transcript.hidden;
    captions.textContent = transcript.hidden ? 'Read Transcript' : 'Hide Transcript';
  });
})();
