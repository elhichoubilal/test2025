/* ═══ EUR assurance — 07-login-lang-lock.js ═══
   اللغة، شاشة الدخول، الجلسة والقفل التلقائي
   (مقتطع من app.js الأصلي، الأسطر 605–719، بالترتيب نفسه) */
function setBM(v){BM=v;['none','bonus','m20','m30'].forEach(function(k){document.getElementById('bm-'+k).className='tbtn'+(k===v?' on':'');});fillP();}

function setHideUsage(hide){
  if(hide)localStorage.setItem('eurv_hide_usage','1');
  else localStorage.removeItem('eurv_hide_usage');
  var el=document.getElementById('hide-usage-toggle');
  if(el)el.checked=hide;
}
function ldHideUsageSetting(){
  var el=document.getElementById('hide-usage-toggle');
  if(el)el.checked=!!localStorage.getItem('eurv_hide_usage');
}
function setUsage(v){USAGE=v;document.getElementById('usage-val').value=v;var map={'Personnel':'us-perso','Taxi':'us-taxi','Transport Commercial':'us-tc'};Object.keys(map).forEach(function(k){var el=document.getElementById(map[k]);if(el)el.className='tbtn'+(k===v?' on':'');});}
function setPayMode(m){PAY_MODE=m;['cash','cheque','tpe'].forEach(function(k){document.getElementById('pm-'+k).className='tbtn'+(k===m?' on':'');});document.getElementById('cheque-field').style.display=m==='cheque'?'block':'none';document.getElementById('tpe-field').style.display=m==='tpe'?'block':'none';}
function getPayRef(){return PAY_MODE==='cheque'?(document.getElementById('cheque-num').value||''):PAY_MODE==='tpe'?(document.getElementById('tpe-ref').value||''):'';}

var PAGE_TITLES={dash:{ar:'لوحة التحكم',fr:'Tableau de bord'},calc:{ar:'حساب جديد',fr:'Nouveau calcul'},hist:{ar:'السجل',fr:'Historique'},stats:{ar:'الإحصاء',fr:'Statistiques'},clients:{ar:'الزبائن',fr:'Clients'},renewals:{ar:'متابعة التجديدات',fr:'Renouvellements'},caisse:{ar:'صندوق اليوم',fr:'Caisse du jour'},archives:{ar:'الأرشيف',fr:'Archives'},journal:{ar:'السجل المحاسبي',fr:'Journal comptable'},reports:{ar:'التقارير',fr:'Rapports'},prices:{ar:'إعداد الأسعار',fr:'Configuration prix'},sync:{ar:'المزامنة',fr:'Sync & Utilisateurs'}};
function setLang(l){
LANG=l;var fr=l==='fr';
document.body.className=fr?'fr':'';document.documentElement.lang=fr?'fr':'ar';document.documentElement.dir=fr?'ltr':'rtl';
localStorage.setItem('eurv102_lang',l);
document.getElementById('ls-ar').className='lsbtn'+(l==='ar'?' on':'');
document.getElementById('ls-fr').className='lsbtn'+(l==='fr'?' on':'');
var lt=document.getElementById('l-title');if(lt)lt.textContent=fr?'Choisissez votre nom':'اختر اسمك للبدء';
if(setLang._busy)return;   /* منع إعادة الدخول: الصفحة تُرسم مرة واحدة */
setLang._busy=true;try{refreshActivePage();}finally{setLang._busy=false;}
}
function refreshActivePage(){
var active=document.querySelector('.page.active');
if(!active)return;
var pg=active.id.replace('page-','');
if(pg==='hist')renderHist();
else if(pg==='stats')renderStats();
else if(pg==='clients')renderClients();
else if(pg==='dash')renderDashboard();
else if(pg==='caisse')renderCaissePage();
else if(pg==='archives')renderArchivesPage();
else if(pg==='journal')renderJournalPage();
else if(pg==='reports')renderReportsPage();
else if(pg==='renewals')renderRenewalsPage();
}
function updateTitle(pg){
var t=PAGE_TITLES[pg]||{ar:'—',fr:'—'};
document.getElementById('tb-title').innerHTML='<span data-ar>'+t.ar+'</span><span data-fr>'+t.fr+'</span>';
setLang(LANG);
}

function renderLogin(){
ldU();ldH();
var g=document.getElementById('ugrid');
if(!USERS.length){g.innerHTML='<div class="no-u">'+(LANG==='fr'?'Aucun utilisateur<br>Cliquer Admin pour ajouter':'لا يوجد مستخدمون<br>اضغط Admin لإضافتهم')+'</div>';return;}
var today=new Date().toLocaleDateString('fr-FR');
g.innerHTML=USERS.map(function(u,idx){
var tc=HIST.filter(function(h){return h.user===u.n&&h.date===today;}).length;
var le=HIST.filter(function(h){return h.user===u.n;});
var lt=le.length?le[0].date+(le[0].time?' '+le[0].time:''):'';
return'<button class="ubtn" data-uidx="'+idx+'">'+(tc>0?'<span class="u-today">'+tc+'</span>':'')+'<span class="uav">'+escHtml(u.av)+'</span><div class="uname">'+escHtml(u.n)+'</div>'+(lt?'<div class="u-last">⏱ '+lt+'</div>':'')+'</button>';
}).join('');
g.querySelectorAll('.ubtn').forEach(function(btn){btn.onclick=function(){var u=USERS[parseInt(this.dataset.uidx)];if(u)selUser(u.n,u.av);};});
}
function selUser(n,av,isAdmin){
CUR={n:n,av:av,isAdmin:!!isAdmin};
localStorage.setItem('eurv102_last',JSON.stringify(CUR));
var logs=JSON.parse(localStorage.getItem('eurv102_log')||'[]');
logs.unshift({user:n,av:av,time:new Date().toLocaleString('fr-FR'),admin:!!isAdmin});
if(logs.length>50)logs=logs.slice(0,50);
localStorage.setItem('eurv102_log',JSON.stringify(logs));
ldU();var ui=USERS.findIndex(function(u){return u.n===n;});
if(ui>=0){USERS[ui].lastLogin=new Date().toLocaleString('fr-FR');svU();}
showApp();
}
function showApp(){
document.getElementById('login-screen').style.display='none';
document.getElementById('app-shell').classList.add('show');
var avEl=document.getElementById('sb-av');
if(avEl){avEl.textContent=CUR.av||'👤';avEl.title=CUR.n+(CUR.isAdmin?' (ADMIN)':'');avEl.style.borderColor=CUR.isAdmin?'var(--gold-d)':'var(--border2)';}
document.getElementById('h-rec').textContent=curN();
document.querySelectorAll('.admin-only').forEach(function(el){el.classList.toggle('show',CUR.isAdmin);});
checkDraft();updateQuickStats();resetLockTimer();initAC();checkBackup();renderDashboard();
}
function backToLogin(){
document.getElementById('lock-screen').classList.remove('show');
document.getElementById('app-shell').classList.remove('show');
document.getElementById('login-screen').style.display='flex';
renderLogin();
}
function confirmLogout(){if(confirm(LANG==='fr'?"Changer d'utilisateur ?":'تغيير المستخدم؟'))backToLogin();}

// ── أزرار الفوتر السريعة ──
function quickRecalc(){
if(typeof RT_PAY_ID!=='undefined')RT_PAY_ID=null;
navTo('calc');
['client','plate','police-num'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
var an=document.getElementById('attest-num');if(an)an.value='';
var paid=document.getElementById('paid');if(paid)paid.value='';
var mt=document.getElementById('man-tog');if(mt&&mt.checked){mt.checked=false;togMan();}
var today=new Date().toISOString().slice(0,10);
var ds=document.getElementById('date-s');if(ds){ds.value=today;calcEnd();}
fillP();
window.scrollTo(0,0);
document.getElementById('app-cnt').scrollTo(0,0);
}
function quickFacture(){
if(!LAST||!LAST.paid){navTo('calc');alert(LANG==='fr'?"Faites d'abord un calcul, puis générez la facture":'قم بالحساب أولاً ثم أصدر الفاتورة');return;}
buildPieceReceipt();
}

function resetLockTimer(){if(LOCK_TIMER)clearTimeout(LOCK_TIMER);LOCK_TIMER=setTimeout(lockScreen,LOCK_MINUTES*60*1000);}
function lockScreen(){document.getElementById('lock-ico').textContent=CUR.av||'🔒';document.getElementById('lock-name').textContent=CUR.n;document.getElementById('lock-screen').classList.add('show');document.getElementById('lock-pwd').value='';}
function unlockSession(){
var pwd=document.getElementById('lock-pwd').value;
if(!CUR.isAdmin){document.getElementById('lock-screen').classList.remove('show');resetLockTimer();return;}
if(isAdminPwd(pwd)){document.getElementById('lock-screen').classList.remove('show');document.getElementById('lock-pwd').value='';resetLockTimer();}
else{document.getElementById('lock-pwd').style.borderColor='var(--red)';setTimeout(function(){document.getElementById('lock-pwd').style.borderColor='';},1000);}
}
['click','keydown','touchstart'].forEach(function(ev){document.addEventListener(ev,function(){if(CUR.n)resetLockTimer();},true);});

