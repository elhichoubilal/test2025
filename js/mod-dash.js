/* ══════════════════════════════════════════════════════════
   RenewPro 2 — mod-dash.js   (لوحة التحكم)
   أرقام اليوم، اختصارات، ملاحظات اليوم (Excel)، استيراد/تصدير الملاحظات،
   البحث الموحد، الموظفون والإسناد، النسخة الاحتياطية.
   أقسام أخرى تضيف بطاقاتها هنا عبر:  App.hook('dash.cards', fn) → [{ic,label,value,sub,cls,go}]
══════════════════════════════════════════════════════════ */
'use strict';

/* ───────── الموظفون (يعرّفهم المدير) — مستند rp_meta/users ───────── */
var Users = { map: {}, unsub: null };
function uKey(email) { return String(email || '').toLowerCase().replace(/[^a-z0-9]/g, '_'); }
Users.list = function () { return Object.keys(Users.map).map(function (k) { return Users.map[k]; }).filter(function (u) { return u && u.email; }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); }); };
Users.apply = function () {
  if (!App.user) return; var u = Users.map[uKey(App.user.email)], base = App.user.email.split('@')[0];
  App.user.name = (u && u.name) || base; App.user.admin = App.user.email === ADMIN_EMAIL || !!(u && u.role === 'admin');
  Contacts.ensureScope();
};
Users.start = function () { if (Users.unsub || !FB.db) return;
  Users.unsub = Meta.col().doc('users').onSnapshot(function (doc) { Users.map = doc.exists ? (doc.data() || {}) : {}; Users.apply(); App.refresh(); }, function () { }); };
Users.save = function (email, name, role) { var p = {}, isNew = !Users.map[uKey(email)]; p[uKey(email)] = { email: String(email).toLowerCase().trim(), name: name.trim(), role: role === 'admin' ? 'admin' : 'agent' };
  if (isNew) p[uKey(email)].perms = {};                      // موظف جديد: بلا أي صلاحية حتى يحدّدها المدير
  return Meta.col().doc('users').set(p, { merge: true }).catch(syncErr); };
Users.remove = function (email) { var p = {}; p[uKey(email)] = FB.FV.delete(); return Meta.col().doc('users').set(p, { merge: true }).catch(syncErr); };
App.on('login', function () { Users.start(); });
App.on('logout', function () { if (Users.unsub) { try { Users.unsub(); } catch (e) { } } Users.unsub = null; Users.map = {}; });

/* ───────── مكالمات اليوم ───────── */
function isToday(ts) { var d = new Date(ts); return !isNaN(d) && isoOf(d) === todayISO(); }
function todayCalls() {
  var out = [];
  renewBase().forEach(function (c) { (c.callHistory || []).forEach(function (h) { if (isToday(h.date)) out.push({ c: c, h: h }); }); });
  return out.sort(function (a, b) { return String(a.h.date).localeCompare(String(b.h.date)); });
}
/* Excel لملاحظات اليوم: من اتصلنا بهم اليوم ونتيجة كل واحد */
function exportToday() {
  var calls = todayCalls(); if (!calls.length) { toast(L('لا مكالمات ولا رسائل اليوم', 'Aucun appel aujourd\'hui'), 'err'); return; }
  var rows = calls.map(function (x) { var c = x.c, h = x.h;
    return { Heure: fmtDT(h.date).slice(6), Nom: c.name || '', Telephone: c.phone || '', Matricule: c.plate || '', Police: c.police || '', Echeance: c.dateE || '',
      Resultat: CS[h.result] ? CS[h.result].fr : h.result, النتيجة: CS[h.result] ? CS[h.result].ar : h.result, 'Note appel': h.note || '', 'Note client': c.note || '', Agent: h.user || '' }; });
  var by = {}; calls.forEach(function (x) { by[x.h.result] = (by[x.h.result] || 0) + 1; });
  var sum = Object.keys(by).map(function (k) { return { Resultat: CS[k] ? CS[k].fr : k, النتيجة: CS[k] ? CS[k].ar : k, Nombre: by[k] }; });
  sum.push({ Resultat: 'TOTAL', النتيجة: 'المجموع', Nombre: calls.length });
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Aujourdhui');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sum), 'Resume');
  XLSX.writeFile(wb, 'renewpro_jour_' + todayISO() + '.xlsx'); toast(L('📤 ملاحظات اليوم', '📤 Notes du jour'));
}
App.act('t-today', function () { Modal.close(); exportToday(); });
/* كل الملاحظات والنتائج للائحة الحالية */
App.act('t-export-notes', function () {
  var list = renewBase().filter(function (c) { return (c.note && String(c.note).trim()) || callCount(c); });
  if (!list.length) { toast(L('لا ملاحظات ولا مكالمات بعد', 'Aucune note ni appel'), 'err'); return; }
  Modal.close(); exportContactsXlsx(list, 'renewpro_notes_' + todayISO() + '.xlsx');
});
/* استيراد ملاحظات من Excel: البوليصة أو اللوحة + عمود الملاحظة. تُلحق بالملاحظة الموجودة ولا تمحوها */
App.act('t-import-notes', function () { Modal.close(); var f = $('file-in'); f.value = ''; f.dataset.inp = 't-notes-file'; f.click(); });
App.input('t-notes-file', function (el) {
  var file = el.files && el.files[0]; if (!file) return; var rd = new FileReader();
  rd.onload = function (e) { try {
    var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    var hdr = (rows[0] || []).map(normH), find = function (keys) { for (var i = 0; i < hdr.length; i++) { for (var j = 0; j < keys.length; j++) { if (hdr[i].indexOf(keys[j]) >= 0) return i; } } return -1; };
    var iNote = find(['note', 'remarq', 'observ', 'ملاحظ']), iPol = find(['police', 'بوليص']), iPl = find(['matricul', 'immat', 'لوحة']), iAtt = find(['attest', 'شهاد']);
    if (iNote < 0) { toast(L('لم أجد عمود الملاحظة (Note)', 'Colonne « Note » introuvable'), 'err'); return; }
    if (iPol < 0 && iPl < 0 && iAtt < 0) { toast(L('الملف يحتاج عمود البوليصة أو اللوحة', 'Il faut une colonne Police ou Immat.'), 'err'); return; }
    var byPol = {}, byPl = {}, byAtt = {};
    renewBase().forEach(function (c) { var a = kPolTail(c.police), b = kPlate(c.plate), t = kAtt(c.att);
      if (a) (byPol[a] = byPol[a] || []).push(c); if (b) (byPl[b] = byPl[b] || []).push(c); if (t) (byAtt[t] = byAtt[t] || []).push(c); });
    var ops = [], ok = 0, same = 0, miss = 0;
    for (var r = 1; r < rows.length; r++) { var note = String(xCell(rows[r], iNote) || ''); if (!note) continue;
      var pa = byPol[kPolTail(xCell(rows[r], iPol))] || [], la = byPl[kPlate(xCell(rows[r], iPl))] || [], hit = null;
      if (pa.length && la.length) { hit = pa.filter(function (c) { return la.indexOf(c) >= 0; }); if (!hit.length) hit = null; }
      if (!hit && iAtt >= 0 && byAtt[kAtt(xCell(rows[r], iAtt))]) hit = byAtt[kAtt(xCell(rows[r], iAtt))];
      if (!hit && pa.length === 1) hit = pa; if (!hit && la.length === 1) hit = la;
      if (!hit) { miss++; continue; }
      hit.forEach(function (c) { var old = String(c.note || '').trim(); if (old.indexOf(note) >= 0) { same++; return; }
        ops.push({ ref: Contacts.col().doc(c.id), upd: { note: old ? old + ' | ' + note : note } }); ok++; }); }
    FB.batches(ops).then(function () { alert(L('الملاحظات: أُضيفت ' + ok + ' · موجودة مسبقاً ' + same + ' · بلا زبون مطابق ' + miss, 'Notes : ' + ok + ' ajoutées · ' + same + ' déjà présentes · ' + miss + ' sans client')); }).catch(syncErr);
  } catch (err) { toast(err.message, 'err'); } };
  rd.readAsArrayBuffer(file);
});

/* ───────── لوحة التحكم ───────── */
/* v6: بطاقة صغيرة: أيقونة + رقم + عنوان (التفصيل الإضافي سطر صغير) */
function kpi(o) {
  return '<button class="kpi ' + (o.cls || '') + '"' + (o.go ? ' data-act="dash-go" data-go="' + esc(o.go) + '"' : '') + (o.sub ? ' title="' + esc(String(o.sub).replace(/<[^>]+>/g, '')) + '"' : '') + '>'
    + '<span class="kpi-ic">' + o.ic + '</span><span class="kpi-t"><b>' + o.value + '</b><span class="kpi-l">' + o.label + '</span>' + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</span></button>';
}
/* البطاقات مجموعة حسب القسم، بنفس ترتيب الأقسام ديال 🎛️ لوحة التحكم */
function kpiGroups(cards) {
  var by = {}, keys = [];
  cards.forEach(function (c) { var m = App.mod(c.mod || 'renew') || App.mod('renew'), k = m ? App.modKey(m) : 'renew';
    if (!by[k]) { by[k] = { m: m, cards: [] }; keys.push(k); } by[k].cards.push(c); });
  keys.sort(function (a, b) { return App.modRank(by[a].m) - App.modRank(by[b].m); });
  return '<div class="kgrps">' + keys.map(function (k) { var g = by[k], m = g.m, t = m ? (m.group ? (m.groupTitle ? L(m.groupTitle[0], m.groupTitle[1]) : '') : L(m.title[0], m.title[1])) : '';
    return '<div class="kgrp"><button class="kgrp-h" data-act="nav" data-id="' + esc(m ? m.id : 'renew') + '">' + (m ? (m.group ? (m.groupIcon || m.icon) : m.icon) : '') + ' ' + esc(t) + '</button>'
      + '<div class="kpis">' + g.cards.map(kpi).join('') + '</div></div>'; }).join('') + '</div>';
}
function renderDash(el) {
  if (!App.can('renew')) {                                           // موظف بلا «التجديد»: الترحيب وبطاقات صلاحياته فقط
    var oc = App.runList('dash.cards');
    el.innerHTML = '<div class="page"><div class="dash-h"><div><b>' + L('مرحباً ', 'Bonjour ') + esc(App.user.name) + '</b><span>' + fmtD(todayISO()) + '</span></div></div>'
      + (App.visibleMods().length <= 1                                // ما عندو حتى إذن: غير الرئيسية فالقائمة
          ? '<div class="empty"><span>🛡️ ' + L('ما عندك حتى إذن دابا. تواصل مع المسؤول باش يفتح ليك الأقسام.', 'Vous n\'avez encore aucun accès. Contactez le responsable pour ouvrir les sections.') + '</span></div>'
          : oc.length ? kpiGroups(oc) : '<div class="empty"><span>' + L('اختر قسماً من القائمة.', 'Choisissez une section.') + '</span></div>') + '</div>';
    return;
  }
  if (!Contacts.ready) { el.innerHTML = '<div class="empty">⏳ ' + L('جارٍ التحميل…', 'Chargement…') + '</div>'; return; }
  var adm = App.user.admin, live = renewBase().filter(function (c) { return !isStale(c); });
  var todo = live.filter(function (c) { return !isOut(c); });      // من بقي للاتصال
  var cnt = function (fn) { return todo.filter(fn).length; }, all = function (fn) { return live.filter(fn).length; }, dl = function (c) { return daysLeft(c.dateE); };
  var calls = todayCalls(), by = {}; calls.forEach(function (x) { by[x.h.result] = (by[x.h.result] || 0) + 1; });
  var handledToday = live.filter(function (c) { return c.handled && isToday(c.handled); }).length;
  var cards = [
    { ic: '🔴', label: L('منتهي', 'Expirés'), value: cnt(function (c) { return !c.renewed && dl(c) !== null && dl(c) < 0; }), cls: 'red', go: 'renew:expired' },
    { ic: '🟠', label: L('ينتهي اليوم', 'Aujourd\'hui'), value: cnt(function (c) { return !c.renewed && dl(c) === 0; }), cls: 'amber', go: 'renew:today' },
    { ic: '🟡', label: L('خلال 3 أيام', 'Sous 3 jours'), value: cnt(function (c) { return !c.renewed && dl(c) !== null && dl(c) >= 0 && dl(c) <= 3; }), go: 'renew:d3' },
    { ic: '🔵', label: L('خلال 7 أيام', 'Sous 7 jours'), value: cnt(function (c) { return !c.renewed && dl(c) !== null && dl(c) >= 0 && dl(c) <= 7; }), go: 'renew:d7' },
    { ic: '⏰', label: L('متابعة اليوم', 'Rappels du jour'), value: all(followDue), cls: all(followDue) ? 'amber' : '', go: 'renew:fdue' },
    { ic: '✅', label: L('مؤكد حان موعده', 'Confirmés à relancer'), value: all(confirmedDue), cls: 'green', go: 'renew:confirmed', sub: L('من ' + all(function (c) { return c.renewConfirmed && !c.renewed; }) + ' مؤكد', 'sur ' + all(function (c) { return c.renewConfirmed && !c.renewed; }) + ' confirmés') },
    { ic: '✔', label: L('تم الاتصال بهم', 'Contactés'), value: live.length - todo.length, go: 'renew:handled', sub: L('اليوم: ', 'auj. : ') + handledToday }
  ].concat(App.runList('dash.cards'));
  var resKeys = ['ans', 'no', 'busy', 'later', 'wa', 'sms', 'off', 'bv', 'hz', 'dead'].filter(function (k) { return by[k]; });
  var tool = function (act, ic, ar, fr) { return '<button class="tbtn2" data-act="' + act + '" title="' + esc(L(ar, fr)) + '"><span>' + ic + '</span><small>' + esc(L(ar, fr)) + '</small></button>'; };
  el.innerHTML = '<div class="page dash6">'
    + rulesBoxHTML()
    + '<div class="dash-h"><div><b>' + L('مرحباً ', 'Bonjour ') + esc(App.user.name) + '</b><span>' + fmtD(todayISO()) + (Meta.get('listName', '') ? ' · 📋 ' + esc(Meta.get('listName', '')) : '') + '</span></div>'
      + '<div class="dash-btns"><button class="btn sm" data-act="r-range" title="' + L('حسب التاريخ', 'Par date') + '">📅</button><button class="btn sm pri" data-act="dash-session">▶ ' + L('جلسة اتصال', 'Session') + '</button></div></div>'
    + kpiGroups(cards)
    + '<div class="card day6"><div class="day6-h"><b>📞 ' + L('عمل اليوم', 'Activité du jour') + '</b>'
      + '<span class="day6-n">' + calls.length + ' ' + L('مكالمة ورسالة', 'appels/messages') + ' · ' + handledToday + ' ' + L('زبون', 'clients') + '</span>'
      + '<span class="day6-a"><button class="btn sm" data-act="t-today" title="' + L('ملاحظات اليوم (Excel)', 'Notes du jour (Excel)') + '">📥</button><button class="btn sm" data-act="t-print" title="' + L('طباعة تقرير اليوم', 'Imprimer le rapport') + '">🖨️</button></span></div>'
      + (resKeys.length ? '<div class="res-line">' + resKeys.map(function (k) { return '<span style="--c:' + CS[k].color + '">' + csLabel(k) + ' <b>' + by[k] + '</b></span>'; }).join('') + '</div>' : '')
      + agentStatsHTML(calls) + '</div>'
    + '<div class="tools6">'
      + tool('search-open', '🔍', 'بحث', 'Recherche')
      + tool('h-open', '✔', 'تم الاتصال بهم', 'Contactés')
      + tool('b-start', '📨', 'إرسال جماعي', 'Envoi groupé')
      + tool('t-export-notes', '📝', 'تصدير الملاحظات', 'Exporter notes')
      + tool('t-import-notes', '📝', 'استيراد ملاحظات', 'Importer notes')
      + tool('t-trash', '🗑️', 'السلة', 'Corbeille')
      + (App.canUp() ? tool('r-import', '📥', 'لائحة جديدة', 'Nouvelle liste') + (typeof debtOn === 'function' && debtOn() ? tool('d-import', '💰', 'ملف الديون', 'Fichier dettes') : '') : '')
      + (adm ? tool('u-assign', '👥', 'إسناد الزبناء', 'Affecter') + tool('t-backup', '💾', 'نسخة احتياطية', 'Sauvegarde') + tool('nav-control', '🎛️', 'لوحة التحكم', 'Contrôle') : '')
    + '</div>'
    + '</div>';
}
App.act('nav-control', function () { App.go('control'); });
/* إحصاء اليوم لكل موظف (للمدير) */
function agentStatsHTML(calls) {
  if (!App.user.admin || !calls.length) return '';
  var by = {}; calls.forEach(function (x) { var u = x.h.user || '—', o = by[u] || (by[u] = { n: 0, ans: 0, msg: 0 }); o.n++; if (x.h.result === 'ans') o.ans++; if (x.h.result === 'wa' || x.h.result === 'sms') o.msg++; });
  return '<div class="lbl">👥 ' + L('حسب الموظف (اليوم)', 'Par agent (aujourd\'hui)') + '</div>' + Object.keys(by).sort(function (a, b) { return by[b].n - by[a].n; }).map(function (u) { var o = by[u];
    return '<div class="kv"><span>' + esc(u) + '</span><b>' + o.n + ' <small class="muted">· ✅ ' + o.ans + ' · 💬 ' + o.msg + '</small></b></div>'; }).join('');
}
/* طباعة تقرير اليوم */
App.act('t-print', function () {
  var calls = todayCalls(); if (!calls.length) { toast(L('لا مكالمات ولا رسائل اليوم', 'Aucun appel aujourd\'hui'), 'err'); return; }
  var by = {}; calls.forEach(function (x) { by[x.h.result] = (by[x.h.result] || 0) + 1; });
  var w = window.open('', '_blank'); if (!w) { toast(L('اسمح بالنوافذ المنبثقة للطباعة', 'Autorisez les fenêtres pop-up'), 'err'); return; }
  w.document.write('<!DOCTYPE html><html dir="' + (App.lang === 'fr' ? 'ltr' : 'rtl') + '"><head><meta charset="UTF-8"><title>RenewPro ' + todayISO() + '</title><style>body{font-family:Tahoma,Arial,sans-serif;font-size:12px;margin:18px}h2{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #999;padding:4px 6px;text-align:start}th{background:#eee}.s{margin:6px 0;color:#444}</style></head><body>'
    + '<h2>RenewPro — ' + L('تقرير اليوم', 'Rapport du jour') + ' ' + fmtD(todayISO()) + '</h2>'
    + '<div class="s">' + calls.length + ' ' + L('مكالمة ورسالة', 'appels et messages') + ' · ' + Object.keys(by).map(function (k) { return (CS[k] ? (App.lang === 'fr' ? CS[k].fr : CS[k].ar) : k) + ': ' + by[k]; }).join(' · ') + '</div>'
    + '<table><thead><tr><th>' + [L('الساعة', 'Heure'), L('الزبون', 'Client'), L('الهاتف', 'Tél.'), L('اللوحة', 'Immat.'), L('النتيجة', 'Résultat'), L('ملاحظة', 'Note'), L('الموظف', 'Agent')].join('</th><th>') + '</th></tr></thead><tbody>'
    + calls.map(function (x) { return '<tr><td>' + fmtDT(x.h.date).slice(6) + '</td><td>' + esc(x.c.name || '') + '</td><td>' + esc(x.c.phone || '') + '</td><td>' + esc(x.c.plate || '') + '</td><td>' + esc(CS[x.h.result] ? (App.lang === 'fr' ? CS[x.h.result].fr : CS[x.h.result].ar) : x.h.result) + '</td><td>' + esc(x.h.note || x.c.note || '') + '</td><td>' + esc(x.h.user || '') + '</td></tr>'; }).join('')
    + '</tbody></table></body></html>');
  w.document.close(); setTimeout(function () { try { w.focus(); w.print(); } catch (e) { } }, 300);
});
App.act('dash-go', function (el) {
  var g = el.dataset.go || '', p = g.split(':');
  if (p[0] === 'renew') { Renew.filter = p[1] || 'all'; Renew.q = ''; }
  else if (p[0] === 'debts' && typeof Debts !== 'undefined') { Debts.f = p[1] || 'all'; Debts.q = ''; }
  else if (p[0] === 'sin' && typeof Sin !== 'undefined') { if (p[1] === 'relance' || p[1] === 'old') { Sin.age = p[1]; Sin.statut = 'all'; } }
  else if (p[0] === 'c-hist' && typeof H7 !== 'undefined') { if (p[1]) H7.f = p[1]; H7.q = ''; }
  else if (p[0] === 'chq' && typeof App.acts['c8-chq-open'] === 'function') { App.acts['c8-chq-open'](); return; }
  App.go(p[0]); App.emit('go.' + p[0], p[1]);
});
App.act('dash-session', function () { Renew.filter = 'all'; Renew.q = ''; App.go('renew'); Session.start(); });

/* ───────── التحكم (للمدير) ───────── */
function controlHTML() {
  var off = Meta.get('modsOff', []), users = Users.list();
  var mods = App.mods.filter(function (m) { return m.id !== 'dash' && m.id !== 'settings' && m.id !== 'renew'; });
  return '<div class="card"><div class="card-t">🎛️ ' + L('التحكم في البرنامج', 'Contrôle de l\'application') + '</div>'
    + '<div class="lbl">' + L('الأقسام الظاهرة للموظفين', 'Sections visibles pour les agents') + '</div>'
    + mods.map(function (m) { return '<label class="chk"><input type="checkbox" data-inp="ctl-mod" data-id="' + esc(m.id) + '"' + (off.indexOf(m.id) < 0 ? ' checked' : '') + '><span>' + m.icon + ' ' + esc(L(m.title[0], m.title[1])) + '</span></label>'; }).join('')
    + '<label class="chk"><input type="checkbox" data-inp="ctl-all"' + (Meta.get('agentsSeeAll', false) ? ' checked' : '') + '><span>' + L('الموظف يرى كل الزبناء (لا المسندين إليه فقط)', 'L\'agent voit tous les clients (pas seulement les siens)') + '</span></label>'
    + '<div class="lbl">👥 ' + L('الموظفون', 'Agents') + '</div>'
    + '<div class="lines">' + (users.length ? users.map(function (u) { var n = Contacts.list.filter(function (c) { return !c.deleted && c.agent === u.name; }).length;
        return '<div class="line"><div><b>' + esc(u.name) + (u.role === 'admin' ? ' ★' : '') + '</b><small class="ltr">' + esc(u.email) + '</small><small> · ' + n + ' ' + L('زبون', 'clients') + '</small></div>'
          + '<button class="x sm" data-act="u-del" data-e="' + esc(u.email) + '">✕</button></div>'; }).join('') : '<div class="muted sm">' + L('لم تُضف موظفين بعد', 'Aucun agent ajouté') + '</div>') + '</div>'
    + '<div class="form u-form"><label class="f"><span>' + L('بريد الموظف (حسابه في Firebase)', 'Email de l\'agent (son compte Firebase)') + '</span><input id="u-email" type="email" dir="ltr"></label>'
      + '<label class="f"><span>' + L('الاسم الظاهر', 'Nom affiché') + '</span><input id="u-name"></label>'
      + '<label class="f"><span>' + L('الصلاحية', 'Rôle') + '</span><select id="u-role" class="inp"><option value="agent">' + L('موظف', 'Agent') + '</option><option value="admin">' + L('مدير', 'Administrateur') + '</option></select></label></div>'
    + '<button class="btn wide" data-act="u-add">➕ ' + L('إضافة / تحديث موظف', 'Ajouter / mettre à jour') + '</button>'
    + '<div class="hint">' + L('الحساب نفسه (البريد وكلمة السر) يُنشأ في لوحة Firebase ← Authentication. هنا تحدّد اسمه وصلاحيته فقط.', 'Le compte (email + mot de passe) se crée dans Firebase → Authentication. Ici vous définissez son nom et son rôle.') + '</div>'
    + '</div>';
}
App.input('ctl-mod', function (el) { var off = (Meta.get('modsOff', []) || []).slice(), id = el.dataset.id, p = off.indexOf(id); if (el.checked) { if (p >= 0) off.splice(p, 1); } else if (p < 0) off.push(id); Meta.save({ modsOff: off }); App.renderNav(); });
App.input('ctl-all', function (el) { Meta.save({ agentsSeeAll: el.checked }); });
App.act('u-add', function () { var em = $('u-email').value.trim(), nm = $('u-name').value.trim(); if (!/.+@.+\..+/.test(em) || !nm) { toast(L('أدخل البريد والاسم', 'Email et nom requis'), 'err'); return; } Users.save(em, nm, $('u-role').value); toast(L('👥 حُفظ الموظف', '👥 Agent enregistré')); });
App.act('u-del', function (el) { if (confirm(L('حذف هذا الموظف من اللائحة؟', 'Retirer cet agent ?'))) Users.remove(el.dataset.e); });
/* إسناد اللائحة المعروضة حالياً في قسم التجديد (حسب الفلتر والبحث) إلى موظف */
App.act('u-assign', function () {
  var users = Users.list(), list = renewList(Renew.filter, Renew.q);
  Modal.open(Modal.head('👥 ' + L('إسناد الزبناء', 'Affecter des clients'))
    + '<div class="box">' + L('سيُسند ', 'Affectation de ') + '<b>' + list.length + '</b> ' + L('زبون: المعروضون الآن في قسم التجديد (الفلتر: ', 'clients : ceux affichés dans Renouvellements (filtre : ') + esc(Renew.filter) + (Renew.q ? ' · «' + esc(Renew.q) + '»' : '') + ')</div>'
    + '<div class="menu">' + users.map(function (u) { return '<button class="menu-i" data-act="u-assign-to" data-n="' + esc(u.name) + '">' + esc(u.name) + '</button>'; }).join('')
    + '<button class="menu-i" data-act="u-assign-to" data-n="">' + L('— بلا مسؤول —', '— Aucun —') + '</button></div>'
    + (users.length ? '' : '<div class="hint">' + L('أضف الموظفين أولاً من لوحة التحكم.', 'Ajoutez d\'abord les agents.') + '</div>'), 'small');
});
App.act('u-assign-to', function (el) { var list = renewList(Renew.filter, Renew.q), n = el.dataset.n;
  FB.batches(list.map(function (c) { return { ref: Contacts.col().doc(c.id), upd: { agent: n } }; })).then(function () { Modal.close(); toast(L('👥 أُسند ' + list.length + ' زبون', '👥 ' + list.length + ' clients affectés')); }).catch(syncErr); });

/* ───────── نسخة احتياطية كاملة ───────── */
App.act('t-backup', function () {
  if (!App.user.admin) return;
  var data = { app: 'RenewPro', version: App.version, date: new Date().toISOString(), contacts: Contacts.list, settings: Meta.settings, users: Users.map,
    debts: (typeof Debts !== 'undefined') ? Debts.rows : [], debtMap: (typeof Debts !== 'undefined') ? Debts.map : {}, phones: (typeof Phones !== 'undefined') ? Phones.map : {} };
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  a.download = 'renewpro_sauvegarde_' + todayISO() + '.json'; document.body.appendChild(a); a.click(); a.remove();
  toast(L('💾 حُمّلت النسخة الاحتياطية', '💾 Sauvegarde téléchargée'));
});

/* ───────── بحث شامل موحّد 5×1 (التجديد + سجل الحاسبة + الديون + الحوادث + الفواتير) ───────── */
App.act('search-open', function () {
  if (!App.user) return;
  Modal.open(Modal.head('🔍 ' + L('البحث الشامل الفوري (5 أقسام)', 'Recherche globale instantanée (5 sections)'))
    + '<div class="search" style="margin-bottom:8px"><span>🔍</span><input id="gs-q" data-inp="gs-q" autocomplete="off" placeholder="' + L('ابحث بالاسم، الهاتف، اللوحة، البوليصة، رقم الحادثة أو الفاتورة…', 'Nom, tél., immat., police, N° sinistre ou facture…') + '"></div>'
    + '<div id="gs-res" class="lines tall"><div class="muted sm center" style="padding:14px">' + L('اكتب حرفين على الأقل للبحث الفوري في: التجديد · سجل الحاسبة · الديون · الحوادث · الفواتير', 'Tapez au moins 2 caractères : Renouvellements · Historique · Dettes · Sinistres · Factures') + '</div></div>', 'wide');
  setTimeout(function () { var i = $('gs-q'); if (i) i.focus(); }, 50);
});
App.input('gs-q', debounce(function (el) {
  var q = el.value.toLowerCase().trim(), out = $('gs-res'); if (!out) return;
  if (q.length < 2) { out.innerHTML = ''; return; }
  var cs = (App.can('renew') && typeof renewBase === 'function') ? renewBase().filter(function (c) {
    return [c.name, c.phone, c.phone2, c.plate, c.police, c.att, c.note].join(' ').toLowerCase().indexOf(q) >= 0;
  }).slice(0, 15) : [];
  var ds = (typeof Debts !== 'undefined' && typeof debtOn === 'function' && debtOn() && Debts.rows.length) ? debtGroups().filter(function (g) {
    return g.total > 0.005 && [g.name, g.phone, g.pol].concat(g.lines.map(function (d) { return (d.plate || '') + ' ' + (d.att || ''); })).join(' ').toLowerCase().indexOf(q) >= 0;
  }).slice(0, 15) : [];
  var hs = [];
  if (App.can('calc')) {
    try {
      var hAll = JSON.parse(localStorage.getItem('eurv102_h') || '[]') || [];
      hs = hAll.filter(function (h) { return h && [h.client, h.plate, h.num, h.police, h.phone, h.attest, h.chequeNum].join(' ').toLowerCase().indexOf(q) >= 0; }).slice(0, 15);
    } catch (e) { }
  }
  var ss = (typeof Sin !== 'undefined' && App.can('sin') && Array.isArray(Sin.rows)) ? Sin.rows.filter(function (s) {
    return [s.ordre, s.dossier, s.assure, s.police, s.plate, s.tel, s.refCie, s.advCie].join(' ').toLowerCase().indexOf(q) >= 0;
  }).slice(0, 15) : [];
  var fs = (typeof Fac8 !== 'undefined' && Fac8.getList) ? Fac8.getList().filter(function (f) {
    return [f.facNum, f.client, f.police, f.plate, f.opNum].join(' ').toLowerCase().indexOf(q) >= 0;
  }).slice(0, 10) : [];

  var html = '';
  if (cs.length) {
    html += '<div class="lbl">🔄 ' + L('التجديد', 'Renouvellements') + ' (' + cs.length + ')</div>' + cs.map(function (c) {
      return '<div class="line pick" data-act="gs-c" data-id="' + esc(c.id) + '"><div><b>' + esc(c.name || '—') + '</b><small>' + (c.phone ? ltr(c.phone) + ' · ' : '') + (c.plate ? ltr(c.plate) : '') + (c.police ? ' · ' + ltr(c.police) : '') + (isStale(c) ? ' · 🗄️' : '') + '</small></div>'
        + '<div style="display:flex;align-items:center;gap:6px">' + daysChip(c) + '<button class="ib" data-act="c360-open" data-id="' + esc(c.id) + '" title="360°">🌐</button></div></div>';
    }).join('');
  }
  if (hs.length) {
    html += '<div class="lbl">🧮 ' + L('سجل الحاسبة', 'Historique calculatrice') + ' (' + hs.length + ')</div>' + hs.map(function (h) {
      return '<div class="line pick" data-act="gs-h" data-num="' + esc(h.num || '') + '"><div><b>' + esc(h.client || '—') + '</b> <small class="ltr">' + esc(h.num || '') + ' · ' + esc(h.date || '') + (h.plate ? ' · ' + esc(h.plate) : '') + '</small></div>'
        + '<div style="display:flex;align-items:center;gap:6px"><b class="ltr">' + money(+h.paid || 0) + ' DH</b>' + (h.unpaid ? '<span class="dc amber">⏳</span>' : '') + '<button class="ib" data-act="c360-open" data-name="' + esc(h.client || '') + '" data-plate="' + esc(h.plate || '') + '" data-police="' + esc(h.police || '') + '" title="360°">🌐</button></div></div>';
    }).join('');
  }
  if (ds.length) {
    html += '<div class="lbl">💰 ' + L('الديون', 'Dettes') + ' (' + ds.length + ')</div>' + ds.map(function (g) {
      return '<div class="line pick" data-act="d-sheet-g" data-id="' + esc(g.gid) + '"><div><b>' + esc(g.name) + '</b><small>' + (g.pol ? ltr(g.pol) : '') + (g.phone ? ' · ' + ltr(g.phone) : '') + '</small></div><b class="red-t ltr">' + moneyH(g.total, 1) + '</b></div>';
    }).join('');
  }
  if (ss.length) {
    html += '<div class="lbl">🚗 ' + L('الحوادث', 'Sinistres') + ' (' + ss.length + ')</div>' + ss.map(function (s) {
      return '<div class="line pick" data-act="gs-s" data-id="' + esc(s.id) + '"><div><b>N° ' + esc(s.ordre || s.dossier || '') + ' — ' + esc(s.assure || '—') + '</b><small>' + esc(s.dateSin || '') + (s.police ? ' · ' + ltr(s.police) : '') + (s.advCie ? ' · ' + esc(s.advCie) : '') + '</small></div><span class="dc">' + esc(s.statut || 'en_cours') + '</span></div>';
    }).join('');
  }
  if (fs.length) {
    html += '<div class="lbl">📑 ' + L('الفواتير', 'Factures') + ' (' + fs.length + ')</div>' + fs.map(function (f) {
      var id = esc(f.id || f.facNum);
      return '<div class="line pick" data-act="fac8-reopen" data-id="' + id + '"><div><b class="ltr">' + esc(f.facNum || '') + '</b> — <b>' + esc(f.client || '—') + '</b><small class="ltr"> · ' + esc(f.date || '') + '</small></div><b class="ltr">' + money(+f.total || 0) + ' DH</b></div>';
    }).join('');
  }
  out.innerHTML = html || '<div class="muted sm center" style="padding:16px">' + L('لا توجد نتائج مطابقة', 'Aucun résultat correspondant') + '</div>';
}, 160));
App.act('gs-c', function (el, e) { if (e && e.target && e.target.closest('[data-act="c360-open"]')) return; Modal.close(); if (App.page !== 'renew') App.go('renew'); Sheet.open(el.dataset.id); });
App.act('gs-h', function (el, e) { if (e && e.target && e.target.closest('[data-act="c360-open"]')) return; Modal.close(); if (typeof H7 !== 'undefined') { H7.q = el.dataset.num || ''; H7.f = 'all'; } App.go('c-hist'); });
App.act('gs-s', function (el) { Modal.close(); if (typeof Sin !== 'undefined' && typeof sinOpen === 'function') { var r = Sin.rows.filter(function (x) { return x.id === el.dataset.id; })[0]; if (r) sinOpen(r); } });

App.register({ id: 'dash', icon: '🏠', title: ['الرئيسية', 'Accueil'], order: 1, render: renderDash,
  badge: function () { var n = renewBase().filter(function (c) { return !isStale(c) && confirmedDue(c); }).length; return n ? String(n) : ''; } });
