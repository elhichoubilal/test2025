/* ═══ EUR assurance — 02-caisse.js ═══
   الصندوق اليومي: الجلسات، الحركات، صفحة الصندوق
   (مقتطع من app.js الأصلي، الأسطر 47–283، بالترتيب نفسه) */
/* ══════════════════════════════════════════════════════════
CAISSE — DAILY CASH REGISTER DATA LAYER
══════════════════════════════════════════════════════════ */
var CASH=[];
function ldCash(){try{CASH=JSON.parse(localStorage.getItem('eurv102_cash')||'[]');}catch(e){CASH=[];}}
function svCash(){localStorage.setItem('eurv102_cash',JSON.stringify(CASH));if(window.fbSet)window.fbSet('cash',CASH);}
function todayStr(){return new Date().toLocaleDateString('fr-FR');}
function getSession(dateStr){ldCash();return CASH.find(function(s){return s.date===dateStr;})||null;}
function getOrCreateSession(dateStr){
var s=getSession(dateStr);
if(!s){s={date:dateStr,openBal:null,openedBy:null,openedAt:null,counted:null,countedAt:null,countedBy:null,closed:false,closedBy:null,closedAt:null};CASH.unshift(s);svCash();}
return s;
}
function openCaisse(amount,dateStr){
ldCash();
var s=getOrCreateSession(dateStr||todayStr());
s.openBal=amount;s.openedBy=CUR.n;s.openedAt=new Date().toLocaleString('fr-FR');
svCash();
return s;
}
function getCashOpsForDate(dateStr){
ldH();
return HIST.filter(function(h){return h.date===dateStr&&h.payMode==='cash';});
}
function getAllOpsForDate(dateStr){
ldH();
return HIST.filter(function(h){return h.date===dateStr;});
}
function getCashRevenueForDate(dateStr){
return getCashOpsForDate(dateStr).reduce(function(s,h){return s+(h.off||0);},0);
}
function getExpectedBalance(dateStr){
var s=getSession(dateStr);
var openBal=(s&&s.openBal!=null)?s.openBal:0;
return Math.round((openBal+getCashRevenueForDate(dateStr)+getMovesNetForDate(dateStr))*100)/100;
}
function doInventory(countedAmt,dateStr){
var s=getOrCreateSession(dateStr||todayStr());
s.counted=countedAmt;s.countedAt=new Date().toLocaleString('fr-FR');s.countedBy=CUR.n;
svCash();
return s;
}
function closeCaisseDay(dateStr){
var d=dateStr||todayStr();
var bal=getExpectedBalance(d);
var s=getOrCreateSession(d);
s.closed=true;s.closedBy=CUR.n;s.closedAt=new Date().toLocaleString('fr-FR');
if(s.counted==null)s.counted=bal;
svCash();
return s;
}

/* ══════════════════════════════════════════════════════════
CASH MOVEMENTS
══════════════════════════════════════════════════════════ */
var CASH_MOVES=[];
function ldMoves(){try{CASH_MOVES=JSON.parse(localStorage.getItem('eurv102_cash_moves')||'[]');}catch(e){CASH_MOVES=[];}}
function svMoves(){localStorage.setItem('eurv102_cash_moves',JSON.stringify(CASH_MOVES));if(window.fbSet)window.fbSet('cashMoves',CASH_MOVES);}
function addCashMove(type,amount,reason,person,isEmployee,isClient,dateStr){
ldMoves();
var m={id:'M'+Date.now(),date:dateStr||todayStr(),time:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),type:type,amount:Math.abs(amount),reason:reason||'',person:person||'',isEmployee:!!isEmployee,isClient:!!isClient,user:CUR.n,createdAt:new Date().toISOString()};
CASH_MOVES.unshift(m);
svMoves();
return m;
}
function deleteCashMove(id){
ldMoves();
CASH_MOVES=CASH_MOVES.filter(function(m){return m.id!==id;});
svMoves();
}
function getMovesForDate(dateStr){
ldMoves();
return CASH_MOVES.filter(function(m){return m.date===dateStr;});
}
function getMovesNetForDate(dateStr){
return getMovesForDate(dateStr).reduce(function(s,m){return s+(m.type==='in'?m.amount:-m.amount);},0);
}

var CAISSE_VIEW_DATE=null;
function caisseYesterday(){var d=new Date();d.setDate(d.getDate()-1);return d.toLocaleDateString('fr-FR');}
function frToISO(f){if(!f)return'';var p=f.split('/');return p.length===3?p[2]+'-'+p[1]+'-'+p[0]:'';}
function isoToFr(i){if(!i)return'';var p=i.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:'';}
function caisseDateBar(t){
var iso=frToISO(t),todayIso=frToISO(todayStr());
var isToday=(t===todayStr());
return '<div class="caisse-datebar">'+
'<button class="cdb-btn'+(isToday?' active':'')+'" id="cdb-today">'+(LANG==='fr'?'Aujourd\'hui':'اليوم')+'</button>'+
'<button class="cdb-btn'+(t===caisseYesterday()?' active':'')+'" id="cdb-yest">'+(LANG==='fr'?'Hier':'أمس')+'</button>'+
'<input type="date" id="cdb-pick" class="cdb-pick" value="'+iso+'" max="'+todayIso+'">'+
'</div>'+
(isToday?'':'<div class="cdb-note">📅 '+(LANG==='fr'?'Vous consultez le '+t:'أنت تطالع يوم '+t)+'</div>');
}
function wireCaisseDateBar(){
var bt=document.getElementById('cdb-today');if(bt)bt.onclick=function(){CAISSE_VIEW_DATE=todayStr();renderCaissePage();};
var by=document.getElementById('cdb-yest');if(by)by.onclick=function(){CAISSE_VIEW_DATE=caisseYesterday();renderCaissePage();};
var bp=document.getElementById('cdb-pick');if(bp)bp.onchange=function(){var f=isoToFr(this.value);if(f){CAISSE_VIEW_DATE=f;renderCaissePage();}};
}
function renderCaissePage(){
ldCash();ldH();
var t=CAISSE_VIEW_DATE||todayStr();
CAISSE_VIEW_DATE=t;
var isToday=(t===todayStr());
var isFuture=frToISO(t)>frToISO(todayStr());
var s=getSession(t);
var dayClosed=!!(s&&s.closed);
var canEditDay=!isFuture&&!dayClosed&&(isToday||CUR.isAdmin);
var bar=caisseDateBar(t);
var b=document.getElementById('caisse-body');

if(!s||s.openBal==null){
var inner;
if(canEditDay){
inner='<div class="cash-open-box">'+
'<div class="cash-open-ic">🗄️</div>'+
'<div class="cash-open-title">'+(LANG==='fr'?'Ouverture de caisse':'فتح الصندوق')+'</div>'+
'<div class="cash-open-sub">'+(LANG==='fr'?'Entrez le solde de départ pour démarrer la journée':'أدخل رصيد البداية لبدء اليوم')+'</div>'+
'<input type="number" class="cash-open-inp" id="cash-open-amt" placeholder="0.00" step="0.01">'+
'<button class="cash-open-btn" id="cash-open-go">✅ '+(LANG==='fr'?'Ouvrir la caisse':'فتح الصندوق')+'</button>'+
'</div>';
}else{
inner='<div class="infobox" style="margin-top:8px">'+(isFuture?(LANG==='fr'?'<span>Jour futur — non disponible.</span>':'<span>يوم قادم — غير متاح.</span>'):(LANG==='fr'?'<span>Caisse non ouverte ce jour'+(CUR.isAdmin?'':'. Modification réservée à l\'admin')+'.</span>':'<span>لم يُفتح الصندوق في هذا اليوم'+(CUR.isAdmin?'':' — التعديل للمسؤول فقط')+'.</span>'))+'</div>';
}
b.innerHTML=bar+inner;
wireCaisseDateBar();
var og=document.getElementById('cash-open-go');
if(og)og.onclick=function(){
var v=parseFloat(document.getElementById('cash-open-amt').value);
if(isNaN(v)||v<0){alert(LANG==='fr'?'Montant invalide':'مبلغ غير صحيح');return;}
openCaisse(v,t);renderCaissePage();renderDashboard();
};
return;
}

var ops=getAllOpsForDate(t);
var cashOps=getCashOpsForDate(t);
var totalPaid=ops.reduce(function(a,h){return a+(h.paid||0);},0);
var totalRefund=ops.reduce(function(a,h){return a+(h.paid>h.off?h.paid-h.off:0);},0);
var moves=getMovesForDate(t);
var movesNet=getMovesNetForDate(t);
var expected=getExpectedBalance(t);
var html=bar;

if(dayClosed){
html+='<div class="day-locked-badge">🔒 '+(LANG==='fr'?'Journée clôturée':'تم إغلاق اليوم')+'</div>';
}else if(!canEditDay){
html+='<div class="cdb-note">👁️ '+(LANG==='fr'?'Lecture seule — modification réservée à l\'admin':'للقراءة فقط — التعديل للمسؤول فقط')+'</div>';
}

html+='<div class="caisse-summary-grid">'+
'<div class="cs-card"><div class="cs-l">'+(LANG==='fr'?'Solde ouverture':'رصيد الافتتاح')+'</div><div class="cs-v">'+fmt(s.openBal)+' DH</div></div>'+
'<div class="cs-card"><div class="cs-l">'+(LANG==='fr'?'Opérations'+' / '+'Clients':'العمليات / الزبائن')+'</div><div class="cs-v">'+ops.length+'</div></div>'+
'<div class="cs-card"><div class="cs-l">'+(LANG==='fr'?'Total payé':'إجمالي المدفوعات')+'</div><div class="cs-v">'+fmt(totalPaid)+' DH</div></div>'+
'<div class="cs-card"><div class="cs-l">'+(LANG==='fr'?'Total remboursé':'إجمالي المرجعات')+'</div><div class="cs-v">'+fmt(totalRefund)+' DH</div></div>'+
'<div class="cs-card"><div class="cs-l">'+(LANG==='fr'?'Opérations en espèces':'عمليات نقدية')+'</div><div class="cs-v">'+cashOps.length+'</div></div>'+
'<div class="cs-card'+(movesNet<0?'':' accent')+'" style="'+(movesNet<0?'background:linear-gradient(135deg,rgba(220,38,38,.06),rgba(220,38,38,.1));border-color:rgba(220,38,38,.2)':'')+'"><div class="cs-l">'+(LANG==='fr'?'Mouvements de caisse':'حركات الصندوق')+'</div><div class="cs-v" style="'+(movesNet<0?'color:var(--red)':movesNet>0?'color:var(--blue)':'')+'">'+(movesNet>=0?'+':'')+fmt(movesNet)+' DH</div></div>'+
'<div class="cs-card accent" style="grid-column:span 2"><div class="cs-l">'+(LANG==='fr'?'Solde caisse attendu':'الرصيد المتوقع للصندوق')+'</div><div class="cs-v">'+fmt(expected)+' DH</div></div>'+
'</div>';

html+='<div class="inv-box" style="margin-bottom:14px">'+
'<div style="font-weight:800;font-size:.86rem;margin-bottom:10px">💸 '+(LANG==='fr'?'Mouvements de caisse (avances / dépenses)':'حركات الصندوق (سلف / مصاريف)')+'</div>';
if(canEditDay){
html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'+
'<select id="move-type" style="padding:9px;border:1.5px solid var(--border);border-radius:9px;font-family:inherit;font-size:.8rem;background:var(--panel);color:var(--text)">'+
'<option value="out">'+(LANG==='fr'?'➖ Sortie (avance/dépense)':'➖ خروج (سلفة/مصروف)')+'</option>'+
'<option value="in">'+(LANG==='fr'?'➕ Entrée (remboursement reçu)':'➕ دخول (استرجاع/تسديد)')+'</option>'+
'</select>'+
'<input type="number" id="move-amt" step="0.01" placeholder="'+(LANG==='fr'?'Montant DH':'المبلغ DH')+'" style="padding:9px;border:1.5px solid var(--border);border-radius:9px;font-family:\'JetBrains Mono\',monospace;font-weight:700">'+
'</div>'+
'<input type="text" id="move-person" placeholder="'+(LANG==='fr'?'Nom (employé ou client) — optionnel':'الاسم (موظف أو زبون) — اختياري')+'" style="width:100%;padding:9px;border:1.5px solid var(--border);border-radius:9px;font-family:inherit;font-size:.8rem;margin-bottom:8px;box-sizing:border-box">'+
'<input type="text" id="move-reason" placeholder="'+(LANG==='fr'?'Motif (ex: avance, achat fournitures...)':'السبب (مثال: سلفة، شراء لوازم...)')+'" style="width:100%;padding:9px;border:1.5px solid var(--border);border-radius:9px;font-family:inherit;font-size:.8rem;margin-bottom:10px;box-sizing:border-box">'+
'<button class="cash-open-btn" id="move-add-go">➕ '+(LANG==='fr'?'Ajouter le mouvement':'إضافة الحركة')+'</button>';
}
if(moves.length){
html+='<div style="margin-top:14px">'+moves.map(function(m){
var tagColor=m.type==='out'?'var(--red)':'var(--blue)';
return'<div class="inv-row"><span class="il">'+(m.type==='out'?'➖':'➕')+' '+(m.person?m.person+' — ':'')+(m.reason||(LANG==='fr'?'Sans motif':'بدون سبب'))+' <span style="font-size:.62rem;color:var(--text3)">('+m.time+')</span></span><span class="iv" style="color:'+tagColor+'">'+(m.type==='out'?'-':'+')+fmt(m.amount)+' DH'+(canEditDay&&CUR.isAdmin?' <button onclick="if(confirm(\''+(LANG==='fr'?'Supprimer ?':'حذف؟')+'\')){deleteCashMove(\''+m.id+'\');renderCaissePage();}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.9rem;margin-left:6px">🗑️</button>':'')+'</span></div>';
}).join('')+'</div>';
}else{
html+='<div class="empty" style="padding:16px;text-align:center;color:var(--text3);font-size:.78rem">'+(LANG==='fr'?'Aucun mouvement':'لا توجد حركات')+'</div>';
}
html+='</div>';

html+='<div class="inv-box">'+
'<div style="font-weight:800;font-size:.86rem;margin-bottom:10px">📦 '+(LANG==='fr'?'Inventaire de caisse':'جرد الصندوق')+'</div>'+
'<div class="inv-row"><span class="il">'+(LANG==='fr'?'Montant attendu':'المبلغ المتوقع')+'</span><span class="iv">'+fmt(expected)+' DH</span></div>';

if(canEditDay){
html+='<div class="inv-row"><span class="il">'+(LANG==='fr'?'Montant compté':'المبلغ الموجود')+'</span><span class="iv"><input type="number" id="cash-count-amt" step="0.01" style="width:130px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:\'JetBrains Mono\',monospace;font-weight:800;text-align:end" placeholder="0.00" value="'+(s.counted!=null?s.counted:'')+'"></span></div>';
html+='<button class="cash-open-btn" id="cash-count-go" style="margin-top:10px">🧮 '+(LANG==='fr'?'Faire le compte':'جرد الصندوق')+'</button>';
}else{
html+='<div class="inv-row"><span class="il">'+(LANG==='fr'?'Montant compté':'المبلغ الموجود')+'</span><span class="iv">'+fmt(s.counted||0)+' DH</span></div>';
}

if(s.counted!=null){
var diff=Math.round((s.counted-expected)*100)/100;
var statusClass=Math.abs(diff)<0.01?'ok':(diff>0?'over':'short');
var statusText=Math.abs(diff)<0.01?(LANG==='fr'?'✅ Caisse conforme':'✅ مطابق'):(diff>0?(LANG==='fr'?'🔵 Excédent: +':'🔵 فائض: +')+fmt(diff)+' DH':(LANG==='fr'?'🔴 Déficit: -':'🔴 عجز: -')+fmt(diff)+' DH');
html+='<div class="inv-status '+statusClass+'">'+statusText+'</div>';
}
html+='</div>';

if(canEditDay){
var canClose=CUR.isAdmin;
html+='<button class="close-day-btn" id="cash-close-go" '+(canClose?'':'disabled')+'>🔒 '+(LANG==='fr'?'Clôturer la journée':'إغلاق اليوم')+(canClose?'':' ('+(LANG==='fr'?'Admin uniquement':'للمسؤول فقط')+')')+'</button>';
}else if(dayClosed){
html+='<div class="infobox" style="margin-top:14px"><span data-ar>تم إغلاق هذا اليوم.</span><span data-fr>Cette journée est clôturée.</span></div>';
}

b.innerHTML=html;
wireCaisseDateBar();

var moveBtn=document.getElementById('move-add-go');
if(moveBtn)moveBtn.onclick=function(){
var type=document.getElementById('move-type').value;
var amt=parseFloat(document.getElementById('move-amt').value);
var person=document.getElementById('move-person').value.trim();
var reason=document.getElementById('move-reason').value.trim();
if(isNaN(amt)||amt<=0){alert(LANG==='fr'?'Montant invalide':'مبلغ غير صحيح');return;}
if(!reason&&!person){alert(LANG==='fr'?'Veuillez préciser un motif ou un nom':'يرجى إدخال السبب أو الاسم');return;}
addCashMove(type,amt,reason,person,false,false,t);
renderCaissePage();renderDashboard();
};

var countBtn=document.getElementById('cash-count-go');
if(countBtn)countBtn.onclick=function(){
var v=parseFloat(document.getElementById('cash-count-amt').value);
if(isNaN(v)||v<0){alert(LANG==='fr'?'Montant invalide':'مبلغ غير صحيح');return;}
doInventory(v,t);renderCaissePage();
};
var closeBtn=document.getElementById('cash-close-go');
if(closeBtn)closeBtn.onclick=function(){
if(!CUR.isAdmin)return;
if(!confirm(LANG==='fr'?'Clôturer définitivement la journée ?':'إغلاق اليوم بشكل نهائي؟'))return;
closeCaisseDay(t);renderCaissePage();renderDashboard();
};
}

