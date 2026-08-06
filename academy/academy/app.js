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
  {name:"Practice",range:[15,18],description:"Turn insight into sustainable action and professional coaching skill."},
  {name:"Final Review",range:[19,19],description:"Demonstrate ethical judgment and prepare for certification review."}
];
function dashboardText(id,value){const element=document.getElementById(id);if(element)element.textContent=value;}
function renderDashboard(){
  const shell=document.getElementById("studentDashboard");if(!shell||!window.RouxDashboardModel)return;
  const view=window.RouxDashboardModel.buildDashboard(lessons,localStorage),remote=window.rouxAcademyCloud?.remoteState||{};
  const session=window.rouxAcademyCloud?.session,user=session?.user||{},fullName=(user.user_metadata?.full_name||user.email?.split("@")[0]||"Candidate").trim(),firstName=fullName.split(/\s+/)[0]||"Candidate";
  const phaseIndex=dashboardPhases.findIndex(phase=>view.current.number>=phase.range[0]&&view.current.number<=phase.range[1]),phase=dashboardPhases[Math.max(0,phaseIndex)];
  dashboardText("studentFirstName",firstName);dashboardText("profileName",fullName);dashboardText("profileInitial",firstName.slice(0,1).toUpperCase());dashboardText("phaseKicker",`${phase.name.toUpperCase()} - PHASE ${phaseIndex+1} OF ${dashboardPhases.length}`);dashboardText("phaseDescription",phase.description);
  dashboardText("currentLessonNumber",`LESSON ${String(view.current.number).padStart(2,"0")} - ${phase.name.toUpperCase()}`);dashboardText("currentLessonTitle",view.current.title);dashboardText("currentLessonMeta",`${view.current.minutes} min - Next: ${view.resumeActivity==="review"?"Review completed lesson":`Complete ${view.resumeActivity}`}`);
  const activityLabels={presentation:"Presentation",workbook:"Workbook",practice:"Practice",quiz:"Quiz"};
  document.getElementById("activityRow").innerHTML=Object.entries(view.activities).map(([key,done])=>`<span class="${done?"done":""}"><i>${done?"DONE":"--"}</i>${activityLabels[key]}</span>`).join("");
  const completedActivities=Object.values(view.activities).filter(Boolean).length,lessonPercent=Math.round(completedActivities/4*100);
  dashboardText("lessonPercent",`${lessonPercent}%`);const resume=document.getElementById("resumeLesson");resume.href=view.resumeUrl;resume.firstChild.textContent=view.resumeActivity==="review"?"Review lesson ":`Resume ${view.resumeActivity} `;
  if(view.next){dashboardText("nextLessonNumber",`LESSON ${String(view.next.number).padStart(2,"0")}`);dashboardText("nextLessonTitle",view.next.title);dashboardText("nextLessonMeta",view.nextUnlocked?`${view.next.minutes} min - Available now`:`Complete Lesson ${view.current.number} to unlock`);dashboardText("nextLock",view.nextUnlocked?"Available":"Locked");const nextAction=document.getElementById("nextLessonAction");nextAction.setAttribute("aria-disabled",String(!view.nextUnlocked));if(view.nextUnlocked){nextAction.href=view.nextUrl}else nextAction.removeAttribute("href");}
  else{dashboardText("nextLessonNumber","FINAL REVIEW");dashboardText("nextLessonTitle","Certification assessment");dashboardText("nextLessonMeta",view.currentRecord.complete?"Your final assessment is available.":"Complete Lesson 19 to unlock");dashboardText("nextLock",view.currentRecord.complete?"Available":"Locked");}
  dashboardText("journeyPercent",`${view.percent}% complete`);dashboardText("lessonsComplete",view.completed);dashboardText("hoursLogged",view.hours);document.getElementById("dashboardProgressBar").style.width=`${view.percent}%`;
  document.getElementById("milestoneTrack").innerHTML=dashboardPhases.map((item,index)=>{const phaseLessons=lessons.filter(lesson=>lesson.number>=item.range[0]&&lesson.number<=item.range[1]),done=phaseLessons.every(lesson=>state.completed.includes(lesson.number)),current=index===phaseIndex,status=done?"Complete":current?"Current":index<phaseIndex?"Available":"Locked";return `<div class="milestone ${done?"complete":current?"current":"locked"}"><i>${done?"OK":index+1}</i><b>${item.name}</b><span>${status}</span></div>`}).join("");
  document.getElementById("weeklyTasks").innerHTML=Object.entries(view.activities).filter(([,done])=>!done).slice(0,3).map(([key])=>`<div><span>--</span><p><b>${activityLabels[key]}</b><small>Lesson ${view.current.number}</small></p></div>`).join("")||'<div><span>OK</span><p><b>Lesson complete</b><small>Continue to your next lesson</small></p></div>';
  const progressRows=Array.isArray(remote.progress)?remote.progress:[],scores=progressRows.map(row=>Number(row.practice_score)).filter(Number.isFinite);dashboardText("practiceScore",scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):"--");
  const practiceAction=document.getElementById("practiceLabAction");if(view.activities.presentation&&view.current.number>1){practiceAction.href=`lessons/lesson-${String(view.current.number).padStart(2,"0")}/LEARNING_LAB.html#practice`;practiceAction.setAttribute("aria-disabled","false");dashboardText("practiceRecommendation",`Continue the guided practice for Lesson ${view.current.number}: ${view.current.title}.`);}
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
$$('[data-pending-route]').forEach(link=>link.addEventListener("click",event=>{event.preventDefault();showNotice(`${link.dataset.pendingRoute} is ready to connect when its production route is available.`);}));
const observedSections=["curriculum","materials","certification"].map(id=>document.getElementById(id)).filter(Boolean);
if("IntersectionObserver" in window){const observer=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!visible)return;$$('[data-section-link]').forEach(link=>link.classList.toggle("active",link.dataset.sectionLink===visible.target.id));},{rootMargin:"-30% 0px -55%",threshold:[0,.15,.4]});observedSections.forEach(section=>observer.observe(section));}
document.addEventListener("keydown",event=>{if(event.key==="Escape"){$("#examShell").classList.add("hidden");$("#certificateShell").classList.add("hidden");}});



