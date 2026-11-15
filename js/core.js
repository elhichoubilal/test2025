/* ══════════════════════════════════════════════════════════
   RenewPro 2 — core.js
   الأساس المشترك: أدوات، ترجمة، سجل الأقسام (Modules)، نقاط الربط (Hooks)،
   الأحداث، النوافذ. لا يحتوي أي منطق خاص بقسم معيّن.

   لإضافة قسم جديد (مثلاً الحاسبة) دون لمس الأقسام الأخرى:
     1) أنشئ ملف js/mod-xxx.js فيه  App.register({ id, icon, title:[ar,fr], order, render(el) })
     2) أضف سطر <script src="js/mod-xxx.js"> في index.html
   وللإضافة داخل بطاقة الزبون أو الجلسة من قسم آخر:  App.hook('contact.blocks', fn)
══════════════════════════════════════════════════════════ */
'use strict';

var App = {
  version: '6.7.1',
  mods: [], hooks: {}, acts: {}, inputs: {}, listeners: {},
  user: null,          // { email, name, admin }
  page: null,
  lang: 'ar'
};

/* ───────── أدوات ───────── */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
function L(ar, fr) { return App.lang === 'fr' ? fr : ar; }
function pad2(n) { return ('0' + n).slice(-2); }
function isoOf(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function todayISO() { return isoOf(new Date()); }
/* تواريخ محلية دائماً (لا UTC) حتى لا يتغيّر اليوم قرب منتصف الليل */
function parseISO(iso) {
  var m = String(iso || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  var d = new Date(+m[1], +m[2] - 1, +m[3]);
  return isNaN(d) ? null : d;
}
function fmtD(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? pad2(m[3]) + '/' + pad2(m[2]) + '/' + m[1] : (iso || '—'); }
function fmtDT(ts) { var d = new Date(ts); if (isNaN(d)) return ''; return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function addDays(iso, n) { var d = parseISO(iso); if (!d) return ''; d.setDate(d.getDate() + n); return isoOf(d); }
function addMonths(iso, n) { var d = parseISO(iso); if (!d) return ''; d.setMonth(d.getMonth() + n); return isoOf(d); }
function daysLeft(iso) {
  var d = parseISO(iso); if (!d) return null;
  var t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
function relTime(ts) {
  var d = new Date(ts); if (isNaN(d)) return '';
  var t0 = new Date(); t0.setHours(0, 0, 0, 0);
  var d0 = new Date(d); d0.setHours(0, 0, 0, 0);
  var diff = Math.round((t0 - d0) / 86400000), hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  if (diff === 0) return L('اليوم ', 'Auj. ') + hm;
  if (diff === 1) return L('أمس ', 'Hier ') + hm;
  return L('منذ ' + diff + ' يوم', 'il y a ' + diff + ' j');
}
function uid(p) { return (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var s = String(v == null ? '' : v).replace(/[\s\u00A0\u202F]/g, '').replace(/[^\d,.\-]/g, ''); if (!s) return 0;
  var lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc >= 0 && ld >= 0) { if (lc > ld) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, ''); }
  else if (lc >= 0) { if (s.indexOf(',') !== lc) s = s.replace(/,/g, ''); else s = s.replace(',', '.'); }
  var n = parseFloat(s); return isFinite(n) ? n : 0;
}
/* مبلغ: فاصل الآلاف مسافة غير منكسرة، فلا ينقلب الرقم داخل النص العربي */
function money(n) { n = Math.round((+n || 0) * 100) / 100; var p = n.toFixed(2).split('.'); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + ',' + p[1]; }
function moneyH(n, unit) { return '<span class="ltr">' + money(n) + (unit ? ' DH' : '') + '</span>'; }
function ltr(s) { return '<span class="ltr">' + esc(s) + '</span>'; }
/* عزل اتجاه LTR داخل رسالة نصية عربية (لوحة، بوليصة) */
function ltrWrap(s) { s = String(s || ''); return s ? '\u2066' + s + '\u2069' : ''; }
function debounce(fn, ms) { var t; return function () { var a = arguments, me = this; clearTimeout(t); t = setTimeout(function () { fn.apply(me, a); }, ms); }; }
function isDesktop() { return window.innerWidth >= 1000; }

/* مفاتيح المطابقة (بوليصة، لوحة، شهادة) — مشتركة بين الأقسام */
function kAl(s) { return String(s == null ? '' : s).toUpperCase().replace(/[^0-9A-Z\u0600-\u06FF]/g, ''); }
function kPlate(s) { var k = kAl(s); return k.length >= 4 ? k : ''; }
function kPolTail(s) { s = String(s == null ? '' : s); var i = s.lastIndexOf('/'); var k = kAl(i >= 0 ? s.slice(i + 1) : s).replace(/^0+/, ''); return k.length >= 4 ? k : ''; }
function kAtt(s) { var k = kAl(String(s == null ? '' : s).replace(/\.0+$/, '')).replace(/^0+/, ''); return k.length >= 5 ? k : ''; }

/* هاتف */
function telHref(p) { p = String(p || '').replace(/[^\d+]/g, ''); return p ? 'tel:' + p : '#'; }
function phIntl(p) { p = String(p || '').replace(/[^0-9]/g, ''); if (p.indexOf('00') === 0) p = p.slice(2); else if (p.charAt(0) === '0') p = '212' + p.slice(1); return p; }
function waUrl(p, msg) { return 'https://wa.me/' + phIntl(p) + '?text=' + encodeURIComponent(msg); }
function smsUrl(p, msg) { return 'sms:' + String(p || '').replace(/[^0-9+]/g, '') + '?body=' + encodeURIComponent(msg); }

/* إعدادات هذا الجهاز فقط */
var Local = {
  get: function (k, def) { try { var v = localStorage.getItem('rp2_' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set: function (k, v) { try { localStorage.setItem('rp2_' + k, JSON.stringify(v)); } catch (e) { } }
};

/* ───────── أحداث داخلية ───────── */
App.on = function (evt, fn) { (App.listeners[evt] = App.listeners[evt] || []).push(fn); };
App.emit = function (evt, a, b) { (App.listeners[evt] || []).forEach(function (fn) { try { fn(a, b); } catch (e) { console.error(evt, e); } }); };

/* ───────── نقاط الربط: قسم يضيف محتوى داخل قسم آخر دون تعديل كوده ───────── */
App.hook = function (name, fn) { (App.hooks[name] = App.hooks[name] || []).push(fn); };
App.run = function (name, a, b, c) {
  return (App.hooks[name] || []).map(function (fn) { try { return fn(a, b, c) || ''; } catch (e) { console.error('hook ' + name, e); return ''; } }).join('');
};
App.runList = function (name, a, b) {
  var out = []; (App.hooks[name] || []).forEach(function (fn) { try { var r = fn(a, b); if (r) out = out.concat(r); } catch (e) { console.error('hook ' + name, e); } }); return out;
};

/* ───────── أفعال الواجهة: data-act="اسم" بدل onclick (لا كود داخل HTML) ───────── */
App.act = function (name, fn) { App.acts[name] = fn; };
App.input = function (name, fn) { App.inputs[name] = fn; };
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]'); if (!el) return;
  var fn = App.acts[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href') !== '#') { fn(el, e); return; }
  e.preventDefault(); fn(el, e);
});
['input', 'change'].forEach(function (type) {
  document.addEventListener(type, function (e) {
    var el = e.target.closest('[data-inp]'); if (!el) return;
    var discrete = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio' || el.type === 'file';
    if ((type === 'change') !== discrete) return;   // النص: حدث input · القوائم والملفات: حدث change (مرة واحدة فقط)
    var fn = App.inputs[el.dataset.inp]; if (fn) fn(el, e);
  });
});

/* ───────── الأقسام ───────── */
/* الصلاحيات: كل قسم له «perm» (مجموعة). قسم جديد بلا perm يأخذ معرّفه صلاحيةً بنفسه → يظهر وحده في جدول الصلاحيات.
   الرئيسية للجميع، والأقسام admin:true للمدير فقط. */
App.register = function (mod) { if (!mod.perm && !mod.admin && mod.id !== 'dash') mod.perm = mod.id; App.mods.push(mod); App.mods.sort(function (a, b) { return (a.order || 50) - (b.order || 50); }); };
/* v6: ترتيب الأقسام يحددو المدير فـ 🎛️ لوحة التحكم (Meta «modOrder»: مفاتيح الأقسام، والحاسبة مفتاح واحد «g:calc»).
   قسم جديد ما كاينش فالترتيب كيتزاد فالآخر حسب «order» ديالو. الرئيسية ديما الأولى. */
App.modKey = function (m) { return m.group ? 'g:' + m.group : m.id; };
App.modRank = function (m) {
  if (m.id === 'dash') return -1;
  var ord = (typeof Meta !== 'undefined' && Meta.get('modOrder', [])) || [], i = ord.indexOf(App.modKey(m));
  return i >= 0 ? i : 1000 + (m.order || 50);
};
App.sortedMods = function () {
  return App.mods.slice().sort(function (a, b) { var d = App.modRank(a) - App.modRank(b); return d || ((a.order || 50) - (b.order || 50)); });
};
App.visibleMods = function () {
  var adm = !!(App.user && App.user.admin), off = (typeof Meta !== 'undefined' && Meta.get('modsOff', [])) || [];
  return App.sortedMods().filter(function (m) { return !(m.admin && !adm) && !(m.enabled && !m.enabled()) && !(off.indexOf(m.id) >= 0 && !adm) && (!m.perm || App.can(m.perm)); });
};
/* هل للمستخدم الحالي هذه الصلاحية؟ المدير: كل شيء. موظف بلا سجل في «الموظفون»: لا شيء.
   موظف قديم أُضيف قبل نظام الصلاحيات (بلا perms): يبقى يرى كل شيء حتى يحدّد المدير صلاحياته. */
App.can = function (p) {
  if (!App.user) return false; if (App.user.admin || !p) return true;
  var u = (typeof Users !== 'undefined' && Users.map) ? Users.map[uKey(App.user.email)] : null;
  if (!u) return false; if (!u.perms) return true;
  return !!u.perms[p];
};
/* 📥 تحميل الملفات: المدير، أو موظف عندو صلاحية «files» */
App.canUp = function () { return !!(App.user && (App.user.admin || App.can('files'))); };
App.mod = function (id) { return App.mods.filter(function (m) { return m.id === id; })[0] || null; };
App.renderNav = function () {
  var nav = $('nav'); if (!nav) return;
  /* v6: الأقسام اللي nav:false (الإعدادات، الصلاحيات) كيتحلو من 🎛️ لوحة التحكم، ماشي من القائمة.
     المجموعة (الحاسبة): زر واحد بسمية المجموعة؛ ملي تكون داخلها، الأقسام ديالها كيبانو تحتو (الحاسوب). */
  var cur = App.mod(App.page), seen = {}, html = [];
  var btn = function (m, o) {
    var badge = m.badge ? m.badge() : '';
    return '<button class="nav-b' + (o.on ? ' on' : '') + (o.cls || '') + '" data-act="nav" data-id="' + esc(m.id) + '"' + (o.tip ? ' title="' + esc(o.tip) + '"' : '') + '>'
      + '<span class="nav-ic">' + (o.icon || m.icon) + '</span><span class="nav-tx">' + esc(o.title || L(m.title[0], m.title[1])) + '</span>'
      + (badge ? '<span class="nav-bd">' + esc(badge) + '</span>' : '') + '</button>';
  };
  var vis = App.visibleMods().filter(function (m) { return m.nav !== false; });
  vis.forEach(function (m) {
    if (!m.group) { html.push(btn(m, { on: App.page === m.id })); return; }
    if (seen[m.group]) return; seen[m.group] = 1;
    var kids = vis.filter(function (x) { return x.group === m.group; }), open = !!(cur && cur.group === m.group);
    var gt = m.groupTitle ? L(m.groupTitle[0], m.groupTitle[1]) : L(m.title[0], m.title[1]);
    html.push(btn(m, { on: open, cls: ' g-head' + (open ? ' g-open' : ''), icon: m.groupIcon || m.icon, title: gt }));
    if (open) html.push('<div class="nav-kids">' + kids.map(function (k) { return btn(k, { on: App.page === k.id, cls: ' g-kid' }); }).join('') + '</div>');
  });
  nav.innerHTML = html.join('');
  var on = nav.querySelector('.nav-b.on'); if (on && (nav.scrollWidth > nav.clientWidth || nav.scrollHeight > nav.clientHeight)) { try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { } }
};
App.go = function (id) {
  var vis = App.visibleMods(); if (!vis.length) return;
  var m = App.mod(id); if (!m || vis.indexOf(m) < 0) m = vis[0];
  App.page = m.id; Local.set('page', m.id); App.emit('page', m.id);
  App.renderNav(); App.render();
  var v = $('view'); if (v) v.scrollTop = 0;
};
App.render = function () {
  var m = App.mod(App.page), v = $('view'); if (!m || !v || !App.user) return;
  try { m.render(v); } catch (e) { console.error(e); v.innerHTML = '<div class="empty">⚠️ ' + esc(e.message) + '</div>'; }
};
/* إعادة الرسم عند تغيّر البيانات — مؤجَّلة قليلاً لتجميع التغييرات */
App.refresh = debounce(function () { App.renderNav(); App.render(); App.emit('refresh'); }, 80);
App.act('nav', function (el) { App.go(el.dataset.id); });

/* ───────── رسالة عابرة ───────── */
function toast(msg, kind) {
  var t = $('toast'); if (!t) return;
  t.textContent = msg; t.className = 'toast on' + (kind ? ' ' + kind : '');
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = 'toast'; }, kind === 'err' ? 4200 : 2400);
}

/* ───────── نافذة ───────── */
var Modal = {
  open: function (html, cls) {
    $('modal-box').className = 'modal-box' + (cls ? ' ' + cls : '');
    $('modal-box').innerHTML = html; $('modal').classList.add('on');
  },
  close: function () { $('modal').classList.remove('on'); $('modal-box').innerHTML = ''; },
  isOpen: function () { return $('modal').classList.contains('on'); },
  head: function (title) { return '<div class="m-head"><b>' + title + '</b><button class="x" data-act="modal-close" aria-label="close">✕</button></div>'; }
};
App.act('modal-close', function () { Modal.close(); });

/* ───────── حقول التاريخ الفارغة ─────────
   بعض المتصفحات بالعربية تعرض «يوم/شهر/سنة» بحروف مقلوبة. نخفي نص المتصفح حين يكون الحقل فارغاً ونعرض نصاً سليماً. */
(function () {
  function sync() { var l = document.querySelectorAll('input[type="date"]'), p = App.lang === 'fr' ? 'jj/mm/aaaa' : 'يوم/شهر/سنة';
    for (var i = 0; i < l.length; i++) { var e = l[i], empty = !e.value;
      if (e.classList.contains('dt-empty') !== empty) e.classList.toggle('dt-empty', empty);
      if (e.getAttribute('data-ph') !== p) e.setAttribute('data-ph', p); } }
  document.addEventListener('input', sync, true); document.addEventListener('change', sync, true); setInterval(sync, 500);
})();

/* ───────── اللغة والمظهر ───────── */
App.setLang = function (l) {
  App.lang = l === 'fr' ? 'fr' : 'ar'; Local.set('lang', App.lang);
  document.documentElement.lang = App.lang; document.documentElement.dir = App.lang === 'fr' ? 'ltr' : 'rtl';
  App.emit('lang'); App.renderNav(); App.render();
};
/* زر اللغة في الشريط العلوي: يبدّل بين العربية والفرنسية */
App.act('lang-toggle', function () { App.setLang(App.lang === 'fr' ? 'ar' : 'fr'); });
App.setTheme = function (t) { t = t === 'light' ? 'light' : 'dark'; Local.set('theme', t); document.documentElement.setAttribute('data-theme', t);
  var b = $('theme-b'); if (b) b.textContent = t === 'dark' ? '☀️' : '🌙';                    // الزر يعرض الوضع الذي ستنتقل إليه
  var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'dark' ? '#0F141A' : '#F4F6F8'); };
App.act('theme-toggle', function () { App.setTheme(Local.get('theme', 'light') === 'dark' ? 'light' : 'dark'); if (App.user && App.page === 'settings') App.render(); });

/* ───────── التثبيت كتطبيق (PWA) ─────────
   حين يسمح المتصفح بالتثبيت يظهر زر 📲 في الأعلى وفي الإعدادات. */
App.pwa = { evt: null, installed: false };
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); App.pwa.evt = e; var b = $('install-b'); if (b) b.classList.remove('hide'); if (App.user && App.page === 'settings') App.render(); });
window.addEventListener('appinstalled', function () { App.pwa.evt = null; App.pwa.installed = true; var b = $('install-b'); if (b) b.classList.add('hide'); toast(L('📲 ثُبّت التطبيق', '📲 Application installée')); });
App.isStandalone = function () { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; };
App.act('pwa-install', function () {
  if (App.pwa.evt) { App.pwa.evt.prompt(); if (App.pwa.evt.userChoice) App.pwa.evt.userChoice.then(function () { App.pwa.evt = null; var b = $('install-b'); if (b) b.classList.add('hide'); }); return; }
  Modal.open(Modal.head('📲 ' + L('تثبيت التطبيق', 'Installer l\'application'))
    + '<div class="box">' + L('افتح قائمة المتصفح (⋮ في Chrome، أو زر المشاركة في iPhone) ثم اختر «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».', 'Ouvrez le menu du navigateur (⋮ dans Chrome, ou Partager sur iPhone) puis « Ajouter à l\'écran d\'accueil » ou « Installer l\'application ».') + '</div>'
    + '<div class="hint">' + L('يلزم أن يكون الموقع مفتوحاً برابط https، لا من ملف على الجهاز.', 'Le site doit être ouvert en https, pas depuis un fichier local.') + '</div>', 'small');
});
