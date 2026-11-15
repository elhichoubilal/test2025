/* ══════════════════════════════════════════════════════════
   RenewPro v6 — mod-sheets.js   (📊 النسخ التلقائي إلى Google Sheets)
   • كل ساعة: البرنامج كيصيفط كل قسم لورقة بسميتو فـ Google Sheet ديال المدير (اتجاه واحد: البرنامج ← الشيت).
   • كل أسبوع: السكريبت كيصاوب نسخة كاملة بالتاريخ («RenewPro backup 2026-10-14») فـ Google Drive.
   • كيخدم فجهاز المدير فقط (البيانات كاملة) ملي البرنامج محلول. جهاز واحد فكل ساعة (قفل فـ rp_meta/settings).
   • أي قسم جديد: يزيد App.hook('sheets', fn) ولا sheets: fn فـ App.register → كيتصاوب ليه ورقة وحدو.
     fn() كترجع [{ name: 'اسم الورقة', rows: [ {عمود: قيمة, …}, … ] }]  (ولا headers + rows كمصفوفات).
   • الوصل محمي بمفتاح سري (sheetsKey) مكتوب داخل السكريبت.
══════════════════════════════════════════════════════════ */
'use strict';

var Sheets = { busy: false, timer: null, HOUR: 3600000, WEEK: 7 * 86400000 };
/* غير المدير: الموظف كيشوف غير جزء من البيانات (الزبناء المسندين ليه…)، وإلا صيفط هو كيكتب فوق الشيت بنسخة ناقصة */
function shCan() { return !!(App.user && App.user.admin); }

/* ───────── تحويل البيانات لجداول ───────── */
function shVal(v) {
  if (v == null) return '';
  if (typeof v === 'object') { try { v = JSON.stringify(v); } catch (e) { v = String(v); } }
  if (typeof v === 'string') { if (v.length > 45000) v = v.slice(0, 45000) + '…'; if (/^[=+\-@]/.test(v)) v = "'" + v; }
  return v;
}
/* لائحة كائنات → رأس + سطور (كاع المفاتيح، المفضلة أولاً): أي خانة جديدة كتبان وحدها */
function shTable(list, first, skip) {
  var cols = [], seen = {}; skip = skip || {};
  (first || []).forEach(function (k) { if (!seen[k]) { seen[k] = 1; cols.push(k); } });
  list.forEach(function (o) { Object.keys(o || {}).forEach(function (k) { if (!seen[k] && !skip[k]) { seen[k] = 1; cols.push(k); } }); });
  return { headers: cols, rows: list.map(function (o) { return cols.map(function (k) { return shVal(o ? o[k] : ''); }); }) };
}
function shSheet(name, list, first, skip) { var t = shTable(list || [], first, skip); return { name: name, headers: t.headers, rows: t.rows }; }

/* ───────── الأقسام الموجودة ───────── */
App.hook('sheets', function () {
  var out = [];
  /* 🔄 التجديد: الزبناء + كل مكالمة فسطر */
  if (typeof Contacts !== 'undefined' && Contacts.ready) {
    var cl = Contacts.list.filter(function (c) { return !c.deleted; });
    out.push(shSheet('التجديد', cl.map(function (c) { var o = {}; for (var k in c) if (k !== 'callHistory') o[k] = c[k]; o.calls = (c.callHistory || []).length; return o; }),
      ['ord', 'name', 'phone', 'phone2', 'plate', 'police', 'att', 'dateS', 'dateE', 'prime', 'agent', 'note', 'renewed', 'renewConfirmed', 'handled', 'calls']));
    var calls = []; cl.forEach(function (c) { (c.callHistory || []).forEach(function (h) { calls.push({ date: h.date, client: c.name, phone: c.phone, plate: c.plate, police: c.police, result: (typeof CS !== 'undefined' && CS[h.result]) ? CS[h.result].ar : h.result, note: h.note || '', user: h.user || '' }); }); });
    calls.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    out.push(shSheet('التجديد - المكالمات', calls));
  }
  /* 💰 الديون */
  if (typeof Debts !== 'undefined' && Debts.rows && Debts.rows.length) out.push(shSheet('الديون', Debts.rows, ['name', 'police', 'plate', 'phone', 'dateOp', 'du', 'au', 'prime', 'solde', 'status', 'promise', 'note', 'payments']));
  /* 🚗 الحوادث: نفس أعمدة السجل + الحالة + الملاحظات */
  if (typeof Sin !== 'undefined' && Sin.ready && Sin.rows.length) {
    out.push({ name: 'الحوادث', headers: SIN_COLS.map(function (c) { return (c.g ? c.g + ' - ' : '') + c.label; }).concat(['Statut', 'Notes']),
      rows: Sin.rows.slice().sort(function (a, b) { return sinDeclKey(a) - sinDeclKey(b); }).map(function (r) {
        return SIN_COLS.map(function (c) { return shVal(r[c.k]); }).concat([(SIN_STAT[r.statut || 'en_cours'] || {}).label || '', shVal((r.notes || []).map(function (n) { return fmtDT(n.at) + ' ' + (n.by || '') + ': ' + n.t; }).join(' | '))]); }) });
  }
  /* 🔔 المهام */
  if (typeof Tasks !== 'undefined' && Tasks.ready && Tasks.list.length) out.push(shSheet('المهام', Tasks.list, ['date', 'time', 'title', 'assigneeName', 'note', 'done', 'doneBy', 'by'], { byEmail: 1, notified: 1 }));
  /* 📇 قاعدة الأرقام */
  if (typeof PB !== 'undefined' && PB.big) { var pr = []; Object.keys(PB.big).forEach(function (k) { pr.push({ key: k, phone: PB.big[k] }); }); if (pr.length) out.push(shSheet('قاعدة الأرقام', pr)); }
  /* 🗂️ الملفات المحمّلة (اللائحة فقط، ماشي المحتوى) */
  if (typeof Files !== 'undefined' && Files.heads.length) out.push(shSheet('الملفات المحمّلة', Files.heads.map(function (h) { return { name: h.name, kind: h.kind, size: h.size, at: h.at, by: h.by, last: h.last, times: h.times || 1 }; })));
  /* 🗄️ الأرشيف (رؤوس اللوائح) */
  if (typeof Archive !== 'undefined' && Archive.heads.length) out.push(shSheet('الأرشيف', Archive.heads.map(function (h) { return { name: h.name, loadedAt: h.loadedAt, archivedAt: h.archivedAt, count: h.count, by: h.by }; })));
  return out;
});
/* 🧮 الحاسبة: من القاعدة الوحيدة (CalcStore) — كتتقرا فالوقت ديال النسخ */
function shCalcSheets() {
  if (typeof CalcStore === 'undefined' || !CalcStore.meta || !CalcStore.meta.migratedAt || !App.can('calc')) return Promise.resolve([]);
  var keys = [['history', 'الحاسبة - السجل', ['num', 'date', 'time', 'user', 'client', 'plate', 'police', 'attest', 'ins', 'ds', 'de', 'off', 'paid', 'diff', 'payMode', 'payRef', 'unpaid', 'paidDate']],
    ['cashMoves', 'الحاسبة - حركات الصندوق', ['date', 'time', 'type', 'amount', 'reason', 'person', 'user']], ['cash', 'الحاسبة - الصندوق', ['date']],
    ['clients', 'الحاسبة - الزبناء', ['n', 'p', 't', 'de']], ['renewals', 'الحاسبة - متابعة التجديدات', ['name', 'police', 'matricule', 'phone', 'status', 'requestDate', 'doneDate']]];
  return Promise.all(keys.map(function (k) { return CalcStore.get(k[0]).then(function (j) { var v = []; try { v = JSON.parse(j || '[]'); } catch (e) { } if (!Array.isArray(v)) v = Object.keys(v || {}).map(function (x) { return v[x]; });
    return v.length ? shSheet(k[1], v, k[2]) : null; }).catch(function () { return null; }); }))
    .then(function (arr) {
      var out = arr.filter(Boolean), h = out.filter(function (s) { return s.name === 'الحاسبة - السجل'; })[0];
      if (h) { var iu = h.headers.indexOf('unpaid'); if (iu >= 0) out.push({ name: 'الحاسبة - لم يدفع', headers: h.headers, rows: h.rows.filter(function (r) { return r[iu] === true; }) }); }
      return out;
    });
}
/* كل الأوراق: hooks + sheets() ديال الأقسام + الحاسبة */
function shCollect() {
  var list = App.runList('sheets');
  App.mods.forEach(function (m) { if (typeof m.sheets === 'function' && App.can(m.perm || m.id)) { try { list = list.concat(m.sheets() || []); } catch (e) { console.warn('sheets', m.id, e); } } });
  return shCalcSheets().then(function (c) {
    return list.concat(c).filter(function (s) { return s && s.name; }).map(function (s) {
      if (s.headers) return s; var t = shTable(s.rows || []); return { name: s.name, headers: t.headers, rows: t.rows }; });
  });
}

/* ───────── الإرسال ───────── */
Sheets.send = function (opts) {
  opts = opts || {};
  var url = Meta.get('sheetsUrl', ''), key = Meta.get('sheetsKey', '');
  if (!url || !key || Sheets.busy || !shCan()) return Promise.resolve(null);
  Sheets.busy = true; App.refresh();
  var now = new Date(), weekly = !!opts.weekly || (now - new Date(Meta.get('sheetsWeekAt', 0) || 0) >= Sheets.WEEK);
  return shCollect().then(function (sheets) {
    var body = JSON.stringify({ key: key, app: 'RenewPro', version: App.version, at: now.toISOString(), date: todayISO(), by: App.user.name, weekly: weekly, sheets: sheets });
    return fetch(url, { method: 'POST', body: body }).then(function (r) { return r.json(); }).catch(function () {
      /* بعض المتصفحات كتمنع قراية الجواب: كنصيفطو بلا قراية */
      return fetch(url, { method: 'POST', mode: 'no-cors', body: body }).then(function () { return { ok: true, blind: true, n: sheets.length }; });
    }).then(function (res) {
      res = res || {};
      var st = { at: now.toISOString(), ok: !!res.ok, n: sheets.length, rows: sheets.reduce(function (t, s) { return t + s.rows.length; }, 0), by: App.user.name, err: res.ok ? '' : String(res.err || 'erreur'), blind: !!res.blind, copy: res.copy || '' };
      var up = { sheetsLast: st }; if (st.ok && weekly) up.sheetsWeekAt = now.toISOString();
      Meta.save(up);
      if (opts.manual) toast(st.ok ? '📊 ' + L('تصيفط لـ Google Sheets: ', 'Envoyé à Google Sheets : ') + st.n + L(' ورقة', ' feuilles') + (weekly ? L(' + نسخة الأسبوع', ' + copie hebdo') : '') : '⚠️ Google Sheets: ' + st.err, st.ok ? '' : 'err');
      return st;
    });
  }).catch(function (e) {
    Meta.save({ sheetsLast: { at: now.toISOString(), ok: false, err: String((e && e.message) || e), by: App.user.name } });
    if (opts.manual) toast('⚠️ Google Sheets: ' + ((e && e.message) || e), 'err');
  }).then(function (r) { Sheets.busy = false; App.refresh(); return r; });
};
/* كل 5 دقايق كنشوفو: إلا فاتت ساعة على آخر نسخة (من أي جهاز) → كنحجزو الدور وكنصيفطو */
Sheets.tick = function () {
  if (!shCan() || !Meta.get('sheetsUrl', '') || !Meta.get('sheetsKey', '') || Sheets.busy) return;
  var st = Meta.get('sheetsLast', null), t1 = new Date(Meta.get('sheetsClaim', 0) || 0).getTime() || 0, t2 = st && st.ok ? (new Date(st.at).getTime() || 0) : 0;
  if (Date.now() - Math.max(t1, t2) < Sheets.HOUR - 60000) return;
  Meta.save({ sheetsClaim: new Date().toISOString(), sheetsClaimBy: App.user.email });
  /* نتسناو شوية: إلا جهاز آخر حجز فنفس اللحظة، اللي كتب الأخير هو اللي كيصيفط */
  setTimeout(function () { if (Meta.get('sheetsClaimBy', '') === App.user.email) Sheets.send(); }, 8000);
};
App.on('login', function () { clearInterval(Sheets.timer); Sheets.timer = setInterval(Sheets.tick, 5 * 60000); setTimeout(Sheets.tick, 60000); });
App.on('logout', function () { clearInterval(Sheets.timer); });

/* ───────── لوحة الربط (فـ 🎛️ لوحة التحكم) ───────── */
function shNewKey() { var a = new Uint8Array(18); (window.crypto || window.msCrypto).getRandomValues(a); return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
function shScript(key) {
  return [
    '/* RenewPro — النسخ التلقائي (Google Apps Script). الصقه فـ: Extensions ← Apps Script داخل الـ Google Sheet ديالك. */',
    "var KEY = '" + key + "';",
    '',
    'function doPost(e) {',
    '  var out = { ok: false };',
    '  try {',
    '    var d = JSON.parse(e.postData.contents);',
    "    if (d.key !== KEY) return json_({ ok: false, err: 'key' });",
    '    var ss = SpreadsheetApp.getActiveSpreadsheet();',
    '    (d.sheets || []).forEach(function (s) { write_(ss, s); });',
    "    var info = ss.getSheetByName('ℹ️ RenewPro') || ss.insertSheet('ℹ️ RenewPro', 0);",
    '    info.clearContents();',
    "    info.getRange(1, 1, 5, 2).setValues([['آخر نسخة', d.at], ['من طرف', d.by || ''], ['النسخة', d.version || ''], ['عدد الأوراق', (d.sheets || []).length], ['نسخة الأسبوع', d.weekly ? 'نعم' : '']]);",
    '    if (d.weekly) { var c = ss.copy(\'RenewPro backup \' + d.date); out.copy = c.getUrl(); }',
    '    out.ok = true; out.n = (d.sheets || []).length;',
    '  } catch (err) { out.err = String(err); }',
    '  return json_(out);',
    '}',
    'function write_(ss, s) {',
    '  var name = String(s.name || \'Feuille\').replace(/[\\[\\]\\*\\?\\/\\\\:]/g, \' \').slice(0, 99);',
    '  var sh = ss.getSheetByName(name) || ss.insertSheet(name);',
    '  sh.clearContents();',
    '  var rows = [s.headers || []].concat(s.rows || []), w = 1;',
    '  rows.forEach(function (r) { if (r.length > w) w = r.length; });',
    "  rows = rows.map(function (r) { r = r.slice(); while (r.length < w) r.push(''); return r; });",
    '  if (sh.getMaxColumns() < w) sh.insertColumnsAfter(sh.getMaxColumns(), w - sh.getMaxColumns());',
    '  if (sh.getMaxRows() < rows.length) sh.insertRowsAfter(sh.getMaxRows(), rows.length - sh.getMaxRows());',
    '  sh.getRange(1, 1, rows.length, w).setValues(rows);',
    "  sh.getRange(1, 1, 1, w).setFontWeight('bold').setBackground('#e8eef7');",
    '  sh.setFrozenRows(1);',
    '}',
    "function doGet() { return json_({ ok: true, app: 'RenewPro' }); }",
    'function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }'
  ].join('\n');
}
App.act('sh-key', function () {
  if (!App.user.admin) return;
  if (Meta.get('sheetsKey', '') && !confirm(L('مفتاح جديد؟ خاصك تعاود تلصق السكريبت فـ Google Sheet.', 'Nouvelle clé ? Il faudra recoller le script.'))) return;
  Meta.save({ sheetsKey: shNewKey() }); setTimeout(App.render, 300);
});
App.act('sh-copy', function () {
  var t = shScript(Meta.get('sheetsKey', ''));
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('📋 ' + L('تنسخ السكريبت', 'Script copié')); })
    .catch(function () { var a = $('sh-code'); if (a) { a.select(); document.execCommand('copy'); toast('📋 ' + L('تنسخ السكريبت', 'Script copié')); } });
});
App.act('sh-save', function () {
  var u = ($('sh-url') || {}).value || ''; u = u.trim();
  if (u && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(u)) { toast(L('الرابط خاصو يكون بحال: https://script.google.com/macros/s/…/exec', 'Lien attendu : https://script.google.com/macros/s/…/exec'), 'err'); return; }
  Meta.save({ sheetsUrl: u }); toast(u ? '🔗 ' + L('تحفظ الرابط', 'Lien enregistré') : L('تحيد الربط', 'Lien retiré'));
});
App.act('sh-now', function () { Sheets.send({ manual: true }); });
App.act('sh-week', function () { Sheets.send({ manual: true, weekly: true }); });
function sheetsPanelHTML() {
  var key = Meta.get('sheetsKey', ''), url = Meta.get('sheetsUrl', ''), st = Meta.get('sheetsLast', null);
  var names = []; try { names = App.runList('sheets').map(function (s) { return s.name; }); App.mods.forEach(function (m) { if (typeof m.sheets === 'function') { try { (m.sheets() || []).forEach(function (s) { names.push(s.name); }); } catch (e) { } } }); } catch (e) { }
  if (typeof CalcStore !== 'undefined' && CalcStore.meta && CalcStore.meta.migratedAt) names.push('الحاسبة - السجل', 'الحاسبة - الصندوق', 'الحاسبة - لم يدفع', '…');
  return '<div class="card"><div class="card-t">📊 ' + L('النسخ التلقائي إلى Google Sheets', 'Copie automatique vers Google Sheets') + '</div>'
    + (st ? '<div class="box ' + (st.ok ? '' : 'red') + '">' + (st.ok ? '✅ ' : '⚠️ ') + L('آخر نسخة: ', 'Dernière copie : ') + fmtDT(st.at) + (st.by ? ' · ' + esc(st.by) : '')
        + (st.ok ? ' · ' + (st.n || 0) + L(' ورقة · ', ' feuilles · ') + (st.rows || 0) + L(' سطر', ' lignes') + (st.blind ? ' · ' + L('(بلا تأكيد)', '(sans confirmation)') : '') : '<br>' + esc(st.err || '')) + '</div>' : '')
    + (url && key ? '<div class="acts2"><button class="btn pri" data-act="sh-now"' + (Sheets.busy ? ' disabled' : '') + '>' + (Sheets.busy ? '⏳ ' + L('جارٍ…', 'En cours…') : '📤 ' + L('نسخ دابا', 'Copier maintenant')) + '</button>'
        + '<button class="btn" data-act="sh-week"' + (Sheets.busy ? ' disabled' : '') + '>🗓️ ' + L('نسخة بالتاريخ دابا', 'Copie datée maintenant') + '</button></div>'
        + '<div class="hint">' + L('كل ساعة وحدها ملي البرنامج محلول عندك (المدير: البيانات كاملة)، ونسخة كاملة بالتاريخ كل أسبوع فـ Google Drive.', 'Toutes les heures (programme ouvert), et une copie datée chaque semaine dans Google Drive.') + '</div>' : '')
    + '<div class="lbl">' + L('الأوراق اللي كتتصيفط', 'Feuilles envoyées') + '</div><div class="sh-names">' + names.map(function (n) { return '<span class="chip">' + esc(n) + '</span>'; }).join('') + '</div>'
    + '<div class="hint">' + L('أي قسم جديد كيتزاد للبرنامج، كتتزاد ليه ورقة وحدها.', 'Toute nouvelle section obtient sa feuille automatiquement.') + '</div>'
    + '<details class="sh-setup"' + (url ? '' : ' open') + '><summary>🔧 ' + L('الربط (مرة وحدة، 5 دقايق)', 'Liaison (une fois, 5 minutes)') + '</summary>'
      + '<ol class="sh-steps">'
      + '<li>' + L('حل <b>sheets.new</b> فحسابك Google، وسمي الشيت مثلاً «RenewPro».', 'Ouvrez <b>sheets.new</b> et nommez la feuille « RenewPro ».') + '</li>'
      + '<li>' + (key ? L('فالشيت: <b>Extensions ← Apps Script</b>. مسح كلشي والصق هاد السكريبت (فيه المفتاح السري ديالك) ← 💾.', 'Dans la feuille : <b>Extensions ← Apps Script</b>, collez ce script ← 💾.')
            + '<textarea id="sh-code" class="inp sh-code" readonly dir="ltr">' + esc(shScript(key)) + '</textarea><button class="btn sm" data-act="sh-copy">📋 ' + L('نسخ السكريبت', 'Copier le script') + '</button> <button class="btn sm" data-act="sh-key">🔑 ' + L('مفتاح جديد', 'Nouvelle clé') + '</button>'
          : '<button class="btn pri" data-act="sh-key">🔑 ' + L('صاوب المفتاح السري والسكريبت', 'Créer la clé et le script') + '</button>') + '</li>'
      + '<li>' + L('<b>Deploy ← New deployment</b> ← النوع <b>Web app</b> ← Execute as: <b>Me</b> ← Who has access: <b>Anyone</b> ← Deploy ← اقبل الأذونات (Advanced ← Go to…).', '<b>Deploy ← New deployment</b> ← <b>Web app</b> ← Execute as <b>Me</b> ← Access <b>Anyone</b> ← Deploy ← autorisez.') + '</li>'
      + '<li>' + L('انسخ <b>Web app URL</b> (كيسالي بـ /exec) والصقو هنا:', 'Copiez le <b>Web app URL</b> (finit par /exec) ici :')
        + '<div class="sh-url"><input id="sh-url" class="inp" dir="ltr" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(url) + '"><button class="btn pri" data-act="sh-save">💾</button></div></li>'
      + '<li>' + L('ضغط «📤 نسخ دابا» وشوف الشيت.', 'Cliquez « 📤 Copier maintenant » et vérifiez la feuille.') + '</li></ol>'
      + '<div class="hint">' + L('الشيت كيتعاود يتكتب كل مرة بآخر حالة (البرنامج هو الأصل؛ اللي كتبدل فالشيت ما كيرجعش للبرنامج). المفتاح السري كيمنع أي واحد آخر يكتب فيه.', 'La feuille est réécrite à chaque copie (le programme fait foi). La clé secrète empêche toute autre écriture.') + '</div>'
    + '</details></div>';
}
