/* ══════════════════════════════════════════════════════════
   RenewPro v4 — mod-phones.js   (📇 قاعدة الأرقام)
   تجمع الهاتف مع البوليصة (واللوحة) من أي ملف Excel (البوردورو، TERME AUTO، ملف العمليات…)
   وتحفظها في السحابة، ثم «لصق الأرقام الناقصة» في: جدول الاتصال · جدول الديون · ملفات الإنتاج.
   • الربط بالبوليصة أولاً ثم باللوحة — بلا أسماء.
   • رقم موجود لا يُمسّ أبداً: يُملأ الناقص فقط.
   • رقمان مختلفان لنفس البوليصة: الأول «الهاتف» والثاني «هاتف 2».
   القاعدة هي دفتر الهواتف نفسه الذي يستعمله قسم الديون (Phones في mod-debts.js، rp_meta/phones):
     المفتاح = البوليصة (kPol) → الهاتف · «المفتاح#2» → هاتف 2 · «pl:اللوحة» → الهاتف
══════════════════════════════════════════════════════════ */
'use strict';

/* القاعدة الكبيرة (PB.big) محفوظة في عدة مستندات rp_meta/pbk_N (المستند الواحد حدّه 1 ميغا)،
   ودفتر الديون الصغير (Phones.map) يبقى كما هو ويُقرأ أولاً. */
var PB = { q: '', last: null, big: {}, chunks: 0, ready: false, unsub: null, dirty: false };
PB.start = function () {
  if (PB.unsub || !FB.db) return;
  PB.unsub = Meta.col().where('k', '==', 'pbk').onSnapshot(function (snap) {
    if (PB.dirty) return;                                       // حفظ جارٍ من هذا الجهاز
    var parts = []; snap.forEach(function (d) { var x = d.data() || {}; parts.push([+x.i || 0, x.j || '']); });
    parts.sort(function (a, b) { return a[0] - b[0]; });
    var m = {}; parts.forEach(function (p) { try { Object.assign(m, JSON.parse(p[1] || '{}')); } catch (e) { } });
    PB.big = m; PB.chunks = parts.length; PB.ready = true; App.refresh();
  }, function () { PB.ready = true; });
};
PB.save = function () {
  var keys = Object.keys(PB.big), parts = [], cur = {}, size = 0;
  keys.forEach(function (k) { var v = PB.big[k]; size += k.length + v.length + 6; cur[k] = v; if (size > 600000) { parts.push(cur); cur = {}; size = 0; } });
  if (Object.keys(cur).length || !parts.length) parts.push(cur);
  var ops = parts.map(function (p, i) { return { ref: Meta.col().doc('pbk_' + i), data: { k: 'pbk', i: i, j: JSON.stringify(p) } }; });
  for (var i = parts.length; i < PB.chunks; i++) ops.push({ del: 1, ref: Meta.col().doc('pbk_' + i) });
  PB.dirty = true;
  return FB.batches(ops).then(function () { PB.chunks = parts.length; PB.dirty = false; }).catch(function (e) { PB.dirty = false; syncErr(e); });
};
App.on('login', function () { PB.start(); });
App.on('logout', function () { if (PB.unsub) { try { PB.unsub(); } catch (e) { } } PB.unsub = null; PB.big = {}; PB.ready = false; });
function pbGet(k) { return Phones.map[k] || PB.big[k] || ''; }
function pbKeys() { var o = {}; [Phones.map, PB.big].forEach(function (m) { Object.keys(m).forEach(function (k) { if (k.indexOf('#') < 0 && k.indexOf('pl:') !== 0) o[k] = 1; }); }); return Object.keys(o); }
function pbLook(police, plate) {
  var k = police ? kPol(police, plate) : '', p1 = k ? pbGet(k) : '', p2 = k ? pbGet(k + '#2') : '';
  if (!p1) { var pk = kPlate(plate); if (pk && pbGet('pl:' + pk)) { p1 = pbGet('pl:' + pk); p2 = pbGet('pl:' + pk + '#2'); } }
  return { p1: p1 || '', p2: p2 && p2 !== p1 ? p2 : '' };
}
/* إضافة رقم: لا يُغيَّر رقم موجود؛ الثاني المختلف يذهب لـ «#2» */
function pbAddTo(key, ph, st) {
  if (!key || !ph) return; var cur = pbGet(key);
  if (!cur) { PB.big[key] = ph; st.add++; }
  else if (cur !== ph && !pbGet(key + '#2')) { PB.big[key + '#2'] = ph; st.second++; }
  else st.same++;
}
function pbAdd(police, plate, phones, st) {
  var k = police ? kPol(police, plate) : '', pk = kPlate(plate);
  phones.filter(Boolean).forEach(function (ph) { if (k) pbAddTo(k, ph, st); if (pk) pbAddTo('pl:' + pk, ph, { add: 0, second: 0, same: 0 }); });
}

/* ───────── قراءة ملف: يتعرّف وحده على أعمدة البوليصة والهاتف واللوحة ───────── */
var PB_COLS = {
  pol:  ['numeropolice', 'npolice', 'nopolice', 'police', 'بوليص'],
  cat:  ['cat'],
  ph:   ['telephone', 'telephone1', 'tel', 'gsm', 'mobile', 'portable', 'phone', 'هاتف'],
  ph2:  ['telephone2', 'tel2', 'gsm2', 'mobile2', 'phone2', 'هاتف2'],
  pl:   ['immatdef', 'immatriculation', 'matricule', 'immat', 'plate', 'لوحة']
};
function pbDetect(rows) {
  for (var r = 0; r < Math.min(rows.length, 15); r++) {
    var h = (rows[r] || []).map(normH), used = {}, map = {};
    ['ph2', 'pol', 'ph', 'pl', 'cat'].forEach(function (c) {
      var keys = PB_COLS[c], idx = -1;
      keys.some(function (k) { var i = h.indexOf(k); if (i >= 0 && !used[i]) { idx = i; return true; } return false; });             // تطابق تام أولاً
      if (idx < 0 && c !== 'cat') keys.some(function (k) { for (var i = 0; i < h.length; i++) { if (!used[i] && h[i] && h[i].indexOf(k) >= 0 && !(c === 'ph' && /2$/.test(h[i]))) { idx = i; return true; } } return false; });
      if (idx >= 0) { used[idx] = 1; map[c] = idx; }
    });
    if (map.pol != null && map.ph != null) return { hr: r, map: map };
  }
  return null;
}
function pbParse(buf, name, st) {
  var rows = prodRead(buf), det = pbDetect(rows);
  if (!det) { st.bad.push(name); return; }
  var m = det.map, g = function (row, c) { return m[c] == null ? '' : row[m[c]]; };
  for (var i = det.hr + 1; i < rows.length; i++) {
    var row = rows[i]; if (!row) continue;
    var pol = prodClean(g(row, 'pol')), cat = prodClean(g(row, 'cat'));
    if (!pol || /total|nombre/i.test(pol)) continue;
    if (cat && /^\d{1,2}$/.test(cat) && pol.indexOf('/') < 0) pol = cat + '/' + pol;
    var p1 = xPhone(g(row, 'ph')), p2 = xPhone(g(row, 'ph2')), pl = String(g(row, 'pl') || '').split('|')[0];
    st.rows++;
    if (!p1 && !p2) { st.noph++; continue; }
    pbAdd(pol, pl, [p1, p2 !== p1 ? p2 : ''], st);
  }
  st.files.push(name);
}
function pbStat() { return { add: 0, second: 0, same: 0, rows: 0, noph: 0, files: [], bad: [] }; }
App.act('pb-pick', function () { if (!App.canUp()) return; var f = $('pb-file'); if (f) { f.value = ''; f.click(); } });
App.input('pb-file', function (el) {
  var files = Array.prototype.slice.call(el.files || []); if (!files.length) return;
  toast(L('⏳ جارٍ قراءة الملفات…', '⏳ Lecture…'));
  var st = pbStat();
  Promise.all(files.map(function (f) { return f.arrayBuffer().then(function (b) { pbParse(b, f.name, st); }).catch(function () { st.bad.push(f.name); }); }))
    .then(function () { if (st.add || st.second) PB.save(); PB.last = st; App.render();
      toast(st.bad.length && !st.files.length ? L('⚠️ لم أجد عمود البوليصة والهاتف', '⚠️ Colonnes police/téléphone introuvables') : '📇 +' + (st.add + st.second) + ' ' + L('رقم', 'numéros'), st.bad.length && !st.files.length ? 'err' : ''); });
});
/* جمع الأرقام الموجودة في البرنامج نفسه: لائحة الاتصال وملفات الإنتاج */
App.act('pb-learn', function () {
  if (!App.canUp()) return;
  var st = pbStat();
  Contacts.list.forEach(function (c) { if (c.deleted || (!c.phone && !c.phone2)) return; st.rows++; pbAdd(polFull(c), c.plate, [c.phone, c.phone2 !== c.phone ? c.phone2 : ''], st); });
  (typeof Prod !== 'undefined' ? Prod.rows : []).forEach(function (r) { if (!r.phone || r.phoneFrom) return; st.rows++;
    pbAdd(r.cat && /^\d+$/.test(r.police) ? r.cat + '/' + r.police : r.police, r.plate, [r.phone, r.phone2 !== r.phone ? r.phone2 : ''], st); });
  st.files.push(L('لائحة الاتصال + ملفات الإنتاج', 'Liste d\'appels + production'));
  if (st.add || st.second) PB.save(); PB.last = st; App.render(); toast('📇 +' + (st.add + st.second) + ' ' + L('رقم', 'numéros'));
});


/* ══════════ 📞 pfFind: رقم أي زبون من كاع المصادر (v5) ══════════
   الترتيب: لائحة التجديد ← قاعدة الأرقام ← الديون ← اللوائح المؤرشفة.
   الربط بالبوليصة (آخر جزء) ولا الماتريكول فقط — ماشي بالسمية. ما كيكتب فوق حتى رقم: غير كيلقى. */
var PF = { idx: null, sig: '', archAsked: false };
/* أي تبديل فالبيانات (رقم تزاد لزبون…) → الفهرس كيتعاود يتبنى */
App.on('refresh', function () { PF.idx = null; });
var PF_SRC = { c: ['لائحة التجديد', 'liste'], pb: ['قاعدة الأرقام', 'répertoire'], d: ['الديون', 'dettes'], a: ['الأرشيف', 'archives'] };
function pfSrcLabel(s) { var x = PF_SRC[s]; return x ? L(x[0], x[1]) : ''; }
function pfIndex() {
  var arch = (typeof Archive !== 'undefined' && Archive.all) || null;
  var sig = Contacts.list.length + '|' + ((typeof Debts !== 'undefined' && Debts.rows) ? Debts.rows.length : 0) + '|' + (arch ? arch.length : -1);
  if (PF.idx && PF.sig === sig) return PF.idx;
  var ix = Object.create(null);
  var put = function (police, plate, p1, p2, src) { if (!p1) return; var o = { p1: p1, p2: p2 && p2 !== p1 ? p2 : '', src: src };
    var t = kPolTail(police); if (t && !ix['P:' + t]) ix['P:' + t] = o; var m = kPlate(plate); if (m && !ix['M:' + m]) ix['M:' + m] = o; };
  Contacts.list.forEach(function (c) { if (!c.deleted) put(polFull(c), c.plate, c.phone, c.phone2, 'c'); });
  if (typeof Debts !== 'undefined' && Debts.rows) Debts.rows.forEach(function (d) { put(d.police, d.plate, d.phone, '', 'd'); });
  if (arch) arch.forEach(function (e) { var c = e.c || {}; put(polFull(c), c.plate, c.phone, c.phone2, 'a'); });
  PF.idx = ix; PF.sig = sig; return ix;
}
function pfFind(police, plate) {
  var ix = pfIndex(), t = kPolTail(police), m = kPlate(plate);
  var c = (t && ix['P:' + t]) || null;
  if (c && c.src === 'c') return c;
  var b = (typeof pbLook === 'function') ? pbLook(police, plate) : { p1: '' };
  if (b.p1) return { p1: b.p1, p2: b.p2, src: 'pb' };
  var r = c || (m && ix['M:' + m]) || null;
  if (r) return r;
  /* الأرشيف كيتشارجا غير مرة وحدة ملي نحتاجوه */
  if (!PF.archAsked && typeof Archive !== 'undefined' && Archive.ready && Archive.heads.length && !Archive.all && Archive.loadAll) {
    PF.archAsked = true; Archive.loadAll().then(function () { PF.idx = null; App.refresh(); }).catch(function () { });
  }
  return { p1: '', p2: '', src: '' };
}
/* نفس الدالة للحاسبة (داخل الإطار): كترجع نص JSON */
window.pfFindJSON = function (police, plate) { try { return JSON.stringify(pfFind(String(police || ''), String(plate || ''))); } catch (e) { return '{}'; } };
function pfLinks(p) { if (!p) return ''; return '<a class="btn sm call" href="' + telHref(p) + '">📞 ' + ltr(p) + '</a> <a class="btn sm wa" target="_blank" rel="noopener" href="' + waUrl(p, '') + '">💬</a>'; }

/* بطاقة الزبون (التجديد): بلا رقم ولكن لقيناه فشي مصدر آخر */
App.hook('contact.blocks', function (c) {
  if (!c || c.phone) return ''; var r = pfFind(polFull(c), c.plate); if (!r.p1) return '';
  return '<div class="ah-box">📞 <b>' + L('رقم من ', 'Numéro trouvé dans : ') + pfSrcLabel(r.src) + '</b><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">' + pfLinks(r.p1) + (r.p2 ? ' ' + pfLinks(r.p2) : '')
    + ' <button class="btn sm" data-act="pf-keep" data-id="' + esc(c.id) + '">💾 ' + L('حفظ فالبطاقة', 'Garder') + '</button></div></div>';
});
App.act('pf-keep', function (el) { var c = Contacts.get(el.dataset.id); if (!c || c.phone) return; var r = pfFind(polFull(c), c.plate); if (!r.p1) return;
  var up = { phone: r.p1, phoneFrom: 'pf' }; if (r.p2 && !c.phone2) up.phone2 = r.p2; Contacts.update(c.id, up).then(function () { toast('📞 ' + L('تحفظ الرقم', 'Numéro enregistré')); }); });

/* ───────── لصق الأرقام الناقصة ───────── */
function pbPlan() {
  var plan = { contacts: [], debts: [], prod: [] };
  Contacts.list.forEach(function (c) { if (c.deleted || c.phone) return; var r = pfFind(polFull(c), c.plate); if (r.p1) plan.contacts.push({ c: c, r: r }); });
  if (typeof debtGroups === 'function' && typeof debtOn === 'function' && debtOn() && Debts.rows.length) {
    try { debtGroups().forEach(function (g) {
      if (g.total <= 0.005 || g.lines.some(function (d) { return d.phone; }) || (g.contact && g.contact.phone)) return;
      var d0 = g.lines[0], r = pfFind(d0.police, d0.plate); if (r.p1) plan.debts.push({ g: g, r: r }); }); } catch (e) { }
  }
  (typeof Prod !== 'undefined' ? Prod.rows : []).forEach(function (row) { if (row.phone) return;
    var r = pfFind(row.cat && /^\d+$/.test(row.police) ? row.cat + '/' + row.police : row.police, row.plate); if (r.p1) plan.prod.push({ row: row, r: r }); });
  return plan;
}
App.act('pb-fill', function () {
  var p = pbPlan(), box = function (k, n, lbl) { return '<label class="pb-ck"><input type="checkbox" id="pbf-' + k + '"' + (n ? ' checked' : ' disabled') + '> ' + lbl + ' <b>' + n + '</b></label>'; };
  Modal.open(Modal.head('📞 ' + L('لصق الأرقام الناقصة', 'Compléter les numéros'))
    + '<div class="hint" style="margin-bottom:8px">' + L('يُملأ الهاتف فقط لمن ليس له رقم. الأرقام الموجودة لا تُمسّ.', 'Seuls les numéros manquants sont remplis.') + '</div>'
    + box('contacts', p.contacts.length, L('جدول الاتصال (التجديد)', 'Liste d\'appels'))
    + box('debts', p.debts.length, L('جدول الديون', 'Dettes'))
    + box('prod', p.prod.length, L('ملفات الإنتاج', 'Fichiers de production'))
    + (p.contacts.length + p.debts.length + p.prod.length ? '<button class="btn pri wide" data-act="pb-fill-go">📞 ' + L('لصق', 'Compléter') + '</button>'
      : '<div class="box">' + L('لا يوجد رقم ناقص له مقابل في القاعدة.', 'Aucun numéro manquant trouvé dans le répertoire.') + '</div>'));
});
App.act('pb-fill-go', function () {
  var p = pbPlan(), on = function (k) { var e = $('pbf-' + k); return e && e.checked; }, done = { contacts: 0, debts: 0, prod: 0 }, ops = [];
  if (on('contacts')) p.contacts.forEach(function (x) { var u = { phone: x.r.p1, phoneFrom: 'pb' }; if (x.r.p2 && !x.c.phone2) u.phone2 = x.r.p2;
    ops.push({ ref: Contacts.col().doc(x.c.id), upd: u }); done.contacts++; });
  if (on('debts')) { var ids = []; p.debts.forEach(function (x) { x.g.lines.forEach(function (d) { d.phone = x.r.p1; ids.push(d.id); }); done.debts++; }); if (ids.length) Debts.commit(ids); }
  if (on('prod')) { p.prod.forEach(function (x) { x.row.phone = x.r.p1; if (x.r.p2 && !x.row.phone2) x.row.phone2 = x.r.p2; x.row.phoneFrom = 1; done.prod++; }); if (done.prod) prodSave(); }
  Modal.close();
  var fin = function () { App.refresh(); toast('📞 ' + L('مُلئ: ', 'Complétés : ') + L('الاتصال ', 'appels ') + done.contacts + ' · ' + L('الديون ', 'dettes ') + done.debts + ' · ' + L('الإنتاج ', 'production ') + done.prod); };
  if (ops.length) FB.batches(ops).then(fin).catch(syncErr); else fin();
});

/* ───────── الصفحة ───────── */
function renderPhones(el) {
  var n = pbKeys().length, n2 = Object.keys(PB.big).concat(Object.keys(Phones.map)).filter(function (k) { return /#2$/.test(k) && k.indexOf('pl:') !== 0; }).length, s = PB.last;
  var keepQ = document.activeElement && document.activeElement.id === 'pb-q', pos = keepQ ? document.activeElement.selectionStart : 0;
  el.innerHTML = '<div class="page narrow">'
    + '<div class="card"><div class="card-t">📇 ' + L('قاعدة الأرقام', 'Répertoire téléphonique') + '</div>'
      + '<div class="hint" style="margin-bottom:8px">' + L('حمّل أي ملف Excel فيه البوليصة والهاتف (البوردورو، TERME AUTO، ملف العمليات…) أو أفلته هنا. الأرقام تُحفظ وتُستعمل لملء الناقص. الربط بالبوليصة ثم اللوحة.',
          'Chargez ou déposez tout fichier Excel avec police + téléphone. Les numéros sont gardés pour compléter les manquants.') + '</div>'
      + (!PB.ready ? '<div class="hint">⏳ ' + L('جارٍ تحميل القاعدة…', 'Chargement…') + '</div>' : '') + '<div class="box"><b>' + n + '</b> ' + L('بوليصة لها رقم', 'polices avec numéro') + (n2 ? ' · <b>' + n2 + '</b> ' + L('برقم ثانٍ', 'avec 2e numéro') : '') + '</div>'
      + '<input type="file" id="pb-file" data-inp="pb-file" accept=".xlsx,.xls,.csv" multiple hidden>'
      + '<div class="bar" style="flex-wrap:wrap">'
        + (App.canUp() ? '<button class="btn pri" data-act="pb-pick">📥 ' + L('تحميل ملف', 'Charger un fichier') + '</button>'
          + '<button class="btn" data-act="pb-learn">🔁 ' + L('جمع من البرنامج', 'Collecter de l\'appli') + '</button>' : '')
        + '<button class="btn green" data-act="pb-fill">📞 ' + L('لصق الأرقام الناقصة', 'Compléter les numéros') + '</button></div>'
      + (s ? '<div class="box green sm">' + esc(s.files.join('، ')) + ' — ' + L('سطور: ', 'lignes : ') + s.rows + ' · ' + L('جديد: ', 'nouveaux : ') + s.add + ' · ' + L('رقم ثانٍ: ', '2e numéro : ') + s.second
          + ' · ' + L('موجود: ', 'déjà : ') + s.same + ' · ' + L('بلا هاتف: ', 'sans tél. : ') + s.noph
          + (s.bad.length ? '<div class="red-t">⚠️ ' + L('لم أجد البوليصة والهاتف في: ', 'Colonnes introuvables dans : ') + esc(s.bad.join('، ')) + '</div>' : '') + '</div>' : '')
    + '</div>'
    + '<div class="card"><div class="card-t">🔍 ' + L('بحث في القاعدة', 'Rechercher') + '</div>'
      + '<div class="search"><span>🔍</span><input id="pb-q" data-inp="pb-q" dir="ltr" placeholder="' + L('رقم البوليصة أو اللوحة', 'N° police ou immatriculation') + '" value="' + esc(PB.q) + '"></div>'
      + '<div id="pb-res">' + pbResHTML() + '</div></div>'
    + '</div>';
  if (keepQ) { var i = $('pb-q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { } } }
}
function pbResHTML() {
  var q = PB.q.trim(); if (q.length < 4) return '';
  var r = pbLook(q, ''); if (!r.p1) r = pbLook('', q);
  return r.p1 ? '<div class="box">📞 ' + ltr(r.p1) + (r.p2 ? ' · ' + ltr(r.p2) : '') + '</div>' : '<div class="hint">' + L('لا يوجد رقم لهذه البوليصة/اللوحة', 'Aucun numéro') + '</div>';
}
App.input('pb-q', debounce(function (el) { PB.q = el.value; var b = $('pb-res'); if (b) b.innerHTML = pbResHTML(); }, 250));

/* ملفات الإنتاج: الناقص يُملأ أيضاً من القاعدة عند القراءة */
(function () { if (typeof prodFillPhones !== 'function') return; var f = prodFillPhones;
  prodFillPhones = function (rows) { f(rows); rows.forEach(function (r) { if (r.phone) return;
    var x = pfFind(r.cat && /^\d+$/.test(r.police) ? r.cat + '/' + r.police : r.police, r.plate); if (x.p1) { r.phone = x.p1; if (x.p2 && !r.phone2) r.phone2 = x.p2; r.phoneFrom = 1; } }); };
})();
if (typeof DROP_TARGETS !== 'undefined') DROP_TARGETS.phones = { inp: 'pb-file', multi: true, admin: true, ext: /\.(xlsx|xls|csv)$/i, label: ['قاعدة الأرقام (يمكن عدة ملفات)', 'Répertoire (plusieurs fichiers)'] };

App.register({ id: 'phones', perm: 'renew', icon: '📇', title: ['قاعدة الأرقام', 'Répertoire'], order: 13, render: renderPhones });
