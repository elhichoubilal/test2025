/* ═══ EUR assurance — 08-tarif-calc.js ═══
   محرّك الحساب: Wafa و TPV والطاكسي و Autre، تاريخ النهاية، المسودة، الباقي السابق
   (مقتطع من app.js الأصلي، الأسطر 720–1030، بالترتيب نفسه) */
/* ══════════════════════════════════════════════════════════
TARIF — Wafa / TPV / Autre
══════════════════════════════════════════════════════════ */
var TARIF='wafa';
function setTarif(t){
TARIF=t;
document.getElementById('tarif').value=t;
['wafa','tpv','autre'].forEach(function(x){var b=document.getElementById('tarif-'+x);if(b)b.className='tbtn'+(x===t?' on':'');});
document.getElementById('wafa-fields').style.display=t==='wafa'?'block':'none';
document.getElementById('tpv-fields').style.display=t==='tpv'?'block':'none';
document.getElementById('autre-fields').style.display=t==='autre'?'block':'none';
document.getElementById('bm-wrap').style.display=t==='wafa'?'block':'none';
if(t==='tpv'){buildTpvDurGrid();}
if(t==='autre'){renderAutreCalcUI();}
INSTALL_SHOWN=false;
INSTALL_SELECTED=-1;
calcEnd();fillP();
}
function getOff(){
if(document.getElementById('man-tog').checked)return parseFloat(document.getElementById('man-price').value)||0;
if(TARIF==='tpv')return getOffTPV();
if(TARIF==='autre')return getOffAutre();
return getOffWafa();
}
function getOffWafa(){
var tp=document.getElementById('ins-type').value,dur=parseInt(document.getElementById('dur').value)||6;
var m=dur===1?0.09:dur===3?0.27:dur===6?0.54:1,base=0;
if(tp==='voiture'){var cv=parseInt(document.getElementById('cv').value),f=document.getElementById('fuel').value;base=f==='e'?(cv<=6?gp('e1'):cv<=8?gp('e2'):cv<=10?gp('e3'):gp('e4')):(cv<=5?gp('d1'):cv<=7?gp('d2'):gp('d3'));}
else if(tp==='moto'){var mc=document.getElementById('moto-cat').value;base=mc==='le50'?gp('m_le50'):mc==='mid'?gp('m_mid'):gp('m_ge126');}
else if(tp==='commercial'){base=gp('comm');}
else if(tp==='camion'){var tn=document.getElementById('cam-ton').value;base=tn==='t35'?gp('t35'):tn==='t12'?gp('t12'):gp('t14');}
var pb=base*m,bm=BM==='bonus'?-pb*.1:BM==='m20'?pb*.2:BM==='m30'?pb*.3:0;
return Math.round((pb+bm+gp('timbre'))*100)/100;
}
function getOffTPV(){
var tp=document.getElementById('tpv-type').value;
if(tp==='taxi'){
var td=document.getElementById('taxi-dur').value; // '3m'|'6m'|'1a'
/* السنة لها قاعدة خاصة: 10 أشهر مدفوعة (وليس 12)، و4 أشطر CNPAC */
var mult=td==='3m'?3:td==='6m'?6:10;
var units=td==='3m'?2:td==='6m'?3:4;
var cnpacUnit=gp('cnpac');
var cnpacTotal=Math.round(cnpacUnit*units*100)/100;
var dsp=document.getElementById('taxi-cnpac-disp');if(dsp)dsp.textContent=fmt(cnpacTotal)+' ('+units+'×'+fmt(cnpacUnit)+')';
var method=document.getElementById('taxi-method').value;
if(method==='2'){
/* طريقة 2: يدخل Prime HT شهري فقط، والباقي تلقائي بالكامل (Tax% + Taxe Parafiscale% + CNPAC) */
var htM2=parseFloat(document.getElementById('taxi-ht2').value)||0;
var htTotal=Math.round(htM2*mult*100)/100;
var taxRate=gp('taxi2_tax'),paraRate=gp('taxi2_para');
var taxAmt=Math.round(htTotal*taxRate/100*100)/100;
var paraAmt=Math.round(htTotal*paraRate/100*100)/100;
return Math.round((htTotal+taxAmt+paraAmt+cnpacTotal)*100)/100;
}
/* طريقة 1 (الافتراضية): Prime HT و Tax يُدخلان يدوياً كليهما */
var htM=parseFloat(document.getElementById('taxi-ht').value)||0;
var taxM=parseFloat(document.getElementById('taxi-tax').value)||0;
var ht=htM*mult,tax=taxM*mult;
return Math.round((ht+tax+cnpacTotal)*100)/100;
}
var dur=document.getElementById('tpv-dur').value;
return gp('tpv_'+tp+'_'+dur)||0;
}
function getOffAutre(){
var list=ldAutre();
var cat=list.filter(function(c){return c.id===document.getElementById('autre-cat').value;})[0];
if(!cat)return 0;
var d=cat.durations.filter(function(x){return x.id===document.getElementById('autre-dur').value;})[0];
return d?(parseFloat(d.price)||0):0;
}
function getDesc(){
if(TARIF==='tpv')return getDescTPV();
if(TARIF==='autre')return getDescAutre();
return getDescWafa();
}
function getDescWafa(){
var tp=document.getElementById('ins-type').value,dur=document.getElementById('dur').value;
var bm=BM==='bonus'?' [B-10%]':BM==='m20'?' [M+20%]':BM==='m30'?' [M+30%]':'';
var dm={'1':'1M','3':'3M','6':'6M','12':'1an'};
var motoLbl={le50:'≤50CC',mid:'51-125CC',ge126:'126+CC'};
if(tp==='voiture')return document.getElementById('cv').value+'CV '+(document.getElementById('fuel').value==='e'?'Ess':'Die')+' '+dm[dur]+bm;
if(tp==='moto')return'Moto '+motoLbl[document.getElementById('moto-cat').value]+' '+dm[dur]+bm;
if(tp==='commercial')return'Comm '+document.getElementById('comm-cv').value+'CV '+dm[dur]+bm;
return'Camion '+(document.getElementById('cam-ton').value==='t35'?'-3.5T':document.getElementById('cam-ton').value==='t12'?'12T':'14T')+' '+dm[dur]+bm;
}
function getDescTPV(){
var tp=document.getElementById('tpv-type').value;
var labels={camion:'Camion TPV',remorque:'Camion+remorque TPV',tourisme:'Tourisme TPV',taxi:'Taxi TPV'};
if(tp==='taxi'){
var dl={'3m':'3mois','6m':'6mois','1a':'1an'}[document.getElementById('taxi-dur').value]||'';
return labels.taxi+' '+dl;
}
var dl2={'5j':'5j','10j':'10j','1m':'1mois','3m':'3mois','6m':'6mois','1a':'1an'}[document.getElementById('tpv-dur').value]||'';
return labels[tp]+' '+dl2;
}
function getDescAutre(){
var list=ldAutre();
var cat=list.filter(function(c){return c.id===document.getElementById('autre-cat').value;})[0];
var d=cat&&cat.durations.filter(function(x){return x.id===document.getElementById('autre-dur').value;})[0];
return(cat?cat.name:'Autre')+(d?' '+d.label:'');
}

/* ── TPV: أنواع ومدد ── */
function setTpvType(tp){
document.getElementById('tpv-type').value=tp;
['camion','remorque','tourisme','taxi'].forEach(function(x){document.getElementById('tpvt-'+x).className='tbtn type'+(x===tp?' on':'');});
document.getElementById('taxi-fields').style.display=tp==='taxi'?'block':'none';
document.getElementById('tpv-dur-wrap').style.display=tp==='taxi'?'none':'block';
if(tp!=='taxi')buildTpvDurGrid();
calcEnd();fillP();
}
function buildTpvDurGrid(){
var tp=document.getElementById('tpv-type').value;
var opts=tp==='tourisme'?[['5j','5j'],['10j','10j'],['1m','1 mois'],['3m','3 mois'],['6m','6 mois'],['1a','1 an']]:[['5j','5j'],['10j','10j'],['3m','3 mois'],['6m','6 mois'],['1a','1 an']];
var g=document.getElementById('tpv-dur-grid');
g.innerHTML=opts.map(function(o,i){return'<button type="button" class="tbtn'+(i===0?' on':'')+'" data-v="'+o[0]+'" onclick="setTpvDur(\''+o[0]+'\')">'+o[1]+'</button>';}).join('');
document.getElementById('tpv-dur').value=opts[0][0];
}
function setTpvDur(v){
document.getElementById('tpv-dur').value=v;
document.querySelectorAll('#tpv-dur-grid .tbtn').forEach(function(b){b.className='tbtn'+(b.dataset.v===v?' on':'');});
calcEnd();fillP();
}
function setTaxiDur(v){
document.getElementById('taxi-dur').value=v;
['3m','6m','1a'].forEach(function(x){document.getElementById('taxid-'+x).className='tbtn'+(x===v?' on':'');});
calcEnd();fillP();
}
function setTaxiMethod(v){
document.getElementById('taxi-method').value=v;
document.getElementById('taxim-1').className='tbtn'+(v===1?' on':'');
document.getElementById('taxim-2').className='tbtn'+(v===2?' on':'');
document.getElementById('taxi-method1').style.display=(v===1)?'block':'none';
document.getElementById('taxi-method2').style.display=(v===2)?'block':'none';
fillP();
}

/* ── Autre: فئات ومدد قابلة للتعديل بالكامل ── */
var AUTRE_DEFAULT=[{id:'cat_ex',name:'فئة تجريبية',durations:[{id:'dur_ex',label:'شهر',price:0,days:30}]}];
function ldAutre(){
try{
var v=JSON.parse(localStorage.getItem('eurv102_autre')||'null');
return(v&&v.length)?v:JSON.parse(JSON.stringify(AUTRE_DEFAULT));
}catch(e){return JSON.parse(JSON.stringify(AUTRE_DEFAULT));}
}
function svAutre(list){localStorage.setItem('eurv102_autre',JSON.stringify(list));if(window.fbSet)window.fbSet('autreTarifs',list);}
function renderAutreCalcUI(){
var list=ldAutre();
var cg=document.getElementById('autre-cat-grid');
var emptyMsg=document.getElementById('autre-empty-msg');
if(!list.length){cg.innerHTML='';document.getElementById('autre-dur-grid').innerHTML='';emptyMsg.style.display='block';return;}
emptyMsg.style.display='none';
cg.innerHTML=list.map(function(c,i){return'<button type="button" class="tbtn'+(i===0?' on':'')+'" data-id="'+c.id+'" onclick="setAutreCat(\''+c.id+'\')">'+c.name+'</button>';}).join('');
setAutreCat(list[0].id);
}
function setAutreCat(id){
document.getElementById('autre-cat').value=id;
document.querySelectorAll('#autre-cat-grid .tbtn').forEach(function(b){b.className='tbtn'+(b.dataset.id===id?' on':'');});
var list=ldAutre();var cat=list.filter(function(c){return c.id===id;})[0];
var dg=document.getElementById('autre-dur-grid');
if(!cat||!cat.durations.length){dg.innerHTML='';document.getElementById('autre-dur').value='';fillP();return;}
dg.innerHTML=cat.durations.map(function(d,i){return'<button type="button" class="tbtn'+(i===0?' on':'')+'" data-id="'+d.id+'" onclick="setAutreDur(\''+d.id+'\')">'+d.label+'</button>';}).join('');
document.getElementById('autre-dur').value=cat.durations[0].id;
calcEnd();fillP();
}
function setAutreDur(id){
document.getElementById('autre-dur').value=id;
document.querySelectorAll('#autre-dur-grid .tbtn').forEach(function(b){b.className='tbtn'+(b.dataset.id===id?' on':'');});
calcEnd();fillP();
}
/* إدارة Autre من صفحة إعداد الأسعار */
function renderAutreAdmin(){
var list=ldAutre();
var el=document.getElementById('autre-admin-list');
if(!el)return;
el.innerHTML=list.map(function(c,ci){
var durs=c.durations.map(function(d,di){
return'<div style="display:flex;gap:6px;margin-bottom:5px;align-items:center">'+
'<input type="text" value="'+String(d.label).replace(/"/g,'&quot;')+'" placeholder="'+(LANG==='fr'?'Durée':'المدة')+'" oninput="autreRenameDur('+ci+','+di+',this.value)" style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:.78rem">'+
'<input type="number" value="'+d.price+'" placeholder="DH" oninput="autreSetPrice('+ci+','+di+',this.value)" style="width:85px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:.78rem;font-family:\'JetBrains Mono\',monospace">'+
'<input type="number" value="'+(d.days||'')+'" placeholder="'+(LANG==='fr'?'jours':'أيام')+'" title="'+(LANG==='fr'?'Jours (calcul date fin) — optionnel':'عدد الأيام (لحساب تاريخ الانتهاء) — اختياري')+'" oninput="autreSetDays('+ci+','+di+',this.value)" style="width:66px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:.78rem">'+
'<button type="button" onclick="autreDelDur('+ci+','+di+')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.9rem">✕</button>'+
'</div>';
}).join('');
return'<div style="border:1px solid var(--border);border-radius:11px;padding:12px;margin-bottom:11px;background:var(--bg3)">'+
'<div style="display:flex;gap:8px;margin-bottom:9px;align-items:center">'+
'<input type="text" value="'+String(c.name).replace(/"/g,'&quot;')+'" oninput="autreRenameCat('+ci+',this.value)" style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-weight:700;font-size:.84rem">'+
'<button type="button" onclick="autreDelCat('+ci+')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:1rem">🗑️</button>'+
'</div>'+
durs+
'<button type="button" onclick="autreAddDur('+ci+')" style="margin-top:5px;font-size:.72rem;padding:6px 12px;background:var(--gold-bg);border:1px solid rgba(30,58,95,.2);border-radius:7px;color:var(--gold-d);cursor:pointer;font-weight:700">➕ '+(LANG==='fr'?'Ajouter une durée':'إضافة مدة')+'</button>'+
'</div>';
}).join('')||'<div style="text-align:center;color:var(--text3);font-size:.8rem;padding:16px">'+(LANG==='fr'?'Aucune catégorie':'لا توجد فئات بعد')+'</div>';
}
function autreAddCat(){var list=ldAutre();list.push({id:'c'+Date.now(),name:LANG==='fr'?'Nouvelle catégorie':'فئة جديدة',durations:[]});svAutre(list);renderAutreAdmin();}
function autreDelCat(ci){if(!confirm(LANG==='fr'?'Supprimer cette catégorie ?':'حذف هذه الفئة؟'))return;var list=ldAutre();list.splice(ci,1);svAutre(list);renderAutreAdmin();}
function autreRenameCat(ci,val){var list=ldAutre();list[ci].name=val;svAutre(list);}
function autreAddDur(ci){var list=ldAutre();list[ci].durations.push({id:'d'+Date.now(),label:LANG==='fr'?'Nouvelle durée':'مدة جديدة',price:0,days:''});svAutre(list);renderAutreAdmin();}
function autreDelDur(ci,di){var list=ldAutre();list[ci].durations.splice(di,1);svAutre(list);renderAutreAdmin();}
function autreRenameDur(ci,di,val){var list=ldAutre();list[ci].durations[di].label=val;svAutre(list);}
function autreSetPrice(ci,di,val){var list=ldAutre();list[ci].durations[di].price=parseFloat(val)||0;svAutre(list);}
function autreSetDays(ci,di,val){var list=ldAutre();list[ci].durations[di].days=val;svAutre(list);}

function getCompareOff(){
/* إذا تم اختيار قسط معيّن، المقارنة (مدفوع مقابل مستحق) تكون مع قيمة هذا القسط تحديداً، مو السعر الكلي */
if(TARIF==='wafa'&&INSTALL_SELECTED>=0&&INSTALL_AMOUNTS[INSTALL_SELECTED]!=null)return INSTALL_AMOUNTS[INSTALL_SELECTED];
return getOff();
}
function getEffOff(){return Math.round((getCompareOff()-PREV_BAL)*100)/100;}
function fillP(){
if(document.getElementById('man-tog').checked){document.getElementById('install-box').style.display='none';document.getElementById('install-tog-wrap').style.display='none';document.getElementById('pbox-install').style.display='none';return;}
var p=getOff();
document.getElementById('pv').textContent=p>0?fmt(p)+' DH':'—';
document.getElementById('m-off').textContent=p>0?fmt(p):'—';
document.getElementById('m-off').className='sc-val'+(p>0?' a':'');
var pEl=document.getElementById('paid');if(pEl&&parseFloat(pEl.value))doCalc(true);
renderInstallments();
}

function togglePwdVis(inputId, btn){
  var el=document.getElementById(inputId);
  if(!el)return;
  var show=el.type==='password';
  el.type=show?'text':'password';
  if(btn)btn.textContent=show?'👁️':'🔒';
}
function togMan(){var m=document.getElementById('man-tog').checked;document.getElementById('man-field').style.display=m?'block':'none';if(!m){document.getElementById('man-price').value='';fillP();}}
function updMan(){var v=parseFloat(document.getElementById('man-price').value)||0;document.getElementById('pv').textContent=v>0?fmt(v)+' DH':'—';document.getElementById('m-off').textContent=v>0?fmt(v):'—';var pEl=document.getElementById('paid');if(pEl&&parseFloat(pEl.value))doCalc(true);}
function calcEnd(){
var s=document.getElementById('date-s').value;if(!s)return;
var d=new Date(s);
if(TARIF==='wafa'){
var dur=parseInt(document.getElementById('dur').value)||6;
d.setMonth(d.getMonth()+dur);d.setDate(d.getDate()-1);
}else if(TARIF==='tpv'){
var tp=document.getElementById('tpv-type').value;
if(tp==='taxi'){
var td=document.getElementById('taxi-dur').value;
var months=td==='3m'?3:td==='6m'?6:12;
d.setMonth(d.getMonth()+months);d.setDate(d.getDate()-1);
}else{
var dd=document.getElementById('tpv-dur').value;
if(dd==='5j')d.setDate(d.getDate()+5-1);
else if(dd==='10j')d.setDate(d.getDate()+10-1);
else if(dd==='1m'){d.setMonth(d.getMonth()+1);d.setDate(d.getDate()-1);}
else if(dd==='3m'){d.setMonth(d.getMonth()+3);d.setDate(d.getDate()-1);}
else if(dd==='6m'){d.setMonth(d.getMonth()+6);d.setDate(d.getDate()-1);}
else if(dd==='1a'){d.setFullYear(d.getFullYear()+1);d.setDate(d.getDate()-1);}
}
}else if(TARIF==='autre'){
var list=ldAutre();
var cat=list.filter(function(c){return c.id===document.getElementById('autre-cat').value;})[0];
var dur2=cat&&cat.durations.filter(function(x){return x.id===document.getElementById('autre-dur').value;})[0];
if(dur2&&dur2.days){d.setDate(d.getDate()+parseInt(dur2.days)-1);}
else{document.getElementById('date-e').value='';return;}
}
document.getElementById('date-e').value=d.toISOString().split('T')[0];
}
function autoCalc(){
var p=parseFloat(document.getElementById('paid').value)||0;
document.getElementById('m-paid').textContent=p>0?fmt(p):'—';
document.getElementById('m-paid').className='sc-val'+(p>0?' g':'');
if(p>0&&getOff())doCalc(true);
saveDraft();
}
function doCalc(silent){
var paid=parseFloat(document.getElementById('paid').value)||0,off=getCompareOff();
if(!paid||!off)return;
var eff=getEffOff();var diff=paid-eff;
LAST={paid:paid,off:off,diff:diff};
document.getElementById('m-paid').textContent=fmt(paid);document.getElementById('m-paid').className='sc-val g';
document.getElementById('m-diff').textContent=fmt(diff);document.getElementById('m-diff').className='sc-val'+(diff>0?' g':diff<0?' r':'');
var wb=document.getElementById('warn-box');
if(paid<off*0.5&&off>0){wb.style.display='block';var refLbl=(TARIF==='wafa'&&INSTALL_SELECTED>=0)?(LANG==='fr'?'du versement sélectionné':'من القسط المحدد'):(LANG==='fr'?'du prix officiel':'من السعر الرسمي');document.getElementById('warn-txt').textContent=(LANG==='fr'?'Montant inférieur à 50% ':'المبلغ أقل من 50% ')+refLbl+' ('+fmt(off)+' DH)';}else wb.style.display='none';
var rb=document.getElementById('resbox'),rv=document.getElementById('rt-v'),rl=document.getElementById('rt-l');
rv.textContent=fmt(Math.abs(diff));
if(diff>0){rb.className='resbox show';rv.className='rt-v';rl.textContent='↩️ '+(LANG==='fr'?'À rembourser':'المبلغ المُرجَع للزبون');}
else if(diff<0){rb.className='resbox neg show';rv.className='rt-v neg';rl.textContent='⚠️ '+(LANG==='fr'?'Solde restant dû':'الزبون لا يزال مديناً');}
else{rb.className='resbox zero show';rv.className='rt-v';rv.textContent='0.00';rl.textContent='✅ '+(LANG==='fr'?'Compte soldé':'الحساب مطابق');}
document.getElementById('action-area').style.display='block';
document.getElementById('val-btn').style.display='block';
document.getElementById('valok').style.display='none';
}

function saveDraft(){
var d={client:document.getElementById('client').value,plate:document.getElementById('plate').value,paid:document.getElementById('paid').value,type:document.getElementById('ins-type').value,dur:DUR,bm:BM,pm:PAY_MODE,ds:document.getElementById('date-s').value,ts:Date.now()};
localStorage.setItem('eurv102_draft_'+CUR.n,JSON.stringify(d));
}
function checkDraft(){var d=JSON.parse(localStorage.getItem('eurv102_draft_'+CUR.n)||'null');document.getElementById('draft-banner').classList.toggle('show',!!(d&&d.client&&(Date.now()-d.ts)<3600000));}
function restoreDraft(){
var d=JSON.parse(localStorage.getItem('eurv102_draft_'+CUR.n)||'null');if(!d)return;
document.getElementById('client').value=d.client||'';document.getElementById('plate').value=d.plate||'';document.getElementById('paid').value=d.paid||'';
if(d.type)setType(d.type);if(d.dur)setDur(d.dur);if(d.bm)setBM(d.bm);if(d.pm)setPayMode(d.pm);
if(d.ds){document.getElementById('date-s').value=d.ds;calcEnd();}
document.getElementById('draft-banner').classList.remove('show');
if(d.paid)doCalc(true);
}
function clearDraft(){localStorage.removeItem('eurv102_draft_'+CUR.n);}

function togPrev(){var show=document.getElementById('prev-tog').checked;document.getElementById('prev-box').style.display=show?'block':'none';if(!show){PREV_BAL=0;document.getElementById('prev-off').value='';document.getElementById('prev-paid').value='';document.getElementById('prev-bal-val').textContent='—';}autoCalc();}
function calcPrev(){
var po=parseFloat(document.getElementById('prev-off').value)||0,pp=parseFloat(document.getElementById('prev-paid').value)||0;
if(!po||!pp){PREV_BAL=0;document.getElementById('prev-bal-val').textContent='—';autoCalc();return;}
var d=pp-po;PREV_BAL=d;
var el=document.getElementById('prev-bal-val');
if(d>0){el.textContent='+'+fmt(d)+' DH ('+(LANG==='fr'?'crédit':'رصيد')+')';el.className='val credit';}
else if(d<0){el.textContent=fmt(d)+' DH ('+(LANG==='fr'?'débit':'مديون')+')';el.className='val debit';}
else{el.textContent='0.00';el.className='val zero';}
autoCalc();
}

