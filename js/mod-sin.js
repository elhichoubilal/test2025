/* ══════════════════════════════════════════════════════════
   RenewPro v4 — mod-sin.js   (🚗 الحوادث — سجل الحوادث والتسويات والرجوع)
   منقول من برنامج «Registre des sinistres» كما هو: نفس الأعمدة والحالات والألوان،
   نفس قراءة تصريح PDF، ونفس Excel (استيراد/تصدير بالألوان، شكل السجل الورقي).
   الجديد فقط:
     • البيانات في Firebase (مجموعة sinistres) ← الحاسوب والهاتف، ولا تضيع.
     • 📝 ملاحظات المتابعة داخل البرنامج فقط (بالتاريخ والاسم) — لا تدخل في Excel.
     • إشعار كل يومين: الملفات المفتوحة حسب عمرها من تاريخ الحادثة.
     • الحادثة في بطاقة الزبون (بالبوليصة) لمن له صلاحية «الحوادث»، مع زر إيقاف في الإعدادات.
   المكتبات (ExcelJS و pdf.js) تُحمَّل عند الحاجة فقط.
══════════════════════════════════════════════════════════ */
'use strict';

/* ───────── النموذج (من البرنامج الأصلي، دون تغيير) ───────── */
var SIN_COLS = [
  {k:"ordre",       label:"N° d'ordre",          type:"id",     w:12.9},
  {k:"dateOp",      label:"Date de l'opération", type:"date",   w:18},
  {k:"dateSin",     label:"Date du sinistre",    type:"date",   w:18},
  {k:"dateRecep",   label:"Date de réception de la déclaration", short:"Date réception", type:"date", w:22},
  {k:"cat",         label:"CAT",                 type:"text",   w:8.4},
  {k:"police",      label:"Police",              type:"id",     w:21.1},
  {k:"assure",      label:"Nom / Raison sociale", g:"Assuré",   type:"text", w:45.3},
  {k:"dossier",     label:"N° dossier",          g:"Assuré",    type:"id",   w:14},
  {k:"refCie",      label:"Référence de la compagnie", short:"Référence compagnie", type:"id", w:26},
  {k:"advCie",      label:"Raison sociale",      g:"Compagnie adverse", type:"text", w:18},
  {k:"advPolice",   label:"N° Police",           g:"Compagnie adverse", type:"id",   w:26},
  {k:"advSinistre", label:"N° Sinistre",         g:"Compagnie adverse", type:"id",   w:26},
  {k:"benef",       label:"Bénéficiaire",        type:"text",   w:23},
  {k:"quitNum",     label:"N° Quittance",        g:"Quittance d'indemnité", type:"id",     w:13},
  {k:"quitDate",    label:"Date de réception",   g:"Quittance d'indemnité", type:"date",   w:18},
  {k:"quitMontant", label:"Montant",             g:"Quittance d'indemnité", type:"amount", w:18.7},
  {k:"regRef",      label:"Référence du moyen de paiement", short:"Moyen de paiement", g:"Référence du règlement", type:"id", w:36},
  {k:"regMontant",  label:"Montant",             g:"Référence du règlement", type:"amount", w:19},
  {k:"regDate",     label:"Date",                g:"Référence du règlement", type:"date",   w:18},
  {k:"compRef",     label:"Référence situation de règlement", short:"Réf. situation", g:"Compensation", type:"id", w:18},
  {k:"compDate",    label:"Date",                g:"Compensation", type:"date", w:17.3},
  {k:"recours",     label:"Montant des recours", type:"amount", w:17.6},
  {k:"obs",         label:"Observations",        type:"text",   w:49.4}
];
var SIN_STATUTS = [
  {k:"en_cours",   label:"En cours",    xl:null,       css:"#ffffff"},
  {k:"pec",        label:"PEC",         xl:"FFFFFF00", css:"#ffe94d"},
  {k:"regle",      label:"Réglé",       xl:"FF92D050", css:"#92d050"},
  {k:"resp",       label:"Responsable", xl:"FFFFC000", css:"#ffc000"},
  {k:"sans_suite", label:"Sans suite",  xl:null,       css:"#c5cad2"}
];
var SIN_STAT = {}; SIN_STATUTS.forEach(function (s) { SIN_STAT[s.k] = s; });
var SIN_COL = {}; SIN_COLS.forEach(function (c) { SIN_COL[c.k] = c; });
var SIN_CIES = ["WAFA","SANLAM","RMA","CAT","MATU","AXA","ATLANTA","ALLIANZ","SANAD","MCMA","MAMDA","BDG","DOMAGE","ETRANGER"];
var SIN_OPEN = { en_cours: 1, pec: 1 };                         // الملفات المفتوحة (للإشعار والعمر)

var Sin = { rows: [], ready: false, denied: false, unsub: null, q: '', statut: 'all', year: 'all', age: '', desc: true, limit: 300, editing: null };
Sin.col = function () { return FB.db.collection('sinistres'); };
Sin.start = function () {
  if (Sin.unsub || !FB.db || !App.can('sin')) return;
  Sin.unsub = Sin.col().onSnapshot(function (snap) {
    var a = []; snap.forEach(function (d) { var r = d.data() || {}; r.id = d.id; a.push(r); });
    a.sort(function (x, y) { return sinOrdreKey(x) - sinOrdreKey(y); });
    Sin.rows = a; Sin.ready = true; Sin.denied = false; App.refresh();
  }, function (e) { console.warn('sinistres', e); Sin.denied = true; Sin.ready = true; App.refresh(); });
};
Sin.stop = function () { if (Sin.unsub) { try { Sin.unsub(); } catch (e) { } } Sin.unsub = null; Sin.rows = []; Sin.ready = false; };
App.on('login', function () { setTimeout(Sin.start, 300); });
App.on('logout', Sin.stop);
App.on('refresh', function () { if (!Sin.unsub && App.user && App.can('sin')) Sin.start(); });   // بعد تحميل الصلاحيات

/* ───────── أدوات (من الأصل) ───────── */
var sinFold = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
var sinTidy = function (s) { return String(s == null ? '' : s).replace(/[ \s]+/g, ' ').trim(); };
function sinToday() { var d = new Date(); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
function sinTidyDate(s) {
  s = sinTidy(s);
  var m = s.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2}|\d{4})$/) || s.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return s;
  return pad2(m[1]) + '/' + pad2(m[2]) + '/' + (m[3].length === 2 ? '20' + m[3] : m[3]);
}
function sinIsDate(s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); return !!m && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12; }
function sinAmount(s) {
  s = sinTidy(s).replace(/\s/g, '').replace(/(dh|mad)$/i, '');
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) s = s.replace(/\./g, '');
  s = s.replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
}
function sinMoney(n) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[  ]/g, ' '); }
function sinOrdreNum(o) { var m = /^\s*(\d+)\s*\/\s*(\d{2,4})\s*$/.exec(o || ''); return m ? { n: +m[1], y: m[2].slice(-2) } : null; }
function sinOrdreKey(r) { var o = sinOrdreNum(r.ordre); return o ? (+o.y) * 100000 + o.n : 9e9; }
function sinNextOrdre() { var max = 0, yy = String(new Date().getFullYear()).slice(-2);
  Sin.rows.forEach(function (r) { var o = sinOrdreNum(r.ordre); if (o && o.y === yy && o.n > max) max = o.n; });
  if (!max) Sin.rows.forEach(function (r) { var o = sinOrdreNum(r.ordre); if (o && o.n > max) max = o.n; });
  return (max + 1) + '/' + yy; }
function sinYear(r) { var o = sinOrdreNum(r.ordre); return o ? '20' + o.y : ''; }
function sinDateObj(s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || ''); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
/* عمر الملف من تاريخ الحادثة: m1 أقل من شهر · m3 من شهر إلى 3 أشهر · old أكثر من 3 أشهر · nd بلا تاريخ صحيح · relance متأخرة أكثر من 15 يوم بلا تحديث */
function sinAge(r) { var d = sinDateObj(r.dateSin); if (!d) return 'nd'; var days = Math.floor((Date.now() - d.getTime()) / 86400000);
  return days < 30 ? 'm1' : days <= 90 ? 'm3' : 'old'; }
function sinNeedsRelance(r) {
  if (!SIN_OPEN[r.statut || 'en_cours']) return false;
  var dBase = sinDateObj(r.dateRecep) || sinDateObj(r.dateOp) || sinDateObj(r.dateSin);
  if (!dBase) return false;
  var ageDays = Math.floor((Date.now() - dBase.getTime()) / 86400000);
  if (ageDays < 15) return false;
  var notes = r.notes || [];
  if (notes.length) {
    var lastAt = new Date(notes[notes.length - 1].at || 0).getTime();
    if (!isNaN(lastAt) && (Date.now() - lastAt) / 86400000 < 15) return false;
  }
  return true;
}
var SIN_AGE = { relance: ['🔔 تحتاج تذكير (+15ي)', '🔔 À relancer (+15j)'], m1: ['أقل من شهر', '< 1 mois'], m3: ['من شهر إلى 3 أشهر', '1 à 3 mois'], old: ['أكثر من 3 أشهر', '> 3 mois'], nd: ['بلا تاريخ', 'Sans date'] };
function sinAgeCounts() { var c = { relance: 0, m1: 0, m3: 0, old: 0, nd: 0 }; Sin.rows.forEach(function (r) { if (SIN_OPEN[r.statut || 'en_cours']) { c[sinAge(r)]++; if (sinNeedsRelance(r)) c.relance++; } }); return c; }

/* ───────── المكتبات عند الحاجة ───────── */
var sinLibs = {};
function sinLoad(src) {
  if (!sinLibs[src]) sinLibs[src] = new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { delete sinLibs[src]; ko(new Error('تعذّر تحميل ' + src)); }; document.head.appendChild(s); });
  return sinLibs[src];
}
function sinExcelJS() { return window.ExcelJS ? Promise.resolve() : sinLoad('js/vendor/exceljs.min.js'); }
/* pdf.js 3.11: بتحميل العامل في الصفحة نفسها يعمل بلا ملف عامل منفصل (كما في البرنامج الأصلي) */
function sinPdfJS() { return window.pdfjsLib && window.pdfjsWorker ? Promise.resolve() : sinLoad('js/vendor/pdf.min.js').then(function () { return sinLoad('js/vendor/pdf.worker.min.js'); }); }

/* ───────── الحفظ ───────── */
function sinClean(r) { var o = {}; SIN_COLS.forEach(function (c) { o[c.k] = r[c.k] || ''; }); o.statut = SIN_STAT[r.statut] ? r.statut : 'en_cours'; return o; }
function sinSave(id, data, isNew) {
  data.upd = new Date().toISOString(); data.updBy = App.user.name;
  if (isNew) { data.created = data.upd; data.by = App.user.name; return Sin.col().add(data); }
  return Sin.col().doc(id).update(data);
}

/* ───────── الصفحة ───────── */
function sinMatches(r, ignoreStatut) {
  if (Sin.year !== 'all' && sinYear(r) !== Sin.year) return false;
  if (!ignoreStatut && Sin.statut !== 'all' && (r.statut || 'en_cours') !== Sin.statut) return false;
  if (Sin.age) {
    if (Sin.age === 'relance') { if (!sinNeedsRelance(r)) return false; }
    else if (!(SIN_OPEN[r.statut || 'en_cours'] && sinAge(r) === Sin.age)) return false;
  }
  if (Sin.q) { var hay = sinFold([r.ordre, r.assure, r.police, r.dossier, r.refCie, r.advCie, r.advPolice, r.advSinistre, r.benef, r.regRef, r.quitNum, r.obs].join(' | '));
    if (!Sin.q.split(' ').every(function (w) { return hay.indexOf(w) >= 0; })) return false; }
  return true;
}
function sinHeadHTML() {
  var top = "<tr><th rowspan='2'>" + esc(SIN_COLS[0].label) + "</th><th rowspan='2'>Statut</th>", sub = "<tr class='sub'>";
  for (var i = 1; i < SIN_COLS.length; i++) {
    var c = SIN_COLS[i];
    if (!c.g) { top += '<th rowspan="2">' + esc(c.short || c.label) + '</th>'; continue; }
    if (SIN_COLS[i - 1].g !== c.g) { var span = SIN_COLS.filter(function (x) { return x.g === c.g; }).length; top += '<th class="grp" colspan="' + span + '">' + esc(c.g) + '</th>'; }
    sub += '<th>' + esc(c.short || c.label) + '</th>';
  }
  return top + '</tr>' + sub + '</tr>';
}
function sinCell(r, c) {
  var v = r[c.k] || '';
  if (c.type === 'amount') { var n = sinAmount(v); return '<td class="num">' + (isNaN(n) ? esc(v) : sinMoney(n)) + '</td>'; }
  if (c.type === 'date') { var odd = v && v.length <= 11 && v.indexOf('-') < 0 && !sinIsDate(v); return '<td class="c' + (odd ? ' odd' : '') + '"' + (odd ? ' title="تاريخ غير صحيح"' : '') + '>' + esc(v) + '</td>'; }
  if (c.k === 'cat') return '<td class="c">' + esc(v) + '</td>';
  if (c.k === 'obs') return '<td class="obs" title="' + esc(v) + '">' + esc(v) + '</td>';
  return '<td>' + esc(v) + '</td>';
}
function sinTableHTML() {
  var pool = Sin.rows.filter(function (r) { return sinMatches(r, false); });
  var list = Sin.desc ? pool.slice().reverse() : pool;
  if (!list.length) return '<div class="empty"><span>' + (Sin.rows.length ? L('لا توجد ملفات مطابقة.', 'Aucun dossier correspondant.') : L('السجل فارغ. استورد ملف Excel من برنامجك القديم أو تصريح PDF.', 'Registre vide. Importez l\'Excel de l\'ancien registre ou une déclaration PDF.')) + '</span></div>';
  var sum = function (k) { return list.reduce(function (t, r) { var n = sinAmount(r[k]); return t + (isNaN(n) ? 0 : n); }, 0); };
  return (Sin.full ? '<button class="sin-xbtn" data-act="sin-full" title="' + L('رجوع', 'Fermer') + '">✕</button>' : '') + '<div class="sin-wrap"><table class="sin-reg"><thead>' + sinHeadHTML() + '</thead><tbody>'
    + list.slice(0, Sin.limit).map(function (r) { var st = r.statut || 'en_cours', nn = (r.notes || []).length;
        return '<tr class="s-' + esc(st) + '" data-act="sin-open" data-id="' + esc(r.id) + '"><td>' + esc(r.ordre) + (nn ? ' <span class="sin-nb" title="' + nn + ' ' + L('ملاحظة', 'notes') + '">📝' + nn + '</span>' : '') + '</td><td>' + esc((SIN_STAT[st] || SIN_STAT.en_cours).label) + '</td>'
          + SIN_COLS.slice(1).map(function (c) { return sinCell(r, c); }).join('') + '</tr>'; }).join('')
    + '</tbody></table></div>'
    + (list.length > Sin.limit ? '<button class="btn wide" data-act="sin-more">' + L('عرض المزيد', 'Afficher plus') + ' (' + (list.length - Sin.limit) + ')</button>' : '')
    + '<div class="sin-foot"><span>Dossiers <b>' + list.length + '</b> / ' + Sin.rows.length + '</span><span>Quittances <b>' + sinMoney(sum('quitMontant')) + '</b> DH</span>'
    + '<span>Règlements <b>' + sinMoney(sum('regMontant')) + '</b> DH</span><span>Recours <b>' + sinMoney(sum('recours')) + '</b> DH</span></div>';
}
function sinChipsHTML() {
  var pool = Sin.rows.filter(function (r) { return sinMatches(r, true); }), counts = {};
  pool.forEach(function (r) { var s = r.statut || 'en_cours'; counts[s] = (counts[s] || 0) + 1; });
  var ac = sinAgeCounts();
  return '<div class="chips wrap sin-row"><button class="chip' + (Sin.statut === 'all' ? ' on' : '') + '" data-act="sin-st" data-s="all">Tous <b>' + pool.length + '</b></button>'
    + SIN_STATUTS.map(function (s) { return '<button class="chip' + (Sin.statut === s.k ? ' on' : '') + '" data-act="sin-st" data-s="' + s.k + '"><i class="sin-dot" style="background:' + s.css + '"></i>' + esc(s.label) + ' <b>' + (counts[s.k] || 0) + '</b></button>'; }).join('') + '</div>'
    + '<div class="chips wrap sin-row"><span class="muted sm sin-agel">⏱️ ' + L('المفتوحة حسب تاريخ الحادثة:', 'Ouverts par ancienneté :') + '</span>'
    + ['relance', 'm1', 'm3', 'old', 'nd'].filter(function (k) { return k !== 'nd' || ac.nd; }).map(function (k) {
        return '<button class="chip' + (Sin.age === k ? ' on' : '') + ' age-' + k + '" data-act="sin-age" data-a="' + k + '">' + L(SIN_AGE[k][0], SIN_AGE[k][1]) + ' <b>' + ac[k] + '</b></button>'; }).join('') + '</div>';
}
function renderSin(el) {
  if (!Sin.ready) { el.innerHTML = '<div class="empty">⏳ ' + L('جارٍ التحميل…', 'Chargement…') + '</div>'; if (!Sin.unsub) Sin.start(); return; }
  var years = []; Sin.rows.forEach(function (r) { var y = sinYear(r); if (y && years.indexOf(y) < 0) years.push(y); }); years.sort().reverse();
  if (Sin.full === undefined) Sin.full = sinLand();
  var keepQ = document.activeElement && document.activeElement.id === 'sin-q', pos = keepQ ? document.activeElement.selectionStart : 0;
  el.innerHTML = '<div class="page sin-page' + (Sin.full ? ' sin-full' : '') + '">'
    + (Sin.denied ? '<div class="box red">⚠️ ' + L('الحوادث غير مفعّلة في السحابة: انشر قواعد Firestore الجديدة (فيها sinistres).', 'Sinistres non activés : publiez les nouvelles règles Firestore.') + '</div>' : '')
    + '<div class="sin-title"><b>🚗 ' + L('سجل الحوادث والتسويات والرجوع', 'Registre des sinistres, règlements et recours') + '</b></div>'
    + '<input type="file" id="sin-pdf" data-inp="sin-pdf" accept="application/pdf,.pdf" hidden><input type="file" id="sin-xls" data-inp="sin-xls" accept=".xlsx" hidden>'
    + '<div class="bar sin-acts">'
      + '<button class="btn pri" data-act="sin-new" title="' + L('ملف جديد', 'Nouveau dossier') + '">➕<span class="bl"> ' + L('ملف جديد', 'Nouveau dossier') + '</span></button>'
      + '<button class="btn" data-act="sin-pick" data-f="sin-pdf" title="' + L('استيراد تصريح PDF (ولا لوّحو فوق البرنامج)', 'Importer un PDF (ou glissez-le)') + '">📄<span class="bl"> PDF</span></button>'
      + (typeof smDirList === 'function' ? '<button class="btn" data-act="sm-dir" title="' + L('الخبراء والأرقام ديالهم', 'Experts et numéros') + '">📇<span class="bl"> ' + L('الخبراء', 'Experts') + '</span></button>' : '')
      + '<span class="sp7"></span>'
      + '<button class="btn" data-act="sin-more7" title="' + L('المزيد', 'Plus') + '">⋯<span class="bl"> ' + L('المزيد', 'Plus') + '</span></button>'
    + '</div>'
    + '<div class="bar sin-filt"><div class="search" style="flex:1;min-width:120px"><span>🔍</span><input id="sin-q" data-inp="sin-q" placeholder="' + L('بحث: الاسم، البوليصة، المرجع…', 'Rechercher : nom, police, référence…') + '" value="' + esc(Sin.qRaw || '') + '"></div>'
      + '<select class="inp" data-inp="sin-year" style="width:auto"><option value="all">' + L('كل السنوات', 'Toutes années') + '</option>' + years.map(function (y) { return '<option' + (y === Sin.year ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>'
      + '<button class="btn" data-act="sin-order">' + (Sin.desc ? L('الأحدث أولاً ↓', 'Récents ↓') : L('الأقدم أولاً ↑', 'Anciens ↑')) + '</button></div>'
    + '<div id="sin-chips">' + sinChipsHTML() + '</div>'
    + '<div id="sin-body">' + sinTableHTML() + '</div>'
    + '</div>';
  if (keepQ) { var i = $('sin-q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { } } }
}
function sinFill() { var c = $('sin-chips'), b = $('sin-body'); if (c) c.innerHTML = sinChipsHTML(); if (b) b.innerHTML = sinTableHTML(); }
App.input('sin-q', debounce(function (el) { Sin.qRaw = el.value; Sin.q = sinFold(sinTidy(el.value)); Sin.limit = 300; sinFill(); }, 200));
App.input('sin-year', function (el) { Sin.year = el.value; sinFill(); });
App.act('sin-st', function (el) { Sin.statut = el.dataset.s; Sin.age = ''; sinFill(); });
App.act('sin-age', function (el) { Sin.age = Sin.age === el.dataset.a ? '' : el.dataset.a; if (Sin.age) Sin.statut = 'all'; sinFill(); });
App.act('sin-order', function () { Sin.desc = !Sin.desc; App.render(); });
App.act('sin-full', function () { Sin.full = !Sin.full; var p = document.querySelector('.sin-page'); if (p) p.classList.toggle('sin-full', Sin.full); sinFill(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && Sin.full && !document.querySelector('.modal.on')) { Sin.full = false; var p = document.querySelector('.sin-page'); if (p) p.classList.remove('sin-full'); sinFill(); } });
App.on('page', function (id) { if (id !== 'sin') Sin.full = false; else if (sinLand()) Sin.full = true; });
/* التيليفون بالعرض: الجدول يعمر الشاشة وحدو. ملي يرجع بالطول: يرجع العرض العادي */
function sinLand() { try { return matchMedia('(orientation: landscape) and (max-height: 500px)').matches; } catch (e) { return false; } }
try { matchMedia('(orientation: landscape) and (max-height: 500px)').addEventListener('change', function (e) {
  if (App.page !== 'sin' || Sin.full === e.matches) return; Sin.full = e.matches;
  var p = document.querySelector('.sin-page'); if (p) p.classList.toggle('sin-full', Sin.full); sinFill(); }); } catch (e) { }
App.act('sin-more', function () { Sin.limit += 300; sinFill(); });
App.act('sin-pick', function (el) { Modal.close(); var f = $(el.dataset.f); if (f) { f.value = ''; f.click(); } });
/* v7: الأزرار اللي قليلة الاستعمال فقائمة «⋯ المزيد» */
App.act('sin-more7', function () {
  var it = function (act, ic, ar, fr, extra) { return '<button class="menu-i" data-act="' + act + '"' + (extra || '') + '>' + ic + ' ' + esc(L(ar, fr)) + '</button>'; };
  Modal.open(Modal.head(L('المزيد', 'Plus'))
    + '<div class="menu">'
      + it('sin-export7', '📥', 'تصدير Excel', 'Exporter Excel')
      + (App.canUp() ? it('sin-pick', '📤', 'استيراد Excel', 'Importer Excel', ' data-f="sin-xls"') : '')
      + it('sin-decl', '📋', 'لائحة التصريحات', 'Liste des déclarations')
      + it('sin-full7', '⛶', 'الجدول على الشاشة كاملة', 'Tableau plein écran')
    + '</div>', 'small');
});
App.act('sin-export7', function () { Modal.close(); App.acts['sin-export'](); });
App.act('sin-full7', function () { Modal.close(); App.acts['sin-full'](); });


/* ───────── 📞 الهاتف (من كاع المصادر بالبوليصة) + إشعارات واتساب الزبون ───────── */
function sinPhone(r) { if (r && r.tel) return { p1: r.tel, p2: '', src: 'sin' }; return (typeof pfFind === 'function' && r && (r.police || r.plate)) ? pfFind(r.police || '', r.plate || '') : { p1: '', p2: '', src: '' }; }
function sinPhoneBox(r) {
  var x = sinPhone(r);
  var waBar = '<div class="chips wrap" style="margin-top:6px"><span class="muted sm">💬 ' + L('إشعار الزبون (واتساب):', 'Notifier le client (WhatsApp) :') + '</span>'
    + '<button type="button" class="chip" data-act="sin-wa-cli" data-k="open">📁 ' + L('فتح الملف والخبير', 'Ouverture & Expert') + '</button>'
    + '<button type="button" class="chip" data-act="sin-wa-cli" data-k="docs">📄 ' + L('وثائق ناقصة', 'Pièces manquantes') + '</button>'
    + '<button type="button" class="chip" data-act="sin-wa-cli" data-k="offre">🤝 ' + L('عرض التعويض', 'Offre d\'indemnité') + '</button>'
    + '<button type="button" class="chip" data-act="sin-wa-cli" data-k="cheque">💰 ' + L('جاهزية الشيك / التسوية', 'Chèque / Règlement') + '</button>'
    + '</div>';
  if (!x.p1) return '<div class="sin-ph">' + waBar + '</div>';
  return '<div class="sin-ph">📞 <b>' + L('الهاتف', 'Téléphone') + '</b> <small class="muted">(' + (x.src === 'sin' ? L('التصريح', 'déclaration') : typeof pfSrcLabel === 'function' ? pfSrcLabel(x.src) : '') + ')</small>'
    + '<div class="sin-ph-b">' + pfLinks(x.p1) + (x.p2 ? ' ' + pfLinks(x.p2) : '') + '</div>' + waBar + '</div>';
}
App.act('sin-wa-cli', function (el) {
  var e = Sin.editing; if (!e || !e.id) return;
  var r = Sin.rows.filter(function (x) { return x.id === e.id; })[0]; if (!r) return;
  var k = el.dataset.k, fr = typeof msgLang === 'function' && msgLang() === 'fr';
  var tel = (($('sf-x-tel') || {}).value || '').trim() || sinPhone(r).p1;
  if (!tel) { tel = prompt(L('أدخل رقم هاتف الزبون لإرسال الإشعار:', 'Entrez le numéro de téléphone du client :'), '') || ''; if (!tel.trim()) return; }
  var nom = (($('sf-assure') || {}).value || r.assure || '').trim();
  var dos = (($('sf-dossier') || {}).value || r.dossier || r.ordre || '').trim();
  var dt = (($('sf-dateSin') || {}).value || r.dateSin || '').trim();
  var exp = (($('sf-x-expert') || {}).value || r.expert || '').trim();
  var mnt = (($('sf-quitMontant') || {}).value || ($('sf-regMontant') || {}).value || r.quitMontant || r.regMontant || '').trim();
  var msg = '', lbl = '';
  if (k === 'open') {
    lbl = L('إشعار فتح الملف', 'Notification ouverture');
    msg = fr
      ? 'Bonjour ' + nom + ',\nVotre dossier sinistre N° ' + dos + (dt ? ' (du ' + dt + ')' : '') + ' a bien été ouvert auprès de notre agence.' + (exp ? '\nExpert désigné : ' + exp + '.' : '') + '\nNous vous tiendrons informé(e) de l\'avancement de votre dossier.'
      : 'السلام عليكم ' + nom + '،\nنخبركم أنه تم فتح ملف الحادثة رقم ' + dos + (dt ? ' (بتاريخ ' + dt + ')' : '') + ' لدى وكالتنا.' + (exp ? '\nالخبير المعيّن: ' + exp + '.' : '') + '\nسنوافيكم بكل مستجدات ملفكم. شكراً لثقتكم.';
  } else if (k === 'docs') {
    lbl = L('طلب وثائق ناقصة', 'Demande pièces manquantes');
    msg = fr
      ? 'Bonjour ' + nom + ',\nConcernant votre dossier sinistre N° ' + dos + ', merci de bien vouloir passer à l\'agence pour compléter les pièces nécessaires au traitement de votre dossier.\nCordialement.'
      : 'السلام عليكم ' + nom + '،\nبخصوص ملف الحادثة رقم ' + dos + '، المرجو الالتحاق بالوكالة لاستكمال الوثائق الضرورية لتسوية ملفكم في أقرب وقت.\nشكراً لتعاونكم.';
  } else if (k === 'offre') {
    lbl = L('إشعار عرض التعويض', 'Notification offre');
    msg = fr
      ? 'Bonjour ' + nom + ',\nL\'offre d\'indemnisation concernant votre dossier sinistre N° ' + dos + (mnt ? ' (Montant : ' + mnt + ' DH)' : '') + ' est prête.\nMerci de passer à l\'agence muni(e) de votre CIN pour signature de la quittance.'
      : 'السلام عليكم ' + nom + '،\nنخبركم بأن عرض التعويض الخاص بملف الحادثة رقم ' + dos + (mnt ? ' (المبلغ: ' + mnt + ' درهم)' : '') + ' قد أصبح جاهزاً.\nمرجو الحضور إلى الوكالة مصحوبين ببطاقة التعريف الوطنية لتوقيع التوصيل (Quittance).';
  } else {
    lbl = L('إشعار جاهزية الشيك/التسوية', 'Notification règlement');
    msg = fr
      ? 'Bonjour ' + nom + ',\nBonne nouvelle ! Le règlement de votre dossier sinistre N° ' + dos + (mnt ? ' (' + mnt + ' DH)' : '') + ' est disponible à l\'agence.\nMerci de passer munie(e) de votre CIN pour le récupérer.'
      : 'السلام عليكم ' + nom + '،\nنبشركم بأن شيك / تسوية التعويض الخاص بملف الحادثة رقم ' + dos + (mnt ? ' (' + mnt + ' درهم)' : '') + ' جاهز بالوكالة.\nمرجو الحضور مصحوبين ببطاقة التعريف الوطنية لاستلامه. شكراً لثقتكم.';
  }
  if (typeof WA !== 'undefined' && WA.open) {
    WA.open(tel, msg, {
      title: nom + ' — ' + lbl,
      onYes: function () {
        var n = { t: '💬 WhatsApp: ' + lbl, by: App.user.name, at: new Date().toISOString() };
        Sin.col().doc(e.id).update({ notes: FB.FV.arrayUnion(n), upd: n.at, updBy: App.user.name }).then(function () {
          r.notes = (r.notes || []).concat([n]);
          toast('✅ ' + L('سُجّل الإشعار في ملاحظات الملف', 'Notification enregistrée dans le dossier'));
        }).catch(function () { });
      }
    });
  }
});

/* ───────── 📋 لائحة التصريحات: CAT · Assuré · Date sinistre · N° de dossier · Téléphone ─────────
   كاع الحوادث من القديمة حتى لآخر واحدة؛ كتتبنى من السجل نفسه → أي حادثة جديدة ولا تعديل كيبان فيها وحدو. */
function sinDeclKey(r) { var k = sinOrdreKey(r); if (k < 9e9) return k; var d = sinOrdreNum(r.dossier); if (d) return (+d.y) * 100000 + d.n; var n = parseInt(r.ordre, 10); return isNaN(n) ? 9e9 : n; }
function sinDeclRows() {
  return Sin.rows.slice().sort(function (a, b) { return sinDeclKey(a) - sinDeclKey(b); }).map(function (r) {
    var p = sinPhone(r);
    return { cat: sinTidy(r.cat), assure: sinTidy(r.assure), date: sinTidy(r.dateSin), dossier: sinTidy(r.dossier), tel: p.p1 ? (p.p1 + (p.p2 ? ' / ' + p.p2 : '')) : '' };
  });
}
var SIN_DECL_H = ['CAT', 'Assuré', 'Date sinistre', 'N° de dossier', 'Téléphone'];
App.act('sin-decl', function () {
  var rows = sinDeclRows(), withTel = rows.filter(function (r) { return r.tel; }).length, show = rows.slice(-300);
  Modal.open(Modal.head('📋 ' + L('لائحة التصريحات', 'Liste des déclarations') + ' <small class="muted">(' + rows.length + ')</small>')
    + '<div class="hint">' + L('كاع الحوادث من القديمة حتى لآخر واحدة. أي حادثة كتسجلها ولا كتعدلها كتبان هنا وحدها. الهاتف: ', 'Tous les sinistres, du plus ancien au plus récent. Téléphone : ') + withTel + ' / ' + rows.length + '</div>'
    + '<button class="btn green wide" data-act="sin-decl-xls">📥 Excel (' + rows.length + ')</button>'
    + '<div class="sin-wrap sin-decl-wrap"><table class="sin-reg"><thead><tr>' + SIN_DECL_H.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>'
    + show.map(function (r) { return '<tr><td class="c">' + esc(r.cat) + '</td><td>' + esc(r.assure) + '</td><td class="c">' + esc(r.date) + '</td><td class="c">' + esc(r.dossier) + '</td><td class="c">' + esc(r.tel) + '</td></tr>'; }).join('')
    + '</tbody></table></div>'
    + (rows.length > show.length ? '<div class="hint center">' + L('كيبانو آخر 300 — الملف Excel فيه الكل.', '300 derniers affichés — l\'Excel contient tout.') + '</div>' : ''), 'wide');
  setTimeout(function () { var w = document.querySelector('.sin-decl-wrap'); if (w) w.scrollTop = w.scrollHeight; }, 50);
});
App.act('sin-decl-xls', function () {
  var rows = sinDeclRows(), aoa = [SIN_DECL_H].concat(rows.map(function (r) { return [r.cat, r.assure, r.date, r.dossier, r.tel]; }));
  var ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 14 }, { wch: 16 }, { wch: 26 }];
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Déclarations');
  XLSX.writeFile(wb, 'declarations_sinistres_' + todayISO() + '.xlsx');
});

/* v6.1: خانات زايدة (كتبقى فالبرنامج، ماشي فالسجل الأصلي ولا فالتصدير ديالو) */
var SIN_EXTRA = [['plate', '🚘 Matricule'], ['tel', '📞 Tél. assuré'], ['expert', '🧑‍🔧 Expert'], ['lieu', '📍 Lieu'], ['expBy', '🏢 Expert désigné par']];   // v6.5: expBy = الشركة اللي عينات الخبير (CAT…)
function sinExtraFS(row, o) {
  return '<fieldset class="sin-fs"><legend>' + L('معلومات زايدة (فالبرنامج فقط)', 'Infos complémentaires (appli seulement)') + '</legend><div class="sin-grid">'
    + SIN_EXTRA.map(function (x) { var fp = o.fromPdf && o.fromPdf.indexOf('x-' + x[0]) >= 0;
      return '<label class="f' + (x[0] === 'expert' ? ' w2' : '') + (fp ? ' from-pdf' : '') + '"><span>' + x[1] + '</span><input id="sf-x-' + x[0] + '" dir="ltr" autocomplete="off" value="' + esc(row[x[0]] || '') + '"></label>'; }).join('')
    + '</div></fieldset>';
}

/* ───────── الملف (إضافة / تعديل) + ملاحظات المتابعة ───────── */
var SIN_SECTIONS = [
  { title: "Dossier", keys: ["ordre", "dossier", "cat", "statut", "dateOp", "dateSin", "dateRecep", "police", "assure", "refCie"] },
  { title: "Compagnie adverse", keys: ["advCie", "advPolice", "advSinistre"] },
  { title: "Quittance d'indemnité", keys: ["benef", "quitNum", "quitDate", "quitMontant"] },
  { title: "Règlement", keys: ["regRef", "regMontant", "regDate"] },
  { title: "Compensation et recours", keys: ["compRef", "compDate", "recours"] },
  { title: "Observations", keys: ["obs"] }
];
var SIN_WIDE = { assure: 1, refCie: 1, regRef: 1, obs: 1, compRef: 1 };
function sinBlank() { var o = sinNextOrdre(), r = { statut: 'en_cours' }; SIN_COLS.forEach(function (c) { r[c.k] = ''; });
  r.ordre = o; r.dossier = o; r.cat = 'A'; r.dateOp = sinToday(); r.dateRecep = sinToday(); return r; }
function sinDatalists() {
  var opts = function (k, base) { var seen = {}, out = []; base.concat(Sin.rows.map(function (r) { return sinTidy(r[k]).toUpperCase(); })).forEach(function (v) { if (v && !seen[v] && out.length < 60) { seen[v] = 1; out.push(v); } });
    return out.map(function (v) { return '<option value="' + esc(v) + '">'; }).join(''); };
  return '<datalist id="sdl-cie">' + opts('advCie', SIN_CIES) + '</datalist><datalist id="sdl-benef">' + opts('benef', ['EUR ASSURANCE']) + '</datalist>'
    + '<datalist id="sdl-obs">' + ["PEC", "PEC BDG", "PEC DOMAGE", "REGLEMENT DIRECT WAFA CASH", "REGLEMENT DIRECT CASH PLUS", "COMPENSATION", "SANS SUITE", "PV", "RESPONSABLE"].map(function (v) { return '<option value="' + v + '">'; }).join('') + '</datalist>'
    + '<datalist id="sdl-cat"><option value="A"><option value="C"><option value="E"><option value="CAT"></datalist>';
}
var SIN_LISTS = { cat: 'sdl-cat', advCie: 'sdl-cie', obs: 'sdl-obs', benef: 'sdl-benef' };
function sinOpen(row, o) {
  if (!row) return; o = o || {};
  Sin.editing = { id: o.isNew ? null : row.id, isNew: !!o.isNew, touched: {} };
  var notes = (row.notes || []).slice().reverse();
  Modal.open(Modal.head(o.isNew ? '🚗 ' + L('ملف جديد — ', 'Nouveau dossier — ') + esc(row.ordre) : '🚗 ' + esc(row.ordre || '') + ' — ' + esc(row.assure || ''))
    + (o.note ? '<div class="box sm">' + esc(o.note) + '</div>' : '')
    + (!o.isNew ? sinPhoneBox(row) : '')
    + sinDatalists()
    + SIN_SECTIONS.map(function (s) { return '<fieldset class="sin-fs"><legend>' + esc(s.title) + '</legend><div class="sin-grid">' + s.keys.map(function (k) {
        if (k === 'statut') return '<label class="f"><span>Statut</span><select id="sf-statut" class="inp">' + SIN_STATUTS.map(function (x) { return '<option value="' + x.k + '"' + ((row.statut || 'en_cours') === x.k ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></label>';
        var c = SIN_COL[k], fromPdf = o.fromPdf && o.fromPdf.indexOf(k) >= 0;
        return '<label class="f' + (SIN_WIDE[k] ? ' w2' : '') + (fromPdf ? ' from-pdf' : '') + '"><span>' + esc(c.label) + '</span><input id="sf-' + k + '" dir="ltr" autocomplete="off" value="' + esc(row[k] || '') + '"'
          + (c.type === 'date' ? ' placeholder="jj/mm/aaaa" inputmode="numeric" data-inp="sin-date"' : c.type === 'amount' ? ' inputmode="decimal"' : '')
          + (SIN_LISTS[k] ? ' list="' + SIN_LISTS[k] + '"' : '') + (k === 'ordre' || k === 'refCie' ? ' data-inp="sin-mirror" data-k="' + k + '"' : '') + (k === 'dossier' || k === 'advSinistre' ? ' data-inp="sin-touch" data-k="' + k + '"' : '') + '></label>'; }).join('') + '</div></fieldset>'; }).join('')
    + sinExtraFS(row, o)
    + (!o.isNew && typeof sinMailBtn === 'function' ? sinMailBtn(row) : '')
    + '<button class="btn pri wide" data-act="sin-save">💾 ' + L('حفظ', 'Enregistrer') + '</button>'
    + (o.isNew ? '' : '<div class="sin-notes"><div class="sec-t">📝 ' + L('ملاحظات المتابعة (داخل البرنامج فقط)', 'Notes de suivi (dans l\'appli seulement)') + '</div>'
        + '<textarea id="sin-note" rows="2" placeholder="' + L('فين وصل الملف؟ مثلاً: عيطت للخبير، الجواب السيمانة الجاية', 'Où en est le dossier ?') + '"></textarea>'
        + '<button class="btn wide" data-act="sin-note-add">➕ ' + L('إضافة ملاحظة', 'Ajouter la note') + '</button>'
        + (notes.length ? notes.map(function (n) { return '<div class="sin-note"><small>' + esc(fmtDT(n.at)) + ' · ' + esc(n.by || '') + '</small><div>' + esc(n.t) + '</div></div>'; }).join('') : '<div class="hint">' + L('لا ملاحظات بعد.', 'Aucune note.') + '</div>')
        + (row.upd ? '<div class="hint">' + L('آخر تعديل: ', 'Modifié : ') + esc(fmtDT(row.upd)) + (row.updBy ? ' · ' + esc(row.updBy) : '') + '</div>' : '') + '</div>')
    + (!o.isNew && App.user.admin ? '<button class="btn danger wide" data-act="sin-del">🗑️ ' + L('حذف الملف', 'Supprimer le dossier') + '</button>' : ''), 'wide');
  if (o.isNew && o.fromPdf) { var first = ['assure', 'advCie'].filter(function (k) { return !row[k]; })[0]; if (first) setTimeout(function () { var e = $('sf-' + first); if (e) e.focus(); }, 60); }
}
App.input('sin-date', function (el) { var v = sinTidyDate(el.value); if (/^\d{2}\/\d{2}\/\d{4}$/.test(v) || v.length >= 8) { if (v !== el.value && /^\d{2}\/\d{2}\/\d{4}$/.test(v)) el.value = v; } el.parentNode.classList.toggle('bad', !!el.value && el.value.length >= 8 && !sinIsDate(sinTidyDate(el.value))); });
/* عادات السجل: N° dossier = N° d'ordre، N° sinistre adverse = référence compagnie (للملف الجديد) */
App.input('sin-mirror', function (el) { var e = Sin.editing; if (!e || !e.isNew) return; var to = el.dataset.k === 'ordre' ? 'dossier' : 'advSinistre'; if (!e.touched[to]) { var t = $('sf-' + to); if (t) t.value = el.value; } });
App.input('sin-touch', function (el) { if (Sin.editing) Sin.editing.touched[el.dataset.k] = true; });
App.act('sin-open', function (el) { var r = Sin.rows.filter(function (x) { return x.id === el.dataset.id; })[0]; if (r) sinOpen(r); });
App.act('sin-new', function () { sinOpen(sinBlank(), { isNew: true }); });
App.act('sin-save', function () {
  var e = Sin.editing; if (!e) return; var data = {};
  SIN_COLS.forEach(function (c) { var el = $('sf-' + c.k), v = sinTidy(el ? el.value : ''); if (c.type === 'date') v = sinTidyDate(v); if (c.type === 'amount' && !isNaN(sinAmount(v))) v = String(sinAmount(v)); data[c.k] = v; });
  data.statut = $('sf-statut').value;
  SIN_EXTRA.forEach(function (x) { var el = $('sf-x-' + x[0]); if (el) data[x[0]] = sinTidy(el.value); });
  if (!data.ordre && !data.assure) { toast(L('أدخل على الأقل رقم الترتيب أو اسم المؤمَّن.', 'Saisissez au moins le N° d\'ordre ou l\'assuré.'), 'err'); return; }
  var twin = data.ordre && Sin.rows.filter(function (r) { return r.id !== e.id && sinTidy(r.ordre) === data.ordre; })[0];
  if (twin && !confirm(L('رقم الترتيب ' + data.ordre + ' مستعمل مسبقاً (' + (twin.assure || '') + '). حفظ مع ذلك؟', 'N° ' + data.ordre + ' déjà utilisé. Enregistrer quand même ?'))) return;
  Modal.close(); Sin.editing = null;
  sinSave(e.id, data, e.isNew).then(function () { toast('💾 ' + L('حُفظ الملف ', 'Dossier enregistré ') + data.ordre); }).catch(syncErr);
});
App.act('sin-note-add', function () {
  var e = Sin.editing, t = ($('sin-note') || {}).value; t = sinTidy(t); if (!e || !e.id || !t) return;
  var n = { t: t, by: App.user.name, at: new Date().toISOString() };
  Sin.col().doc(e.id).update({ notes: FB.FV.arrayUnion(n), upd: n.at, updBy: App.user.name }).then(function () {
    toast('📝 ' + L('أُضيفت الملاحظة', 'Note ajoutée'));
    var r = Sin.rows.filter(function (x) { return x.id === e.id; })[0]; if (r) { r.notes = (r.notes || []).concat([n]); sinOpen(r); }
  }).catch(syncErr);
});
App.act('sin-del', function () {
  var e = Sin.editing; if (!e || !e.id || !App.user.admin) return; var r = Sin.rows.filter(function (x) { return x.id === e.id; })[0];
  if (!confirm(L('حذف الملف ' + (r ? r.ordre : '') + ' نهائياً من السجل؟', 'Supprimer définitivement ce dossier ?'))) return;
  Modal.close(); Sin.editing = null; Sin.col().doc(e.id).delete().catch(syncErr);
});

/* ───────── قراءة تصريح PDF (من الأصل) ───────── */
var SIN_LABELS = [
  [/^reference sinistre$/, "ref"], [/^n[°ºo]?\s*police$/, "police"], [/^immatriculation$/, "immat"],
  [/^nom assure$/, "assure"], [/^telephone( assure)?$/, "tel"], [/^date sinistre$/, "dateSin"],
  [/^lieu du sinistre$/, "lieu"], [/^heure du sinistre$/, "heure"], [/^type sinistre$/, "type"],
  [/^assure blesse$/, "x1"], [/^tiers blesse$/, "x2"], [/^type declaration$/, "x3"], [/^nom expert$/, "expert"],
  [/^demande pec garage( agree)?$/, "x4"], [/^nom du garage$/, "garage"], [/^garanties?$/, "garanties"],
  [/^circonstances de l'accident$/, "circ"], [/^vehicule du tiers$/, "TIERS"], [/^nom du tiers$/, "tiers"],
  [/^compagnie$/, "advCie"], [/^fait a$/, "x5"], [/^le$/, "dateDecl"], [/^signature de l'assure$/, "x6"],
  [/^je soussigne\b.*/, "x7"]
];
function sinNormCie(s) {
  var up = sinFold(s).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!up) return '';
  if (/ATLANTA/.test(up)) return 'ATLANTA';
  if (/TRANSPORT/.test(up)) return 'CAT';
  if (/MUTUELLE AGRICOLE/.test(up)) return 'MAMDA';
  if (/\bR M A\b/.test(up)) return 'RMA';
  var hit = ['WAFA', 'SANLAM', 'SAHAM', 'RMA', 'MATU', 'AXA', 'ALLIANZ', 'SANAD', 'MCMA', 'MAMDA', 'CAT'].filter(function (k) { return new RegExp('\\b' + k + '\\b').test(up); })[0];
  return hit || up.replace(/\b(COMPAGNIE|ASSURANCES?|MAROC|D|DE|LA)\b/g, ' ').replace(/\s+/g, ' ').trim() || up;
}
function sinParseDeclaration(items) {
  var toks = items.map(sinTidy).filter(function (t) { return t && !/^:+$/.test(t); });
  var out = {}, cur = null, tiers = false;
  toks.forEach(function (t) {
    var m = /^(.*?)\s*:\s*(.*)$/.exec(t), head = sinFold(m ? m[1] : t).replace(/\s+/g, ' ').trim();
    var lab = SIN_LABELS.filter(function (l) { return l[0].test(head); })[0];
    if (lab) {
      if (lab[1] === 'TIERS') { tiers = true; cur = null; return; }
      cur = lab[1];
      if (tiers && cur === 'police') cur = 'advPolice';
      if (tiers && cur === 'immat') cur = 'advImmat';
      if (!(cur in out)) out[cur] = []; else { cur = 'dup_' + cur; out[cur] = []; }
      if (m && m[2]) out[cur].push(m[2]);
      return;
    }
    if (cur) out[cur].push(t);
  });
  var get = function (k) { return sinTidy((out[k] || []).join(' ')); }, all = toks.join('\n');
  var dmy = function (s) { var x = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/.exec(s); return x ? x[1] + '/' + x[2] + '/' + x[3] : ''; };
  var garanties = sinFold(get('garanties')), advCie = sinNormCie(get('advCie'));
  if (!advCie && !get('tiers')) { if (/bris/.test(garanties)) advCie = 'BDG'; else if (/dommage|collision|tierce/.test(garanties)) advCie = 'DOMAGE'; }
  var ref = (get('ref').match(/[\dA-Z]+(?:\s*\/\s*[\dA-Z]+)+/i) || all.match(/\b\d{1,2}\/20\d{2}\/\d{3,8}\b/) || [''])[0].replace(/\s/g, '');
  return { refCie: ref, police: (get('police').match(/[\dA-Z][\dA-Z\/\-. ]*/i) || [''])[0].trim(), assure: get('assure').replace(/\s*\bT[ée]l[ée]phone\b.*$/i, '').toUpperCase(),
    dateSin: dmy(get('dateSin')), dateRecep: dmy(get('dateDecl')), advCie: advCie, advPolice: get('advPolice'), tiers: get('tiers'),
    /* v6.1: الماتريكول، الهاتف، الخبير، المكان (كيتحفظو فالملف، ماشي فالسجل الأصلي) */
    plate: (get('immat').match(/[0-9]{1,6}\s*[-\/ ]\s*[A-Z\u0600-\u06FF]{1,3}\s*[-\/ ]\s*[0-9]{1,3}|[A-Z]{1,3}\s*[0-9]{3,7}|[0-9]{3,7}\s*[A-Z]{1,3}/i) || [get('immat')])[0].replace(/\s+/g, '').toUpperCase(),
    tel: (get('tel').replace(/[^\d+ ]/g, ' ').match(/(?:\+?212|0)\s*[5-7](?:\s*\d){8}/) || [''])[0].replace(/\s+/g, ''),
    expert: get('expert').replace(/\s*\.\s*$/, ''), lieu: get('lieu'), advImmat: get('advImmat') };
}
function sinReadPdf(file) {
  return sinPdfJS().then(function () { return file.arrayBuffer(); }).then(function (buf) { return window.pdfjsLib.getDocument({ data: buf }).promise; })
    .then(function (pdf) { var items = [], chain = Promise.resolve();
      for (var p = 1; p <= pdf.numPages; p++) (function (p) { chain = chain.then(function () { return pdf.getPage(p); }).then(function (pg) { return pg.getTextContent(); }).then(function (c) { c.items.forEach(function (i) { items.push(i.str); }); }); })(p);
      return chain.then(function () { return items; }); });
}
var sinDigits = function (s) { return String(s || '').replace(/\D/g, ''); };
App.input('sin-pdf', function (el) {
  var file = el.files && el.files[0]; if (!file) return;
  toast(L('⏳ جارٍ قراءة التصريح…', '⏳ Lecture de la déclaration…'));
  sinReadPdf(file).then(function (items) {
    if (items.join('').trim().length < 30) { toast(L('لا يوجد نص قابل للقراءة (نسخة ممسوحة). استعمل «ملف جديد».', 'PDF scanné sans texte : utilisez « Nouveau dossier ».'), 'err'); return; }
    var d = sinParseDeclaration(items);
    if (!d.refCie && !d.police && !d.assure) { toast(L('لم يُعثر على بيانات التصريح في هذا الملف.', 'Données de déclaration introuvables.'), 'err'); return; }
    var twin = d.refCie && Sin.rows.filter(function (r) { return sinDigits(r.refCie) === sinDigits(d.refCie); })[0];
    if (twin) { sinOpen(twin, { note: L('التصريح ' + d.refCie + ' موجود مسبقاً تحت الرقم ' + twin.ordre + '. لم يُنشأ ملف جديد.', 'Déclaration déjà enregistrée sous ' + twin.ordre + '.') }); return; }
    var row = sinBlank(), filled = [], put = function (k, v) { if (v) { row[k] = v; filled.push(k); } };
    put('refCie', d.refCie); put('advSinistre', d.refCie); put('police', d.police); put('assure', d.assure); put('dateSin', d.dateSin);
    put('advCie', d.advCie); put('advPolice', d.advPolice); if (d.dateRecep) put('dateRecep', d.dateRecep);
    ['plate', 'tel', 'expert', 'lieu'].forEach(function (k) { if (d[k]) { row[k] = d[k]; filled.push('x-' + k); } });
    sinOpen(row, { isNew: true, fromPdf: filled, note: L('بيانات مقروءة من ', 'Données lues depuis ') + file.name + (d.tiers ? ' — ' + L('الطرف الآخر: ', 'tiers : ') + d.tiers : '') + L('. راجعها ثم اضغط «حفظ».', '. Vérifiez puis enregistrez.') });
  }).catch(function (err) { console.error(err); toast(L('تعذّرت قراءة الملف: ', 'Lecture impossible : ') + (err && err.message || err), 'err'); });
});

/* ───────── Excel: استيراد (من الأصل) ───────── */
function sinUtcDMY(d) { return pad2(d.getUTCDate()) + '/' + pad2(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); }
function sinCellText(v, type, flag) {
  if (v == null) return '';
  if (v instanceof Date) { if (isNaN(v)) { flag.bad = true; return ''; } var serial = v.getTime() / 86400000 + 25569;
    if (type === 'amount' && serial < 20000) return String(Math.round(serial * 100) / 100); return sinUtcDMY(v); }
  if (typeof v === 'number') { if (type === 'date' && v > 20000 && v < 80000) return sinUtcDMY(new Date(Math.round((v - 25569) * 86400000)));
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100); }
  if (typeof v === 'object') { if (Array.isArray(v.richText)) return sinTidy(v.richText.map(function (t) { return t.text; }).join(''));
    if ('result' in v) return sinCellText(v.result, type, flag); if ('text' in v) return sinTidy(v.text); return ''; }
  return type === 'date' ? sinTidyDate(v) : sinTidy(v);
}
function sinFillToStatut(cellObj, obs) {
  var f = cellObj.fill, argb = (f && f.type === 'pattern' && f.pattern !== 'none' && f.fgColor && f.fgColor.argb) || '', rgb = argb.slice(-6).toUpperCase();
  if (rgb === 'FFFF00') return 'pec'; if (rgb === '92D050' || rgb === '00B050') return 'regle'; if (rgb === 'FFC000') return 'resp';
  return /SAN[ST]\s*SUIT/i.test(obs) ? 'sans_suite' : 'en_cours';
}
function sinReadWorkbook(buf) {
  return sinExcelJS().then(function () { var wb = new ExcelJS.Workbook(); return wb.xlsx.load(buf).then(function () { return wb; }); }).then(function (wb) {
    var ws = wb.worksheets[0]; if (!ws) throw new Error('ملف فارغ');
    var start = 6;
    for (var r = 1; r <= 15; r++) { if (/num[ée]ro\s+d.ordre/i.test(sinCellText(ws.getCell(r, 1).value, 'text', {}))) { start = r + 2; break; } }
    var rows = [];
    for (var n = start; n <= ws.rowCount; n++) {
      var xr = ws.getRow(n); if (!xr.hasValues) continue;
      var row = {}, bad = {};
      SIN_COLS.forEach(function (c, i) { var flag = {}; row[c.k] = sinCellText(xr.getCell(i + 1).value, c.type, flag); if (flag.bad) bad[c.k] = true; });
      if (bad.refCie && row.advSinistre) row.refCie = row.advSinistre;
      if (!row.ordre && !row.assure && !row.police) continue;
      row.statut = sinFillToStatut(xr.getCell(1), row.obs);
      rows.push(row);
    }
    return rows;
  });
}
/* الاستيراد يدمج بالرقم الترتيبي: الموجود يُحدَّث (وتبقى ملاحظاته)، الجديد يُضاف، ولا يُحذف شيء */
App.input('sin-xls', function (el) {
  var file = el.files && el.files[0]; if (!file || !App.canUp()) return;
  toast(L('⏳ جارٍ قراءة ملف Excel…', '⏳ Lecture de l\'Excel…'));
  file.arrayBuffer().then(sinReadWorkbook).then(function (rows) {
    if (!rows.length) { toast(L('لم يُعثر على أي ملف. تأكد أنه سجل الحوادث بنفس الأعمدة.', 'Aucun dossier trouvé.'), 'err'); return; }
    var byOrdre = {}; Sin.rows.forEach(function (r) { if (r.ordre) byOrdre[sinTidy(r.ordre)] = r; });
    var upd = 0, add = 0, same = 0, ops = [], now = new Date().toISOString();
    rows.forEach(function (r) {
      var ex = byOrdre[sinTidy(r.ordre)], data = sinClean(r);
      if (ex) { var ch = SIN_COLS.some(function (c) { return (ex[c.k] || '') !== data[c.k]; }) || (ex.statut || 'en_cours') !== data.statut;
        if (!ch) { same++; return; } data.upd = now; data.updBy = App.user.name; ops.push({ ref: Sin.col().doc(ex.id), upd: data }); upd++; }
      else { data.created = now; data.by = App.user.name; data.upd = now; ops.push({ ref: Sin.col().doc(), data: data }); add++; }
    });
    if (!ops.length) { toast(L('لا جديد: كل الملفات مطابقة.', 'Rien de nouveau.')); return; }
    if (!confirm(L('«' + file.name + '»: ' + rows.length + ' ملف — جديد: ' + add + ' · تحديث: ' + upd + ' · بلا تغيير: ' + same + '. الملاحظات تبقى ولا يُحذف شيء. متابعة؟',
      file.name + ' : ' + rows.length + ' dossiers — nouveaux ' + add + ' · mis à jour ' + upd + ' · inchangés ' + same + '. Continuer ?'))) return;
    FB.batches(ops).then(function () { toast('✅ ' + L('استيراد: جديد ', 'Import : nouveaux ') + add + ' · ' + L('تحديث ', 'mis à jour ') + upd); }).catch(syncErr);
  }).catch(function (err) { console.error(err); toast(L('تعذّرت قراءة ملف Excel: ', 'Lecture Excel impossible : ') + (err && err.message || err), 'err'); });
});

/* ───────── Excel: تصدير (نفس شكل السجل الورقي — بلا الملاحظات) ───────── */
var SIN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVW'.split('');
function sinBuildWorkbook(rows) {
  var wb = new ExcelJS.Workbook(); wb.creator = 'Registre des sinistres';
  var ws = wb.addWorksheet('Feuil1', { views: [{ state: 'frozen', xSplit: 1, ySplit: 5 }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.pageSetup.printTitlesRow = '4:5';
  SIN_COLS.forEach(function (c, i) { ws.getColumn(i + 1).width = c.w; });
  var font = { name: 'Calibri', size: 14, bold: true }, side = function (s) { return { style: s, color: { argb: 'FF000000' } }; },
      box = function (s) { return { top: side(s), bottom: side(s), left: side(s), right: side(s) }; };
  ws.mergeCells('A1:W2');
  Object.assign(ws.getCell('A1'), { value: 'R  E  G  I  S  T  R  E          D  E  S          S  I  N  I  S  T  R  E  S', font: { name: 'Calibri', size: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' } });
  var HEAD = { A: "Numéro d'ordre", B: "Date de l'opération", C: "Date du sinistre ou de la demande de prestation", D: "Date de réception de la déclaration du sinistre ou de la demande de prestation",
    E: "CAT", F: "Police", I: "Référence de la compagnie", M: "Bénéficiaire", V: "Montant des recours", W: "Observations" };
  Object.keys(HEAD).forEach(function (c) { ws.mergeCells(c + '4:' + c + '5'); ws.getCell(c + '4').value = HEAD[c]; });
  [['G4:H4', 'Assuré'], ['J4:L4', 'Compagnie adverse'], ['N4:P4', "Quittance d'indemnité"], ['Q4:S4', 'Référence du règlement'], ['T4:U4', 'Compensation']]
    .forEach(function (x) { ws.mergeCells(x[0]); ws.getCell(x[0].split(':')[0]).value = x[1]; });
  var SUB = { G: 'Nom / Raison sociale', H: 'N° dossier', J: 'Raison social', K: 'N° Police', L: 'N° Sinistre', N: 'N° Quittance', O: 'Date de réception', P: 'Montant',
    Q: 'Référence du moyen de paiement', R: 'Montant', S: 'Date', T: 'Référence situation de règlement', U: 'Date' };
  Object.keys(SUB).forEach(function (c) { ws.getCell(c + '5').value = SUB[c]; });
  ws.getRow(4).height = 37.5; ws.getRow(5).height = 50.25;
  for (var r = 4; r <= 5; r++) for (var c = 1; c <= SIN_COLS.length; c++) { var x = ws.getCell(r, c); x.font = font; x.border = box('medium'); x.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; }
  rows.forEach(function (row, i) {
    var xr = ws.getRow(6 + i), st = SIN_STAT[row.statut] || SIN_STAT.en_cours;
    SIN_COLS.forEach(function (c, j) {
      var x = xr.getCell(j + 1), v = row[c.k] || '';
      x.font = font; x.border = box('thin');
      if (st.xl) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.xl } };
      if (c.type === 'date' || c.k === 'ordre' || c.k === 'cat' || c.k === 'dossier') x.alignment = { horizontal: 'center' };
      if (!v) return;
      var dm = c.type === 'date' && sinIsDate(v) ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v) : null;
      if (dm) { x.value = new Date(Date.UTC(+dm[3], +dm[2] - 1, +dm[1])); x.numFmt = 'dd/mm/yyyy'; }
      else if (c.type === 'amount' && !isNaN(sinAmount(v))) { x.value = sinAmount(v); x.numFmt = '#,##0.00'; }
      else if (c.type === 'id' && /^[1-9]\d{0,14}$/.test(v) && c.k !== 'regRef') { x.value = Number(v); x.numFmt = '0'; }
      else x.value = v;
    });
  });
  return wb;
}
App.act('sin-export', function () {
  if (!Sin.rows.length) return; toast(L('⏳ جارٍ إنشاء ملف Excel…', '⏳ Création de l\'Excel…'));
  sinExcelJS().then(function () { return sinBuildWorkbook(Sin.rows).xlsx.writeBuffer(); }).then(function (buf) {
    var d = new Date(), name = 'Registre_des_sinistres_' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '.xlsx';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast('📥 ' + name);
  }).catch(function (err) { console.error(err); toast(L('تعذّر إنشاء ملف Excel: ', 'Excel impossible : ') + (err && err.message || err), 'err'); });
});

/* ───────── الإشعار كل يومين: الملفات المفتوحة حسب العمر ───────── */
var SIN_NOTI = 'rp4_sin_noti';
function sinTick() {
  if (!App.user || !Sin.ready || !App.can('sin') || typeof notify !== 'function') return;
  var now = new Date(); if (now.getHours() < 8) return;
  var last = ''; try { last = localStorage.getItem(SIN_NOTI) || ''; } catch (e) { }
  if (last && (Date.now() - new Date(last + 'T00:00:00').getTime()) < 2 * 86400000 - 3600000) return;
  try { localStorage.setItem(SIN_NOTI, todayISO()); } catch (e) { }
  var c = sinAgeCounts(), tot = c.m1 + c.m3 + c.old + c.nd; if (!tot) return;
  notify('🚗 ' + L('الحوادث المفتوحة: ', 'Sinistres ouverts : ') + tot,
    L('أقل من شهر ', '< 1 mois ') + c.m1 + ' · ' + L('شهر إلى 3 أشهر ', '1–3 mois ') + c.m3 + ' · ' + L('أكثر من 3 أشهر ', '> 3 mois ') + c.old,
    'sin-sum', function () { Sin.age = 'old'; Sin.statut = 'all'; App.go('sin'); });
}
setInterval(sinTick, 60000);
App.on('login', function () { setTimeout(sinTick, 8000); });

/* ───────── بطاقة الزبون: الحادثة (بالبوليصة) لمن له الصلاحية ───────── */
function sinOfContact(c) {
  var k = kPolTail(polFull(c)); if (!k || !Sin.rows.length) return [];
  return Sin.rows.filter(function (r) { return kPolTail(r.police) === k; });
}
App.hook('contact.blocks', function (c) {
  if (!App.can('sin') || Meta.get('sinCard', true) === false) return '';
  var list = sinOfContact(c); if (!list.length) return '';
  var open = list.filter(function (r) { return SIN_OPEN[r.statut || 'en_cours']; });
  return '<div class="dbox sin-box">🚗 <b>' + (open.length ? L('ملف حادثة مفتوح', 'Sinistre ouvert') : L('حوادث سابقة', 'Sinistres passés')) + '</b> · '
    + list.slice(-3).map(function (r) { var st = SIN_STAT[r.statut || 'en_cours']; return '<a href="#" data-act="sin-go" data-id="' + esc(r.id) + '">' + esc(r.ordre) + ' <i class="sin-dot" style="background:' + st.css + '"></i>' + esc(st.label) + '</a>'; }).join(' · ')
    + (list.length > 3 ? ' · +' + (list.length - 3) : '') + '</div>';
});
App.act('sin-go', function (el) { var r = Sin.rows.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!r) return; if (typeof Sheet !== 'undefined' && Sheet.isOpen()) Sheet.close(); App.go('sin'); sinOpen(r); });
App.hook('settings.blocks', function () {
  return '<div class="card"><div class="card-t">🚗 ' + L('الحوادث', 'Sinistres') + '</div><label class="chk"><input type="checkbox" data-inp="sin-card"' + (Meta.get('sinCard', true) === false ? '' : ' checked') + '><span>'
    + L('إظهار الحادثة في بطاقة الزبون (لمن له صلاحية الحوادث)', 'Afficher les sinistres dans la fiche client (agents autorisés)') + '</span></label></div>';
});
App.input('sin-card', function (el) { if (App.user.admin) Meta.save({ sinCard: el.checked }); });

App.hook('dash.cards', function () { if (!Sin.ready || !App.can('sin') || !Sin.rows.length) return [];
  var c = sinAgeCounts(); return [{ ic: '🚗', label: L('حوادث مفتوحة', 'Sinistres ouverts'), value: c.m1 + c.m3 + c.old + c.nd, cls: c.old ? 'amber' : '', go: 'sin', mod: 'sin',
    sub: L('أكثر من 3 أشهر: ', '> 3 mois : ') + c.old }]; });
if (typeof DROP_TARGETS !== 'undefined') DROP_TARGETS.sin = { inp: 'sin-pdf', ext: /\.pdf$/i, label: ['تصريح حادثة PDF', 'Déclaration de sinistre PDF'] };

App.register({ id: 'sin', perm: 'sin', icon: '🚗', title: ['الحوادث', 'Sinistres'], order: 22, render: renderSin });
