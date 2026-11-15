/* ══════════════════════════════════════════════════════════
   EUR assurance — firebase-sync.js   (v5: قاعدة RenewPro الوحيدة)
   قبل: الحاسبة كانت كتشارجا Firebase بوحدها وكتخدم بـ Realtime Database.
   دابا: كتستعمل الاتصال ديال RenewPro (Firestore، مجموعة «calc») عبر CalcStore فالنافذة الأم.
   نفس الواجهة القديمة (fbSet / fbGet / fbListen) → باقي ملفات الحاسبة ومحرك الأثمنة ما تمساوش.
   كل التبادل مع النافذة الأم كيكون بنصوص JSON.
══════════════════════════════════════════════════════════ */
(function(){
'use strict';
var P = null;
try { if (window.parent && window.parent !== window && window.parent.CalcStore) P = window.parent; } catch (e) { P = null; }

function setFBStatus(online){
  var el = document.getElementById('fb-status');
  if(!el) return;
  el.textContent = online ? '🟢' : '🔴';
  el.title = online ? 'متصل — مزامنة فورية (RenewPro)' : 'غير متصل — يعمل محلياً';
}
if (!P) {
  /* الحاسبة مفتوحة وحدها (برا RenewPro): كتخدم محلياً فقط */
  window.fbSet = function(){}; window.fbGet = function(k, cb){ cb(null); }; window.fbListen = function(){};
  document.addEventListener('DOMContentLoaded', function(){ setFBStatus(false); });
  return;
}
var CS = P.CalcStore;
/* v8 (RenewPro 7.13): المزامنة ولات فالبرنامج (Store8). الإطار ما بقاش كيكتب بوحدو فـ Firestore: كيعيط لـ Store8.
   (التحديثات اللي كتجي من أجهزة أخرى كيدخلها Store8 للإطار مباشرة: HIST، CASH…) */
if (P.Store8) {
  var ST = P.Store8;
  window.fbSet = function (key, data) { ST.set(key, data); };
  window.fbGet = function (key, cb) { ST.get(key, cb); };
  window.fbListen = function () {};
  window.RP_SYNCED = false;
  window.fbInitSync = function () {
    setFBStatus(false);
    var iv = setInterval(function () { var s = ST.state(); if (s.synced) { window.RP_SYNCED = true; setFBStatus(s.online !== false); clearInterval(iv);
      ['ldH', 'ldU', 'ldC', 'ldCash', 'ldMoves', 'ldPdfTpl'].forEach(function (f) { if (typeof window[f] === 'function') window[f](); });
      if (typeof renderLogin === 'function') renderLogin(); if (typeof updateQuickStats === 'function') updateQuickStats(); } }, 300);
  };
  var wrapC = function (fnName, lsKey, fbKey) { var f = window[fnName]; if (typeof f !== 'function') return; window[fnName] = function () { var r = f.apply(this, arguments); ST.pushCounter(lsKey, fbKey); return r; }; };
  window.addEventListener('load', function () { wrapC('nextN', 'eurv102_rec', 'rec'); wrapC('nextPieceNum', 'eurv102_piece', 'piece'); });
  document.addEventListener('DOMContentLoaded', function () { setTimeout(window.fbInitSync, 300); });
  return;
}
var MERGE = { history: 1, cashMoves: 1, clients: 1, renewals: 1, cash: 1, users: 1 };
var lastRemote = {};                                       // آخر نسخة سحابية (نص JSON): أساس الدمج
function toArr(v){ if(Array.isArray(v)) return v.filter(function(x){ return x != null; }); if(v && typeof v === 'object') return Object.keys(v).map(function(k){ return v[k]; }).filter(function(x){ return x != null; }); return []; }

/* حفظ ما نجحش (بلا إنترنت مثلاً): كيتحفظ فالجهاز وكيتعاود ملي يرجع الاتصال — حتى إلا تسدات الصفحة */
var PEND = {}; try { PEND = JSON.parse(localStorage.getItem('rp5_calc_pend') || '{}') || {}; } catch (e) { PEND = {}; }
function savePend(){ try { localStorage.setItem('rp5_calc_pend', JSON.stringify(PEND)); } catch (e) { } }
var retryT = null;
function push(key, base, json, merge){
  return (merge ? CS.setMerged(key, base || '[]', json) : CS.set(key, json)).then(function(){
    if (PEND[key] && PEND[key].j === json) { delete PEND[key]; savePend(); }
    setFBStatus(true);
  }).catch(function(e){
    console.warn('FB write error:', key, e); setFBStatus(false);
    PEND[key] = { b: base, j: json, m: merge ? 1 : 0 }; savePend();
    clearTimeout(retryT); retryT = setTimeout(flushPend, 20000);
  });
}
function flushPend(){
  var ks = Object.keys(PEND); if (!ks.length) return Promise.resolve();
  return Promise.all(ks.map(function(k){ var x = PEND[k]; return push(k, x.b, x.j, !!x.m); }));
}
window.addEventListener('online', function(){ setTimeout(flushPend, 1500); });
window.fbSet = function(key, data){
  var json; try { json = JSON.stringify(data); } catch (e) { return; }
  var merge = !!(MERGE[key] && Array.isArray(data));
  push(key, merge ? (lastRemote[key] || '[]') : null, json, merge);
};
window.fbGet = function(key, cb){
  CS.get(key).then(function(j){ var v = null; if(j != null){ try{ v = JSON.parse(j); }catch(e){} }
    if(MERGE[key] && v != null) lastRemote[key] = JSON.stringify(toArr(v));
    cb(v); }).catch(function(){ cb(null); });
};
window.fbListen = function(key, cb){
  CS.listen(key, function(j){ var v; try{ v = JSON.parse(j); }catch(e){ return; }
    if(MERGE[key]) lastRemote[key] = JSON.stringify(toArr(v));
    cb(v); }, window);
};
window.addEventListener('pagehide', function(){ try { CS.offAll(window); } catch (e) { } });

/* كنبداو غير ملي يكون الدخول وبيانات الحاسبة تنقلات للقاعدة الوحيدة */
function whenCloud(fn){
  var tries = 0;
  (function wait(){
    if (P.App && P.App.user && P.FB && P.FB.db) { CS.whenReady(fn); return; }
    if (++tries < 600) setTimeout(wait, 500);
  })();
}
var SYNCED = false;
if (P) window.RP_SYNCED = false;              // v6.4: 19-rt-histlink كيتسنى هادي قبل ما يكتب
window.fbInitSync = function(){
  setFBStatus(false);
  var el = document.getElementById('fb-status');
  /* v6.0.2: النقطة كتقول السبب بالضبط، والضغط عليها كيعاود يحاول */
  var why = function(){ try { return CS.reason() || ''; } catch (e) { return ''; } };
  var upd = function(){ if (SYNCED || !el) return; el.title = '⏳ ' + (why() || 'في انتظار القاعدة…'); };
  upd(); var iv = setInterval(function(){ if (SYNCED) { clearInterval(iv); return; } upd(); }, 2000);
  if (el) { el.style.cursor = 'pointer'; el.addEventListener('click', function(){
    if (SYNCED && el.textContent === '🟢') { alert('🟢 متصل بالقاعدة الوحيدة (RenewPro)'); return; }
    var r = why() || (el.title || '');
    if (confirm('🔴 ' + r + '\n\nنعاود نحاولو دابا؟')) { try { CS.recheck(); } catch (e) {} flushPend(); }
  }); }
  whenCloud(function(){ flushPend().then(doSync, doSync); });
};

function doSync(){
  var keys   = ['history','users','clients','cash','cashMoves','autreTarifs','pdfTemplates','renewals'];
  var lsKeys = ['eurv102_h','eurv102_u','eurv102_c','eurv102_cash','eurv102_cash_moves','eurv102_autre','eurv102_pdftpl','eurv102_renewals'];
  var done = 0;

  keys.forEach(function(k, i){
    fbGet(k, function(val){
      if(val !== null){
        try{ localStorage.setItem(lsKeys[i], JSON.stringify(val)); }catch(e){}
      } else {
        try{
          var local = JSON.parse(localStorage.getItem(lsKeys[i])||'null');
          if(local && (Array.isArray(local)?local.length:Object.keys(local).length)){
            fbSet(k, local);
          }
        }catch(e){}
      }
      done++;
      if(done === keys.length){
        SYNCED = true; window.RP_SYNCED = true; setFBStatus(true);
        if(typeof ldH==='function') ldH();
        if(typeof ldU==='function') ldU();
        if(typeof ldC==='function') ldC();
        if(typeof ldCash==='function') ldCash();
        if(typeof ldMoves==='function') ldMoves();
        if(typeof ldPdfTpl==='function') ldPdfTpl();
        if(typeof renderLogin==='function') renderLogin();
        if(typeof updateQuickStats==='function') updateQuickStats();
      }
    });
  });

  fbGet('prices', function(val){
    if(val !== null){
      if(typeof applyPrices==='function') applyPrices(val);
    } else if(typeof collectPrices==='function'){
      var curP = collectPrices();
      if(curP && Object.keys(curP).length) fbSet('prices', curP);
    }
  });

  fbGet('agencyInfo', function(val){
    if(val !== null){
      try{ localStorage.setItem('eurv102_ci', JSON.stringify(val)); }catch(e){}
      if(typeof ldCI==='function') ldCI();
    } else {
      try{
        var curCI = JSON.parse(localStorage.getItem('eurv102_ci')||'null');
        if(curCI) fbSet('agencyInfo', curCI);
      }catch(e){}
    }
  });

  var listeners = [
    ['history',  'eurv102_h',         function(v){if(typeof HIST!=='undefined')HIST=v;if(document.querySelector('#page-hist.active')&&typeof renderHist==='function')renderHist();if(document.querySelector('#page-dash.active')&&typeof renderDashboard==='function')renderDashboard();if(typeof updateQuickStats==='function')updateQuickStats();}],
    ['users',    'eurv102_u',         function(v){if(typeof USERS!=='undefined')USERS=v;if(typeof renderLogin==='function')renderLogin();}],
    ['cash',     'eurv102_cash',      function(v){if(typeof CASH!=='undefined')CASH=v;if(document.querySelector('#page-caisse.active')&&typeof renderCaissePage==='function')renderCaissePage();if(document.querySelector('#page-dash.active')&&typeof renderDashboard==='function')renderDashboard();}],
    ['cashMoves','eurv102_cash_moves',function(v){if(typeof CASH_MOVES!=='undefined')CASH_MOVES=v;if(document.querySelector('#page-caisse.active')&&typeof renderCaissePage==='function')renderCaissePage();}],
    ['clients',  'eurv102_c',         function(v){if(typeof CLIENTS!=='undefined')CLIENTS=v;if(document.querySelector('#page-clients.active')&&typeof renderClients==='function')renderClients();}],
    ['autreTarifs','eurv102_autre',   function(v){if(document.querySelector('#page-prices.active')&&typeof renderAutreAdmin==='function')renderAutreAdmin();if(document.querySelector('#page-calc.active')&&typeof renderAutreCalcUI==='function')renderAutreCalcUI();}],
    ['pdfTemplates','eurv102_pdftpl', function(v){if(typeof PDF_TEMPLATES!=='undefined')PDF_TEMPLATES=v;}],
    ['renewals', 'eurv102_renewals',  function(v){if(typeof RT_CLIENTS!=='undefined')RT_CLIENTS=v;if(document.querySelector('#page-renewals.active')&&typeof renderRenewalsPage==='function')renderRenewalsPage();}],
    ['prices',   null,                 function(v){if(typeof applyPrices==='function')applyPrices(v);}],
    ['agencyInfo','eurv102_ci',       function(v){try{localStorage.setItem('eurv102_ci',JSON.stringify(v));}catch(e){}if(typeof ldCI==='function')ldCI();}]
  ];

  listeners.forEach(function(item){
    fbListen(item[0], function(val){
      if(val===null) return;
      if(item[1]) try{localStorage.setItem(item[1],JSON.stringify(val));}catch(e){}
      item[2](val);
      setFBStatus(true);
    });
  });
}

/* ── مزامنة عدّادات الترقيم بين الأجهزة: كل جهاز يأخذ أعلى رقم معروف، فلا يتكرر رقم عملية أو وصل ── */
function syncCounter(lsKey, fbKey){
  fbListen('counters/' + fbKey, function(v){
    var remote = parseInt(v), local = parseInt(localStorage.getItem(lsKey));
    if(!isNaN(remote) && (isNaN(local) || remote > local)){
      try{ localStorage.setItem(lsKey, remote); }catch(e){}
      var el = document.getElementById('h-rec'); if(el && typeof window.curN === 'function') el.textContent = window.curN();
    }
  });
}
function pushCounter(lsKey, fbKey){ var n = parseInt(localStorage.getItem(lsKey)); if(!isNaN(n)) fbSet('counters/' + fbKey, n); }
function wrapCounter(fnName, lsKey, fbKey){
  var f = window[fnName]; if(typeof f !== 'function') return;
  window[fnName] = function(){ var r = f.apply(this, arguments); pushCounter(lsKey, fbKey); return r; };
}
window.addEventListener('load', function(){
  wrapCounter('nextN', 'eurv102_rec', 'rec'); wrapCounter('nextPieceNum', 'eurv102_piece', 'piece');
  whenCloud(function(){ syncCounter('eurv102_rec', 'rec'); syncCounter('eurv102_piece', 'piece'); });
});


document.addEventListener('DOMContentLoaded', function(){
  setTimeout(window.fbInitSync, 300);
});
})();
