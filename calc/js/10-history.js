/* ═══ EUR assurance — 10-history.js ═══
   السجل: الفلاتر، التعديل، الحذف، العرض
   (مقتطع من app.js الأصلي، الأسطر 1248–1369، بالترتيب نفسه) */
function setHFilter(f){H_FILTER=f;H_PICK_DATE='';var dp=document.getElementById('hf-date');if(dp){dp.value='';dp.style.borderColor='';}['all','today','week','month'].forEach(function(x){document.getElementById('hf-'+x).className='hfbtn'+(x===f?' on':'');});renderHist();}
function setHDate(iso){if(!iso)return;var p=iso.split('-');H_PICK_DATE=p[2]+'/'+p[1]+'/'+p[0];H_FILTER='date';['all','today','week','month'].forEach(function(x){var el=document.getElementById('hf-'+x);if(el)el.className='hfbtn';});var dp=document.getElementById('hf-date');if(dp)dp.style.borderColor='#0f2440';renderHist();}
function populateHistFilters(source){
var agentSel=document.getElementById('hf-agent'),insSel=document.getElementById('hf-ins');
if(!agentSel||!insSel)return;
var curAgent=agentSel.value,curIns=insSel.value;
var agents=[],insTypes=[];
source.forEach(function(h){if(h.user&&agents.indexOf(h.user)<0)agents.push(h.user);if(h.ins&&insTypes.indexOf(h.ins)<0)insTypes.push(h.ins);});
agents.sort();insTypes.sort();
agentSel.innerHTML='<option value="">👤 '+(LANG==='fr'?'Tous agents':'كل الموظفين')+'</option>'+agents.map(function(a){return'<option value="'+a.replace(/"/g,'&quot;')+'">'+a+'</option>';}).join('');
insSel.innerHTML='<option value="">🛡️ '+(LANG==='fr'?'Tous types':'كل الأنواع')+'</option>'+insTypes.map(function(t){return'<option value="'+t.replace(/"/g,'&quot;')+'">'+t+'</option>';}).join('');
agentSel.value=curAgent;insSel.value=curIns;
}
function filterHist(list){
var now=new Date(),today=now.toLocaleDateString('fr-FR');
var search=(document.getElementById('h-search').value||'').toLowerCase();
var agentF=(document.getElementById('hf-agent')||{value:''}).value;
var insF=(document.getElementById('hf-ins')||{value:''}).value;
return list.filter(function(h){
if(search&&!(h.client||'').toLowerCase().includes(search)&&!(h.plate||'').toLowerCase().includes(search)&&!(h.num||'').toLowerCase().includes(search)&&!(h.user||'').toLowerCase().includes(search)&&!(h.ins||'').toLowerCase().includes(search))return false;
if(agentF&&h.user!==agentF)return false;
if(insF&&h.ins!==insF)return false;
if(H_FILTER==='today')return h.date===today;
if(H_FILTER==='date')return h.date===H_PICK_DATE;
if(H_FILTER==='week'){var d=parseDate(h.date);if(!d)return false;return Math.floor((now-d)/86400000)<=7;}
if(H_FILTER==='month'){var d2=parseDate(h.date);if(!d2)return false;return d2.getMonth()===now.getMonth()&&d2.getFullYear()===now.getFullYear();}
return true;
});
}
function parseDate(ds){try{var p=ds.split('/');return new Date(p[2],p[1]-1,p[0]);}catch(e){return null;}}
function editClient(i){
  var h=HIST[i];
  var m=document.getElementById('hist-edit-modal');
  if(!m){console.error('edit modal not found');return;}
  // Populate fields
  document.getElementById('hem-idx').value=i;
  document.getElementById('hem-client').value=h.client||'';
  document.getElementById('hem-police').value=h.police||h.num||'';
  document.getElementById('hem-attest').value=h.attest||'';
  document.getElementById('hem-matricule').value=h.plate||h.matricule||'';
  document.getElementById('hem-marque').value=h.marque||'';
  document.getElementById('hem-phone').value=h.phone||'';
  document.getElementById('hem-paid').value=h.paid||0;
  document.getElementById('hem-off').value=h.off||0;
  var typeEl=document.getElementById('hem-type');
  if(typeEl)typeEl.value=h.ins||'';
  m.style.display='flex';
}
function saveHistEdit(){
  var i=parseInt(document.getElementById('hem-idx').value);
  if(isNaN(i)||!HIST[i])return;
  var h=HIST[i];
  h.client=document.getElementById('hem-client').value.trim()||h.client;
  h.police=document.getElementById('hem-police').value.trim();
  h.attest=document.getElementById('hem-attest').value.trim();
  h.plate=document.getElementById('hem-matricule').value.trim();
  h.matricule=h.plate;
  h.marque=document.getElementById('hem-marque').value.trim();
  h.phone=document.getElementById('hem-phone').value.trim();
  var newPaid=parseFloat(document.getElementById('hem-paid').value);
  var newOff=parseFloat(document.getElementById('hem-off').value);
  if(!isNaN(newPaid))h.paid=newPaid;
  if(!isNaN(newOff))h.off=newOff;
  if(!isNaN(newPaid)&&!isNaN(newOff))h.diff=Math.round((newPaid-newOff)*100)/100;
  var typeEl=document.getElementById('hem-type');
  if(typeEl&&typeEl.value)h.ins=typeEl.value;
  svH();renderHist();
  document.getElementById('hist-edit-modal').style.display='none';
}

function delEntry(i){if(!confirm(LANG==='fr'?'Supprimer cette opération?':'حذف هذه العملية؟'))return;HIST.splice(i,1);svH();renderHist();updateQuickStats();}
function renderHist(){
ldH();
var source=CUR.isAdmin?HIST:HIST.filter(function(h){return h.user===CUR.n;});
populateHistFilters(source);
var list=filterHist(source);
var b=document.getElementById('hist-body');
var sm=document.getElementById('h-summary');
if(list.length){
sm.classList.add('show');
document.getElementById('hs-n').textContent=list.length;
var ref=list.filter(function(h){return h.diff>0;}).reduce(function(s,h){return s+h.diff;},0);
var col=list.reduce(function(s,h){return s+h.paid;},0);
document.getElementById('hs-ref').textContent=fmtS(ref);document.getElementById('hs-col').textContent=fmtS(col);
var lbl=H_FILTER==='date'?H_PICK_DATE:H_FILTER==='today'?(LANG==='fr'?"Aujourd'hui":'اليوم'):H_FILTER==='week'?(LANG==='fr'?'Cette semaine':'هذا الأسبوع'):H_FILTER==='month'?(LANG==='fr'?'Ce mois':'هذا الشهر'):(LANG==='fr'?'Tout':'الكل');
document.getElementById('hs-label').textContent=lbl;
}else sm.classList.remove('show');
if(!list.length){b.innerHTML='<div class="empty">📋<br>'+(LANG==='fr'?'Aucune opération':'لا توجد عمليات')+'</div>';return;}
var groups={},order=[];
list.forEach(function(h){var d=h.date||'—';if(!groups[d]){groups[d]=[];order.push(d);}groups[d].push(h);});
function origIdx(h){return HIST.indexOf(h);}
b.innerHTML=order.map(function(date){
var rows=groups[date];
var day='<div class="h-date-sep">'+date+'</div>';
day+=rows.map(function(h){
var i=origIdx(h);
var dc=h.diff>0?'var(--green)':h.diff<0?'var(--red)':'var(--text3)';
var sign=h.diff>0?'↩️':h.diff<0?'⚠️':'✅';
var pm=h.payMode==='cheque'?'📄':h.payMode==='tpe'?'💳':'💵';
return'<div class="hrow">'
  +'<div class="hrow-inline">'
  +'<div class="hrow-meta"><span class="hrow-num">'+escHtml(h.num)+'</span><span class="hrow-time">'+(h.time||'')+'</span></div>'
  +(CUR.isAdmin?'<span class="hrow-av"><b>'+escHtml(h.av||'')+'</b> '+escHtml(h.user)+'</span>':'')
  +'<span class="hrow-client">'+escHtml(h.client)+(h.unpaid?'<span class="hrow-unpaid">⏳ '+(LANG==='fr'?'Non payé':'لم يدفع')+'</span>':h.paidDate?'<span class="hrow-paidlater">💰 '+(LANG==='fr'?'payé le ':'دفع ')+escHtml(h.paidDate)+'</span>':'')+'</span>'
  +(h.plate?'<span class="hrow-plate">'+escHtml(h.plate)+'</span>':'')
  +(typeof rpPhoneChip==='function'?rpPhoneChip(h.police,h.plate):'')
  +'<span class="hrow-ins">'+escHtml(h.ins)+'</span>'
  +'<span class="hrow-pm">'+pm+'</span>'
  +'<span class="hrow-amts"><b class="hrow-paid">'+h.paid.toFixed(0)+'</b><span class="hrow-off">/'+h.off.toFixed(0)+'</span><span class="hrow-diff" style="color:'+dc+'"> '+sign+' '+Math.abs(h.diff).toFixed(2)+'</span></span>'
  +'<div class="hrow-acts">'
  +(h.unpaid&&typeof payUnpaid==='function'?'<button class="hrow-btn" title="'+(LANG==='fr'?'Payer':'دفع')+'" onclick="payUnpaid(\''+escHtml(upKey(h)).replace(/'/g,'&#39;')+'\')">💰</button>':'')
  +'<button class="hrow-btn edit" title="Modifier" onclick="editClient('+i+')">✏️</button>'
  +'<button class="hrow-btn print" title="Imprimer" onclick="buildRecFromHist(HIST['+i+'])">🖨️</button>'
  +'<button class="hrow-btn piece" title="Pièce" onclick="buildPieceReceiptFromHist(HIST['+i+'])">🧾</button>'
  +(CUR.isAdmin?'<button class="hrow-btn del" title="Supprimer" onclick="delEntry('+i+')">🗑️</button>':'')
  +'</div>'
  +'</div>'
  +'</div>';
}).join('');
return day;
}).join('');
setLang(LANG);
}

