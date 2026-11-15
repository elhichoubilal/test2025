/* ═══ EUR assurance — 05-utils-prices-numbering.js ═══
   أدوات التنسيق والتعقيم، الأسعار، معلومات الوكالة، ترقيم العمليات ووصل القبض، اختيارات نموذج الحساب
   (مقتطع من app.js الأصلي، الأسطر 429–537، بالترتيب نفسه) */
function fmt(n){return Math.abs(n).toLocaleString('fr-MA',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtS(n){return Math.abs(n)>=1000?(Math.abs(n)/1000).toFixed(1)+'K':fmt(n);}
function fmtD(v){if(!v)return'—';var p=v.split('-');return p[2]+'/'+p[1]+'/'+p[0];}
function escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

var DEF={e1:2227.18,e2:2710.74,e3:2940.13,e4:4224.38,d1:2710.74,d2:2940,d3:4224.38,m_le50:1473,m_mid:2000,m_ge126:2683,comm:5024,t35:3950,t12:7000,t14:8000,timbre:17,
tpv_camion_5j:400,tpv_camion_10j:700,tpv_camion_3m:0,tpv_camion_6m:0,tpv_camion_1a:0,
tpv_remorque_5j:500,tpv_remorque_10j:850,tpv_remorque_3m:0,tpv_remorque_6m:0,tpv_remorque_1a:0,
tpv_tourisme_5j:150,tpv_tourisme_10j:250,tpv_tourisme_1m:450,tpv_tourisme_3m:1100,tpv_tourisme_6m:0,tpv_tourisme_1a:0,
cnpac:17,instfee:17,taxi2_tax:15,taxi2_para:1.5};
function gp(k){var s=localStorage.getItem('eurv102_p_'+k);return parseFloat(s!==null?s:DEF[k])||0;}
function collectPrices(){var o={};Object.keys(DEF).forEach(function(k){o[k]=gp(k);});return o;}
function applyPrices(obj){
if(!obj)return;
Object.keys(obj).forEach(function(k){localStorage.setItem('eurv102_p_'+k,obj[k]);});
ldPUI();fillP();
}
function saveP(k,v){localStorage.setItem('eurv102_p_'+k,v);fillP();if(window.fbSet)window.fbSet('prices',collectPrices());}
function saveAllP(){
Object.keys(DEF).forEach(function(k){var el=document.getElementById('p'+k);if(el)localStorage.setItem('eurv102_p_'+k,el.value);});
var ok=document.getElementById('save-ok');ok.style.display='block';fillP();
if(window.fbSet)window.fbSet('prices',collectPrices());
setTimeout(function(){ok.style.display='none';},2500);
}
function ldPUI(){Object.keys(DEF).forEach(function(k){var s=localStorage.getItem('eurv102_p_'+k);var el=document.getElementById('p'+k);if(s!==null&&el)el.value=s;});}
function saveCI(){
var ci={
name:document.getElementById('ci-name').value,
phone:document.getElementById('ci-phone').value,
addr:document.getElementById('ci-addr').value,
addr2:(document.getElementById('ci-addr2')||{value:''}).value,
city:(document.getElementById('ci-city')||{value:''}).value,
ice:(document.getElementById('ci-ice')||{value:''}).value,
piecestart:(document.getElementById('ci-piecestart')||{value:''}).value
};
localStorage.setItem('eurv102_ci',JSON.stringify(ci));
if(window.fbSet)window.fbSet('agencyInfo',ci);
}
function ldCI(){var d=JSON.parse(localStorage.getItem('eurv102_ci')||'{}');['name','phone','addr','addr2','city','ice','piecestart'].forEach(function(k){var el=document.getElementById('ci-'+k);if(el&&d[k])el.value=d[k];});}


function nextN(){var n=parseInt(localStorage.getItem('eurv102_rec')||'999')+1;localStorage.setItem('eurv102_rec',n);return'EUR-'+new Date().getFullYear()+'-'+String(n).padStart(4,'0');}
function curN(){var n=parseInt(localStorage.getItem('eurv102_rec')||'999')+1;return'EUR-'+new Date().getFullYear()+'-'+String(n).padStart(4,'0');}

/* ── N° PIÈCE DE RECETTE (compteur séquentiel indépendant, format 7 chiffres) ── */
function pieceStartVal(){
var ci=JSON.parse(localStorage.getItem('eurv102_ci')||'{}');
var v=parseInt(ci.piecestart);
return isNaN(v)?59766:v;
}
function curPieceNum(){
var n=localStorage.getItem('eurv102_piece');
var v=n!=null?parseInt(n):pieceStartVal();
return String(v+1).padStart(7,'0');
}
function nextPieceNum(){
var n=localStorage.getItem('eurv102_piece');
var v=(n!=null?parseInt(n):pieceStartVal())+1;
localStorage.setItem('eurv102_piece',v);
return String(v).padStart(7,'0');
}

// ── رقم الوصل: تلقائي (كالمعتاد) أو يدوي (يُدخله المستخدم في كل مرة) ──
function setPieceNumMode(m){
localStorage.setItem('eurv102_piece_mode',m);
document.getElementById('pnm-auto').classList.toggle('on',m==='auto');
document.getElementById('pnm-manual').classList.toggle('on',m==='manual');
document.getElementById('piece-num-manual-box').style.display=m==='manual'?'block':'none';
}
function getPieceNum(){
var mode=localStorage.getItem('eurv102_piece_mode')||'auto';
if(mode==='manual'){
var v=(document.getElementById('piece-num-manual').value||'').trim();
if(!v){alert(LANG==='fr'?'Entrez le numéro de la pièce':'أدخل رقم الوصل');document.getElementById('piece-num-manual').focus();return null;}
return v;
}
return nextPieceNum();
}

function updateQuickStats(){
ldH();
var today=new Date().toLocaleDateString('fr-FR');
var myH=CUR.isAdmin?HIST:HIST.filter(function(h){return h.user===CUR.n;});
document.getElementById('qs-total').textContent=myH.length;
var todayRef=myH.filter(function(h){return h.date===today&&h.diff>0;}).reduce(function(s,h){return s+h.diff;},0);
document.getElementById('qs-ref').textContent=todayRef>0?fmtS(todayRef)+' DH':'0';
}

function buildCVGrid(cid,inp,vals,def){
var c=document.getElementById(cid);if(!c)return;
c.innerHTML=vals.map(function(v){return'<button type="button" class="tbtn sm'+(v==def?' on':'')+'" id="cv-btn-'+cid+'-'+v+'" data-v="'+v+'">'+(v=='?'?'?':v)+'</button>';}).join('');
c.querySelectorAll('.tbtn').forEach(function(btn){btn.onclick=function(){setCVVal(cid,inp,parseInt(this.dataset.v),vals);};});
document.getElementById(inp).value=def;
}
function setCVVal(cid,inp,v,vals){
vals.forEach(function(x){var b=document.getElementById('cv-btn-'+cid+'-'+x);if(b)b.className='tbtn sm'+(x==v?' on':'');});
document.getElementById(inp).value=v;fillP();
}

function setType(t){
document.getElementById('ins-type').value=t;
['voiture','moto','commercial','camion'].forEach(function(x){document.getElementById('tp-'+x).className='tbtn type'+(x===t?' on':'');document.getElementById('f-'+x).style.display=x===t?'block':'none';});
fillP();
}
function setFuel(f){document.getElementById('fuel').value=f;document.getElementById('fu-e').className='tbtn'+(f==='e'?' on':'');document.getElementById('fu-d').className='tbtn'+(f==='d'?' on':'');fillP();}
function setMotoCat(v){document.getElementById('moto-cat').value=v;['le50','mid','ge126'].forEach(function(x){document.getElementById('mc-'+x).className='tbtn'+(v===x?' on':'');});fillP();}
function setCamTon(v){document.getElementById('cam-ton').value=v;['t35','t12','t14'].forEach(function(x){document.getElementById('ct-'+x).className='tbtn'+(x===v?' on':'');});fillP();}
function setDur(v){DUR=v;document.getElementById('dur').value=v;[1,3,6,12].forEach(function(d){document.getElementById('dur-'+d).className='tbtn'+(d===v?' on':'');});INSTALL_SHOWN=false;INSTALL_SELECTED=-1;fillP();calcEnd();}

