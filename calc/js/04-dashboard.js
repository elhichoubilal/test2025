/* ═══ EUR assurance — 04-dashboard.js ═══
   لوحة القيادة
   (مقتطع من app.js الأصلي، الأسطر 397–428، بالترتيب نفسه) */
function renderDashboard(){
ldH();ldCash();
var t=todayStr();
var s=getSession(t);
var ops=getAllOpsForDate(t);
var revenue=ops.reduce(function(a,h){return a+(h.off||0);},0);
var refunds=ops.reduce(function(a,h){return a+(h.diff||0);},0);
var balance=s&&s.openBal!=null?getExpectedBalance(t):null;
document.getElementById('dk-balance').textContent=balance!=null?fmtS(balance)+' DH':'—';
document.getElementById('dk-clients').textContent=ops.length;
document.getElementById('dk-revenue').textContent=fmtS(revenue)+' DH';
document.getElementById('dk-refunds').textContent=fmtS(refunds)+' DH';

var byAgent={};
ops.forEach(function(h){if(!h.user)return;byAgent[h.user]=(byAgent[h.user]||0)+(h.off||0);});
var top=Object.keys(byAgent).sort(function(a,b){return byAgent[b]-byAgent[a];})[0];
var elTop=document.getElementById('dk-top-agent');
if(top){
elTop.innerHTML='<div class="insight-row"><div class="insight-ic">⭐</div><div class="insight-info"><div class="insight-title">'+(LANG==='fr'?'Agent':'الموظف')+'</div><div class="insight-val">'+top+' — '+fmt(byAgent[top])+' DH</div></div></div>';
}else{
elTop.innerHTML='<div class="empty" style="padding:24px">—</div>';
}

var recent=ops.slice(0,5);
var elRec=document.getElementById('dk-recent-ops');
if(recent.length){
elRec.innerHTML=recent.map(function(h){return'<div class="inv-row"><span class="il">'+(h.client||'—')+' · '+(h.ins||'')+'</span><span class="iv">'+fmt(h.off)+' DH</span></div>';}).join('');
}else{
elRec.innerHTML='<div class="empty" style="padding:24px">—</div>';
}
}

