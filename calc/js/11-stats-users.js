/* ═══ EUR assurance — 11-stats-users.js ═══
   الإحصاءات، المستخدمون، سجل الدخول
   (مقتطع من app.js الأصلي، الأسطر 1370–1426، بالترتيب نفسه) */
function renderStats(){
ldH();
var source=CUR.isAdmin?HIST:HIST.filter(function(h){return h.user===CUR.n;});
var bu={},tr=0,td=0,tc=0;
source.forEach(function(h){var u=h.user||'?';if(!bu[u])bu[u]={n:u,av:h.av||'👤',cnt:0,ref:0,debt:0,col:0};bu[u].cnt++;bu[u].col+=h.paid||0;tc+=h.paid||0;if(h.diff>0){bu[u].ref+=h.diff;tr+=h.diff;}if(h.diff<0){bu[u].debt+=Math.abs(h.diff);td+=Math.abs(h.diff);}});
document.getElementById('st-n').textContent=source.length;
document.getElementById('st-c').textContent=fmtS(tc);
document.getElementById('st-r').textContent=fmtS(tr);
document.getElementById('st-d').textContent=fmtS(td);

var byIns={},byDay={},clientSet={};
source.forEach(function(h){
var ins=h.ins||'?';byIns[ins]=(byIns[ins]||0)+1;
byDay[h.date]=(byDay[h.date]||0)+(h.off||0);
if(h.client)clientSet[h.client]=1;
});
var topIns=Object.keys(byIns).sort(function(a,b){return byIns[b]-byIns[a];})[0];
var avgVal=source.length?source.reduce(function(a,h){return a+(h.off||0);},0)/source.length:0;
var bestDay=Object.keys(byDay).sort(function(a,b){return byDay[b]-byDay[a];})[0];
document.getElementById('st-insights').innerHTML=
'<div class="insight-row"><div class="insight-ic">🛡️</div><div class="insight-info"><div class="insight-title">'+(LANG==='fr'?"Type d'assurance le plus utilisé":'أكثر نوع تأمين استخداماً')+'</div><div class="insight-val">'+(topIns||'—')+(topIns?' ('+byIns[topIns]+')':'')+'</div></div></div>'+
'<div class="insight-row"><div class="insight-ic">📊</div><div class="insight-info"><div class="insight-title">'+(LANG==='fr'?"Valeur moyenne d'opération":'متوسط قيمة العملية')+'</div><div class="insight-val">'+fmt(avgVal)+' DH</div></div></div>'+
'<div class="insight-row"><div class="insight-ic">🏆</div><div class="insight-info"><div class="insight-title">'+(LANG==='fr'?'Meilleur jour de vente':'أعلى يوم مبيعات')+'</div><div class="insight-val">'+(bestDay?bestDay+' — '+fmt(byDay[bestDay])+' DH':'—')+'</div></div></div>'+
'<div class="insight-row"><div class="insight-ic">👥</div><div class="insight-info"><div class="insight-title">'+(LANG==='fr'?'Nombre de clients':'عدد الزبائن')+'</div><div class="insight-val">'+Object.keys(clientSet).length+'</div></div></div>';

var uList=Object.values(bu).sort(function(a,b){return b.col-a.col;});
var maxC=uList.length?uList[0].col:1;
document.getElementById('st-chart-body').innerHTML=uList.map(function(u){
var pct=maxC>0?Math.round(u.col/maxC*100):0;
return'<div class="bar-row"><span class="bar-av">'+escHtml(u.av)+'</span><div class="bar-info"><div class="bar-top"><span style="color:var(--text)">'+escHtml(u.n)+'</span><span class="bar-val">'+fmtS(u.col)+' DH</span></div><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div><div class="bar-cnt">'+u.cnt+' op.</div></div></div>';
}).join('');
document.getElementById('stats-body').innerHTML=uList.map(function(u){
return'<div class="sc"><div style="display:flex;align-items:center;gap:9px;margin-bottom:10px"><span style="font-size:1.4rem">'+u.av+'</span><div><div style="font-size:.88rem;font-weight:800;color:var(--text)">'+u.n+'</div><div style="font-size:.65rem;color:var(--text3)">'+u.cnt+' op.</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px"><div style="text-align:center;padding:9px;background:var(--amber-bg);border:1px solid rgba(217,119,6,.1);border-radius:9px"><div style="font-size:.86rem;font-weight:800;color:var(--amber);font-family:\'JetBrains Mono\',monospace">'+fmtS(u.col)+'</div><div style="font-size:.6rem;color:var(--text3);margin-top:2px;font-weight:600">DH collecté</div></div><div style="text-align:center;padding:9px;background:var(--green-bg);border:1px solid rgba(10,138,95,.1);border-radius:9px"><div style="font-size:.86rem;font-weight:800;color:var(--green);font-family:\'JetBrains Mono\',monospace">'+fmtS(u.ref)+'</div><div style="font-size:.6rem;color:var(--text3);margin-top:2px;font-weight:600">DH remb.</div></div><div style="text-align:center;padding:9px;background:var(--red-bg);border:1px solid rgba(220,38,38,.1);border-radius:9px"><div style="font-size:.86rem;font-weight:800;color:var(--red);font-family:\'JetBrains Mono\',monospace">'+fmtS(u.debt)+'</div><div style="font-size:.6rem;color:var(--text3);margin-top:2px;font-weight:600">DH dû</div></div></div></div>';
}).join('');
setLang(LANG);
}

function renderUsersPanel(){
ldU();var el=document.getElementById('users-list');
if(!USERS.length){el.innerHTML='<div style="color:var(--text3);text-align:center;padding:14px;font-size:.8rem">—</div>';return;}
el.innerHTML=USERS.map(function(u,i){return'<div class="ul-item"><div style="display:flex;align-items:center;gap:9px"><span style="font-size:1.3rem">'+escHtml(u.av)+'</span><div><div style="font-size:.86rem;font-weight:700;color:var(--text)">'+escHtml(u.n)+'</div>'+(u.lastLogin?'<div style="font-size:.62rem;color:var(--text3)">⏱ '+u.lastLogin+'</div>':'')+'</div></div><button class="ul-del" onclick="delU('+i+')">🗑️</button></div>';}).join('');
}
function addUser(){ldU();var n=document.getElementById('new-uname').value.trim();if(!n)return;if(USERS.find(function(u){return u.n===n;})){alert(LANG==='fr'?'Nom déjà utilisé':'الاسم موجود');return;}USERS.push({n,av:SEL_AV||'👨'});svU();document.getElementById('new-uname').value='';renderUsersPanel();renderLogin();}
function delU(i){if(!confirm((LANG==='fr'?'Supprimer ':'حذف ')+USERS[i].n+'?'))return;USERS.splice(i,1);svU();renderUsersPanel();renderLogin();}
function checkAdm2(){
if(isAdminPwd(document.getElementById('adm-pwd2').value)){
document.getElementById('adm-lock2').style.display='none';document.getElementById('adm-panel2').style.display='block';document.getElementById('log-card').style.display='block';
renderUsersPanel();renderAccessLog();
}else{alert(LANG==='fr'?'Incorrect':'كلمة السر خاطئة');document.getElementById('adm-pwd2').value='';}
}
function renderAccessLog(){
var logs=JSON.parse(localStorage.getItem('eurv102_log')||'[]');
var b=document.getElementById('log-body');
if(!logs.length){b.innerHTML='<div style="color:var(--text3);font-size:.78rem;text-align:center;padding:10px">—</div>';return;}
b.innerHTML=logs.slice(0,20).map(function(l){return'<div class="log-item"><span style="font-weight:700;color:var(--text)">'+escHtml(l.av||'👤')+' '+escHtml(l.user)+(l.admin?' 🔑':'')+'</span><span style="color:var(--text3)">'+l.time+'</span></div>';}).join('');
}

