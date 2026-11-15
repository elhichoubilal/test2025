/* ═══ EUR assurance — 15-nav-pwa-init.js ═══
   التنقل بين الصفحات، التثبيت كتطبيق، التهيئة عند الإقلاع
   (مقتطع من app.js الأصلي، الأسطر 2012–2106، بالترتيب نفسه) */
function navTo(pg){
document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
document.querySelectorAll('.nbtn').forEach(function(b){b.classList.remove('on');});
document.getElementById('page-'+pg).classList.add('active');
document.querySelectorAll('.nbtn[data-pg="'+pg+'"]').forEach(function(b){b.classList.add('on');});
updateTitle(pg);setLang(LANG);
if(pg==='hist'){ldH();renderHist();}
if(pg==='stats'){ldH();renderStats();}
if(pg==='clients'){ldC();renderClients();}
if(pg==='dash'){renderDashboard();}
if(pg==='caisse'){renderCaissePage();}
if(pg==='archives'){renderArchivesPage();}
if(pg==='journal'){renderJournalPage();}
if(pg==='reports'){renderReportsPage();}
if(pg==='prices'){renderAutreAdmin();}
if(pg==='pdftpl'){renderPdfTplPage();}
if(pg==='renewals'){initRenewalsEvents();renderRenewalsPage();}
}

// PWA
window.addEventListener('beforeinstallprompt',function(e){
e.preventDefault();deferredPWA=e;
document.getElementById('pwa-banner').classList.add('show');
document.getElementById('tb-install').classList.add('show');
});
document.getElementById('tb-install').onclick=triggerInstall;
document.getElementById('pwa-install-btn').onclick=triggerInstall;
function triggerInstall(){if(!deferredPWA)return;deferredPWA.prompt();deferredPWA.userChoice.then(function(){deferredPWA=null;document.getElementById('pwa-banner').classList.remove('show');document.getElementById('tb-install').classList.remove('show');});}
function dismissPWA(){document.getElementById('pwa-banner').classList.remove('show');localStorage.setItem('pwa-dismissed',Date.now());}
window.addEventListener('appinstalled',function(){document.getElementById('pwa-banner').classList.remove('show');document.getElementById('tb-install').classList.remove('show');});

// Service Worker
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(function(e){console.log('SW:',e);});}

// INIT
window.onload=function(){
ldH();ldU();ldPUI();ldCI();

buildCVGrid('cv-grid','cv',[4,5,6,7,8,9,10,11,12,13,14],6);
buildCVGrid('comm-cv-grid','comm-cv',[6,7,8,9,10,11,12,13,14],6);

document.getElementById('adm-show').onclick=function(){document.getElementById('adm-a1').style.display='none';document.getElementById('adm-a2').style.display='block';document.getElementById('adm-pwd-login').focus();};
document.getElementById('adm-back').onclick=function(){document.getElementById('adm-a1').style.display='block';document.getElementById('adm-a2').style.display='none';document.getElementById('adm-pwd-login').value='';document.getElementById('adm-err').style.display='none';};
document.getElementById('adm-ok').onclick=function(){if(isAdminPwd(document.getElementById('adm-pwd-login').value)){document.getElementById('adm-a1').style.display='block';document.getElementById('adm-a2').style.display='none';document.getElementById('adm-pwd-login').value='';selUser('Admin','🔑',true);}else{document.getElementById('adm-err').style.display='block';document.getElementById('adm-pwd-login').value='';document.getElementById('adm-pwd-login').focus();}};
document.getElementById('adm-pwd-login').onkeydown=function(e){if(e.key==='Enter')document.getElementById('adm-ok').click();};
document.getElementById('lock-pwd').onkeydown=function(e){if(e.key==='Enter')unlockSession();};

document.querySelectorAll('.nbtn[data-pg]').forEach(function(btn){
btn.onclick=function(){navTo(this.dataset.pg);};
});

document.getElementById('ls-ar').onclick=function(){setLang('ar');refreshActivePage();};
document.getElementById('ls-fr').onclick=function(){setLang('fr');refreshActivePage();};

document.getElementById('calc-btn').onclick=function(){doCalc(false);};
document.getElementById('val-btn').onclick=valider;
document.getElementById('print-btn').onclick=function(){if(buildRec())document.getElementById('receipt').classList.add('show');};
document.getElementById('piece-btn').onclick=buildPieceReceipt;
document.getElementById('paid').oninput=autoCalc;
document.getElementById('client').oninput=saveDraft;
document.getElementById('plate').oninput=saveDraft;

document.querySelectorAll('.avo').forEach(function(a){a.onclick=function(){document.querySelectorAll('.avo').forEach(function(x){x.classList.remove('sel');});this.classList.add('sel');SEL_AV=this.dataset.av;};});

document.getElementById('date-s').value=new Date().toISOString().split('T')[0];
document.getElementById('adm-pwd2').onkeydown=function(e){if(e.key==='Enter')checkAdm2();};

var savedLang=localStorage.getItem('eurv102_lang')||'ar';
setLang(savedLang);setDur(6);setBM('none');setPayMode('cash');setType('voiture');setFuel('d');setUsage('Personnel');
buildTpvDurGrid();setTarif('wafa');

renderLogin();

var lu=JSON.parse(localStorage.getItem('eurv102_last')||'null');
if(lu&&lu.n){ldU();var found=lu.isAdmin||USERS.find(function(u){return u.n===lu.n;});if(found)selUser(lu.n,lu.av,lu.isAdmin||false);}

fillP();updateTitle('calc');
ldPdfTpl();fillTplSelect();
setPieceNumMode(localStorage.getItem('eurv102_piece_mode')||'auto');
var lastManualPiece=localStorage.getItem('eurv102_piece_manual_last');
if(lastManualPiece)document.getElementById('piece-num-manual').value=lastManualPiece;

document.getElementById('ft-year').textContent=new Date().getFullYear();
updateFooterClock();
setInterval(updateFooterClock,1000);
};

function updateFooterClock(){
var el=document.getElementById('ft-clock');
if(!el)return;
var d=new Date();
el.textContent=d.toLocaleTimeString(LANG==='fr'?'fr-FR':'ar-MA',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}


