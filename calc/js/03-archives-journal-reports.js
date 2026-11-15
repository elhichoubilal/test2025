/* ═══ EUR assurance — 03-archives-journal-reports.js ═══
   الأرشيف، اليومية، التقارير
   (مقتطع من app.js الأصلي، الأسطر 284–396، بالترتيب نفسه) */
function renderArchivesPage(){
ldCash();ldH();
var b=document.getElementById('archives-body');
var days=CASH.filter(function(s){return s.openBal!=null;}).slice().sort(function(a,b2){
var da=a.date.split('/').reverse().join(''),db=b2.date.split('/').reverse().join('');
return db.localeCompare(da);
});
if(!days.length){b.innerHTML='<div class="empty" style="padding:60px;text-align:center;color:var(--text3)">'+(LANG==='fr'?'Aucune journée archivée encore':'لا توجد أيام مؤرشفة بعد')+'</div>';return;}
b.innerHTML=days.map(function(s,idx){
var ops=getAllOpsForDate(s.date);
var expected=getExpectedBalance(s.date);
var diff=s.counted!=null?Math.round((s.counted-expected)*100)/100:null;
var tag=s.closed?(diff==null?'pending':(Math.abs(diff)<0.01?'ok':(diff>0?'over':'short'))):'pending';
var tagText=s.closed?(diff==null?(LANG==='fr'?'Clôturé':'مغلق'):(Math.abs(diff)<0.01?(LANG==='fr'?'Conforme':'مطابق'):(diff>0?(LANG==='fr'?'Excédent':'فائض'):(LANG==='fr'?'Déficit':'عجز')))):(LANG==='fr'?'En cours':'جاري');
return'<div class="arch-card" data-archidx="'+idx+'">'+
'<div class="arch-top"><span class="arch-date">📅 '+s.date+'</span><span class="arch-tag '+tag+'">'+tagText+'</span></div>'+
'<div class="arch-grid">'+
'<div class="arch-item"><div class="al">'+(LANG==='fr'?'Ouverture':'الافتتاح')+'</div><div class="av2">'+fmt(s.openBal||0)+' DH</div></div>'+
'<div class="arch-item"><div class="al">'+(LANG==='fr'?'Clôture':'الإغلاق')+'</div><div class="av2">'+(s.counted!=null?fmt(s.counted)+' DH':'—')+'</div></div>'+
'<div class="arch-item"><div class="al">'+(LANG==='fr'?'Opérations':'العمليات')+'</div><div class="av2">'+ops.length+'</div></div>'+
'<div class="arch-item"><div class="al">'+(LANG==='fr'?'Résultat jrd':'نتيجة الجرد')+'</div><div class="av2">'+(diff!=null?(diff>=0?'+':'')+fmt(diff)+' DH':'—')+'</div></div>'+
'</div></div>';
}).join('');
b.querySelectorAll('.arch-card').forEach(function(card){card.onclick=function(){openArchiveDetail(days[parseInt(this.dataset.archidx)]);};});
}
function openArchiveDetail(s){
ldH();ldCash();ldMoves();
var recs=getAllOpsForDate(s.date);
var dayMoves=getMovesForDate(s.date);
var ci=JSON.parse(localStorage.getItem('eurv102_ci')||'{}');
var tRef=0,tDebt=0;
recs.forEach(function(h){if(h.diff>0)tRef+=h.diff;if(h.diff<0)tDebt+=Math.abs(h.diff);});
var expected=getExpectedBalance(s.date);
var diff=s.counted!=null?Math.round((s.counted-expected)*100)/100:null;
var html='<h2 style="color:#0f2440;text-align:center;margin-bottom:4px">'+(ci.name||'EUR assurance')+'</h2><div style="text-align:center;font-size:.82rem;color:#666;margin-bottom:18px">'+(LANG==='fr'?'Archive — Journée du':'أرشيف — يوم')+' '+s.date+(ci.phone?' | '+ci.phone:'')+'</div>';
html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px"><div style="background:#fff8e8;border:1px solid #d4a43a;border-radius:9px;padding:10px;text-align:center"><div style="font-size:1rem;font-weight:800;color:#0f2440">'+fmt(s.openBal||0)+' DH</div><div style="font-size:.68rem;color:#888">'+(LANG==='fr'?'Ouverture':'الافتتاح')+'</div></div><div style="background:#fff8e8;border:1px solid #d4a43a;border-radius:9px;padding:10px;text-align:center"><div style="font-size:1rem;font-weight:800;color:#0f2440">'+fmt(expected)+' DH</div><div style="font-size:.68rem;color:#888">'+(LANG==='fr'?'Attendu':'المتوقع')+'</div></div><div style="background:#fff8e8;border:1px solid #d4a43a;border-radius:9px;padding:10px;text-align:center"><div style="font-size:1rem;font-weight:800;color:#0f2440">'+(s.counted!=null?fmt(s.counted)+' DH':'—')+'</div><div style="font-size:.68rem;color:#888">'+(LANG==='fr'?'Compté':'الموجود')+'</div></div></div>';
if(diff!=null){var dc=Math.abs(diff)<0.01?'#0a8a5f':(diff>0?'#1d4ed8':'#c92a2a');html+='<div style="text-align:center;font-weight:800;color:'+dc+';margin-bottom:14px">'+(Math.abs(diff)<0.01?(LANG==='fr'?'✅ Caisse conforme':'✅ مطابق'):(diff>0?'🔵 +':'🔴 ')+fmt(diff)+' DH')+'</div>';}
if(recs.length){html+='<table class="dr-tbl"><thead><tr><th>N°</th><th>Agent</th><th>Client</th><th>Immat.</th><th>Assurance</th><th>Mode</th><th>Payé DH</th><th>Off. DH</th><th>Écart DH</th></tr></thead><tbody>';recs.forEach(function(h){var ec=h.diff>0?'color:#0a8a5f':h.diff<0?'color:#c92a2a':'';html+='<tr><td style="font-family:monospace;font-size:.74rem">'+escHtml(h.num)+'</td><td>'+escHtml(h.av||'')+' '+escHtml(h.user||'')+'</td><td>'+escHtml(h.client)+'</td><td style="font-size:.74rem">'+escHtml(h.plate||'—')+'</td><td style="font-size:.74rem">'+escHtml(h.ins)+'</td><td>'+(h.payMode==='cheque'?'📄':h.payMode==='tpe'?'💳':'💵')+'</td><td>'+fmt(h.paid)+'</td><td>'+fmt(h.off)+'</td><td style="font-weight:800;'+ec+'">'+fmt(h.diff)+'</td></tr>';});html+='</tbody></table>';}else html+='<div style="text-align:center;padding:40px;color:#999">'+(LANG==='fr'?'Aucune opération':'لا توجد عمليات')+'</div>';
if(dayMoves.length){
html+='<div style="margin-top:14px;font-weight:800;font-size:.82rem;margin-bottom:6px">💸 '+(LANG==='fr'?'Mouvements de caisse':'حركات الصندوق')+'</div>';
html+='<table class="dr-tbl"><thead><tr><th>'+(LANG==='fr'?'Heure':'الوقت')+'</th><th>'+(LANG==='fr'?'Type':'النوع')+'</th><th>'+(LANG==='fr'?'Nom':'الاسم')+'</th><th>'+(LANG==='fr'?'Motif':'السبب')+'</th><th>DH</th></tr></thead><tbody>';
dayMoves.forEach(function(m){html+='<tr><td>'+m.time+'</td><td style="color:'+(m.type==='out'?'#c92a2a':'#1d4ed8')+';font-weight:700">'+(m.type==='out'?'➖':'➕')+'</td><td>'+(m.person||'—')+'</td><td>'+(m.reason||'—')+'</td><td style="font-weight:800;color:'+(m.type==='out'?'#c92a2a':'#1d4ed8')+'">'+(m.type==='out'?'-':'+')+fmt(m.amount)+'</td></tr>';});
html+='</tbody></table>';
}
html+='<div style="margin-top:18px;border-top:1px solid #ddd;padding-top:10px;display:flex;justify-content:space-between;font-size:.72rem;color:#999"><span>EUR assurance — Usage interne</span><span>'+new Date().toLocaleString('fr-FR')+'</span></div>';
html+='<button class="dr-close" style="position:static;display:block;margin:18px auto 0;background:#0f2440" onclick="window.print()">🖨️ '+(LANG==='fr'?'Imprimer':'طباعة')+'</button>';
document.getElementById('dr-content').innerHTML=html;document.getElementById('daily-report').classList.add('show');
}

function renderJournalPage(){
ldCash();ldH();ldMoves();
var rows=[];
HIST.forEach(function(h){
rows.push({sortKey:h.date.split('/').reverse().join('')+(h.time||'00:00'),date:h.date,desc:(LANG==='fr'?'Opération':'عملية')+' '+(h.num||'')+' — '+(h.client||''),credit:h.off||0,debit:0});
});
CASH.forEach(function(s){
if(s.openBal!=null)rows.push({sortKey:s.date.split('/').reverse().join('')+'00:00',date:s.date,desc:(LANG==='fr'?'Ouverture de caisse':'فتح الصندوق'),credit:0,debit:0,isOpen:true,amt:s.openBal});
});
CASH_MOVES.forEach(function(m){
var isOut=m.type==='out';
var desc=(isOut?(LANG==='fr'?'Sortie':'خروج'):(LANG==='fr'?'Entrée':'دخول'))+(m.person?' — '+m.person:'')+(m.reason?' ('+m.reason+')':'');
rows.push({sortKey:m.date.split('/').reverse().join('')+(m.time||'00:00'),date:m.date,desc:desc,credit:isOut?0:m.amount,debit:isOut?m.amount:0});
});
rows.sort(function(a,b){return a.sortKey.localeCompare(b.sortKey);});
var bal=0;
var html=rows.map(function(r){
if(r.isOpen){bal=r.amt;return'<tr><td>'+r.date+'</td><td>'+r.desc+'</td><td>—</td><td>—</td><td class="jt-balance">'+fmt(bal)+' DH</td></tr>';}
bal+=r.credit-r.debit;
return'<tr><td>'+r.date+'</td><td>'+r.desc+'</td><td class="jt-credit">'+(r.credit?'+'+fmt(r.credit):'—')+'</td><td class="jt-debit">'+(r.debit?'-'+fmt(r.debit):'—')+'</td><td class="jt-balance">'+fmt(bal)+' DH</td></tr>';
}).join('');
document.getElementById('journal-body').innerHTML=html||'<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text3)">'+(LANG==='fr'?'Aucune donnée':'لا توجد بيانات')+'</td></tr>';
}

var REP_PERIOD='day';
function setRepPeriod(p){REP_PERIOD=p;document.querySelectorAll('#rep-period-sw .period-btn').forEach(function(b){b.classList.toggle('on',b.dataset.rp===p);});renderReportsPage();}
function dateInRange(dateStr,from,to){
var p=dateStr.split('/');var d=new Date(p[2]+'-'+p[1]+'-'+p[0]);
return d>=from&&d<=to;
}
function renderReportsPage(){
ldH();
var now=new Date();
var from,to=now;
if(REP_PERIOD==='day'){from=new Date(now.getFullYear(),now.getMonth(),now.getDate());}
else if(REP_PERIOD==='week'){var dow=now.getDay();from=new Date(now);from.setDate(now.getDate()-dow);}
else if(REP_PERIOD==='month'){from=new Date(now.getFullYear(),now.getMonth(),1);}
else{from=new Date(now.getFullYear(),0,1);}
var ops=HIST.filter(function(h){return dateInRange(h.date,from,to);});
REP_OPS=ops;
var totalOff=ops.reduce(function(a,h){return a+(h.off||0);},0);
var totalPaid=ops.reduce(function(a,h){return a+(h.paid||0);},0);
var totalRefund=ops.reduce(function(a,h){return a+(h.diff||0);},0);
var net=totalOff;
var clientSet={};ops.forEach(function(h){clientSet[h.client]=1;});
var html='<div class="syncrow" style="margin-bottom:14px"><button class="syncb exp" onclick="exportReportCSV()">📤 '+(LANG==='fr'?'Exporter CSV':'تصدير CSV')+'</button></div>';
html+='<div class="caisse-summary-grid">'+
'<div class="cs-card"><div class="cs-l">'+(LANG==='fr'?'Nombre d\'opérations':'عدد العمليات')+'</div><div class="cs-v">'+ops.length+'</div></div>'+
'<div class="cs-card"><div class="cs-l">'+(LANG==='fr'?'Nombre de clients':'عدد الزبائن')+'</div><div class="cs-v">'+Object.keys(clientSet).length+'</div></div>'+
'<div class="cs-card"><div class="cs-l">'+(LANG==='fr'?'Total prix officiels':'مجموع الأسعار الحقيقية')+'</div><div class="cs-v">'+fmt(totalOff)+' DH</div></div>'+
'<div class="cs-card"><div class="cs-l">'+(LANG==='fr'?'Total payé':'مجموع المدفوعات')+'</div><div class="cs-v">'+fmt(totalPaid)+' DH</div></div>'+
'<div class="cs-card"><div class="cs-l">'+(LANG==='fr'?'Total remboursé':'مجموع المرجعات')+'</div><div class="cs-v">'+fmt(totalRefund)+' DH</div></div>'+
'<div class="cs-card accent"><div class="cs-l">'+(LANG==='fr'?'Revenu net (prix officiel)':'صافي الإيرادات (السعر الحقيقي)')+'</div><div class="cs-v">'+fmt(net)+' DH</div></div>'+
'</div>';
document.getElementById('reports-body').innerHTML=html;
}
var REP_OPS=[];
function exportReportCSV(){
if(!REP_OPS.length){alert(LANG==='fr'?'Aucune donnée':'لا توجد بيانات');return;}
var rows=['N°;Date;Heure;Agent;Client;Immat;Assurance;Paye;Officiel;Ecart'];
REP_OPS.forEach(function(h){rows.push([h.num,h.date,h.time||'',h.user,h.client,h.plate||'',h.ins,h.paid.toFixed(2),h.off.toFixed(2),h.diff.toFixed(2)].join(';'));});
dlBlob('\uFEFF'+rows.join('\n'),'text/csv;charset=utf-8','rapport-'+REP_PERIOD+'-'+new Date().toISOString().slice(0,10)+'.csv');
}

