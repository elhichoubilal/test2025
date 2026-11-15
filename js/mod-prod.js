/* ══════════════════════════════════════════════════════════
   RenewPro v4 — mod-prod.js   (ملفات الإنتاج)
   قسم مستقل: تُحمَّل فيه ملفات الشركة (15 يوماً) دفعة واحدة، فيتعرّف على نوع كل ملف،
   يصحّح تاريخ الانتهاء، يرتّب الكل من الأقرب انتهاءً، ثم:
     • تنزيل ملف Excel واحد مرتّب
     • نقل الزبائن إلى لائحة الاتصال (نفس نافذة التحميل الحالية: أرشفة القديمة ثم الجديدة)
   لا يغيّر شيئاً في mod-renew.js: يبني ملفاً بنفس صيغة TERME AUTO ويمرّره لنفس القارئ.

   قواعد التاريخ (متفق عليها):
     TERME AUTO  Ferme         → date_fin         بدون تغيير
     TERME AUTO  Renouvelable  → date_fin         ناقص يوم
     Téléchargement            → Date d'écheance  بدون تغيير
     Termes                    → Prochain Effet   ناقص يوم
══════════════════════════════════════════════════════════ */
'use strict';

var Prod = { files: [], rows: [], q: '' };
var PROD_KEY = 'rp4_prod';
var PROD_SRC = {
  ferme:  { ar: 'TERME AUTO · Ferme',        fr: 'TERME AUTO · Ferme',        minus: false },
  renouv: { ar: 'TERME AUTO · Renouvelable', fr: 'TERME AUTO · Renouvelable', minus: true },
  telech: { ar: 'Téléchargement',            fr: 'Téléchargement',            minus: false },
  termes: { ar: 'Termes',                    fr: 'Termes',                    minus: true }
};
function prodSrcLabel(k) { var s = PROD_SRC[k]; return s ? L(s.ar, s.fr) : k; }

function prodSave() { try { localStorage.setItem(PROD_KEY, JSON.stringify({ files: Prod.files, rows: Prod.rows })); } catch (e) { } }
function prodLoad() { try { var d = JSON.parse(localStorage.getItem(PROD_KEY) || 'null'); if (d && d.rows) { Prod.files = d.files || []; Prod.rows = d.rows; } } catch (e) { } }
prodLoad();

/* ───────── قراءة الملف (xlsx / xls / نص CSV بامتداد xls) ───────── */
function prodCsv(text) {
  text = text.replace(/^﻿/, '');
  var first = text.split(/\r?\n/)[0] || '', sep = ';';
  if (first.split(';').length < 3) sep = first.split('\t').length >= 3 ? '\t' : ',';
  var rows = [], row = [], cell = '', q = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function prodRead(buf) {
  var b = new Uint8Array(buf);
  var bin = (b[0] === 0x50 && b[1] === 0x4B) || (b[0] === 0xD0 && b[1] === 0xCF);
  if (!bin) {
    var text = new TextDecoder('utf-8').decode(b);
    if (!/<table/i.test(text.slice(0, 4000))) return prodCsv(text);
  }
  var wb = XLSX.read(b, { type: 'array', cellDates: true });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
}

/* ───────── التعرّف على نوع الملف ───────── */
function prodDetect(rows) {
  for (var r = 0; r < Math.min(rows.length, 15); r++) {
    var h = (rows[r] || []).map(normH), has = function (k) { return h.indexOf(k) >= 0; };
    var map = {}; h.forEach(function (k, i) { if (k && map[k] == null) map[k] = i; });
    if (has('numeropolice') && has('datefin')) return { kind: 'terme', hr: r, map: map };
    if (has('datedecheance') || (has('police') && has('natureevennement'))) return { kind: 'telech', hr: r, map: map };
    if (has('prochaineffet')) return { kind: 'termes', hr: r, map: map };
  }
  return null;
}

function prodClean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function prodName(s) { return prodClean(s).replace(/\s*-\s*$/, ''); }
function prodPlate(s) { return prodClean(s).replace(/\s*-\s*/g, '-').toUpperCase(); }
function prodPol(s) { s = prodClean(s); return /^\d{1,9}$/.test(s) ? ('0000000000' + s).slice(-10) : s; }

function prodParse(rows, det, fileName) {
  var m = det.map, out = [];
  var g = function (row, k) { var i = m[k]; return i == null ? '' : row[i]; };
  for (var i = det.hr + 1; i < rows.length; i++) {
    var row = rows[i]; if (!row || !row.some(function (v) { return String(v).trim(); })) continue;
    var o = { file: fileName, cat: '', police: '', att: '', name: '', phone: '', phone2: '', adresse: '', ville: '', dateS: '', orig: '',
              duree: '', marque: '', modele: '', plate: '', prime: '', nature: '', usage: '', note: '' };
    if (det.kind === 'terme') {
      o.duree = prodClean(g(row, 'duree'));
      o.src = /renouvel/i.test(o.duree) ? 'renouv' : 'ferme';
      o.cat = prodClean(g(row, 'cat')); o.police = prodPol(g(row, 'numeropolice'));
      o.name = prodName(g(row, 'assure')); o.phone = xPhone(g(row, 'telephone')); o.phone2 = xPhone(g(row, 'telephone2'));
      o.adresse = prodClean(g(row, 'adresse')); o.ville = prodClean(g(row, 'ville'));
      o.dateS = xDate(g(row, 'datedebut')); o.orig = xDate(g(row, 'datefin'));
      o.marque = prodClean(g(row, 'marque')); o.modele = prodClean(g(row, 'modele')); o.plate = prodPlate(g(row, 'immatriculation'));
    } else if (det.kind === 'telech') {
      o.src = 'telech';
      var pol = prodClean(g(row, 'police')), pm = pol.match(/^(\d{1,2})\/(\d+)$/);
      if (pm) { o.cat = pm[1]; o.police = pm[2]; } else o.police = pol;
      o.att = prodClean(g(row, 'nattestation')); o.name = prodName(g(row, 'assure'));
      o.nature = prodClean(g(row, 'natureevennement')).split('?')[0];
      o.prime = num(g(row, 'primettc')) || '';
      var plates = String(g(row, 'immatriculation') || '').split('|').map(prodPlate).filter(Boolean);
      o.plate = plates[0] || ''; if (plates.length > 1) o.note = L('لوحة أخرى: ', 'Autre immat. : ') + plates.slice(1).join(' / ');
      o.dateS = xDate(g(row, 'dateeffet')); o.orig = xDate(g(row, 'datedecheance'));
    } else {
      o.src = 'termes';
      o.police = prodClean(g(row, 'npolice')); o.name = prodName(g(row, 'proprietaire'));
      o.plate = prodPlate(g(row, 'immatriculation')); o.phone = xPhone(g(row, 'telephone')); o.usage = prodClean(g(row, 'usage'));
      o.orig = xDate(g(row, 'prochaineffet'));
    }
    if (!o.name && !o.police && !o.plate) continue;
    o.i = out.length;   // ترتيب السطر في ملف الشركة
    o.minus = !!(PROD_SRC[o.src] && PROD_SRC[o.src].minus);
    o.dateE = o.orig ? (o.minus ? addDays(o.orig, -1) : o.orig) : '';
    out.push(o);
  }
  return out;
}

/* ملف Téléchargement لا يحمل الهاتف: نأخذه من اللائحة الحالية إن وُجد نفس البوليصة أو اللوحة */
function prodFillPhones(rows) {
  var byPol = {}, byPlate = {};
  (typeof Contacts !== 'undefined' && Contacts.list || []).forEach(function (c) {
    if (!c.phone) return;
    var t = kPolTail(polFull(c)); if (t) byPol[t] = c;
    var p = kPlate(c.plate); if (p) byPlate[p] = c;
  });
  rows.forEach(function (r) {
    if (r.phone) return;
    var c = byPol[kPolTail(r.cat && /^\d+$/.test(r.police) ? r.cat + '/' + r.police : r.police)] || byPlate[kPlate(r.plate)];
    if (c) { r.phone = c.phone; if (!r.phone2 && c.phone2) r.phone2 = c.phone2; r.phoneFrom = 1; }
  });
}

function prodSort() {
  var order = { renouv: 1, ferme: 2, telech: 3, termes: 4 };   // نفس ترتيب الورقة المطبوعة
  Prod.rows.sort(function (a, b) {
    if (!a.dateE !== !b.dateE) return a.dateE ? -1 : 1;
    return String(a.dateE).localeCompare(String(b.dateE)) || (order[a.src] - order[b.src]) || String(a.file).localeCompare(String(b.file)) || ((a.i || 0) - (b.i || 0));
  });
}

App.act('p-pick', function () { var f = $('p-file'); if (f) { f.value = ''; f.click(); } });
App.input('p-file', function (el) {
  var files = Array.prototype.slice.call(el.files || []); if (!files.length) return;
  toast(L('⏳ جارٍ قراءة الملفات…', '⏳ Lecture des fichiers…'));
  var bad = [];
  Promise.all(files.map(function (file) {
    return file.arrayBuffer().then(function (buf) {
      var rows = prodRead(buf), det = prodDetect(rows);
      if (!det) { bad.push(file.name); return; }
      var parsed = prodParse(rows, det, file.name);
      /* نفس الملف مرة ثانية: يعوّض القديم */
      Prod.rows = Prod.rows.filter(function (r) { return r.file !== file.name; });
      Prod.files = Prod.files.filter(function (f) { return f.name !== file.name; });
      Prod.rows = Prod.rows.concat(parsed);
      Prod.files.push({ name: file.name, kind: det.kind, n: parsed.length });
    }).catch(function (e) { console.warn(file.name, e); bad.push(file.name); });
  })).then(function () {
    prodFillPhones(Prod.rows); prodSort(); prodSave(); App.render();
    if (bad.length) toast(L('⚠️ ملف غير معروف: ', '⚠️ Fichier non reconnu : ') + bad.join('، '), 'err');
    else toast(L('✅ تمت القراءة', '✅ Fichiers lus'));
  });
});
App.act('p-del', function (el) {
  var n = el.dataset.f;
  Prod.files = Prod.files.filter(function (f) { return f.name !== n; });
  Prod.rows = Prod.rows.filter(function (r) { return r.file !== n; });
  prodSave(); App.render();
});
App.act('p-clear', function () {
  if (!confirm(L('مسح كل الملفات من هذا القسم؟ (لائحة الاتصال لا تتأثر)', 'Vider cette section ? (la liste d\'appels n\'est pas touchée)'))) return;
  Prod.files = []; Prod.rows = []; prodSave(); App.render();
});

/* ───────── ملف Excel واحد بصيغة TERME AUTO (يقرؤه RenewPro كما هو) ───────── */
var PROD_HEAD = ['cat', 'numero_police', 'N° Attestation', 'assure', 'telephone', 'telephone2', 'adresse', 'ville', 'date_debut', 'date_fin', 'duree',
  'marque', 'modele', 'immatriculation', 'Prime TTC', 'Nature', 'Usage', 'Source', 'Date fichier', 'Note'];
function prodDMY(iso) { return iso ? fmtD(iso) : ''; }
function prodWorkbook() {
  var aoa = [PROD_HEAD].concat(Prod.rows.map(function (r) {
    return [r.cat, r.police, r.att, r.name, r.phone, r.phone2, r.adresse, r.ville, prodDMY(r.dateS), prodDMY(r.dateE), r.duree,
      r.marque, r.modele, r.plate, r.prime === '' ? '' : r.prime, r.nature, r.usage, prodSrcLabel(r.src), prodDMY(r.orig) + (r.minus ? ' (-1)' : ''), r.note];
  }));
  var ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [4, 13, 13, 30, 12, 12, 30, 12, 11, 11, 13, 11, 10, 15, 9, 15, 9, 24, 14, 24].map(function (w) { return { wch: w }; });
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Export');
  return wb;
}
/* ملف التنزيل للطباعة: نفس أعمدة الورقة فقط (النقل إلى اللائحة يبقى بكل المعلومات أعلاه) */
var PROD_PRINT = ['cat', 'numero_police', 'assure', 'telephone', 'telephone2', 'ville', 'date_debut', 'date_fin', 'duree', 'marque', 'immatriculation', 'observation'];
function prodPrintWorkbook() {
  var aoa = [PROD_PRINT].concat(Prod.rows.map(function (r) {
    return [r.src === 'termes' ? '' : (r.cat || ''), r.police, r.name, r.phone, r.phone2, r.ville, prodDMY(r.dateS), prodDMY(r.dateE), r.duree, r.marque || r.usage, r.plate, ''];
  }));
  var ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [5, 13, 28, 12, 12, 10, 11, 11, 12, 10, 15, 34].map(function (w) { return { wch: w }; });
  var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Export');
  return wb;
}
function prodFileName() { return 'production_' + todayISO() + '.xlsx'; }
App.act('p-xlsx', function () { if (!Prod.rows.length) return; XLSX.writeFile(prodPrintWorkbook(), prodFileName()); });

/* النقل: نفس طريق «تحميل ملف جديد» في التجديد — نفس القارئ ونفس النافذة ونفس الأرشفة */
App.act('p-send', function () {
  if (!App.canUp() || !Prod.rows.length) return;
  try {
    var buf = XLSX.write(prodWorkbook(), { type: 'array', bookType: 'xlsx' });
    IMP = parseRenewFile(buf); IMP.file = L('ملفات الإنتاج ', 'Production ') + fmtD(todayISO());
    importPreview();
  } catch (e) { toast(L('خطأ: ', 'Erreur : ') + e.message, 'err'); }
});

/* ───────── الصفحة ───────── */
function prodFiltered() {
  var q = Prod.q.toLowerCase().trim(); if (!q) return Prod.rows;
  return Prod.rows.filter(function (r) { return [r.name, r.phone, r.plate, r.police, r.att, r.cat + '/' + r.police].join(' ').toLowerCase().indexOf(q) >= 0; });
}
function prodTableHTML() {
  var list = prodFiltered();
  if (!list.length) return '<div class="empty"><span>' + L('لا نتائج', 'Aucun résultat') + '</span></div>';
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>' + L('الانتهاء', 'Échéance') + '</th><th>' + L('الاسم', 'Nom') + '</th><th>' + L('الهاتف', 'Tél.') + '</th>'
    + '<th>' + L('البوليصة', 'Police') + '</th><th>' + L('اللوحة', 'Immat.') + '</th><th>' + L('المصدر', 'Source') + '</th></tr></thead><tbody>'
    + list.slice(0, 400).map(function (r, i) {
        var dl = daysLeft(r.dateE);
        return '<tr' + (dl !== null && dl < 0 ? ' class="exp"' : '') + '><td class="muted">' + (i + 1) + '</td>'
          + '<td>' + ltr(fmtD(r.dateE)) + (r.minus ? ' <span class="tag amber" title="' + esc(L('في الملف: ', 'Fichier : ') + fmtD(r.orig)) + '">−1</span>' : '') + '</td>'
          + '<td>' + esc(r.name || '—') + '</td>'
          + '<td>' + (r.phone ? ltr(r.phone) + (r.phoneFrom ? ' <span class="tag cyan" title="' + esc(L('من اللائحة الحالية', 'De la liste actuelle')) + '">↺</span>' : '') : '<span class="muted">—</span>') + '</td>'
          + '<td>' + ltr(r.cat && /^\d+$/.test(r.police) ? r.cat + '/' + r.police : r.police) + '</td>'
          + '<td>' + ltr(r.plate) + '</td>'
          + '<td class="muted">' + esc(prodSrcLabel(r.src)) + (r.nature ? ' · ' + esc(r.nature) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>'
    + (list.length > 400 ? '<div class="hint center">' + L('يُعرض أول 400 — الملف Excel فيه الكل.', '400 premiers affichés — le fichier Excel contient tout.') + '</div>' : '');
}
function renderProd(el) {
  var rows = Prod.rows, cnt = {};
  rows.forEach(function (r) { cnt[r.src] = (cnt[r.src] || 0) + 1; });
  var minus = rows.filter(function (r) { return r.minus; }).length, noPh = rows.filter(function (r) { return !r.phone; }).length;
  var kindLbl = { terme: 'TERME AUTO', telech: 'Téléchargement', termes: 'Termes' };
  var head = '<div class="card"><div class="card-t">📂 ' + L('ملفات الإنتاج', 'Fichiers de production') + '</div>'
    + '<div class="hint" style="margin-bottom:8px">' + L('حمّل ملفات الشركة (TERME AUTO، Téléchargement، Termes) مرة واحدة. يتعرّف البرنامج على كل ملف، ينقص يوماً لـ Renouvelable و Termes، ويرتّب الكل من الأقرب انتهاءً.',
        'Chargez les fichiers (TERME AUTO, Téléchargement, Termes). Chaque fichier est reconnu, −1 jour pour Renouvelable et Termes, tri par échéance la plus proche.') + '</div>'
    + '<input type="file" id="p-file" data-inp="p-file" accept=".xlsx,.xls,.csv" multiple hidden>'
    + '<button class="btn pri" data-act="p-pick">📁 ' + L('اختيار الملفات', 'Choisir les fichiers') + '</button>'
    + (Prod.files.length ? '<div class="chips wrap" style="margin-top:10px">' + Prod.files.map(function (f) {
        return '<span class="chip">' + esc(kindLbl[f.kind] || f.kind) + ' <b>' + f.n + '</b> <span class="muted sm">' + esc(f.name.length > 28 ? f.name.slice(0, 26) + '…' : f.name) + '</span>'
          + ' <a href="#" data-act="p-del" data-f="' + esc(f.name) + '" title="' + esc(L('إزالة', 'Retirer')) + '">✕</a></span>'; }).join('') + '</div>' : '')
    + '</div>';
  if (!rows.length) { el.innerHTML = '<div class="page narrow">' + head + '</div>'; return; }
  var keepQ = document.activeElement && document.activeElement.id === 'p-q', pos = keepQ ? document.activeElement.selectionStart : 0;
  el.innerHTML = '<div class="page">' + head
    + '<div class="box"><b>' + rows.length + '</b> ' + L('زبون', 'clients')
      + Object.keys(PROD_SRC).filter(function (k) { return cnt[k]; }).map(function (k) { return ' · ' + ltr(prodSrcLabel(k)) + ': <b>' + cnt[k] + '</b>'; }).join('')
      + '<div class="hint">' + L('ناقص يوم: ', '−1 jour : ') + minus + ' · ' + L('بدون هاتف: ', 'sans tél. : ') + noPh + '</div></div>'
    + '<div class="bar" style="flex-wrap:wrap">'
      + '<button class="btn green" data-act="p-xlsx">📥 ' + L('تنزيل Excel', 'Télécharger Excel') + '</button>'
      + (App.canUp() ? '<button class="btn pri" data-act="p-send">📤 ' + L('نقل إلى لائحة الاتصال', 'Envoyer vers la liste d\'appels') + '</button>' : '')
      + '<button class="btn danger sm" data-act="p-clear">🧹 ' + L('مسح', 'Vider') + '</button>'
      + '<div class="search" style="flex:1;min-width:160px"><span>🔍</span><input id="p-q" data-inp="p-q" placeholder="' + L('بحث…', 'Rechercher…') + '" value="' + esc(Prod.q) + '"></div>'
    + '</div>'
    + '<div id="p-body">' + prodTableHTML() + '</div></div>';
  if (keepQ) { var inp = $('p-q'); if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) { } } }
}
/* البحث يحدّث الجدول فقط (الحقل لا يُعاد رسمه أثناء الكتابة) */
App.input('p-q', debounce(function (el) { Prod.q = el.value; var b = $('p-body'); if (b) b.innerHTML = prodTableHTML(); }, 250));

App.register({ id: 'prod', perm: 'renew', icon: '📂', title: ['ملفات الإنتاج', 'Production'], order: 12, render: renderProd });
