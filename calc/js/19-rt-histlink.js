/* ═══ EUR assurance — 19-rt-histlink.js (RenewPro v6.4) ═══
   ربط «متابعة التجديدات» بـ «السجل»: الزبون اللي ديجا خدا التأمين (كاين فالسجل) ما كيبقاش فـ «قيد الانتظار».
   • المقارنة: البوليصة، ولا رقم الشهادة، ولا الماتريكول (بلا الأسماء).
   • شرط التاريخ: العملية فالسجل من نهار الإصدار (DATE_EMISSION) ناقص 3 أيام ولا من بعد،
     باش التجديد اللي فات بنفس البوليصة ما يتحسبش.
   1) تحميل الإكسيل: اللي لقيناه فالسجل كيبان «✅ ديجا فالسجل» وكيدخل نيشان لـ «أدّوا».
   2) ملي كتتسجل عملية (VALIDER، تعديل، مزامنة) ولا كتحل الصفحة: اللي فالانتظار ولقيناه فالسجل كيهبط لـ «أدّوا».
   ما كيمسش 16-renewals-tracker.js: غير كيلف على الدوال ديالو.
═══════════════════════════════════════════════ */
function rhPad(n){return String(n).padStart(2,'0');}
function rhKPol(s){s=String(s||'');var i=s.lastIndexOf('/');var k=(i>=0?s.slice(i+1):s).toUpperCase().replace(/[^0-9A-Z]/g,'').replace(/^0+/,'');return k.length>=5?k:'';}
function rhKAtt(s){var k=String(s||'').replace(/\.0+$/,'').toUpperCase().replace(/[^0-9A-Z]/g,'').replace(/^0+/,'');return k.length>=5?k:'';}
function rhKPlate(s){var k=String(s||'').toUpperCase().replace(/[^0-9A-Z]/g,'');return k.length>=5?k:'';}
function rhHistISO(h){var m=String(h&&h.date||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?m[3]+'-'+rhPad(m[2])+'-'+rhPad(m[1]):'';}
function rhMinus(iso,n){var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return'';var d=new Date(+m[1],+m[2]-1,+m[3]-n);return d.getFullYear()+'-'+rhPad(d.getMonth()+1)+'-'+rhPad(d.getDate());}
/* فهرس السجل: مفتاح → أحدث تاريخ */
function rhIndex(){
try{ldH();}catch(e){}
var idx={};
(HIST||[]).forEach(function(h){
var d=rhHistISO(h);if(!d)return;
['P'+rhKPol(h.police),'A'+rhKAtt(h.attest),'M'+rhKPlate(h.plate)].forEach(function(k){if(k.length>1&&(!idx[k]||idx[k]<d))idx[k]=d;});
});
return idx;
}
/* واش هاد الزبون (ديال المتابعة ولا ديال الملف) كاين فالسجل من نهار الإصدار؟ */
function rhInHist(idx,c,dateISO){
var from=rhMinus(dateISO||c.requestDate||c.dateISO,3);if(!from)return false;
var ks=['P'+rhKPol(c.police),'A'+rhKAtt(c.attest),'M'+rhKPlate(c.matricule)];
for(var i=0;i<ks.length;i++){var d=ks[i].length>1&&idx[ks[i]];if(d&&d>=from)return true;}
return false;
}
/* اللي فالانتظار ولقيناه فالسجل → «أدّوا» */
function rhSweep(){
if(window.RP_SYNCED===false)return 0;   // نتسناو القاعدة قبل ما نكتبو (ما نكتبوش فوق بيانات قديمة)
try{
ldRenewals();if(!RT_CLIENTS||!RT_CLIENTS.length)return 0;
var idx=rhIndex(),n=0,today=rtToday();
RT_CLIENTS=RT_CLIENTS.map(function(c){
if(c.status!=='active'||!rhInHist(idx,c))return c;
n++;return Object.assign({},c,{status:'done',doneDate:today,doneVia:'hist'});
});
if(n)svRenewals();
return n;
}catch(e){console.warn('rhSweep',e);return 0;}
}

function rhToast(msg){
var t=document.getElementById('rh-toast');
if(!t){t=document.createElement('div');t.id='rh-toast';t.setAttribute('style','position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:99999;background:#16a34a;color:#fff;font-weight:700;padding:9px 16px;border-radius:99px;box-shadow:0 6px 20px rgba(0,0,0,.25);font-size:.9rem;transition:opacity .3s');document.body.appendChild(t);}
t.textContent=msg;t.style.opacity='1';clearTimeout(rhToast._t);rhToast._t=setTimeout(function(){t.style.opacity='0';},3200);
}
/* ── 1) تحميل الإكسيل ── */
function rhMarkPending(){
if(!RT_PENDING||RT_PENDING._rh)return;
var idx=rhIndex();
RT_PENDING.rows.forEach(function(r){if(!r.isDup&&rhInHist(idx,r,r.dateISO)){r.inHist=true;RT_CHECKED.delete(r.id);}});
RT_PENDING._rh=true;
}
var _rhToggleType=rtToggleTypeFilter;
rtToggleTypeFilter=function(k){_rhToggleType(k);if(RT_PENDING){RT_PENDING.rows.forEach(function(r){if(r.inHist)RT_CHECKED.delete(r.id);});renderRenewalsPage();}};
var _rhToggleRow=rtToggleRow;
rtToggleRow=function(id){var r=RT_PENDING&&RT_PENDING.rows.find(function(x){return x.id===id;});if(r&&r.inHist)return;_rhToggleRow(id);};
var _rhConfirm=rtConfirmImport;
rtConfirmImport=function(){
if(!RT_PENDING)return;
var hist=RT_PENDING.rows.filter(function(r){return r.inHist&&!r.isDup&&RT_ACTIVE_TYPES.has(r.typeKey);});
if(hist.length){
ldRenewals();var today=rtToday();
RT_CLIENTS=hist.map(function(r){return{id:rtUid(),name:r.name,phone:r.phone,police:r.police,attest:r.attest||'',attestType:r.attestType||'',matricule:r.matricule||'',marque:r.marque||'',price:r.price||0,type:r.typeKey,requestDate:r.dateISO,status:'done',doneDate:today,doneVia:'hist'};}).concat(RT_CLIENTS);
svRenewals();
}
if(!RT_CHECKED.size){rtCancelImport();if(hist.length)rhToast('✅ '+hist.length+(LANG==='fr'?' déjà dans l\'historique → payés':' ديجا فالسجل → أدّوا'));return;}
_rhConfirm();
if(hist.length)rhToast('✅ '+hist.length+(LANG==='fr'?' déjà dans l\'historique → payés':' ديجا فالسجل → أدّوا'));
};
/* ── العرض: قبل الرسم كننقيو، ومن بعد كنزيدو العلامة فالمعاينة ── */
var _rhRender=renderRenewalsPage;
renderRenewalsPage=function(){
rhSweep();rhMarkPending();
_rhRender.apply(this,arguments);
if(!RT_PENDING)return;
var labels=document.querySelectorAll('#rt-import-pending .rt-imp-row');
RT_PENDING.rows.forEach(function(r,i){
var el=labels[i];if(!el||!r.inHist)return;
el.classList.add('dup');var cb=el.querySelector('input');if(cb){cb.checked=false;cb.disabled=true;}
var m=el.querySelector('.irm');if(m)m.insertAdjacentHTML('beforeend',' · <b style="color:#16a34a">✅ '+(LANG==='fr'?'déjà dans l\'historique → payés':'ديجا فالسجل → أدّوا')+'</b>');
});
var hn=RT_PENDING.rows.filter(function(r){return r.inHist;}).length,btn=document.querySelector('#rt-import-pending .valbtn');
if(hn&&btn){btn.disabled=false;btn.textContent='✅ '+(LANG==='fr'?'Importer ('+RT_CHECKED.size+') + '+hn+' payés':'استيراد ('+RT_CHECKED.size+') + '+hn+' أدّوا');}
};

/* ── 2) ملي كتتسجل عملية فالسجل ── */
var _rhSvH=svH;
svH=function(){_rhSvH.apply(this,arguments);var n=rhSweep();if(n)rhToast('✅ '+n+(LANG==='fr'?' client(s) du suivi → payés':' زبون فالمتابعة → أدّوا'));};
/* السجل كيتبدل من جهاز آخر (المزامنة): كل دقيقة (إلا ما كانش Store8 فالإطار الأب متكفل بها) */
function rhBgSweep(){try{if(window.parent&&window.parent!==window&&window.parent.Store8)return;}catch(e){}rhSweep();}
setInterval(rhBgSweep,60000);
window.addEventListener('load',function(){setTimeout(rhBgSweep,4000);});
