/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-logs.js   (🐞 سجل الأخطاء)
   1) تلقائي: أي خطأ كيوقع فالبرنامج (ولا فالحاسبة) كيتسجل: الوقت، القسم، شكون، النسخة، شنو وقع.
   2) يدوي: زر «🐞 بلّغ على مشكل» (القائمة الجانبية / المزيد) كتكتب فيه جملة.
   كيتحفظو فـ Firestore «logs» (خاص القواعد الجديدة)، والمدير كيشوفهم فقسم «🐞 الأخطاء».
   إلا القواعد مازال ما تنشراتش: كيتحفظو فهاد الجهاز وكيتصيفطو من بعد.
══════════════════════════════════════════════════════════ */
'use strict';
var Logs = { rows: [], ready: false, unsub: null, sent: 0, seen: {}, MAX: 25, denied: false };
var LOG_Q = 'rp7_logq';
Logs.col = function () { return FB.db.collection('logs'); };
function logQ() { try { return JSON.parse(localStorage.getItem(LOG_Q) || '[]'); } catch (e) { return []; } }
function logQSet(a) { try { localStorage.setItem(LOG_Q, JSON.stringify(a.slice(-50))); } catch (e) { } }

function logAdd(kind, msg, stack, extra) {
  msg = String(msg || '').slice(0, 500); if (!msg) return;
  if (kind === 'auto') {
    if (/ResizeObserver|Script error\.?$|fonts\.g|net::ERR|Failed to load resource|offline|unavailable|Could not reach Cloud Firestore/i.test(msg)) return;
    var key = msg.slice(0, 120); if (Logs.seen[key]) return; Logs.seen[key] = 1;
    if (++Logs.sent > Logs.MAX) return;
  }
  var d = { at: new Date().toISOString(), kind: kind, msg: msg, stack: String(stack || '').slice(0, 1500), page: App.page || '', ver: App.version,
    user: App.user ? App.user.name : '', email: App.user ? App.user.email : '', w: window.innerWidth + '×' + window.innerHeight,
    ua: (navigator.userAgent.match(/(Chrome|Firefox|Edg|Safari)\/[\d.]+/) || [''])[0] + (/Mobi|Android|iPhone/.test(navigator.userAgent) ? ' · mobile' : '') };
  if (extra) Object.keys(extra).forEach(function (k) { d[k] = extra[k]; });
  if (!App.user || !FB.db) { var q = logQ(); q.push(d); logQSet(q); return Promise.resolve(); }
  return Logs.col().add(d).catch(function () { var q = logQ(); q.push(d); logQSet(q); });
}
/* الأخطاء التلقائية */
window.addEventListener('error', function (e) { logAdd('auto', e.message || (e.error && e.error.message), e.error && e.error.stack, { src: (e.filename || '').split('/').pop() + ':' + (e.lineno || '') }); });
window.addEventListener('unhandledrejection', function (e) { var r = e.reason || {}; logAdd('auto', r.message || String(r), r.stack); });
(function () { var ce = console.error; console.error = function () {
  try { var a = Array.prototype.slice.call(arguments), er = a.filter(function (x) { return x && x.stack; })[0];
    logAdd('auto', a.map(function (x) { return x && x.message ? x.message : (typeof x === 'string' ? x : ''); }).join(' ').trim(), er && er.stack); } catch (x) { }
  return ce.apply(console, arguments); }; })();
/* الحاسبة (داخل الإطار): نفس الشي */
window.rpLogFromCalc = function (msg, stack) { logAdd('auto', '[calc] ' + msg, stack, { page: App.page }); };
/* ملي كيدخل: كنصيفطو اللي بقاو فالجهاز */
App.on('login', function () { var q = logQ(); if (!q.length || !FB.db) return; logQSet([]);
  q.forEach(function (d) { if (!d.user && App.user) { d.user = App.user.name; d.email = App.user.email; } Logs.col().add(d).catch(function () { var r = logQ(); r.push(d); logQSet(r); }); }); });

/* ───────── 🐞 بلّغ على مشكل ───────── */
App.act('log7-report', function () {
  Modal.open(Modal.head('🐞 ' + L('بلّغ على مشكل', 'Signaler un problème'))
    + '<div class="hint" style="margin:0 0 8px">' + L('كتب شنو وقع (شنو درتي وشنو بان ليك). القسم والوقت والنسخة كيتزادو بوحدهم.', 'Décrivez ce qui s\'est passé. La section, l\'heure et la version sont ajoutées automatiquement.') + '</div>'
    + '<textarea id="log7-t" rows="5" placeholder="' + L('مثلاً: ضغطت على «حفظ» فالحوادث وما تحفظش الملف 1193/26', 'Ex. : « Enregistrer » ne sauvegarde pas le dossier 1193/26') + '"></textarea>'
    + '<button class="btn pri wide" data-act="log7-send">' + L('صيفط', 'Envoyer') + '</button>', 'small');
  setTimeout(function () { var t = $('log7-t'); if (t) t.focus(); }, 50);
});
App.act('log7-send', function () {
  var t = ($('log7-t') || {}).value || ''; if (!t.trim()) { toast(L('كتب شي حاجة', 'Écrivez quelque chose'), 'err'); return; }
  var from = Logs.lastPage || App.page;
  Modal.close(); logAdd('user', t.trim(), '', { page: from }).then(function () { toast('🐞 ' + L('توصل البلاغ، شكراً', 'Signalement envoyé, merci')); });
});
App.on('page', function (id) { if (id !== 'logs') Logs.lastPage = id; });

/* ───────── قسم «🐞 الأخطاء» (المدير) ───────── */
Logs.start = function () {
  if (Logs.unsub || !FB.db || !App.user || !App.user.admin) return;
  Logs.unsub = Logs.col().orderBy('at', 'desc').limit(500).onSnapshot(function (s) {
    Logs.rows = s.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).filter(function (x) { return x.kind !== 'sec'; }); Logs.ready = true; Logs.denied = false; App.refresh();
  }, function () { Logs.denied = true; Logs.ready = true; App.refresh(); });
};
App.on('login', function () { setTimeout(Logs.start, 1500); });
App.on('refresh', function () { if (!Logs.unsub && App.user && App.user.admin) Logs.start(); });
App.on('logout', function () { if (Logs.unsub) { try { Logs.unsub(); } catch (e) { } } Logs.unsub = null; Logs.rows = []; Logs.ready = false; });
var LogV = { f: 'all' };
function logSeenAt() { return Local.get('logs_seen', ''); }
function renderLogs(el) {
  if (!Logs.ready) { el.innerHTML = '<div class="empty">⏳</div>'; Logs.start(); return; }
  var seen = logSeenAt(), rows = Logs.rows.filter(function (r) { return LogV.f === 'all' || r.kind === LogV.f; });
  var n = { all: Logs.rows.length, user: Logs.rows.filter(function (r) { return r.kind === 'user'; }).length }; n.auto = n.all - n.user;
  el.innerHTML = '<div class="page narrow lg7">'
    + (Logs.denied ? '<div class="box red">⚠️ ' + L('Firestore رافض «logs»: انشر القواعد الجديدة (🎛️ لوحة التحكم ← ⚙️ الإعدادات ← قواعد Firestore). حتى تنشرها، الأخطاء كتبقى محفوظة فالأجهزة وكتصيفط من بعد.', 'Firestore refuse « logs » : publiez les nouvelles règles. En attendant, les erreurs restent sur les appareils.') + '</div>' : '')
    + '<div class="chips">'
      + [['all', L('الكل', 'Tout')], ['user', '🐞 ' + L('بلاغات', 'Signalements')], ['auto', '⚙️ ' + L('تلقائي', 'Automatiques')]].map(function (c) { return '<button class="chip' + (LogV.f === c[0] ? ' on' : '') + '" data-act="log7-f" data-f="' + c[0] + '">' + c[1] + ' <b>' + n[c[0]] + '</b></button>'; }).join('')
    + '</div>'
    + '<div class="bar log7-acts"><button class="btn" data-act="log7-report">🐞 ' + L('بلّغ على مشكل', 'Signaler') + '</button>'
      + (Logs.rows.length ? '<button class="btn" data-act="log7-xls">📥 Excel</button><button class="btn danger" data-act="log7-clear">🗑️ ' + L('مسح الكل', 'Tout effacer') + '</button>' : '') + '</div>'
    + (rows.length ? '<div class="lg7-list">' + rows.map(function (r) {
        var isNew = !seen || r.at > seen, m = App.mod(r.page);
        return '<div class="lg7-it' + (r.kind === 'user' ? ' u' : '') + (isNew ? ' new' : '') + '">'
          + '<div class="lg7-h"><b>' + (r.kind === 'user' ? '🐞 ' : '⚙️ ') + esc(fmtDT(r.at)) + '</b><span>' + esc(r.user || r.email || '—') + '</span><span>' + esc(m ? (typeof t7 === 'function' ? t7(m) : m.title[0]) : r.page || '—') + '</span><span class="ltr">v' + esc(r.ver || '') + '</span><span class="ltr">' + esc(r.ua || '') + ' ' + esc(r.w || '') + '</span>'
          + '<button class="x sm" data-act="log7-del" data-id="' + esc(r.id) + '">✕</button></div>'
          + '<div class="lg7-m">' + esc(r.msg) + '</div>'
          + (r.stack || r.src ? '<details><summary>' + L('التفاصيل التقنية', 'Détails techniques') + '</summary><pre>' + esc((r.src ? r.src + '\n' : '') + (r.stack || '')) + '</pre></details>' : '')
          + '</div>'; }).join('') + '</div>'
      : '<div class="empty">✅ ' + L('ما كاين حتى خطأ.', 'Aucune erreur.') + '</div>')
    + '</div>';
  if (Logs.rows.length) Local.set('logs_seen', Logs.rows[0].at);
}
App.act('log7-f', function (el) { LogV.f = el.dataset.f; App.render(); });
App.act('log7-del', function (el) { Logs.col().doc(el.dataset.id).delete().catch(syncErr); });
App.act('log7-clear', function () { if (!confirm(L('نمسحو كاع الأخطاء؟', 'Effacer toutes les erreurs ?'))) return;
  FB.batches(Logs.rows.map(function (r) { return { ref: Logs.col().doc(r.id), del: true }; })).catch(syncErr); });
App.act('log7-xls', function () {
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Logs.rows.map(function (r) { return { Date: fmtDT(r.at), Type: r.kind, Utilisateur: r.user, Section: r.page, Version: r.ver, Message: r.msg, Appareil: (r.ua || '') + ' ' + (r.w || ''), Details: (r.src || '') + ' ' + (r.stack || '') }; })), 'Erreurs');
  XLSX.writeFile(wb, 'renewpro_erreurs_' + todayISO() + '.xlsx');
});
App.register({ id: 'logs', icon: '🐞', title: ['الأخطاء', 'Erreurs'], order: 86, render: renderLogs, admin: true,
  badge: function () { var s = logSeenAt(); var n = Logs.rows.filter(function (r) { return !s || r.at > s; }).length; return n ? String(n) : ''; } });
