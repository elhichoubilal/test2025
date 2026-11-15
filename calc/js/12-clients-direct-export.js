/* ═══ EUR assurance — 12-clients-direct-export.js ═══
   الزبناء، الإكمال التلقائي، الدفع المباشر، التصدير، النسخة الاحتياطية، المشاركة، تقرير اليوم
   (مقتطع من app.js الأصلي، الأسطر 1427–1569، بالترتيب نفسه) */
function saveClient(name,plate,ins,de){if(!name||name==='—')return;ldC();var i=CLIENTS.findIndex(function(x){return x.n===name&&x.p===plate;});var e={n:name,p:plate||'',t:ins||'',de:de||'',upd:new Date().toISOString().slice(0,10)};if(i>=0)CLIENTS[i]=e;else CLIENTS.unshift(e);svC();}
function renderClients(){
ldC();var q=(document.getElementById('cl-search')||{value:''}).value.toLowerCase();
var fl=CLIENTS.filter(function(x){return!q||(x.n+' '+x.p).toLowerCase().includes(q);});
var b=document.getElementById('clients-body');
if(!fl.length){b.innerHTML='<div style="text-align:center;padding:60px;color:var(--text3);font-size:.86rem">'+(LANG==='fr'?'Aucun résultat':'لا توجد نتائج')+'</div>';return;}
var today=new Date();
b.innerHTML=fl.map(function(cl,idx){
var ec='expired',el2='—';
if(cl.de){var exp=new Date(cl.de),d=Math.ceil((exp-today)/86400000);ec=d<0?'expired':d<=30?'soon':'ok';el2=d<0?(LANG==='fr'?'Expiré':'منتهي'):d+'j';}
return'<div class="cl-item" data-clidx="'+idx+'">'+'<div><div class="cl-name">'+cl.n+'</div><div class="cl-plate">'+(cl.p||'—')+'</div></div>'+'<div style="text-align:end"><div style="font-size:.7rem;color:var(--text3)">'+(cl.t||'')+'</div>'+(cl.de?'<div class="cl-exp '+ec+'">'+el2+'</div>':'')+'</div></div>';
}).join('');
b.querySelectorAll('.cl-item').forEach(function(item){item.onclick=function(){var cl=fl[parseInt(this.dataset.clidx)];if(cl)fillClientFields(cl.n,cl.p||'');};});
}
function fillClientFields(name,plate){document.getElementById('client').value=name;if(plate)document.getElementById('plate').value=plate;navTo('calc');document.getElementById('client').focus();}
function showRenewals(){
ldC();var today=new Date();
var soon=CLIENTS.filter(function(c){if(!c.de)return false;var d=Math.ceil((new Date(c.de)-today)/86400000);return d>=0&&d<=30;}).sort(function(a,b){return new Date(a.de)-new Date(b.de);});
var b=document.getElementById('clients-body');
if(!soon.length){alert(LANG==='fr'?'Aucune expiration dans 30j ✅':'لا يوجد تأمين ينتهي في 30 يوماً ✅');return;}
b.innerHTML='<div style="font-size:.78rem;font-weight:700;color:var(--red);padding:9px 14px;background:var(--red-bg);border-radius:var(--r3);margin-bottom:10px;border:1px solid rgba(220,38,38,.15)">🔔 '+soon.length+' '+(LANG==='fr'?'expirations < 30j':'تأمين ينتهي قريباً')+'</div>'+soon.map(function(cl){var d=Math.ceil((new Date(cl.de)-new Date())/86400000);return'<div class="cl-item"><div><div class="cl-name">'+cl.n+'</div><div class="cl-plate">'+(cl.p||'—')+'</div></div><div class="renew-badge '+(d<=7?'soon':'week')+'">'+d+'j</div></div>';}).join('');
navTo('clients');
}
function initAC(){
var inp=document.getElementById('client');
if(!inp||inp.dataset.ac)return;
inp.dataset.ac='1';
var ul=document.getElementById('ac-list');
inp.addEventListener('input',function(){
var q=this.value.trim().toLowerCase();
if(!q||q.length<2){ul.classList.remove('show');return;}
ldC();var m=CLIENTS.filter(function(x){return x.n.toLowerCase().includes(q);}).slice(0,6);
if(!m.length){ul.classList.remove('show');return;}
ul.innerHTML=m.map(function(x,idx){return'<div class="ac-item" data-acidx="'+idx+'"><b>'+x.n+'</b>'+(x.p?' <span style="font-size:.72rem;color:var(--text3);font-family:\'JetBrains Mono\',monospace">'+x.p+'</span>':'')+'</div>';}).join('');
ul.querySelectorAll('.ac-item').forEach(function(item){item.onmousedown=function(e){var x=m[parseInt(this.dataset.acidx)];if(x)pickAC(e,x.n,x.p||'');};});
ul.classList.add('show');
});
inp.addEventListener('blur',function(){setTimeout(function(){ul.classList.remove('show');},200);});
}
function pickAC(e,name,plate){e.preventDefault();document.getElementById('client').value=name;if(plate)document.getElementById('plate').value=plate;document.getElementById('ac-list').classList.remove('show');}

function toggleDirect(){
DIRECT_MODE=!DIRECT_MODE;
var sw=document.getElementById('direct-sw'),box=document.getElementById('direct-box');
var paidWrap=document.getElementById('paid-field-wrap'),calcBtn=document.getElementById('calc-btn');
sw.classList.toggle('on',DIRECT_MODE);box.classList.toggle('show',DIRECT_MODE);
if(paidWrap)paidWrap.style.display=DIRECT_MODE?'none':'block';
if(calcBtn)calcBtn.style.display=DIRECT_MODE?'none':'block';
document.getElementById('action-area').style.display='none';
document.getElementById('resbox').style.display='none';
document.getElementById('valok').style.display='none';
if(!DIRECT_MODE){document.getElementById('direct-amount').value='';document.getElementById('direct-desc').value='';}
}
function updDirect(){}
function validerDirect(){
var client=document.getElementById('client').value.trim()||'—';
var plate=document.getElementById('plate').value.trim();
var desc=document.getElementById('direct-desc').value.trim()||(LANG==='fr'?'Paiement direct':'دفع مباشر');
var amt=parseFloat(document.getElementById('direct-amount').value)||0;
if(!amt){alert(LANG==='fr'?'Entrez le montant':'أدخل المبلغ');return;}
if(client==='—'||!client){alert(LANG==='fr'?'Entrez le nom client':'أدخل اسم الزبون');return;}
ldH();
var num=nextN();
HIST.unshift({num,date:new Date().toLocaleDateString('fr-FR'),time:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),user:CUR.n,av:CUR.av,client,plate,ins:'⚡ '+desc,ds:'',de:'',paid:amt,off:amt,diff:0,payMode:PAY_MODE,directPay:true});
svH();document.getElementById('h-rec').textContent=curN();
document.getElementById('val-num').textContent='✅ N° '+num+' — '+(LANG==='fr'?'Paiement direct validé!':'تم تأكيد الدفع المباشر!');
document.getElementById('val-info').textContent=client+' — '+fmt(amt)+' DH';
document.getElementById('valok').style.display='block';
renderDashboard();
setTimeout(function(){document.getElementById('client').value='';document.getElementById('plate').value='';document.getElementById('direct-amount').value='';document.getElementById('direct-desc').value='';document.getElementById('valok').style.display='none';toggleDirect();},3000);
}

function exportXL(){ldH();if(!HIST.length){alert('Pas de données');return;}var html='<html><head><meta charset="UTF-8"><style>th{background:#0f2440;color:white;padding:8px;border:1px solid #ccc}td{padding:6px;border:1px solid #eee}.pos{color:#0a8a5f;font-weight:bold}.neg{color:#c92a2a;font-weight:bold}</style></head><body><h2 style="color:#0f2440">EUR assurance — '+new Date().toLocaleDateString('fr-FR')+'</h2><table><thead><tr><th>N°</th><th>Date</th><th>Heure</th><th>Agent</th><th>Client</th><th>Immat.</th><th>Police</th><th>Assurance</th><th>Début</th><th>Fin</th><th>Payé</th><th>Officiel</th><th>Écart</th><th>Mode</th><th>Réf.</th></tr></thead><tbody>';HIST.forEach(function(h){html+='<tr><td>'+h.num+'</td><td>'+h.date+'</td><td>'+(h.time||'')+'</td><td>'+h.user+'</td><td>'+h.client+'</td><td>'+(h.plate||'')+'</td><td>'+(h.police||'')+'</td><td>'+h.ins+'</td><td>'+(h.ds?fmtD(h.ds):'')+'</td><td>'+(h.de?fmtD(h.de):'')+'</td><td>'+h.paid.toFixed(2)+'</td><td>'+h.off.toFixed(2)+'</td><td class="'+(h.diff>0?'pos':h.diff<0?'neg':'')+'">'+h.diff.toFixed(2)+'</td><td>'+(h.payMode==='cheque'?'Chèque':h.payMode==='tpe'?'TPE':'Espèces')+'</td><td>'+(h.payRef||'')+'</td></tr>';});html+='</tbody></table></body></html>';var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'}));a.download='eurassurance-'+new Date().toISOString().slice(0,10)+'.xls';a.click();}
function exportCSV(){ldH();if(!HIST.length){alert('Pas de données');return;}var rows=['N°;Date;Heure;Agent;Client;Immat;Police;Assurance;Debut;Fin;Paye;Officiel;Ecart;Mode;Ref'];HIST.forEach(function(h){rows.push([h.num,h.date,h.time||'',h.user,h.client,h.plate||'',h.police||'',h.ins,h.ds?fmtD(h.ds):'',h.de?fmtD(h.de):'',h.paid.toFixed(2),h.off.toFixed(2),h.diff.toFixed(2),h.payMode==='cheque'?'Cheque':h.payMode==='tpe'?'TPE':'Especes',h.payRef||''].join(';'));});var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+rows.join('\n')],{type:'text/csv;charset=utf-8'}));a.download='eurassurance-'+new Date().toISOString().slice(0,10)+'.csv';a.click();}

function dlBlob(content,type,filename){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:type}));a.download=filename;a.click();}
function exportArchivesCSV(){
ldCash();var days=CASH.filter(function(s){return s.openBal!=null;});
if(!days.length){alert(LANG==='fr'?'Aucune donnée':'لا توجد بيانات');return;}
var rows=['Date;Ouverture;Compte;Attendu;Ecart;Operations;Statut'];
days.forEach(function(s){
var exp=getExpectedBalance(s.date),diff=s.counted!=null?Math.round((s.counted-exp)*100)/100:'';
var st=s.closed?(diff===''?'Cloture':(Math.abs(diff)<0.01?'Conforme':(diff>0?'Excedent':'Deficit'))):'En cours';
rows.push([s.date,s.openBal.toFixed(2),s.counted!=null?s.counted.toFixed(2):'',exp.toFixed(2),diff!==''?diff.toFixed(2):'',getAllOpsForDate(s.date).length,st].join(';'));
});
dlBlob('\uFEFF'+rows.join('\n'),'text/csv;charset=utf-8','archives-'+new Date().toISOString().slice(0,10)+'.csv');
}
function exportJournalCSV(){
ldCash();ldH();
var rows=[];
HIST.forEach(function(h){rows.push({sortKey:h.date.split('/').reverse().join('')+(h.time||'00:00'),date:h.date,desc:'Operation '+(h.num||'')+' - '+(h.client||''),credit:h.off||0,debit:0});});
CASH.forEach(function(s){if(s.openBal!=null)rows.push({sortKey:s.date.split('/').reverse().join('')+'00:00',date:s.date,desc:'Ouverture de caisse',credit:0,debit:0,isOpen:true,amt:s.openBal});});
rows.sort(function(a,b){return a.sortKey.localeCompare(b.sortKey);});
if(!rows.length){alert(LANG==='fr'?'Aucune donnée':'لا توجد بيانات');return;}
var bal=0,out=['Date;Description;Credit;Debit;Solde'];
rows.forEach(function(r){if(r.isOpen){bal=r.amt;out.push([r.date,r.desc,'','',bal.toFixed(2)].join(';'));return;}bal+=r.credit-r.debit;out.push([r.date,r.desc,r.credit?r.credit.toFixed(2):'',r.debit?r.debit.toFixed(2):'',bal.toFixed(2)].join(';'));});
dlBlob('\uFEFF'+out.join('\n'),'text/csv;charset=utf-8','journal-comptable-'+new Date().toISOString().slice(0,10)+'.csv');
}
function exportD(){localStorage.setItem('eurv102_last_bk',Date.now());var b=document.getElementById('backup-banner');if(b)b.classList.remove('show');ldH();ldU();ldCash();ldMoves();var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({history:HIST,users:USERS,cash:CASH,cashMoves:CASH_MOVES,clients:(function(){ldC();return CLIENTS;})(),renewals:(function(){ldRenewals();return RT_CLIENTS;})(),prices:collectPrices(),autre:ldAutre(),agency:JSON.parse(localStorage.getItem('eurv102_ci')||'null'),version:'5.1',date:new Date().toISOString()},null,2)],{type:'application/json'}));a.download='eurassurance-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();}
function importD(input){var file=input.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){try{var data=JSON.parse(e.target.result);if(data.history){HIST=data.history;svH();}if(data.users){USERS=data.users;svU();}if(data.cash){CASH=data.cash;svCash();}if(data.cashMoves){CASH_MOVES=data.cashMoves;svMoves();}if(data.clients){CLIENTS=data.clients;svC();}if(data.renewals){RT_CLIENTS=data.renewals;svRenewals();}if(data.autre){svAutre(data.autre);}if(data.prices){applyPrices(data.prices);if(window.fbSet)window.fbSet('prices',collectPrices());}alert('✅ '+HIST.length+' enregistrement(s) importé(s)');renderLogin();renderUsersPanel();updateQuickStats();}catch(err){alert('❌ Erreur fichier');}};reader.readAsText(file);input.value='';}

function checkBackup(){var last=localStorage.getItem('eurv102_last_bk');if(!last){localStorage.setItem('eurv102_last_bk',Date.now());return;}if((Date.now()-parseInt(last))/86400000>=7){var b=document.getElementById('backup-banner');if(b)b.classList.add('show');}}

function buildShareTxt(){
var ci=JSON.parse(localStorage.getItem('eurv102_ci')||'{}');
var num=document.getElementById('r-num').textContent,client=document.getElementById('r-client').textContent,ins=document.getElementById('r-ins').textContent,paid=document.getElementById('r-paid').textContent,off=document.getElementById('r-off').textContent,tv=document.getElementById('r-tv').textContent,tl=document.getElementById('r-tl').textContent;
var dr=document.getElementById('r-dr');var dates=dr&&dr.style.display!=='none'?document.getElementById('r-dates').textContent:'';
var sep='-------------------';
var lines=[''+(ci.name||'EUR assurance')+'',sep+' '+num,'Date: '+new Date().toLocaleDateString('fr-FR'),'Client: '+client,'Assurance: '+ins];
if(dates)lines.push('Période: '+dates);
lines.push(sep,'Payé: '+paid,'Officiel: '+off,sep,tl+': '+tv+'');
if(ci.phone)lines.push('Tél: '+ci.phone);
return lines.join('\n');
}
function shareWA(){window.open('https://wa.me/?text='+encodeURIComponent(buildShareTxt()),'_blank');}
function copyRec(){var txt=buildShareTxt();if(navigator.clipboard)navigator.clipboard.writeText(txt).then(function(){alert('✅ Copié!');});else{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);alert('✅ Copié!');}}
function shareNative(){if(navigator.share)navigator.share({text:buildShareTxt()});else copyRec();}

function showDailyReport(){
ldH();ldCash();ldMoves();var today=new Date().toLocaleDateString('fr-FR');
var recs=HIST.filter(function(h){return h.date===today;});
var dayMoves=getMovesForDate(today);
var ci=JSON.parse(localStorage.getItem('eurv102_ci')||'{}');
var tPaid=0,tRef=0,tDebt=0;
recs.forEach(function(h){tPaid+=h.paid||0;if(h.diff>0)tRef+=h.diff;if(h.diff<0)tDebt+=Math.abs(h.diff);});
var html='<h2 style="color:#0f2440;text-align:center;margin-bottom:4px">'+(ci.name||'EUR assurance')+'</h2><div style="text-align:center;font-size:.82rem;color:#666;margin-bottom:18px">Rapport journalier — '+today+(ci.phone?' | '+ci.phone:'')+'</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px"><div style="background:#f5e6c8;border:1px solid #d4a43a;border-radius:9px;padding:12px;text-align:center"><div style="font-size:1.2rem;font-weight:800;color:#0f2440">'+recs.length+'</div><div style="font-size:.72rem;color:#888">Opérations</div></div><div style="background:#e0f5ec;border:1px solid #0a8a5f;border-radius:9px;padding:12px;text-align:center"><div style="font-size:1.2rem;font-weight:800;color:#0a8a5f">'+fmt(tRef)+' DH</div><div style="font-size:.72rem;color:#888">Remboursé</div></div><div style="background:#fde8e8;border:1px solid #c92a2a;border-radius:9px;padding:12px;text-align:center"><div style="font-size:1.2rem;font-weight:800;color:#c92a2a">'+fmt(tDebt)+' DH</div><div style="font-size:.72rem;color:#888">Dû</div></div></div>';
var cs=getSession(today);
if(cs&&cs.openBal!=null){
var exp=getExpectedBalance(today);
html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px"><div style="background:#fff8e8;border:1px solid #d4a43a;border-radius:9px;padding:10px;text-align:center"><div style="font-size:1rem;font-weight:800;color:#0f2440">'+fmt(cs.openBal)+' DH</div><div style="font-size:.68rem;color:#888">Ouverture caisse</div></div><div style="background:#fff8e8;border:1px solid #d4a43a;border-radius:9px;padding:10px;text-align:center"><div style="font-size:1rem;font-weight:800;color:#0f2440">'+fmt(exp)+' DH</div><div style="font-size:.68rem;color:#888">Solde attendu</div></div><div style="background:#fff8e8;border:1px solid #d4a43a;border-radius:9px;padding:10px;text-align:center"><div style="font-size:1rem;font-weight:800;color:#0f2440">'+(cs.counted!=null?fmt(cs.counted)+' DH':'—')+'</div><div style="font-size:.68rem;color:#888">Compté</div></div></div>';
}
if(recs.length){html+='<table class="dr-tbl"><thead><tr><th>N°</th><th>Agent</th><th>Client</th><th>Immat.</th><th>Assurance</th><th>Mode</th><th>Payé DH</th><th>Off. DH</th><th>Écart DH</th></tr></thead><tbody>';recs.forEach(function(h){var ec=h.diff>0?'color:#0a8a5f':h.diff<0?'color:#c92a2a':'';html+='<tr><td style="font-family:monospace;font-size:.74rem">'+h.num+'</td><td>'+(h.av||'')+' '+(h.user||'')+'</td><td>'+h.client+'</td><td style="font-size:.74rem">'+(h.plate||'—')+'</td><td style="font-size:.74rem">'+h.ins+'</td><td>'+(h.payMode==='cheque'?'📄':h.payMode==='tpe'?'💳':'💵')+'</td><td>'+fmt(h.paid)+'</td><td>'+fmt(h.off)+'</td><td style="font-weight:800;'+ec+'">'+fmt(h.diff)+'</td></tr>';});html+='</tbody></table>';}else html+='<div style="text-align:center;padding:40px;color:#999">Aucune opération ce jour</div>';
if(dayMoves.length){
html+='<div style="margin-top:14px;font-weight:800;font-size:.82rem;margin-bottom:6px">💸 '+(LANG==='fr'?'Mouvements de caisse':'حركات الصندوق')+'</div>';
html+='<table class="dr-tbl"><thead><tr><th>Heure</th><th>Type</th><th>Nom</th><th>Motif</th><th>DH</th></tr></thead><tbody>';
dayMoves.forEach(function(m){html+='<tr><td>'+m.time+'</td><td style="color:'+(m.type==='out'?'#c92a2a':'#1d4ed8')+';font-weight:700">'+(m.type==='out'?'➖ Sortie':'➕ Entrée')+'</td><td>'+(m.person||'—')+'</td><td>'+(m.reason||'—')+'</td><td style="font-weight:800;color:'+(m.type==='out'?'#c92a2a':'#1d4ed8')+'">'+(m.type==='out'?'-':'+')+fmt(m.amount)+'</td></tr>';});
html+='</tbody></table>';
}
html+='<div style="margin-top:18px;border-top:1px solid #ddd;padding-top:10px;display:flex;justify-content:space-between;font-size:.72rem;color:#999"><span>EUR assurance — Usage interne</span><span>'+new Date().toLocaleString('fr-FR')+'</span></div>';
document.getElementById('dr-content').innerHTML=html;document.getElementById('daily-report').classList.add('show');
setTimeout(function(){window.print();},400);
}

