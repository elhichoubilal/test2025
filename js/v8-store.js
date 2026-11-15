/* ══════════════════════════════════════════════════════════
   RenewPro 8 — v8-store.js   (🗄️ المرحلة 5أ: المزامنة ديال الحاسبة ولات فالبرنامج)
   قبل: calc/firebase-sync.js (داخل الإطار) هو اللي كيقرا ويكتب Firestore «calc».
   دابا: Store8 (فالبرنامج نفسه) هو الكاتب الوحيد. الإطار (إلا كان محلول) كيعيط لـ Store8 بلا ما يكتب بوحدو.
   نفس المنطق حرفياً: نفس المفاتيح، نفس الدمج الثلاثي (setMerged + آخر نسخة سحابية)، نفس الطابور بلا نت (rp5_calc_pend)،
   نفس العدادات (أعلى رقم معروف ← ما كيتكررش رقم). البيانات فالجهاز: نفس localStorage (eurv102_*).
══════════════════════════════════════════════════════════ */
'use strict';
var Store8 = (function () {
  var MERGE = { history: 1, cashMoves: 1, clients: 1, renewals: 1, cash: 1, users: 1, factures: 1 };
  var LS = { history: 'eurv102_h', users: 'eurv102_u', clients: 'eurv102_c', cash: 'eurv102_cash', cashMoves: 'eurv102_cash_moves', autreTarifs: 'eurv102_autre', pdfTemplates: 'eurv102_pdftpl', renewals: 'eurv102_renewals', factures: 'eurv102_fac_list', agencyInfo: 'eurv102_ci' };
  var KEYS = ['history', 'users', 'clients', 'cash', 'cashMoves', 'autreTarifs', 'pdfTemplates', 'renewals', 'factures'];
  var COUNTERS = [['eurv102_rec', 'rec'], ['eurv102_piece', 'piece'], ['eurv102_fac', 'facture']];   /* 7.17: رقم الفاتورة (counters/facture) */
  var S = { on: false, synced: false, lastRemote: {}, unsubs: [], hooks: [], online: null, err: '' };
  var toArr = function (v) { if (Array.isArray(v)) return v.filter(function (x) { return x != null; }); if (v && typeof v === 'object') return Object.keys(v).map(function (k) { return v[k]; }).filter(function (x) { return x != null; }); return []; };
  var lsSet = function (k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { } };
  var lsGet = function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  var setBase = function (k, j) { S.lastRemote[k] = j; try { localStorage.setItem('rp8_base_' + k, j); } catch (e) { } };
  var getBase = function (k) { if (S.lastRemote[k]) return S.lastRemote[k]; try { var b = localStorage.getItem('rp8_base_' + k); if (b) { S.lastRemote[k] = b; return b; } } catch (e) { } return ''; };

  /* الطابور (بلا نت): نفس المفتاح ديال القديم باش ما يضيعش شي حاجة كانت كتسنا */
  var PEND = {}; try { PEND = JSON.parse(localStorage.getItem('rp5_calc_pend') || '{}') || {}; } catch (e) { PEND = {}; }
  var savePend = function () { try { localStorage.setItem('rp5_calc_pend', JSON.stringify(PEND)); } catch (e) { } };
  var retryT = null;
  function push(key, base, json, merge) {
    return (merge ? CalcStore.setMerged(key, base || getBase(key) || '', json) : CalcStore.set(key, json)).then(function (mergedJson) {
      if (merge && typeof mergedJson === 'string') setBase(key, mergedJson);
      if (PEND[key] && PEND[key].j === json) { delete PEND[key]; savePend(); }
      S.online = true; S.err = '';
    }).catch(function (e) {
      console.warn('Store8 write', key, e); S.online = false; S.err = String((e && e.code) || e);
      PEND[key] = { b: base || getBase(key) || '', j: json, m: merge ? 1 : 0 }; savePend();
      clearTimeout(retryT); retryT = setTimeout(flush, 20000);
    });
  }
  function flush() { var ks = Object.keys(PEND); if (!ks.length) return Promise.resolve(); return Promise.all(ks.map(function (k) { var x = PEND[k]; return push(k, x.b, x.j, !!x.m); })); }
  window.addEventListener('online', function () { setTimeout(flush, 1500); });

  /* الكتابة: نفس fbSet */
  function set(key, data) {
    var json; try { json = JSON.stringify(data); } catch (e) { return Promise.resolve(); }
    if (!S.on) { PEND[key] = { b: MERGE[key] && Array.isArray(data) ? getBase(key) : null, j: json, m: MERGE[key] && Array.isArray(data) ? 1 : 0 }; savePend(); return Promise.resolve(); }
    var merge = !!(MERGE[key] && Array.isArray(data));
    return push(key, merge ? getBase(key) : null, json, merge);
  }
  /* كتابة محلية + سحابية مرة وحدة (للصفحات الأصلية) */
  function save(key, data) { if (LS[key]) lsSet(LS[key], data); return set(key, data); }
  function get(key, cb) { CalcStore.get(key).then(function (j) { var v = null; if (j != null) { try { v = JSON.parse(j); } catch (e) { } } if (MERGE[key] && v != null) setBase(key, JSON.stringify(toArr(v))); cb(v); }).catch(function () { cb(null); }); }
  function listen(key, cb) { S.unsubs.push(CalcStore.listen(key, function (j) { var v; try { v = JSON.parse(j); } catch (e) { return; } if (MERGE[key]) setBase(key, JSON.stringify(toArr(v))); cb(v); })); }
  function emit(key, v) { S.hooks.forEach(function (f) { try { f(key, v); } catch (e) { console.error(e); } }); }

  /* الأسعار: نفس applyPrices (كل ثمن فـ eurv102_p_*) */
  function applyPrices(obj) { if (!obj) return; Object.keys(obj).forEach(function (k) { lsSet('eurv102_p_' + k, String(obj[k])); }); }
  function collectPrices() { return Eng.prices(); }

  /* التشغيل: نفس doSync (السحابة هي المرجع؛ إلا كانت خاوية كنرفعو اللي فالجهاز) */
  function start() {
    if (S.on || !App.user || !FB.db) return; S.on = true;
    CalcStore.whenReady(function () {
      flush().then(sync, sync);
    });
  }
  function sync() {
    var done = 0;
    KEYS.forEach(function (k) {
      get(k, function (val) {
        if (val !== null) { if (!PEND[k]) lsSet(LS[k], val); }
        else { var local = lsGet(LS[k]); if (local && (Array.isArray(local) ? local.length : Object.keys(local).length)) set(k, local); }
        if (++done === KEYS.length) { S.synced = true; S.online = true; emit('*'); }
      });
    });
    get('prices', function (val) { if (val !== null) { if (!PEND.prices) applyPrices(val); emit('prices', val); } else set('prices', collectPrices()); });
    get('agencyInfo', function (val) { if (val !== null) { if (!PEND.agencyInfo) lsSet('eurv102_ci', val); } else { var ci = lsGet('eurv102_ci'); if (ci) set('agencyInfo', ci); } });
    KEYS.concat(['agencyInfo']).forEach(function (k) { listen(k, function (v) { if (v === null || PEND[k]) return; lsSet(LS[k], v); S.online = true; emit(k, v); }); });
    listen('prices', function (v) { applyPrices(v); emit('prices', v); });
    COUNTERS.forEach(function (c) {
      S.unsubs.push(CalcStore.listen('counters/' + c[1], function (j) { var remote = parseInt(j), local = parseInt(localStorage.getItem(c[0]));
        if (!isNaN(remote) && (isNaN(local) || remote > local)) { lsSet(c[0], String(remote)); emit('counter', c[1]); } }));
    });
  }
  function stop() { S.unsubs.forEach(function (u) { try { u(); } catch (e) { } }); S.unsubs = []; S.on = false; S.synced = false; S.lastRemote = {}; }
  /* العدادات: الرقم الجاي (نفس nextN / nextPieceNum) + كنرفعوه */
  function pushCounter(lsKey, fbKey) { var n = parseInt(localStorage.getItem(lsKey)); if (!isNaN(n)) set('counters/' + fbKey, n); }
  function nextNum() { var n = parseInt(localStorage.getItem('eurv102_rec') || '999') + 1; lsSet('eurv102_rec', String(n)); pushCounter('eurv102_rec', 'rec'); return 'EUR-' + new Date().getFullYear() + '-' + String(n).padStart(4, '0'); }

  App.on('login', function () { setTimeout(start, 400); });
  App.on('logout', stop);
  return { set: set, save: save, get: get, onChange: function (f) { S.hooks.push(f); }, flush: flush, pushCounter: pushCounter, nextNum: nextNum, applyPrices: applyPrices,
    state: function () { return { on: S.on, synced: S.synced, online: S.online, err: S.err, pend: Object.keys(PEND) }; }, LS: LS, _S: S };
})();
/* الإطار القديم (إلا كان محلول): التبديلات اللي جات من جهاز آخر كتوصلو بحال قبل (HIST، CASH…) باش الشاشات القديمة تبقى متوافقة */
Store8.onChange(function (key, v) {
  var w = null; try { w = Calc.frame && Calc.frame.contentWindow; } catch (e) { w = null; } if (!w || !w.document) return;
  try {
    var q = function (s) { return w.document.querySelector(s); };
    if (key === 'history' && w.HIST !== undefined) { w.HIST = v; if (q('#page-hist.active') && w.renderHist) w.renderHist(); if (w.updateQuickStats) w.updateQuickStats(); }
    else if (key === 'users' && w.USERS !== undefined) w.USERS = v;
    else if (key === 'cash' && w.CASH !== undefined) w.CASH = v;
    else if (key === 'cashMoves' && w.CASH_MOVES !== undefined) w.CASH_MOVES = v;
    else if (key === 'clients' && w.CLIENTS !== undefined) w.CLIENTS = v;
    else if (key === 'pdfTemplates' && w.PDF_TEMPLATES !== undefined) w.PDF_TEMPLATES = v;
    else if (key === 'renewals' && w.RT_CLIENTS !== undefined) w.RT_CLIENTS = v;
    else if (key === 'prices' && w.ldPUI) { try { w.ldPUI(); w.fillP(); } catch (e) { } }
    else if (key === 'agencyInfo' && w.ldCI) w.ldCI();
    else if (key === 'counter') { var el = w.document.getElementById('h-rec'); if (el && w.curN) el.textContent = w.curN(); }
    else if (key === '*') { ['ldH', 'ldU', 'ldC', 'ldCash', 'ldMoves', 'ldPdfTpl'].forEach(function (f) { if (typeof w[f] === 'function') w[f](); }); if (w.updateQuickStats) w.updateQuickStats(); }
  } catch (e) { }
});
/* الصفحات الأصلية كتعاود ترسم ملي توصل بيانات جديدة */
Store8.onChange(function (key) { if (!App.user) return; if (/^c-|^dash$/.test(App.page || '') && CE7.native[App.page] && !Modal.isOpen() && !(document.activeElement && document.activeElement.matches && document.activeElement.matches('input,textarea,select'))) App.refresh(); });
