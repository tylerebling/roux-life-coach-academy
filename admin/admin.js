(() => {
  const SUPABASE_URL="https://dwkjwzissuaahieapkxo.supabase.co";
  const SUPABASE_KEY="sb_publishable_KyYzYYxFcf7icqODS0WEcw_mBmEvb-_";
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  let data=null,session=null;
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
    renderLearners();renderCertificates();renderBilling();renderCourse();renderAudit();
  }
  function renderLearners(){
    const query=$("#learnerSearch").value.trim().toLowerCase();
    const rows=(data.learners||[]).filter(x=>`${x.fullName} ${x.email}`.toLowerCase().includes(query));
    $("#learnerRows").innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.fullName||"Name not supplied")}</strong><small>${esc(x.email)}</small></td><td><span class="badge ${esc(x.enrollment?.status||"")}">${esc(x.enrollment?.status||"not enrolled")}</span></td><td><strong>${x.lessonsComplete}/19 lessons</strong><small>Average quiz ${x.averageQuizScore}%</small></td><td>${x.finalAttempt?`<strong>${x.finalAttempt.score}%</strong><small>${x.finalAttempt.passed?"Passed":"Not passed"}</small>`:"—"}</td><td>${date(x.lastSignInAt)}</td><td><div class="row-actions"><button data-reset-email="${esc(x.email)}">Password help</button>${x.enrollment?`<button data-status="${x.enrollment.id}" data-value="active">Activate</button><button data-status="${x.enrollment.id}" data-value="revoked" class="danger">Revoke access</button><button data-reset-progress="${x.enrollment.id}" class="danger">Reset progress</button>`:""}</div></td></tr>`).join(""):`<tr><td class="empty" colspan="6">No learners match this search.</td></tr>`;
  }
  function renderCertificates(){const rows=data.certificates||[];$("#certificateRows").innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.recipient_name)}</strong></td><td>${esc(x.certificate_number)}</td><td>${x.final_score}%</td><td>${date(x.issued_at)}</td><td><span class="badge ${esc(x.status)}">${esc(x.status)}</span>${x.revocation_reason?`<small>${esc(x.revocation_reason)}</small>`:""}</td><td><div class="row-actions">${x.status!=="revoked"?`<button data-revoke-cert="${x.id}" class="danger">Revoke</button>`:`<button data-restore-cert="${x.id}">Restore</button>`}</div></td></tr>`).join(""):`<tr><td class="empty" colspan="6">No certificates have been issued.</td></tr>`}
  function renderBilling(){const rows=(data.learners||[]).filter(x=>x.enrollment);$("#billingRows").innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.fullName||x.email)}</strong><small>${esc(x.email)}</small></td><td><span class="badge ${esc(x.enrollment.status)}">${esc(x.enrollment.status)}</span></td><td title="${esc(x.enrollment.stripe_checkout_session_id||"")}">${short(x.enrollment.stripe_checkout_session_id)}</td><td title="${esc(x.enrollment.stripe_payment_intent_id||"")}">${short(x.enrollment.stripe_payment_intent_id)}</td><td>${date(x.enrollment.enrolled_at)}</td><td><div class="row-actions">${x.enrollment.stripe_payment_intent_id&&x.enrollment.status!=="refunded"?`<button data-refund="${x.enrollment.id}" class="danger">Refund</button>`:"—"}</div></td></tr>`).join(""):`<tr><td class="empty" colspan="6">No billing records.</td></tr>`}
  function renderCourse(){const c=data.course||{};$("#coursePrice").value=(Number(c.price_cents||0)/100).toFixed(2);$("#stripePriceId").value=c.stripe_price_id||"";$("#coursePublished").checked=!!c.is_published}
  function renderAudit(){const rows=data.auditLog||[];$("#auditRows").innerHTML=rows.length?rows.map(x=>`<tr><td>${date(x.created_at)}</td><td>${esc(x.action)}</td><td>${esc(x.target_type)}<small>${esc(x.target_id||"")}</small></td><td>${short(x.actor_user_id)}</td><td><small>${esc(JSON.stringify(x.details||{}))}</small></td></tr>`).join(""):`<tr><td class="empty" colspan="5">No administrator actions recorded.</td></tr>`}
  function confirmAction(title,message,needsReason=false){return new Promise(resolve=>{const d=$("#confirmDialog");$("#dialogTitle").textContent=title;$("#dialogMessage").textContent=message;$("#reasonLabel").hidden=!needsReason;$("#dialogReason").value="";d.onclose=()=>resolve(d.returnValue==="confirm"?$("#dialogReason").value.trim():null);d.showModal()})}
  async function act(body,success){await invoke(body);toast(success);await load()}
  document.addEventListener("click",async event=>{const b=event.target.closest("button");if(!b)return;try{
    if(b.dataset.tab){document.querySelectorAll(".tabs button,.panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById(b.dataset.tab).classList.add("active")}
    if(b.dataset.resetEmail){const result=await client.auth.resetPasswordForEmail(b.dataset.resetEmail,{redirectTo:location.origin+location.pathname});if(result.error)throw result.error;toast("Password recovery email sent.")}
    if(b.dataset.status)await act({action:"update-enrollment",enrollmentId:b.dataset.status,status:b.dataset.value},"Learner access updated.");
    if(b.dataset.resetProgress){if(await confirmAction("Reset all lesson progress?","This permanently removes the learner’s saved lesson progress. Type confirmation is handled securely." )!==null)await act({action:"reset-progress",enrollmentId:b.dataset.resetProgress,confirm:"RESET"},"Learner progress reset.")}
    if(b.dataset.revokeCert){const reason=await confirmAction("Revoke this certificate?","Public verification will immediately show the credential as revoked.",true);if(reason!==null)await act({action:"certificate-status",certificateId:b.dataset.revokeCert,status:"revoked",reason},"Certificate revoked.")}
    if(b.dataset.restoreCert){if(await confirmAction("Restore this certificate?","The credential will return to valid status.")!==null)await act({action:"certificate-status",certificateId:b.dataset.restoreCert,status:"valid"},"Certificate restored.")}
    if(b.dataset.refund){if(await confirmAction("Issue a Stripe refund?","This is a real financial action and will revoke paid enrollment access.")!==null)await act({action:"refund-payment",enrollmentId:b.dataset.refund},"Refund submitted.")}
  }catch(error){toast(error.message||"Unable to complete the action.")}});
  $("#signInForm").addEventListener("submit",async event=>{event.preventDefault();$("#authMessage").textContent="Signing in…";const result=await client.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});if(result.error){$("#authMessage").textContent=result.error.message;return}session=result.data.session;await start()});
  $("#forgotPassword").onclick=async()=>{const email=$("#email").value.trim();if(!email){$("#authMessage").textContent="Enter your email first.";return}const result=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});$("#authMessage").textContent=result.error?result.error.message:"Recovery email sent."};
  $("#signOut").onclick=async()=>{await client.auth.signOut();location.reload()};
  $("#refresh").onclick=()=>load().then(()=>toast("Records refreshed.")).catch(error=>toast(error.message));
  $("#learnerSearch").oninput=renderLearners;
  $("#courseForm").onsubmit=async event=>{event.preventDefault();try{await act({action:"update-course",priceCents:Math.round(Number($("#coursePrice").value||0)*100),stripePriceId:$("#stripePriceId").value,isPublished:$("#coursePublished").checked},"Course settings saved.")}catch(error){toast(error.message)}};
  async function start(){try{await load();$("#accessPanel").hidden=true;$("#adminApp").hidden=false;$("#signOut").hidden=false;$("#adminIdentity").textContent=session.user.email||"Administrator"}catch(error){$("#authMessage").textContent=error.message==="ADMIN_REQUIRED"?"This account does not have administrator access.":error.message;await client.auth.signOut()}}
  client.auth.getSession().then(({data})=>{session=data.session;if(session)start();else $("#adminIdentity").textContent="Administrator sign-in"});
})();
