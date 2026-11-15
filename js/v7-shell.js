/* ══════════════════════════════════════════════════════════
   RenewPro 7 Pro — v7-shell.js
   الهيكل الجديد: القائمة الجانبية بالمجموعات (الحاسوب)، القائمة السفلية + «المزيد» (الهاتف)،
   البحث فالشريط العلوي (Ctrl K)، وزر «عملية جديدة».
   ما كيبدّل حتى قسم: كيبدّل غير طريقة العرض ديال القائمة. نفس البيانات، نفس الصلاحيات.
══════════════════════════════════════════════════════════ */
'use strict';
App.version = '7.17.2';

/* أيقونات بسيطة (خط) بدل الإيموجي فالقائمة */
var IC7 = (function () {
  var s = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  return {
    dash: s('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
    calc: s('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M8 18h8"/>'),
    renew: s('<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>'),
    'c-renewals': s('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'),
    sin: s('<path d="M5 16l1.5-5h11L19 16"/><rect x="3" y="16" width="18" height="4" rx="1"/><path d="M7 20v1M17 20v1"/>'),
    debts: s('<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 10c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6c0 2.4-5 1.4-5 3.8 0 1 1 1.6 2.5 1.6s2.5-.5 2.5-1.5"/>'),
    tasks: s('<path d="M9 11l2 2 4-4"/><rect x="4" y="4" width="16" height="16" rx="3"/>'),
    'c-caisse': s('<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18M7 15h3"/>'),
    'c-hist': s('<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
    bank: s('<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>'),
    'c-journal': s('<path d="M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2z"/><path d="M6 17a2 2 0 0 1 2-2h11"/>'),
    'c-reports': s('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>'),
    phones: s('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>'),
    'c-clients': s('<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .7 3 2.9 3 6"/>'),
    archive: s('<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>'),
    files: s('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    prod: s('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>'),
    'c-stats': s('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    'c-dash': s('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>'),
    'c-archives': s('<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>'),
    control: s('<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
    'c-prices': s('<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
    'c-pdftpl': s('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>'),
    'c-sync': s('<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M17 8h4M19 6v4"/>'),
    logs: s('<path d="M8 8a4 4 0 1 1 8 0v6a4 4 0 1 1-8 0z"/><path d="M4 11h4M16 11h4M4 17h4M16 17h4M9 4L7 2M15 4l2-2M12 10v8"/>'),
    more: s('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    search: s('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    plus: s('<path d="M12 5v14M5 12h14"/>'),
    phone: s('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>'),
    upload: s('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>')
  };
})();

/* المجموعات: نفس ترتيب النموذج. أي قسم جديد ما كاينش هنا كيمشي لـ«أخرى» */
var NAV7 = [
  { k: 'day', t: ['العمل اليومي', 'Travail du jour'], ids: ['dash', 'calc', 'renew', 'c-renewals', 'sin', 'debts', 'tasks'] },
  { k: 'money', t: ['الفلوس', 'Argent'], ids: ['c-caisse', 'c-hist', 'bank', 'c-journal', 'c-reports'] },
  { k: 'ref', t: ['المراجع', 'Références'], ids: ['phones', 'c-clients', 'archive', 'files', 'prod', 'c-stats', 'c-dash', 'c-archives'] },
  { k: 'adm', t: ['الإدارة', 'Administration'], ids: ['control', 'logs', 'c-prices', 'c-pdftpl', 'c-sync'] }
];
/* أسماء أوضح فالنسخة 7 */
var TITLE7 = { calc: ['عملية جديدة', 'Nouvelle opération'], 'c-caisse': ['الصندوق', 'Caisse'], 'c-hist': ['سجل العمليات', 'Historique'], 'c-renewals': ['متابعة التجديدات', 'Suivi renouv.'], phones: ['قاعدة الأرقام', 'Répertoire'] };
function t7(m) { var t = TITLE7[m.id] || m.title; return L(t[0], t[1]); }
/* القائمة السفلية فالهاتف: 4 أقسام + «المزيد» */
/* 7.0.3: فالهاتف كتخدم بالتجديد ومتابعة التجديدات والديون (الاتصال) — هوما اللي تحت */
var BOTTOM7 = ['dash', 'renew', 'c-renewals', 'debts', 'c-caisse', 'sin', 'tasks', 'bank', 'phones'];

function nav7Groups() {
  var vis = App.visibleMods().filter(function (m) { return m.nav !== false; }), used = {};
  var out = NAV7.map(function (g) {
    var ms = g.ids.map(function (id) { return vis.filter(function (m) { return m.id === id; })[0]; }).filter(Boolean);
    /* 7.6.1: الترتيب ديال 🎛️ لوحة التحكم كيتطبق داخل كل مجموعة (نفس الرتبة ← ترتيب المجموعة) */
    var ord7 = Meta.get('modOrder', []) || []; ms = ms.map(function (m, i) { var k = ord7.indexOf(App.modKey(m)); return { m: m, i: i, r: (m.id === 'dash' || m.id === 'control') ? -1 : k >= 0 ? k : 9999 }; }).sort(function (a, b) { return (a.r - b.r) || (a.i - b.i); }).map(function (x) { return x.m; });
    ms.forEach(function (m) { used[m.id] = 1; }); return { g: g, ms: ms };
  });
  var rest = vis.filter(function (m) { return !used[m.id]; });
  if (rest.length) out.splice(3, 0, { g: { k: 'oth', t: ['أخرى', 'Autres'] }, ms: rest });
  return out.filter(function (x) { return x.ms.length; });
}
var SHORT7 = { 'c-renewals': ['المتابعة', 'Suivi'], 'c-caisse': ['الصندوق', 'Caisse'] };
function nav7Btn(m, extra, short) {
  var badge = m.badge ? m.badge() : '';
  return '<button class="nav-b' + (App.page === m.id ? ' on' : '') + '" data-act="nav" data-id="' + esc(m.id) + '"' + (extra || '') + '>'
    + '<span class="nav-ic">' + (IC7[m.id] || m.icon) + '</span><span class="nav-tx">' + esc(t7(m)) + '</span>'
    + (badge ? '<span class="nav-bd' + (m.id === 'renew' || m.id === 'dash' ? '' : ' am') + '">' + esc(badge) + '</span>' : '') + '</button>';
}
/* 7.4: «المراجع» و«الإدارة» كيتطواو فالشريط الجانبي (الحالة فهاد الجهاز) */
var NAV7_FOLD = { ref: 1, adm: 1 };
/* 7.7: أيقونات المجموعات (القائمة الغامقة) */
var NAV7_GIC = { day: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>', money: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2A3 3 0 0 0 12 8c-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2a3 3 0 0 1-2.8-1.2M12 6.5V8M12 16v1.5"/>',
  ref: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>', oth: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  adm: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M18 8v6M15 11h6"/>' };
function nav7Gic(k) { return '<svg class="nav-gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (NAV7_GIC[k] || '') + '</svg>'; }
App.act('nav7-fold', function (el) { var o = Local.get('nav7_open', {}) || {}, k = el.dataset.k; o[k] = el.classList.contains('cl'); Local.set('nav7_open', o); App.renderNav(); });
/* 7.7.1: «✏️ تخصيص القائمة» — المستخدم كيخبّي الأقسام اللي ما كيحتاجهاش (هاد الجهاز فقط) */
var NAV7_ED = { on: false }, NAV7_LOCK = { dash: 1, control: 1 };
function nav7Hid() { var h = Local.get('nav7_hide', {}); return h && typeof h === 'object' ? h : {}; }
function nav7EdBtn(m, hid) {
  var off = !!hid[m.id], lk = NAV7_LOCK[m.id];
  return '<button class="nav-b nav7-e' + (off ? ' off' : '') + '"' + (lk ? ' disabled' : ' data-act="nav7-hide" data-id="' + esc(m.id) + '"') + '><span class="nav-ic">' + (IC7[m.id] || m.icon) + '</span><span class="nav-tx">' + esc(t7(m)) + '</span><span class="nav7-eye">' + (lk ? '🔒' : off ? '🚫' : '👁') + '</span></button>';
}
App.act('nav7-ed', function () { NAV7_ED.on = !NAV7_ED.on; App.renderNav(); });
App.act('nav7-hide', function (el) { var h = nav7Hid(), id = el.dataset.id; if (h[id]) delete h[id]; else h[id] = 1; Local.set('nav7_hide', h); App.renderNav(); });
App.act('nav7-edreset', function () { Local.set('nav7_hide', {}); App.renderNav(); });
App.renderNav = function () {
  var nav = $('nav'); if (!nav || !App.user) return;
  var groups = nav7Groups();
  if (isDesktop()) {
    var hid = nav7Hid(), ed = !!NAV7_ED.on, hidden = [], op = Local.get('nav7_open', {}) || {};
    var keep = function (m) { return ed || !hid[m.id] || App.page === m.id || NAV7_LOCK[m.id]; };
    nav.innerHTML = '<div class="nav-brand"><i>R</i><div><b>RenewPro <span>7 Pro</span></b><small>' + esc(Meta.get('agencyName', '') || 'EUR Assurance · القصر الصغير') + '</small></div></div>'
      + (ed ? '<div class="nav7-edh">✏️ ' + esc(L('خبّي ولا ورّي الأقسام بـ 👁', 'Masquez ou affichez avec 👁')) + '</div>' : '')
      + groups.map(function (x, i) {
        var ms = x.ms.filter(function (m) { if (keep(m)) return true; hidden.push(m); return false; }); if (!ms.length) return '';
        var fold = !ed && NAV7_FOLD[x.g.k], cl = fold && !ms.some(function (m) { return m.id === App.page; }) && !op[x.g.k];
        return (fold ? '<button class="nav-sec fold' + (cl ? ' cl' : '') + '" data-act="nav7-fold" data-k="' + x.g.k + '">' + nav7Gic(x.g.k) + '<span>' + esc(L(x.g.t[0], x.g.t[1])) + '</span><i>▾</i></button>' : '<span class="nav-sec">' + nav7Gic(x.g.k) + '<span>' + esc(L(x.g.t[0], x.g.t[1])) + '</span></span>') + (cl ? '' : ms.map(function (m) { return ed ? nav7EdBtn(m, hid) : nav7Btn(m); }).join(''));
      }).join('')
      + (!ed && hidden.length ? '<button class="nav-sec fold' + (op.hid ? '' : ' cl') + '" data-act="nav7-fold" data-k="hid">' + nav7Gic('oth') + '<span>' + esc(L('أقسام أخرى', 'Autres sections')) + ' (' + hidden.length + ')</span><i>▾</i></button>' + (op.hid ? hidden.map(function (m) { return nav7Btn(m); }).join('') : '') : '')
      + '<span class="nav-foot"></span>'
      + (ed ? '<button class="nav-b nav7-edok" data-act="nav7-ed"><span class="nav-ic">✓</span><span class="nav-tx">' + esc(L('صافي', 'Terminé')) + '</span></button><button class="nav-b nav7-edx" data-act="nav7-edreset"><span class="nav-ic">↺</span><span class="nav-tx">' + esc(L('ورّي كلشي', 'Tout afficher')) + '</span></button>'
        : '<button class="nav-b nav7-edb" data-act="nav7-ed"><span class="nav-ic">✏️</span><span class="nav-tx">' + esc(L('تخصيص القائمة', 'Personnaliser le menu')) + '</span></button>')
      + '<button class="nav-b nav-rep" data-act="log7-report"><span class="nav-ic">🐞</span><span class="nav-tx">' + esc(L('بلّغ على مشكل', 'Signaler un problème')) + '</span></button>';
  } else {
    var vis = App.visibleMods().filter(function (m) { return m.nav !== false; }), ids = vis.map(function (m) { return m.id; });
    var pick = BOTTOM7.filter(function (id) { return ids.indexOf(id) >= 0 && id !== 'calc'; }).slice(0, 4);
    if (pick.length < 4) ids.forEach(function (id) { if (pick.length < 4 && pick.indexOf(id) < 0 && id !== 'calc') pick.push(id); });
    var inMore = ids.some(function (id) { return pick.indexOf(id) < 0; }), moreOn = inMore && pick.indexOf(App.page) < 0;
    nav.innerHTML = pick.map(function (id) { return nav7Btn(App.mod(id), '', true); }).join('')
      + (inMore ? '<button class="nav-b more' + (moreOn ? ' on' : '') + '" data-act="nav7-more"><span class="nav-ic">' + IC7.more + '</span><span class="nav-tx">' + L('المزيد', 'Plus') + '</span></button>' : '');
  }
  fab7();
};
function fab7() {
  var f = $('fab7'), can = App.user && App.visibleMods().some(function (m) { return m.id === 'calc'; });
  if (!f) return;
  document.body.classList.toggle('no-fab', !can || App.page === 'calc' || (typeof isCalcMod === 'function' && isCalcMod(App.page)) || App.page === 'sin' || App.page === 'bank' || App.page === 'c-new7' || App.page === 'sec' || App.page === 'control');
  f.lastChild.textContent = L('عملية جديدة', 'Nouvelle opération');
}
App.act('nav7-more', function () {
  Modal.open(Modal.head(L('كل الأقسام', 'Toutes les sections'))
    + '<div class="more-l">' + nav7Groups().map(function (x) { return '<span class="nav-sec">' + esc(L(x.g.t[0], x.g.t[1])) + '</span>' + x.ms.map(function (m) { return nav7Btn(m, ' data-close="1"'); }).join(''); }).join('') + '<span class="nav-sec"></span>' + '<button class="nav-b nav-rep" data-act="log7-report"><span class="nav-ic">🐞</span><span class="nav-tx">' + esc(L('بلّغ على مشكل', 'Signaler un problème')) + '</span></button>' + '</div>', 'small');
});
/* زر من «المزيد»: كيسدّ النافذة قبل ما يمشي */
document.addEventListener('click', function (e) { var b = e.target.closest('.more-l [data-act="nav"]'); if (b) Modal.close(); }, true);
App.act('fab7', function () { App.go('c-new7'); });

/* البحث: Ctrl K / ⌘ K، أو «/» من برا الخانات */
document.addEventListener('keydown', function (e) {
  if (!App.user) return;
  var k = (e.key || '').toLowerCase(), typing = /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') || (e.target && e.target.isContentEditable);
  if (((e.ctrlKey || e.metaKey) && k === 'k') || (k === '/' && !typing && !Modal.isOpen())) { e.preventDefault(); if (App.acts['search-open']) App.acts['search-open'](); }
});
function top7() {
  var s = $('top-search'); if (!s) return;
  s.querySelector('span').textContent = L('بحث شامل: زبون، لوحة، بوليصة، حادثة، فاتورة…', 'Recherche globale : client, immat., police, sinistre, facture…');
  s.classList.toggle('hide', !App.user);
}
App.on('login', top7); App.on('lang', top7); App.on('refresh', top7); App.on('page', fab7);
/* تبدّل الحجم (الهاتف ↔ الحاسوب): القائمة كتتبدّل */
(function () { var was = null; window.addEventListener('resize', debounce(function () { var d = isDesktop(); if (d !== was) { var first = was === null; was = d; if (App.user) { App.renderNav(); if (!first) { var v = $('view'); if (v) v.innerHTML = ''; App.render(); } } } }, 120)); })();

/* الأسماء الجديدة كتبان حتى فالعناوين ديال الأقسام (الرئيسية والبطاقات) */
App.on('login', function () { Object.keys(TITLE7).forEach(function (id) { var m = App.mod(id); if (m) m.title = TITLE7[id]; }); });
