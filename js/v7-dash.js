/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-dash.js   (الرئيسية 7.4: لوحة القيادة)
   كلشي من البيانات الحقيقية، بلا collection جديدة:
     contacts (التجديد) · tasks · sinistres · dash.cards (الديون، البنك، المتابعة)
     المحرك ديال الحاسبة (السجل HIST، الصندوق CASH و CASH_MOVES)
   البلوكات: الأرقام · أولويات اليوم · نشاط اليوم (مع البارح) · الملخص المالي (المدير) · آخر العمليات · الأدوات
   + 🔔 الإشعارات (بلا تكرار، «المقروء» فهاد الجهاز) + حالة النظام + ✏️ تخصيص (لهاد الجهاز).
══════════════════════════════════════════════════════════ */
'use strict';
var D7 = { edit: false };
var D7_BLOCKS = [['kpis', 'الأرقام', 'Indicateurs'], ['prio', 'أولويات اليوم', 'Priorités du jour'], ['act', 'نشاط اليوم', 'Activité du jour'],
  ['fin', 'الملخص المالي', 'Résumé financier'], ['ops', 'آخر العمليات', 'Dernières opérations'], ['tools', 'الأدوات', 'Outils']];
function d7Cfg() {
  var c = Local.get('dash7', null), out = [];
  if (c && c.length) c.forEach(function (x) { if (D7_BLOCKS.some(function (b) { return b[0] === x.k; })) out.push({ k: x.k, on: x.on !== false }); });
  D7_BLOCKS.forEach(function (b) { if (!out.some(function (x) { return x.k === b[0]; })) out.push({ k: b[0], on: true }); });
  return out;
}
function d7On(k) { return d7Cfg().some(function (x) { return x.k === k && x.on; }); }

/* «ما جاوبوش» كفلتر فالتجديد (كيتزاد بلا ما نمسو mod-renew) */
function d7NoAns(c) { if (c.renewed || isStale(c)) return false; var h = lastCall(c); return !!(h && (typeof NOANS !== 'undefined' ? NOANS : {})[h.result] && !isOut(c)); }
App.hook('renew.filters', function () { return [{ id: 'noans', label: '📵 ' + L('ما جاوبوش', 'Sans réponse'), test: function (c) { return d7NoAns(c); } }]; });

/* ───────── الحساب ───────── */
function d7DayISO(n) { var d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); }
function d7IsDay(ts, iso) { var d = new Date(ts); return !isNaN(d) && isoOf(d) === iso; }
function d7Act(iso) {
  var o = { calls: 0, msgs: 0, handled: 0, renewed: 0 };
  renewBase().forEach(function (c) {
    (c.callHistory || []).forEach(function (h) { if (d7IsDay(h.date, iso)) { if (h.result === 'wa' || h.result === 'sms') o.msgs++; else o.calls++; } });
    if (c.handled && d7IsDay(c.handled, iso)) o.handled++;
    if (c.renewed && c.renewedAt && d7IsDay(c.renewedAt, iso)) o.renewed++;
  });
  return o;
}
function d7Pct(a, b) { if (!b) return a ? '<span class="d7-new">' + L('جديد', 'nouveau') + '</span>' : ''; var p = Math.round((a - b) / b * 100); return '<span class="d7-pct ' + (p > 0 ? 'up' : p < 0 ? 'dn' : '') + '">' + (p > 0 ? '↑ +' : p < 0 ? '↓ ' : '') + p + '%</span>'; }
function d7Fin() {
  var w = typeof ce7 === 'function' ? ce7() : null; if (!w || !w.CUR || !w.CUR.isAdmin) return null;
  try {
    var t = w.todayStr(), s = w.getSession(t), ops = w.getAllOpsForDate(t), cashOps = w.getCashOpsForDate(t), mv = w.getMovesForDate(t);
    return { open: s && s.openBal != null ? +s.openBal : null, cash: cashOps.reduce(function (a, h) { return a + (+h.off || 0); }, 0),
      other: ops.filter(function (h) { return h.payMode === 'cheque' || h.payMode === 'tpe'; }).reduce(function (a, h) { return a + (+h.paid || 0); }, 0),
      back: ops.reduce(function (a, h) { return a + (+h.diff > 0 ? +h.diff : 0); }, 0),
      inMv: mv.filter(function (m) { return m.type === 'in'; }).reduce(function (a, m) { return a + (+m.amount || 0); }, 0),
      outMv: mv.filter(function (m) { return m.type !== 'in'; }).reduce(function (a, m) { return a + (+m.amount || 0); }, 0),
      bal: w.getExpectedBalance(t), n: ops.length, closed: !!(s && s.closed) };
  } catch (e) { return null; }
}
function d7Ops() {
  var w = typeof ce7 === 'function' ? ce7() : null; if (!w) return null;
  try { w.ldH(); var me = w.CUR || {}; return (me.isAdmin ? w.HIST : w.HIST.filter(function (h) { return h.user === me.n; })).slice(0, 10); } catch (e) { return null; }
}

/* ───────── الإشعارات (بلا تكرار: كل حدث عندو مفتاح؛ المقروء كيتحفظ فهاد الجهاز) ───────── */
function d7Notifs() {
  var out = [], td = todayISO(), add = function (k, ic, t, sub, go, lvl) { out.push({ k: k, ic: ic, t: t, sub: sub || '', go: go || '', lvl: lvl || '' }); };
  if (App.can('renew') && Contacts.ready) {
    var live = renewBase().filter(function (c) { return !isStale(c) && !isOut(c) && !c.renewed; }), dl = function (c) { return daysLeft(c.dateE); };
    var nT = live.filter(function (c) { return dl(c) === 0; }).length, nX = live.filter(function (c) { return dl(c) !== null && dl(c) < 0; }).length;
    var nS = live.filter(function (c) { return dl(c) > 0 && dl(c) <= 3; }).length, nF = renewBase().filter(function (c) { return !isStale(c) && followDue(c); }).length;
    if (nT) add('t-' + td + '-' + nT, '⏰', L(nT + ' عقد كيسالي اليوم', nT + ' échéance(s) aujourd\'hui'), '', 'renew:today', 'amber');
    if (nX) add('x-' + td + '-' + nX, '⚠️', L(nX + ' عقد منتهي وما تجددش', nX + ' contrat(s) expiré(s)'), '', 'renew:expired', 'red');
    if (nS) add('s-' + td + '-' + nS, '📅', L(nS + ' عقد كيسالي خلال 3 أيام', nS + ' échéance(s) sous 3 jours'), '', 'renew:d3', '');
    if (nF) add('f-' + td + '-' + nF, '📞', L(nF + ' زبون خاصو اتصال اليوم (متابعة)', nF + ' rappel(s) aujourd\'hui'), '', 'renew:fdue', 'amber');
  }
  if (typeof Tasks !== 'undefined' && Tasks.ready && App.can('tasks') && typeof overdueTasks === 'function') { var nO = overdueTasks().filter(taskForMe).length; if (nO) add('o-' + td + '-' + nO, '📌', L(nO + ' مهمة متأخرة', nO + ' tâche(s) en retard'), '', 'tasks', 'red'); }
  if (typeof Sin !== 'undefined' && Sin.ready && App.can('sin') && typeof sinAgeCounts === 'function') { var sAg = sinAgeCounts(); if (sAg && sAg.relance) add('sr-' + td + '-' + sAg.relance, '🔔', L(sAg.relance + ' ملف حادثة يحتاج تذكير الشركة (+15 يوم)', sAg.relance + ' sinistre(s) à relancer (+15 j)'), '', 'sin:relance', 'amber'); }
  if (typeof Calc !== 'undefined' && Calc.tracker && Calc.tracker.urgent && App.can('calc')) add('rt-' + td + '-' + Calc.tracker.urgent, '💰', L(Calc.tracker.urgent + ' زبون ملزم بالأداء (+8 أيام)', Calc.tracker.urgent + ' paiement(s) dû(s) (8 j+)'), '', 'c-renewals', 'red');
  if (App.can('calc')) {
    try {
      var hAll = JSON.parse(localStorage.getItem('eurv102_h') || '[]') || [], nowMs = Date.now();
      var unpOld = hAll.filter(function (h) {
        if (!h || !h.unpaid || !h.date || h.date.length < 10) return false;
        var t = new Date(+h.date.slice(6, 10), +h.date.slice(3, 5) - 1, +h.date.slice(0, 2)).getTime();
        return !isNaN(t) && (nowMs - t) > 3 * 86400000;
      });
      if (unpOld.length) add('unp3-' + td + '-' + unpOld.length, '⏳', L(unpOld.length + ' عملية بالحاسبة غير مؤداة (+3 أيام)', unpOld.length + ' opération(s) non payée(s) (+3 j)'), '', 'c-hist:unpaid', 'red');
    } catch (e) { }
    if (typeof Chq8 !== 'undefined' && Chq8.alerts) {
      var ca = Chq8.alerts();
      if (ca.impaye) add('chq-imp-' + td + '-' + ca.impaye, '📄', L(ca.impaye + ' شيك راجع بدون رصيد (Impayé)', ca.impaye + ' chèque(s) impayé(s)'), '', 'chq', 'red');
      if (ca.due) add('chq-due-' + td + '-' + ca.due, '📄', L(ca.due + ' شيك حلّ أجل استحقاقه للإيداع', ca.due + ' chèque(s) arrivé(s) à échéance'), '', 'chq', 'amber');
    }
    if (typeof Cash !== 'undefined' && Cash.day) {
      var yDay = Cash.day(Cash.yesterday());
      if (yDay && yDay.s && yDay.s.openBal != null && !yDay.s.closed) add('caisse-y-' + td, '🗄️', L('صندوق الأمس ما زال مفتوحاً ولم يُغلق!', 'Caisse d\'hier non clôturée !'), yDay.date, 'c-caisse', 'amber');
    }
  }
  if (typeof bankCan === 'function' && bankCan() && typeof Bank !== 'undefined' && Bank.ready && typeof bkOld === 'function') { var nb = bkOld(bkEmpty()).length; if (nb) add('b-' + td + '-' + nb, '🏦', L(nb + ' عملية فالبنك بلا ملاحظة (+7 أيام)', nb + ' opération(s) bancaire(s) sans note'), '', 'bank:empty', 'amber'); }
  var ops = d7Ops(); if (ops) ops.filter(function (h) { return h.date === ce7DMY(new Date()) && App.user && h.user !== App.user.name; }).slice(0, 5).forEach(function (h) { add('op-' + h.num, '🧾', (h.client || '—') + ' · ' + money(+h.paid || 0) + ' DH', L('عملية جديدة من ', 'Nouvelle opération par ') + (h.user || '') + ' · ' + (h.time || ''), 'c-hist', ''); });
  var bk = d7LastBackup(); if (App.user && App.user.admin && (!bk || Date.now() - bk > 7 * 864e5)) add('bk-' + d7DayISO(0).slice(0, 7) + '-' + (bk ? Math.floor(bk / 6048e5) : 0), '💾', L('ما كاينش نسخة احتياطية هاد الأسبوع', 'Pas de sauvegarde cette semaine'), bk ? L('آخر وحدة: ', 'Dernière : ') + fmtDT(bk) : '', 'nt-backup', 'amber');
  if (Contacts.denied) add('sync-denied', '⛔', L('المزامنة مرفوضة (القواعد)', 'Synchronisation refusée'), '', '', 'red');
  else if (!navigator.onLine || Contacts.offline) add('sync-off-' + td, '📡', L('ما كاينش الإنترنت: التعديلات كتتسنا', 'Hors ligne : modifications en attente'), '', '', 'amber');
  return out;
}
function d7Read() { var r = Local.get('nt7_read', []); return Array.isArray(r) ? r : []; }
function d7Unread() { var r = d7Read(); return d7Notifs().filter(function (n) { return r.indexOf(n.k) < 0; }); }
function d7Bell() {
  var top = document.querySelector('.top'); if (!top || !App.user) return;
  var b = $('nt7-btn');
  if (!b) { b = document.createElement('button'); b.id = 'nt7-btn'; b.className = 'top-b nt7-b'; b.type = 'button'; b.setAttribute('data-act', 'nt7-open'); b.setAttribute('aria-label', 'notifications');
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg><i></i>';
    var anchor = $('lk7-btn') || $('uchip'); top.insertBefore(b, anchor || null); }
  var n = d7Unread().length, i = b.querySelector('i'); i.textContent = n > 99 ? '99+' : n; i.style.display = n ? '' : 'none';
}
App.act('nt7-open', function () {
  var all = d7Notifs(), r = d7Read();
  Modal.open(Modal.head('🔔 ' + L('الإشعارات', 'Notifications'))
    + (all.length ? '<div class="nt7-list">' + all.map(function (n) { var un = r.indexOf(n.k) < 0;
        return '<button class="nt7-it ' + n.lvl + (un ? ' un' : '') + '" data-act="nt7-go" data-k="' + esc(n.k) + '" data-go="' + esc(n.go) + '"><span class="nt7-ic">' + n.ic + '</span><span class="nt7-tx"><b>' + esc(n.t) + '</b>' + (n.sub ? '<small>' + esc(n.sub) + '</small>' : '') + '</span>' + (un ? '<i></i>' : '') + '</button>'; }).join('') + '</div>'
      + '<button class="btn wide" data-act="nt7-all">✓ ' + L('علّم الكل مقروء', 'Tout marquer comme lu') + '</button>'
      : '<div class="empty">✅ ' + L('ما كاين حتى إشعار', 'Aucune notification') + '</div>'), 'small');
});
function d7MarkRead(keys) { var r = d7Read(); keys.forEach(function (k) { if (r.indexOf(k) < 0) r.push(k); }); Local.set('nt7_read', r.slice(-300)); d7Bell(); }
App.act('nt7-all', function () { d7MarkRead(d7Notifs().map(function (n) { return n.k; })); Modal.close(); });
App.act('nt7-go', function (el) { d7MarkRead([el.dataset.k]); Modal.close(); var g = el.dataset.go; if (!g) return; if (g === 'nt-backup') { if (App.acts['t-backup']) App.acts['t-backup'](); return; } App.acts['dash-go']({ dataset: { go: g } }); });
App.on('login', function () { setTimeout(d7Bell, 800); }); App.on('refresh', d7Bell); App.on('page', d7Bell);
setInterval(function () { if (App.user) d7Bell(); }, 60000);

/* ───────── حالة النظام ───────── */
function d7LastBackup() {
  var a = Local.get('lastBackup', 0) || 0, s = (typeof Meta !== 'undefined') ? Meta.get('sheetsLast', null) : null, b = s && s.ok ? Date.parse(s.at) || 0 : 0;
  return Math.max(a, b) || 0;
}
App.on('sync', function () { if (!Contacts.denied && navigator.onLine && !Contacts.offline && !Contacts.pending) Local.set('lastSync', Date.now()); });
(function () { var o = App.acts['t-backup']; if (o) App.act('t-backup', function (el, e) { o(el, e); Local.set('lastBackup', Date.now()); d7Bell(); }); })();

/* ───────── الرئيسية ───────── */
(function () {
  var dashMod = App.mod('dash'); if (!dashMod) return;
  var prev = dashMod.render;
  function hello() { var h = new Date().getHours(); return h < 12 ? L('صباح الخير', 'Bonjour') : h < 18 ? L('مرحباً', 'Bonjour') : L('مساء الخير', 'Bonsoir'); }
  function dayLabel() { var d = new Date(), ar = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], fr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']; return (App.lang === 'fr' ? fr : ar)[d.getDay()] + ' ' + fmtD(todayISO()); }
  var IC = {
    x: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    ph: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    tk: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12l2 2 4-4"/>',
    car: '<path d="M5 16l1.5-5h11L19 16"/><rect x="3" y="16" width="18" height="4" rx="1"/>'
  };
  var svg = function (k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + '</svg>'; };
  function card(o) { return '<button class="d7-k ' + (o.c || '') + '" data-act="' + (o.act || 'dash-go') + '" data-go="' + esc(o.go || '') + '"><span class="d7-ki">' + svg(o.ic) + '</span><span class="d7-kt"><b>' + o.v + '</b><span>' + esc(o.t) + '</span><small>' + esc(o.s) + '</small></span></button>'; }
  function box(k, title, inner, extra) { return '<section class="d7-box d7b-' + k + '"><div class="d7-bh"><b>' + title + '</b><span class="sp"></span>' + (extra || '') + '</div>' + inner + '</section>'; }

  dashMod.render = function (el) {
    if (!App.can('renew') || !Contacts.ready) return prev(el);
    var adm = App.user.admin, live = renewBase().filter(function (c) { return !isStale(c); }), todo = live.filter(function (c) { return !isOut(c); });
    var dl = function (c) { return daysLeft(c.dateE); }, cnt = function (fn) { return todo.filter(fn).length; };
    var nX = cnt(function (c) { return !c.renewed && dl(c) !== null && dl(c) < 0; }), nT = cnt(function (c) { return !c.renewed && dl(c) === 0; });
    var n3 = cnt(function (c) { return !c.renewed && dl(c) !== null && dl(c) > 0 && dl(c) <= 3; }), n7 = cnt(function (c) { return !c.renewed && dl(c) !== null && dl(c) >= 0 && dl(c) <= 7; });
    var nC = live.filter(confirmedDue).length, nCa = live.filter(function (c) { return c.renewConfirmed && !c.renewed; }).length, nF = live.filter(followDue).length, nNo = live.filter(d7NoAns).length;
    var canT = typeof Tasks !== 'undefined' && App.can('tasks') && Tasks.ready && typeof overdueTasks === 'function', nO = canT ? overdueTasks().filter(taskForMe).length : null;
    var canS = typeof Sin !== 'undefined' && App.can('sin') && Sin.ready, sa = canS ? sinAgeCounts() : null, nS = sa ? sa.m1 + sa.m3 + sa.old + sa.nd : null;
    var cfg = d7Cfg(), on = function (k) { return cfg.some(function (x) { return x.k === k && x.on; }); };
    var canCalc = App.visibleMods().some(function (m) { return m.id === 'c-new7' || m.id === 'calc'; });
    var qa = function (act, ic, ar, fr, cls) { return '<button class="btn ' + (cls || '') + '" data-act="' + act + '">' + (ic || '') + esc(L(ar, fr)) + '</button>'; };

    /* 1. الأرقام */
    var kpis = '<div class="d7-kpis">'
      + card({ ic: 'x', v: nX, t: L('منتهي', 'Contrats expirés'), s: L('خاصهم تجديد', 'à renouveler'), c: nX ? 'red' : '', go: 'renew:expired' })
      + card({ ic: 'cal', v: nT, t: L('كيسالي اليوم', 'Échéances aujourd\'hui'), s: L('خاصهم تدخل اليوم', 'à traiter aujourd\'hui'), c: nT ? 'red' : '', go: 'renew:today' })
      + card({ ic: 'cal', v: n3, t: L('خلال 3 أيام', 'Sous 3 jours'), s: L('عقود قريبة', 'échéances proches'), c: n3 ? 'amber' : '', go: 'renew:d3' })
      + card({ ic: 'cal', v: n7, t: L('خلال 7 أيام', 'Sous 7 jours'), s: L('هاد السيمانة', 'cette semaine'), c: 'blue', go: 'renew:d7' })
      + card({ ic: 'ok', v: nC, t: L('تجديدات مؤكدة', 'Renouv. confirmés'), s: L('حان موعدهم · من ', 'à relancer · sur ') + nCa, c: 'green', go: 'renew:confirmed' })
      + card({ ic: 'ph', v: nF, t: L('عاود الاتصال', 'Clients à rappeler'), s: L('المتابعة ديال اليوم', 'rappels du jour'), c: nF ? 'amber' : '', go: 'renew:fdue' })
      + (nO !== null ? card({ ic: 'tk', v: nO, t: L('مهام متأخرة', 'Tâches en retard'), s: L('فاتهم الوقت', 'date dépassée'), c: nO ? 'red' : '', go: 'tasks' }) : '')
      + (nS !== null ? card({ ic: 'car', v: nS, t: L('حوادث مفتوحة', 'Sinistres ouverts'), s: L('أكثر من 3 أشهر: ', '> 3 mois : ') + sa.old, c: 'blue', go: 'sin' }) : '')
      + '</div>';

    /* 2. أولويات اليوم */
    var pr = [];
    if (nT) pr.push({ c: 'red', t: L('عقود كتسالي اليوم', 'Contrats expirant aujourd\'hui'), s: L('عيّط ليهم قبل ما يسالي العقد', 'à appeler avant expiration'), n: nT, b: L('عرض القائمة', 'Voir la liste'), go: 'renew:today' });
    if (nF) pr.push({ c: 'amber', t: L('عاود الاتصال', 'Rappels du jour'), s: L('طلبو تعيّط ليهم اليوم', 'rappel demandé pour aujourd\'hui'), n: nF, b: '📞 ' + L('اتصل الآن', 'Appeler'), go: 'renew:fdue' });
    if (nC) pr.push({ c: 'green', t: L('تجديدات مؤكدة', 'Renouvellements confirmés'), s: L('أكدو التجديد وحان الموعد', 'confirmés, échéance atteinte'), n: nC, b: '✓ ' + L('عرض', 'Voir'), go: 'renew:confirmed' });
    if (nNo) pr.push({ c: '', t: L('ما جاوبوش', 'Sans réponse'), s: L('آخر مكالمة ما تجاوبتش', 'dernier appel sans réponse'), n: nNo, b: L('عاود جرّب', 'Réessayer'), go: 'renew:noans' });
    if (nX) pr.push({ c: 'red', t: L('منتهيين وما تجددوش', 'Expirés non renouvelés'), s: '', n: nX, b: L('عرض', 'Voir'), go: 'renew:expired' });
    if (nO) pr.push({ c: 'red', t: L('مهام متأخرة', 'Tâches en retard'), s: L('فاتهم التاريخ ديالهم', 'date dépassée'), n: nO, b: '⏳ ' + L('متابعة', 'Suivre'), go: 'tasks' });
    if (sa && sa.relance) pr.push({ c: 'amber', t: L('حوادث تحتاج تذكير الشركة (+15ي)', 'Sinistres à relancer (+15j)'), s: L('مضى عليها أكثر من 15 يوماً دون رد', 'sans mise à jour depuis +15 jours'), n: sa.relance, b: '🔔 ' + L('تذكير', 'Relancer'), go: 'sin:relance' });
    if (sa && sa.old) pr.push({ c: 'amber', t: L('حوادث خاصها متابعة', 'Sinistres à suivre'), s: L('مفتوحة أكثر من 3 أشهر', 'ouverts depuis plus de 3 mois'), n: sa.old, b: '📁 ' + L('الملفات', 'Dossiers'), act: 'd7-sin-old' });
    if (canCalc) {
      try {
        var hAllP = JSON.parse(localStorage.getItem('eurv102_h') || '[]') || [], nowMsP = Date.now();
        var unpOldP = hAllP.filter(function (h) {
          if (!h || !h.unpaid || !h.date || h.date.length < 10) return false;
          var t = new Date(+h.date.slice(6, 10), +h.date.slice(3, 5) - 1, +h.date.slice(0, 2)).getTime();
          return !isNaN(t) && (nowMsP - t) > 3 * 86400000;
        });
        if (unpOldP.length) pr.push({ c: 'red', t: L('عمليات بالحاسبة غير مؤداة (+3 أيام)', 'Opérations non payées (+3 j)'), s: L('تجاوزت 3 أيام بدون تسديد', 'plus de 3 jours sans règlement'), n: unpOldP.length, b: '⏳ ' + L('تحصيل', 'Encaisser'), go: 'c-hist:unpaid' });
      } catch (e) { }
      if (typeof Chq8 !== 'undefined' && Chq8.alerts) {
        var caP = Chq8.alerts();
        if (caP.impaye) pr.push({ c: 'red', t: L('شيكات راجعة بدون رصيد (Impayés)', 'Chèques impayés'), s: L('تحتاج تواصل فوري مع الزبون', 'à régulariser d\'urgence'), n: caP.impaye, b: '📄 ' + L('الشيكات', 'Chèques'), go: 'chq' });
        else if (caP.due) pr.push({ c: 'amber', t: L('شيكات حلّ تاريخ استحقاقها', 'Chèques à déposer'), s: L('جاهزة للإيداع في البنك اليوم', 'échéance atteinte en portefeuille'), n: caP.due, b: '📄 ' + L('الشيكات', 'Chèques'), go: 'chq' });
      }
      if (typeof Cash !== 'undefined' && Cash.day) {
        var yDayP = Cash.day(Cash.yesterday());
        if (yDayP && yDayP.s && yDayP.s.openBal != null && !yDayP.s.closed) pr.push({ c: 'amber', t: L('صندوق الأمس لم يُغلق بعد', 'Caisse d\'hier non clôturée'), s: yDayP.date, n: '!', b: '🗄️ ' + L('الصندوق', 'Caisse'), go: 'c-caisse' });
      }
    }
    App.runList('dash.cards').filter(function (o) { return o.mod !== 'sin' && o.mod !== 'tasks'; }).forEach(function (o) {
      var v = String(o.value).replace(/<[^>]+>/g, ''); if (!v || /^0([,.]0+)?$/.test(v.replace(/[\s ]/g, ''))) return;
      pr.push({ c: o.cls || '', t: o.label, s: o.sub || '', n: o.value, b: L('عرض', 'Voir'), go: o.go || o.mod || '' }); });
    var rank = { red: 0, amber: 1, '': 2, blue: 2, green: 3 }; var rk = function (c) { return rank.hasOwnProperty(c) ? rank[c] : 2; }; pr.sort(function (a, b) { return rk(a.c) - rk(b.c); });
    var prio = pr.length ? pr.map(function (p) { return '<div class="d7-pr ' + p.c + '"><i></i><span class="tx"><b>' + esc(p.t) + '</b>' + (p.s ? '<small>' + p.s + '</small>' : '') + '</span><span class="n">' + p.n + '</span>'
      + '<button class="btn sm" data-act="' + (p.act || 'dash-go') + '" data-go="' + esc(p.go || '') + '">' + p.b + '</button></div>'; }).join('')
      : '<div class="d7-none">✅ ' + L('ما كاين والو مستعجل اليوم.', 'Rien d\'urgent aujourd\'hui.') + '</div>';

    /* 3. نشاط اليوم */
    var a = d7Act(todayISO()), y = d7Act(d7DayISO(-1));
    var act = [['📞', L('المكالمات', 'Appels effectués'), a.calls, y.calls], ['💬', L('الرسائل', 'Messages envoyés'), a.msgs, y.msgs], ['👥', L('زبناء تعاملتي معاهم', 'Clients traités'), a.handled, y.handled], ['🔄', L('تجديدات اليوم', 'Renouvellements réalisés'), a.renewed, y.renewed]]
      .map(function (r) { return '<div class="d7-ar"><span>' + r[0] + ' ' + esc(r[1]) + '</span><b>' + r[2] + '</b>' + d7Pct(r[2], r[3]) + '</div>'; }).join('')
      + '<div class="d7-ar sub"><span>' + L('تم الاتصال بهم (اللائحة)', 'Contactés (liste)') + '</span><b>' + (live.length - todo.length) + ' / ' + live.length + '</b><span></span></div>'
      + (typeof agentStatsHTML === 'function' ? agentStatsHTML(todayCalls()) : '');

    /* 4. الملخص المالي (المدير ديال الحاسبة فقط) */
    var f = on('fin') ? d7Fin() : null;
    var fin = f ? '<div class="d7-fin">'
        + '<div class="d7-fr"><span>' + L('رصيد البداية', 'Solde initial') + '</span><b>' + (f.open === null ? '<em>' + L('ما تحلّش', 'non ouvert') + '</em>' : moneyH(f.open, 1)) + '</b></div>'
        + '<div class="d7-fr in"><span>' + L('المقبوض كاش', 'Encaissé (espèces)') + '</span><b>+ ' + moneyH(f.cash, 1) + '</b></div>'
        + (f.other ? '<div class="d7-fr"><span>' + L('شيك و TPE', 'Chèques et TPE') + '</span><b>' + moneyH(f.other, 1) + '</b></div>' : '')
        + (f.inMv ? '<div class="d7-fr in"><span>' + L('مداخيل أخرى', 'Autres entrées') + '</span><b>+ ' + moneyH(f.inMv, 1) + '</b></div>' : '')
        + '<div class="d7-fr out"><span>' + L('المُرجَع للزبناء', 'Restitué') + '</span><b>− ' + moneyH(f.back, 1) + '</b></div>'
        + '<div class="d7-fr out"><span>' + L('المصاريف (حركات الخروج)', 'Dépenses') + '</span><b>− ' + moneyH(f.outMv, 1) + '</b></div>'
        + '<div class="d7-fr tot"><span>' + L('الرصيد الحالي', 'Solde actuel') + (f.closed ? ' · 🔒 ' + L('مسدود', 'clôturé') : '') + '</span><b>' + moneyH(f.bal, 1) + '</b></div>'
        + '<div class="hint">' + L('من «الصندوق» ديال الحاسبة (نفس الحساب). المُرجَع كيبان للمعلومة.', 'Depuis la Caisse (même calcul). Le restitué est indicatif.') + '</div></div>'
      : '<div class="d7-none">' + (typeof ce7 === 'function' && !ce7() ? '⏳ ' + L('كنحلّو الحاسبة…', 'Chargement…') : '🔒 ' + L('للمدير فقط', 'Réservé au gérant')) + '</div>';

    /* 5. آخر العمليات */
    var ops = on('ops') ? d7Ops() : null;
    var opsH = ops === null ? '<div class="d7-none">⏳ ' + L('كنحلّو الحاسبة…', 'Chargement…') + '</div>'
      : !ops.length ? '<div class="d7-none">' + L('ما كاين حتى عملية', 'Aucune opération') + '</div>'
      : '<div class="d7-ops">' + ops.map(function (h) { return '<button class="d7-op" data-act="d7-op" data-num="' + esc(h.num) + '"><span class="d7-on"><b>' + esc(h.client || '—') + '</b><small class="ltr">' + esc(h.plate || '') + '</small></span>'
        + '<span class="d7-oi">' + esc(h.ins || '') + (h.unpaid ? ' <em class="amber-t">⏳</em>' : '') + '</span><span class="d7-ot ltr">' + esc((h.date === ce7DMY(new Date()) ? '' : String(h.date || '').slice(0, 5) + ' ') + (h.time || '')) + '</span><span class="d7-ou">' + esc(h.user || '') + '</span><b class="d7-oa ltr">' + money(+h.paid || 0) + '</b></button>'; }).join('') + '</div>';

    /* 6. الأدوات (كلهم بحال قبل) */
    var tool = function (actn, ic, ar, fr) { return '<button data-act="' + actn + '"><span>' + ic + '</span>' + esc(L(ar, fr)) + '</button>'; };
    var tools = '<div class="d7-tools">' + tool('h-open', '✔', 'تم الاتصال بهم', 'Contactés') + tool('b-start', '📨', 'إرسال جماعي', 'Envoi groupé') + tool('t-export-notes', '📤', 'تصدير الملاحظات', 'Exporter notes')
      + tool('t-import-notes', '📥', 'استيراد ملاحظات', 'Importer notes') + tool('t-trash', '🗑️', 'السلة', 'Corbeille')
      + (App.canUp() && typeof debtOn === 'function' && debtOn() ? tool('d-import', '💰', 'ملف الديون', 'Fichier dettes') : '')
      + (adm ? tool('u-assign', '👥', 'إسناد الزبناء', 'Affecter') + tool('t-backup', '💾', 'نسخة احتياطية', 'Sauvegarde') : '') + '</div>';

    /* حالة النظام */
    var ls = Local.get('lastSync', 0), lb = d7LastBackup(), st = Contacts.denied ? ['err', L('المزامنة مرفوضة', 'Sync refusée')] : (!navigator.onLine || Contacts.offline) ? ['off', L('غير متصل', 'Hors ligne')] : Contacts.pending ? ['busy', L('كيحفظ…', 'Enregistrement…')] : ['ok', L('متصل', 'Connecté')];
    var sys = '<div class="d7-sys"><span><i class="sync ' + st[0] + '"></i>' + st[1] + '</span><span>🔄 ' + L('آخر مزامنة: ', 'Dernière synchro : ') + (ls ? fmtDT(ls) : '—') + '</span><span>💾 ' + L('آخر نسخة احتياطية: ', 'Dernière sauvegarde : ') + (lb ? fmtDT(lb) : '—') + '</span><span class="sp"></span><span>RenewPro ' + esc(App.version) + '</span></div>';

    /* ✏️ التخصيص */
    var edit = D7.edit ? '<div class="d7-edit"><b>✏️ ' + L('تخصيص الرئيسية (هاد الجهاز)', 'Personnaliser l\'accueil (cet appareil)') + '</b>' + cfg.map(function (x, i) { var b = D7_BLOCKS.filter(function (q) { return q[0] === x.k; })[0];
        return '<div class="d7-er"><label><input type="checkbox" data-inp="d7-tog" data-k="' + x.k + '"' + (x.on ? ' checked' : '') + '> ' + esc(L(b[1], b[2])) + '</label><span class="sp"></span><button class="btn ic sm" data-act="d7-mv" data-i="' + i + '" data-d="-1"' + (i ? '' : ' disabled') + '>↑</button><button class="btn ic sm" data-act="d7-mv" data-i="' + i + '" data-d="1"' + (i < cfg.length - 1 ? '' : ' disabled') + '>↓</button></div>'; }).join('')
        + '<div class="acts2"><button class="btn pri" data-act="d7-edit">✓ ' + L('صافي', 'Terminé') + '</button><button class="btn" data-act="d7-reset">↺ ' + L('رجّع الأصل', 'Par défaut') + '</button></div></div>' : '';

    var B = { kpis: kpis, prio: box('prio', '📋 ' + L('أولويات اليوم', 'Priorités du jour'), prio, '<small>' + pr.length + '</small>'),
      act: box('act', '📊 ' + L('نشاط اليوم', 'Activité du jour'), act, '<small class="d7-cmp">' + L('مقارنة بالبارح', 'vs hier') + '</small><button class="btn sm" data-act="t-today">Excel</button><button class="btn sm" data-act="t-print">' + L('طباعة', 'Imprimer') + '</button>'),
      fin: box('fin', '💵 ' + L('الملخص المالي · اليوم', 'Résumé financier · aujourd\'hui'), fin, '<button class="btn sm" data-act="nav" data-id="c-caisse">' + L('الصندوق', 'Caisse') + '</button>'),
      ops: box('ops', '🕘 ' + L('آخر العمليات', 'Dernières opérations') + (ops && ops.length ? ' (' + ops.length + ')' : ''), opsH, '<button class="btn sm" data-act="nav" data-id="c-hist">' + L('عرض الكل', 'Tout voir') + '</button>'),
      tools: box('tools', '🧰 ' + L('الأدوات', 'Outils'), tools) };
    var MAIN = { prio: 1, ops: 1 }, mainH = '', sideH = '', top = '';
    cfg.forEach(function (x) { if (!x.on) return; if (x.k === 'kpis') top += B.kpis; else if (MAIN[x.k]) mainH += B[x.k]; else if (x.k !== 'fin' || canCalc) sideH += B[x.k]; });

    el.innerHTML = '<div class="page d7">'
      + rulesBoxHTML()
      + '<div class="d7-hd"><div><h1>' + esc(hello()) + '، ' + esc(App.user.name) + ' 👋</h1><small>' + esc(dayLabel()) + (Meta.get('listName', '') ? ' · ' + esc(Meta.get('listName', '')) : '') + '</small></div>'
        + '<button class="btn sm d7-cust' + (D7.edit ? ' on' : '') + '" data-act="d7-edit">✏️ ' + L('تخصيص', 'Personnaliser') + '</button><span class="sp"></span>'
        + '<div class="d7-qa">' + (canCalc ? qa('fab7', IC7.plus, 'عملية جديدة', 'Nouvelle opération', 'pri') : '') + qa('pdf7-pick', '📄 ', 'PDF', 'PDF') + qa('dash-session', IC7.phone, 'جلسة اتصال', 'Session d\'appels') + (App.canUp() ? qa('r-import', IC7.upload, 'لائحة جديدة', 'Nouvelle liste', 'd-only') : '') + '</div></div>'
      + edit + top
      + '<div class="d7-cols"><div class="d7-main">' + mainH + '</div><div class="d7-side">' + sideH + '</div></div>'
      + sys + '</div>';
    d7Bell();
  };
})();
App.act('d7-edit', function () { D7.edit = !D7.edit; App.render(); });
App.act('d7-reset', function () { Local.set('dash7', null); App.render(); });
App.input('d7-tog', function (el) { var c = d7Cfg(); c.forEach(function (x) { if (x.k === el.dataset.k) x.on = el.checked; }); Local.set('dash7', c); App.render(); });
App.act('d7-mv', function (el) { var c = d7Cfg(), i = +el.dataset.i, j = i + (+el.dataset.d); if (j < 0 || j >= c.length) return; var t = c[i]; c[i] = c[j]; c[j] = t; Local.set('dash7', c); App.render(); });
App.act('d7-sin-old', function () { if (typeof Sin !== 'undefined') { Sin.age = 'old'; Sin.statut = 'all'; } App.go('sin'); });
App.act('d7-op', function (el) { if (typeof H7 !== 'undefined') { H7.q = el.dataset.num; H7.f = 'all'; } App.go('c-hist'); });
/* الرئيسية كتتحدّث ملي يتبدل السجل ديال الحاسبة */
(function () { var last = ''; setInterval(function () { if (App.page !== 'dash' || !App.user) return; var s = ''; try { var v = localStorage.getItem('eurv102_h') || ''; s = v.length + ':' + v.slice(0, 200) + (localStorage.getItem('eurv102_cash') || '').length + (localStorage.getItem('eurv102_cash_moves') || '').length; } catch (e) { } if (s !== last) { var f = !last; last = s; if (!f) App.refresh(); } }, 3000); })();
/* أول مرة: الحاسبة كتتحمّل فالخلفية، ملي توجد كنعاودو نرسمو الرئيسية */
App.on('login', function () { if (typeof ce7Wait === 'function') ce7Wait(function () { if (App.page === 'dash') App.render(); }); });
