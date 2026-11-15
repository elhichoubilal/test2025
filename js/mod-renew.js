/* ══════════════════════════════════════════════════════════
   RenewPro 2 — mod-renew.js   (قسم التجديد)
   اللائحة، بطاقة الزبون، الرسائل، نتيجة الاتصال، التجديد، الاستيراد، جلسة الاتصال.

   نقاط الربط التي يوفّرها للأقسام الأخرى (لا تعدّل هذا الملف، استعمل App.hook):
     contact.chips(c)      → شارات صغيرة على سطر الزبون
     contact.blocks(c)     → محتوى داخل بطاقة الزبون (مثلاً بطاقة الدين)
     session.blocks(c)     → محتوى داخل جلسة الاتصال
     renew.filters()       → فلاتر إضافية [{id,label,test(c)}]
     renew.tools()         → أزرار إضافية أعلى اللائحة
══════════════════════════════════════════════════════════ */
'use strict';

var Renew = { filter: 'all', q: '', sort: 'file', dir: 1, limit: 120, openId: null, from: '', to: '', pendingCall: null, pickN: 1 };
function sameDay(ts) { var d = new Date(ts); return !isNaN(d) && isoOf(d) === todayISO(); }
function phoneN(c, n) { return (n === 2 && hasTwo(c)) ? c.phone2 : (c.phone || ''); }
/* محاولات اليوم مع هذا الزبون: أي رقم، وأي نتيجة */
function attemptsHTML(c) { var a = (c.callHistory || []).filter(function (h) { return sameDay(h.date); }); if (!a.length) return '';
  return '<div class="tries">' + a.map(function (h) { return '<span>' + (h.phone ? ltr(h.phone) + ' ' : '') + csLabel(h.result) + '</span>'; }).join('') + '</div>'; }

/* نتائج الاتصال */
var CS = {
  ans:  { ic: '✅', ar: 'أجاب', fr: 'A répondu', color: '#10B981' },
  no:   { ic: '❌', ar: 'لم يجب', fr: 'Sans réponse', color: '#EF4444' },
  busy: { ic: '📵', ar: 'مشغول', fr: 'Occupé', color: '#F59E0B' },
  later:{ ic: '⏰', ar: 'اتصل لاحقاً', fr: 'Rappeler', color: '#8B5CF6' },
  wa:   { ic: '📩', ar: 'واتساب أُرسلت', fr: 'WhatsApp envoyé', color: '#25D366' },
  sms:  { ic: '✉️', ar: 'SMS أُرسلت', fr: 'SMS envoyé', color: '#60A5FA' },
  off:  { ic: '📴', ar: 'مغلق', fr: 'Éteint', color: '#64748B' },
  bv:   { ic: '📭', ar: 'العلبة الصوتية', fr: 'Boîte vocale', color: '#F59E0B' },
  hz:   { ic: '📡', ar: 'خارج التغطية', fr: 'Hors zone', color: '#64748B' },
  dead: { ic: '🚫', ar: 'رقم غير شغّال', fr: 'N° injoignable', color: '#EF4444' },
  vm:   { ic: '📲', ar: 'بريد صوتي', fr: 'Messagerie', color: '#8B5CF6' },
  nowa: { ic: '🚫', ar: 'لا واتساب عنده', fr: 'Pas de WhatsApp', color: '#64748B' }
};
function csLabel(k) { var s = CS[k]; return s ? s.ic + ' ' + (App.lang === 'fr' ? s.fr : s.ar) : esc(k || ''); }

/* ───────── قواعد الحالة ───────── */
function canSee(c) { return !!c && (App.user.admin || !!Meta.get('agentsSeeAll', false) || (c.agent || '') === App.user.name); }
function staleDays() { var v = parseInt(Meta.get('staleDays', 15), 10); return v > 0 ? v : 15; }
/* منتهٍ منذ مدة طويلة ولم يجدّد → يخرج من اللائحة العادية إلى «منتهية قديمة» */
function isStale(c) { if (c.keep) return false; if (c.archived) return true; if (c.renewed) return false; var d = daysLeft(c.dateE); return d !== null && d < -staleDays(); }
/* البوليصة كاملة: عمود cat في ملف التجديد هو بادئة البوليصة («8» + «0161300399» = «8/0161300399») */
function polFull(c) { var p = String((c && c.police) || '').trim(), k = String((c && c.cat) || '').trim(); return (p && k && p.indexOf('/') < 0 && /^\d{1,2}$/.test(k)) ? k + '/' + p : p; }
/* تم الاتصال به (واتساب، SMS، أو نتيجة مكالمة) → يخرج من القائمة إلى قسم «تم الاتصال بهم».
   يرجع تلقائياً يوم موعد المتابعة إن حُدّد له موعد. */
function isOut(c) { return !!c.handled && !(c.followDate && c.followDate <= todayISO()); }
function followDue(c) { return !c.renewed && !!c.followDate && c.followDate <= todayISO(); }
var NOANS = { no: 1, busy: 1, bv: 1, hz: 1, off: 1, vm: 1 };          // نتائج تستدعي إعادة الاتصال
var TIME_F = { all: 1, expired: 1, today: 1, d3: 1, d7: 1, d30: 1, range: 1, debt: 1 };   // قوائم يخرج منها من تم الاتصال به
function hasTwo(c) { return !!(c && c.phone && c.phone2 && String(c.phone2).trim() && String(c.phone2).trim() !== String(c.phone).trim()); }
function callCount(c) { return (c && c.callHistory && c.callHistory.length) || 0; }
function lastCall(c) { var h = c && c.callHistory; return h && h.length ? h[h.length - 1] : null; }
function confirmedDue(c) { if (!c.renewConfirmed || c.renewed) return false; var d = daysLeft(c.dateE); if (d === null) return false; return d <= (c.renewReminderDays != null ? c.renewReminderDays : 1); }

var RENEW_FILTERS = [
  ['all',       function () { return L('الكل', 'Tous'); },            function () { return true; }],
  ['expired',   function () { return L('منتهي', 'Expiré'); },         function (c, d) { return !c.renewed && d !== null && d < 0; }],
  ['today',     function () { return L('اليوم', 'Auj.'); },           function (c, d) { return !c.renewed && d === 0; }],
  ['d3',        function () { return L('3 أيام', '3 j'); },           function (c, d) { return !c.renewed && d !== null && d >= 0 && d <= 3; }],
  ['d7',        function () { return L('7 أيام', '7 j'); },           function (c, d) { return !c.renewed && d !== null && d >= 0 && d <= 7; }],
  ['d30',       function () { return L('30 يوماً', '30 j'); },        function (c, d) { return !c.renewed && d !== null && d >= 0 && d <= 30; }],
  ['confirmed', function () { return L('✅ مؤكد', '✅ Confirmé'); },   function (c) { return !!c.renewConfirmed && !c.renewed; }],
  ['followup',  function () { return L('⏰ متابعة', '⏰ Suivi'); },    function (c) { return !!c.followup && !c.renewed; }],
  ['fdue',      function () { return L('⏰ موعد اليوم', '⏰ Rappels du jour'); }, function (c) { return followDue(c); }],
  ['handled',   function () { return L('✔ تم الاتصال بهم', '✔ Contactés'); }, function (c) { return isOut(c); }],
  ['done',      function () { return L('تم التجديد', 'Renouvelé'); }, function (c) { return !!c.renewed; }]
];
function renewFilters() {
  var extra = App.runList('renew.filters').map(function (f) { return [f.id, function () { return f.label; }, f.test]; });
  return RENEW_FILTERS.concat(extra);
}
/* فلترة حسب تاريخ الانتهاء (من … إلى …) */
function inRange(c) { if (!c.dateE || (!Renew.from && !Renew.to)) return false; return (!Renew.from || c.dateE >= Renew.from) && (!Renew.to || c.dateE <= Renew.to); }
function rangeLabel() { var f = Renew.from ? fmtD(Renew.from).slice(0, 5) : '…', t = Renew.to ? fmtD(Renew.to).slice(0, 5) : '…'; return f + ' ← ' + t; }
function renewBase() { return Contacts.list.filter(function (c) { return !c.deleted && canSee(c); }); }
function renewList(filter, q) {
  var base = renewBase(), f = renewFilters().filter(function (x) { return x[0] === filter; })[0];
  var list = filter === 'stale' ? base.filter(isStale)
    : filter === 'range' ? base.filter(inRange)
    : base.filter(function (c) { return !isStale(c) && (!f || f[2](c, daysLeft(c.dateE))); });
  q = String(q || '').toLowerCase().trim();
  if (!q && TIME_F[filter]) list = list.filter(function (c) { return !isOut(c); });   // البحث يجد الجميع
  if (filter === 'handled') list = list.slice().sort(function (a, b) { return String(b.handled).localeCompare(String(a.handled)); });
  if (q) list = list.filter(function (c) {
    return [c.name, c.phone, c.phone2, c.plate, c.police, c.att, c.ville, c.marque, c.note].join(' ').toLowerCase().indexOf(q) >= 0;
  });
  if (Renew.sort !== 'file') {
    var key = Renew.sort, dir = Renew.dir;
    list = list.slice().sort(function (a, b) {
      var r = 0;
      if (key === 'days') { var x = daysLeft(a.dateE), y = daysLeft(b.dateE); r = (x === null ? 9e9 : x) - (y === null ? 9e9 : y); }
      else if (key === 'name') r = String(a.name || '').localeCompare(String(b.name || ''));
      else if (key === 'prime') r = (+b.prime || 0) - (+a.prime || 0);
      return r * dir;
    });
  }
  return list;
}

/* ───────── عناصر العرض ───────── */
function daysChip(c) {
  if (c.renewed) return '<span class="dc ok">' + L('تم ✓', 'Fait ✓') + '</span>';
  var d = daysLeft(c.dateE);
  if (d === null) return '<span class="dc">—</span>';
  if (d < 0) return '<span class="dc red">' + L('منتهي منذ ' + (-d) + ' ي', 'Expiré ' + (-d) + ' j') + '</span>';
  if (d === 0) return '<span class="dc amber">' + L('ينتهي اليوم', 'Auj.') + '</span>';
  return '<span class="dc ' + (d <= 3 ? 'amber' : d <= 7 ? 'cyan' : '') + '">' + L('باقي ' + d + ' ي', d + ' j') + '</span>';
}
function rowChips(c) {
  var h = lastCall(c), s = '';
  if (c.renewConfirmed && !c.renewed) s += '<span class="mini green">✅</span>';
  if (c.handled) s += '<span class="mini green">✔</span>';
  if (c.followDate && !c.renewed) s += '<span class="mini' + (followDue(c) ? ' red' : '') + '">⏰' + fmtD(c.followDate).slice(0, 5) + '</span>';
  if (h && CS[h.result]) s += '<span class="mini" title="' + esc(csLabel(h.result)) + '">' + CS[h.result].ic + (callCount(c) > 1 ? callCount(c) : '') + '</span>';
  if (c.noWa) s += '<span class="mini" title="' + L('لا واتساب', 'Pas de WhatsApp') + '">🚫💬</span>';
  if (c.note) s += '<span class="mini">📝</span>';
  return s + App.run('contact.chips', c);
}
function rowHTML(c) {
  var id = esc(c.id);
  return '<div class="row' + (Renew.openId === c.id ? ' sel' : '') + '" data-act="r-open" data-id="' + id + '">'
    + '<div class="row-main"><div class="row-name">' + esc(c.name || '—') + ' ' + rowChips(c) + '</div>'
    + '<div class="row-sub">' + (c.phone ? ltr(c.phone) : '<i class="amber-t">' + L('بلا هاتف', 'sans tél.') + '</i>')
      + (c.plate ? ' · ' + ltr(c.plate) : '') + (c.dateE ? ' · ' + fmtD(c.dateE) : '') + '</div></div>'
    + '<div class="row-side">' + daysChip(c) + '</div>'
    + '<div class="row-acts">'
      + (c.phone ? '<a class="ib call" href="' + telHref(c.phone) + '" data-act="r-call" data-id="' + id + '" title="' + L('اتصال', 'Appeler') + '">📞</a>'
                   + '<button class="ib wa" data-act="r-wa" data-id="' + id + '" title="WhatsApp">💬</button>' : '')
      + '<button class="ib" data-act="c-renew" data-id="' + id + '" title="' + L('تجديد', 'Renouveler') + '">🔄</button>'
      + '<button class="ib' + (c.followup ? ' on' : '') + '" data-act="c-follow" data-id="' + id + '" title="' + L('متابعة', 'Suivi') + '">⏰</button>'
      + '<button class="ib" data-act="c-edit" data-id="' + id + '" title="' + L('تعديل', 'Modifier') + '">✏️</button>'
      + (isOut(c) ? '<button class="ib" data-act="h-restore" data-id="' + id + '" title="' + L('إرجاع للقائمة', 'Remettre') + '">↩</button>'
                  : '<button class="ib done" data-act="c-done" data-id="' + id + '" title="' + L('انتهيت', 'Terminé') + '">✔</button>')
    + '</div></div>';
}
/* أعمدة جدول الحاسوب: يختار كل جهاز ما يُعرض منها */
var TCOLS = [
  ['ord',    '#',                         'file',  function (c) { return '<td class="muted">' + (c.ord != null ? c.ord : '') + '</td>'; }],
  ['name',   ['الاسم', 'Nom'],            'name',  function (c) { return '<td class="strong">' + esc(c.name || '—') + '</td>'; }],
  ['phone',  ['الهاتف', 'Tél.'],          '',      function (c) { return '<td>' + (c.phone ? ltr(c.phone) : '<i class="amber-t">' + L('بلا هاتف', 'sans tél.') + '</i>') + '</td>'; }],
  ['phone2', ['هاتف 2', 'Tél. 2'],        '',      function (c) { return '<td>' + (hasTwo(c) ? ltr(c.phone2) : '—') + '</td>'; }],
  ['plate',  ['اللوحة', 'Immat.'],        '',      function (c) { return '<td>' + (c.plate ? ltr(c.plate) : '—') + '</td>'; }],
  ['police', ['البوليصة', 'Police'],      '',      function (c) { return '<td>' + (c.police ? ltr(polFull(c)) : '—') + '</td>'; }],
  ['end',    ['الانتهاء', 'Échéance'],    'days',  function (c) { return '<td>' + (c.dateE ? fmtD(c.dateE) + ' ' : '') + daysChip(c) + '</td>'; }],
  ['prime',  ['السعر', 'Prime'],          'prime', function (c) { return '<td>' + (c.prime ? moneyH(c.prime) : '—') + '</td>'; }],
  ['marque', ['الماركة', 'Marque'],       '',      function (c) { return '<td>' + esc(c.marque || '—') + '</td>'; }],
  ['ville',  ['المدينة', 'Ville'],        '',      function (c) { return '<td>' + esc(c.ville || '—') + '</td>'; }],
  ['duree',  ['نوع المدة', 'Durée'],      '',      function (c) { return '<td>' + esc(c.duree || '—') + '</td>'; }],
  ['follow', ['المتابعة', 'Suivi'],       '',      function (c) { return '<td>' + rowChips(c) + '</td>'; }],
  ['agent',  ['المسؤول', 'Agent'],        '',      function (c) { return '<td class="muted">' + esc(c.agent || '') + '</td>'; }],
  ['acts',   ['إجراءات', 'Actions'],      '',      function (c) { var id = esc(c.id);
    return '<td class="t-acts">' + (c.phone ? '<a class="ib call" href="' + telHref(c.phone) + '" data-act="r-call" data-id="' + id + '" title="' + L('اتصال', 'Appeler') + '">📞</a><button class="ib wa" data-act="r-wa" data-id="' + id + '" title="WhatsApp">💬</button>' : '')
      + '<button class="ib" data-act="c-renew" data-id="' + id + '" title="' + L('تجديد', 'Renouveler') + '">🔄</button><button class="ib' + (c.followup ? ' on' : '') + '" data-act="c-follow" data-id="' + id + '" title="' + L('متابعة', 'Suivi') + '">⏰</button>'
      + '<button class="ib" data-act="c-edit" data-id="' + id + '" title="' + L('تعديل', 'Modifier') + '">✏️</button>'
      + (isOut(c) ? '<button class="ib" data-act="h-restore" data-id="' + id + '" title="' + L('إرجاع للقائمة', 'Remettre') + '">↩</button>' : '<button class="ib done" data-act="c-done" data-id="' + id + '" title="' + L('انتهيت', 'Terminé') + '">✔</button>') + '</td>'; }]
];
var TCOLS_OFF_DEFAULT = ['phone2', 'marque', 'ville', 'duree'];
function tcolsOff() { var v = Local.get('cols_off', null); return Array.isArray(v) ? v : TCOLS_OFF_DEFAULT; }
function tcolLabel(col) { return Array.isArray(col[1]) ? L(col[1][0], col[1][1]) : col[1]; }
function tableHTML(list) {
  var off = tcolsOff(), cols = TCOLS.filter(function (c) { return off.indexOf(c[0]) < 0; });
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr>'
    + cols.map(function (col) { var k = col[2];
        return '<th' + (k ? ' data-act="r-sort" data-k="' + k + '" class="sortable' + (Renew.sort === k ? ' on' : '') + '"' : '') + '>' + tcolLabel(col) + (k && Renew.sort === k ? (Renew.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>'; }).join('')
    + '</tr></thead><tbody>'
    + list.map(function (c) { return '<tr class="' + (Renew.openId === c.id ? 'sel' : '') + '" data-act="r-open" data-id="' + esc(c.id) + '">' + cols.map(function (col) { return col[3](c); }).join('') + '</tr>'; }).join('')
    + '</tbody></table></div>';
}
App.act('r-cols', function () { var off = tcolsOff();
  Modal.open(Modal.head('🧱 ' + L('أعمدة الجدول', 'Colonnes du tableau'))
    + TCOLS.map(function (col) { return '<label class="chk"><input type="checkbox" data-inp="r-col" data-k="' + col[0] + '"' + (off.indexOf(col[0]) < 0 ? ' checked' : '') + (col[0] === 'name' ? ' disabled' : '') + '><span>' + tcolLabel(col) + '</span></label>'; }).join('')
    + '<button class="btn wide" data-act="r-cols-reset">↺ ' + L('الافتراضي', 'Par défaut') + '</button>', 'small'); });
App.input('r-col', function (el) { var off = tcolsOff().slice(), k = el.dataset.k, p = off.indexOf(k); if (el.checked) { if (p >= 0) off.splice(p, 1); } else if (p < 0) off.push(k); Local.set('cols_off', off); renewFill(); });
App.act('r-cols-reset', function () { Local.set('cols_off', TCOLS_OFF_DEFAULT); Modal.close(); renewFill(); });

/* ───────── صفحة التجديد ─────────
   حقل البحث يبقى في مكانه ولا يُعاد رسمه: إعادة رسمه مع كل حرف كانت تقطع الكتابة في لوحة مفاتيح الهاتف. */
function renderRenew(el) {
  if (!Contacts.ready) { el.innerHTML = '<div class="empty">⏳ ' + L('جارٍ تحميل البيانات…', 'Chargement…') + '</div>'; return; }
  var sh = $('r-shell');
  if (!sh || sh.dataset.lang !== App.lang) {
    el.innerHTML = '<div class="page" id="r-shell" data-lang="' + App.lang + '">'
      + '<div class="bar"><div class="search"><span>🔍</span><input id="r-q" data-inp="r-q" autocomplete="off" placeholder="' + L('الاسم، الهاتف، اللوحة، البوليصة…', 'Nom, tél., immat., police…') + '" value="' + esc(Renew.q) + '">'
        + '<button class="search-x" data-act="r-clearq" aria-label="clear">✕</button></div>'
        + '<button class="btn pri" id="r-sess" data-act="s-start"></button>'
        + '<button class="btn ic" data-act="r-menu" title="' + L('المزيد', 'Plus') + '">⋯</button></div>'
      + '<div class="chips" id="r-chips"></div><div id="r-tools"></div><div id="r-body"></div></div>';
  }
  renewFill();
  if (Renew.openId && Sheet.isOpen()) Sheet.refresh();
}
function renewFill() {
  var body = $('r-body'); if (!body) return;
  var base = renewBase(), live = base.filter(function (c) { return !isStale(c); });
  var filters = renewFilters(), nStale = base.length - live.length;
  var chips = filters.map(function (f) {
    var n = live.filter(function (c) { return f[2](c, daysLeft(c.dateE)) && !(TIME_F[f[0]] && isOut(c)); }).length;
    if (!n && f[0] !== 'all' && Renew.filter !== f[0]) return '';
    return '<button class="chip' + (Renew.filter === f[0] ? ' on' : '') + ' f-' + f[0] + '" data-act="r-filter" data-f="' + esc(f[0]) + '">' + f[1]() + ' <b>' + n + '</b></button>';
  }).join('') + (nStale ? '<button class="chip' + (Renew.filter === 'stale' ? ' on' : '') + '" data-act="r-filter" data-f="stale">🗄️ ' + L('منتهية قديمة', 'Anciens') + ' <b>' + nStale + '</b></button>' : '');
  var list = renewList(Renew.filter, Renew.q), todo = sessionQueue().length, html;
  if (!base.length) {
    html = '<div class="empty"><div class="empty-ic">📋</div><b>' + L('لا توجد لائحة تجديد', 'Aucune liste') + '</b>'
      + '<span>' + (App.canUp() ? L('حمّل ملف Excel المصدَّر من برنامج الشركة.', 'Importez le fichier Excel exporté.') : L('لم يُسند إليك أي زبون بعد.', 'Aucun client assigné.')) + '</span>'
      + (App.canUp() ? '<button class="btn pri" data-act="r-import">📥 ' + L('تحميل لائحة التجديد', 'Importer la liste') + '</button>' : '') + '</div>';
  } else if (!list.length) {
    html = '<div class="empty"><div class="empty-ic">🔍</div><b>' + L('لا نتائج', 'Aucun résultat') + '</b></div>';
  } else {
    var shown = list.slice(0, Renew.limit);
    html = (isDesktop() ? tableHTML(shown) : '<div class="rows">' + shown.map(rowHTML).join('') + '</div>')
      + (list.length > shown.length ? '<button class="btn wide" data-act="r-more">▼ ' + L('عرض المزيد', 'Afficher plus') + ' (' + (list.length - shown.length) + ')</button>' : '');
  }
  $('r-chips').innerHTML = '<button class="chip' + (Renew.filter === 'range' ? ' on' : '') + '" data-act="r-range">📅 ' + ((Renew.from || Renew.to) ? '<span class="ltr">' + rangeLabel() + '</span> <b>' + base.filter(function (c) { return inRange(c) && !isOut(c); }).length + '</b>' : L('حسب التاريخ', 'Par date')) + '</button>' + chips;
  var sb = $('r-sess'); sb.disabled = !todo; sb.innerHTML = '▶ ' + L('جلسة اتصال', 'Session') + ' <b>' + todo + '</b>';
  $('r-tools').innerHTML = App.run('renew.tools')
    + (Renew.filter === 'handled' && list.length ? '<div class="acts2" style="margin:0 0 8px">'
        + '<button class="btn" data-act="h-noans">↩ ' + L('إرجاع من لم يجب', 'Remettre les sans réponse') + ' (' + list.filter(function (c) { var h = lastCall(c); return h && NOANS[h.result]; }).length + ')</button>'
        + '<button class="btn" data-act="h-all">↩ ' + L('إرجاع الكل', 'Tout remettre') + '</button></div>' : '');
  body.innerHTML = '<div class="list-head"><span>' + list.length + ' ' + L('زبون', 'clients') + '</span>'
      + (isDesktop() ? '<button class="link" data-act="r-cols">🧱 ' + L('الأعمدة', 'Colonnes') + '</button>' : '')
      + '<button class="link" data-act="r-sortmenu">' + L('الترتيب: ', 'Tri : ') + { file: L('ملف Excel', 'fichier Excel'), days: L('الأقرب انتهاءً', 'échéance'), name: L('الاسم', 'nom'), prime: L('السعر', 'prime') }[Renew.sort] + ' ▾</button></div>' + html;
  var inp = $('r-q'); if (inp && document.activeElement !== inp && inp.value !== Renew.q) inp.value = Renew.q;
  var sx = document.querySelector('#r-shell .search-x'); if (sx) sx.style.display = Renew.q ? '' : 'none';
}
App.input('r-q', debounce(function (el) { Renew.q = el.value; Renew.limit = 120; renewFill(); }, 120));
App.act('r-clearq', function () { Renew.q = ''; var i = $('r-q'); if (i) { i.value = ''; i.focus(); } renewFill(); });
App.act('r-filter', function (el) { Renew.filter = el.dataset.f; Renew.limit = 120; App.render(); });
/* نافذة اختيار الفترة: عرض اللائحة أو بدء جلسة مخصّصة مباشرة */
App.act('r-range', function () {
  var quick = [[L('اليوم', 'Aujourd\'hui'), 0, 0], [L('غداً', 'Demain'), 1, 1], [L('3 أيام', '3 jours'), 0, 3], [L('7 أيام', '7 jours'), 0, 7], [L('15 يوماً', '15 jours'), 0, 15], [L('30 يوماً', '30 jours'), 0, 30]];
  Modal.open(Modal.head('📅 ' + L('حسب تاريخ الانتهاء', 'Par date d\'échéance'))
    + '<div class="grid2"><label class="f"><span>' + L('من', 'Du') + '</span><input id="rg-from" type="date" dir="ltr" data-inp="rg-date" value="' + esc(Renew.from) + '"></label>'
      + '<label class="f"><span>' + L('إلى', 'Au') + '</span><input id="rg-to" type="date" dir="ltr" data-inp="rg-date" value="' + esc(Renew.to) + '"></label></div>'
    + '<div class="chips wrap" style="margin-top:8px">' + quick.map(function (q) { return '<button class="chip" data-act="rg-quick" data-a="' + q[1] + '" data-b="' + q[2] + '">' + q[0] + '</button>'; }).join('') + '</div>'
    + '<div id="rg-count" class="muted sm" style="margin:8px 0"></div>'
    + '<div class="acts2"><button class="btn" data-act="rg-apply">🔍 ' + L('عرض اللائحة', 'Afficher la liste') + '</button>'
    + '<button class="btn pri" data-act="rg-session">▶ ' + L('جلسة مخصّصة', 'Session ciblée') + '</button></div>'
    + ((Renew.from || Renew.to) ? '<button class="btn wide" data-act="rg-clear">✕ ' + L('إلغاء الفلترة بالتاريخ', 'Retirer le filtre par date') + '</button>' : ''), 'small');
  rangeCount();
});
function rangeRead() { var a = $('rg-from'), b = $('rg-to'); if (!a || !b) return false; var f = a.value || '', t = b.value || ''; if (f && t && f > t) { var x = f; f = t; t = x; } Renew.from = f; Renew.to = t; return !!(f || t); }
function rangeCount() { var e = $('rg-count'); if (!e) return; var keepF = Renew.from, keepT = Renew.to, ok = rangeRead();
  if (ok) { var all = renewBase().filter(inRange), todo = all.filter(function (c) { return !c.renewed && !isOut(c) && c.phone; }).length;
    e.textContent = all.length + ' ' + L('زبون في هذه الفترة', 'clients sur cette période') + ' · ' + todo + ' ' + L('للاتصال', 'à appeler'); }
  else e.textContent = L('اختر تاريخ البداية أو النهاية (أو كليهما).', 'Choisissez une date de début ou de fin.');
  Renew.from = keepF; Renew.to = keepT; }
App.input('rg-date', function () { rangeCount(); });
App.act('rg-quick', function (el) { $('rg-from').value = addDays(todayISO(), +el.dataset.a); $('rg-to').value = addDays(todayISO(), +el.dataset.b); rangeCount(); });
function rangeApply() { if (!rangeRead()) { toast(L('اختر تاريخاً أولاً', 'Choisissez une date'), 'err'); return false; } Renew.filter = 'range'; Renew.q = ''; Renew.limit = 120; Modal.close(); if (App.page !== 'renew') App.go('renew'); else App.render(); return true; }
App.act('rg-apply', function () { rangeApply(); });
App.act('rg-session', function () { if (rangeApply()) Session.start(); });
App.act('rg-clear', function () { Renew.from = ''; Renew.to = ''; if (Renew.filter === 'range') Renew.filter = 'all'; Modal.close(); App.render(); });
App.act('r-more', function () { Renew.limit += 150; App.render(); });
App.act('r-sort', function (el) { var k = el.dataset.k; if (Renew.sort === k) Renew.dir = -Renew.dir; else { Renew.sort = k; Renew.dir = 1; } App.render(); });
App.act('r-sortmenu', function () {
  var opts = [['file', L('ترتيب ملف Excel', 'Ordre du fichier Excel')], ['days', L('الأقرب انتهاءً أولاً', 'Échéance la plus proche')], ['name', L('الاسم', 'Nom')], ['prime', L('السعر الأعلى', 'Prime la plus élevée')]];
  Modal.open(Modal.head(L('ترتيب اللائحة', 'Trier la liste')) + '<div class="menu">' + opts.map(function (o) {
    return '<button class="menu-i' + (Renew.sort === o[0] ? ' on' : '') + '" data-act="r-setsort" data-k="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>', 'small');
});
App.act('r-setsort', function (el) { Renew.sort = el.dataset.k; Renew.dir = 1; Modal.close(); App.render(); });
App.act('r-stop', function (el, e) { e.stopPropagation(); });
App.act('r-menu', function () {
  var n = handledList().length;
  Modal.open(Modal.head(L('التجديد', 'Renouvellements'))
    + '<div class="menu">'
    + '<button class="menu-i" data-act="c-new">➕ ' + L('إضافة زبون يدوياً', 'Ajouter un client') + '</button>'
    + '<button class="menu-i" data-act="h-open">✔ ' + L('تم الاتصال بهم', 'Contactés') + ' (' + n + ')</button>'
    + '<button class="menu-i" data-act="b-start">📨 ' + L('إرسال جماعي: واتساب أو SMS (اللائحة المعروضة)', 'Envoi groupé : WhatsApp ou SMS (liste affichée)') + '</button>'
    + '<button class="menu-i" data-act="t-trash">🗑️ ' + L('سلة المحذوفات', 'Corbeille') + ' (' + Contacts.list.filter(function (c) { return c.deleted && canSee(c); }).length + ')</button>'
    + '<button class="menu-i" data-act="t-today">📥 ' + L('ملاحظات اليوم (Excel)', 'Notes du jour (Excel)') + '</button>'
    + '<button class="menu-i" data-act="t-export-notes">📝 ' + L('تصدير كل الملاحظات (Excel)', 'Exporter les notes (Excel)') + '</button>'
    + '<button class="menu-i" data-act="t-import-notes">📝 ' + L('استيراد ملاحظات من Excel', 'Importer des notes (Excel)') + '</button>'
    + (App.canUp() ? '<button class="menu-i" data-act="r-import">📥 ' + L('تحميل لائحة تجديد جديدة', 'Importer une nouvelle liste') + '</button>' : '')
    + '</div>', 'small');
});

/* ───────── بطاقة الزبون (لوحة جانبية على الحاسوب، ورقة من الأسفل على الهاتف) ───────── */
var Sheet = {
  isOpen: function () { return $('sheet').classList.contains('on'); },
  open: function (id) { Renew.openId = id; $('sheet').classList.add('on'); document.body.classList.add('sheet-on'); Sheet.refresh(); $('sheet-body').scrollTop = 0; },
  close: function () { Renew.openId = null; $('sheet').classList.remove('on'); document.body.classList.remove('sheet-on'); $('sheet-body').innerHTML = ''; App.render(); },
  refresh: function () {
    var c = Contacts.get(Renew.openId); if (!c) { $('sheet').classList.remove('on'); document.body.classList.remove('sheet-on'); Renew.openId = null; return; }
    var noteEl = $('c-note'), typing = noteEl && document.activeElement === noteEl, draft = typing ? noteEl.value : null;
    $('sheet-body').innerHTML = contactHTML(c);
    if (typing) { var n2 = $('c-note'); if (n2) { n2.value = draft; n2.focus(); } }
  }
};
function kv(l, v) { return v ? '<div class="kv"><span>' + l + '</span><b>' + v + '</b></div>' : ''; }
function contactHTML(c) {
  var hist = (c.callHistory || []).slice(-6).reverse(), id = esc(c.id);
  return '<div class="sh-head"><div class="sh-title"><b>' + esc(c.name || '—') + '</b>'
      + '<div class="sh-sub">' + (c.phone ? ltr(c.phone) : L('بلا هاتف', 'sans tél.')) + (hasTwo(c) ? ' · ' + ltr(c.phone2) : '') + '</div></div>'
      + daysChip(c) + '<button class="x" data-act="sh-close" aria-label="close">✕</button></div>'
    + '<div class="acts3">'
      + (c.phone ? '<a class="btn call" href="' + telHref(c.phone) + '" data-act="r-call" data-id="' + id + '">📞 ' + L('اتصال', 'Appel') + '</a>' : '<button class="btn" disabled>📞</button>')
      + '<button class="btn wa" data-act="c-msg" data-ch="wa" data-id="' + id + '">💬 ' + L('واتساب', 'WhatsApp') + '</button>'
      + '<button class="btn sms" data-act="c-msg" data-ch="sms" data-id="' + id + '">✉️ SMS</button>'
      + '<button class="btn" data-act="c-result" data-id="' + id + '">📝 ' + L('النتيجة', 'Résultat') + '</button>'
      + '<button class="btn green" data-act="c-renew" data-id="' + id + '">🔄 ' + L('تجديد', 'Renouv.') + '</button>'
      + '<button class="btn' + (c.followup ? ' on' : '') + '" data-act="c-follow" data-id="' + id + '">⏰ ' + (c.followDate ? fmtD(c.followDate).slice(0, 5) : L('متابعة', 'Suivi')) + '</button>'
    + '</div>'
    + (hasTwo(c) ? '<a class="btn call wide" href="' + telHref(c.phone2) + '" data-act="r-call" data-id="' + id + '" data-n="2">📞 ' + L('الرقم 2: ', 'N° 2 : ') + ltr(c.phone2) + '</a>' : '')
    + '<button class="btn wide" data-act="c360-open" data-id="' + id + '">🌐 ' + L('ملف الزبون الشامل 360° (كل العقود والديون والعمليات والحوادث)', 'Fiche client 360° (contrats, dettes, opérations, sinistres)') + '</button>'
    + attemptsHTML(c)
    + (isOut(c) ? '' : '<button class="btn green wide" data-act="c-done" data-id="' + id + '">✔ ' + L('انتهيت من هذا الزبون', 'Terminé avec ce client') + '</button>')
    + App.run('contact.blocks', c)
    + '<div class="kvs">'
      + kv(L('اللوحة', 'Immat.'), c.plate ? ltr(c.plate) : '') + kv(L('البوليصة', 'Police'), c.police ? ltr(polFull(c)) : '')
      + kv(L('الشهادة', 'Attestation'), c.att ? ltr(c.att) : '') + kv(L('الماركة', 'Marque'), esc(c.marque || ''))
      + kv(L('نوع المركبة', 'Véhicule'), esc(c.vehType || '')) + kv(L('البداية', 'Début'), c.dateS ? fmtD(c.dateS) : '')
      + kv(L('الانتهاء', 'Fin'), c.dateE ? fmtD(c.dateE) : '') + kv(L('المدينة', 'Ville'), esc(c.ville || ''))
      + kv(L('نوع المدة', 'Durée'), esc(c.duree || '')) + kv(L('المجموعة', 'Groupe'), esc(c.group || '')) + kv(L('المسؤول', 'Agent'), esc(c.agent || ''))
      + (c.renewConfirmed && !c.renewed ? kv(L('تجديد مؤكد', 'Confirmé'), '✅ ' + esc(durLabel(c.renewDuration)) + (c.renewSplit ? ' · ' + esc(splitLabel(c.renewSplit)) : '') + (c.renewAmount ? ' · ' + moneyH(c.renewAmount, 1) : '') + (c.confirmMsgAt ? ' · 📨 ' + relTime(c.confirmMsgAt) : '')) : '')
      + (c.followDate && !c.renewed ? kv(L('موعد المتابعة', 'Rappel le'), '⏰ ' + fmtD(c.followDate)) : '')
      + (c.handled ? kv(L('تم الاتصال', 'Contacté'), relTime(c.handled) + (c.handledBy ? ' · ' + esc(c.handledBy) : '')) : '')
    + '</div>'
    + '<div class="sec"><div class="sec-t">📝 ' + L('ملاحظة', 'Note') + '</div>'
      + '<textarea id="c-note" rows="2" placeholder="' + L('اكتب ملاحظة…', 'Écrire une note…') + '">' + esc(c.note || '') + '</textarea>'
      + '<button class="btn sm" data-act="c-savenote" data-id="' + id + '">💾 ' + L('حفظ الملاحظة', 'Enregistrer') + '</button></div>'
    + '<div class="sec"><div class="sec-t">📞 ' + L('سجل الاتصالات', 'Historique') + ' (' + callCount(c) + ')</div>'
      + (hist.length ? hist.map(function (h) { return '<div class="hist"><span>' + csLabel(h.result) + (h.note ? ' — ' + esc(h.note) : '') + '</span><small>' + relTime(h.date) + (h.user ? ' · ' + esc(h.user) : '') + '</small></div>'; }).join('')
                     : '<div class="muted sm">' + L('لا اتصالات بعد', 'Aucun appel') + '</div>') + '</div>'
    + '<div class="foot">'
      + '<button class="btn sm" data-act="c-edit" data-id="' + id + '">✏️ ' + L('تعديل', 'Modifier') + '</button>'
      + (c.handled ? '<button class="btn sm" data-act="h-restore" data-id="' + id + '">↩ ' + L('إرجاع للقائمة', 'Remettre dans la liste') + '</button>' : '')
      + (c.renewed ? '<button class="btn sm" data-act="c-unrenew" data-id="' + id + '">↩ ' + L('إلغاء «تم التجديد»', 'Annuler « renouvelé »') + '</button>' : '')
      + (isStale(c) ? '<button class="btn sm" data-act="c-keep" data-id="' + id + '">↩ ' + L('إرجاع للائحة', 'Remettre dans la liste') + '</button>' : '')
      + (App.user.admin ? '<button class="btn sm danger" data-act="c-del" data-id="' + id + '">🗑️ ' + L('حذف', 'Supprimer') + '</button>' : '')
    + '</div>';
}
App.act('r-open', function (el) { Sheet.open(el.dataset.id); if (isDesktop()) App.render(); });
App.act('sh-close', function () { Sheet.close(); });
/* «انتهيت»: هو وحده الذي يُخرج الزبون من القائمة إلى «تم الاتصال بهم» */
App.act('c-done', function (el) { var id = el.dataset.id, c = Contacts.get(id); if (!c) return;
  Session.handled(id); if (Renew.openId === id && Sheet.isOpen() && !isDesktop()) Sheet.close();
  toast('✔ ' + (c.name || '') + ' — ' + L('نُقل إلى «تم الاتصال بهم»', 'déplacé dans « Contactés »')); });
App.act('c-savenote', function (el) { var v = $('c-note').value.trim(); Contacts.update(el.dataset.id, { note: v }).then(function () { toast(L('💾 حُفظت الملاحظة', '💾 Note enregistrée')); }); });
App.act('c-follow', function (el) { openFollow(el.dataset.id); });
/* موعد المتابعة: يوم محدّد يرجع فيه الزبون إلى القائمة والصفحة الرئيسية */
function openFollow(id) {
  var c = Contacts.get(id); if (!c) return;
  var q = [[L('غداً', 'Demain'), 1], [L('بعد 3 أيام', 'Dans 3 j'), 3], [L('بعد أسبوع', 'Dans 7 j'), 7], [L('بعد 15 يوماً', 'Dans 15 j'), 15]];
  Modal.open(Modal.head('⏰ ' + L('موعد المتابعة', 'Date de rappel') + ' — ' + esc(c.name || ''))
    + '<div class="chips wrap">' + q.map(function (x) { return '<button class="chip" data-act="fo-set" data-id="' + esc(id) + '" data-d="' + addDays(todayISO(), x[1]) + '">' + x[0] + '</button>'; }).join('') + '</div>'
    + '<label class="f inline"><span>' + L('أو اختر تاريخاً', 'Ou choisir une date') + '</span><input id="fo-date" type="date" value="' + esc(c.followDate || '') + '"></label>'
    + '<button class="btn pri wide" data-act="fo-save" data-id="' + esc(id) + '">💾 ' + L('حفظ الموعد', 'Enregistrer') + '</button>'
    + (c.followup || c.followDate ? '<button class="btn wide" data-act="fo-clear" data-id="' + esc(id) + '">✕ ' + L('إزالة المتابعة', 'Retirer le suivi') + '</button>' : ''), 'small');
}
function setFollow(id, iso) { Contacts.update(id, { followup: true, followDate: iso }); Modal.close(); toast('⏰ ' + L('موعد المتابعة: ', 'Rappel le ') + fmtD(iso)); }
App.act('fo-set', function (el) { setFollow(el.dataset.id, el.dataset.d); });
App.act('fo-save', function (el) { var v = $('fo-date').value; if (!v) { Contacts.update(el.dataset.id, { followup: true }); Modal.close(); toast(L('⏰ أُضيف للمتابعة', '⏰ Ajouté au suivi')); return; } setFollow(el.dataset.id, v); });
App.act('fo-clear', function (el) { Contacts.update(el.dataset.id, { followup: false, followDate: Contacts.unset() }); Modal.close(); toast(L('أُزيلت المتابعة', 'Suivi retiré')); });
/* بعد الضغط على «اتصال»: عند الرجوع من المكالمة تُفتح نافذة النتيجة تلقائياً */
App.act('r-call', function (el) { if (Session.on) return; Renew.pendingCall = { id: el.dataset.id, hid: false, n: +el.dataset.n === 2 ? 2 : 1 };
  if (isDesktop()) setTimeout(function () { var p = Renew.pendingCall; if (p && p.id === el.dataset.id && !p.hid) firePendingCall(); }, 2500); });
function firePendingCall() { var p = Renew.pendingCall; Renew.pendingCall = null; if (!p || Session.on) return; var c = Contacts.get(p.id); if (!c) return;
  resultPicker(p.id, '📞 ' + L('نتيجة المكالمة — ', 'Résultat — ') + esc(c.name || ''), p.n); }
document.addEventListener('visibilitychange', function () { var p = Renew.pendingCall; if (!p) return;
  if (document.hidden) p.hid = true; else if (p.hid) setTimeout(firePendingCall, 400); });
App.act('c-unrenew', function (el) { if (!confirm(L('إرجاع هذا الزبون إلى لائحة الاتصال؟', 'Remettre ce client dans la liste d\'appels ?'))) return;
  var c0 = Contacts.get(el.dataset.id), patch = { renewed: false, renewedVia: Contacts.unset(), renewOpId: Contacts.unset(), noAuto: true };   // noAuto: لا يُعلَّم تلقائياً من جديد
  if (c0 && c0.renewOpId) patch.renewIgnore = FB.FV.arrayUnion(c0.renewOpId);   // لا تُعلَّم من جديد تلقائياً بالعملية نفسها
  Contacts.update(el.dataset.id, patch); toast(L('↩ أُلغي «تم التجديد»', '↩ « Renouvelé » annulé')); });
App.act('c-keep', function (el) { Contacts.update(el.dataset.id, { keep: true, archived: false }); toast(L('↩ أُرجع للائحة', '↩ Remis dans la liste')); });
App.act('c-del', function (el) {
  var c = Contacts.get(el.dataset.id); if (!c || !App.user.admin) return;
  if (!confirm(L('حذف «' + (c.name || '') + '» من اللائحة؟', 'Supprimer « ' + (c.name || '') + ' » ?'))) return;
  Contacts.update(c.id, { deleted: true, deletedAt: new Date().toISOString() }); Sheet.close(); toast(L('🗑️ حُذف', '🗑️ Supprimé'));
});

/* ───────── الرسائل ───────── */
var TMPL = {
  renew_ar: 'مرحباً [الاسم]\n\nنود تذكيركم بأن عقد تأمين [نوع_المركبة] ذات لوحة الترقيم [اللوحة] من نوع [الماركة] سينتهي يوم [تاريخ_الانتهاء].\n\nيرجى التواصل معنا لتجديد العقد.\n\nEUR ASSURANCES',
  renew_fr: 'Bonjour [الاسم],\n\nNous vous rappelons que le contrat d\'assurance [نوع_المركبة] immatriculé [اللوحة] de marque [الماركة] expire le [تاريخ_الانتهاء].\n\nMerci de nous contacter pour le renouvellement.\n\nEUR ASSURANCES',
  confirm_ar: 'السلام عليكم [الاسم]،\n\nبناءً على طلبكم هاتفياً يوم [التاريخ]، تم تجديد تأمين مركبتكم [اللوحة] لمدة [المدة] بمبلغ [المبلغ] درهم.\n\nالمرجو المرور بالوكالة للأداء.\n\nEUR ASSURANCES',
  confirm_fr: 'Bonjour [الاسم],\n\nSuite à votre demande par téléphone le [التاريخ], l\'assurance de votre véhicule [اللوحة] a été renouvelée pour [المدة] pour un montant de [المبلغ] DH.\n\nMerci de passer à l\'agence pour le règlement.\n\nEUR ASSURANCES'
};
function msgLang() { return Local.get('msglang', 'ar') === 'fr' ? 'fr' : 'ar'; }
function tmplGet(kind) { var k = kind + '_' + msgLang(); return Meta.get('tmpl_' + k, TMPL[k]); }
function vehFR(t) { return { 'سيارة': 'Voiture', 'دراجة نارية': 'Moto', 'شاحنة': 'Camion', 'جرار': 'Tracteur', 'أخرى': 'Autre' }[t] || t || ''; }
function vehFromCat(code) { code = String(code || '').trim(); return code === '8' ? 'سيارة' : code === '10' ? 'دراجة نارية' : code === '9' ? 'شاحنة' : ''; }
function fillMsg(tmpl, c, extra) {
  var fr = msgLang() === 'fr', vt = c.vehType || vehFromCat(c.cat);
  var veh = fr ? (vt ? vehFR(vt) : 'le véhicule') : (vt || 'المركبة');
  var map = { 'الاسم': c.name || '', 'Nom': c.name || '', 'اللوحة': ltrWrap(c.plate || ''), 'Immat': ltrWrap(c.plate || ''),
    'الماركة': c.marque || '', 'Marque': c.marque || '', 'تاريخ_الانتهاء': fmtD(c.dateE), 'Fin': fmtD(c.dateE),
    'نوع_المركبة': veh, 'Vehicule': veh, 'البوليصة': ltrWrap(c.police || ''), 'Police': ltrWrap(c.police || ''),
    'المدينة': c.ville || '', 'Ville': c.ville || '', 'التأمين': c.ins || '', 'Assurance': c.ins || '' };
  for (var k in (extra || {})) map[k] = extra[k];
  var msg = tmpl; for (var key in map) msg = msg.split('[' + key + ']').join(map[key]);
  if (!c.marque) msg = msg.replace(/\s*من نوع\s*/g, ' ').replace(/\s*de (marque|type)\s*/g, ' ');
  if (fr) msg = msg.replace(/\u00A0/g, ' ');
  return msg.replace(/ +\n/g, '\n').replace(/ {2,}/g, ' ').trim();
}
/* أنواع الرسائل المتاحة لزبون: التجديد + ما تضيفه الأقسام الأخرى (مثلاً الدين) */
function msgKinds(c) {
  return [{ id: 'renew', label: L('تذكير التجديد', 'Rappel renouvellement'), text: function () { return fillMsg(tmplGet('renew'), c); } }]
    .concat(App.runList('msg.kinds', c));
}
/* إرسال: يختار الرقم إن كان للزبون رقمان، ثم يفتح واتساب أو SMS ويسجّل الإرسال */
function sendMsg(c, ch, text, label, phone, onSent) {
  if (!c.phone && !phone) { toast(L('لا يوجد رقم هاتف', 'Pas de numéro'), 'err'); return; }
  if (!phone && hasTwo(c)) {
    Modal.open(Modal.head((ch === 'wa' ? '💬 ' : '✉️ ') + L('اختر الرقم', 'Choisir le numéro'))
      + '<div class="menu">' + [c.phone, c.phone2].map(function (p, i) { return '<button class="menu-i" data-act="m-pick" data-i="' + i + '">' + ltr(p) + '</button>'; }).join('') + '</div>', 'small');
    sendMsg._p = { c: c, ch: ch, text: text, label: label, onSent: onSent }; return;
  }
  phone = phone || c.phone;
  var now = new Date().toISOString();
  Contacts.pushCall(c.id, { date: now, result: ch === 'wa' ? 'wa' : 'sms', note: label || '', user: App.user.name, phone: phone }, ch === 'wa' ? { waSent: now, followDate: Contacts.unset() } : { smsSent: now, followDate: Contacts.unset() });
  if (onSent) { try { onSent(ch); } catch (e) { console.error(e); } }
  App.emit('msg.sent', c, { ch: ch, label: label });
  toast((ch === 'wa' ? '🟢 WhatsApp — ' : '✉️ SMS — ') + (c.name || ''));
  if (ch === 'wa') window.open(waUrl(phone, text), '_blank'); else window.location.href = smsUrl(phone, text);
  if (Session.on) setTimeout(function () { Session.render(); }, 300);
}
App.act('m-pick', function (el) { var p = sendMsg._p; if (!p) return; Modal.close(); sendMsg(p.c, p.ch, p.text, p.label, +el.dataset.i ? p.c.phone2 : p.c.phone, p.onSent); });
App.act('c-msg', function (el) {
  var c = Contacts.get(el.dataset.id); if (!c) return;
  var kinds = msgKinds(c), ch = el.dataset.ch;
  if (kinds.length === 1) { sendMsg(c, ch, kinds[0].text(), kinds[0].label, null, kinds[0].onSent); return; }
  Modal.open(Modal.head((ch === 'wa' ? '💬 ' : '✉️ ') + L('أي رسالة؟', 'Quel message ?'))
    + '<div class="menu">' + kinds.map(function (k, i) { return '<button class="menu-i" data-act="m-kind" data-i="' + i + '">' + esc(k.label) + '</button>'; }).join('') + '</div>', 'small');
  sendMsg._k = { c: c, ch: ch, kinds: kinds };
});
App.act('m-kind', function (el) { var k = sendMsg._k; if (!k) return; var kind = k.kinds[+el.dataset.i]; Modal.close(); sendMsg(k.c, k.ch, kind.text(), kind.label, null, kind.onSent); });
App.act('r-wa', function (el, e) { e.stopPropagation(); var c = Contacts.get(el.dataset.id); if (c) sendMsg(c, 'wa', fillMsg(tmplGet('renew'), c), L('تذكير التجديد', 'Rappel')); });

/* ───────── نتيجة الاتصال ───────── */
function logCall(id, result, note, phone) {
  var c = Contacts.get(id); if (!c || !CS[result]) return;
  var extra = { callStatus: result, followDate: Contacts.unset() };
  if (result === 'nowa') extra = { noWa: true };                       // لا واتساب: معلومة تُحفظ، لا نتيجة مكالمة
  else if (result !== 'ans') extra.followup = true;
  Contacts.pushCall(id, { date: new Date().toISOString(), result: result, note: note || '', user: App.user.name, phone: phone || '' }, extra);
  toast(csLabel(result));
}
function resultPicker(id, title, n) {
  var c = Contacts.get(id); if (!c) return; Renew.pickN = n === 2 ? 2 : 1;
  var keys = ['ans', 'no', 'busy', 'later', 'bv', 'hz', 'off', 'dead', 'nowa'];
  Modal.open(Modal.head(title || L('نتيجة الاتصال', 'Résultat de l\'appel'))
    + (hasTwo(c) ? '<div class="lbl">' + L('أي رقم؟', 'Quel numéro ?') + '</div><div class="chips wrap">' + [1, 2].map(function (k) { return '<button class="chip' + (Renew.pickN === k ? ' on' : '') + '" data-act="res-n" data-n="' + k + '">' + ltr(phoneN(c, k)) + '</button>'; }).join('') + '</div>' : '')
    + '<div class="grid2" style="margin-top:8px">' + keys.map(function (k) { return '<button class="btn res" style="--c:' + CS[k].color + '" data-act="c-setres" data-id="' + esc(id) + '" data-r="' + k + '">' + csLabel(k) + '</button>'; }).join('') + '</div>', 'small');
}
App.act('res-n', function (el) { Renew.pickN = +el.dataset.n === 2 ? 2 : 1; el.parentNode.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === el); }); });
App.act('c-result', function (el) { resultPicker(el.dataset.id); });
App.act('c-setres', function (el) {
  var id = el.dataset.id, r = el.dataset.r, c = Contacts.get(id); if (!c) return;
  Modal.close(); logCall(id, r, '', phoneN(c, Renew.pickN));
  if (r === 'ans') openRenew(id); else if (r === 'later') openFollow(id);
  if (Session.on) setTimeout(function () { if (!Modal.isOpen()) Session.render(); }, 200);
});

/* ───────── التجديد ───────── */
function durLabel(d) { if (d == null || d === '') return ''; if (d === 'temp') return L('موقتة', 'provisoire'); d = +d; return d === 12 ? L('سنة', '1 an') : d === 1 ? L('شهر', '1 mois') : d + ' ' + L('أشهر', 'mois'); }
var RN = { dur: 12, rem: 1, split: '' };
function splitLabel(v) { return !v ? '' : v === 'prov' ? 'Provisoire' : '× ' + v; }
function openRenew(id) {
  var c = Contacts.get(id); if (!c) return;
  RN.dur = (c.renewDuration != null && c.renewDuration !== '') ? c.renewDuration : 12; RN.rem = c.renewReminderDays != null ? c.renewReminderDays : 1; RN.split = c.renewSplit || '';
  var durs = [[1, L('شهر', '1 mois')], [3, L('3 أشهر', '3 mois')], [6, L('6 أشهر', '6 mois')], [12, L('سنة', '1 an')], ['temp', L('موقتة', 'Provisoire')]];
  var pill = function (grp, v, lbl, on) { return '<button class="chip' + (on ? ' on' : '') + '" data-act="rn-set" data-g="' + grp + '" data-v="' + v + '">' + lbl + '</button>'; };
  Modal.open(Modal.head('🔄 ' + esc(c.name || ''))
    + '<div class="muted sm" style="margin-bottom:10px">' + (c.plate ? ltr(c.plate) + ' · ' : '') + L('ينتهي: ', 'Fin : ') + fmtD(c.dateE) + '</div>'
    + '<div class="box green"><div class="sec-t">✅ ' + L('الزبون وافق على التجديد (بالهاتف)', 'Le client a confirmé (par téléphone)') + '</div>'
      + '<div class="lbl">' + L('المدة', 'Durée') + '</div><div class="chips wrap" id="rn-dur">' + durs.map(function (d) { return pill('dur', d[0], d[1], String(RN.dur) === String(d[0])); }).join('') + '</div>'
      + '<input id="rn-custom" class="inp" inputmode="numeric" dir="ltr" style="margin-top:6px" placeholder="' + L('أو مدة مخصّصة (بالأشهر)', 'ou durée personnalisée (mois)') + '">'
      + '<div class="lbl">🧾 ' + L('التقسيم', 'Fractionnement') + '</div><div class="chips wrap" id="rn-split">'
        + [['', L('بدون', 'Sans')], ['prov', 'Provisoire'], ['2', '× 2'], ['3', '× 3'], ['4', '× 4']].map(function (x) { return pill('split', x[0], x[1], String(RN.split) === x[0]); }).join('') + '</div>'
      + '<div class="lbl">' + L('المبلغ (درهم) — يظهر في رسالة التأكيد', 'Montant (DH) — figure dans le message') + '</div>'
      + '<input id="rn-amount" class="inp" inputmode="decimal" dir="ltr" value="' + (c.renewAmount || c.prime || '') + '" placeholder="0,00">'
      + '<div class="lbl">' + L('ذكّرني قبل الانتهاء بـ', 'Me rappeler avant échéance') + '</div><div class="chips wrap" id="rn-rem">'
        + [[1, L('يوم', '1 j')], [2, L('يومين', '2 j')], [7, L('أسبوع', '7 j')]].map(function (r) { return pill('rem', r[0], r[1], RN.rem === r[0]); }).join('') + '</div>'
      + '<button class="btn pri wide" data-act="rn-confirm" data-id="' + esc(id) + '">✅ ' + L('تسجيل التجديد المؤكد', 'Enregistrer la confirmation') + '</button></div>'
    + '<div class="box"><div class="sec-t">⚡ ' + L('جدّد الآن (مدّد تاريخ الانتهاء)', 'Renouveler maintenant (prolonger)') + '</div>'
      + '<div class="grid4">' + [[1, L('شهر', '1 m')], [3, '3'], [6, '6'], [12, L('سنة', '1 an')]].map(function (o) { return '<button class="btn" data-act="rn-extend" data-id="' + esc(id) + '" data-m="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>'
    + '<button class="btn wide" data-act="rn-done" data-id="' + esc(id) + '">✓ ' + L('تم دون تجديد (انتهى العقد)', 'Terminé sans renouvellement') + '</button>');
}
App.act('c-renew', function (el) { openRenew(el.dataset.id); });
App.act('rn-set', function (el) {
  var g = el.dataset.g, v = el.dataset.v; RN[g] = g === 'split' ? v : (v === 'temp') ? 'temp' : +v;
  el.parentNode.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === el); });
});
App.act('rn-confirm', function (el) {
  var c = Contacts.get(el.dataset.id); if (!c) return;
  var amount = Math.round(num(($('rn-amount') || {}).value) * 100) / 100, now = new Date().toISOString();
  var cm = parseInt(($('rn-custom') || {}).value, 10); if (cm > 0) RN.dur = cm;
  Contacts.update(c.id, { renewConfirmed: true, renewDuration: RN.dur, renewSplit: RN.split || '', renewReminderDays: RN.rem, renewAmount: amount || '',
    renewConfirmedAt: now, renewConfirmedBy: App.user.name, followup: true, renewed: false });
  Session.handled(c.id);
  /* رسالة التأكيد: تبقى في محادثة الزبون دليلاً على طلبه */
  var txt = confirmText(c, RN.dur, amount);
  Modal.open(Modal.head('📨 ' + L('رسالة تأكيد للزبون', 'Message de confirmation'))
    + '<div class="muted sm" style="margin-bottom:8px">' + L('أرسلها الآن: تبقى عند الزبون دليلاً على أنه طلب التجديد.', 'Envoyez-la : elle reste chez le client comme preuve de sa demande.') + '</div>'
    + '<textarea id="cf-text" rows="8">' + esc(txt) + '</textarea>'
    + '<div class="acts2"><button class="btn wa" data-act="cf-send" data-ch="wa" data-id="' + esc(c.id) + '">💬 ' + L('واتساب', 'WhatsApp') + '</button>'
    + '<button class="btn sms" data-act="cf-send" data-ch="sms" data-id="' + esc(c.id) + '">✉️ SMS</button></div>'
    + '<button class="btn wide" data-act="modal-close">' + L('لاحقاً', 'Plus tard') + '</button>');
});
function confirmText(c, dur, amount) {
  var t = tmplGet('confirm');
  if (!amount) t = t.replace(/\s*بمبلغ \[المبلغ\] درهم/g, '').replace(/\s*pour un montant de \[المبلغ\] DH/g, '');
  return fillMsg(t, c, { 'التاريخ': fmtD(todayISO()), 'Date': fmtD(todayISO()), 'المدة': durLabel(dur), 'Duree': durLabel(dur), 'المبلغ': amount ? money(amount) : '', 'Montant': amount ? money(amount) : '' });
}
App.act('cf-send', function (el) {
  var c = Contacts.get(el.dataset.id); if (!c) return; var txt = $('cf-text').value;
  Modal.close(); Contacts.update(c.id, { confirmMsgAt: new Date().toISOString() });
  sendMsg(c, el.dataset.ch, txt, L('تأكيد التجديد', 'Confirmation'));
});
App.act('rn-extend', function (el) {
  var c = Contacts.get(el.dataset.id), m = +el.dataset.m; if (!c) return;
  if (!parseISO(c.dateE)) { toast(L('⚠️ لا يوجد تاريخ انتهاء', '⚠️ Pas de date de fin'), 'err'); return; }
  var ne = addDays(addMonths(c.dateE, m), -1);
  Contacts.update(c.id, { dateE: ne, followup: false, renewed: false, renewConfirmed: false, lastRenewal: { value: m, unit: 'months' },
    renewalLog: FB.FV.arrayUnion({ date: todayISO(), durationValue: m, durationUnit: 'months', oldExpiry: c.dateE, newExpiry: ne, user: App.user.name }) });
  Modal.close(); Session.handled(c.id); toast(L('✅ تم التجديد حتى ', '✅ Renouvelé jusqu\'au ') + fmtD(ne));
});
App.act('rn-done', function (el) { Contacts.update(el.dataset.id, { renewed: true, followup: false }); Modal.close(); Session.handled(el.dataset.id); toast(L('✅ تم التسجيل', '✅ Enregistré')); });

/* ───────── إضافة / تعديل زبون ───────── */
var FORM_FIELDS = [
  ['name', 'الاسم', 'Nom', 'text'], ['phone', 'الهاتف', 'Téléphone', 'tel'], ['phone2', 'هاتف 2', 'Téléphone 2', 'tel'],
  ['plate', 'اللوحة', 'Immatriculation', 'text'], ['police', 'البوليصة', 'N° Police', 'text'], ['att', 'رقم الشهادة', 'Attestation', 'text'],
  ['marque', 'الماركة', 'Marque', 'text'], ['dateS', 'البداية', 'Début', 'date'], ['dateE', 'الانتهاء', 'Fin', 'date'],
  ['prime', 'السعر', 'Prime', 'text'], ['ville', 'المدينة', 'Ville', 'text'], ['group', 'المجموعة', 'Groupe', 'text'], ['agent', 'المسؤول', 'Agent', 'text']
];
function openForm(id) {
  var c = id ? Contacts.get(id) : {}; if (!c) return;
  Modal.open(Modal.head(id ? '✏️ ' + L('تعديل', 'Modifier') : '➕ ' + L('زبون جديد', 'Nouveau client'))
    + '<div class="form">' + FORM_FIELDS.filter(function (f) { return f[0] !== 'agent' || App.user.admin; }).map(function (f) {
      var ltrF = f[3] !== 'text' || /plate|police|att|prime/.test(f[0]);
      return '<label class="f"><span>' + L(f[1], f[2]) + '</span><input id="f-' + f[0] + '" type="' + f[3] + '"' + (ltrF ? ' dir="ltr"' : '') + ' value="' + esc(c[f[0]] == null ? '' : c[f[0]]) + '"></label>';
    }).join('') + '</div>'
    + '<button class="btn pri wide" data-act="c-save" data-id="' + esc(id || '') + '">💾 ' + L('حفظ', 'Enregistrer') + '</button>');
}
App.act('c-new', function () { Modal.close(); openForm(''); });
App.act('c-edit', function (el) { openForm(el.dataset.id); });
App.act('c-save', function (el) {
  var id = el.dataset.id, o = {};
  FORM_FIELDS.forEach(function (f) { var inp = $('f-' + f[0]); if (inp) o[f[0]] = inp.value.trim(); });
  if (!o.name && !o.phone) { toast(L('أدخل الاسم أو الهاتف', 'Nom ou téléphone requis'), 'err'); return; }
  o.plate = (o.plate || '').toUpperCase(); o.prime = o.prime ? Math.round(num(o.prime) * 100) / 100 : '';
  if (id) Contacts.update(id, o);
  else { var max = 0; Contacts.list.forEach(function (c) { if (+c.ord > max) max = +c.ord; });
    if (!App.user.admin) o.agent = App.user.name;
    Contacts.add(Object.assign(o, { ord: max + 1, created: new Date().toISOString(), by: App.user.name })); }
  Modal.close(); toast(L('💾 حُفظ', '💾 Enregistré'));
});

/* ───────── من عولج في الجلسة ───────── */
function handledList() { return renewBase().filter(function (c) { return isOut(c); }).sort(function (a, b) { return String(b.handled).localeCompare(String(a.handled)); }); }
App.act('h-open', function () {
  var a = handledList();
  var nn = a.filter(function (c) { var h = lastCall(c); return h && NOANS[h.result]; }).length;
  Modal.open(Modal.head('✔ ' + L('تم الاتصال بهم', 'Contactés') + ' (' + a.length + ')')
    + '<div class="muted sm" style="margin-bottom:8px">' + L('خرجوا من القائمة ومن الجلسة. يرجعون يوم موعد المتابعة، أو حين تُرجعهم.', 'Sortis de la liste et de la session. Ils reviennent à la date de rappel, ou si vous les remettez.') + '</div>'
    + (a.length ? '<div class="acts2"><button class="btn" data-act="h-noans">↩ ' + L('من لم يجب', 'Sans réponse') + ' (' + nn + ')</button><button class="btn" data-act="h-all">↩ ' + L('إرجاع الكل', 'Tout remettre') + '</button></div>' : '')
    + '<div class="lines">' + (a.length ? a.map(function (c) { var h = lastCall(c);
      return '<div class="line"><div><b>' + esc(c.name || '—') + '</b><small>' + (h ? csLabel(h.result) + ' · ' : '') + relTime(c.handled) + (c.handledBy ? ' · ' + esc(c.handledBy) : '') + '</small></div>'
        + '<button class="btn sm" data-act="h-restore" data-id="' + esc(c.id) + '" data-list="1">↩</button></div>'; }).join('')
      : '<div class="muted sm">' + L('لا أحد', 'Personne') + '</div>') + '</div>');
});
App.act('h-restore', function (el) {
  Contacts.update(el.dataset.id, { handled: Contacts.unset(), handledBy: Contacts.unset() }).then(function () { if (el.dataset.list && Modal.isOpen()) App.acts['h-open'](); });
  toast(L('↩ أُرجع إلى القائمة', '↩ Remis dans la liste'));
});
App.act('h-all', function () {
  var a = handledList(); if (!a.length || !confirm(L('إرجاع الكل (' + a.length + ') إلى القائمة؟', 'Remettre tous (' + a.length + ') dans la liste ?'))) return;
  FB.batches(a.map(function (c) { return { ref: Contacts.col().doc(c.id), upd: { handled: Contacts.unset(), handledBy: Contacts.unset() } }; }))
    .then(function () { Modal.close(); toast(L('↩ أُرجع الجميع', '↩ Tous remis')); }).catch(syncErr);
});

App.act('h-noans', function () {
  var a = handledList().filter(function (c) { var h = lastCall(c); return h && NOANS[h.result]; });
  if (!a.length) { toast(L('لا أحد بنتيجة «لم يجب»', 'Aucun sans réponse'), 'err'); return; }
  FB.batches(a.map(function (c) { return { ref: Contacts.col().doc(c.id), upd: { handled: Contacts.unset(), handledBy: Contacts.unset() } }; }))
    .then(function () { Modal.close(); toast(L('↩ أُرجع ' + a.length + ' ممن لم يجيبوا', '↩ ' + a.length + ' sans réponse remis')); }).catch(syncErr);
});

/* ───────── سلة المحذوفات ───────── */
App.act('t-trash', function () {
  var a = Contacts.list.filter(function (c) { return c.deleted && canSee(c); }).sort(function (x, y) { return String(y.deletedAt || '').localeCompare(String(x.deletedAt || '')); });
  Modal.open(Modal.head('🗑️ ' + L('سلة المحذوفات', 'Corbeille') + ' (' + a.length + ')')
    + (a.length && App.user.admin ? '<button class="btn danger wide" data-act="t-purge-all">🗑️ ' + L('إفراغ السلة نهائياً', 'Vider définitivement') + '</button>' : '')
    + '<div class="lines">' + (a.length ? a.map(function (c) { return '<div class="line"><div><b>' + esc(c.name || '—') + '</b><small>' + (c.phone ? ltr(c.phone) + ' · ' : '') + (c.plate ? ltr(c.plate) + ' · ' : '') + (c.deletedAt ? relTime(c.deletedAt) : '') + '</small></div>'
        + '<button class="btn sm" data-act="t-undel" data-id="' + esc(c.id) + '">↩ ' + L('استرجاع', 'Restaurer') + '</button></div>'; }).join('') : '<div class="muted sm">' + L('السلة فارغة', 'Corbeille vide') + '</div>') + '</div>');
});
App.act('t-undel', function (el) { Contacts.update(el.dataset.id, { deleted: false, deletedAt: Contacts.unset() }).then(function () { if (Modal.isOpen()) App.acts['t-trash'](); }); toast(L('↩ استُرجع', '↩ Restauré')); });
App.act('t-purge-all', function () { if (!App.user.admin) return; var a = Contacts.list.filter(function (c) { return c.deleted; });
  if (!a.length || !confirm(L('حذف ' + a.length + ' زبون نهائياً؟ لا يمكن التراجع.', 'Supprimer définitivement ' + a.length + ' clients ?'))) return;
  FB.batches(a.map(function (c) { return { del: 1, ref: Contacts.col().doc(c.id) }; })).then(function () { Modal.close(); toast(L('🗑️ أُفرغت السلة', '🗑️ Corbeille vidée')); }).catch(syncErr); });

/* ───────── إرسال واتساب جماعي: اللائحة المعروضة، واحداً بعد الآخر ───────── */
var Bulk = { queue: [], pos: 0, sent: 0, ch: 'wa', kind: 'renew' };
function bulkKind(c) { return msgKinds(c).filter(function (k) { return k.id === Bulk.kind; })[0] || null; }
function bulkQueue() { return renewList(Renew.filter, Renew.q).filter(function (c) { return c.phone && !c.renewed && !isOut(c) && !!bulkKind(c); }); }
App.act('b-start', function () { Bulk.ch = 'wa'; Bulk.kind = 'renew'; bulkSetup(); });
function bulkSetup() {
  var kinds = [['renew', L('تذكير التجديد', 'Rappel renouvellement')]];
  if (App.hooks['msg.kinds']) kinds.push(['debt', L('رسالة الدين (للمدينين فقط)', 'Message dette (débiteurs)')], ['both', L('تجديد + دين (للمدينين فقط)', 'Renouvellement + dette')]);
  var n = bulkQueue().length;
  Modal.open(Modal.head('📨 ' + L('إرسال جماعي', 'Envoi groupé'))
    + '<div class="muted sm" style="margin-bottom:8px">' + L('يمرّ على اللائحة المعروضة واحداً بعد الآخر، ولكل زبون رسالته باسمه وبياناته.', 'Parcourt la liste affichée un par un ; chaque client reçoit son message personnalisé.') + '</div>'
    + '<div class="lbl">' + L('الوسيلة', 'Canal') + '</div><div class="seg">' + [['wa', '💬 ' + L('واتساب', 'WhatsApp')], ['sms', '✉️ SMS']].map(function (x) { return '<button class="' + (Bulk.ch === x[0] ? 'on' : '') + '" data-act="b-ch" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'
    + '<div class="lbl">' + L('الرسالة', 'Message') + '</div><div class="menu">' + kinds.map(function (k) { return '<button class="menu-i' + (Bulk.kind === k[0] ? ' on' : '') + '" data-act="b-kind" data-v="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>'
    + '<button class="btn pri wide" data-act="b-go"' + (n ? '' : ' disabled') + '>▶ ' + L('بدء', 'Commencer') + ' (' + n + ')</button>', 'small');
}
App.act('b-ch', function (el) { Bulk.ch = el.dataset.v; bulkSetup(); });
App.act('b-kind', function (el) { Bulk.kind = el.dataset.v; bulkSetup(); });
App.act('b-go', function () { var q = bulkQueue(); if (!q.length) return; Bulk.queue = q.map(function (c) { return c.id; }); Bulk.pos = 0; Bulk.sent = 0; bulkRender(); });
function bulkRender() {
  var n = Bulk.queue.length;
  if (Bulk.pos >= n) { Modal.open(Modal.head('📨 ' + L('انتهى الإرسال', 'Envoi terminé')) + '<div class="box green">' + L('أُرسلت ' + Bulk.sent + ' رسالة من ' + n, Bulk.sent + ' messages envoyés sur ' + n) + '</div><button class="btn pri wide" data-act="modal-close">' + L('إغلاق', 'Fermer') + '</button>', 'small'); return; }
  var c = Contacts.get(Bulk.queue[Bulk.pos]), k = c && bulkKind(c); if (!c || !k) { Bulk.pos++; bulkRender(); return; }
  Modal.open(Modal.head((Bulk.ch === 'wa' ? '💬 ' : '✉️ ') + (Bulk.pos + 1) + ' / ' + n)
    + '<div class="box"><b>' + esc(c.name || '—') + '</b> ' + daysChip(c) + '<div class="muted sm">' + ltr(c.phone) + (c.plate ? ' · ' + ltr(c.plate) : '') + (Bulk.ch === 'wa' && c.noWa ? ' · <span class="red-t">🚫 ' + L('لا واتساب عنده', 'pas de WhatsApp') + '</span>' : '') + '</div></div>'
    + '<div class="note-ro" style="max-height:150px;overflow:auto;margin-bottom:8px">' + esc(k.text()) + '</div>'
    + '<button class="btn ' + (Bulk.ch === 'wa' ? 'wa' : 'sms') + ' wide" data-act="b-send">' + (Bulk.ch === 'wa' ? '💬 ' : '✉️ ') + L('إرسال والتالي', 'Envoyer et suivant') + '</button>'
    + '<div class="acts2"><button class="btn" data-act="b-skip">' + L('تخطّي', 'Passer') + '</button><button class="btn" data-act="modal-close">' + L('إيقاف', 'Arrêter') + '</button></div>', 'small');
}
/* في الإرسال الجماعي: الإرسال = انتهيت من هذا الزبون */
App.act('b-send', function () { var c = Contacts.get(Bulk.queue[Bulk.pos]), k = c && bulkKind(c); if (!c || !k) return;
  sendMsg(c, Bulk.ch, k.text(), k.label, c.phone, k.onSent); Session.handled(c.id); Bulk.sent++; Bulk.pos++; bulkRender(); });
App.act('b-skip', function () { Bulk.pos++; bulkRender(); });

/* ═════════ جلسة الاتصال ═════════
   كل من أُرسلت له رسالة أو سُجّلت نتيجته يخرج من الجلسة، ولا يرجع إلا يدوياً. */
function sessionQueue() {
  var list = renewList(Renew.filter === 'handled' || Renew.filter === 'done' || Renew.filter === 'stale' ? 'all' : Renew.filter, Renew.q);
  return list.filter(function (c) {
    if (c.renewed || isOut(c)) return false;
    if (Renew.filter === 'all') { var d = daysLeft(c.dateE); return d !== null && d <= 30; }
    return true;
  });
}
var Session = {
  on: false, queue: [], pos: 0, done: 0, n: 1, curId: null,
  cur: function () { return Session.on ? Session.queue[Session.pos] : null; },
  start: function () {
    var q = sessionQueue(); if (!q.length) { toast(L('لا أحد للاتصال في هذه اللائحة', 'Personne à appeler'), 'err'); return; }
    Session.on = true; Session.queue = q.map(function (c) { return c.id; }); Session.pos = 0; Session.done = 0;
    if (Sheet.isOpen()) Sheet.close();
    $('session').classList.add('on'); Session.render();
  },
  end: function () { Session.on = false; $('session').classList.remove('on'); App.render(); },
  next: function () { Session.pos++; Session.render(); },
  prev: function () { if (Session.pos > 0) { Session.pos--; Session.render(); } },
  /* علّم الزبون «عولج» وأخرجه من الجلسة */
  /* «تم الاتصال به»: يُعلَّم الزبون أينما كان (قائمة، بطاقة، جلسة) ويخرج من الجلسة إن كانت مفتوحة */
  handled: function (id) {
    if (!Contacts.get(id)) return;
    Contacts.update(id, { handled: new Date().toISOString(), handledBy: App.user.name });
    if (!Session.on) return;
    var i = Session.queue.indexOf(id); if (i < 0) return;
    Session.queue.splice(i, 1); if (i < Session.pos) Session.pos--; Session.done++;
    Session.render();
  },
  render: function () {
    if (!Session.on) return;
    var n = Session.queue.length, el = $('session');
    if (Session.pos >= n) {
      el.innerHTML = '<div class="s-top"><button class="x" data-act="s-end">✕</button></div>'
        + '<div class="s-end"><div class="empty-ic">🎉</div><b>' + L('انتهت الجلسة', 'Session terminée') + '</b>'
        + '<span>' + L('عالجت ' + Session.done + ' زبون', Session.done + ' clients traités') + '</span>'
        + '<button class="btn pri" data-act="s-end">' + L('إنهاء', 'Terminer') + '</button></div>'; return;
    }
    var c = Contacts.get(Session.queue[Session.pos]); if (!c) { Session.queue.splice(Session.pos, 1); Session.render(); return; }
    if (Session.curId !== c.id) { Session.curId = c.id; Session.n = 1; }          // زبون جديد: النتيجة للرقم الأول
    var id = esc(c.id), two = hasTwo(c);
    var callBtn = function (k, big) { var ph = phoneN(c, k);
      return '<a class="btn call' + (big ? ' big' : '') + (two && Session.n === k ? ' sel' : '') + '" href="' + telHref(ph) + '" data-act="s-call" data-n="' + k + '">📞 ' + (two ? ltr(ph) : L('اتصال', 'Appeler')) + '</a>'; };
    el.innerHTML = '<div class="s-top"><button class="x" data-act="s-end" aria-label="close">✕</button>'
        + '<div class="s-prog"><i style="width:' + (Session.done / (Session.done + n) * 100) + '%"></i></div>'
        + '<span class="s-count">' + (Session.pos + 1) + '/' + n + '</span>'
        + '<button class="btn sm" data-act="h-open">✔ ' + Session.done + '</button></div>'
      + '<div class="s-body">'
        + '<div class="s-card">' + daysChip(c)
          + '<div class="s-name">' + esc(c.name || '—') + '</div>'
          + '<div class="s-meta">' + (c.plate ? ltr(c.plate) : '') + (c.marque ? ' · ' + esc(c.marque) : '') + (c.dateE ? ' · ' + L('ينتهي ', 'fin ') + fmtD(c.dateE) : '') + '</div>'
          + (c.prime ? '<div class="s-price">💵 ' + L('السعر: ', 'Prime : ') + '<b>' + moneyH(c.prime, 1) + '</b></div>' : App.run('session.info', c))
          + (c.phone ? (two ? '' : '<div class="s-phone">' + ltr(c.phone) + '</div>') : '<div class="s-nophone">' + L('بلا رقم هاتف — أضفه بزر «تعديل»', 'Sans téléphone — ajoutez-le avec « Modifier »') + '</div>')
          + (c.note ? '<div class="s-note">📝 ' + esc(c.note) + '</div>' : '')
          + (c.followDate ? '<div class="s-last">⏰ ' + L('موعد المتابعة: ', 'Rappel : ') + fmtD(c.followDate) + '</div>' : '')
          + attemptsHTML(c)
        + '</div>'
        + App.run('session.blocks', c)
        + (c.phone ? (two ? '<div class="acts2 s-calls">' + callBtn(1) + callBtn(2) + '</div>' : callBtn(1, true)) : '')
        + '<div class="acts3"><button class="btn wa' + (c.noWa ? ' dim' : '') + '" data-act="c-msg" data-ch="wa" data-id="' + id + '"' + (c.phone ? '' : ' disabled') + '>💬 ' + (c.noWa ? L('لا واتساب', 'Pas de WA') : L('واتساب', 'WhatsApp')) + '</button>'
          + '<button class="btn sms" data-act="c-msg" data-ch="sms" data-id="' + id + '"' + (c.phone ? '' : ' disabled') + '>✉️ SMS</button>'
          + '<button class="btn green" data-act="c-renew" data-id="' + id + '">🔄 ' + L('تجديد', 'Renouv.') + '</button></div>'
        + '<div class="s-lbl">' + L('نتيجة الاتصال', 'Résultat') + (two ? ' — ' + ltr(phoneN(c, Session.n)) : '') + '</div>'
        + '<div class="grid2">' + ['ans', 'no', 'busy', 'later', 'bv', 'hz'].map(function (k) { return '<button class="btn res" style="--c:' + CS[k].color + '" data-act="s-res" data-r="' + k + '">' + csLabel(k) + '</button>'; }).join('') + '</div>'
        + '<div class="acts3"><button class="btn sm' + (c.followup ? ' on' : '') + '" data-act="c-follow" data-id="' + id + '">⏰ ' + L('متابعة', 'Suivi') + '</button>'
          + '<button class="btn sm" data-act="c-edit" data-id="' + id + '">✏️ ' + L('تعديل', 'Modifier') + '</button>'
          + '<button class="btn sm" data-act="s-more">⋯ ' + L('نتيجة أخرى', 'Autre') + '</button></div>'
        + '<div class="acts3 s-foot">'
          + '<button class="btn" data-act="s-prev"' + (Session.pos > 0 ? '' : ' disabled') + '>→ ' + L('السابق', 'Préc.') + '</button>'
          + '<button class="btn" data-act="s-skip">' + L('التالي', 'Suivant') + ' ←</button>'
          + '<button class="btn pri" data-act="s-done">✔ ' + L('انتهيت', 'Terminé') + '</button>'
        + '</div>'
      + '</div>';
  }
};

App.act('s-start', function () { Session.start(); });
App.act('s-end', function () { Session.end(); });
App.act('s-skip', function () { Session.next(); });                 // التالي: ينتقل ولا يُخفي الزبون
App.act('s-prev', function () { Session.prev(); });
App.act('s-done', function () { var id = Session.cur(); if (id) Session.handled(id); });   // انتهيت: يُخفيه وينتقل
App.act('s-call', function (el) { Session.n = +el.dataset.n === 2 ? 2 : 1; setTimeout(function () { if (Session.on && !Modal.isOpen()) Session.render(); }, 400); });
App.act('s-more', function () { var id = Session.cur(); if (id) resultPicker(id, null, Session.n); });
/* تسجيل نتيجة في الجلسة: تُكتب على الرقم المختار، والزبون يبقى أمامك حتى تضغط «انتهيت» أو «التالي» */
function sessionResult(r) {
  var id = Session.cur(), c = Contacts.get(id); if (!c) return;
  logCall(id, r, '', phoneN(c, Session.n));
  if (r === 'ans') openRenew(id); else if (r === 'later') openFollow(id);
  else if (hasTwo(c) && Session.n === 1 && NOANS[r]) Session.n = 2;   // لم يجب على الأول → النتيجة التالية للرقم الثاني
  setTimeout(function () { if (Session.on && !Modal.isOpen()) Session.render(); }, 150);
}
App.act('s-res', function (el) { sessionResult(el.dataset.r); });
App.on('refresh', function () { if (Session.on && !Modal.isOpen()) Session.render(); });
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { if (Modal.isOpen()) Modal.close(); else if (Session.on) Session.end(); else if (Sheet.isOpen()) Sheet.close(); return; }
  if (!Session.on || Modal.isOpen() || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
  var map = { '1': 'ans', '2': 'no', '3': 'busy', '4': 'later', '5': 'bv', '6': 'hz' };
  if (map[e.key]) { e.preventDefault(); sessionResult(map[e.key]); }
  else if (e.key === ' ' || e.key === 'ArrowLeft') { e.preventDefault(); Session.next(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); Session.prev(); }
  else if (e.key === 'Enter') { e.preventDefault(); var id = Session.cur(); if (id) Session.handled(id); }
});

/* ═════════ استيراد لائحة التجديد من Excel ═════════ */
var IMPORT_COLS = [
  ['name',   'الاسم',        ['assure', 'assuré', 'nom', 'nomprenom', 'client', 'name', 'raisonsociale', 'الاسم', 'الزبون', 'العميل']],
  ['phone',  'الهاتف',       ['telephone', 'tel', 'tél', 'gsm', 'mobile', 'portable', 'phone', 'telephone1', 'tel1', 'الهاتف', 'هاتف']],
  ['phone2', 'هاتف 2',       ['telephone2', 'tel2', 'gsm2', 'mobile2', 'phone2', 'هاتف2']],
  ['plate',  'اللوحة',       ['matricule', 'immatriculation', 'immat', 'plate', 'اللوحة', 'لوحة']],
  ['police', 'البوليصة',     ['n°police', 'npolice', 'nopolice', 'numpolice', 'police', 'policy', 'البوليصة', 'بوليصة']],
  ['att',    'الشهادة',      ['attestation', 'n°attestation', 'الشهادة']],
  ['dateS',  'البداية',      ['du', 'debut', 'datedebut', 'dateeffet', 'effet', 'البداية']],
  ['dateE',  'الانتهاء',     ['au', 'fin', 'datefin', 'echeance', 'dateecheance', 'expiration', 'dateexpiration', 'الانتهاء', 'النهاية']],
  ['prime',  'السعر',        ['primetotale', 'prime', 'primettc', 'السعر', 'القسط']],
  ['marque', 'الماركة',      ['marque', 'الماركة']],
  ['group',  'المجموعة',     ['groupe', 'group', 'المجموعة']],
  ['ville',  'المدينة',      ['ville', 'city', 'المدينة']],
  ['cat',    'الفئة',        ['cat', 'categorie', 'catégorie', 'usage']],
  ['duree',  'نوع المدة',    ['duree', 'typeduree', 'typecontrat']],
  ['vehType','نوع المركبة',  ['typevehicule', 'vehicule', 'genre', 'نوعالمركبة']],
  ['agent',  'المسؤول',      ['agent', 'commercial', 'المسؤول']],
  ['note',   'ملاحظة',       ['note', 'notes', 'remarque', 'remarques', 'observation', 'ملاحظة', 'ملاحظات']]
];
/* اسم العمود مبسَّطاً: حروف وأرقام فقط («Nom & Prénom» ← «nomprenom»، «N° Police» ← «npolice») */
function normH(s) { s = String(s == null ? '' : s).toLowerCase(); try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { } return s.replace(/[^a-z0-9\u0600-\u06FF]+/g, ''); }
function xCell(row, i) { if (i == null || i < 0) return ''; var v = row[i]; if (v == null) return ''; if (v instanceof Date) return v; if (typeof v === 'number') return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(v); return String(v).trim(); }
function xDate(v) {
  if (v instanceof Date) { if (isNaN(v)) return ''; return isoOf(new Date(v.getTime() + 12 * 3600000)); }
  if (typeof v === 'number' && v > 20000 && v < 80000) return xDate(new Date(Math.round((v - 25569) * 86400000)));
  v = String(v == null ? '' : v).trim(); var m = v.match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/); if (!m) return '';
  if (m[1].length === 4) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);
  return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad2(m[2]) + '-' + pad2(m[1]);
}
function xPhone(v) {
  var p = String(v == null ? '' : v).replace(/[^\d+]/g, ''); if (!p) return '';
  if (p.indexOf('+212') === 0) p = '0' + p.slice(4); else if (p.indexOf('00212') === 0) p = '0' + p.slice(5); else if (p.indexOf('212') === 0 && p.length === 12) p = '0' + p.slice(3);
  if (p.length === 9 && /^[5-7]/.test(p)) p = '0' + p;   // Excel يحذف الصفر الأول من الأرقام
  if (p.replace(/\D/g, '').length < 9) return '';          // «06» وحدها ليست رقماً
  return p;
}
/* يقرأ الملف ويتعرّف على الأعمدة. يُرجع { cols:{حقل:اسم العمود}, rows:[…] } */
function parseRenewFile(buf) {
  var wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  if (!rows.length) throw new Error(L('الملف فارغ', 'Fichier vide'));
  var best = 0, bestScore = -1, bestMap = null;
  for (var r = 0; r < Math.min(rows.length, 12); r++) {
    var hdr = rows[r].map(normH), used = {}, map = {}, score = 0;
    IMPORT_COLS.forEach(function (col) {
      var idx = -1;
      col[2].some(function (k) { k = normH(k); var i = hdr.indexOf(k); if (i >= 0 && !used[i]) { idx = i; return true; } return false; });
      /* ثم «يحتوي»: للكلمات القصيرة (nom, tel, gsm, du, au) نقبل فقط بداية الاسم، والأقصر من 3 أحرف مطابقة تامة فقط */
      if (idx < 0) col[2].some(function (k) { k = normH(k); if (k.length < 3) return false;
        for (var i = 0; i < hdr.length; i++) { if (used[i] || !hdr[i]) continue; var at = hdr[i].indexOf(k); if (k.length >= 4 ? at >= 0 : at === 0) { idx = i; return true; } } return false; });
      if (idx >= 0) { used[idx] = 1; map[col[0]] = idx; score++; }
    });
    if (score > bestScore) { bestScore = score; best = r; bestMap = map; }
  }
  /* لم نجد عمود الاسم بعنوانه: خذ أول عمود غير مستعمل أغلبه نص */
  if (bestMap.name == null) {
    var usedIdx = {}, sample = rows.slice(best + 1, best + 60), bi = -1, bt = 0;
    Object.keys(bestMap).forEach(function (k) { usedIdx[bestMap[k]] = 1; });
    for (var ci = 0; ci < (rows[best] || []).length; ci++) { if (usedIdx[ci]) continue; var txt = 0;
      sample.forEach(function (rw) { var v = rw[ci]; if (typeof v !== 'string') return; v = v.trim(); if (v && /[A-Za-z\u0600-\u06FF]/.test(v) && v.replace(/\D/g, '').length < v.length * 0.4) txt++; });
      if (txt > bt) { bt = txt; bi = ci; } }
    if (bt >= 2) bestMap.name = bi;
  }
  var head = rows[best] || [], cols = {};
  Object.keys(bestMap).forEach(function (k) { cols[k] = String(head[bestMap[k]]); });
  var out = [];
  for (var i = best + 1; i < rows.length; i++) {
    var row = rows[i], g = function (k) { return xCell(row, bestMap[k]); };
    var name = String(g('name') || ''), phone = xPhone(g('phone'));
    if (!name && !phone && !g('police') && !g('plate')) continue;
    out.push({ name: name || '—', phone: phone, phone2: xPhone(g('phone2')), plate: String(g('plate') || '').toUpperCase(), police: String(g('police') || ''),
      att: String(g('att') || ''), dateS: xDate(bestMap.dateS != null ? row[bestMap.dateS] : ''), dateE: xDate(bestMap.dateE != null ? row[bestMap.dateE] : ''),
      prime: bestMap.prime != null ? (Math.round(num(row[bestMap.prime]) * 100) / 100 || '') : '', marque: String(g('marque') || ''), group: String(g('group') || ''),
      ville: String(g('ville') || ''), cat: String(g('cat') || ''), duree: String(g('duree') || ''), vehType: String(g('vehType') || '') || vehFromCat(g('cat')), agent: String(g('agent') || ''), note: String(g('note') || '') });
  }
  return { cols: cols, rows: out, sheet: wb.SheetNames[0] };
}
var IMP = null;
App.act('r-import', function () {
  if (!App.canUp()) return;
  Modal.close(); var f = $('file-in'); f.value = ''; f.dataset.inp = 'r-file'; f.click();
});
App.input('r-file', function (el) {
  var file = el.files && el.files[0]; if (!file) return;
  toast(L('⏳ جارٍ قراءة الملف…', '⏳ Lecture…'));
  var rd = new FileReader();
  rd.onload = function (e) {
    try { IMP = parseRenewFile(e.target.result); IMP.file = file.name; importPreview(); }
    catch (err) { toast(L('خطأ في قراءة الملف: ', 'Erreur : ') + err.message, 'err'); }
  };
  rd.readAsArrayBuffer(file);
});
function importPreview() {
  var p = IMP, old = Contacts.list.length;
  var withPhone = p.rows.filter(function (r) { return r.phone; }).length, withEnd = p.rows.filter(function (r) { return r.dateE; }).length;
  var need = ['name', 'phone', 'plate', 'police', 'dateE'];
  Modal.open(Modal.head('📥 ' + esc(p.file))
    + '<div class="box"><b>' + p.rows.length + '</b> ' + L('زبون في الملف', 'clients dans le fichier') + ' · ' + L('بهاتف: ', 'avec tél. : ') + withPhone + ' · ' + L('بتاريخ انتهاء: ', 'avec échéance : ') + withEnd + '</div>'
    + '<div class="sec-t">' + L('الأعمدة التي تعرّفتُ عليها', 'Colonnes reconnues') + '</div>'
    + '<div class="cols">' + IMPORT_COLS.map(function (c) {
        var found = p.cols[c[0]];
        if (!found && need.indexOf(c[0]) < 0) return '';
        return '<div class="' + (found ? 'ok' : 'miss') + '"><span>' + c[1] + '</span><b>' + (found ? '← ' + esc(found) : L('غير موجود', 'absent')) + '</b></div>'; }).join('') + '</div>'
    + (p.rows.length ? ''
        + '<button class="btn pri wide" data-act="r-commit" data-mode="replace">📦 ' + (old ? L('أرشفة اللائحة الحالية (' + old + ') وتحميل الجديدة', 'Archiver l\'actuelle (' + old + ') et charger la nouvelle') : L('تحميل اللائحة', 'Charger la liste')) + '</button>'
        + (old ? '<div class="hint">' + L('اللائحة الحالية كتمشي للأرشيف 🗄️ بكل المكالمات والملاحظات، وكتبان فبطاقة الزبون ملي يرجع.', 'La liste actuelle part aux archives avec appels et notes.') + '</div>' : '')
      : '<div class="box red">' + L('لم أجد أي زبون في الملف.', 'Aucun client trouvé.') + '</div>')
    + '<div id="imp-prog" class="muted sm"></div>');
}
App.act('r-commit', function (el) {
  var mode = el.dataset.mode, p = IMP; if (!p || !p.rows.length) return;
  if (!navigator.onLine) { toast(L('يلزم اتصال بالإنترنت للتحميل', 'Connexion Internet requise'), 'err'); return; }
  document.querySelectorAll('#modal-box .btn').forEach(function (b) { b.disabled = true; });
  var prog = function (t) { var e = $('imp-prog'); if (e) e.textContent = t; };
  var old = Contacts.list.slice(), now = new Date().toISOString(), base = 0, stamp = Date.now().toString(36);
  if (mode === 'add') old.forEach(function (c) { if (+c.ord > base) base = +c.ord; });
  var ops = [];
  if (mode === 'replace') old.forEach(function (c) { ops.push({ del: 1, ref: Contacts.col().doc(c.id) }); });
  p.rows.forEach(function (r, i) {
    ops.push({ ref: Contacts.col().doc('c' + stamp + '_' + i), data: Object.assign({}, r, { ord: base + i + 1, created: now, by: App.user.name }) });
  });
  var go = function () {
    prog(L('جارٍ الرفع…', 'Envoi…'));
    return FB.batches(ops, function (i, t) { prog(L('جارٍ الرفع… ', 'Envoi… ') + i + '/' + t); }).then(function () {
      if (mode === 'replace') Meta.save({ listName: p.file, listLoadedAt: now });
      Renew.filter = 'all'; Renew.q = ''; Modal.close();
      toast(L('✅ حُمّلت ' + p.rows.length + ' زبون', '✅ ' + p.rows.length + ' clients chargés'));
      App.emit('renew.imported');
    });
  };
  var chain;
  if (mode === 'replace' && old.length) {
    prog(L('جارٍ أرشفة اللائحة الحالية…', 'Archivage…'));
    chain = Arch.save({ name: Meta.get('listName', L('لائحة سابقة', 'Liste précédente')), loadedAt: Meta.get('listLoadedAt', '') }, old)
      .catch(function (e) {
        /* تعذّر الأرشيف السحابي: لا نحذف شيئاً قبل أن نعطيك نسخة Excel من اللائحة القديمة */
        console.warn('archive', e); exportContactsXlsx(old, 'renewpro_ancienne_liste_' + todayISO() + '.xlsx');
        if (!confirm(L('تعذّر حفظ الأرشيف في السحابة (قاعدة rp_meta غير مفعّلة).\nحُمّلت اللائحة القديمة كملف Excel على جهازك.\n\nمتابعة تحميل اللائحة الجديدة؟',
          'Archivage cloud impossible (règle rp_meta absente).\nL\'ancienne liste a été téléchargée en Excel.\n\nContinuer ?'))) throw new Error('cancel');
      }).then(go);
  } else chain = go();
  chain.catch(function (e) {
    document.querySelectorAll('#modal-box .btn').forEach(function (b) { b.disabled = false; });
    if (e && e.message === 'cancel') { prog(''); return; }
    prog(''); syncErr(e);
  });
});

/* تصدير لائحة زبناء إلى Excel: ورقة «الزبناء» + ورقة «المكالمات» */
function exportContactsXlsx(list, filename) {
  var fr = function (k) { return CS[k] ? CS[k].fr : (k || ''); };
  var clients = list.map(function (c) { var h = lastCall(c);
    return { '#': c.ord != null ? c.ord : '', Nom: c.name || '', Telephone: c.phone || '', Telephone2: c.phone2 || '', Matricule: c.plate || '', Police: c.police || '',
      Attestation: c.att || '', Du: c.dateS || '', Au: c.dateE || '', 'Prime Totale': c.prime || '', Marque: c.marque || '', Groupe: c.group || '', Ville: c.ville || '', Agent: c.agent || '',
      Note: c.note || '', 'Dernier appel': h ? fr(h.result) : '', 'Date appel': h ? fmtDT(h.date) : '', 'Nb appels': callCount(c),
      Confirme: c.renewConfirmed && !c.renewed ? 'Oui' : '', Renouvele: c.renewed ? 'Oui' : '', Traite: c.handled ? 'Oui' : '' }; });
  var calls = []; list.forEach(function (c) { (c.callHistory || []).forEach(function (h) {
    calls.push({ Date: fmtDT(h.date), Nom: c.name || '', Telephone: c.phone || '', Matricule: c.plate || '', Police: c.police || '', Resultat: fr(h.result), Note: h.note || '', Agent: h.user || '' }); }); });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clients), 'Clients');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(calls.length ? calls : [{ Date: '' }]), 'Appels');
  XLSX.writeFile(wb, filename);
}

App.register({
  id: 'renew', icon: '🔄', title: ['التجديد', 'Renouvellements'], order: 10, render: renderRenew, perm: 'renew',
  badge: function () { var n = renewBase().filter(function (c) { return !isStale(c) && !c.renewed && daysLeft(c.dateE) !== null && daysLeft(c.dateE) <= 0; }).length; return n ? String(n) : ''; }
});
