(() => {
  const trigger = document.getElementById('openExam');
  if (!trigger) return;
  const key = 'rouxFinalReviewComplete';
  const cards = [
    ['Coaching Foundations','Coaching supports awareness, choice, action, and accountability while the client retains ownership.','Clarify the role before offering perspective; coaching is not therapy, diagnosis, rescue, or control.'],
    ['The Roux Method','Recognize, Open, Uncover, and Execute provide flexible structure—not a script.','Return to an earlier stage when new emotion, resistance, or information changes what the conversation needs.'],
    ['Courage and Self-Knowledge','Useful vulnerability is honest, boundaried, and in service of the client.','Challenge shame without removing responsibility; distinguish behavior from a global identity verdict.'],
    ['Attachment-Informed Coaching','Patterns describe protective strategies, not fixed identities or clinical diagnoses.','Support regulation, self-validation, communication, boundaries, and tolerance for uncertainty without promising relational outcomes.'],
    ['Goals, Habits, and Change','Strong action is specific, realistic, values-aligned, client-owned, and reviewable.','Treat setbacks as information. Adjust the experiment without punishment, dependence, or coach-owned pressure.'],
    ['Ethics, Safety, and Referral','Scope remains active in every session. Emotion may belong in coaching; diagnosis and treatment do not.','Pause ordinary coaching for immediate danger, severe impairment, or needs requiring clinical, medical, legal, crisis, or specialized support.']
  ];
  const shell = document.createElement('div');
  shell.className = 'modal-shell hidden'; shell.id = 'finalReviewShell';
  shell.setAttribute('role','dialog'); shell.setAttribute('aria-modal','true'); shell.setAttribute('aria-labelledby','final-review-title');
  shell.innerHTML = `<div class="exam-modal"><div class="modal-header"><div><p class="eyebrow">FINAL REVIEW · STAGE 20</p><h2 id="final-review-title">Prepare for the Comprehensive Assessment</h2><p>Review six essential areas before beginning the 20-question final exam.</p></div><button class="close-button" type="button" aria-label="Close Final Review">×</button></div><div id="finalReviewCard"></div><div class="exam-submit"><strong id="finalReviewCount"></strong><div><button class="primary-button" id="finalReviewBack">Previous</button><button class="primary-button" id="finalReviewNext">Next</button><button class="primary-button hidden" id="finalReviewBegin">Begin Final Exam</button></div></div></div>`;
  document.body.appendChild(shell);
  let index=0;
  const render=()=>{const [title,principle,application]=cards[index];document.getElementById('finalReviewCard').innerHTML=`<article class="question-card"><p class="eyebrow">ESSENTIAL AREA ${String(index+1).padStart(2,'0')}</p><h3>${title}</h3><p>${principle}</p><div class="option selected"><strong>Professional Judgment</strong><span>${application}</span></div></article>`;document.getElementById('finalReviewCount').textContent=`${index+1} of ${cards.length}`;document.getElementById('finalReviewBack').disabled=index===0;document.getElementById('finalReviewNext').classList.toggle('hidden',index===cards.length-1);document.getElementById('finalReviewBegin').classList.toggle('hidden',index!==cards.length-1)};
  trigger.addEventListener('click',event=>{if(trigger.disabled)return;if(localStorage.getItem(key)==='true')return;event.preventDefault();event.stopImmediatePropagation();shell.classList.remove('hidden');render()},true);
  shell.querySelector('.close-button').onclick=()=>shell.classList.add('hidden');
  document.getElementById('finalReviewBack').onclick=()=>{if(index>0){index--;render()}};
  document.getElementById('finalReviewNext').onclick=()=>{if(index<cards.length-1){index++;render()}};
  document.getElementById('finalReviewBegin').onclick=()=>{localStorage.setItem(key,'true');shell.classList.add('hidden');trigger.click()};
  const originalText=trigger.textContent;
  const observer=new MutationObserver(()=>{if(!trigger.disabled&&localStorage.getItem(key)!=='true')trigger.textContent='Begin Final Review';else if(trigger.disabled)trigger.textContent=originalText});
  observer.observe(trigger,{attributes:true,attributeFilter:['disabled']});
})();
