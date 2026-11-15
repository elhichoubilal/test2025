/* ══════════════════════════════════════════════════════════
   RenewPro v6.3 — mod-bank.js   (🏦 البنك: كشوفات الحسابات والملاحظات)
   • كل حساب بوحدو (011، 029…): كيتعرف من «Relevé du compte …» فالملف.
   • تحميل كشف جديد: كيزيد غير العمليات الجديدة (بلا تكرار). الملاحظات اللي فالملف (عمود «Solde (MAD)») كتدخل معاه.
   • الملاحظات كتتعمر وحدها غير فاللي متأكدين منو (لون آخر 🤖، كتقدر تبدلها ولا تأكدها ✓):
       1) مصاريف البنك → «Frais bancaire».
       2) التعلّم: نفس العملية (نفس المستفيد/نفس الشيكات/نفس النوع) اللي كتبتي ليها ملاحظة قبل.
          الشهر فالملاحظة كيتحسب (الأجرة: من 20 فالشهر = نفس الشهر، وإلا الشهر اللي قبل).
       3) جدول الخزينة: مبلغ WAFA auto / WAFA R.D. / CAT مطابق بالضبط وواحد فقط.
     ما كيتعمرش: الـ JC ديال إيداعات الصندوق، الـ facturettes، الشيكات بلا سمية، وأي حاجة جديدة ما عمرك كتبتيها.
   • 🔔 الخانات الخاوية: رقم فالقائمة، بطاقة فالرئيسية، وتذكير واحد فالنهار إلا كانت خاوية من أكثر من 7 أيام.
   • الصلاحية «🏦 البنك» خاصها تتعطى صراحة (حتى الموظف القديم ما كيشوفوش). Firestore: مجموعة bank مسدودة على الآخرين.
   • الملفات ديال البنك ما كتمشيش لـ 🗂️ الملفات المحمّلة (حساسة).
══════════════════════════════════════════════════════════ */
'use strict';

var Bank = { rows: [], byId: {}, accs: {}, treso: null, ready: false, denied: false, unsub: null, acc: Local.get('bk_acc', ''), f: Local.get('bk_f', 'empty'),
  q: '', month: '', limit: 200, dirty: false, busy: false };
var BK_MONTHS = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'];

/* الصلاحية: المدير، ولا موظف عندو «bank» صراحة */
function bankCan() {
  if (!App.user) return false; if (App.user.admin) return true;
  var u = (typeof Users !== 'undefined' && Users.map) ? Users.map[uKey(App.user.email)] : null;
  return !!(u && u.perms && u.perms.bank);
}
Bank.col = function () { return FB.db.collection('bank'); };
Bank.start = function () {
  if (Bank.unsub || !FB.db || !bankCan()) return;
  Bank.unsub = Bank.col().onSnapshot(function (snap) {
    var a = [], by = {}, accs = {}, t = null;
    snap.forEach(function (d) { var x = d.data() || {}; x.id = d.id;
      if (d.id === '_treso') t = x; else if (d.id.indexOf('_acc_') === 0) accs[x.acc] = x; else if (x.acc) { a.push(x); by[x.id] = x; } });
    a.sort(bkCmp); Bank.rows = a; Bank.byId = by; Bank.accs = accs; Bank.treso = t; Bank.ready = true; Bank.denied = false;
    if (!Bank.acc || !bkAccList().some(function (x) { return x === Bank.acc; })) Bank.acc = bkAccList()[0] || '';
    App.refresh();
  }, function (e) { console.warn('bank', e); Bank.denied = true; Bank.ready = true; App.refresh(); });
};
Bank.stop = function () { if (Bank.unsub) { try { Bank.unsub(); } catch (e) { } } Bank.unsub = null; Bank.rows = []; Bank.byId = {}; Bank.accs = {}; Bank.treso = null; Bank.ready = false; };
App.on('login', function () { setTimeout(Bank.start, 900); });
App.on('refresh', function () { if (!Bank.unsub && App.user && bankCan()) Bank.start(); else if (Bank.unsub && App.user && !bankCan()) Bank.stop(); });
App.on('logout', Bank.stop);
App.on('go.bank', function (f) { if (f) { Bank.f = f; Local.set('bk_f', f); } });

/* ───────── أدوات ───────── */
function bkTidy(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function bkFold(s) { return bkTidy(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function bkCmp(a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : ((a.ord || 0) - (b.ord || 0)); }       // الأحدث الأول، وبنفس ترتيب البنك فنفس النهار
function bkAccList() { var s = {}; Bank.rows.forEach(function (r) { s[r.acc] = 1; }); Object.keys(Bank.accs).forEach(function (a) { s[a] = 1; }); return Object.keys(s).sort(); }
function bkAccName(a) { return String(a || '').slice(-3); }
function bkAmt(r) { return (+r.deb || 0) || (+r.cre || 0); }
function bkCents(v) { return Math.round((+v || 0) * 100); }
function bkHas(r) { return !!bkTidy(r.note); }
function bkEmpty(acc) { return Bank.rows.filter(function (r) { return (!acc || r.acc === acc) && !bkHas(r); }); }
function bkOld(list) { var lim = addDays(todayISO(), -7); return list.filter(function (r) { return r.d <= lim; }); }
/* تاريخ: رقم Excel، ولا «jj/mm/aaaa»، ولا Date */
function bkDate(v) {
  if (v instanceof Date && !isNaN(v)) return isoOf(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) { var p = XLSX.SSF.parse_date_code(v); return p ? p.y + '-' + pad2(p.m) + '-' + pad2(p.d) : ''; }
  var m = String(v || '').match(/^\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad2(m[2]) + '-' + pad2(m[1]);
  m = String(v || '').match(/^\s*(\d{4})-(\d{2})-(\d{2})/); return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
}
function bkHash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function bkMonthIdx(iso) { return (+iso.slice(0, 4)) * 12 + (+iso.slice(5, 7) - 1); }

/* ───────── قراءة كشف البنك ───────── */
function bkParseStatement(rows) {
  var acc = '', hi = -1;
  for (var i = 0; i < Math.min(rows.length, 15); i++) {
    var line = rows[i].join(' '), m = line.match(/compte\s+(\d{6,})/i); if (m && !acc) acc = m[1];
    if (hi < 0 && /date\s*op/i.test(String(rows[i][0] || ''))) hi = i;
  }
  if (!acc || hi < 0) return null;
  var out = [], occ = {};
  rows.slice(hi + 1).forEach(function (r, k) {
    var d = bkDate(r[0]), lib = bkTidy(r[2]); if (!d || !lib) return;
    var n7 = r[6], note = (typeof n7 === 'number' || /^[\d\s.,-]+$/.test(String(n7 || ''))) ? '' : bkTidy(n7);   // رقم = رصيد ديال البنك، ماشي ملاحظة
    var o = { acc: acc, d: d, dv: bkDate(r[1]) || d, lib: lib, ref: bkTidy(r[3]), deb: Math.round(num(r[4]) * 100) / 100, cre: Math.round(num(r[5]) * 100) / 100, note: note, ord: k };
    var base = [acc, o.d, o.dv, o.ref, bkCents(o.deb), bkCents(o.cre), bkFold(lib)].join('|'); occ[base] = (occ[base] || 0) + 1;
    o.id = bkAccName(acc) + '_' + bkHash(base + '#' + occ[base]); out.push(o);
  });
  return { acc: acc, rows: out };
}
/* ───────── قراءة جدول الخزينة: غير المبالغ ديال WAFA auto / WAFA R.D. / CAT ───────── */
function bkParseTreso(wb) {
  var items = [], n = 0;
  wb.SheetNames.forEach(function (sn) {
    var rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' }); if (!rows.length) return;
    var labs = rows.map(function (r) { return String(r[0] || ''); });
    if (!labs.some(function (l) { return /CHEQ/i.test(l); }) || !labs.some(function (l) { return /TOTAUX/i.test(l); })) return;
    var base = bkDate(rows[0][0]); if (!base) return;
    var dr = -1; for (var i = 0; i < 4 && i < rows.length; i++) if (rows[i].some(function (c) { return /^(lun|mar|mer|jeu|ven|sa|di)\w*\s+\d{1,2}\s*$/i.test(String(c).trim()); })) { dr = i; break; }
    if (dr < 0) return; n++;
    var y = +base.slice(0, 4), m = +base.slice(5, 7);
    rows.forEach(function (r) {
      var lab = String(r[0] || ''), k = /CHEQ\s*WAFA\s*AUTO/i.test(lab) ? 'WAFA AUTO' : /CHEQ\s*WAFA\s*R\.?\s*D/i.test(lab) ? 'WAFA R.D.' : /CHEQ\s*C\s*A\s*T/i.test(lab) ? 'CAT' : ''; if (!k) return;
      for (var j = 1; j < r.length; j++) { var v = r[j]; if (typeof v !== 'number' || v >= 0) continue;
        var dm = String(rows[dr][j] || '').match(/(\d{1,2})\s*$/), dd = dm ? +dm[1] : 15;
        items.push({ d: isoOf(new Date(y, m - 1, dd)), amt: Math.round(-v * 100) / 100, lab: k }); }
    });
  });
  return n ? { items: items, sheets: n } : null;
}

/* ───────── 🤖 التعبئة: غير اللي متأكدين منو ───────── */
var BK_FEE = /^(COMMISSION|TVA\b|TVA COM|DROIT DE TIMBRE|TAXE SUR VALEUR|INTERETS DEBITEURS|FRAIS\b)/;
var BK_NOLEARN = /FACTURETTES|VERSEMENT EFFECTUE PAR|VOUS-MEME|HORS PLACE|^ENCAISSEMENT EFFET|^ANCIEN SOLDE|COMPTES DEPENSES/;   // COMPTES DEPENSES: الشركة كتخلص بزاف ديال الزبناء بنفس المبلغ
var BK_MONTH_RE = /\b(JANVIER|FEVRIER|FÉVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|AOÛT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE|DÉCEMBRE)\b(\s+20\d\d)?/gi;
function bkParty(lib) {
  var L0 = bkFold(lib), m = L0.match(/EN FAVEUR DE (.+?)(?:\s+REF\b|\s+DU\s+\d|$)/) || L0.match(/RECU DE (.+?)(?:\s+REF\b|\s+LE\s+\d|$)/) || L0.match(/EMIS PAR (.+)$/)
    || (L0.indexOf('VOUS-MEME') < 0 ? L0.match(/VERSEMENT DEPLACE PAR (.+?)(?:\s+[A-Z]{1,2}\d{3,}.*)?$/) : null);
  if (!m) return '';
  var p = m[1].replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(function (w) { return ['MR', 'MME', 'M', 'MLLE', 'MONSIEUR', 'STE', 'SOCIETE'].indexOf(w) < 0; }).join(' ');
  return p.length >= 3 ? p : '';
}
function bkLibNorm(lib) { return bkFold(lib).replace(/\bREF\b.*$/, '').replace(/\d{3,}/g, '#').replace(/[^A-Z0-9# ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function bkSigs(r) {
  var lib = bkFold(r.lib); if (BK_NOLEARN.test(lib) || BK_FEE.test(lib)) return null;
  var dir = r.deb ? 'd' : 'c', c = bkCents(bkAmt(r)), p = bkParty(r.lib), chq = lib.match(/^ENCAISSEMENT CHEQUE N (\d{5,}) TIRE SUR (\w+)/);
  if (chq) return { exact: ['B|' + dir + '|' + chq[2] + '|' + chq[1].slice(0, 5) + '|' + c], loose: [] };   // نفس الكارني (نفس البداية) ونفس المبلغ
  if (/^ENCAISSEMENT CHEQUE/.test(lib)) return null;
  if (p) return { exact: ['A|' + dir + '|' + p + '|' + c], loose: ['D|' + dir + '|' + p] };
  var n = bkLibNorm(r.lib); if (n.length < 6) return null;
  return { exact: ['C|' + dir + '|' + n + '|' + c], loose: ['E|' + dir + '|' + n] };
}
/* الملاحظة كتصلح للتعلم؟ (ماشي JC، ماشي تاريخ، ماشي تفاصيل مبالغ، شهر واحد على الأكثر) */
function bkNoteClean(t) { return bkTidy(String(t || '').replace(/\s*N\s*°\s*\S+/gi, '').replace(/\bMOID\b/gi, 'MOIS')); }
function bkNoteOK(t) {
  if (!t || t.split(' ').length < 2 || /\b(DE|DU|LA|LE|DES|ET|POUR)\s*[+,.]?$/i.test(t) || /^JC\b/i.test(t) || /\d{1,2}\s*\/\s*\d{1,2}/.test(t) || /\d\s*dh\b/i.test(t) || /\(\s*\d/.test(t)) return false;
  return (t.match(BK_MONTH_RE) || []).length <= 1;
}
function bkMonthOf(t) { BK_MONTH_RE.lastIndex = 0; var m = BK_MONTH_RE.exec(t); if (!m) return null; var w = bkFold(m[1]); return { i: BK_MONTHS.indexOf(w), y: m[2] ? +m[2] : null, tok: m[0] }; }
function bkTpl(t) { return t.replace(BK_MONTH_RE, '{M}'); }
var BK_STOP = { DE: 1, DU: 1, LA: 1, LE: 1, LES: 1, DES: 1, D: 1, L: 1, MR: 1, MME: 1, M: 1, AFF: 1, AFFS: 1, REG: 1, SARL: 1, AU: 1, STE: 1, ET: 1, MOIS: 1 };
function bkCore(t) { return bkFold(bkTpl(t)).replace(/[^A-Z0-9{} ]+/g, ' ').split(' ').filter(function (w) { return w && !BK_STOP[w]; }).map(function (w) { return w.length > 3 ? w.replace(/S$/, '') : w; }).sort().join(' '); }   // نفس المعنى: نفس الكلمات
function bkDelta(ex) {                                                     // الفرق بين شهر الملاحظة وشهر العملية
  var mo = bkMonthOf(ex.t); if (!mo) return null;
  var om = bkMonthIdx(ex.r.d), y = mo.y || +ex.r.d.slice(0, 4), v = y * 12 + mo.i;
  if (!mo.y) { while (v - om > 6) v -= 12; while (om - v > 6) v += 12; }
  return v - om;
}
function bkFillMonth(tpl, iso, delta, withYear) {
  var v = bkMonthIdx(iso) + delta, name = BK_MONTHS[((v % 12) + 12) % 12];
  return tpl.replace('{M}', name + (withYear ? ' ' + Math.floor(v / 12) : ''));
}
function bkLearnIndex(rows) {
  var idx = {};
  rows.slice().sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : (b.ord || 0) - (a.ord || 0); }).forEach(function (r) {
    if (r.noteSrc || !bkHas(r)) return; var t = bkNoteClean(r.note); if (!bkNoteOK(t)) return;
    var s = bkSigs(r); if (!s) return;
    s.exact.concat(s.loose).forEach(function (k) { (idx[k] = idx[k] || []).push({ r: r, t: t }); });
  });
  return idx;
}
/* من الأمثلة → ملاحظة للعملية الجديدة، ولا لا شيء إلا كان شك */
function bkFromExamples(r, ex, loose) {
  if (!ex || !ex.length) return '';
  var last = ex[ex.length - 1];
  if (ex.length >= 2 && bkCore(ex[ex.length - 2].t) !== bkCore(last.t)) return '';      // آخر جوج ملاحظات ماشي نفس الشي: شك
  if (loose) {
    if (ex.length < 2) return '';
    var lastN = ex.slice(-3), tp = bkCore(last.t);
    if (lastN.some(function (e) { return bkCore(e.t) !== tp; })) return '';
    var amts = {}; lastN.forEach(function (e) { amts[bkCents(bkAmt(e.r))] = 1; }); if (Object.keys(amts).length < 2) return '';
  }
  var mo = bkMonthOf(last.t); if (!mo) return last.t;
  var tpl = bkTpl(last.t), withYear = !!mo.y;
  if (/^SALAIRE/i.test(last.t)) return bkFillMonth(tpl, r.d, +r.d.slice(8, 10) >= 20 ? 0 : -1, withYear);    // الأجرة: من 20 = نفس الشهر
  var d1 = bkDelta(last); if (d1 === null) return '';
  if (ex.length >= 2) { var prev = ex[ex.length - 2]; if (bkMonthOf(prev.t) && bkDelta(prev) !== d1) return ''; }
  return bkFillMonth(tpl, r.d, d1, withYear);
}
function bkSuggest(r, ctx) {
  var lib = bkFold(r.lib);
  if (BK_FEE.test(lib)) return { t: 'Frais bancaire', src: 'rule' };
  var s = bkSigs(r), t;
  if (s) {
    for (var i = 0; i < s.exact.length; i++) { t = bkFromExamples(r, ctx.idx[s.exact[i]], false); if (t) return { t: t, src: 'learn' }; }
    for (i = 0; i < s.loose.length; i++) { t = bkFromExamples(r, ctx.idx[s.loose[i]], true); if (t) return { t: t, src: 'learn' }; }
  }
  if (r.cre) {
    /* مطابقة ذكية مع الشيكات ودفعات الصندوق */
    try {
      var hist = JSON.parse(localStorage.getItem('eurv102_h') || '[]') || [];
      var crCents = bkCents(r.cre), nearChq = function (dFr) {
        if (!dFr || dFr.length < 10) return false;
        var iso = dFr.slice(6, 10) + '-' + dFr.slice(3, 5) + '-' + dFr.slice(0, 2);
        return Math.abs(daysBetween(iso, r.d)) <= 20;
      };
      var chqMatches = hist.filter(function (h) {
        if (!h || h.unpaid || h.payMode !== 'cheque') return false;
        var cnum = String(h.chequeNum || '').replace(/\D+/g, '');
        if (cnum.length >= 4 && (r.lib + ' ' + r.ref).indexOf(cnum) >= 0) return true;
        return bkCents(h.paid) === crCents && nearChq(h.date);
      });
      if (chqMatches.length === 1) {
        var ch = chqMatches[0];
        return { t: 'CHQ ' + (ch.chequeNum ? 'N°' + ch.chequeNum + ' ' : '') + (ch.client || '').trim(), src: 'caisse', chqNum: ch.num };
      }
    } catch (e) { }
  }
  if (r.deb && ctx.treso && ctx.treso.length) {                            // جدول الخزينة: نفس المبلغ بالضبط، واحد فقط من الجهتين، ±25 يوم
    var c = bkCents(r.deb), near = function (d) { return Math.abs(daysBetween(d, r.d)) <= 25; };
    var tm = ctx.treso.filter(function (x) { return bkCents(x.amt) === c && near(x.d); }), labs = {};
    tm.forEach(function (x) { labs[x.lab] = 1; });
    if (tm.length && Object.keys(labs).length === 1) {
      var same = (ctx.byAmt[c] || []).filter(function (o) { return o.deb && near(o.d); });
      if (same.length === 1) return { t: 'REG ' + tm[0].lab, src: 'treso' };
    }
  }
  return null;
}
function daysBetween(a, b) { return Math.round((parseISO(a) - parseISO(b)) / 86400000); }
/* كيعمر الخاويين فمصفوفة (نسخ) وكيرجع اللي تبدلو */
function bkAutofill(rows) {
  var ctx = { idx: bkLearnIndex(rows), treso: Bank.treso && Bank.treso.items, byAmt: {} }, changed = [];
  rows.forEach(function (o) { if (o.deb) (ctx.byAmt[bkCents(o.deb)] = ctx.byAmt[bkCents(o.deb)] || []).push(o); });
  rows.forEach(function (r) {
    if (bkHas(r) || r.noAuto) return; var s = bkSuggest(r, ctx); if (!s) return;
    r.note = s.t; r.noteSrc = s.src; r.noteBy = 'auto'; r.noteAt = new Date().toISOString(); changed.push(r);
  });
  return changed;
}
function bkClone(r) { var o = {}; for (var k in r) if (Object.prototype.hasOwnProperty.call(r, k)) o[k] = r[k]; return o; }
function bkRowData(r) { var o = {}; ['acc', 'd', 'dv', 'lib', 'ref', 'deb', 'cre', 'ord', 'imp', 'impBy', 'note', 'noteBy', 'noteAt', 'noteSrc', 'noAuto'].forEach(function (k) { if (r[k] !== undefined && r[k] !== '') o[k] = r[k]; }); return o; }

/* ───────── التحميل ───────── */
function bkPick() {
  if (!bankCan()) return;
  var f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xls';      // ماشي فالصفحة: الملف ما كيتسجلش فـ 🗂️ الملفات (حساس)
  f.onchange = function () { if (f.files && f.files[0]) bkImport(f.files[0]); }; f.click();
}
App.act('bk-pick', bkPick);
App.input('bk-file', function (el) { var f = el.files && el.files[0]; if (f) bkImport(f); });          // السحب والإفلات
if (typeof DROP_TARGETS !== 'undefined') DROP_TARGETS.bank = { inp: 'bk-file', ext: /\.(xlsx|xls)$/i, label: ['كشف البنك ولا جدول الخزينة', 'Relevé bancaire ou état de trésorerie'] };

function bkImport(file) {
  if (!bankCan() || Bank.busy) return;
  if (!Bank.ready) { toast(L('تسنى شوية، البيانات كتتشارجا', 'Patientez, chargement…'), 'err'); return; }
  Bank.busy = true; toast('⏳ ' + L('كنقرا ', 'Lecture de ') + file.name);
  file.arrayBuffer().then(function (buf) {
    var wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    var st = bkParseStatement(rows); if (st) return bkImportStatement(st, file.name);
    var tr = bkParseTreso(wb); if (tr) return bkImportTreso(tr, file.name);
    throw new Error(L('ما عرفتش الملف: لا كشف بنك («Relevé du compte …») لا جدول الخزينة', 'Fichier non reconnu : ni relevé bancaire ni état de trésorerie'));
  }).catch(function (e) { console.error(e); toast(String(e && e.message || e), 'err'); }).then(function () { Bank.busy = false; App.refresh(); });
}
function bkImportStatement(st, fname) {
  var now = new Date().toISOString(), me = App.user.name, nNew = 0, nNote = 0, nConf = 0;
  var all = Bank.rows.map(bkClone), map = {}; all.forEach(function (r) { map[r.id] = r; });
  st.rows.forEach(function (o) {
    var ex = map[o.id];
    if (!ex) { var r = { id: o.id, acc: o.acc, d: o.d, dv: o.dv, lib: o.lib, ref: o.ref, deb: o.deb, cre: o.cre, ord: o.ord, imp: now, impBy: me, _new: 1 };
      if (o.note) { r.note = o.note; r.noteBy = 'Excel'; r.noteAt = now; nNote++; } all.push(r); map[o.id] = r; nNew++; return; }
    if (!o.note) return;
    if (!bkHas(ex) || ex.noteSrc) { if (bkFold(ex.note) !== bkFold(o.note)) { ex.note = o.note; ex.noteBy = 'Excel'; ex.noteAt = now; delete ex.noteSrc; ex._chg = 1; nNote++; } }
    else if (bkFold(ex.note) !== bkFold(o.note)) nConf++;                 // ملاحظة فالبرنامج وملاحظة أخرى فالملف: كتبقى ديال البرنامج
  });
  var auto = bkAutofill(all); auto.forEach(function (r) { r._chg = 1; });
  var ops = [];
  all.forEach(function (r) {
    if (r._new) ops.push({ ref: Bank.col().doc(r.id), data: bkRowData(r) });
    else if (r._chg) { var u = { note: r.note || '', noteBy: r.noteBy || '', noteAt: r.noteAt || now }; u.noteSrc = r.noteSrc ? r.noteSrc : FB.FV.delete(); ops.push({ ref: Bank.col().doc(r.id), upd: u }); }
  });
  var mine = st.rows.map(function (o) { return o.d; }).sort();
  ops.push({ ref: Bank.col().doc('_acc_' + st.acc), data: { acc: st.acc, file: fname, at: now, by: me, from: mine[0] || '', to: mine[mine.length - 1] || '', n: st.rows.length } });
  return FB.batches(ops).then(function () {
    Bank.acc = st.acc; Local.set('bk_acc', st.acc);
    var nAuto = auto.length;
    Modal.open(Modal.head('🏦 ' + L('الحساب ', 'Compte ') + esc(bkAccName(st.acc)) + ' — ' + esc(fname))
      + '<div class="sm-diff"><span class="chip">' + st.rows.length + ' ' + L('عملية فالملف', 'opérations') + '</span><span class="chip green">➕ ' + nNew + ' ' + L('جديدة', 'nouvelles') + '</span>'
      + '<span class="chip">📝 ' + nNote + ' ' + L('ملاحظة من الملف', 'notes du fichier') + '</span><span class="chip amber">🤖 ' + nAuto + ' ' + L('تعمرو وحدهم', 'remplies auto') + '</span></div>'
      + (nConf ? '<div class="box amber sm">' + nConf + ' ' + L('عملية فيها ملاحظة فالبرنامج مختلفة على اللي فالملف: بقات ديال البرنامج.', 'notes différentes du fichier : celles du programme sont gardées.') + '</div>' : '')
      + '<div class="hint">' + L('الفترة: ', 'Période : ') + fmtD(mine[0]) + ' → ' + fmtD(mine[mine.length - 1]) + ' · ' + L('باقيين بلا ملاحظة: ', 'Sans note : ') + '<b>' + bkEmpty(st.acc).length + '</b></div>'
      + '<div class="acts2"><button class="btn pri" data-act="bk-show" data-f="empty">' + L('شوف اللي بلا ملاحظة', 'Voir les opérations sans note') + '</button><button class="btn" data-act="bk-show" data-f="auto">🤖 ' + L('شوف اللي تعمرو وحدهم', 'Voir les notes auto') + '</button></div>', 'small');
  });
}
function bkImportTreso(tr, fname) {
  var now = new Date().toISOString();
  return Bank.col().doc('_treso').set({ items: tr.items, sheets: tr.sheets, file: fname, at: now, by: App.user.name }).then(function () {
    Bank.treso = { items: tr.items, sheets: tr.sheets, file: fname, at: now };
    return bkRerun().then(function (n) {
      Modal.open(Modal.head('📊 ' + L('جدول الخزينة', 'État de trésorerie') + ' — ' + esc(fname))
        + '<div class="sm-diff"><span class="chip">' + tr.sheets + ' ' + L('شهر', 'mois') + '</span><span class="chip">' + tr.items.length + ' ' + L('مبلغ (WAFA / CAT)', 'montants (WAFA / CAT)') + '</span><span class="chip amber">🤖 ' + n + ' ' + L('ملاحظة تعمرات', 'notes remplies') + '</span></div>'
        + '<div class="hint">' + L('كناخدو منو غير المبالغ ديال WAFA auto و WAFA R.D. و CAT: إلا تطابق المبلغ بالضبط مع عملية وحدة فالبنك (±25 يوم)، كتتكتب «REG WAFA AUTO»… الجدول ديالك كيبقى كيف ما هو.', 'Seuls les montants WAFA auto / R.D. / CAT sont utilisés (montant identique, ±25 jours).') + '</div>', 'small');
    });
  });
}
/* نعاودو التعبئة على كاع الخاويين (بعد الخزينة، ولا بعد ملاحظة جديدة) */
function bkRerun() {
  var all = Bank.rows.map(bkClone), ch = bkAutofill(all); if (!ch.length) return Promise.resolve(0);
  return FB.batches(ch.map(function (r) { return { ref: Bank.col().doc(r.id), upd: { note: r.note, noteBy: 'auto', noteAt: r.noteAt, noteSrc: r.noteSrc } }; })).then(function () { return ch.length; });
}
var bkRerunSoon = debounce(function () { bkRerun().catch(syncErr); }, 1500);

/* ───────── الملاحظة: كتابة، تأكيد، مسح ───────── */
function bkSaveNote(id, v) {
  var r = Bank.byId[id]; if (!r) return; v = bkTidy(v);
  if (v === bkTidy(r.note) && !r.noteSrc) return;
  var u = { note: v, noteBy: App.user.name, noteAt: new Date().toISOString(), noteSrc: FB.FV.delete() };
  if (!v && r.noteSrc) u.noAuto = true;                                   // مسحتي ملاحظة 🤖: ما تعاودش تتعمر
  if (v === bkTidy(r.note) && r.noteSrc) { /* تأكيد بلا تبديل */ }
  r.note = v; delete r.noteSrc;
  Bank.col().doc(id).update(u).then(function () { if (v) bkRerunSoon(); }).catch(syncErr);
}
document.addEventListener('change', function (e) { var el = e.target; if (el && el.classList && el.classList.contains('bk-note')) bkSaveNote(el.dataset.id, el.value); }, true);
document.addEventListener('keydown', function (e) { var el = e.target; if (el && el.classList && el.classList.contains('bk-note') && e.key === 'Enter') { e.preventDefault(); el.blur(); } });
document.addEventListener('focusout', function (e) { var el = e.target; if (el && el.classList && el.classList.contains('bk-note') && Bank.dirty) setTimeout(function () { if (!document.activeElement || !document.activeElement.classList || !document.activeElement.classList.contains('bk-note')) { Bank.dirty = false; App.render(); } }, 120); });
App.act('bk-ok', function (el) { var r = Bank.byId[el.dataset.id]; if (r) bkSaveNote(r.id, r.note); });
App.act('bk-ok-all', function () {
  var list = bkView().filter(function (r) { return r.noteSrc; }); if (!list.length) return;
  if (!confirm(L('نأكدو ', 'Valider ') + list.length + L(' ملاحظة 🤖 اللي باينين؟', ' notes auto affichées ?'))) return;
  FB.batches(list.map(function (r) { return { ref: Bank.col().doc(r.id), upd: { noteSrc: FB.FV.delete(), noteBy: App.user.name, noteAt: new Date().toISOString() } }; })).then(function () { toast('✓ ' + list.length); }).catch(syncErr);
});

/* ───────── العرض ───────── */
App.act('bk-acc', function (el) { Bank.acc = el.dataset.a; Local.set('bk_acc', Bank.acc); Bank.limit = 200; App.render(); });
App.act('bk-f', function (el) { Bank.f = el.dataset.f; Local.set('bk_f', Bank.f); Bank.limit = 200; App.render(); });
App.act('bk-show', function (el) { Bank.f = el.dataset.f; Local.set('bk_f', Bank.f); Modal.close(); App.go('bank'); });
App.act('bk-more', function () { Bank.limit += 300; App.render(); });
App.input('bk-q', debounce(function (el) { Bank.q = el.value; Bank.limit = 200; bkFillList(); }, 250));
App.input('bk-month', function (el) { Bank.month = el.value; Bank.limit = 200; App.render(); });
function bkView() {
  var q = bkFold(Bank.q), qn = num(Bank.q);
  return Bank.rows.filter(function (r) {
    if (r.acc !== Bank.acc) return false;
    if (Bank.f === 'empty' && bkHas(r)) return false;
    if (Bank.f === 'auto' && !r.noteSrc) return false;
    if (Bank.month && r.d.slice(0, 7) !== Bank.month) return false;
    if (q) { if (/^[\d\s.,]+$/.test(Bank.q.trim()) && qn) { if (Math.abs(bkAmt(r) - qn) > 0.005 && bkFold(r.lib + ' ' + r.ref).indexOf(q) < 0) return false; }
      else if (bkFold(r.lib + ' ' + r.ref + ' ' + (r.note || '')).indexOf(q) < 0) return false; }
    return true;
  });
}
function bkRowHTML(r) {
  var auto = !!r.noteSrc, why = { rule: L('قاعدة: مصاريف البنك', 'règle : frais'), learn: L('تعلّم من ملاحظاتك', 'appris de vos notes'), treso: L('جدول الخزينة', 'état de trésorerie'), caisse: L('مطابقة الصندوق / الشيكات', 'rapprochement caisse / chèques') }[r.noteSrc] || '';
  return '<div class="bk-row' + (bkHas(r) ? '' : ' e0') + '">'
    + '<span class="bk-d">' + esc(fmtD(r.d).slice(0, 5)) + '<small>' + esc(r.d.slice(2, 4)) + '</small></span>'
    + '<span class="bk-l" dir="ltr">' + esc(r.lib) + (r.ref ? ' <small>' + esc(r.ref) + '</small>' : '') + '</span>'
    + '<span class="bk-a ' + (r.deb ? 'deb' : 'cre') + '">' + (r.deb ? '−' : '+') + moneyH(bkAmt(r)) + '</span>'
    + '<span class="bk-n"><input class="bk-note inp' + (auto ? ' auto' : '') + '" dir="ltr" data-id="' + esc(r.id) + '" value="' + esc(r.note || '') + '" placeholder="' + L('ملاحظة…', 'Note…') + '"' + (auto ? ' title="🤖 ' + esc(why) + '"' : '') + '>'
    + (auto ? '<button class="bk-ok" data-act="bk-ok" data-id="' + esc(r.id) + '" title="' + L('تأكيد', 'Valider') + '">✓</button>' : '') + '</span></div>';
}
function bkFillList() {
  var box = $('bk-list'); if (!box) return;
  var v = bkView(), shown = v.slice(0, Bank.limit);
  box.innerHTML = (shown.length ? shown.map(bkRowHTML).join('') : '<div class="empty">' + (Bank.f === 'empty' ? '✅ ' + L('كاع العمليات فيها ملاحظة', 'Toutes les opérations ont une note') : L('ما كاين والو', 'Rien à afficher')) + '</div>')
    + (v.length > shown.length ? '<button class="btn wide" data-act="bk-more">' + L('عرض المزيد', 'Afficher plus') + ' (' + (v.length - shown.length) + ')</button>' : '');
  var n = $('bk-n'); if (n) n.textContent = v.length;
}
function renderBank(el) {
  var ae = document.activeElement;
  if (ae && ae.classList && ae.classList.contains('bk-note') && el.contains(ae) && el.querySelector('.bk-page')) { Bank.dirty = true; return; }   // ما نقطعوش الكتابة
  if (!bankCan()) { el.innerHTML = '<div class="page"><div class="empty">🔒 ' + L('ما عندكش صلاحية «🏦 البنك»', 'Accès « Banque » non autorisé') + '</div></div>'; return; }
  if (Bank.denied) { el.innerHTML = '<div class="page"><div class="box red">⚠️ ' + L('قاعدة Firestore رفضات «bank». انشر القواعد الجديدة من 🎛️ لوحة التحكم ← ⚙️ الإعدادات ← قواعد Firestore.', 'Firestore refuse « bank » : publiez les nouvelles règles (Paramètres ← Règles Firestore).') + '</div></div>'; return; }
  if (!Bank.ready) { el.innerHTML = '<div class="page"><div class="empty">⏳</div></div>'; return; }
  var accs = bkAccList(), acc = Bank.acc;
  var head = '<div class="sin-title"><b>🏦 ' + L('البنك', 'Banque') + '</b></div><div class="bar bk-acts">'
    + '<button class="btn pri" data-act="bk-pick" title="' + L('كشف البنك (011 / 029) ولا جدول الخزينة', 'Relevé (011 / 029) ou état de trésorerie') + '">📥<span class="bl"> ' + L('تحميل كشف / خزينة', 'Importer relevé / trésorerie') + '</span></button>'
    + (acc ? '<button class="btn" data-act="bk-reconcile" title="' + L('مطابقة أوتوماتيكية مع الشيكات وحركات الصندوق', 'Rapprochement auto avec chèques et caisse') + '">🤝<span class="bl"> ' + L('مطابقة الصندوق والشيكات', 'Rapprochement Caisse/Chèques') + '</span></button>' : '')
    + '<button class="btn" data-act="c8-chq-open" title="' + L('فتح دفتر تتبّع الشيكات', 'Ouvrir le suivi des chèques') + '">📄<span class="bl"> ' + L('دفتر الشيكات', 'Chèques') + '</span></button>'
    + (acc ? '<button class="btn green" data-act="bk-xls" title="' + L('تصدير Excel', 'Exporter Excel') + '">📤<span class="bl"> ' + L('تصدير Excel', 'Exporter Excel') + '</span></button>' : '') + '</div>';
  if (!accs.length) {
    el.innerHTML = '<div class="page bk-page">' + head + '<div class="empty">' + L('حمّل كشف البنك (Excel ديال البنك) باش تبدا. كل حساب كيتعرف وحدو.', 'Importez un relevé bancaire (Excel) pour commencer.') + '</div></div>'; return;
  }
  var a = Bank.accs[acc] || {}, rowsA = Bank.rows.filter(function (r) { return r.acc === acc; }), emp = rowsA.filter(function (r) { return !bkHas(r); }).length, aut = rowsA.filter(function (r) { return r.noteSrc; }).length;
  var months = {}; rowsA.forEach(function (r) { months[r.d.slice(0, 7)] = 1; });
  var tr = Bank.treso;
  el.innerHTML = '<div class="page bk-page">' + head
    + '<div class="chips bk-accs">' + accs.map(function (x) { var e = bkEmpty(x).length; return '<button class="chip' + (x === acc ? ' on' : '') + '" data-act="bk-acc" data-a="' + esc(x) + '">🏦 ' + esc(bkAccName(x)) + (e ? ' <span class="bk-cnt">' + e + '</span>' : ' ✅') + '</button>'; }).join('') + '</div>'
    + '<div class="hint">' + L('الحساب ', 'Compte ') + ltr(acc) + (a.at ? ' · ' + L('آخر تحميل: ', 'dernier import : ') + fmtDT(a.at) + (a.to ? ' (' + L('حتى ', 'jusqu\'au ') + fmtD(a.to) + ')' : '') : '')
      + ' · 📊 ' + (tr ? L('الخزينة: ', 'trésorerie : ') + fmtDT(tr.at) : L('الخزينة ما تحمّلاتش', 'trésorerie non importée')) + '</div>'
    + '<div class="chips">'
      + '<button class="chip' + (Bank.f === 'empty' ? ' on' : '') + '" data-act="bk-f" data-f="empty">⬜ ' + L('بلا ملاحظة', 'Sans note') + ' ' + emp + '</button>'
      + '<button class="chip' + (Bank.f === 'auto' ? ' on' : '') + '" data-act="bk-f" data-f="auto">🤖 ' + L('تعمرو وحدهم', 'Auto') + ' ' + aut + '</button>'
      + '<button class="chip' + (Bank.f === 'all' ? ' on' : '') + '" data-act="bk-f" data-f="all">' + L('الكل', 'Tout') + ' ' + rowsA.length + '</button>'
      + (Bank.f === 'auto' && aut ? '<button class="chip" data-act="bk-ok-all">✓ ' + L('تأكيد اللي باينين', 'Valider l\'affichage') + '</button>' : '') + '</div>'
    + '<div class="bar bk-tools"><div class="search" style="flex:1;min-width:140px"><span>🔍</span><input data-inp="bk-q" placeholder="' + L('بحث: السمية، المرجع، الملاحظة ولا المبلغ', 'Recherche : libellé, réf., note ou montant') + '" value="' + esc(Bank.q) + '"></div>'
      + '<select class="inp" data-inp="bk-month" style="width:auto"><option value="">' + L('كل الشهور', 'Tous les mois') + '</option>' + Object.keys(months).sort().reverse().map(function (m) { return '<option value="' + m + '"' + (Bank.month === m ? ' selected' : '') + '>' + m.slice(5) + '/' + m.slice(0, 4) + '</option>'; }).join('') + '</select>'
      + '<small class="muted"><span id="bk-n"></span> ' + L('عملية', 'opér.') + '</small></div>'
    + '<div class="bk-legend"><span><i class="bk-sw auto"></i>🤖 ' + L('تعمرات وحدها: راجعها، بدّلها ولا ✓', 'remplie auto : vérifiez, modifiez ou ✓') + '</span><span><i class="bk-sw e0"></i>' + L('خاوية', 'vide') + '</span></div>'
    + '<div id="bk-list" class="bk-list"></div></div>';
  bkFillList();
}

/* ───────── التصدير: نفس شكل البنك، والملاحظات فعمود «Solde (MAD)» ───────── */
App.act('bk-xls', function () {
  var acc = Bank.acc, rows = Bank.rows.filter(function (r) { return r.acc === acc; }); if (!rows.length) return;
  var ds = rows.map(function (r) { return r.d; }).sort(), dt = function (iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? { t: 'n', v: (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000, z: 'dd/mm/yyyy' } : ''; };
  var aoa = [[], ['Relevé du compte ' + acc + ' du ' + fmtD(ds[0]) + ' au ' + fmtD(ds[ds.length - 1])], [], [], [], ['Date opération', 'Date valeur', 'Libellé', 'Réf', 'Débit (MAD)', 'Crédit (MAD)', 'Solde (MAD)'], ['Ancien solde', 'Ancien solde', 'Ancien solde', 'Ancien solde', '', '', '']];
  rows.forEach(function (r) { aoa.push([dt(r.d), dt(r.dv), r.lib, r.ref, r.deb || 0, r.cre || 0, r.note || '']); });
  var ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 13 }, { wch: 13 }, { wch: 60 }, { wch: 14 }, { wch: 13 }, { wch: 13 }, { wch: 60 }];
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Feuil1');
  var name = 'banque_' + acc + '_' + todayISO() + '.xlsx', buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); toast('📤 ' + name);
});

/* ───────── 🔔 الخانات الخاوية: القائمة، الرئيسية، تذكير مرة فالنهار ───────── */
App.hook('dash.cards', function () {
  if (!bankCan() || !Bank.ready || !Bank.rows.length) return [];
  var e = bkEmpty(); if (!e.length) return [];
  var old = bkOld(e).length;
  return [{ ic: '🏦', label: L('البنك: بلا ملاحظة', 'Banque : sans note'), value: e.length, cls: old ? 'amber' : '', go: 'bank:empty', mod: 'bank',
    sub: bkAccList().map(function (a) { return bkAccName(a) + ': ' + bkEmpty(a).length; }).join(' · ') }];
});
var BK_NOTI = 'rp6_bk_noti';
function bkTick() {
  if (!App.user || !Bank.ready || !bankCan() || typeof notify !== 'function') return;
  if (new Date().getHours() < 8) return;
  var last = ''; try { last = localStorage.getItem(BK_NOTI) || ''; } catch (e) { } if (last === todayISO()) return;
  try { localStorage.setItem(BK_NOTI, todayISO()); } catch (e) { }
  var e = bkEmpty(), old = bkOld(e); if (!old.length) return;
  notify('🏦 ' + L('البنك: ', 'Banque : ') + e.length + ' ' + L('عملية بلا ملاحظة', 'opérations sans note'),
    bkAccList().map(function (a) { return bkAccName(a) + ': ' + bkEmpty(a).length; }).join(' · ') + ' — ' + old.length + ' ' + L('من أكثر من 7 أيام', 'de plus de 7 jours'),
    'bk-sum', function () { Bank.f = 'empty'; App.go('bank'); });
}
setInterval(bkTick, 60000);
App.on('login', function () { setTimeout(bkTick, 9000); });

App.register({ id: 'bank', perm: 'bank', icon: '🏦', title: ['البنك', 'Banque'], order: 26, render: renderBank, enabled: bankCan,
  badge: function () { if (!Bank.ready || !bankCan()) return ''; var n = bkEmpty().length; return n ? String(n) : ''; },
  sheets: function () { return bkAccList().map(function (a) { return { name: 'البنك ' + bkAccName(a), rows: Bank.rows.filter(function (r) { return r.acc === a; }).map(function (r) {
    return { 'Date opération': fmtD(r.d), 'Date valeur': fmtD(r.dv), 'Libellé': r.lib, 'Réf': r.ref || '', 'Débit': r.deb || '', 'Crédit': r.cre || '', 'Note': r.note || '' }; }) }; }); } });

/* ══════════════════════════════════════════════════════════
   🤝 مطابقة تلقائية بين الصندوق / الشيكات وكشف البنك
══════════════════════════════════════════════════════════ */
var BK_REC_LAST = [];
function bkFindReconciles() {
  var acc = Bank.acc, empty = Bank.rows.filter(function (r) { return r.acc === acc && !bkHas(r) && r.cre; });
  var hist = [], moves = [];
  try { hist = JSON.parse(localStorage.getItem('eurv102_h') || '[]') || []; } catch (e) { }
  try { moves = JSON.parse(localStorage.getItem('eurv102_cash_moves') || '[]') || []; } catch (e) { }

  var chqs = hist.filter(function (h) { return h && !h.unpaid && h.payMode === 'cheque'; });
  var versMoves = moves.filter(function (m) {
    return m && m.type === 'out' && /verse|banq|depot|بنك|إيداع|ايداع/i.test(String(m.reason || '') + ' ' + String(m.person || ''));
  });

  var toISO = function (dFr) {
    return (dFr && dFr.length >= 10) ? (dFr.slice(6, 10) + '-' + dFr.slice(3, 5) + '-' + dFr.slice(0, 2)) : '';
  };

  var matches = [];
  empty.forEach(function (r) {
    var crC = bkCents(r.cre), txt = String(r.lib || '') + ' ' + String(r.ref || '');
    /* 1) مطابقة مع الشيكات */
    var mChq = chqs.filter(function (h) {
      var cnum = String(h.chequeNum || '').replace(/\D+/g, '');
      if (cnum.length >= 4 && txt.indexOf(cnum) >= 0) return true;
      var iso = toISO(h.date);
      return iso && bkCents(h.paid) === crC && Math.abs(daysBetween(iso, r.d)) <= 15;
    });
    if (mChq.length === 1) {
      var ch = mChq[0];
      matches.push({
        row: r, kind: 'cheque', chqNum: ch.num,
        note: 'CHQ ' + (ch.chequeNum ? 'N°' + ch.chequeNum + ' ' : '') + (ch.client || '').trim(),
        srcLabel: '📄 ' + L('شيك ', 'Chèque ') + (ch.chequeNum || ch.num) + ' — ' + (ch.client || '') + ' (' + ch.date + ')'
      });
      return;
    }
    /* 2) مطابقة مع حركات إيداع الصندوق في البنك (Versement) */
    var mMv = versMoves.filter(function (m) {
      var iso = toISO(m.date);
      return iso && bkCents(m.amount) === crC && Math.abs(daysBetween(iso, r.d)) <= 5;
    });
    if (mMv.length === 1) {
      var mv = mMv[0];
      matches.push({
        row: r, kind: 'versement',
        note: 'VERSEMENT CAISSE ' + (mv.date || '') + (mv.person ? ' (' + mv.person + ')' : ''),
        srcLabel: '🗄️ ' + L('إيداع من الصندوق ', 'Versement caisse ') + (mv.date || '') + (mv.reason ? ' · ' + mv.reason : '')
      });
    }
  });
  return matches;
}

App.act('bk-reconcile', function () {
  if (!bankCan() || !Bank.acc) return;
  BK_REC_LAST = bkFindReconciles();
  var h = Modal.head('🤝 ' + L('مطابقة الصندوق والشيكات مع البنك', 'Rapprochement Caisse / Chèques ↔ Banque') + ' (' + esc(bkAccName(Bank.acc)) + ')');
  if (!BK_REC_LAST.length) {
    h += '<div class="empty">🔍 ' + L('لم يتم العثور على مطابقات جديدة بين العمليات البنكية الفارغة والشيكات أو إيداعات الصندوق.', 'Aucune nouvelle correspondance trouvée entre les lignes bancaires sans note et les chèques/versements caisse.') + '</div>';
    Modal.open(h, 'small');
    return;
  }
  h += '<div class="hint" style="margin-bottom:10px">' + L('تم العثور على ', 'Trouvé : ') + '<b>' + BK_REC_LAST.length + '</b> ' + L('عملية متطابقة بالمبلغ والتاريخ أو رقم الشيك:', 'correspondance(s) par montant/date ou N° chèque :') + '</div>'
    + '<div class="sec-tw" style="max-height:55vh;overflow:auto"><table class="sec-t"><thead><tr><th>' + L('تاريخ البنك', 'Date banque') + '</th><th>' + L('البيان البنكي', 'Libellé banque') + '</th><th>' + L('المبلغ', 'Crédit') + '</th><th>' + L('المصدر المطابق', 'Source Caisse / Chèque') + '</th><th>' + L('الملاحظة المقترحة', 'Note proposée') + '</th></tr></thead><tbody>'
    + BK_REC_LAST.map(function (m) {
        return '<tr><td class="ltr">' + esc(fmtD(m.row.d)) + '</td><td class="ltr">' + esc(m.row.lib) + '</td><td class="ltr ok-t"><b>+' + moneyH(m.row.cre, 1) + '</b></td><td>' + esc(m.srcLabel) + '</td><td class="ltr"><b>' + esc(m.note) + '</b></td></tr>';
      }).join('')
    + '</tbody></table></div>'
    + '<div class="acts2" style="margin-top:12px"><button class="btn pri" data-act="bk-rec-apply">✓ ' + L('اعتماد وحفظ المطابقات (' + BK_REC_LAST.length + ')', 'Appliquer et enregistrer (' + BK_REC_LAST.length + ')') + '</button>'
    + '<button class="btn" data-act="modal-close">' + L('إلغاء', 'Annuler') + '</button></div>';
  Modal.open(h, 'wide');
});

App.act('bk-rec-apply', function () {
  if (!BK_REC_LAST.length) return;
  var now = new Date().toISOString(), me = App.user ? App.user.name : '';
  var ops = BK_REC_LAST.map(function (m) {
    m.row.note = m.note; m.row.noteBy = me; m.row.noteAt = now; delete m.row.noteSrc;
    return { ref: Bank.col().doc(m.row.id), upd: { note: m.note, noteBy: me, noteAt: now, noteSrc: FB.FV.delete() } };
  });
  FB.batches(ops).then(function () {
    if (typeof Chq8 !== 'undefined' && Chq8.setMeta) {
      BK_REC_LAST.forEach(function (m) {
        if (m.kind === 'cheque' && m.chqNum) Chq8.setMeta(m.chqNum, { st: 'encaisse', bankRef: m.row.id, bankDate: m.row.d });
      });
    }
    Modal.close();
    toast('✅ ' + L('تمت مطابقة وحفظ ', 'Rapprochement appliqué : ') + BK_REC_LAST.length + ' ' + L('عملية وتحديث حالة الشيكات', 'opération(s)'));
    BK_REC_LAST = [];
    App.render();
  }).catch(syncErr);
});
