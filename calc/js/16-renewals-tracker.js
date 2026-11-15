/* ═══ EUR assurance — 16-renewals-tracker.js ═══
   متابعة التجديدات: الاستيراد من Excel، عدّاد الأيام، التنبيهات
   (مقتطع من app.js الأصلي، الأسطر 2107–2557، بالترتيب نفسه) */
/* ══════════════════════════════════════════════════════════
RENEWALS TRACKER — متابعة التجديدات (مستقلة، لا تتداخل مع showRenewals القديمة)
══════════════════════════════════════════════════════════ */
var RT_CLIENTS=null;
var RT_PENDING=null;       // {fileName, rows:[{id,police,name,phone,typeKey,dateISO,isDup}]}
var RT_CHECKED=new Set();
var RT_ACTIVE_TYPES=new Set(['renew','prorog','new']);
var RT_URGENT_DAY=8, RT_ALERT_DAY=2;
var RT_NATURE_MAP={"Renouvellement":"renew","Prorogation":"prorog","Affaire nouvelle":"new","Résiliation":"cancel","Changement de véhicule":"change","Changement de vehicule":"change"};
var RT_TYPE_LABELS={renew:{ar:'تجديد',fr:'Renouvellement'},prorog:{ar:'تمديد',fr:'Prorogation'},new:{ar:'عقد جديد',fr:'Affaire nouvelle'},cancel:{ar:'إلغاء',fr:'Résiliation'},change:{ar:'تغيير مركبة',fr:'Changement de véhicule'}};

function rtUid(){return'rt'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function rtToday(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function rtDaysBetween(iso){
var s=new Date(iso+'T00:00:00'),n=new Date();
var s2=new Date(s.getFullYear(),s.getMonth(),s.getDate());
var n2=new Date(n.getFullYear(),n.getMonth(),n.getDate());
return Math.round((n2-s2)/86400000);
}
function rtLevelOf(days){if(days>=RT_URGENT_DAY)return'urgent';if(days>=RT_ALERT_DAY)return'warn';return'ok';}
function rtTypeLabel(k){var l=RT_TYPE_LABELS[k];return l?(LANG==='fr'?l.fr:l.ar):k;}
function rtParseFrDate(s){
if(!s)return null;
var str=String(s).trim();
var m=str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
if(m){return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');}
if(!isNaN(str)&&str!==''){
var n=Number(str);
var epoch=new Date(Date.UTC(1899,11,30));
var d=new Date(epoch.getTime()+n*86400000);
return d.toISOString().slice(0,10);
}
return null;
}
function rtFindCol(row,name){
if(row[name]!==undefined)return row[name];
var target=name.trim().toLowerCase();
for(var k in row){if(k.trim().toLowerCase()===target)return row[k];}
return'';
}

function ldRenewals(){try{RT_CLIENTS=JSON.parse(localStorage.getItem('eurv102_renewals')||'[]');}catch(e){RT_CLIENTS=[];}}
function svRenewals(){localStorage.setItem('eurv102_renewals',JSON.stringify(RT_CLIENTS));if(window.fbSet)window.fbSet('renewals',RT_CLIENTS);}

function addRenewalClient(){
var name=(document.getElementById('rt-f-name').value||'').trim();
if(!name){alert(LANG==='fr'?'Le nom est requis':'الاسم مطلوب');document.getElementById('rt-f-name').focus();return;}
ldRenewals();
var attestVal=(document.getElementById('rt-f-attest').value||'').trim();
var attestTypeVal=document.getElementById('rt-f-attest-type').value||'def';
RT_CLIENTS.unshift({
id:rtUid(),name:name,
phone:(document.getElementById('rt-f-phone').value||'').trim(),
police:(document.getElementById('rt-f-police').value||'').trim(),
attest:attestVal,attestType:attestTypeVal,
matricule:(document.getElementById('rt-f-matricule').value||'').trim(),
marque:(document.getElementById('rt-f-marque').value||'').trim(),
price:parseFloat(document.getElementById('rt-f-price').value)||0,
type:document.getElementById('rt-f-type').value,
requestDate:((document.getElementById('rt-f-date')||{}).value||rtToday()),status:'active',doneDate:null
});
svRenewals();
['rt-f-name','rt-f-phone','rt-f-police','rt-f-attest','rt-f-price','rt-f-matricule','rt-f-marque','rt-f-date'].forEach(function(id){document.getElementById(id).value='';});
renderRenewalsPage();
}

function editRenewalClient(id){
ldRenewals();
var c=RT_CLIENTS.find(function(x){return x.id===id;});
if(!c)return;
document.getElementById('rt-edit-id').value=id;
document.getElementById('rt-edit-name').value=c.name||'';
document.getElementById('rt-edit-phone').value=c.phone||'';
document.getElementById('rt-edit-police').value=c.police||'';
document.getElementById('rt-edit-attest').value=c.attest||'';
document.getElementById('rt-edit-attest-type').value=c.attestType||'def';
document.getElementById('rt-edit-matricule').value=c.matricule||'';
document.getElementById('rt-edit-marque').value=c.marque||'';
document.getElementById('rt-edit-price').value=c.price||'';
document.getElementById('rt-edit-type').value=c.type||'renew';
var _ed=document.getElementById('rt-edit-date');if(_ed)_ed.value=c.requestDate||'';
document.getElementById('rt-edit-modal').style.display='flex';
}
function saveRenewalEdit(){
var id=document.getElementById('rt-edit-id').value;
var name=(document.getElementById('rt-edit-name').value||'').trim();
if(!name){alert(LANG==='fr'?'Le nom est requis':'الاسم مطلوب');return;}
ldRenewals();
RT_CLIENTS=RT_CLIENTS.map(function(c){
if(c.id!==id)return c;
return Object.assign({},c,{
name:name,
requestDate:((document.getElementById('rt-edit-date')||{}).value||c.requestDate),
phone:(document.getElementById('rt-edit-phone').value||'').trim(),
police:(document.getElementById('rt-edit-police').value||'').trim(),
attest:(document.getElementById('rt-edit-attest').value||'').trim(),
attestType:(document.getElementById('rt-edit-attest-type').value)||'def',
matricule:(document.getElementById('rt-edit-matricule').value||'').trim(),
marque:(document.getElementById('rt-edit-marque').value||'').trim(),
price:parseFloat(document.getElementById('rt-edit-price').value)||0,
type:document.getElementById('rt-edit-type').value
});
});
svRenewals();
document.getElementById('rt-edit-modal').style.display='none';
renderRenewalsPage();
}
function closeRenewalEdit(){
document.getElementById('rt-edit-modal').style.display='none';
}
function markRenewalDone(id){
ldRenewals();
RT_CLIENTS=RT_CLIENTS.map(function(c){return c.id===id?Object.assign({},c,{status:'done',doneDate:rtToday()}):c;});
svRenewals();renderRenewalsPage();
}
function markRenewalUndo(id){
ldRenewals();
RT_CLIENTS=RT_CLIENTS.map(function(c){return c.id===id?Object.assign({},c,{status:'active',doneDate:null}):c;});
svRenewals();renderRenewalsPage();
}
function deleteAllRenewals(status){var msg=status==="active"?(LANG==="fr"?"Supprimer EN ATTENTE ?":"حذف النشطيين؟"):status==="done"?(LANG==="fr"?"Supprimer PAYES ?":"حذف المؤديين؟"):(LANG==="fr"?"Supprimer TOUS ?":"حذف الجميع؟");if(!confirm(msg))return;ldRenewals();RT_CLIENTS=(status==="active"||status==="done")?RT_CLIENTS.filter(function(c){return c.status!==status;}):[];svRenewals();renderRenewalsPage();}
function removeRenewalClient(id){
if(!confirm(LANG==='fr'?'Supprimer ce client ?':'حذف هذا الزبون؟'))return;
ldRenewals();
RT_CLIENTS=RT_CLIENTS.filter(function(c){return c.id!==id;});
svRenewals();renderRenewalsPage();
}
/* الزر الجديد: "🔄 للدفع" — يفتح صفحة الحساب ويعبّي الاسم ورقم البوليصة تلقائياً */
/* v4: زبون المتابعة المنقول للحاسبة بزر 🔄 — يهبط تلقائياً إلى «أدّوا» عند تأكيد العملية */
var RT_PAY_ID=null;
function rtAutoDone(){
var id=RT_PAY_ID;RT_PAY_ID=null;if(!id)return'';
ldRenewals();
var c=RT_CLIENTS.find(function(x){return x.id===id;});
if(!c||c.status==='done')return'';
RT_CLIENTS=RT_CLIENTS.map(function(x){return x.id===id?Object.assign({},x,{status:'done',doneDate:rtToday()}):x;});
svRenewals();
return LANG==='fr'?' · ✓ suivi : payé':' · ✓ نُقل في المتابعة إلى «أدّوا»';
}
document.addEventListener('input',function(e){if(e.target&&e.target.id==='client'&&!e.target.value.trim())RT_PAY_ID=null;},true);
function payRenewal(id){
ldRenewals();
var c=RT_CLIENTS.find(function(x){return x.id===id;});
if(!c)return;
RT_PAY_ID=id;
navTo('calc');
setTimeout(function(){
var el;
el=document.getElementById('client');    if(el)el.value=c.name||'';
el=document.getElementById('police-num'); if(el)el.value=c.police||'';
el=document.getElementById('attest-num'); if(el)el.value=c.attest||'';
if(c.price>0){
var tog=document.getElementById('man-tog');
if(tog&&!tog.checked){tog.checked=true;if(typeof togMan==="function")togMan();}
var pr=document.getElementById('man-price');
if(pr){pr.value=c.price;if(typeof updMan==="function")updMan();}
}
var cl=document.getElementById('client');if(cl)cl.focus();
},200);
}

function rtExistingPolice(){
ldRenewals();
var s=new Set();
RT_CLIENTS.forEach(function(c){if(c.police&&c.police.trim())s.add(c.police.trim());});
return s;
}
function rtHandleFile(file){
if(!file)return;
var _fn=document.getElementById('rt-imported-name');if(_fn)_fn.textContent='✅ '+file.name;
document.getElementById('rt-import-err').style.display='none';
RT_PENDING=null;RT_CHECKED=new Set();
var reader=new FileReader();
reader.onload=function(e){
try{
var data=new Uint8Array(e.target.result);
var wb=XLSX.read(data,{type:'array',cellDates:false});
var sheet=wb.Sheets[wb.SheetNames[0]];
var json=XLSX.utils.sheet_to_json(sheet,{defval:''});
if(!json.length){rtImportError(LANG==='fr'?'Fichier vide':'الملف فارغ');return;}
var existing=rtExistingPolice();
var rows=json.map(function(row,i){
var police=String(rtFindCol(row,'POLICE')||'').trim();
var name=String(rtFindCol(row,'CLIENT')||'').trim();
var phone=String(rtFindCol(row,'TELEPHONE')||'').trim();
var natureRaw=String(rtFindCol(row,'Nature Evenement')||'').trim();
var dateEmission=rtFindCol(row,'DATE_EMISSION');
var dateISO=rtParseFrDate(dateEmission)||rtToday();
var typeKey=RT_NATURE_MAP[natureRaw]||'new';
var isDup=police&&existing.has(police);
var attestDef=String(rtFindCol(row,'NUMEROATTESTATION')||'').trim();
var attestProv=String(rtFindCol(row,'NUMEROATTESTATION_PROVISOIRE')||'').trim();
var attest=attestDef||attestProv;
var attestType=attestDef?'def':(attestProv?'prov':'');
var matricule=String(rtFindCol(row,'MATRICULE')||rtFindCol(row,'Matricule')||rtFindCol(row,'IMMATDEF')||rtFindCol(row,'IMMAPRO')||rtFindCol(row,'IMMATRICULATION')||'').trim();
var marque=String(rtFindCol(row,'MARQUE')||rtFindCol(row,'Marque')||'').trim();
var priceRaw=rtFindCol(row,'PRIME_TOTAL')||rtFindCol(row,'PRIME')||rtFindCol(row,'PRIX')||rtFindCol(row,'Prime')||rtFindCol(row,'Prix')||rtFindCol(row,'MONTANT')||0;
var price=parseFloat(String(priceRaw).replace(/\s/g,'').replace(',','.'))||0;
return{id:'imp'+i,police:police,name:name,phone:phone,typeKey:typeKey,dateISO:dateISO,isDup:isDup,attest:attest,attestType:attestType,matricule:matricule,marque:marque,price:price};
}).filter(function(r){return r.name;});
if(!rows.length){rtImportError(LANG==='fr'?'Colonnes introuvables (CLIENT requis)':'الأعمدة غير موجودة (CLIENT مطلوب)');return;}
RT_PENDING={fileName:file.name,rows:rows};
RT_CHECKED=new Set(rows.filter(function(r){return!r.isDup&&RT_ACTIVE_TYPES.has(r.typeKey);}).map(function(r){return r.id;}));
renderRenewalsPage();
}catch(err){rtImportError(LANG==='fr'?'Erreur de lecture du fichier':'خطأ بقراءة الملف');}
};
reader.onerror=function(){rtImportError(LANG==='fr'?'Erreur de lecture':'خطأ بالقراءة');};
reader.readAsArrayBuffer(file);
}
function rtImportError(msg){
var el=document.getElementById('rt-import-err');
el.textContent=msg;el.style.display='block';
renderRenewalsPage();
}
function rtToggleTypeFilter(k){
if(RT_ACTIVE_TYPES.has(k))RT_ACTIVE_TYPES.delete(k);else RT_ACTIVE_TYPES.add(k);
if(RT_PENDING)RT_CHECKED=new Set(RT_PENDING.rows.filter(function(r){return!r.isDup&&RT_ACTIVE_TYPES.has(r.typeKey);}).map(function(r){return r.id;}));
renderRenewalsPage();
}
function rtToggleRow(id){
if(RT_CHECKED.has(id))RT_CHECKED.delete(id);else RT_CHECKED.add(id);
renderRenewalsPage();
}
function rtCancelImport(){RT_PENDING=null;RT_CHECKED=new Set();document.getElementById('rt-import-err').style.display='none';renderRenewalsPage();}
function rtConfirmImport(){
if(!RT_PENDING)return;
var toAdd=RT_PENDING.rows.filter(function(r){return RT_CHECKED.has(r.id)&&!r.isDup;});
if(!toAdd.length){rtCancelImport();return;}
ldRenewals();
var newOnes=toAdd.map(function(r){return{id:rtUid(),name:r.name,phone:r.phone,police:r.police,attest:r.attest||'',attestType:r.attestType||'',matricule:r.matricule||'',marque:r.marque||'',price:r.price||0,type:r.typeKey,requestDate:r.dateISO,status:'active',doneDate:null};});
RT_CLIENTS=newOnes.concat(RT_CLIENTS);
svRenewals();
rtCancelImport();
}




function rtAttestIcon(c){
  if(!c.attest) return '\u2b1c';
  return c.attestType==='prov' ? '\ud83d\udfe1' : '\ud83d\udfe2';
}
function rtCardHtml(c,isDone){
  var ic  = rtAttestIcon(c);
  var px  = c.price>0 ? fmt(c.price)+' DH' : '\u2014';
  var lvl = isDone ? 'done' : rtLevelOf(c.days);
  var dayBadge = '';
  if(!isDone && c.days!==undefined){
    var dt=(c.days===0?(LANG==='fr'?'Auj':'\u0627\u0644\u064a'):c.days+(LANG==='fr'?'j':' \u064a'));
    dt += (lvl==='urgent'?' \u26a0\ufe0f':lvl==='warn'?' \ud83d\udd14':'');
    dayBadge='<span class="rc-b rc-day rc-'+lvl+'">'+dt+'</span>';
  }
  var typeBadge = isDone
    ? '<span class="rc-b rc-done">\u2713 '+(LANG==='fr'?'Pay\u00e9':'\u0623\u062f\u0651\u0649')+'</span>'
    : '<span class="rc-b rc-type">'+escHtml(rtTypeLabel(c.type))+'</span>';
  // emission date display
  var emBadge = c.requestDate ? '<span class="rc-chip rc-date">\ud83d\udcc5 '+c.requestDate+'</span>' : '';
  var btns = isDone
    ? '<button class="rc-btn rc-edit" onclick="editRenewalClient(\''+c.id+'\')" title="\u062a\u0639\u062f\u064a\u0644">\u270f\ufe0f</button>'
      +'<button class="rc-btn rc-undo" onclick="markRenewalUndo(\''+c.id+'\')" title="\u062a\u0631\u0627\u062c\u0639">\u21a9\ufe0f</button>'
      +'<button class="rc-btn rc-del"  onclick="removeRenewalClient(\''+c.id+'\')" title="\u062d\u0630\u0641">\ud83d\uddd1\ufe0f</button>'
    : '<button class="rc-btn rc-edit" onclick="editRenewalClient(\''+c.id+'\')" title="\u062a\u0639\u062f\u064a\u0644">\u270f\ufe0f</button>'
      +'<button class="rc-btn rc-pay"  onclick="payRenewal(\''+c.id+'\')"         title="\u0644\u0644\u062d\u0633\u0627\u0628">\ud83d\udd04</button>'
      +'<button class="rc-btn rc-ok"   onclick="markRenewalDone(\''+c.id+'\')"   title="\u0623\u062f\u0651\u0649">\u2713</button>'
      +'<button class="rc-btn rc-del"  onclick="removeRenewalClient(\''+c.id+'\')" title="\u062d\u0630\u0641">\ud83d\uddd1\ufe0f</button>';
  return '<div class="rc-row rc-'+lvl+'">'
    +'<span class="rc-ic">'+ic+'</span>'
    +'<span class="rc-name">'+escHtml(c.name)+'</span>'
    +dayBadge+typeBadge
    +(c.police    ? '<span class="rc-chip rc-pol">\ud83d\udccb '+escHtml(c.police)+'</span>'    : '')
    +(c.attest    ? '<span class="rc-chip rc-att">'+ic+' '+escHtml(c.attest)+'</span>'         : '')
    +(c.matricule ? '<span class="rc-chip rc-mat">\ud83d\ude98 '+escHtml(c.matricule)+'</span>': '')
    +(c.marque    ? '<span class="rc-chip rc-mrq">\ud83c\udff7\ufe0f '+escHtml(c.marque)+'</span>' : '')
    +'<span class="rc-chip rc-price">\ud83d\udcb0 '+px+'</span>'
    +(c.phone     ? '<span class="rc-chip rc-tel">\ud83d\udcde <a href="tel:'+escHtml(c.phone)+'">'+escHtml(c.phone)+'</a></span>' : (typeof rpPhoneChip==='function'?rpPhoneChip(c.police,c.matricule,'rc-chip'):''))
    +emBadge
    +'<span class="rc-acts">'+btns+'</span>'
    +'</div>';
}



/* v5: إشعار واحد مجموع مرة فالنهار فكل جهاز (قبل: كان كيخرج كل مرة كترسم الصفحة).
   فيه العدد حسب الأيام، والزبناء اللي فاتو 5 أيام أو أكثر وباقي ما خداوش التأمين. */
function rtCheckNotifications(active){
  var day=new Date().toISOString().slice(0,10);
  try{ if(localStorage.getItem('rt_notif_day')===day) return; }catch(e){}
  var fr=LANG==='fr', thresholds=[2,3,4,5,8], msgs=[];
  thresholds.forEach(function(t){
    var found=active.filter(function(c){return c.days===t;});
    if(found.length) msgs.push(fr?found.length+' client(s) : '+t+' jour(s)':found.length+' زبون: '+t+' يوم');
  });
  var late=active.filter(function(c){return c.days>=5;}).sort(function(a,b){return b.days-a.days;});
  if(late.length){
    msgs.push((fr?'⏳ 5 jours ou plus, pas encore pris : ':'⏳ 5 أيام أو أكثر وباقي ما خداوش التأمين: ')
      +late.slice(0,5).map(function(c){return (c.name||c.client||'—')+' ('+c.days+(fr?' j':' ي')+')';}).join('، ')+(late.length>5?' +'+(late.length-5):''));
  }
  if(!msgs.length) return;
  try{ localStorage.setItem('rt_notif_day',day); }catch(e){}
  var title='🔔 '+(fr?'Renouvellements':'تجديدات');
  if(window.Notification&&Notification.permission==="granted"){
    try{ new Notification(title,{body:msgs.join('\n'),icon:'icon-192.png',tag:'rt-daily'}); }catch(e){}
  } else {
    alert('⚠️ '+(fr?"Alertes renouvellement:\n":"تنبيهات التجديد:\n")+msgs.join("\n"));
  }
}
function rtRequestNotifPermission(){
  if(Notification&&Notification.permission==="default"){
    Notification.requestPermission();
  }
}

function rtExportExcel(){
  ldRenewals();
  if(!RT_CLIENTS.length){alert(LANG==='fr'?'Aucun client':'لا يوجد زبائن');return;}
  var rows=[['NOM','POLICE','ATTESTATION','TYPE_ATTEST','MATRICULE','MARQUE','PRIX','TELEPHONE','TYPE_OP','DATE_EMISSION','STATUT','DATE_PAIEMENT']];
  RT_CLIENTS.forEach(function(c){
    rows.push([c.name||'',c.police||'',c.attest||'',c.attestType||'',c.matricule||'',c.marque||'',c.price||0,c.phone||'',c.type||'',c.requestDate||'',c.status||'',c.doneDate||'']);
  });
  var csv=rows.map(function(r){return r.map(function(v){var s=String(v);if(s.includes(','))s='"'+s+'"';return s;}).join(',');}).join('\n');
  var bom='\uFEFF';
  var blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download='renouvellements_'+(new Date().toISOString().slice(0,10))+'.csv';
  a.click();
  URL.revokeObjectURL(url);
}
function renderRenewalsPage(){
ldRenewals();
if(RT_CLIENTS===null)RT_CLIENTS=[];

/* استيراد قيد الانتظار (لو موجود) */
var impZone=document.getElementById('rt-import-zone');
var impPending=document.getElementById('rt-import-pending');
if(RT_PENDING){
impZone.style.display='none';
impPending.style.display='block';
var TYPE_KEYS=['renew','prorog','new','cancel'];
var chips=TYPE_KEYS.map(function(k){
var cnt=RT_PENDING.rows.filter(function(r){return r.typeKey===k;}).length;
if(!cnt)return'';
var on=RT_ACTIVE_TYPES.has(k);
return'<span class="rt-chip'+(on?' on':'')+'" onclick="rtToggleTypeFilter(\''+k+'\')">'+escHtml(rtTypeLabel(k))+' ('+cnt+')</span>';
}).join('');
var rows=RT_PENDING.rows.map(function(r){
return'<label class="rt-imp-row'+(r.isDup?' dup':'')+'"><input type="checkbox" onchange="rtToggleRow(\''+r.id+'\')" '+(RT_CHECKED.has(r.id)?'checked':'')+' '+(r.isDup?'disabled':'')+' style="margin-inline-end:8px"><span class="irn">'+escHtml(r.name)+'</span><span class="irm">'+escHtml(rtTypeLabel(r.typeKey))+(r.police?' · '+escHtml(r.police):'')+(r.isDup?' · '+(LANG==='fr'?'déjà existant':'موجود مسبقاً'):'')+'</span></label>';
}).join('');
impPending.innerHTML=
'<div class="rt-imp-summary">'+escHtml(RT_PENDING.fileName)+' — '+RT_PENDING.rows.length+' '+(LANG==='fr'?'lignes, ':'سطر، ')+RT_CHECKED.size+' '+(LANG==='fr'?'sélectionnés':'محدد')+'</div>'+
'<div class="rt-type-chips">'+chips+'</div>'+
'<div class="rt-imp-list">'+rows+'</div>'+
'<div style="display:flex;gap:8px">'+
'<button class="valbtn" style="flex:2;margin:0" onclick="rtConfirmImport()" '+(RT_CHECKED.size===0?'disabled':'')+'>✅ '+(LANG==='fr'?'Importer ('+RT_CHECKED.size+')':'استيراد ('+RT_CHECKED.size+')')+'</button>'+
'<button class="printbtn" style="flex:1;margin:0" onclick="rtCancelImport()">✕ '+(LANG==='fr'?'Annuler':'إلغاء')+'</button>'+
'</div>';
}else{
impZone.style.display='block';
impPending.style.display='none';
}

var _rtFr=document.getElementById('rt-date-from');var _rtTo=document.getElementById('rt-date-to');var _dFrom=_rtFr&&_rtFr.value?_rtFr.value:null;var _dTo=_rtTo&&_rtTo.value?_rtTo.value:null;var active=RT_CLIENTS.filter(function(c){if(c.status!=='active')return false;if(_dFrom&&c.requestDate&&c.requestDate<_dFrom)return false;if(_dTo&&c.requestDate&&c.requestDate>_dTo)return false;return true;}).map(function(c){return Object.assign({},c,{days:rtDaysBetween(c.requestDate)});}).sort(function(a,b){return b.days-a.days;});
setTimeout(function(){rtCheckNotifications(active);},500);
var done=RT_CLIENTS.filter(function(c){return c.status==='done';}).sort(function(a,b){return(b.doneDate||'').localeCompare(a.doneDate||'');});

document.getElementById('rt-stat-wait').textContent=active.length;
var _totalP=RT_CLIENTS.reduce(function(s,c){return s+(parseFloat(c.price)||0);},0);
var _tpEl=document.getElementById('rt-stat-total-price');
if(_tpEl)_tpEl.textContent=_totalP>0?fmt(_totalP)+' DH':'—';

document.getElementById('rt-stat-warn').textContent=active.filter(function(c){return c.days>=RT_ALERT_DAY&&c.days<RT_URGENT_DAY;}).length;
document.getElementById('rt-stat-urgent').textContent=active.filter(function(c){return c.days>=RT_URGENT_DAY;}).length;

var q=(document.getElementById('rt-search').value||'').trim().toLowerCase();
if(q){
active=active.filter(function(c){return(c.name||'').toLowerCase().includes(q)||(c.phone||'').toLowerCase().includes(q)||(c.police||'').toLowerCase().includes(q);});
}

document.getElementById('rt-wait-count').textContent=active.length;
var _wBtn=document.getElementById('rt-delall-act');
if(!_wBtn){
  _wBtn=document.createElement('button');
  _wBtn.id='rt-delall-act';
  _wBtn.setAttribute('style','margin-inline-start:8px;font-size:.7rem;padding:2px 9px;border-radius:5px;border:1px solid rgba(220,38,38,.3);background:rgba(220,38,38,.07);color:#dc2626;cursor:pointer;font-weight:700;vertical-align:middle');
  _wBtn.onclick=function(){deleteAllRenewals('active');};
  var _wCnt=document.getElementById('rt-wait-count');
  if(_wCnt&&_wCnt.parentElement)_wCnt.parentElement.appendChild(_wBtn);
}
if(_wBtn){_wBtn.textContent='🗑️ '+(LANG==="fr"?"Tout supprimer":"حذف الجميع");_wBtn.style.display=active.length?'':'none';}

var waitList=document.getElementById('rt-waiting-list');
if(!active.length){
waitList.innerHTML='<div class="empty">'+(q?'🔍':'🎉')+'<br>'+(q?(LANG==='fr'?'Aucun résultat':'لا توجد نتائج'):(LANG==='fr'?'Aucun client en attente':'لا يوجد زبائن قيد الانتظار'))+'</div>';
}else{
waitList.innerHTML=active.map(function(c){return rtCardHtml(c,false);}).join('');
}

var doneWrap=document.getElementById('rt-done-wrap');
if(done.length){
doneWrap.style.display='block';
document.getElementById('rt-done-count').textContent=done.length;
var _dBtn=document.getElementById('rt-delall-done');
if(!_dBtn){
  _dBtn=document.createElement('button');
  _dBtn.id='rt-delall-done';
  _dBtn.setAttribute('style','margin-inline-start:8px;font-size:.7rem;padding:2px 9px;border-radius:5px;border:1px solid rgba(220,38,38,.3);background:rgba(220,38,38,.07);color:#dc2626;cursor:pointer;font-weight:700;vertical-align:middle');
  _dBtn.onclick=function(){deleteAllRenewals('done');};
  var _dCnt=document.getElementById('rt-done-count');
  if(_dCnt&&_dCnt.parentElement)_dCnt.parentElement.appendChild(_dBtn);
}
if(_dBtn){_dBtn.textContent='🗑️ '+(LANG==="fr"?"Tout supprimer":"حذف المؤديين");_dBtn.style.display=done.length?'':'none';}

document.getElementById('rt-done-list').innerHTML=done.map(function(c){return rtCardHtml(c,true);}).join('');
}else{
doneWrap.style.display='none';
}
}

/* ربط أحداث الاستيراد (مرة واحدة عند التحميل) */
function initRenewalsEvents(){
var fi=document.getElementById('rt-file-input');
var dz=document.getElementById('rt-dropzone');
if(!fi||fi.dataset.bound)return;
fi.dataset.bound='1';
fi.addEventListener('change',function(e){if(e.target.files&&e.target.files[0])rtHandleFile(e.target.files[0]);});
dz.addEventListener('click',function(e){if(e.target.tagName!=='INPUT')fi.click();});
dz.addEventListener('dragover',function(e){e.preventDefault();dz.classList.add('drag');});
dz.addEventListener('dragleave',function(){dz.classList.remove('drag');});
dz.addEventListener('drop',function(e){e.preventDefault();dz.classList.remove('drag');if(e.dataTransfer.files&&e.dataTransfer.files[0])rtHandleFile(e.dataTransfer.files[0]);});
}

// كلمة السر لم تعد تُخزَّن في المتصفح: نمسح ما خُزّن سابقاً
try{localStorage.removeItem('eurv_apwd');localStorage.removeItem('eurv_saved_pwd');}catch(e){}

