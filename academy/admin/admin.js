(() => {
  const SUPABASE_URL="https://dwkjwzissuaahieapkxo.supabase.co";
  const SUPABASE_KEY="sb_publishable_KyYzYYxFcf7icqODS0WEcw_mBmEvb-_";
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  let data=null,session=null;
  const LESSONS=[
    "What Is a Life Coach?","The ROUX Coaching Method","Stories, Beliefs, and Protective Patterns","Values, Identity, and Authentic Direction","Vulnerability and Emotional Armor","Practicing Courage in Real Life","Shame, Guilt, and the Inner Critic","Self-Compassion, Repair, and Resilience","Attachment Patterns, Emotional Safety, and Choice","Emotional Connection and Healthy Communication","Healthy Boundaries Without Guilt","Conflict, Requests, and Difficult Conversations","Navigating Change, Grief, and Uncertainty","Rediscovering Purpose and Direction","Values-Based Goals and Practical Roadmaps","Habits, Setbacks, and Sustainable Change","Core Coaching Skills and Powerful Questions","Structuring an Effective Coaching Session","Scope, Ethics, Referral, and Client Safety"
  ];
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const date=value=>value?new Date(value).toLocaleString():"—";
  const short=value=>value?`${String(value).slice(0,10)}…`:"—";
  const toast=message=>{const el=$("#toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3000)};
  async function invoke(body){const {data,error}=await client.functions.invoke("academy-admin",{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
  async function load(){data=await invoke({action:"overview"});render();}
  function metric(value,label){return `<article class="metric"><strong>${esc(value)}</strong><span>${esc(label)}</span></article>`}
  function render(){
    const learners=data.learners||[],enrolled=learners.filter(x=>x.enrollment),active=learners.filter(x=>x.enrollment?.status==="active"),completed=learners.filter(x=>x.enrollment?.status==="completed"),valid=(data.certificates||[]).filter(x=>x.status==="valid");
    $("#metrics").innerHTML=metric(learners.length,"Accounts")+metric(enrolled.length,"Enrolled")+metric(active.length,"Active learners")+metric(completed.length,"Graduates")+metric(valid.length,"Valid certificates");
    renderLessons();renderLearners();renderCertificates();renderBilling();renderCourse();renderAudit();renderAdministrators();
  }
  function renderLessons(){
    const grid=$("#lessonQaGrid");if(!grid)return;
    grid.innerHTML=LESSONS.map((title,index)=>{const lesson=index+1,pad=String(lesson).padStart(2,"0");return `<article class="lesson-qa-card"><span class="lesson-qa-number">${pad}</span><div class="lesson-qa-copy"><span>LESSON ${pad} · ADMIN REVIEW</span><h3>${esc(title)}</h3><div class="lesson-qa-actions"><button data-open-lesson="${pad}">Open lesson</button>${lesson===1?`<button data-open-lesson="${pad}">Workbook & quiz</button>`:`<button data-open-lab="${pad}">Learning lab</button>`}</div></div></article>`}).join("");
  }
  function openAdminLesson(pad,lab=false){const file=lab?"LEARNING_LAB.html":"index.html";window.open(`/academy/lessons/lesson-${pad}/${file}?adminPreview=1`,"_blank","noopener")}
  function renderLearners(){
    const query=$("#learnerSearch").value.trim().toLowerCase();
    const rows=(data.learners||[]).filter(x=>`${x.fullName} ${x.email}`.toLowerCase().includes(query));
    $("#learnerRows").innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.fullName||"Name not supplied")}</strong><small>${esc(x.email)}</small></td><td><span class="badge ${esc(x.enrollment?.status||"")}">${esc(x.enrollment?.status||"not enrolled")}</span></td><td><strong>${x.lessonsComplete}/19 lessons</strong><small>Average quiz ${x.averageQuizScore}%</small></td><td>${x.finalAttempt?`<strong>${x.finalAttempt.score}%</strong><small>${x.finalAttempt.passed?"Passed":"Not passed"}</small>`:"—"}</td><td>${date(x.lastSignInAt)}</td><td><div class="row-actions"><button data-reset-email="${esc(x.email)}">Password help</button>${x.enrollment?`<button data-status="${x.enrollment.id}" data-value="active">Activate</button><button data-status="${x.enrollment.id}" data-value="revoked" class="danger">Revoke access</button><button data-reset-progress="${x.enrollment.id}" class="danger">Reset progress</button>`:""}</div></td></tr>`).join(""):`<tr><td class="empty" colspan="6">No learners match this search.</td></tr>`;
  }
  function renderCertificates(){const rows=data.certificates||[];$("#certificateRows").innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.recipient_name)}</strong></td><td>${esc(x.certificate_number)}</td><td>${x.final_score}%</td><td>${date(x.issued_at)}</td><td><span class="badge ${esc(x.status)}">${esc(x.status)}</span>${x.revocation_reason?`<small>${esc(x.revocation_reason)}</small>`:""}</td><td><div class="row-actions">${x.status!=="revoked"?`<button data-revoke-cert="${x.id}" class="danger">Revoke</button>`:`<button data-restore-cert="${x.id}">Restore</button>`}</div></td></tr>`).join(""):`<tr><td class="empty" colspan="6">No certificates have been issued.</td></tr>`}
  function renderBilling(){const rows=(data.learners||[]).filter(x=>x.enrollment);$("#billingRows").innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.fullName||x.email)}</strong><small>${esc(x.email)}</small></td><td><span class="badge ${esc(x.enrollment.status)}">${esc(x.enrollment.status)}</span></td><td title="${esc(x.enrollment.stripe_checkout_session_id||"")}">${short(x.enrollment.stripe_checkout_session_id)}</td><td title="${esc(x.enrollment.stripe_payment_intent_id||"")}">${short(x.enrollment.stripe_payment_intent_id)}</td><td>${date(x.enrollment.enrolled_at)}</td><td><div class="row-actions">${x.enrollment.stripe_payment_intent_id&&x.enrollment.status!=="refunded"?`<button data-refund="${x.enrollment.id}" class="danger">Refund</button>`:"—"}</div></td></tr>`).join(""):`<tr><td class="empty" colspan="6">No billing records.</td></tr>`}
  function renderCourse(){const c=data.course||{};$("#coursePrice").value=(Number(c.price_cents||0)/100).toFixed(2);$("#stripePriceId").value=c.stripe_price_id||"";$("#coursePublished").checked=!!c.is_published}
  function renderAudit(){const rows=data.auditLog||[];$("#auditRows").innerHTML=rows.length?rows.map(x=>`<tr><td>${date(x.created_at)}</td><td>${esc(x.action)}</td><td>${esc(x.target_type)}<small>${esc(x.target_id||"")}</small></td><td>${short(x.actor_user_id)}</td><td><small>${esc(JSON.stringify(x.details||{}))}</small></td></tr>`).join(""):`<tr><td class="empty" colspan="5">No administrator actions recorded.</td></tr>`}
  function renderAdministrators(){
    const rows=data.administrators||[],isOwner=data.role==="owner",form=$("#inviteAdminForm"),note=$("#invitePermissionNote");
    form.hidden=!isOwner;
    note.textContent=isOwner?"Invitations expire according to your Supabase authentication settings. Invited administrators create their own password; their email address is their sign-in username.":"Only the academy owner can send invitations or change administrator access.";
    $("#administratorRows").innerHTML=rows.length?rows.map(x=>{
      const status=x.accessEnabled?(x.confirmedAt?"Active":"Invitation pending"):"Disabled";
      const statusClass=x.accessEnabled?(x.confirmedAt?"active":"pending"):"revoked";
      const action=!isOwner||x.protectedOwner?"—":x.accessEnabled
        ?`<button class="danger" data-admin-access="${esc(x.userId)}" data-enabled="false" data-admin-name="${esc(x.fullName||x.email)}">Disable</button>`
        :`<button data-admin-access="${esc(x.userId)}" data-enabled="true" data-admin-name="${esc(x.fullName||x.email)}">Restore</button>`;
      return `<tr><td><strong>${esc(x.fullName||"Name not supplied")}</strong><small>${esc(x.email||"")}</small></td><td><span class="badge ${esc(x.role)}">${esc(x.role)}</span></td><td><span class="badge ${statusClass}">${status}</span>${x.protectedOwner?"<small>Protected owner account</small>":""}</td><td>${date(x.invitedAt)}</td><td>${date(x.lastSignInAt)}</td><td><div class="row-actions">${action}</div></td></tr>`;
    }).join(""):`<tr><td class="empty" colspan="6">No administrator accounts found.</td></tr>`;
  }
  function confirmAction(title,message,needsReason=false){return new Promise(resolve=>{const d=$("#confirmDialog");$("#dialogTitle").textContent=title;$("#dialogMessage").textContent=message;$("#reasonLabel").hidden=!needsReason;$("#dialogReason").value="";d.onclose=()=>resolve(d.returnValue==="confirm"?$("#dialogReason").value.trim():null);d.showModal()})}
  async function act(body,success){await invoke(body);toast(success);await load()}
  document.addEventListener("click",async event=>{const b=event.target.closest("button");if(!b)return;try{
    if(b.dataset.tab){document.querySelectorAll(".tabs button,.panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById(b.dataset.tab).classList.add("active")}
    if(b.dataset.openLesson)openAdminLesson(b.dataset.openLesson,false);
    if(b.dataset.openLab)openAdminLesson(b.dataset.openLab,true);
    if(b.dataset.learnerView)window.open("/academy/","_blank","noopener");
    if(b.dataset.resetEmail){const result=await client.auth.resetPasswordForEmail(b.dataset.resetEmail,{redirectTo:location.origin+location.pathname});if(result.error)throw result.error;toast("Password recovery email sent.")}
    if(b.dataset.status)await act({action:"update-enrollment",enrollmentId:b.dataset.status,status:b.dataset.value},"Learner access updated.");
    if(b.dataset.resetProgress){if(await confirmAction("Reset all lesson progress?","This permanently removes the learner’s saved lesson progress. Type confirmation is handled securely." )!==null)await act({action:"reset-progress",enrollmentId:b.dataset.resetProgress,confirm:"RESET"},"Learner progress reset.")}
    if(b.dataset.revokeCert){const reason=await confirmAction("Revoke this certificate?","Public verification will immediately show the credential as revoked.",true);if(reason!==null)await act({action:"certificate-status",certificateId:b.dataset.revokeCert,status:"revoked",reason},"Certificate revoked.")}
    if(b.dataset.restoreCert){if(await confirmAction("Restore this certificate?","The credential will return to valid status.")!==null)await act({action:"certificate-status",certificateId:b.dataset.restoreCert,status:"valid"},"Certificate restored.")}
    if(b.dataset.refund){if(await confirmAction("Issue a Stripe refund?","This is a real financial action and will revoke paid enrollment access.")!==null)await act({action:"refund-payment",enrollmentId:b.dataset.refund},"Refund submitted.")}
    if(b.dataset.adminAccess){
      const enabled=b.dataset.enabled==="true",name=b.dataset.adminName||"this administrator";
      const title=enabled?"Restore administrator access?":"Disable administrator access?";
      const message=enabled?`${name} will regain access to protected administration.`:`${name} will immediately lose access to protected administration. Their identity and learner data will remain intact.`;
      if(await confirmAction(title,message)!==null)await act({action:"set-admin-access",userId:b.dataset.adminAccess,enabled},enabled?"Administrator access restored.":"Administrator access disabled.");
    }
  }catch(error){toast(error.message||"Unable to complete the action.")}});
  $("#signInForm").addEventListener("submit",async event=>{event.preventDefault();$("#authMessage").textContent="Signing in…";const result=await client.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});if(result.error){$("#authMessage").textContent=result.error.message;return}session=result.data.session;await start()});
  $("#forgotPassword").onclick=async()=>{const email=$("#email").value.trim();if(!email){$("#authMessage").textContent="Enter your email first.";return}const result=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});$("#authMessage").textContent=result.error?result.error.message:"Recovery email sent."};
  $("#signOut").onclick=async()=>{await client.auth.signOut();location.reload()};
  $("#learnerViewToggle").onclick=()=>window.open("/academy/","_blank","noopener");
  $("#refresh").onclick=()=>load().then(()=>toast("Records refreshed.")).catch(error=>toast(error.message));
  $("#learnerSearch").oninput=renderLearners;
  $("#courseForm").onsubmit=async event=>{event.preventDefault();try{await act({action:"update-course",priceCents:Math.round(Number($("#coursePrice").value||0)*100),stripePriceId:$("#stripePriceId").value,isPublished:$("#coursePublished").checked},"Course settings saved.")}catch(error){toast(error.message)}};
  $("#inviteAdminForm").onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;button.textContent="Sending invitation…";try{await act({action:"invite-admin",fullName:$("#inviteAdminName").value.trim(),email:$("#inviteAdminEmail").value.trim()},"Administrator invitation sent.");event.target.reset()}catch(error){toast(error.message||"Unable to send the invitation.")}finally{button.disabled=false;button.textContent="Send administrator invite"}};
  $("#inviteSetupForm").onsubmit=async event=>{event.preventDefault();const password=$("#invitePassword").value,confirmation=$("#invitePasswordConfirm").value,message=$("#inviteSetupMessage");message.textContent="";if(password.length<8){message.textContent="Use at least 8 characters.";return}if(password!==confirmation){message.textContent="The passwords do not match.";return}const result=await client.auth.updateUser({password});if(result.error){message.textContent=result.error.message;return}message.textContent="Administrator account activated.";setTimeout(()=>{const url=new URL(location.href);url.searchParams.delete("invited");history.replaceState({},"",url);$("#inviteSetupDialog").close();toast("Your administrator password is ready.")},700)};
  function maybeShowInviteSetup(){const invited=new URLSearchParams(location.search).get("invited")==="1";if(invited&&session&&!$("#inviteSetupDialog").open)$("#inviteSetupDialog").showModal()}
  async function start(){try{await load();$("#accessPanel").hidden=true;$("#adminApp").hidden=false;$("#signOut").hidden=false;$("#learnerViewToggle").hidden=false;$("#adminIdentity").textContent=session.user.email||"Administrator";maybeShowInviteSetup()}catch(error){$("#authMessage").textContent=error.message==="ADMIN_REQUIRED"?"This account does not have administrator access.":error.message;await client.auth.signOut()}}
  client.auth.getSession().then(({data})=>{session=data.session;if(session)start();else $("#adminIdentity").textContent="Administrator sign-in"});
})();
