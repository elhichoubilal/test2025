/* ══════════════════════════════════════════════════════════
   RenewPro 2 — mod-debts.js   (قسم الديون)
   المصدر: ملف العمليات المصدَّر من برنامج الشركة (عمود Solde).
   الربط بالزبون دون الاسم: البوليصة (الرقم بعد «8/») ← رقم الشهادة ← المجموعة.
   الأعمدة QCie و CODE و QTAG لا تُقرأ ولا يُعتمد عليها.

   السحابة (مجموعة debts، الصيغة نفسها المستعملة سابقاً):
     x_chunk_N = لائحة الديون مضغوطة · x_map = خريطة الربط · x_cfg = المجموعات المعطّلة
     <id> = متابعة سطر واحد (دفعات، هاتف، حالة، وعد…)
   هذا الملف لا يعدّل قسم التجديد: يدخل إليه عبر App.hook فقط.
══════════════════════════════════════════════════════════ */
'use strict';

var Debts = { rows: [], ver: 0, ix: null, ixVer: -1, map: { pg: {}, gn: {}, amb: {}, pp: {} }, gx: null,
  unsub: null, ready: false, docIds: [], fuLast: {}, chCache: {}, legacy: false, denied: false,
  q: '', f: 'all', g: '', limit: 60, boxOpen: false, inclGrp: false, ctx: null };
var FU_KEYS = ['payments', 'phone', 'status', 'note', 'promise', 'lastMsg', 'lastMsgBy', 'hdl'];
var DEBT_ST = { contacted: ['📞', 'تم الاتصال', 'Contacté', '#22c7f0'], promise: ['🤝', 'وعد بالدفع', 'Promesse', '#10b981'],
  waiting: ['⏳', 'في الانتظار', 'En attente', '#f59e0b'], noans: ['❌', 'لم يجب', 'Sans réponse', '#ef4444'], refus: ['⛔', 'رفض', 'Refus', '#ef4444'] };
function dStLabel(k) { var s = DEBT_ST[k]; return s ? s[0] + ' ' + (App.lang === 'fr' ? s[2] : s[1]) : ''; }

/* مفاتيح العرض — لكل جهاز */
function debtOn() { return Local.get('debt_on', true) !== false && App.can('debts'); }
function debtInCard() { return debtOn() && Local.get('debt_card', true) !== false; }
function debtInSess() { return debtOn() && Local.get('debt_sess', true) !== false; }

/* ───────── حساب ومفاتيح ───────── */
function dHash(str) { var h1 = 5381, h2 = 52711; str = String(str); for (var i = 0; i < str.length; i++) { var ch = str.charCodeAt(i); h1 = ((h1 * 33) ^ ch) >>> 0; h2 = ((h2 * 31) + ch) >>> 0; } return h1.toString(36) + h2.toString(36); }
function kPolFull(s) { var k = kAl(s).replace(/^0+/, ''); return k.length >= 4 ? k : ''; }
/* «8/0107410461» و«0107410461» بوليصة واحدة. إن حمل الرقمَ نفسه عقدان مختلفان ببادئتين، تحسم اللوحة. */
function kPol(s, plate) {
  var t = kPolTail(s); if (!t) return '';
  var a = Debts.map.amb && Debts.map.amb[t]; if (!a) return t;
  var f = kPolFull(s), slash = String(s).indexOf('/') >= 0;
  if (slash && a[f]) return f;
  var pl = kPlate(plate), hit = ''; if (pl) Object.keys(a).forEach(function (k) { if (!hit && a[k].indexOf(pl) >= 0) hit = k; });
  return hit || (a[f] ? f : (t + '?'));
}
function gKey(s) { return String(s == null ? '' : s).trim().replace(/\s+/g, ' ').toUpperCase(); }
function dPaid(d) { return (d.payments || []).reduce(function (s, p) { return s + Math.max(0, +p.amount || 0); }, 0); }
function dRest(d) { return Math.max(0, Math.round(((+d.solde || 0) - dPaid(d)) * 100) / 100); }
function dAge(d) { var n = daysLeft(d.dateOp || d.du); return n === null ? null : Math.max(0, -n); }
function ageLabel(a) { return a == null ? '' : a <= 30 ? L('0–30 يوم', '0–30 j') : a <= 90 ? L('30–90 يوم', '30–90 j') : L('+90 يوم', '+90 j'); }
function dStrip(d) { var o = {}; for (var k in d) { var v = d[k]; if (k === 'id' || v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue; o[k] = v; } return o; }
function dFu(d) { var o = {}, n = 0; FU_KEYS.forEach(function (k) { var v = d[k]; if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return; o[k] = v; n++; }); return n ? o : null; }

/* مجموعة = عائلة تُربط ديونها، إلا التصنيفات العامة والمجموعات الكبيرة (قابل للتغيير من الإعدادات) */
function grpIsLabel(g) { return /ERREUR|SOLDE|ANNUL|RESILI|R[EÉ]DUCTION|BOURRAGE|PERIOD|COMMISSION|CONVENTION|PROMO?TION|(^|[^A-Z])PPR([^A-Z]|$)|SAFIR|(^|[^A-Z])CDD([^A-Z]|$)|SALEF|(19|20)\d\d/.test(g); }
function grpOff(g) { if (Debts.gx) return Debts.gx.indexOf(g) >= 0; return (Debts.map.gn[g] || 0) > 8 || grpIsLabel(g); }
function grpAll() { var o = {}; Object.keys(Debts.map.gn || {}).forEach(function (g) { o[g] = Debts.map.gn[g]; }); Debts.rows.forEach(function (d) { var g = gKey(d.group); if (g && o[g] == null) o[g] = 1; });
  return Object.keys(o).sort().map(function (g) { return { g: g, n: o[g] }; }); }
function rowGroups(d) { var o = [], g = gKey(d.group); if (g) o.push(g); (Debts.map.pg[kPol(d.police, d.plate)] || []).forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }

/* ───────── الفهرس والربط ───────── */
function debtIndex() {
  if (Debts.ix && Debts.ixVer === Debts.ver) return Debts.ix;
  var ix = { pol: Object.create(null), att: Object.create(null), plate: Object.create(null), grp: Object.create(null), byId: Object.create(null) };
  function put(m, k, d) { if (k) (m[k] = m[k] || []).push(d); }
  Debts.rows.forEach(function (d) { ix.byId[d.id] = d; put(ix.pol, kPol(d.police, d.plate), d); put(ix.att, kAtt(d.att), d); put(ix.plate, kPlate(d.plate), d); rowGroups(d).forEach(function (g) { put(ix.grp, g, d); }); });
  Debts.ix = ix; Debts.ixVer = Debts.ver; return ix;
}
function contactLink(c) {
  var ix = debtIndex(), groups = {}, kp = kPol(polFull(c), c.plate), ka = kAtt(c.att);
  if (c.group) groups[gKey(c.group)] = 1;
  if (kp) { (Debts.map.pg[kp] || []).forEach(function (g) { groups[g] = 1; }); (ix.pol[kp] || []).forEach(function (d) { if (d.group) groups[gKey(d.group)] = 1; }); }
  if (ka) (ix.att[ka] || []).forEach(function (d) { if (d.group) groups[gKey(d.group)] = 1; });
  return { kp: kp, ka: ka, groups: Object.keys(groups).filter(function (g) { return g && !grpOff(g); }) };
}
/* ديون الزبون: kind = contract (هذا العقد) | group (المجموعة) | plate (باللوحة فقط، بطاقة بلا بوليصة) */
function debtsOf(c) {
  var out = { lines: [], total: 0, own: 0, grp: 0, loose: 0 };
  if (!c || !Debts.rows.length || !debtOn()) return out;
  var ix = debtIndex(), lk = contactLink(c), seen = {}, ex = c.debtExcl || [], hi = c.dateE || '', lo = c.dateS || (hi ? addDays(hi, -370) : '');
  function add(arr, kind) { (arr || []).forEach(function (d) {
    if (seen[d.id]) return; seen[d.id] = 1; if (ex.indexOf(d.id) >= 0) return; var r = dRest(d); if (r <= 0.005) return;
    out.lines.push({ d: d, kind: kind, rest: r, cur: kind === 'contract' && !!(hi && d.au && d.au >= lo && (!d.du || d.du <= hi)) });
    out.total += r; if (kind === 'group') out.grp += r; else out.own += r; if (kind === 'plate') out.loose++; }); }
  add(ix.pol[lk.kp], 'contract'); add(ix.att[lk.ka], 'contract');
  lk.groups.forEach(function (g) { add(ix.grp[g], 'group'); });
  if (!lk.kp && !lk.ka) add(ix.plate[kPlate(c.plate)], 'plate');
  ['total', 'own', 'grp'].forEach(function (k) { out[k] = Math.round(out[k] * 100) / 100; });
  return out;
}
function msgLines(info) { return info.lines.filter(function (x) { return Debts.inclGrp || x.kind !== 'group'; }).map(function (x) { return x.d; }); }

/* ───────── السحابة ───────── */
Debts.col = function () { return FB.db.collection('debts'); };
Debts.touch = function () { Debts.ver++; };
Debts.start = function () {
  if (Debts.unsub || !FB.db || !debtOn()) return;
  Debts.unsub = Debts.col().onSnapshot(function (snap) {
    var chunks = [], fu = {}, legacy = [], map = null, cfg = null, ids = [];
    snap.forEach(function (doc) { var d = doc.data() || {}; ids.push(doc.id);
      if (d.k === 'chunk') chunks.push([doc.id, d.j]); else if (d.k === 'map') map = d.j; else if (d.k === 'cfg') cfg = d; else if (d.k === 'fu') fu[doc.id] = d; else { d.id = doc.id; legacy.push(d); } });
    Debts.docIds = ids; Debts.fuLast = {}; var arr = [];
    if (chunks.length) {
      Debts.legacy = false;
      chunks.sort(function (a, b) { return (+a[0].slice(8)) - (+b[0].slice(8)); });
      chunks.forEach(function (ch) { var c = Debts.chCache[ch[0]];
        if (!c || c.j !== ch[1]) { try { c = { j: ch[1], rows: JSON.parse(ch[1]) }; } catch (e) { c = { j: ch[1], rows: [] }; } Debts.chCache[ch[0]] = c; }
        c.rows.forEach(function (r) { var o = {}; for (var k in r) o[k] = r[k]; var f = fu[r.id]; if (f) FU_KEYS.forEach(function (k) { if (f[k] !== undefined) o[k] = f[k]; }); arr.push(o); }); });
      Object.keys(fu).forEach(function (id) { var cp = dFu(fu[id]) || {}; cp.k = 'fu'; Debts.fuLast[id] = JSON.stringify(cp); });
    } else { Debts.legacy = legacy.length > 0; arr = legacy; }
    var m = null; if (map) { try { m = JSON.parse(map); } catch (e) { } }
    Debts.map = { pg: (m && m.pg) || {}, gn: (m && m.gn) || {}, amb: (m && m.amb) || {}, pp: (m && m.pp) || {} };
    Debts.gx = (cfg && Array.isArray(cfg.gx)) ? cfg.gx : null;
    Debts.rows = arr; Debts.ready = true; Debts.denied = false; Debts.touch(); App.refresh();
  }, function (e) { Debts.denied = true; Debts.ready = true; App.refresh(); console.warn('debts', e); });
};
Debts.stop = function () { if (Debts.unsub) { try { Debts.unsub(); } catch (e) { } } Debts.unsub = null; Debts.rows = []; Debts.ready = false; Debts.touch(); };
/* حفظ متابعة سطور محدّدة فقط */
Debts.commit = function (ids) {
  Debts.touch();
  var byId = debtIndex().byId, ops = [];
  (ids || []).forEach(function (id) { var d = byId[id]; if (!d) return;
    if (Debts.legacy) { ops.push({ ref: Debts.col().doc(id), data: dStrip(d) }); return; }
    var fu = dFu(d); if (fu) { fu.k = 'fu'; ops.push({ ref: Debts.col().doc(id), data: fu }); } else if (Debts.fuLast[id]) ops.push({ del: 1, ref: Debts.col().doc(id) }); });
  App.refresh();
  return FB.batches(ops).catch(syncErr);
};
/* رفع لائحة كاملة: القطع ثم الخريطة ثم المتابعة، ثم حذف ما لم يعد موجوداً */
Debts.upload = function (rows, map, onProgress) {
  var keep = { x_map: 1, x_cfg: 1 }, ops = [], chunks = [], cur = [], size = 0;
  rows.forEach(function (d) { var o = dStrip(d); FU_KEYS.forEach(function (k) { delete o[k]; }); o.id = d.id;
    var s = JSON.stringify(o); if (size + s.length > 350000 && cur.length) { chunks.push('[' + cur.join(',') + ']'); cur = []; size = 0; } cur.push(s); size += s.length + 1;
    var fu = dFu(d); if (fu) { fu.k = 'fu'; keep[d.id] = 1; if (JSON.stringify(fu) !== Debts.fuLast[d.id]) ops.push({ ref: Debts.col().doc(d.id), data: fu }); } });
  if (cur.length) chunks.push('[' + cur.join(',') + ']');
  var p = Promise.resolve();
  chunks.forEach(function (j, i) { keep['x_chunk_' + i] = 1; p = p.then(function () { if (onProgress) onProgress(i + 1, chunks.length); return Debts.col().doc('x_chunk_' + i).set({ k: 'chunk', j: j }); }); });
  return p.then(function () { return Debts.col().doc('x_map').set({ k: 'map', j: JSON.stringify(map) }); })
    .then(function () { Debts.docIds.forEach(function (id) { if (!keep[id]) ops.push({ del: 1, ref: Debts.col().doc(id) }); }); return FB.batches(ops); });
};
App.on('login', function () { Debts.start(); });
App.on('refresh', function () { if (!Debts.unsub && App.user && debtOn()) Debts.start(); });   // الموظف: الصلاحيات كتوصل من بعد الدخول، نعاودو نحاولو
App.on('logout', function () { Debts.stop(); });

/* ───────── استيراد ملف العمليات ───────── */
function parseDebtFile(buf) {
  var wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  var h = -1, hdr = [];
  for (var r0 = 0; r0 < Math.min(rows.length, 15); r0++) { var hh = rows[r0].map(normH);
    if (hh.some(function (x) { return x === 'solde' || x === 'reste' || x === 'resteapayer' || x === 'الدين' || x === 'الباقي'; })) { h = r0; hdr = hh; break; } }
  if (h < 0) throw new Error(L('لم أجد عمود «Solde» في الملف. تأكد أنه ملف العمليات.', 'Colonne « Solde » introuvable.'));
  var col = function (exact, contains) { var i, x;
    for (i = 0; i < exact.length; i++) { x = hdr.indexOf(normH(exact[i])); if (x >= 0) return x; }
    for (i = 0; i < (contains || []).length; i++) { var k = normH(contains[i]); x = hdr.findIndex(function (t) { return t.indexOf(k) >= 0; }); if (x >= 0) return x; }
    return -1; };
  var I = { name: col(['assure', 'nom', 'client', 'الاسم'], ['assure']), plate: col(['matricule', 'immat', 'immatriculation'], ['matricul', 'immat']),
    pol: col(['npolice', 'police'], ['police']), att: col(['attestation'], ['attest']), prime: col(['primetotale', 'prime'], ['prime']),
    solde: col(['solde', 'reste', 'resteapayer', 'الدين', 'الباقي'], []), nat: col(['nature'], []), du: col(['du', 'debut', 'effet'], []), au: col(['au', 'fin', 'echeance'], []),
    brand: col(['marque'], ['marque']), group: col(['groupe', 'group'], ['groupe']), date: col(['dateop', 'dateoperation', 'date'], ['dateop']) };
  var cell = function (row, i) { var v = xCell(row, i); return v instanceof Date ? '' : v; };
  /* مرور أول: الرقم نفسه ببادئتين مختلفتين ولوحات مختلفة = عقدان مختلفان */
  var tf = Object.create(null);
  for (var r1 = h + 1; r1 < rows.length; r1++) { var rw = rows[r1], pp = cell(rw, I.pol), t1 = kPolTail(pp), f1 = kPolFull(pp); if (!t1) continue;
    var o1 = ((tf[t1] = tf[t1] || {})[f1] = tf[t1][f1] || {}); var p1 = kPlate(cell(rw, I.plate)); if (p1) o1[p1] = 1; }
  var amb = {};
  Object.keys(tf).forEach(function (t) { var fs = Object.keys(tf[t]); if (fs.length < 2) return; var base = tf[t][fs[0]];
    if (fs.some(function (f) { return !Object.keys(tf[t][f]).some(function (p) { return base[p]; }); })) { amb[t] = {}; fs.forEach(function (f) { amb[t][f] = Object.keys(tf[t][f]); }); } });
  var oldMap = Debts.map; Debts.map = { pg: {}, gn: {}, amb: amb, pp: {} };   // kPol يحتاج amb الجديد أثناء القراءة
  try {
    var prev = debtIndex().byId, prevLeg = Object.create(null);
    Debts.rows.forEach(function (o) { var f = kPolFull(o.police); prevLeg['d' + dHash([f, kAl(o.att), kPlate(o.plate), o.du || '', o.au || '', o.dateOp || '', +o.prime || 0].join('|') + '|' + (f || kPlate(o.plate) ? '' : String(o.name || '').toUpperCase()))] = o; });
    var next = [], used = Object.create(null), total = 0, pg = {}, gc = {}, pp = {}, ppLim = addDays(todayISO(), -200);
    var addTo = function (m, k, v) { if (!k || !v) return; var a = m[k] || (m[k] = []); if (a.indexOf(v) < 0) a.push(v); };
    for (var r = h + 1; r < rows.length; r++) { var row = rows[r];
      var name = cell(row, I.name), plate = cell(row, I.plate).toUpperCase(), police = cell(row, I.pol);
      if (!name && !plate && !police) continue;
      var grp = gKey(cell(row, I.group)), kp = kPol(police, plate), kpf = kPolFull(police);
      addTo(pg, kp, grp); if (grp) addTo(gc, grp, 'P' + kp);
      /* آخر قسط لكل بوليصة ما زالت سارية (من كل العمليات، لا الديون فقط) */
      if (kp && I.prime >= 0) { var pAu = xDate(I.au >= 0 ? row[I.au] : ''), pOp = xDate(I.date >= 0 ? row[I.date] : ''), pPr = Math.round(num(row[I.prime]) * 100) / 100;
        if (pPr > 0 && pAu >= ppLim && (!pp[kp] || pOp >= pp[kp][3])) pp[kp] = [pPr, xDate(I.du >= 0 ? row[I.du] : ''), pAu, pOp]; }
      var solde = Math.round(num(I.solde >= 0 ? row[I.solde] : 0) * 100) / 100; if (solde <= 0.005) continue;
      var d = { name: name, plate: plate, police: police, att: cell(row, I.att), group: cell(row, I.group), brand: cell(row, I.brand), nature: cell(row, I.nat),
        du: xDate(I.du >= 0 ? row[I.du] : ''), au: xDate(I.au >= 0 ? row[I.au] : ''), dateOp: xDate(I.date >= 0 ? row[I.date] : ''),
        prime: Math.round(num(I.prime >= 0 ? row[I.prime] : 0) * 100) / 100, solde: solde };
      var id = 'd' + dHash([kpf, kAl(d.att), kPlate(plate), d.du, d.au, d.dateOp, d.prime].join('|') + '|' + (kpf || kPlate(plate) ? '' : name.toUpperCase()));
      var n2 = 1; while (used[id]) { n2++; id = id.split('_')[0] + '_' + n2; } used[id] = 1; d.id = id;
      var o = prev[id] || prevLeg[id];
      if (o) { ['phone', 'status', 'note', 'promise', 'lastMsg', 'lastMsgBy', 'hdl'].forEach(function (k) { if (o[k]) d[k] = o[k]; });
        /* الدفعات المسجّلة تبقى فقط إن لم يتغيّر الرصيد في الملف الجديد */
        if (Math.abs((+o.solde || 0) - solde) < 0.005 && (o.payments || []).length) d.payments = o.payments; }
      next.push(d); total += solde;
    }
    var gn = {}; Object.keys(gc).forEach(function (g) { gn[g] = gc[g].length; });
    Object.keys(pp).forEach(function (k) { pp[k] = pp[k].slice(0, 3); });
    return { rows: next, total: total, map: { pg: pg, gn: gn, amb: amb, pp: pp } };
  } finally { Debts.map = oldMap; Debts.touch(); }
}
var DIMP = null;
App.act('d-import', function () { if (!App.canUp()) return; Modal.close(); var f = $('file-in'); f.value = ''; f.dataset.inp = 'd-file'; f.click(); });
App.input('d-file', function (el) {
  var file = el.files && el.files[0]; if (!file) return;
  toast(L('⏳ جارٍ قراءة الملف (قد يأخذ بضع ثوانٍ)…', '⏳ Lecture du fichier…'));
  var rd = new FileReader();
  rd.onload = function (e) { setTimeout(function () {
    try { DIMP = parseDebtFile(e.target.result); DIMP.file = file.name; }
    catch (err) { toast(err.message, 'err'); return; }
    var p = DIMP;
    Modal.open(Modal.head('📥 ' + esc(p.file))
      + (p.rows.length ? '<div class="box"><b>' + p.rows.length + '</b> ' + L('عملية برصيد', 'opérations avec solde') + ' · <b class="red-t">' + moneyH(p.total, 1) + '</b></div>'
          + '<div class="muted sm">' + (Debts.rows.length ? L('تحلّ محلّ اللائحة الحالية (' + Debts.rows.length + '). الهواتف والملاحظات والحالات تبقى، والدفعات تبقى إن لم يتغيّر الرصيد.', 'Remplace la liste actuelle (' + Debts.rows.length + '). Téléphones, notes et statuts conservés.') : '') + '</div>'
          + '<button class="btn pri wide" data-act="d-commit">💰 ' + L('تحميل لائحة الديون', 'Charger les dettes') + '</button>'
        : '<div class="box red">' + L('لا توجد أي عملية برصيد أكبر من 0. لم يتغيّر شيء.', 'Aucune opération avec solde > 0.') + '</div>')
      + '<div id="dimp-prog" class="muted sm"></div>');
  }, 30); };
  rd.readAsArrayBuffer(file);
});
App.act('d-commit', function () {
  var p = DIMP; if (!p || !p.rows.length || !App.canUp()) return;
  if (!navigator.onLine) { toast(L('يلزم اتصال بالإنترنت للتحميل', 'Connexion Internet requise'), 'err'); return; }
  document.querySelectorAll('#modal-box .btn').forEach(function (b) { b.disabled = true; });
  Debts.upload(p.rows, p.map, function (i, n) { var e = $('dimp-prog'); if (e) e.textContent = L('جارٍ الرفع… ', 'Envoi… ') + i + '/' + n; })
    .then(function () { Phones.learnFromContacts(); Modal.close(); toast(L('💰 حُمّل ' + p.rows.length + ' دين', '💰 ' + p.rows.length + ' dettes chargées')); setTimeout(function () { opsRenewedPrompt(true); }, 1500); })
    .catch(function (e) { document.querySelectorAll('#modal-box .btn').forEach(function (b) { b.disabled = false; }); syncErr(e); });
});
App.act('d-export', function () {
  if (!Debts.rows.length) { toast(L('لا ديون للتصدير', 'Aucune dette'), 'err'); return; }
  var data = Debts.rows.map(function (d) { var s = DEBT_ST[d.status];
    return { Assure: d.name, Matricule: d.plate, 'N°Police': d.police, Attestation: d.att, Groupe: d.group, MARQUE: d.brand, Nature: d.nature, Du: d.du, Au: d.au, 'Date op': d.dateOp,
      'Prime Totale': d.prime, Solde: d.solde, Paye: dPaid(d), Reste: dRest(d), Telephone: d.phone || '', Statut: s ? s[2] : '', Promesse: d.promise || '', Note: d.note || '' }; });
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Dettes');
  XLSX.writeFile(wb, 'renewpro_dettes_' + todayISO() + '.xlsx');
});

/* ───────── دفتر الهواتف الدائم (بوليصة ← هاتف): يبقى بعد كل استيراد ───────── */
var Phones = { map: {}, unsub: null };
Phones.start = function () { if (Phones.unsub || !FB.db) return;
  Phones.unsub = Meta.col().doc('phones').onSnapshot(function (doc) { var m = {}; if (doc.exists) { try { m = JSON.parse(doc.data().j || '{}'); } catch (e) { } } Phones.map = m; App.refresh(); }, function () { }); };
Phones.get = function (police, plate) { return Phones.map[kPol(police, plate)] || ''; };
Phones.save = function () { if (Meta.denied) return; Meta.col().doc('phones').set({ k: 'phones', j: JSON.stringify(Phones.map) }).catch(function (e) { console.warn('phones', e); }); };
Phones.set = function (police, plate, phone) { var k = kPol(police, plate); if (!k) return; if (phone) Phones.map[k] = phone; else delete Phones.map[k]; Phones.save(); };
/* يتعلّم الهواتف من لائحة التجديد الحالية */
Phones.learnFromContacts = function () { var ch = 0;
  Contacts.list.forEach(function (c) { if (c.deleted || !c.phone) return; var k = kPol(polFull(c), c.plate); if (k && Phones.map[k] !== c.phone) { Phones.map[k] = c.phone; ch++; } });
  if (ch) Phones.save(); return ch; };
App.on('login', function () { Phones.start(); });
App.on('logout', function () { if (Phones.unsub) { try { Phones.unsub(); } catch (e) { } } Phones.unsub = null; Phones.map = {}; });

/* ───────── الرسائل ───────── */
TMPL.debt_ar = 'السلام عليكم [الاسم]،\n\nنحيطكم علماً بأن المبلغ المتبقي في ذمتكم لدى وكالتنا هو [الدين] درهم.\n[التفاصيل]\n\nنرجو التكرم بتسوية الوضعية في أقرب وقت ممكن.\nمع الشكر على تعاونكم.\n\nEUR ASSURANCES';
TMPL.debt_fr = 'Bonjour [الاسم],\n\nNous vous informons que le montant restant dû auprès de notre agence est de [الدين] DH.\n[التفاصيل]\n\nNous vous prions de bien vouloir régulariser votre situation dans les meilleurs délais.\nMerci pour votre collaboration.\n\nEUR ASSURANCES';
TMPL.combo_ar = 'كما نذكّركم بأن المبلغ المتبقي في ذمتكم هو [الدين] درهم، نرجو تسويته عند التجديد.';
TMPL.combo_fr = 'Nous vous rappelons également qu\'un solde de [الدين] DH reste dû ; merci de le régulariser lors du renouvellement.';
function debtDetail(lines, name) {
  var fr = msgLang() === 'fr', me = gKey(name);
  if (lines.length === 1 && (!lines[0].name || gKey(lines[0].name) === me)) { var d = lines[0], p = [];
    if (d.plate) p.push((fr ? 'Immatriculation ' : 'اللوحة ') + ltrWrap(d.plate)); if (d.police) p.push((fr ? 'Police ' : 'البوليصة ') + ltrWrap(d.police));
    return p.length ? '(' + p.join(' — ') + ')' : ''; }
  return lines.map(function (d) { var who = (d.name && gKey(d.name) !== me) ? ' (' + String(d.name).trim() + ')' : '';
    return '• ' + ltrWrap(d.plate || d.police || '—') + (d.plate && d.police ? ' — ' + ltrWrap(d.police) : '') + who + ' : ' + money(dRest(d)); }).join('\n');
}
function debtFill(tmpl, name, lines) {
  var total = lines.reduce(function (s, d) { return s + dRest(d); }, 0), f = lines[0] || {}, det = debtDetail(lines, name);
  var map = { 'الاسم': name || '', 'Nom': name || '', 'الدين': money(total), 'Dette': money(total), 'التفاصيل': det, 'Details': det, 'عدد': String(lines.length), 'Nb': String(lines.length),
    'اللوحة': ltrWrap(f.plate || ''), 'Immat': ltrWrap(f.plate || ''), 'البوليصة': ltrWrap(f.police || ''), 'Police': ltrWrap(f.police || '') };
  var msg = tmpl; for (var k in map) msg = msg.split('[' + k + ']').join(map[k]);
  if (msgLang() === 'fr') msg = msg.replace(/\u00A0/g, ' ');
  return msg.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function debtText(name, lines) { return debtFill(tmplGet('debt'), name, lines); }
/* رسالة مشتركة: تذكير التجديد + فقرة الدين قبل التوقيع */
function comboText(c, lines) {
  var base = fillMsg(tmplGet('renew'), c), add = debtFill(tmplGet('combo'), c.name, lines), parts = base.split(/\n\n+/), last = parts[parts.length - 1] || '';
  if (parts.length > 2 && last.length <= 40 && last.indexOf('[') < 0) { parts.splice(parts.length - 1, 0, add); return parts.join('\n\n'); }
  return base + '\n\n' + add;
}
function markSent(lines) { var now = new Date().toISOString(); lines.forEach(function (d) { d.lastMsg = now; d.lastMsgBy = App.user.name; }); Debts.commit(lines.map(function (d) { return d.id; })); }
/* أنواع رسائل إضافية لزبون التجديد المدين: «رسالة الدين» و«تجديد + دين» */
App.hook('msg.kinds', function (c) {
  var lines = msgLines(debtsOf(c)); if (!lines.length) return [];
  return [
    { id: 'debt', label: '💰 ' + L('رسالة الدين', 'Message dette') + ' — ' + money(lines.reduce(function (s, d) { return s + dRest(d); }, 0)), text: function () { return debtText(c.name, lines); }, onSent: function () { markSent(lines); } },
    { id: 'both', label: '🔄 + 💰 ' + L('تجديد + دين', 'Renouvellement + dette'), text: function () { return comboText(c, lines); }, onSent: function () { markSent(lines); } }
  ];
});

/* ───────── داخل بطاقة الزبون وجلسة الاتصال ───────── */
function amtHTML(x) { return (x.own > 0.005 || x.grp <= 0.005 ? moneyH(x.own, 1) : '') + (x.grp > 0.005 ? ' <small>' + (x.own > 0.005 ? '+ ' : '') + '👥 ' + moneyH(x.grp) + '</small>' : ''); }
function lineHTML(x, cid) { var d = x.d, per = (d.du || d.au) ? (fmtD(d.du) || '…') + ' → ' + (fmtD(d.au) || '…') : '';
  return '<div class="dl"><div class="dl-m"><b>' + ltr(d.plate || '—') + (d.police ? ' · ' + ltr(d.police) : '') + '</b>'
    + (x.cur ? ' <span class="tag cyan">' + L('الفترة الحالية', 'période en cours') + '</span>' : '') + (x.kind === 'plate' ? ' <span class="tag amber">⚠ ' + L('باللوحة فقط', 'plaque seule') + '</span>' : '')
    + '<small>' + esc([(x.kind !== 'contract') ? d.name : '', d.nature, d.brand, per].filter(Boolean).join(' · ')) + '</small></div>'
    + '<b class="dl-a">' + moneyH(x.rest) + '</b>'
    + (x.kind !== 'contract' && cid ? '<button class="x sm" data-act="d-excl" data-c="' + esc(cid) + '" data-id="' + esc(d.id) + '" title="' + L('استبعاد', 'Exclure') + '">✕</button>' : '') + '</div>';
}
function debtBox(c) {
  if (!Debts.rows.length || !debtOn()) return '';
  var info = debtsOf(c); if (!info.lines.length) return '<div class="dbox ok">✅ ' + L('لا ديون على هذا الزبون', 'Aucune dette pour ce client') + '</div>';
  var nOwn = info.lines.filter(function (x) { return x.kind !== 'group'; }).length || info.lines.length;
  var last = info.lines.map(function (x) { return x.d.lastMsg || ''; }).sort().pop();
  var secs = [['contract', L('دين هذا العقد', 'Dette de ce contrat')], ['group', L('ديون المجموعة', 'Dettes du groupe')], ['plate', L('مطابقة باللوحة', 'Par plaque')]];
  return '<div class="dbox' + (Debts.boxOpen ? ' open' : '') + '">'
    + '<button class="dbox-h" data-act="d-toggle"><span>💰 ' + L('الدين المتبقي', 'Dette restante') + (nOwn > 1 ? ' · ' + nOwn : '') + ' <i>▾</i></span><b>' + amtHTML(info) + '</b></button>'
    + '<div class="dbox-b">'
      + secs.map(function (s) { var ls = info.lines.filter(function (x) { return x.kind === s[0]; }); if (!ls.length) return '';
          var gname = s[0] === 'group' ? ' — ' + esc(ls.map(function (x) { return rowGroups(x.d).filter(function (g) { return !grpOff(g); })[0] || ''; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).join(' · ')) : '';
          return '<div class="dsec"><span>' + s[1] + gname + '</span><b>' + moneyH(ls.reduce(function (a, x) { return a + x.rest; }, 0)) + '</b></div>' + ls.map(function (x) { return lineHTML(x, c.id); }).join(''); }).join('')
      + (info.grp > 0.005 ? '<label class="chk"><input type="checkbox" data-inp="d-inclgrp"' + (Debts.inclGrp ? ' checked' : '') + '><span>' + L('ضمّ ديون المجموعة في الرسالة', 'Inclure les dettes du groupe dans le message') + '</span></label>' : '')
      + (info.loose ? '<div class="hint">⚠ ' + L('بطاقة بلا بوليصة: الربط باللوحة فقط — تحقّق قبل الإرسال.', 'Fiche sans police : lien par plaque seule.') + '</div>' : '')
      + (last ? '<div class="hint">📨 ' + L('آخر رسالة دين: ', 'Dernier message dette : ') + relTime(last) + '</div>' : '')
      + '<div class="hint">' + L('لإرسال رسالة الدين: زر واتساب أو SMS أعلاه، ثم اختر «رسالة الدين» أو «تجديد + دين».', 'Pour envoyer : bouton WhatsApp ou SMS ci-dessus, puis « Message dette » ou « Renouvellement + dette ».') + '</div>'
      + '<button class="btn green wide" data-act="d-sheet-c" data-id="' + esc(c.id) + '">💵 ' + L('الدفعات والمتابعة', 'Paiements & suivi') + '</button>'
    + '</div></div>';
}
/* ───────── من جدّد فعلاً حسب ملف العمليات ─────────
   إن كانت آخر عملية على البوليصة تنتهي بعد تاريخ الانتهاء المكتوب في لائحة التجديد، فالزبون جدّد ولا داعي للاتصال به. */
function opsRenewedList() {
  if (!debtOn() || !Debts.map.pp) return [];
  return Contacts.list.filter(function (c) { if (c.deleted || c.renewed || c.noAuto || !c.dateE) return false;
    var p = Debts.map.pp[kPol(polFull(c), c.plate)]; return !!p && p[2] > addDays(c.dateE, 5); });
}
function opsRenewedPrompt(auto) {
  if (!App.user.admin) return; var list = opsRenewedList();
  if (!list.length) { if (!auto) toast(L('لا أحد: لا عملية أحدث من لائحة التجديد', 'Personne : aucune opération plus récente')); return; }
  Modal.open(Modal.head('✅ ' + L('جدّدوا فعلاً', 'Déjà renouvelés'))
    + '<div class="box green"><b>' + list.length + '</b> ' + L('زبون في لائحة التجديد لهم في ملف العمليات عملية أحدث (عقدهم ممدَّد إلى ما بعد تاريخ الانتهاء في اللائحة).', 'clients de la liste ont une opération plus récente dans le fichier des opérations (contrat déjà prolongé).') + '</div>'
    + '<div class="lines">' + list.slice(0, 40).map(function (c) { var p = Debts.map.pp[kPol(polFull(c), c.plate)];
        return '<div class="line"><div><b>' + esc(c.name || '—') + '</b><small>' + L('في اللائحة: ', 'liste : ') + fmtD(c.dateE) + ' · ' + L('في العمليات حتى: ', 'opérations jusqu\'au : ') + fmtD(p[2]) + '</small></div><b>' + moneyH(p[0]) + '</b></div>'; }).join('')
      + (list.length > 40 ? '<div class="hint">+ ' + (list.length - 40) + '</div>' : '') + '</div>'
    + '<button class="btn pri wide" data-act="d-ops-apply">✅ ' + L('تعليمهم «تم التجديد» (يخرجون من قوائم الاتصال)', 'Les marquer « renouvelés »') + '</button>'
    + '<button class="btn wide" data-act="modal-close">' + L('ليس الآن', 'Pas maintenant') + '</button>');
}
App.act('d-ops-check', function () { Modal.close(); opsRenewedPrompt(false); });
App.act('d-ops-apply', function () {
  var list = opsRenewedList(), now = new Date().toISOString();
  FB.batches(list.map(function (c) { var p = Debts.map.pp[kPol(polFull(c), c.plate)];
    return { ref: Contacts.col().doc(c.id), upd: { renewed: true, followup: false, renewedVia: 'ops', renewedAt: now, renewedBy: App.user.name, renewAmount: p[0], renewUntil: p[2] } }; }))
    .then(function () { Modal.close(); toast('✅ ' + L('عُلّم ' + list.length + ' زبون «تم التجديد»', list.length + ' clients marqués renouvelés')); }).catch(syncErr);
});
App.on('renew.imported', function () { setTimeout(function () { opsRenewedPrompt(true); }, 1500); });

/* في الجلسة: آخر قسط دفعه الزبون على هذه البوليصة (ملف التجديد لا يحمل السعر) */
App.hook('session.info', function (c) { var p = Debts.map.pp && Debts.map.pp[kPol(polFull(c), c.plate)]; if (!p || !debtOn()) return '';
  return '<div class="s-price">💵 ' + L('آخر قسط: ', 'Dernière prime : ') + '<b>' + moneyH(p[0], 1) + '</b>' + (p[1] && p[2] ? ' <small class="muted">' + fmtD(p[1]).slice(0, 5) + ' → ' + fmtD(p[2]) + '</small>' : '') + '</div>'; });
App.hook('contact.blocks', function (c) { if (!(c.renewed && c.renewedVia === 'ops')) return '';
  return '<div class="dbox ok">✅ ' + L('جدّد — حسب ملف العمليات', 'Renouvelé — d\'après le fichier des opérations') + (c.renewUntil ? ' · ' + L('حتى ', 'jusqu\'au ') + fmtD(c.renewUntil) : '') + (c.renewAmount ? ' · ' + moneyH(c.renewAmount, 1) : '') + '</div>'; });
App.hook('contact.blocks', function (c) { return debtInCard() ? debtBox(c) : ''; });
App.hook('session.blocks', function (c) { return debtInSess() ? debtBox(c) : ''; });
App.hook('contact.chips', function (c) { if (!Debts.rows.length || !debtOn()) return ''; var x = debtsOf(c);
  return (x.own > 0.005 ? '<span class="mini red">💰' + money(x.own) + '</span>' : '') + (x.grp > 0.005 ? '<span class="mini red">👥</span>' : ''); });
App.hook('renew.filters', function () { return (Debts.rows.length && debtOn()) ? [{ id: 'debt', label: L('💰 عليهم دين', '💰 Avec dette'), test: function (c) { return debtsOf(c).total > 0.005; } }] : []; });
App.act('d-toggle', function (el) { var b = el.closest('.dbox'); Debts.boxOpen = !b.classList.contains('open'); b.classList.toggle('open', Debts.boxOpen); });
App.input('d-inclgrp', function (el) { Debts.inclGrp = el.checked; });
App.act('d-excl', function (el) {
  if (!confirm(L('استبعاد هذا السطر من دين هذا الزبون؟', 'Exclure cette ligne de la dette de ce client ?'))) return;
  Contacts.update(el.dataset.c, { debtExcl: FB.FV.arrayUnion(el.dataset.id) });
});

/* ───────── العقود المدينة (قسم الديون) ───────── */
function debtGroups() {
  var p2c = Object.create(null);
  Contacts.list.forEach(function (c) { if (c.deleted) return; var k = kPol(polFull(c), c.plate); if (k && !p2c[k]) p2c[k] = c; });
  var map = Object.create(null), arr = [];
  Debts.rows.forEach(function (d) { var kp = kPol(d.police, d.plate), key = kp ? 'P:' + kp : (kPlate(d.plate) ? 'M:' + kPlate(d.plate) : 'D:' + d.id);
    var g = map[key]; if (!g) { g = map[key] = { key: key, gid: 'g' + dHash(key), kp: kp, name: String(d.name || '—').trim(), pol: String(d.police || '').trim(), lines: [], total: 0, age: null, grps: [], contact: p2c[kp] || null }; arr.push(g); }
    g.lines.push(d); var r = dRest(d); g.total += r;
    rowGroups(d).forEach(function (x) { if (g.grps.indexOf(x) < 0) g.grps.push(x); });
    if (r > 0.005) { var ag = dAge(d); if (ag != null && (g.age == null || ag > g.age)) g.age = ag; } });
  arr.forEach(function (g) { var c = g.contact, f = g.lines.filter(function (d) { return d.phone || d.status || d.note || d.promise; })[0] || {};
    g.total = Math.round(g.total * 100) / 100;
    g.phone = (c && c.phone) || g.lines.map(function (d) { return d.phone; }).filter(Boolean)[0] || (g.kp ? Phones.map[g.kp] : '') || (typeof pfFind === 'function' ? pfFind(g.lines[0].police, g.lines[0].plate).p1 : '') || '';
    g.status = f.status || ''; g.note = f.note || ''; g.promise = f.promise || '';
    g.lastMsg = g.lines.map(function (d) { return d.lastMsg || ''; }).sort().pop() || ''; g.hdl = g.lines.map(function (d) { return d.hdl || ''; }).sort().pop() || ''; });
  return arr;
}
function debtGroup(gid) { return debtGroups().filter(function (g) { return g.gid === gid; })[0] || null; }
function debtOpen(g) { return g.lines.filter(function (d) { return dRest(d) > 0.005; }); }
function debtFiltered(groups) {
  var q = Debts.q.toLowerCase().trim(), td = todayISO();
  return (groups || debtGroups()).filter(function (g) {
    if (g.total <= 0.005) return false;
    if (Debts.f === 'handled' && !g.hdl) return false; if (Debts.f === 'todo' && g.hdl) return false;
    if (Debts.f === 'nophone' && g.phone) return false; if (Debts.f === 'phone' && !g.phone) return false;
    if (Debts.f === 'due' && !(g.promise && g.promise <= td)) return false; if (Debts.f === 'promise' && g.status !== 'promise') return false;
    if (Debts.f === 'old' && !(g.age != null && g.age > 90)) return false;
    if (Debts.f === 'renew' && !g.contact) return false;
    if (Debts.g && g.grps.indexOf(Debts.g) < 0) return false;
    if (q && [g.name, g.phone].concat(g.lines.map(function (d) { return [d.plate, d.police, d.att, d.group, d.brand].join(' '); })).join(' ').toLowerCase().indexOf(q) < 0) return false;
    return true; }).sort(function (a, b) { return b.total - a.total; });
}
function debtStats(groups) { var t = 0, n = 0, due = 0, hd = 0, td = todayISO();
  (groups || debtGroups()).forEach(function (g) { if (g.total <= 0.005) return; n++; t += g.total; if (g.promise && g.promise <= td) due++; if (g.hdl) hd++; });
  return { n: n, total: t, due: due, hdl: hd, ops: Debts.rows.length }; }
function debtRow(g) { var td = todayISO(), st = DEBT_ST[g.status];
  return '<div class="row debt-row" data-act="d-sheet-g" data-id="' + g.gid + '"><div class="row-main">'
    + '<div class="row-name">' + esc(g.name) + (st ? ' <span class="mini" style="color:' + st[3] + '">' + st[0] + '</span>' : '') + (g.hdl ? '<span class="mini green">✔</span>' : '') + (g.contact ? '<span class="mini">🔄</span>' : '') + (g.note ? '<span class="mini">📝</span>' : '') + '</div>'
    + '<div class="row-sub">' + (g.phone ? ltr(g.phone) : '<i class="amber-t">' + L('بلا هاتف', 'sans tél.') + '</i>') + (g.pol ? ' · ' + ltr(g.pol) : '')
      + (g.age != null ? ' · ' + ageLabel(g.age) : '') + (g.promise ? ' · 🤝 <span class="' + (g.promise <= td ? 'red-t' : '') + '">' + fmtD(g.promise) + '</span>' : '') + '</div></div>'
    + '<div class="row-side"><b class="red-t">' + moneyH(g.total) + '</b></div>'
    + '<div class="row-acts">' + (g.phone ? '<a class="ib call" href="' + telHref(g.phone) + '" data-act="r-stop">📞</a><button class="ib wa" data-act="d-send" data-ch="wa" data-id="' + g.gid + '">💬</button>' : '') + '</div></div>';
}
function renderDebts(el) {
  if (!Debts.ready) { el.innerHTML = '<div class="empty">⏳ ' + L('جارٍ تحميل الديون…', 'Chargement…') + '</div>'; if (!Debts.unsub) Debts.start(); return; }
  if (Debts.denied) { el.innerHTML = '<div class="page narrow">' + rulesBoxHTML() + '</div>'; return; }
  var adm = App.user.admin;
  var tools = '<div class="acts2 d-tools">' + (adm ? '<button class="btn pri" data-act="d-import">📥 ' + L('تحميل ملف الديون', 'Importer les dettes') + '</button>' : '')
    + '<button class="btn" data-act="d-menu">⋯ ' + L('المزيد', 'Plus') + '</button></div>';
  if (!Debts.rows.length) { el.innerHTML = '<div class="page">' + '<div class="empty"><div class="empty-ic">💰</div><b>' + L('لم تُحمَّل لائحة الديون بعد', 'Aucune liste de dettes') + '</b>'
      + '<span>' + L('حمّل ملف العمليات المصدَّر من برنامج الشركة (فيه عمود Solde).', 'Importez le fichier des opérations (colonne Solde).') + '</span></div>' + (adm ? tools : '') + '</div>'; return; }
  var sh = $('d-shell');
  if (!sh || sh.dataset.lang !== App.lang) {
    el.innerHTML = '<div class="page" id="d-shell" data-lang="' + App.lang + '"><div id="d-top"></div>' + tools
      + '<div class="bar"><div class="search"><span>🔍</span><input id="d-q" data-inp="d-q" autocomplete="off" placeholder="' + L('الاسم، اللوحة، البوليصة، الهاتف…', 'Nom, immat., police, tél.…') + '" value="' + esc(Debts.q) + '"></div>'
        + '<button class="btn pri" id="d-sess" data-act="ds-start"></button></div>'
      + '<div class="chips" id="d-chips"></div><div id="d-list"></div></div>';
  }
  debtsFill();
}
function debtsFill() {
  var box = $('d-list'); if (!box) return;
  var adm = App.user.admin, groups = debtGroups(), st = debtStats(groups), list = debtFiltered(groups), todo = list.filter(function (g) { return !g.hdl; }).length;
  var pills = [['all', L('الكل', 'Tous')], ['phone', L('بهاتف', 'Avec tél.')], ['nophone', L('بلا هاتف', 'Sans tél.')], ['due', '⏰ ' + L('وعود مستحقة', 'Promesses dues') + (st.due ? ' ' + st.due : '')],
    ['promise', '🤝 ' + L('وعد بالدفع', 'Promesse')], ['old', L('+90 يوم', '+90 j')], ['renew', '🔄 ' + L('في التجديد', 'En renouv.')], ['handled', '✔ ' + L('انتهيت منهم', 'Terminés') + (st.hdl ? ' ' + st.hdl : '')]];
  $('d-top').innerHTML = (Debts.legacy && adm ? '<div class="box red">⚠ ' + L('لائحة الديون بالصيغة القديمة: أعد تحميل ملف العمليات.', 'Ancien format : réimportez le fichier des opérations.') + '</div>' : '')
    + '<div class="stats3"><div><b class="red-t">' + moneyH(st.total, 1) + '</b><span>' + L('مجموع الديون', 'Dette totale') + '</span></div><div><b>' + st.n + '</b><span>' + L('عقد مدين', 'contrats') + '</span></div><div><b>' + st.ops + '</b><span>' + L('عملية', 'opérations') + '</span></div></div>';
  var sb = $('d-sess'); sb.disabled = !todo; sb.innerHTML = '▶ ' + L('جلسة', 'Session') + ' <b>' + todo + '</b>';
  $('d-chips').innerHTML = pills.map(function (p) { return '<button class="chip' + (Debts.f === p[0] ? ' on' : '') + '" data-act="d-filter" data-f="' + p[0] + '">' + p[1] + '</button>'; }).join('');
  box.innerHTML = '<button class="btn wide grp-btn' + (Debts.g ? ' on' : '') + '" data-act="d-grp">👥 ' + (Debts.g ? esc(Debts.g) : L('كل المجموعات', 'Tous les groupes')) + ' ▾</button>'
    + (Debts.f === 'handled' && list.length ? '<button class="btn wide" data-act="d-restore-all">↩ ' + L('إرجاع الكل إلى الجلسة', 'Tout remettre en session') + '</button>' : '')
    + '<div class="list-head"><span>' + list.length + ' ' + L('عقد', 'contrats') + ' · ' + moneyH(list.reduce(function (s, g) { return s + g.total; }, 0), 1) + '</span></div>'
    + (list.length ? '<div class="rows">' + list.slice(0, Debts.limit).map(debtRow).join('') + '</div>'
        + (list.length > Debts.limit ? '<button class="btn wide" data-act="d-more">▼ ' + L('عرض المزيد', 'Afficher plus') + ' (' + (list.length - Debts.limit) + ')</button>' : '')
      : '<div class="empty"><div class="empty-ic">🔍</div><b>' + L('لا نتائج', 'Aucun résultat') + '</b></div>');
  var inp = $('d-q'); if (inp && document.activeElement !== inp && inp.value !== Debts.q) inp.value = Debts.q;
}
App.input('d-q', debounce(function (el) { Debts.q = el.value; Debts.limit = 60; debtsFill(); }, 140));
App.act('d-filter', function (el) { Debts.f = el.dataset.f; Debts.limit = 60; App.render(); });
App.act('d-more', function () { Debts.limit += 100; App.render(); });
App.act('d-menu', function () {
  Modal.open(Modal.head('💰 ' + L('الديون', 'Dettes')) + '<div class="menu">'
    + '<button class="menu-i" data-act="d-export">📤 ' + L('تصدير الديون إلى Excel', 'Exporter les dettes (Excel)') + '</button>'
    + (App.user.admin ? '<button class="menu-i" data-act="d-ops-check">✅ ' + L('من جدّد فعلاً حسب ملف العمليات', 'Déjà renouvelés d\'après les opérations') + ' (' + opsRenewedList().length + ')</button>' : '')
    + (App.canUp() ? '<button class="menu-i" data-act="ph-import">📱 ' + L('تحميل دفتر هواتف (Excel: بوليصة + هاتف)', 'Importer un répertoire (Excel : police + tél.)') + '</button>'
      + '<button class="menu-i" data-act="ph-learn">📱 ' + L('أخذ الهواتف من لائحة التجديد', 'Reprendre les téléphones de la liste de renouvellement') + '</button>'
      + '<button class="menu-i" data-act="d-clear">🗑️ ' + L('حذف لائحة الديون', 'Supprimer la liste des dettes') + '</button>' : '')
    + '</div><div class="hint">' + L('دفتر الهواتف: ', 'Répertoire : ') + Object.keys(Phones.map).length + ' ' + L('رقم محفوظ', 'numéros') + '</div>', 'small');
});
App.act('ph-learn', function () { var n = Phones.learnFromContacts(); Modal.close(); toast(L('📱 حُفظ ' + n + ' رقم جديد', '📱 ' + n + ' numéros ajoutés')); });
App.act('ph-import', function () { Modal.close(); var f = $('file-in'); f.value = ''; f.dataset.inp = 'ph-file'; f.click(); });
App.input('ph-file', function (el) {
  var file = el.files && el.files[0]; if (!file) return; var rd = new FileReader();
  rd.onload = function (e) { try {
    var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    var hdr = (rows[0] || []).map(normH), find = function (keys) { for (var i = 0; i < hdr.length; i++) { for (var j = 0; j < keys.length; j++) { if (hdr[i].indexOf(keys[j]) >= 0) return i; } } return -1; };
    var iPol = find(['police', 'بوليص']), iPh = find(['telephone', 'tel', 'gsm', 'mobile', 'phone', 'هاتف']), iPl = find(['matricul', 'immat', 'لوحة']);
    if (iPol < 0 || iPh < 0) { toast(L('الملف يحتاج عمودين: البوليصة والهاتف', 'Il faut 2 colonnes : police et téléphone'), 'err'); return; }
    var n = 0; for (var r = 1; r < rows.length; r++) { var k = kPol(xCell(rows[r], iPol), iPl >= 0 ? xCell(rows[r], iPl) : ''), ph = xPhone(rows[r][iPh]); if (k && ph) { Phones.map[k] = ph; n++; } }
    Phones.save(); App.refresh(); toast(L('📱 حُفظ ' + n + ' رقم', '📱 ' + n + ' numéros enregistrés'));
  } catch (err) { toast(err.message, 'err'); } };
  rd.readAsArrayBuffer(file);
});
App.act('d-clear', function () {
  if (!App.user.admin || !confirm(L('حذف لائحة الديون كاملة عند كل المستخدمين؟', 'Supprimer toutes les dettes pour tous ?'))) return;
  FB.batches(Debts.docIds.filter(function (id) { return id !== 'x_cfg'; }).map(function (id) { return { del: 1, ref: Debts.col().doc(id) }; })).then(function () { Modal.close(); toast(L('🗑️ حُذفت الديون', '🗑️ Dettes supprimées')); }).catch(syncErr);
});
function grpOptions() { var o = {}; debtGroups().forEach(function (g) { if (g.total <= 0.005) return; g.grps.forEach(function (x) { var e = o[x] || (o[x] = { g: x, n: 0, t: 0 }); e.n++; e.t += g.total; }); });
  return Object.keys(o).map(function (k) { return o[k]; }).sort(function (a, b) { return b.t - a.t; }); }
App.act('d-grp', function () { var gs = grpOptions();
  Modal.open(Modal.head('👥 ' + L('فلترة بالمجموعة', 'Filtrer par groupe'))
    + '<div class="lines tall"><div class="line pick" data-act="d-setgrp" data-i="-1"><div><b>' + L('كل المجموعات', 'Tous les groupes') + '</b></div>' + (Debts.g ? '' : '<b class="cyan-t">✓</b>') + '</div>'
    + gs.map(function (x, i) { return '<div class="line pick" data-act="d-setgrp" data-i="' + i + '"><div><b>' + esc(x.g) + '</b><small>' + x.n + ' ' + L('عقد', 'contrats') + (grpOff(x.g) ? ' · ' + L('غير مستعملة للربط', 'non liée') : '') + '</small></div><b class="red-t">' + moneyH(x.t) + '</b></div>'; }).join('') + '</div>');
});
App.act('d-setgrp', function (el) { var gs = grpOptions(), i = +el.dataset.i; Debts.g = (i >= 0 && gs[i]) ? gs[i].g : ''; Debts.limit = 60; Modal.close(); App.render(); });
function debtSend(g, ch) {
  var lines = debtOpen(g); if (!lines.length) { toast(L('لا دين متبقٍّ', 'Aucune dette restante'), 'err'); return false; }
  if (!g.phone) { toast(L('أدخل رقم الهاتف أولاً', 'Saisissez le téléphone'), 'err'); return false; }
  markSent(lines); toast((ch === 'wa' ? '🟢 WhatsApp — ' : '✉️ SMS — ') + g.name);
  var txt = debtText(g.name, lines); if (ch === 'wa') window.open(waUrl(g.phone, txt), '_blank'); else window.location.href = smsUrl(g.phone, txt);
  return true;
}
App.act('d-send', function (el) { var g = debtGroup(el.dataset.id); if (!g) return; if (!g.phone) { openDebtSheet({ gid: g.gid }); return; } debtSend(g, el.dataset.ch); });

/* ───────── ورقة الدين: السطور، الدفعات، المتابعة ───────── */
function debtCtx() {
  var x = Debts.ctx; if (!x) return null;
  if (x.cid) { var c = Contacts.get(x.cid); if (!c) return null; var info = debtsOf(c), ls = info.lines.map(function (l) { return l.d; }), f = ls.filter(function (d) { return d.status || d.note || d.promise; })[0] || {};
    var ix = debtIndex(), lk = contactLink(c), seen = {}; ls.forEach(function (d) { seen[d.id] = 1; });
    [ix.pol[lk.kp], ix.att[lk.ka]].forEach(function (a) { (a || []).forEach(function (d) { if (!seen[d.id] && (d.payments || []).length) { seen[d.id] = 1; ls.push(d); } }); });
    return { name: c.name || '—', lines: ls, phone: c.phone || '', hasContact: true, status: f.status || '', note: f.note || '', promise: f.promise || '' }; }
  var g = debtGroup(x.gid); if (!g) return null;
  return { name: g.name, lines: g.lines, phone: g.phone, hasContact: !!g.contact, gid: g.gid, kp: g.kp, status: g.status, note: g.note, promise: g.promise };
}
function openDebtSheet(ctx) { Debts.ctx = ctx; renderDebtSheet(); }
function renderDebtSheet() {
  var x = debtCtx(); if (!x) { Modal.close(); return; }
  var total = x.lines.reduce(function (s, d) { return s + dRest(d); }, 0), me = gKey(x.name);
  Modal.open('<div id="dsheet"></div>' + Modal.head('💰 ' + esc(x.name))
    + '<div class="kv"><span>' + L('الدين المتبقي', 'Dette restante') + '</span><b class="red-t">' + moneyH(total, 1) + '</b></div>'
    + x.lines.map(function (d) { var per = (d.du || d.au) ? (fmtD(d.du) || '…') + ' → ' + (fmtD(d.au) || '…') : '', paid = dPaid(d), r = dRest(d);
        return '<div class="dop' + (r <= 0.005 ? ' paid' : '') + '"><div class="dl"><div class="dl-m"><b>' + ltr(d.plate || '—') + (d.police ? ' · ' + ltr(d.police) : '') + '</b>'
          + '<small>' + esc([(d.name && gKey(d.name) !== me) ? d.name : '', d.nature, d.brand, per].filter(Boolean).join(' · ')) + '</small></div><b class="dl-a">' + (r <= 0.005 ? '✅' : moneyH(r)) + '</b></div>'
          + (paid > 0 ? '<div class="hint">' + L('الرصيد الأصلي ', 'Solde initial ') + money(d.solde) + ' · ' + L('مدفوع ', 'payé ') + money(paid) + '</div>' : '')
          + (d.payments || []).map(function (p, pi) { return '<div class="dpay"><span>💵 ' + moneyH(p.amount) + ' · ' + fmtD(p.date) + (p.by ? ' · ' + esc(p.by) : '') + '</span><button class="x sm" data-act="d-delpay" data-id="' + esc(d.id) + '" data-i="' + pi + '">✕</button></div>'; }).join('')
          + (r > 0.005 ? '<div class="pay-in"><input class="inp" inputmode="decimal" dir="ltr" placeholder="' + L('مبلغ الدفعة', 'Montant payé') + '" id="pay-' + esc(d.id) + '"><button class="btn green" data-act="d-addpay" data-id="' + esc(d.id) + '">＋ ' + L('دفعة', 'Paiement') + '</button></div>' : '')
          + '</div>'; }).join('')
    + '<div class="box"><div class="sec-t">📝 ' + L('متابعة التحصيل', 'Suivi du recouvrement') + '</div>'
      + (x.hasContact ? '<div class="hint">📱 ' + ltr(x.phone || '—') + ' · ' + L('من لائحة التجديد', 'depuis la liste de renouvellement') + '</div>'
          : '<label class="f"><span>' + L('الهاتف', 'Téléphone') + '</span><input id="ds-phone" type="tel" dir="ltr" placeholder="06XXXXXXXX" value="' + esc(x.phone) + '"></label>')
      + '<div class="lbl">' + L('حالة التواصل', 'Statut') + '</div><div class="chips wrap" id="ds-status">'
        + [''].concat(Object.keys(DEBT_ST)).map(function (k) { return '<button class="chip' + (x.status === k ? ' on' : '') + '" data-act="ds-st" data-v="' + k + '">' + (k ? dStLabel(k) : '—') + '</button>'; }).join('') + '</div>'
      + '<label class="f inline"><span>' + L('تاريخ وعد الدفع (للتنبيه)', 'Date promise (alerte)') + '</span><input id="ds-promise" type="date" dir="ltr" value="' + esc(x.promise) + '"></label>'
      + '<label class="f inline"><span>' + L('ملاحظة', 'Note') + '</span><textarea id="ds-note" rows="2">' + esc(x.note) + '</textarea></label>'
      + '<button class="btn pri wide" data-act="ds-save">💾 ' + L('حفظ المتابعة', 'Enregistrer le suivi') + '</button></div>'
    + (x.gid ? '<div class="acts3">' + (x.phone ? '<a class="btn call" href="' + telHref(x.phone) + '">📞 ' + L('اتصال', 'Appel') + '</a>' : '<button class="btn" disabled>📞</button>')
        + '<button class="btn wa" data-act="ds-send" data-ch="wa">💬 ' + L('واتساب', 'WhatsApp') + '</button><button class="btn sms" data-act="ds-send" data-ch="sms">✉️ SMS</button></div>' : ''));
  renderDebtSheet._st = x.status;
}
App.act('d-sheet-c', function (el) { openDebtSheet({ cid: el.dataset.id }); });
App.act('d-sheet-g', function (el) { openDebtSheet({ gid: el.dataset.id }); });
App.act('ds-st', function (el) { renderDebtSheet._st = el.dataset.v; el.parentNode.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === el); }); });
function sheetApply() {
  var x = debtCtx(); if (!x || !$('ds-note')) return x;
  var patch = { status: renderDebtSheet._st || '', promise: $('ds-promise').value || '', note: $('ds-note').value.trim() }, ph = $('ds-phone');
  if (ph) { patch.phone = xPhone(ph.value); if (x.kp) Phones.set(x.lines[0].police, x.lines[0].plate, patch.phone); }
  var ids = []; x.lines.forEach(function (d) { var ch = false; for (var k in patch) { if ((d[k] || '') !== patch[k]) { d[k] = patch[k]; ch = true; } } if (ch) ids.push(d.id); });
  if (ids.length) Debts.commit(ids);
  return debtCtx();
}
App.act('ds-save', function () { sheetApply(); renderDebtSheet(); toast(L('💾 حُفظت المتابعة', '💾 Suivi enregistré')); });
App.act('ds-send', function (el) { var x = sheetApply(); if (!x || !x.gid) return; var g = debtGroup(x.gid); if (g && debtSend(g, el.dataset.ch)) Modal.close(); });
App.act('d-addpay', function (el) {
  var d = debtIndex().byId[el.dataset.id], inp = $('pay-' + el.dataset.id); if (!d || !inp) return;
  var n = Math.round(num(inp.value) * 100) / 100, rest = dRest(d);
  if (n <= 0) { toast(L('أدخل مبلغاً صحيحاً', 'Montant invalide'), 'err'); return; }
  if (n > rest + 0.005 && !confirm(L('المبلغ أكبر من المتبقي. تسجيله على أي حال؟', 'Montant supérieur au reste. Enregistrer quand même ?'))) return;
  sheetApply(); d.payments = (d.payments || []).concat([{ amount: n, date: todayISO(), by: App.user.name }]); Debts.commit([d.id]); renderDebtSheet(); toast(L('💵 سُجّلت الدفعة', '💵 Paiement enregistré'));
});
App.act('d-delpay', function (el) {
  var d = debtIndex().byId[el.dataset.id], pi = +el.dataset.i; if (!d || !(d.payments || [])[pi] || !confirm(L('حذف هذه الدفعة؟', 'Supprimer ce paiement ?'))) return;
  sheetApply(); d.payments = d.payments.filter(function (p, i) { return i !== pi; }); Debts.commit([d.id]); renderDebtSheet();
});
App.act('d-restore-all', function () { var ids = []; Debts.rows.forEach(function (d) { if (d.hdl) { d.hdl = ''; ids.push(d.id); } });
  if (!ids.length || !confirm(L('إرجاع كل المعالَجين إلى جلسة الديون؟', 'Remettre tous les traités en session ?'))) return; Debts.f = 'all'; Debts.commit(ids); });

/* ───────── جلسة تحصيل الديون (مستقلة عن جلسة التجديد) ───────── */
var DSession = {
  on: false, queue: [], pos: 0, done: 0,
  start: function () { var q = debtFiltered().filter(function (g) { return !g.hdl; });
    if (!q.length) { toast(L('لا أحد في هذه اللائحة', 'Personne dans cette liste'), 'err'); return; }
    DSession.on = true; DSession.queue = q.map(function (g) { return g.gid; }); DSession.pos = 0; DSession.done = 0; $('session').classList.add('on'); DSession.render(); },
  end: function () { DSession.on = false; $('session').classList.remove('on'); App.render(); },
  handled: function (gid, st) { if (!DSession.on) return; var i = DSession.queue.indexOf(gid); if (i < 0) return; var g = debtGroup(gid);
    if (g) { var now = new Date().toISOString(), ids = []; g.lines.forEach(function (d) { d.hdl = now; if (st) d.status = st; ids.push(d.id); }); Debts.commit(ids); }
    DSession.queue.splice(i, 1); if (i < DSession.pos) DSession.pos--; DSession.done++; DSession.render(); },
  render: function () {
    if (!DSession.on) return; var el = $('session'), n = DSession.queue.length;
    if (DSession.pos >= n) { el.innerHTML = '<div class="s-top"><button class="x" data-act="ds-end">✕</button></div><div class="s-end"><div class="empty-ic">🎉</div><b>' + L('انتهت الجلسة', 'Session terminée') + '</b><span>' + L('عالجت ' + DSession.done + ' عقد', DSession.done + ' contrats traités') + '</span><button class="btn pri" data-act="ds-end">' + L('إنهاء', 'Terminer') + '</button></div>'; return; }
    var gid = DSession.queue[DSession.pos], g = debtGroup(gid); if (!g || g.total <= 0.005) { DSession.queue.splice(DSession.pos, 1); DSession.render(); return; }
    var ls = debtOpen(g).sort(function (a, b) { return dRest(b) - dRest(a); });
    el.innerHTML = '<div class="s-top"><button class="x" data-act="ds-end" aria-label="close">✕</button><div class="s-prog"><i style="background:var(--red);width:' + (DSession.done / (DSession.done + n) * 100) + '%"></i></div><span class="s-count">' + (DSession.pos + 1) + '/' + n + '</span></div>'
      + '<div class="s-body"><div class="s-card"><span class="dc red">💰 ' + moneyH(g.total, 1) + (g.age != null ? ' · ' + ageLabel(g.age) : '') + '</span>'
        + '<div class="s-name">' + esc(g.name) + '</div><div class="s-meta">' + (g.pol ? ltr(g.pol) : '') + (g.grps[0] ? ' · 👥 ' + esc(g.grps[0]) : '') + (g.status ? ' · ' + dStLabel(g.status) : '') + '</div>'
        + (g.phone ? '<div class="s-phone">' + ltr(g.phone) + '</div>' : '<div class="s-nophone">' + L('بلا رقم هاتف — أضفه من «دفعة / متابعة»', 'Sans téléphone — ajoutez-le dans « Paiement / suivi »') + '</div>') + (g.note ? '<div class="s-note">📝 ' + esc(g.note) + '</div>' : '') + (g.lastMsg ? '<div class="s-last">📨 ' + relTime(g.lastMsg) + '</div>' : '') + '</div>'
        + '<div class="dbox open"><div class="dbox-b">' + ls.slice(0, 3).map(function (d) { return lineHTML({ d: d, kind: 'contract', rest: dRest(d), cur: false }); }).join('') + (ls.length > 3 ? '<div class="hint">+ ' + (ls.length - 3) + ' ' + L('عملية أخرى', 'autres opérations') + '</div>' : '') + '</div></div>'
        + (g.phone ? '<a class="btn call big" href="' + telHref(g.phone) + '">📞 ' + L('اتصال', 'Appeler') + '</a>' : '')
        + '<div class="acts3"><button class="btn wa" data-act="d-send" data-ch="wa" data-id="' + esc(gid) + '">💬 ' + L('واتساب', 'WhatsApp') + '</button><button class="btn sms" data-act="d-send" data-ch="sms" data-id="' + esc(gid) + '">✉️ SMS</button><button class="btn green" data-act="d-sheet-g" data-id="' + esc(gid) + '">💵 ' + L('دفعة / متابعة', 'Paiement / suivi') + '</button></div>'
        + '<div class="s-lbl">' + L('نتيجة الاتصال', 'Résultat') + '</div>'
        + '<div class="grid2">' + [['contacted', L('أجاب', 'Répondu')], ['promise', L('وعد بالدفع', 'Promesse')], ['noans', L('لم يجب', 'Sans rép.')], ['refus', L('رفض', 'Refus')]].map(function (r) { return '<button class="btn res" style="--c:' + DEBT_ST[r[0]][3] + '" data-act="ds-res" data-r="' + r[0] + '">' + DEBT_ST[r[0]][0] + ' ' + r[1] + '</button>'; }).join('') + '</div>'
        + '<div class="acts3 s-foot"><button class="btn" data-act="ds-prev"' + (DSession.pos > 0 ? '' : ' disabled') + '>→ ' + L('السابق', 'Préc.') + '</button><button class="btn" data-act="ds-skip">' + L('التالي', 'Suivant') + ' ←</button><button class="btn pri" data-act="ds-done">✔ ' + L('انتهيت', 'Terminé') + '</button></div></div>';
  }
};
App.act('ds-start', function () { DSession.start(); });
App.act('ds-end', function () { DSession.end(); });
App.act('ds-skip', function () { DSession.pos++; DSession.render(); });
App.act('ds-prev', function () { if (DSession.pos > 0) { DSession.pos--; DSession.render(); } });
/* نتيجة: تُسجَّل كحالة للعقد ويبقى أمامك؛ «انتهيت» هو الذي يُخرجه */
App.act('ds-res', function (el) { var gid = DSession.queue[DSession.pos], g = debtGroup(gid); if (!g) return; var r = el.dataset.r, ids = [];
  g.lines.forEach(function (d) { if (d.status !== r) { d.status = r; ids.push(d.id); } }); if (ids.length) Debts.commit(ids);
  toast(dStLabel(r)); if (r === 'promise') openDebtSheet({ gid: gid }); else DSession.render(); });
App.act('ds-done', function () { var gid = DSession.queue[DSession.pos]; if (gid) DSession.handled(gid); });
App.on('refresh', function () { if (DSession.on && !Modal.isOpen()) DSession.render(); });

/* ───────── فقرة الديون في الإعدادات ───────── */
App.hook('settings.blocks', function () {
  var adm = App.user.admin, sw = function (k, lbl) { return '<label class="chk"><input type="checkbox" data-inp="d-flag" data-k="' + k + '"' + (Local.get(k, true) !== false ? ' checked' : '') + '><span>' + lbl + '</span></label>'; };
  var head = '<div class="card"><div class="card-t">💰 ' + L('الديون', 'Dettes') + '</div>' + sw('debt_on', L('تفعيل قسم الديون على هذا الجهاز', 'Activer la section dettes sur cet appareil'));
  if (!debtOn()) return head + '</div>';
  var gs = grpAll(), ml = msgLang();
  return head + sw('debt_card', L('إظهار بطاقة الدين في بطاقة الزبون', 'Afficher la dette dans la fiche client')) + sw('debt_sess', L('إظهار بطاقة الدين في جلسة الاتصال', 'Afficher la dette dans la session'))
    + (gs.length ? '<div class="lbl">👥 ' + L('المجموعات المستعملة لربط الديون (المفعّلة = عائلة واحدة)', 'Groupes utilisés pour lier les dettes (activé = une famille)') + '</div>'
        + '<div class="lines grp-list">' + gs.map(function (x, i) { return '<label class="chk"><input type="checkbox" data-inp="d-gx" data-i="' + i + '"' + (grpOff(x.g) ? '' : ' checked') + (adm ? '' : ' disabled') + '><span>' + esc(x.g) + ' <small>(' + x.n + ')</small></span></label>'; }).join('') + '</div>' : '')
    + '<div class="lbl">' + L('رسالة الدين', 'Message dette') + ' (' + ml.toUpperCase() + ')</div><textarea id="st-t-debt" rows="7"' + (adm ? '' : ' readonly') + '>' + esc(tmplGet('debt')) + '</textarea>'
    + '<div class="hint">[الاسم] [الدين] [التفاصيل] [اللوحة] [البوليصة] [عدد]</div>'
    + '<div class="lbl">' + L('فقرة الدين داخل رسالة التجديد', 'Paragraphe dette dans le message de renouvellement') + '</div><textarea id="st-t-combo" rows="3"' + (adm ? '' : ' readonly') + '>' + esc(tmplGet('combo')) + '</textarea>'
    + (adm ? '<button class="btn pri wide" data-act="d-savetmpl">💾 ' + L('حفظ نصوص الديون', 'Enregistrer') + '</button>' : '') + '</div>';
});
App.input('d-flag', function (el) { Local.set(el.dataset.k, el.checked); if (el.dataset.k === 'debt_on') { if (el.checked) Debts.start(); else { Debts.stop(); if (App.page === 'debts') App.go('renew'); } } App.renderNav(); App.render(); });
App.input('d-gx', function (el) { if (!App.user.admin) return; var all = grpAll(), g = all[+el.dataset.i] && all[+el.dataset.i].g; if (!g) return;
  var gx = Debts.gx ? Debts.gx.slice() : all.filter(function (x) { return grpOff(x.g); }).map(function (x) { return x.g; }), p = gx.indexOf(g);
  if (el.checked) { if (p >= 0) gx.splice(p, 1); } else if (p < 0) gx.push(g);
  Debts.gx = gx; Debts.touch(); Debts.col().doc('x_cfg').set({ k: 'cfg', gx: gx }).catch(syncErr); });
App.act('d-savetmpl', function () { if (!App.user.admin) return; var ml = msgLang(), p = {}; p['tmpl_debt_' + ml] = $('st-t-debt').value; p['tmpl_combo_' + ml] = $('st-t-combo').value; Meta.save(p); toast(L('💾 حُفظت النصوص', '💾 Textes enregistrés')); });

App.hook('dash.cards', function () { if (!Debts.rows.length || !debtOn()) return [];
  var st = debtStats(); return [
    { ic: '💰', label: L('مجموع الديون', 'Dette totale'), value: moneyH(st.total), sub: st.n + ' ' + L('عقد', 'contrats'), cls: 'red', go: 'debts:all', mod: 'debts' },
    { ic: '🤝', label: L('وعود دفع مستحقة', 'Promesses échues'), value: st.due, cls: st.due ? 'amber' : '', go: 'debts:due', mod: 'debts' }]; });
App.register({ id: 'debts', perm: 'debts', icon: '💰', title: ['الديون', 'Dettes'], order: 20, render: renderDebts, enabled: debtOn,
  badge: function () { if (!Debts.rows.length) return ''; var n = debtStats().due; return n ? String(n) : ''; } });
