const input=document.getElementById("certificateInput"),result=document.getElementById("verifyResult");
const endpoint="https://dwkjwzissuaahieapkxo.supabase.co/functions/v1/academy-verify-certificate";
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
async function verify(){
  const number=input.value.trim().toUpperCase();
  result.innerHTML='<div class="verify-result"><h2>Checking the secure registry…</h2></div>';
  try{
    const response=await fetch(`${endpoint}?certificate=${encodeURIComponent(number)}`);
    const data=await response.json();
    if(!response.ok||!data.certificate){result.innerHTML='<div class="verify-result invalid"><span class="verify-badge">NOT FOUND</span><h2>Credential not located</h2><p>Check every letter and number, then try again.</p></div>';return}
    const record=data.certificate,date=new Date(record.issued_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
    result.innerHTML=`<div class="verify-result ${data.valid?"":"invalid"}"><span class="verify-badge">${escapeHtml(record.status.toUpperCase())} CREDENTIAL</span><h2>${escapeHtml(record.recipient_name)}</h2><p>${escapeHtml(record.credential_name)} · ${escapeHtml(record.credential_abbreviation)}</p><div class="verify-details"><div><span>Certificate number</span><strong>${escapeHtml(record.certificate_number)}</strong></div><div><span>Date issued</span><strong>${date}</strong></div><div><span>Program</span><strong>40-hour RLC certification</strong></div><div><span>Final exam</span><strong>${escapeHtml(record.final_score)}%</strong></div></div></div>`;
  }catch{result.innerHTML='<div class="verify-result invalid"><span class="verify-badge">UNAVAILABLE</span><h2>Verification is temporarily unavailable</h2><p>Please try again shortly.</p></div>'}
}
document.getElementById("verifyButton").addEventListener("click",verify);input.addEventListener("keydown",event=>{if(event.key==="Enter")verify()});const query=new URLSearchParams(location.search).get("certificate");if(query){input.value=query;verify()}
