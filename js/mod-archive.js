/* ══════════════════════════════════════════════════════════
   RenewPro 2 — mod-archive.js   (أرشيف لوائح التجديد)
   كل لائحة تُؤرشف تلقائياً عند تحميل لائحة جديدة (انظر mod-renew.js ← Arch.save).
   هنا: الاطلاع على كل لائحة سابقة، وتحميلها Excel بكل الملاحظات والمكالمات.
══════════════════════════════════════════════════════════ */
'use strict';

var Archive = { heads: [], unsub: null, ready: false, denied: false, cache: {}, view: null, q: '', all: null, allP: null };
Archive.start = function () {
  if (Archive.unsub || !FB.db) return;
  Archive.unsub = Meta.col().where('k', '==', 'archh').onSnapshot(function (snap) {
    var a = []; snap.forEach(function (doc) { var d = doc.data() || {}; d.id = doc.id.replace(/^archh_/, ''); a.push(d); });
    a.sort(function (x, y) { return String(y.archivedAt || '').localeCompare(String(x.archivedAt || '')); });
    if (a.map(function (x) { return x.id; }).join() !== Archive.heads.map(function (x) { return x.id; }).join()) { Archive.all = null; Archive.allP = null; }
    Archive.heads = a; Archive.ready = true; Archive.denied = false; App.refresh();
  }, function (e) { Archive.denied = true; Archive.ready = true; App.refresh(); });
};
App.on('login', function () { Archive.start(); });
App.on('logout', function () { if (Archive.unsub) { try { Archive.unsub(); } catch (e) { } } Archive.unsub = null; Archive.heads = []; Archive.cache = {}; Archive.ready = false; Archive.all = null; Archive.allP = null; AH.q = ''; });
/* تحميل زبناء لائحة مؤرشفة (القطع تُجلب عند الطلب فقط) */
Archive.load = function (id) {
  if (Archive.cache[id]) return Promise.resolve(Archive.cache[id]);
  var h = Archive.heads.filter(function (x) { return x.id === id; })[0]; if (!h) return Promise.reject(new Error('not found'));
  var ps = []; for (var i = 0; i < (h.chunks || 0); i++) ps.push(Meta.col().doc('archc_' + id + '_' + i).get());
  return Promise.all(ps).then(function (docs) { var list = [];
    docs.forEach(function (d) { if (d.exists) { try { list = list.concat(JSON.parse(d.data().j)); } catch (e) { } } });
    list.sort(function (a, b) { return (a.ord != null ? +a.ord : 1e9) - (b.ord != null ? +b.ord : 1e9); });
    Archive.cache[id] = list; return list; });
};
function archName(h) { return (h.name || L('لائحة', 'Liste')) + (h.loadedAt ? ' — ' + fmtDT(h.loadedAt).slice(0, 5) : ''); }
function renderArchive(el) {
  if (!Archive.ready) { el.innerHTML = '<div class="empty">⏳ ' + L('جارٍ التحميل…', 'Chargement…') + '</div>'; return; }
  if (Archive.view) { renderArchiveView(el); return; }
  var hs = Archive.heads;
  var keepQ = document.activeElement && document.activeElement.id === 'ah-q', pos = keepQ ? document.activeElement.selectionStart : 0;
  el.innerHTML = '<div class="page narrow">'
    + '<div class="card"><div class="card-t">📜 ' + L('سجل زبون (كاع اللوائح)', 'Historique d\'un client (toutes les listes)') + '</div>'
      + '<div class="search"><span>🔍</span><input id="ah-q" data-inp="ah-q" placeholder="' + L('البوليصة، الماتريكول، الهاتف ولا السمية…', 'Police, immatriculation, téléphone ou nom…') + '" value="' + esc(AH.q) + '"></div>'
      + '<div id="ah-res">' + ahResultsHTML() + '</div></div>'
    + '<div class="card"><div class="card-t">🗄️ ' + L('اللوائح السابقة', 'Listes précédentes') + '</div>'
      + '<div class="hint" style="margin-bottom:8px">' + L('كل لائحة تجديد تُحفظ هنا تلقائياً عند تحميل لائحة جديدة، بكل ملاحظاتها ومكالماتها.', 'Chaque liste est archivée automatiquement lors du chargement d\'une nouvelle, avec ses notes et appels.') + '</div>'
      + (Archive.denied ? '<div class="box red">⚠️ ' + L('الأرشيف غير مفعّل في السحابة (قاعدة rp_meta). انظر الإعدادات.', 'Archives non activées (règle rp_meta). Voir Paramètres.') + '</div>' : '')
      + (hs.length ? hs.map(function (h) {
          return '<div class="arch"><div class="arch-m"><b>' + esc(h.name || L('لائحة', 'Liste')) + '</b>'
            + '<small>' + L('حُمّلت: ', 'Chargée : ') + (h.loadedAt ? fmtDT(h.loadedAt) : '—') + ' · ' + L('أُرشفت: ', 'Archivée : ') + fmtDT(h.archivedAt) + '</small>'
            + '<small>' + (h.count || 0) + ' ' + L('زبون', 'clients') + (h.by ? ' · ' + esc(h.by) : '') + '</small></div>'
            + '<div class="arch-a"><button class="btn sm" data-act="a-view" data-id="' + esc(h.id) + '">👁 ' + L('عرض', 'Voir') + '</button>'
            + '<button class="btn sm green" data-act="a-xlsx" data-id="' + esc(h.id) + '">📥 Excel</button>'
            + (App.user.admin ? '<button class="x sm" data-act="a-del" data-id="' + esc(h.id) + '">✕</button>' : '') + '</div></div>'; }).join('')
        : '<div class="empty"><div class="empty-ic">🗄️</div><span>' + L('لا لوائح مؤرشفة بعد.', 'Aucune liste archivée.') + '</span></div>')
    + '</div></div>';
  if (keepQ) { var qi = $('ah-q'); if (qi) { qi.focus(); try { qi.setSelectionRange(pos, pos); } catch (e) { } } }
}
function renderArchiveView(el) {
  var v = Archive.view, list = v.list, q = Archive.q.toLowerCase().trim();
  if (q) list = list.filter(function (c) { return [c.name, c.phone, c.plate, c.police, c.note].join(' ').toLowerCase().indexOf(q) >= 0; });
  var keepQ = document.activeElement && document.activeElement.id === 'a-q', pos = keepQ ? document.activeElement.selectionStart : 0;
  el.innerHTML = '<div class="page">'
    + '<div class="bar"><button class="btn" data-act="a-back">→ ' + L('رجوع', 'Retour') + '</button><div class="search"><span>🔍</span><input id="a-q" data-inp="a-q" placeholder="' + L('بحث في هذه اللائحة…', 'Rechercher dans cette liste…') + '" value="' + esc(Archive.q) + '"></div>'
      + '<button class="btn green" data-act="a-xlsx" data-id="' + esc(v.id) + '">📥 Excel</button></div>'
    + '<div class="list-head"><span>🗄️ ' + esc(archName(v.head)) + ' · ' + list.length + ' ' + L('زبون', 'clients') + ' · ' + L('للقراءة فقط', 'lecture seule') + '</span></div>'
    + '<div class="rows">' + list.slice(0, 200).map(function (c, i) { var h = lastCall(c);
        return '<div class="row ro" data-act="a-open" data-i="' + v.list.indexOf(c) + '"><div class="row-main"><div class="row-name">' + esc(c.name || '—') + (c.note ? '<span class="mini">📝</span>' : '') + (c.renewed ? '<span class="mini green">✓</span>' : '') + '</div>'
          + '<div class="row-sub">' + (c.phone ? ltr(c.phone) : '') + (c.plate ? ' · ' + ltr(c.plate) : '') + (c.dateE ? ' · ' + fmtD(c.dateE) : '') + '</div></div>'
          + '<div class="row-side">' + (h ? '<span class="dc">' + csLabel(h.result) + (callCount(c) > 1 ? ' ×' + callCount(c) : '') + '</span>' : '') + '</div><div class="row-acts"></div></div>'; }).join('') + '</div>'
    + (list.length > 200 ? '<div class="hint center">' + L('يُعرض أول 200 — استعمل البحث أو حمّل Excel.', '200 premiers affichés — utilisez la recherche ou Excel.') + '</div>' : '')
    + '</div>';
  if (keepQ) { var inp = $('a-q'); if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) { } } }
}
/* البحث يحدّث اللائحة فقط (الحقل لا يُعاد رسمه أثناء الكتابة) */
App.input('a-q', debounce(function (el) { Archive.q = el.value; var keep = el.value, pos = el.selectionStart; App.render(); var i = $('a-q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { } } }, 350));
App.act('a-back', function () { Archive.view = null; Archive.q = ''; App.render(); });
App.act('a-view', function (el) { var id = el.dataset.id, h = Archive.heads.filter(function (x) { return x.id === id; })[0]; toast(L('⏳ جارٍ التحميل…', '⏳ Chargement…'));
  Archive.load(id).then(function (list) { Archive.view = { id: id, head: h, list: list }; Archive.q = ''; App.render(); }).catch(syncErr); });
App.act('a-xlsx', function (el) { var id = el.dataset.id, h = Archive.heads.filter(function (x) { return x.id === id; })[0]; toast(L('⏳ جارٍ التحضير…', '⏳ Préparation…'));
  Archive.load(id).then(function (list) { exportContactsXlsx(list, 'renewpro_archive_' + String((h && (h.loadedAt || h.archivedAt)) || '').slice(0, 10) + '.xlsx'); }).catch(syncErr); });
App.act('a-del', function (el) { var id = el.dataset.id, h = Archive.heads.filter(function (x) { return x.id === id; })[0]; if (!h || !App.user.admin) return;
  if (!confirm(L('حذف هذه اللائحة المؤرشفة نهائياً؟', 'Supprimer définitivement cette archive ?'))) return;
  var ops = [{ del: 1, ref: Meta.col().doc('archh_' + id) }]; for (var i = 0; i < (h.chunks || 0); i++) ops.push({ del: 1, ref: Meta.col().doc('archc_' + id + '_' + i) });
  FB.batches(ops).then(function () { delete Archive.cache[id]; toast(L('🗑️ حُذف', '🗑️ Supprimé')); }).catch(syncErr); });
App.act('a-open', function (el) { var c = Archive.view && Archive.view.list[+el.dataset.i]; if (!c) return; var hist = (c.callHistory || []).slice().reverse();
  Modal.open(Modal.head('🗄️ ' + esc(c.name || '—'))
    + '<div class="kvs">' + kv(L('الهاتف', 'Tél.'), c.phone ? ltr(c.phone) : '') + kv(L('اللوحة', 'Immat.'), c.plate ? ltr(c.plate) : '') + kv(L('البوليصة', 'Police'), c.police ? ltr(c.police) : '')
      + kv(L('الانتهاء', 'Fin'), c.dateE ? fmtD(c.dateE) : '') + kv(L('السعر', 'Prime'), c.prime ? moneyH(c.prime, 1) : '') + kv(L('المسؤول', 'Agent'), esc(c.agent || ''))
      + kv(L('الحالة', 'État'), c.renewed ? L('جدّد', 'Renouvelé') : c.renewConfirmed ? L('أكّد التجديد', 'Confirmé') : '') + '</div>'
    + '<div class="sec"><div class="sec-t">📝 ' + L('ملاحظة', 'Note') + '</div><div class="note-ro">' + (c.note ? esc(c.note) : '<span class="muted">—</span>') + '</div></div>'
    + '<div class="sec"><div class="sec-t">📞 ' + L('سجل الاتصالات', 'Historique') + ' (' + hist.length + ')</div>'
      + (hist.length ? hist.map(function (h) { return '<div class="hist"><span>' + csLabel(h.result) + (h.note ? ' — ' + esc(h.note) : '') + '</span><small>' + fmtDT(h.date) + (h.user ? ' · ' + esc(h.user) : '') + '</small></div>'; }).join('') : '<div class="muted sm">' + L('لا اتصالات', 'Aucun appel') + '</div>') + '</div>');
});

/* ══════════ 📜 سجل الزبون عبر كاع اللوائح (الحالية + المؤرشفة) ══════════
   الربط بين اللوائح بالبوليصة والماتريكول فقط. البحث اليدوي يقبل حتى الهاتف والسمية. */
var AH = { q: '', groups: [], cur: null };
function ahPh(p) { var d = String(p || '').replace(/\D/g, ''); return d.length >= 9 ? d.slice(-9) : ''; }
function ahDT(ts) { var d = new Date(ts); if (isNaN(d)) return ['', '']; return [pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(), pad2(d.getHours()) + ':' + pad2(d.getMinutes())]; }
/* كاع الزبناء المؤرشفين [{c, h}] — كيتشارجاو مرة وحدة فالجلسة */
Archive.loadAll = function () {
  if (Archive.all) return Promise.resolve(Archive.all);
  if (Archive.allP) return Archive.allP;
  if (!Archive.ready) return Promise.resolve([]);
  var heads = Archive.heads.slice();
  Archive.allP = Promise.all(heads.map(function (h) { return Archive.load(h.id).then(function (list) { return list.map(function (c) { return { c: c, h: h }; }); }).catch(function () { return []; }); }))
    .then(function (parts) { Archive.all = [].concat.apply([], parts); Archive.allP = null; return Archive.all; });
  return Archive.allP;
};
function ahCurrent() { return Contacts.list.filter(function (c) { return !c.deleted; }).map(function (c) { return { c: c, h: null }; }); }
function ahSame(a, b) { var pa = kPolTail(a.police), pb = kPolTail(b.police), la = kPlate(a.plate), lb = kPlate(b.plate); return !!((pa && pa === pb) || (la && la === lb)); }
/* كل ما يخص هاد الزبون: كنزيدو كل مطابقة بالبوليصة ولا الماتريكول (حتى إلا تبدلات الماتريكول وبقات البوليصة) */
function ahCollect(seeds) {
  var pool = ahCurrent().concat(Archive.all || []), got = seeds.slice(), seen = new Set(seeds.map(function (e) { return e.c; })), changed = true;
  while (changed) { changed = false;
    pool.forEach(function (e) { if (seen.has(e.c)) return; if (got.some(function (g) { return ahSame(g.c, e.c); })) { got.push(e); seen.add(e.c); changed = true; } }); }
  return got;
}
function ahListName(h) { return h ? archName(h) : L('اللائحة الحالية', 'Liste actuelle'); }
function ahCalls(entries) {
  var out = [];
  entries.forEach(function (e) { (e.c.callHistory || []).forEach(function (x) { out.push({ date: x.date, result: x.result, note: x.note || '', user: x.user || '', n: x.n, list: ahListName(e.h) }); }); });
  out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return out;
}
function ahInfo(entries) { var c = entries[0].c, f = function (k) { for (var i = 0; i < entries.length; i++) if (entries[i].c[k]) return entries[i].c[k]; return ''; };
  return { name: f('name') || c.name || '—', police: f('police'), plate: f('plate'), phone: f('phone'), phone2: f('phone2') }; }

/* البحث */
function ahSearch(q) {
  var t = String(q || '').trim(); if (t.length < 3) return [];
  var al = kAl(t), dg = t.replace(/\D/g, ''), low = t.toLowerCase();
  var hit = function (c) {
    if (al.length >= 3 && (kAl(c.police).indexOf(al) >= 0 || kAl(c.plate).indexOf(al) >= 0)) return true;
    if (dg.length >= 6 && (ahPh(c.phone).indexOf(dg.slice(-9)) >= 0 || ahPh(c.phone2).indexOf(dg.slice(-9)) >= 0)) return true;
    return /[a-z؀-ۿ]/i.test(t) && String(c.name || '').toLowerCase().indexOf(low) >= 0;
  };
  var found = ahCurrent().concat(Archive.all || []).filter(function (e) { return hit(e.c); }), groups = [], used = new Set();
  found.forEach(function (e) { if (used.has(e.c)) return; var g = ahCollect([e]);
    /* زبون بلا بوليصة ولا ماتريكول: كنجمعوه غير بالهاتف+السمية فالنتائج اللي لقينا */
    if (g.length === 1) found.forEach(function (o) { if (o !== e && !used.has(o.c) && ahPh(o.c.phone) && ahPh(o.c.phone) === ahPh(e.c.phone) && String(o.c.name || '').trim().toUpperCase() === String(e.c.name || '').trim().toUpperCase()) g.push(o); });
    g.forEach(function (x) { used.add(x.c); }); groups.push(g); if (groups.length > 60) return; });
  groups.sort(function (a, b) { return ahCalls(b).length - ahCalls(a).length; });
  return groups.slice(0, 50);
}
function ahResultsHTML() {
  if (String(AH.q).trim().length < 3) return '<div class="hint">' + L('كتب 3 حروف ولا أرقام على الأقل. كيقلب فاللائحة الحالية وفكاع اللوائح المؤرشفة، ويجمع ليك كلشي ديال نفس الزبون (بالبوليصة ولا الماتريكول).', 'Au moins 3 caractères. Cherche dans la liste actuelle et toutes les archives.') + '</div>';
  if (!Archive.all) { Archive.loadAll().then(function () { var r = $('ah-res'); if (r) { AH.groups = ahSearch(AH.q); r.innerHTML = ahResultsHTML(); } }); return '<div class="muted sm">⏳ ' + L('جارٍ تحميل الأرشيف…', 'Chargement des archives…') + '</div>'; }
  var gs = AH.groups;
  if (!gs.length) return '<div class="empty"><span>' + L('ما لقيت حتى زبون.', 'Aucun client trouvé.') + '</span></div>';
  return '<div class="rows">' + gs.map(function (g, i) { var inf = ahInfo(g), calls = ahCalls(g), last = calls[0], lists = new Set(g.map(function (e) { return e.h ? e.h.id : 'cur'; })).size;
    return '<div class="row" data-act="ah-open" data-i="' + i + '"><div class="row-main"><div class="row-name">' + esc(inf.name) + '</div>'
      + '<div class="row-sub">' + [inf.police ? ltr(inf.police) : '', inf.plate ? ltr(inf.plate) : '', inf.phone ? ltr(inf.phone) : ''].filter(Boolean).join(' · ') + '</div>'
      + '<div class="row-sub">' + lists + ' ' + L('لائحة', 'liste(s)') + ' · ' + calls.length + ' ' + L('مكالمة/رسالة', 'appel(s)/message(s)') + (last ? ' · ' + L('آخر وحدة: ', 'dernier : ') + ahDT(last.date)[0] + ' ' + csLabel(last.result) : '') + '</div></div></div>'; }).join('') + '</div>'
    + (gs.length >= 50 ? '<div class="hint center">' + L('كيبانو أول 50. دقق البحث.', '50 premiers. Précisez la recherche.') + '</div>' : '');
}
App.input('ah-q', debounce(function (el) { AH.q = el.value; AH.groups = Archive.all ? ahSearch(AH.q) : []; var r = $('ah-res'); if (r) r.innerHTML = ahResultsHTML(); }, 300));
App.act('ah-open', function (el) { var g = AH.groups[+el.dataset.i]; if (g) ahOpen(g); });

/* الملف الكامل ديال الزبون */
function ahOpen(entries) {
  AH.cur = entries; var inf = ahInfo(entries), calls = ahCalls(entries);
  var lists = entries.slice().sort(function (a, b) { return String((b.h ? b.h.loadedAt || b.h.archivedAt : '9')).localeCompare(String((a.h ? a.h.loadedAt || a.h.archivedAt : '9'))); });
  Modal.open(Modal.head('📜 ' + esc(inf.name))
    + '<div class="kvs">' + kv(L('البوليصة', 'Police'), inf.police ? ltr(inf.police) : '') + kv(L('اللوحة', 'Immat.'), inf.plate ? ltr(inf.plate) : '')
      + kv(L('الهاتف', 'Tél.'), inf.phone ? ltr(inf.phone) : '') + kv(L('الهاتف 2', 'Tél. 2'), inf.phone2 ? ltr(inf.phone2) : '') + '</div>'
    + '<button class="btn pri wide" data-act="ah-print">📄 ' + L('طباعة / PDF', 'Imprimer / PDF') + '</button>'
    + '<div class="sec"><div class="sec-t">🗂️ ' + L('اللوائح اللي كان فيها', 'Listes où il figurait') + ' (' + lists.length + ')</div>'
      + lists.map(function (e) { var c = e.c; return '<div class="hist"><span><b>' + esc(ahListName(e.h)) + '</b>' + (c.dateE ? ' · ' + L('الانتهاء ', 'échéance ') + fmtD(c.dateE) : '')
        + (c.renewed ? ' · ✓ ' + L('جدّد', 'renouvelé') : c.renewConfirmed ? ' · ' + L('أكّد', 'confirmé') : '') + (c.agent ? ' · 👤 ' + esc(c.agent) : '')
        + (c.note ? '<br>📝 ' + esc(c.note) : '') + '</span><small>' + callCount(c) + ' 📞</small></div>'; }).join('') + '</div>'
    + '<div class="sec"><div class="sec-t">📞 ' + L('كاع المكالمات والرسائل', 'Tous les appels et messages') + ' (' + calls.length + ')</div>'
      + (calls.length ? calls.map(function (x) { var d = ahDT(x.date); return '<div class="hist"><span>' + csLabel(x.result) + (x.note ? ' — ' + esc(x.note) : '') + '<br><small>' + esc(x.list) + '</small></span><small>' + d[0] + ' ' + d[1] + (x.user ? '<br>' + esc(x.user) : '') + '</small></div>'; }).join('')
        : '<div class="muted sm">' + L('حتى مكالمة ما تسجلات لهاد الزبون.', 'Aucun appel enregistré.') + '</div>') + '</div>', 'wide');
}
App.act('ah-print', function () {
  var entries = AH.cur; if (!entries) return; var inf = ahInfo(entries), calls = ahCalls(entries), now = ahDT(new Date());
  var e = function (s) { return esc(String(s == null ? '' : s)); };
  var html = '<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' + e(inf.name) + '</title><style>'
    + 'body{font:13px "Segoe UI",Tahoma,Arial,sans-serif;color:#111;margin:24px}h1{font-size:18px;margin:0 0 4px}.m{color:#555;font-size:12px;margin-bottom:12px}'
    + '.i{display:flex;flex-wrap:wrap;gap:6px 22px;margin:10px 0 14px;font-size:13px}.i b{direction:ltr;unicode-bidi:isolate}'
    + 'table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:5px 7px;text-align:right;vertical-align:top}th{background:#eee}td.n{direction:ltr;unicode-bidi:isolate;white-space:nowrap}'
    + 'h2{font-size:14px;margin:18px 0 6px}</style></head><body>'
    + '<h1>' + L('سجل الاتصالات مع الزبون', 'Historique des contacts client') + '</h1>'
    + '<div class="m">' + L('تاريخ الطباعة: ', 'Imprimé le : ') + now[0] + ' ' + now[1] + ' · ' + e(App.user.name) + '</div>'
    + '<div class="i"><span>' + L('الزبون: ', 'Client : ') + '<b>' + e(inf.name) + '</b></span>' + (inf.police ? '<span>' + L('البوليصة: ', 'Police : ') + '<b>' + e(inf.police) + '</b></span>' : '')
      + (inf.plate ? '<span>' + L('الماتريكول: ', 'Immat. : ') + '<b>' + e(inf.plate) + '</b></span>' : '') + (inf.phone ? '<span>' + L('الهاتف: ', 'Tél. : ') + '<b>' + e(inf.phone) + '</b></span>' : '')
      + (inf.phone2 ? '<span>' + L('الهاتف 2: ', 'Tél. 2 : ') + '<b>' + e(inf.phone2) + '</b></span>' : '') + '</div>'
    + '<table><thead><tr><th>#</th><th>' + L('التاريخ', 'Date') + '</th><th>' + L('الساعة', 'Heure') + '</th><th>' + L('النتيجة', 'Résultat') + '</th><th>' + L('الملاحظة', 'Note') + '</th><th>' + L('الموظف', 'Agent') + '</th><th>' + L('اللائحة', 'Liste') + '</th></tr></thead><tbody>'
    + (calls.length ? calls.map(function (x, i) { var d = ahDT(x.date); return '<tr><td>' + (calls.length - i) + '</td><td class="n">' + d[0] + '</td><td class="n">' + d[1] + '</td><td>' + e(csLabel(x.result)) + '</td><td>' + e(x.note) + '</td><td>' + e(x.user) + '</td><td>' + e(x.list) + '</td></tr>'; }).join('')
      : '<tr><td colspan="7">' + L('حتى مكالمة ما تسجلات.', 'Aucun appel enregistré.') + '</td></tr>')
    + '</tbody></table>'
    + (entries.some(function (x) { return x.c.note; }) ? '<h2>' + L('الملاحظات', 'Notes') + '</h2><table><tbody>' + entries.filter(function (x) { return x.c.note; }).map(function (x) { return '<tr><td style="width:30%">' + e(ahListName(x.h)) + '</td><td>' + e(x.c.note) + '</td></tr>'; }).join('') + '</tbody></table>' : '')
    + '</body></html>';
  var f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(f); var d = f.contentWindow.document; d.open(); d.write(html); d.close();
  setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (x) { } setTimeout(function () { f.remove(); }, 60000); }, 300);
});

/* فبطاقة الزبون: المكالمات من اللوائح القديمة (بالبوليصة ولا الماتريكول) */
App.hook('contact.blocks', function (c) {
  if (!App.can('renew') || !c || (!kPolTail(c.police) && !kPlate(c.plate))) return '';
  if (!Archive.all) { if (Archive.ready && Archive.heads.length && !Archive.allP) Archive.loadAll().then(function () { App.refresh(); }); return ''; }
  var old = Archive.all.filter(function (e) { return ahSame(e.c, c); }); if (!old.length) return '';
  var calls = ahCalls(old), notes = old.filter(function (e) { return e.c.note; }).length, last = calls[0];
  return '<div class="ah-box">📜 <b>' + L('من اللوائح القديمة', 'Listes précédentes') + '</b>: ' + old.length + ' ' + L('لائحة', 'liste(s)') + ' · ' + calls.length + ' ' + L('مكالمة/رسالة', 'appel(s)') + (notes ? ' · 📝' + notes : '')
    + (last ? '<br><small>' + L('آخر وحدة: ', 'Dernier : ') + ahDT(last.date).join(' ') + ' · ' + csLabel(last.result) + (last.user ? ' · ' + esc(last.user) : '') + '</small>' : '')
    + ' <a href="#" data-act="ah-card" data-id="' + esc(c.id) + '">' + L('السجل الكامل ←', 'Historique complet →') + '</a></div>';
});
App.act('ah-card', function (el, ev) { if (ev && ev.preventDefault) ev.preventDefault(); var c = Contacts.map[el.dataset.id]; if (!c) return; Archive.loadAll().then(function () { ahOpen(ahCollect([{ c: c, h: null }])); }); });

App.register({ id: 'archive', perm: 'renew', icon: '🗄️', title: ['الأرشيف', 'Archives'], order: 30, render: renderArchive });
