const lessons = [
  [1,"What Is a Life Coach?","Coaching Foundations",30,"foundation"],
  [2,"The ROUX Coaching Method","Coaching Foundations",30,"foundation"],
  [3,"Stories, Beliefs, and Protective Patterns","Self-Awareness",28,"awareness"],
  [4,"Values, Identity, and Personal Truth","Self-Awareness",27,"awareness"],
  [5,"Vulnerability and Emotional Armor","Emotional Courage",29,"courage"],
  [6,"Practicing Courage in Real Life","Emotional Courage",28,"courage"],
  [7,"Shame, Guilt, and the Inner Critic","Resilience",29,"resilience"],
  [8,"Self-Compassion, Repair, and Resilience","Resilience",28,"resilience"],
  [9,"Attachment Patterns, Emotional Safety, and Choice","Attachment & Connection",30,"attachment"],
  [10,"Emotional Connection and Healthy Communication","Attachment & Connection",29,"attachment"],
  [11,"Healthy Boundaries Without Guilt","Relationships",28,"relationships"],
  [12,"Conflict, Requests, and Difficult Conversations","Relationships",29,"relationships"],
  [13,"Navigating Change, Grief, and Uncertainty","Life Transitions",29,"transitions"],
  [14,"Rediscovering Purpose and Direction","Life Transitions",28,"transitions"],
  [15,"Values-Based Goals and Practical Roadmaps","Sustainable Change",29,"change"],
  [16,"Habits, Setbacks, and Sustainable Change","Sustainable Change",29,"change"],
  [17,"Core Coaching Skills and Powerful Questions","Professional Practice",29,"practice"],
  [18,"Structuring an Effective Coaching Session","Professional Practice",29,"practice"],
  [19,"Scope, Ethics, Referral, and Client Safety","Professional Responsibility",30,"ethics"]
].map(([number,title,division,minutes,accent])=>({number,title,division,minutes,accent}));

lessons.forEach(lesson=>{lesson.url=`lessons/lesson-${String(lesson.number).padStart(2,"0")}/index.html`;});

const questions = [];

const state = { completed: [], examScore: null, answers: {}, issuedName: "", issuedDate: "", activeDivision: "All lessons" };
const key = "roux-academy-progress-v1";
const recordKey = "roux-academy-credential-records-v1";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function restore(){
  try { Object.assign(state, JSON.parse(localStorage.getItem(key) || "{}")); }
  catch { /* begin with clean evaluator state */ }
  state.completed=lessons.filter(lesson=>{try{return JSON.parse(localStorage.getItem(`rouxAcademyLesson${lesson.number}Record`)||"{}").complete===true}catch{return false}}).map(lesson=>lesson.number);
  if(!state.answers || typeof state.answers!=="object") state.answers={};
}
function save(){ localStorage.setItem(key, JSON.stringify(state)); }
function certNumber(name,date){ if(state.certificateNumber)return state.certificateNumber;let hash=2166136261;for(const char of `${name.trim().toUpperCase()}|${date}|RLC`){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return `RLC-${date.slice(0,4)}-${String(hash>>>0).slice(-7).padStart(7,"0")}`; }
function showNotice(message){ const notice=$("#notice"); notice.querySelector("span").textContent=message; notice.classList.remove("hidden"); clearTimeout(showNotice.timer); showNotice.timer=setTimeout(()=>notice.classList.add("hidden"),6500); }

function renderTabs(){
  const divisions=["All lessons",...new Set(lessons.map(l=>l.division))];
  $("#divisionTabs").innerHTML=divisions.map(d=>`<button role="tab" aria-selected="${state.activeDivision===d}" class="${state.activeDivision===d?"active":""}" data-division="${d}">${d}</button>`).join("");
  $$("[data-division]").forEach(button=>button.addEventListener("click",()=>{state.activeDivision=button.dataset.division;renderTabs();renderLessons();}));
}
function renderLessons(){
  const filtered=state.activeDivision==="All lessons"?lessons:lessons.filter(l=>l.division===state.activeDivision);
  $("#lessonGrid").innerHTML=filtered.map((lesson,index)=>{
    const done=state.completed.includes(lesson.number),unlocked=lesson.number===1||state.completed.includes(lesson.number-1);
    const action=unlocked?`<a class="lesson-action" href="${lesson.url}">${done?"Completed Â· Review":"Open lesson"}<span aria-hidden="true">â†’</span></a>`:`<span class="lesson-action" aria-disabled="true">Complete Lesson ${lesson.number-1} to unlock <span aria-hidden="true">ðŸ”’</span></span>`;
    return `<article class="lesson-card ${done?"completed":""} ${unlocked?"":"locked"}" style="--delay:${index*35}ms"><div class="lesson-art ${lesson.accent}"><span>${String(lesson.number).padStart(2,"0")}</span><div class="art-line"></div></div><div class="lesson-body"><p class="lesson-division">${lesson.division}</p><h3>${lesson.title}</h3><div class="lesson-meta"><span>${lesson.minutes} min presentation</span><span>Presentation Â· workbook Â· practice Â· quiz</span></div>${action}</div>${done?'<span class="completion-mark" aria-label="Completed">âœ“</span>':""}</article>`;
  }).join("");
}
function renderMaterials(){
  const grid=$("#materialsGrid");
  if(!grid)return;
  grid.innerHTML=lessons.map(lesson=>{
    const done=state.completed.includes(lesson.number),unlocked=lesson.number===1||state.completed.includes(lesson.number-1);
    const destination=lesson.number===1?lesson.url:`lessons/lesson-${String(lesson.number).padStart(2,"0")}/LEARNING_LAB.html`;
    return `<article class="material-card ${unlocked?"":"locked"}"><span>${String(lesson.number).padStart(2,"0")}</span><div><p>${lesson.division}</p><h3>${lesson.title}</h3><small>${lesson.number===1?"Lesson presentation and completion activity":"Workbook Â· reflection Â· practice Â· 12-question quiz"}</small></div>${unlocked?`<a href="${destination}">${done?"Review materials":"Open materials"} <span aria-hidden="true">â†’</span></a>`:`<span class="material-lock">Unlock after Lesson ${lesson.number-1}</span>`}</article>`;
  }).join("");
}
function renderProgress(){
  const progress=Math.round(state.completed.length/lessons.length*100), remaining=lessons.length-state.completed.length, unlocked=remaining===0, ready=unlocked&&(state.examScore||0)>=80;
  $("#progressValue").textContent=`${progress}%`; $("#progressTrack").setAttribute("aria-label",`${progress}% complete`); $("#progressTrack span").style.width=`${progress}%`; $("#completedValue").textContent=state.completed.length; $("#remainingValue").textContent=remaining; $("#examValue").textContent=state.examScore===null?"â€”":`${state.examScore}%`; $("#pathLessonCount").textContent=`${state.completed.length} of ${lessons.length} lessons`;
  const next=lessons.find(l=>!state.completed.includes(l.number)); $("#continueButton").textContent=next?`Continue with Lesson ${next.number}`:"Review the curriculum"; $("#continueButton").href=next?next.url:"#curriculum"; $("#continueButton").href=next?next.url:"#curriculum";
  $("#pathLessons").className=unlocked?"done":"current"; $("#pathExam").className=ready?"done":unlocked?"current":"locked"; $("#pathCertificate").className=state.issuedName?"done":ready?"current":"locked";
  $("#examHeadline").textContent=unlocked?"Your final examination is unlocked.":`Complete ${remaining} more lesson${remaining===1?"":"s"} to unlock the exam.`; $("#openExam").disabled=!unlocked; $("#openExam").textContent=state.examScore===null?"Begin final exam":"Review or retake exam"; $("#issueCard").classList.toggle("hidden",!ready);
}
function renderExam(){
  $("#questionList").innerHTML=questions.map((question,index)=>{const review=(state.examReview||[]).find(item=>item.id===question.id);return `<fieldset><legend><span>${String(index+1).padStart(2,"0")}</span>${question.q}</legend><div class="answer-grid">${question.a.map((answer,aIndex)=>`<label class="${state.answers[index]===aIndex?"selected":""}"><input type="radio" name="q-${index}" value="${aIndex}" ${state.answers[index]===aIndex?"checked":""}><span>${answer}</span></label>`).join("")}</div>${review?`<p class="exam-feedback ${review.isCorrect?"correct":"incorrect"}">${review.isCorrect?"Correct.":"Review:"} ${review.explanation}</p>`:""}</fieldset>`}).join("");
  $$("#questionList input").forEach(input=>input.addEventListener("change",()=>{const index=Number(input.name.split("-")[1]);state.answers[index]=Number(input.value);save();renderExam();}));
  $("#answeredCount").textContent=`${Object.keys(state.answers).length} of ${questions.length} answered`; $("#scoreDisplay").textContent=state.examScore===null?"":`${state.examScore}% Â· ${state.examScore>=80?"Passed":"Retake required"}`;
}
async function gradeExam(){
  if(Object.keys(state.answers).length<questions.length){showNotice(`Please answer all ${questions.length} questions before submitting.`);return;}
  if(!window.rouxAcademyCloud){showNotice("Secure examination service is unavailable. Please reconnect and try again.");return;}
  try{const answers=Object.fromEntries(questions.map((question,index)=>[question.id,state.answers[index]]));const result=await window.rouxAcademyCloud.submitFinal(answers);state.examScore=result.score;state.examReview=result.review||[];if(result.certificate){state.issuedName=result.certificate.recipient_name;state.issuedDate=result.certificate.issued_at.slice(0,10);state.certificateNumber=result.certificate.certificate_number;}save();renderExam();renderProgress();if(result.passed&&result.certificate){populateCertificate();$("#certificateShell").classList.remove("hidden");}showNotice(result.passed?`You passed with ${result.score}%. Your official certificate has been issued.`:`You scored ${result.score}%. Review the explanations and retake the exam.`)}catch(error){showNotice(error.message||"The examination could not be graded.")}
}
function issueCertificate(){if(!state.certificateNumber){showNotice("Pass the secure final examination to receive your certificate.");return;}populateCertificate();$("#certificateShell").classList.remove("hidden");}
function populateCertificate(){
  if(!state.issuedName||!state.issuedDate)return; $("#certificate-title").textContent=state.issuedName; $("#certificateDate").textContent=new Date(`${state.issuedDate}T12:00:00`).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}); $("#certificateNumber").textContent=`Certificate No. ${certNumber(state.issuedName,state.issuedDate)}`;
}
function downloadCertificate(){
  const c=document.createElement("canvas");c.width=3300;c.height=2550;const x=c.getContext("2d");if(!x)return;x.fillStyle="#f5efe2";x.fillRect(0,0,3300,2550);x.strokeStyle="#183426";x.lineWidth=34;x.strokeRect(80,80,3140,2390);x.strokeStyle="#c49a5a";x.lineWidth=8;x.strokeRect(125,125,3050,2300);x.textAlign="center";x.fillStyle="#183426";x.font="700 92px Georgia";x.fillText("ROUX LIFE ACADEMY",1650,390);x.fillStyle="#9a6b32";x.font="600 42px Arial";x.fillText("C E R T I F I C A T E   O F   C O M P L E T I O N",1650,510);x.fillStyle="#3b443d";x.font="38px Arial";x.fillText("This certifies that",1650,715);x.fillStyle="#152c20";x.font="italic 118px Georgia";x.fillText(state.issuedName,1650,935);x.strokeStyle="#c49a5a";x.lineWidth=3;x.beginPath();x.moveTo(600,1000);x.lineTo(2700,1000);x.stroke();x.fillStyle="#3b443d";x.font="42px Arial";x.fillText("has successfully completed the 40-hour",1650,1160);x.fillStyle="#183426";x.font="700 78px Georgia";x.fillText("Roux Life Certified Coach Program",1650,1280);x.fillStyle="#3b443d";x.font="38px Arial";x.fillText("demonstrating proficiency in ethical, action-centered transformational coaching",1650,1400);x.font="34px Arial";x.fillText("including the ROUX Coaching Method, emotional courage, boundaries,",1650,1480);x.fillText("attachment-informed pattern education, client safety, and professional referral.",1650,1550);x.fillStyle="#9a6b32";x.font="700 54px Georgia";x.fillText("RLC â€” Roux Life Certified Coach",1650,1725);x.strokeStyle="#183426";x.lineWidth=2;x.beginPath();x.moveTo(380,2040);x.lineTo(1220,2040);x.moveTo(2080,2040);x.lineTo(2920,2040);x.stroke();x.fillStyle="#183426";x.font="italic 48px Georgia";x.fillText("Nicole Deslatte",800,2015);x.fillText(new Date(`${state.issuedDate}T12:00:00`).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),2500,2015);x.font="26px Arial";x.fillText("Founder, Roux Life",800,2090);x.fillText("Date Issued",2500,2090);x.font="24px Arial";x.fillStyle="#59645c";x.fillText(`Certificate No. ${certNumber(state.issuedName,state.issuedDate)}`,1650,2250);x.fillText("Private professional coaching certification Â· Not a state license or mental-health credential",1650,2330);const a=document.createElement("a");a.download=`${state.issuedName.replace(/[^a-z0-9]+/gi,"_")}_RLC_Certificate.webp`;a.href=c.toDataURL("image/png",1);a.click();
}
function currentRecord(){let records=[];try{records=JSON.parse(localStorage.getItem(recordKey)||"[]")}catch{};return records.find(record=>record.certificateNumber===certNumber(state.issuedName,state.issuedDate));}
function downloadRecord(){const record=currentRecord();if(!record){showNotice("Issue the certificate before downloading its credential record.");return;}const file=new Blob([JSON.stringify(record,null,2)],{type:"application/json"}),a=document.createElement("a");a.download=`${record.certificateNumber}_credential_record.json`;a.href=URL.createObjectURL(file);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
const dashboardPhases=[
  {name:"Foundations",range:[1,2],description:"Build the standards that make coaching safe, clear, and client-owned."},
  {name:"Self-Knowledge",range:[3,6],description:"Deepen awareness of identity, emotion, and courageous practice."},
  {name:"Resilience",range:[7,10],description:"Strengthen compassion, repair, emotional safety, and connection."},
  {name:"Communication",range:[11,14],description:"Practice boundaries, conflict, change, and meaningful direction."},
  {name:"Practice",range:[15,19],description:"Turn insight into sustainable action and professional coaching skill."},
  {name:"Final Review",range:null,description:"Complete the secure final assessment and receive your credential."}
];
const dashboardPhaseIcons=[
'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28V11M16 18c-5 0-9-3-9-9 6 0 9 3 9 9Zm0-4c0-5 3-9 9-9 0 6-3 9-9 9ZM9 28h14"/></svg>',
'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M20 27h-9v-5c-2-2-3-5-3-8A9 9 0 1 1 23 21v6h-3"/><path d="M16 10c1-2 5-1 5 2 0 3-5 6-5 6s-5-3-5-6c0-3 4-4 5-2Z"/></svg>',
'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 27 12 14l5 7 3-4 9 10M15 18V5m0 0h9l-3 3 3 3h-9M8 27c3-3 5-4 8-5"/></svg>',
'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="11" cy="10" r="4"/><circle cx="22" cy="10" r="4"/><path d="M3 27v-5a8 8 0 0 1 16 0v5m0-11a8 8 0 0 1 10 8v3"/></svg>',
'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="20" cy="6" r="2.5"/><path d="M20 1v2m0 6v2m-5-5h2m6 0h2M7 28c0-5 10-5 10-10S8 15 8 10c0-3 3-5 7-5M5 28h5m4 0h5"/></svg>',
'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m9 4 3 2 4-2 4 2 3-2 2 4 4 1-1 4 2 3-3 3 1 4-4 1-2 4-4-2-4 2-2-4-4-1 1-4-3-3 3-3-1-4 4-1Z"/><circle cx="16" cy="15" r="6"/><path d="m13 15 2 2 4-5M12 24l-2 6 6-3m4-3 2 6-6-3"/></svg>'];
function dashboardText(id,value){const element=document.getElementById(id);if(element)element.textContent=value;}
function dashboardIdentity(user,remote){
  const profile=remote.profile||remote.student||remote.enrollment?.profile||{};
  const full=(profile.full_name||profile.name||user.user_metadata?.full_name||user.user_metadata?.name||"").trim();
  const explicitFirst=(profile.first_name||user.user_metadata?.first_name||"").trim();
  if(explicitFirst)return{firstName:explicitFirst,fullName:full||explicitFirst};
  if(full)return{firstName:full.split(/\s+/)[0],fullName:full};
  const emailLocal=(user.email||"").split("@")[0].toLowerCase().replace(/[^a-z]/g,"");
  const commonFirstNames=["alexandra","christopher","danielle","elizabeth","jennifer","jonathan","michael","michelle","nicole","rebecca","samantha","stephanie","victoria","amanda","andrew","ashley","brandon","brittany","charles","emily","jessica","joshua","lauren","matthew","megan","melissa","natalie","rachel","sarah","taylor","tyler"];
  const matched=commonFirstNames.sort((a,b)=>b.length-a.length).find(name=>emailLocal.startsWith(name));
  const firstName=matched?matched[0].toUpperCase()+matched.slice(1):"Student";
  return{firstName,fullName:firstName};
}
function renderDashboard(){
  const shell=document.getElementById("studentDashboard");if(!shell||!window.RouxDashboardModel)return;
  const cloud=window.rouxAcademyCloud;if(!cloud||(cloud.session&&!cloud.remoteState)){shell.setAttribute("aria-busy","true");return;}
  const view=window.RouxDashboardModel.buildDashboard(lessons,localStorage),remote=cloud.remoteState||{};
  const session=cloud.session,user=session?.user||{},{fullName,firstName}=dashboardIdentity(user,remote);
  const curriculumPhaseIndex=dashboardPhases.findIndex(phase=>phase.range&&view.current.number>=phase.range[0]&&view.current.number<=phase.range[1]);
  const finalPassed=Number(state.examScore||remote.final_exam_score||remote.exam?.score||remote.certificate?.final_score||0)>=80;
  const phaseIndex=view.completed===view.total?5:Math.max(0,curriculumPhaseIndex),phase=dashboardPhases[phaseIndex];
  dashboardText("studentFirstName",firstName);dashboardText("profileName",fullName);dashboardText("profileInitial",firstName.slice(0,1).toUpperCase());dashboardText("phaseKicker",`PHASE ${phaseIndex+1}: ${phase.name.toUpperCase()}`);dashboardText("phaseDescription",phase.description);
  dashboardText("currentLessonNumber",`LESSON ${String(view.current.number).padStart(2,"0")} - ${phase.name.toUpperCase()}`);dashboardText("currentLessonTitle",view.current.title);dashboardText("currentLessonMeta",`${view.current.minutes} min - Next: ${view.resumeActivity==="review"?"Review completed lesson":`Complete ${view.resumeActivity}`}`);
  const activityLabels={presentation:"Presentation",workbook:"Workbook",practice:"Practice",quiz:"Quiz"};
  const dashboardActivityIcons={presentation:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4.5 7.5c4.8-.8 8.6.4 11.5 3.5 2.9-3.1 6.7-4.3 11.5-3.5v18c-4.8-.8-8.6.4-11.5 3.5-2.9-3.1-6.7-4.3-11.5-3.5Z"/><path d="M16 11v18"/></svg>',workbook:'<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="6" width="18" height="23" rx="1.5"/><path d="M12 4h8v5h-8ZM11 14h10m-10 5h10m-10 5h7"/></svg>',practice:'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="15" cy="17" r="10"/><circle cx="15" cy="17" r="6"/><circle cx="15" cy="17" r="2"/><path d="m17 15 10-10m-5 0h5v5"/></svg>',quiz:'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11"/><path d="M12 12c0-3 2-5 5-5s5 2 5 5c0 4-5 4-5 8m0 5h.01"/></svg>',complete:'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11"/><path d="m10 16 4 4 8-9"/></svg>'};
  document.getElementById("activityRow").innerHTML=Object.entries(view.activities).map(([key,done])=>`<span class="${done?"done":""}"><i>${done?"DONE":"--"}</i>${activityLabels[key]}</span>`).join("");
  const lessonPercent=view.lessonPercent;
  dashboardText("lessonPercent",`${lessonPercent}%`);document.getElementById("lessonRing")?.style.setProperty("--lesson-progress",`${lessonPercent}%`);const resume=document.getElementById("resumeLesson");resume.href=view.resumeUrl;resume.firstChild.textContent=view.resumeActivity==="review"?"Review Lesson ":"Resume Lesson ";
  if(view.next){dashboardText("nextLessonNumber",`LESSON ${String(view.next.number).padStart(2,"0")}`);dashboardText("nextLessonTitle",view.next.title);dashboardText("nextLessonMeta",view.nextUnlocked?`${view.next.minutes} min - Available now`:`Complete Lesson ${view.current.number} to unlock`);dashboardText("nextLock",view.nextUnlocked?"Available":"Locked");const nextAction=document.getElementById("nextLessonAction");nextAction.setAttribute("aria-disabled",String(!view.nextUnlocked));if(view.nextUnlocked){nextAction.href=view.nextUrl}else nextAction.removeAttribute("href");}
  else{dashboardText("nextLessonNumber","FINAL REVIEW");dashboardText("nextLessonTitle","Certification assessment");dashboardText("nextLessonMeta",view.currentRecord.complete?"Your final assessment is available.":"Complete Lesson 19 to unlock");dashboardText("nextLock",view.currentRecord.complete?"Available":"Locked");}
  dashboardText("journeyPercent",`${view.percent}% complete`);dashboardText("lessonsComplete",view.completed);dashboardText("progressPercentValue",view.percent);dashboardText("hoursLogged",view.hours);document.getElementById("dashboardProgressBar").style.width=`${view.percent}%`;document.getElementById("dashboardProgressRing")?.style.setProperty("--dashboard-progress",`${view.percent}%`);
  const milestoneTrack=document.getElementById("milestoneTrack");
  milestoneTrack.innerHTML=dashboardPhases.map((item,index)=>{
    const phaseLessons=item.range?lessons.filter(lesson=>lesson.number>=item.range[0]&&lesson.number<=item.range[1]):[];
    const done=item.range?phaseLessons.every(lesson=>state.completed.includes(lesson.number)):finalPassed;
    const current=index===phaseIndex&&!done;
    const reviewable=phaseLessons.filter(lesson=>state.completed.includes(lesson.number));
    const status=done?"Review":current&&reviewable.length?"Review completed":current?"Current":"Locked";
    const range=item.range?`${item.range[0]} - ${item.range[1]}`:"20";
    const content=`<i>${dashboardPhaseIcons[index]}</i><b>${item.name}</b><small>${range}</small><span>${status}</span>`;
    return reviewable.length
      ? `<button type="button" class="milestone ${done?"complete":current?"current":"locked"} reviewable" data-review-phase="${index}" aria-label="Review completed ${item.name} lessons">${content}</button>`
      : `<div class="milestone ${done?"complete":current?"current":"locked"}">${content}</div>`;
  }).join("");
  let reviewMenu=document.getElementById("milestoneReviewMenu");
  if(!reviewMenu){
    reviewMenu=document.createElement("div");
    reviewMenu.id="milestoneReviewMenu";
    reviewMenu.className="milestone-review-menu";
    reviewMenu.hidden=true;
    milestoneTrack.insertAdjacentElement("afterend",reviewMenu);
  }
  milestoneTrack.querySelectorAll("[data-review-phase]").forEach(button=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.reviewPhase),item=dashboardPhases[index];
    const completedLessons=lessons.filter(lesson=>item.range&&lesson.number>=item.range[0]&&lesson.number<=item.range[1]&&state.completed.includes(lesson.number));
    const wasOpen=!reviewMenu.hidden&&reviewMenu.dataset.phase===String(index);
    milestoneTrack.querySelectorAll("[data-review-phase]").forEach(item=>item.setAttribute("aria-expanded","false"));
    if(wasOpen){reviewMenu.hidden=true;reviewMenu.removeAttribute("data-phase");return;}
    reviewMenu.dataset.phase=String(index);
    reviewMenu.innerHTML=`<div><strong>Review ${item.name}</strong><span>Your completed lessons stay complete.</span></div><nav aria-label="Completed ${item.name} lessons">${completedLessons.map(lesson=>`<a href="${lesson.url}"><span>Lesson ${String(lesson.number).padStart(2,"0")}</span><b>${lesson.title}</b><i aria-hidden="true">&rarr;</i></a>`).join("")}</nav>`;
    reviewMenu.hidden=false;
    button.setAttribute("aria-expanded","true");
  }));
  document.getElementById("weeklyTasks").innerHTML=Object.entries(view.activities).filter(([,done])=>!done).slice(0,3).map(([key])=>`<div><span class="task-icon" aria-hidden="true">${dashboardActivityIcons[key]}</span><p><b>${activityLabels[key]}</b><small>Lesson ${view.current.number}</small></p></div>`).join("")||'<div><span class="task-icon" aria-hidden="true">${dashboardActivityIcons.complete}</span><p><b>Lesson complete</b><small>Continue to your next lesson</small></p></div>';
  const progressRows=Array.isArray(remote.progress)?remote.progress:[],scores=progressRows.map(row=>Number(row.practice_score)).filter(Number.isFinite);dashboardText("practiceScore",scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):"--");
  const lowerAction=document.getElementById("lowerNextStepAction");if(lowerAction){lowerAction.href=view.resumeUrl;lowerAction.firstChild.textContent=view.completed===0?"Begin Lesson 1 ":"Continue Lesson ";dashboardText("nextStepTitle",view.completed===0?"Begin your first lesson.":`Continue Lesson ${view.current.number}.`);dashboardText("nextStepDescription",view.completed===0?"Start with Lesson 1 in Foundations and take the first step toward becoming the coach you're meant to be.":`Continue ${view.current.title} and keep building your coaching practice.`);dashboardText("nextStepTime",`About ${view.current.minutes} minutes`);}
  shell.setAttribute("aria-busy","false");
}
function renderAll(){renderTabs();renderLessons();renderMaterials();renderProgress();populateCertificate();renderDashboard();}

restore();renderAll();renderExam();$("#year").textContent=new Date().getFullYear();window.restore=restore;window.renderAll=renderAll;
window.addEventListener("focus",()=>{restore();renderAll()});
window.addEventListener("storage",()=>{restore();renderAll()});
const evaluatorButton=$("#completeAll");if(evaluatorButton)evaluatorButton.remove();
$("#openExam").addEventListener("click",async()=>{try{const data=await window.rouxAcademyCloud.loadFinalQuestions();questions.splice(0,questions.length,...data.questions.map(q=>({id:q.id,q:q.prompt,a:q.options})));state.answers={};state.examReview=[];$("#examShell").classList.remove("hidden");renderExam();}catch(error){showNotice(error.message||"Sign in to begin the final examination.")}});
$("#gradeExam").addEventListener("click",gradeExam);$("#issueCertificate").addEventListener("click",issueCertificate);$("#printCertificate").addEventListener("click",()=>window.print());$("#downloadCertificate").addEventListener("click",downloadCertificate);$("#downloadRecord").addEventListener("click",downloadRecord);$("#verifyCertificate").addEventListener("click",()=>window.open(`verify.html?certificate=${encodeURIComponent(certNumber(state.issuedName,state.issuedDate))}`,"_blank"));
$("#notice button").addEventListener("click",()=>$("#notice").classList.add("hidden"));
$$('[data-close]').forEach(button=>button.addEventListener("click",()=>document.getElementById(button.dataset.close).classList.add("hidden")));
$$('[data-scroll]').forEach(button=>button.addEventListener("click",()=>document.getElementById(button.dataset.scroll).scrollIntoView({behavior:"smooth"})));
const materialsButton=$("#openMaterials");if(materialsButton)materialsButton.addEventListener("click",()=>{const library=$("#materialsLibrary");library.classList.remove("hidden");renderMaterials();library.scrollIntoView({behavior:"smooth",block:"start"});});
const mobileNavToggle=$("#mobileNavToggle");if(mobileNavToggle)mobileNavToggle.addEventListener("click",()=>{const open=document.body.classList.toggle("dashboard-menu-open");mobileNavToggle.setAttribute("aria-expanded",String(open));});
function syncDashboardNavigation(){const hash=location.hash||"#journey";$$('.dashboard-sidebar nav a').forEach(link=>{const active=link.getAttribute("href")===hash||(hash==="#certification"&&link.getAttribute("href")==="#certification-dashboard");link.classList.toggle("active",active);if(active)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");});}
$$('.dashboard-sidebar a').forEach(link=>link.addEventListener("click",()=>{document.body.classList.remove("dashboard-menu-open");mobileNavToggle?.setAttribute("aria-expanded","false");setTimeout(syncDashboardNavigation,0);}));
window.addEventListener("hashchange",syncDashboardNavigation);syncDashboardNavigation();
const dashboardLogout=$("#dashboardLogout");if(dashboardLogout)dashboardLogout.addEventListener("click",async()=>{if(confirm("Sign out of the academy?"))await window.rouxAcademyCloud?.client.auth.signOut();});
const sidebarLogout=$("#sidebarLogout");if(sidebarLogout)sidebarLogout.addEventListener("click",async event=>{event.preventDefault();if(confirm("Sign out of the academy?"))await window.rouxAcademyCloud?.client.auth.signOut();});
$$('[data-pending-route]').forEach(link=>link.addEventListener("click",event=>{event.preventDefault();showNotice(`${link.dataset.pendingRoute} is ready to connect when its production route is available.`);}));
const observedSections=["curriculum","materials","certification"].map(id=>document.getElementById(id)).filter(Boolean);
if("IntersectionObserver" in window){const observer=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!visible)return;$$('[data-section-link]').forEach(link=>link.classList.toggle("active",link.dataset.sectionLink===visible.target.id));},{rootMargin:"-30% 0px -55%",threshold:[0,.15,.4]});observedSections.forEach(section=>observer.observe(section));}
document.addEventListener("keydown",event=>{if(event.key==="Escape"){$("#examShell").classList.add("hidden");$("#certificateShell").classList.add("hidden");}});



