/* ══════════════════════════════════════════════════════════
   EUR assurance — embed.js   (جسر الدمج مع RenewPro)
   يعمل فقط حين تُفتح الحاسبة داخل RenewPro (داخل إطار). عند فتحها وحدها لا يغيّر شيئاً.
   • الدخول: المستخدم يأتي من RenewPro (لا شاشة دخول ثانية ولا قفل مستقل).
   • عند تأكيد عملية: تُرسل إلى RenewPro ليعلّم الزبون «تم التجديد».
   • يستقبل بيانات زبون من RenewPro ويملأ بها صفحة الحساب.
   لا يغيّر أي حساب ولا أي سعر.
══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.parent === window) return;                       // الحاسبة مفتوحة وحدها
  document.documentElement.classList.add('rp-embed');
  var st = document.createElement('style');
  st.textContent = '.rp-embed #login-screen,.rp-embed #lock-screen{display:none!important}'
    + '.rp-embed [onclick*="confirmLogout"],.rp-embed [onclick*="backToLogin"],.rp-embed #pwa-banner,.rp-embed #tb-install{display:none!important}'
    /* v4.2 الدمج: التنقل واللغة يتحكم فيهما RenewPro (قائمته الجانبية وزر FR) */
    + '.rp-embed #header-nav,.rp-embed .lsw{display:none!important}'
    /* الوضع الليلي: ألوان فقط (لا يمسّ الحساب). الوصل والطباعة يبقيان أبيض */
    + 'html.rp-dark{--bg:#0b1220;--bg2:#111a2e;--bg3:#0f1729;--panel:#111a2e;--border:rgba(255,255,255,.09);--border2:rgba(255,255,255,.16);'
    +   '--gold:#5aa9e6;--gold-b:#7dbbf0;--gold-d:#22c7f0;--gold-glow:rgba(34,199,240,.2);--gold-bg:rgba(34,199,240,.1);'
    +   '--text:#e6edf7;--text2:#b4c0d3;--text3:#7f8ca3;--shadow:0 1px 4px rgba(0,0,0,.4);--shadow2:0 4px 24px rgba(0,0,0,.5);color-scheme:dark}'
    + 'html.rp-dark input,html.rp-dark select,html.rp-dark textarea{background:var(--bg3);color:var(--text);border-color:var(--border2)}'
    + 'html.rp-dark ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18)}'
    + 'html.rp-dark #receipt,html.rp-dark #receipt *,html.rp-dark .receipt,html.rp-dark .receipt *{color-scheme:light}'
    /* v6: بطاقات الأرقام فوق «حساب جديد» صغار وفسطر واحد (الشكل فقط، الحساب ما تمسش) */
    + '.rp-embed .statsbar{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important}.rp-embed .scard{padding:8px 6px!important;border-radius:10px!important;min-width:0}'
    + '.rp-embed .sc-val{font-size:1rem!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rp-embed .sc-lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '@media(max-width:600px){.rp-embed .statsbar{gap:4px!important}.rp-embed .scard{padding:6px 3px!important}.rp-embed .sc-val{font-size:.8rem!important}.rp-embed .sc-lbl{font-size:.48rem!important;letter-spacing:0!important}}';
  document.head.appendChild(st);

  /* الجلسة يتحكم فيها RenewPro */
  window.lockScreen = function () { };
  window.backToLogin = function () { };
  window.confirmLogout = function () { };

  function post(m) { try { window.parent.postMessage(m, '*'); } catch (e) { } }
  function frIso(d) { var m = String(d || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : ''; }
  function tsOf(h) { var iso = frIso(h.date); if (!iso) return 0; var t = new Date(iso + 'T' + (/^\d{1,2}:\d{2}/.test(h.time || '') ? ('0' + h.time).slice(-5) : '12:00') + ':00'); return isNaN(t) ? 0 : t.getTime(); }
  function toOp(h, ts) {
    return { id: String(h.num) + '@' + (h.date || '') + ' ' + (h.time || ''), num: h.num, ts: ts || tsOf(h), date: frIso(h.date), client: h.client || '', plate: h.plate || '',
      police: h.police || '', attest: h.attest || '', ds: h.ds || '', de: h.de || '', tarif: h.directPay ? 'direct' : (h.tarif || 'wafa'), desc: h.ins || '',
      due: h.off, paid: h.paid, diff: h.diff, user: h.user || '' };
  }

  function applyTheme(t) { document.documentElement.classList.toggle('rp-dark', t === 'dark'); }
  var USER = null;
  function applyUser(u) {
    USER = u; var name = String(u.name || '').trim() || 'RenewPro';
    if (u.lang && u.lang !== LANG && typeof setLang === 'function') setLang(u.lang);
    var known = (USERS || []).filter(function (x) { return x.n === name; })[0];
    selUser(name, (known && known.av) || (u.admin ? '🔑' : '👤'), !!u.admin);
  }
  function prefill(d) {
    if (!d || !CUR.n) return;
    navTo('calc');
    setTimeout(function () {
      var set = function (id, v) { var el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; };
      set('client', d.client); set('plate', d.plate); set('police-num', d.police); set('attest-num', d.attest); set('date-s', d.ds);
      if (typeof calcEnd === 'function') calcEnd();
      if (typeof fillP === 'function') fillP();
      window.scrollTo(0, 0);
    }, 150);
  }
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return; var m = e.data || {};
    if (m.type === 'rp-user') { applyTheme((m.user || {}).theme); applyUser(m.user || {}); if (m.prefill) prefill(m.prefill); if (m.page) navTo(m.page); sendRecent(true); sendTracker(true); }
    else if (m.type === 'rp-nav') { if (CUR.n && m.page) navTo(m.page); }
    else if (m.type === 'rp-prefill') prefill(m.data);
    else if (m.type === 'rp-theme') applyTheme(m.theme);
    else if (m.type === 'rp-lang') { if (m.lang !== LANG && typeof setLang === 'function') setLang(m.lang); }
  });

  /* عملية جديدة مؤكَّدة → أبلغ RenewPro فوراً */
  function wrapSave(name) {
    var f = window[name]; if (typeof f !== 'function') return;
    window[name] = function () {
      var before = HIST.length ? HIST[0].num : null, n0 = HIST.length;
      var r = f.apply(this, arguments);
      if (HIST.length && HIST[0].num !== before && HIST.length >= n0) post({ type: 'eurpro-op', op: toOp(HIST[0], Date.now()) });
      return r;
    };
  }
  /* عمليات سُجّلت من جهاز آخر: أرسل عمليات آخر 7 أيام عند تغيّر السجل */
  var lastSig = '';
  function sendRecent(force) {
    var sig = HIST.length + '|' + (HIST[0] ? HIST[0].num + HIST[0].time : ''); if (!force && sig === lastSig) return; lastSig = sig;
    var lim = Date.now() - 7 * 86400000;
    post({ type: 'eurpro-ops', ops: HIST.slice(0, 400).map(function (h) { return toOp(h); }).filter(function (o) { return o.ts >= lim; }) });
  }

  /* ملخّص «متابعة التجديدات» (مهلة الأيام) ليظهر في الصفحة الرئيسية لـ RenewPro */
  var lastTr = '';
  function sendTracker(force) {
    try { ldRenewals(); var act = RT_CLIENTS.filter(function (c) { return c.status === 'active'; }), w = 0, u = 0;
      act.forEach(function (c) { var lv = rtLevelOf(rtDaysBetween(c.requestDate)); if (lv === 'urgent') u++; else if (lv === 'warn') w++; });
      var t = { total: act.length, warn: w, urgent: u }, sg = JSON.stringify(t);
      if (!force && sg === lastTr) return; lastTr = sg; post({ type: 'eurpro-tracker', data: t });
    } catch (e) { }
  }

  /* صفحة المدير (المستخدمون) تُفتح مباشرة لمدير RenewPro دون كلمة سر ثانية */
  function wrapNav() {
    var f = window.navTo; if (typeof f !== 'function') return;
    window.navTo = function (pg) {
      var r = f.apply(this, arguments);
      post({ type: 'eurpro-page', page: pg });                   // القائمة في RenewPro تتبع الصفحة
      if (pg === 'sync' && CUR.isAdmin) { var a = document.getElementById('adm-lock2'), b = document.getElementById('adm-panel2'), c = document.getElementById('log-card');
        if (a && b) { a.style.display = 'none'; b.style.display = 'block'; if (c) c.style.display = 'block'; if (typeof renderUsersPanel === 'function') renderUsersPanel(); if (typeof renderAccessLog === 'function') renderAccessLog(); } }
      return r;
    };
  }

  /* استيراد البوردورو (عقود صدرت اليوم) → أبلغ RenewPro ليعلّم أصحابها «تم التجديد» */
  function wrapBordereau() {
    var f = window.rtConfirmImport; if (typeof f !== 'function') return;
    window.rtConfirmImport = function () {
      var items = [];
      try { if (RT_PENDING) items = RT_PENDING.rows.filter(function (r) { return RT_CHECKED.has(r.id) && !r.isDup; })
        .map(function (r) { return { police: r.police, plate: r.matricule, name: r.name, date: r.dateISO, price: r.price, type: r.typeKey, attest: r.attest }; }); } catch (e) { }
      var r = f.apply(this, arguments);
      if (items.length) post({ type: 'eurpro-issued', items: items });
      return r;
    };
  }

  /* السحب والإفلات في صفحات الحاسبة: الملف يذهب لخانة التحميل في الصفحة المفتوحة (كأنك ضغطت «استيراد»).
     صفحة المزامنة (استرجاع نسخة كاملة) مستثناة عمداً حتى لا تُستبدل البيانات بإفلات خاطئ. */
  var DROP = { calc: 'client-pdf-file', renewals: 'rt-file-input', pdftpl: 'tpl-file' };
  var DROP_LBL = { calc: ['استيراد PDF الزبون', 'Import PDF client'], renewals: ['البوردورو اليومي (Excel)', 'Bordereau du jour (Excel)'], pdftpl: ['قالب PDF', 'Modèle PDF'] };
  function curPg() { var p = document.querySelector('.page.active'); return p ? p.id.replace(/^page-/, '') : ''; }
  function isFiles(e) { return !!e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; }
  var ov = null, depth = 0;
  function overlay(show, isPdf) {
    if (!ov) { ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(3,8,20,.5);pointer-events:none';
      document.body.appendChild(ov); }
    if (show) { var pg = curPg(), ok = !!DROP[pg] || !!isPdf, fr = LANG === 'fr', l = isPdf ? ['PDF ← الحاسبة / الحوادث · Excel ← القسم ديالو', 'PDF → calculatrice / sinistres · Excel → sa section'] : DROP_LBL[pg];
      ov.innerHTML = '<div style="padding:30px 42px;border:3px dashed ' + (ok ? '#22c7f0' : '#8a95aa') + ';border-radius:18px;background:var(--panel);color:var(--text);text-align:center;font-weight:800">'
        + '<div style="font-size:42px">' + (ok ? '📥' : '🚫') + '</div><div style="font-size:18px;margin-top:6px">' + (ok ? (fr ? 'Déposez le fichier ici' : 'أفلت الملف هنا') : (fr ? 'Pas d\'import dans cette page' : 'لا يوجد تحميل ملف في هذه الصفحة')) + '</div>'
        + (ok ? '<div style="font-size:13px;opacity:.75;margin-top:4px">' + (fr ? l[1] : l[0]) + '</div>' : '') + '</div>'; }
    ov.style.display = show ? 'flex' : 'none';
  }
  /* v7: أخطاء الحاسبة كتمشي لسجل الأخطاء ديال RenewPro */
  window.addEventListener('error', function (ev) { try { var P = window.parent; if (P && P !== window && P.rpLogFromCalc) P.rpLogFromCalc(ev.message || '', (ev.error && ev.error.stack) || ((ev.filename || '').split('/').pop() + ':' + ev.lineno)); } catch (x) { } });
  window.addEventListener('unhandledrejection', function (ev) { try { var P = window.parent, r = ev.reason || {}; if (P && P !== window && P.rpLogFromCalc) P.rpLogFromCalc(r.message || String(r), r.stack || ''); } catch (x) { } });
  /* v7: أي PDF (إلا فـ«قوالب PDF») كيمشي لـ PDF الذكي ديال RenewPro: Attestation ← عملية جديدة، حادثة ← الحوادث */
  function pdfIn(dt) { var it = dt && dt.items; if (!it) return false; for (var i = 0; i < it.length; i++) { if (it[i].kind === 'file' && /pdf|sheet|excel|csv/i.test(it[i].type || '')) return true; } return false; }
  function toRP() { var P = window.parent; return curPg() !== 'pdftpl' && P && P !== window && typeof P.pdf7Handle === 'function' ? P : null; }
  document.addEventListener('drop', function (e) {
    if (!isFiles(e) || !toRP()) return;
    var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
    var isPdf = /\.pdf$/i.test(f.name) || f.type === 'application/pdf', isXl = /\.(xlsx|xls|xlsm|csv)$/i.test(f.name);
    if (isXl && typeof toRP().xl7Handle !== 'function') return;
    if (!isPdf && !isXl) return;
    e.preventDefault(); e.stopPropagation(); depth = 0; overlay(false);
    if (isPdf) toRP().pdf7Handle(f); else toRP().xl7Handle(f);
  }, true);
  document.addEventListener('dragenter', function (e) { if (!isFiles(e)) return; depth++; overlay(true, pdfIn(e.dataTransfer) && !!toRP()); });
  document.addEventListener('dragleave', function (e) { if (!isFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) overlay(false); });
  document.addEventListener('dragover', function (e) { if (!isFiles(e)) return; e.preventDefault(); });
  document.addEventListener('drop', function (e) {
    if (!isFiles(e)) return; depth = 0; overlay(false);
    if (e.defaultPrevented) return;                         // خانة لها سحبها الخاص (مثل خانة البوردورو) تكفّلت به
    e.preventDefault();
    var inp = document.getElementById(DROP[curPg()] || ''), f = e.dataTransfer.files;
    if (!inp || !f || !f.length) return;
    try { var dt = new DataTransfer(); dt.items.add(f[0]); inp.files = dt.files; } catch (x) { return; }
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* v5: كل ملف كيتحمّل فالحاسبة (البوردورو، PDF الزبون، قالب PDF) كيتحفظ فـ «🗂️ الملفات المحمّلة» ديال RenewPro */
  var SAVE_INP = { 'rt-file-input': 1, 'client-pdf-file': 1, 'tpl-file': 1 };
  document.addEventListener('change', function (e) {
    var el = e.target; if (!el || el.type !== 'file' || !SAVE_INP[el.id] || !el.files || !el.files.length) return;
    var P = window.parent; if (!P || typeof P.rpSaveCalcFile !== 'function') return;
    var f = el.files[0]; if (f.size > 10 * 1024 * 1024) { P.rpSaveCalcFile(f.name, f.type, '', el.id, f.size); return; }
    f.arrayBuffer().then(function (buf) {
      var b = new Uint8Array(buf), s = '', CH = 0x8000; for (var i = 0; i < b.length; i += CH) s += String.fromCharCode.apply(null, b.subarray(i, i + CH));
      P.rpSaveCalcFile(f.name, f.type, btoa(s), el.id, f.size);
    }).catch(function () { });
  }, true);

  window.addEventListener('load', function () {
    wrapSave('valider'); wrapSave('validerDirect'); wrapNav(); wrapBordereau();
    setInterval(function () { if (USER) { sendRecent(false); sendTracker(false); } }, 6000);
    post({ type: 'eurpro-ready' });
  });
})();
