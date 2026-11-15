/* ═══ EUR assurance — 06-installments.js ═══
   جدول التقسيط (Wafa)
   (مقتطع من app.js الأصلي، الأسطر 538–604، بالترتيب نفسه) */
/* ══════════════════════════════════════════════════════════
جدول التقسيط — Wafa فقط، للمدد 3/6/12 (ليس للشهر الواحد). زر اختياري يتحكم بإظهاره.
القاعدة العامة الموحّدة: كل الأقساط متساوية = 100÷العدد (مقرّب لأسفل)، والقسط الأخير يأخذ الباقي
حتى يكتمل المجموع 100% بالضبط (هذا وحده يعطي تلقائياً: 50/50 لقسطين، 33/33/34 لثلاثة، 25/25/25/25 لأربعة)
CNPAC = 17 DH (رسم قابل للتعديل) × عدد الأقساط (ورقة CNPAC لكل قسط على حدة)
══════════════════════════════════════════════════════════ */
var INSTALL_COUNTS={3:2,6:3,12:4};
var INSTALL_SHOWN=false;
var INSTALL_AMOUNTS=[];
var INSTALL_SELECTED=-1;
function selectInstallment(i){
/* اختيار القسط يحدد فقط "الهدف المقارن" — لا يلمس حقل المبلغ المدفوع إطلاقاً.
المبلغ المدفوع يبقى دايماً ما كتبه الموظف يدوياً (كم فعلياً سلّم الزبون). */
INSTALL_SELECTED=(INSTALL_SELECTED===i)?-1:i; // ضغط ثاني على نفس القسط يلغي التحديد
renderInstallments();
autoCalc();
}
function equalSplitPcts(count){
var base=Math.floor(100/count);
var pcts=[];
for(var i=0;i<count-1;i++)pcts.push(base);
pcts.push(100-base*(count-1)); // القسط الأخير = الباقي
return pcts;
}
function toggleInstallView(){
INSTALL_SHOWN=!INSTALL_SHOWN;
renderInstallments();
}
function renderInstallments(){
var togWrap=document.getElementById('install-tog-wrap');
var box=document.getElementById('install-box');
var pvInst=document.getElementById('pbox-install');
if(TARIF!=='wafa'){togWrap.style.display='none';box.style.display='none';pvInst.style.display='none';return;}
var dur=parseInt(document.getElementById('dur').value)||0;
var count=INSTALL_COUNTS[dur];
if(!count){togWrap.style.display='none';box.style.display='none';pvInst.style.display='none';INSTALL_SHOWN=false;return;}
togWrap.style.display='block';
var btn=document.getElementById('install-tog-btn');
if(btn)btn.innerHTML=INSTALL_SHOWN?('✕ <span data-ar>إخفاء التقسيط</span><span data-fr>Masquer</span>'):('📅 <span data-ar>الزبون يريد التقسيط؟</span><span data-fr>Le client veut échelonner ?</span>');
if(!INSTALL_SHOWN){box.style.display='none';pvInst.style.display='none';return;}
var off=getOff();
if(!off){box.style.display='none';pvInst.style.display='none';return;}
var pcts=equalSplitPcts(count);
var fee=gp('instfee');
var feeTotal=Math.round(fee*(count-1)*100)/100;
var total=Math.round((off+feeTotal)*100)/100;
INSTALL_AMOUNTS=pcts.map(function(pct){return Math.round(total*pct/100*100)/100;});
var rows=pcts.map(function(pct,i){
var amt=INSTALL_AMOUNTS[i];
var sel=(INSTALL_SELECTED===i);
return'<button type="button" onclick="selectInstallment('+i+')" style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:6px 8px;margin-bottom:3px;border-radius:7px;cursor:pointer;font-family:inherit;text-align:start;border:1.5px solid '+(sel?'var(--blue)':'transparent')+';background:'+(sel?'rgba(37,99,235,.15)':'transparent')+'">'+
'<span>'+(sel?'✅ ':'')+(LANG==='fr'?'Versement '+(i+1):'القسط '+(i+1))+' ('+pct+'%)</span>'+
'<b style="font-family:\'JetBrains Mono\',monospace">'+fmt(amt)+' DH</b>'+
'</button>';
}).join('');
document.getElementById('install-rows').innerHTML=rows;
document.getElementById('install-fee-total').textContent=fmt(feeTotal)+' ('+(count-1)+'×'+fmt(fee)+')';
document.getElementById('install-total').textContent=fmt(total);
box.style.display='block';
/* صندوق "القسط المحدد" جنب السعر الرسمي — يظهر بس لو فيه قسط مختار فعلياً */
if(INSTALL_SELECTED>=0&&INSTALL_AMOUNTS[INSTALL_SELECTED]!=null){
document.getElementById('pv-install').textContent=fmt(INSTALL_AMOUNTS[INSTALL_SELECTED])+' DH';
pvInst.style.display='flex';
}else{
pvInst.style.display='none';
}
}
