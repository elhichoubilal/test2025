/* ══════════════════════════════════════════════════════════
   RenewPro v5 — mod-files.js   (🗂️ الملفات المحمّلة)
   كل ملف كيتحمّل فالبرنامج (لائحة التجديد، الديون، قاعدة الأرقام، الإنتاج، الحوادث، البوردورو…) كيتحفظ هنا كما هو:
   الاسم، التاريخ، شكون حمّلو. تقدر ترجع ليه: تنزّلو كما كان، ولا تعاود تحمّلو فنفس القسم.
   كيبقى محفوظ ديما؛ الحذف للمدير فقط.
   التخزين: Firestore «files» — رأس {k:'head'} + قطع base64 (≤ 700 ألف حرف) {k:'chunk'}.
   نفس الملف (نفس المحتوى) ما كيتعاودش يتحفظ: كيتزاد غير تاريخ آخر تحميل.
══════════════════════════════════════════════════════════ */
'use strict';

var Files = { heads: [], ready: false, unsub: null, denied: false, kind: 'all', q: '', MAX: 10 * 1024 * 1024, PIECE: 700000 };
/* نوع الملف حسب الخانة اللي تحمّل منها: [الأيقونة، الاسم، الصفحة، الخانة، عبر file-in؟] */
var FILE_KINDS = {
  renew:  ['🔄', ['لائحة التجديد', 'Liste de renouvellement'], 'renew', 'r-file', true],
  debts:  ['💰', ['ملف الديون', 'Fichier des dettes'], 'debts', 'd-file', true],
  phbook: ['📱', ['دفتر الهواتف (الديون)', 'Répertoire (dettes)'], 'debts', 'ph-file', true],
  phones: ['📇', ['قاعدة الأرقام', 'Base de numéros'], 'phones', 'pb-file', false],
  prod:   ['📂', ['ملفات الإنتاج', 'Fichiers de production'], 'prod', 'p-file', false],
  sinpdf: ['🚗', ['تصريح حادثة (PDF)', 'Déclaration (PDF)'], 'sin', 'sin-pdf', false],
  sinxls: ['🚗', ['سجل الحوادث (Excel)', 'Registre sinistres (Excel)'], 'sin', 'sin-xls', false],
  notes:  ['📝', ['ملاحظات اليوم', 'Notes du jour'], 'dash', 't-notes-file', true],
  bordereau: ['🧮', ['البوردورو اليومي', 'Bordereau du jour'], 'c-renewals', 'rt-file-input', false],
  clientpdf: ['🧮', ['PDF الزبون (الحاسبة)', 'PDF client (calculatrice)'], 'calc', 'client-pdf-file', false],
  pdftpl:    ['🧮', ['قالب PDF', 'Modèle PDF'], 'c-pdftpl', 'tpl-file', false],
  other:  ['📄', ['ملف', 'Fichier'], '', '', false]
};
var FILE_BY_INP = {}; Object.keys(FILE_KINDS).forEach(function (k) { if (FILE_KINDS[k][3]) FILE_BY_INP[FILE_KINDS[k][3]] = k; });
function fkLabel(k) { var x = FILE_KINDS[k] || FILE_KINDS.other; return x[0] + ' ' + L(x[1][0], x[1][1]); }
function fSize(n) { n = +n || 0; return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

Files.col = function () { return FB.db.collection('files'); };
Files.start = function () {
  if (Files.unsub || !FB.db || !App.can('files')) return;
  Files.unsub = Files.col().where('k', '==', 'head').onSnapshot(function (snap) {
    var a = []; snap.forEach(function (d) { var x = d.data() || {}; x.id = d.id; a.push(x); });
    a.sort(function (x, y) { return String(y.last || y.at || '').localeCompare(String(x.last || x.at || '')); });
    Files.heads = a; Files.ready = true; Files.denied = false; if (App.page === 'files') App.render();
  }, function (e) { Files.denied = true; Files.ready = true; console.warn('files', e); if (App.page === 'files') App.render(); });
};
App.on('login', function () { setTimeout(Files.start, 800); });
App.on('refresh', function () { if (!Files.unsub && App.user && App.can('files')) Files.start(); });
App.on('logout', function () { if (Files.unsub) { try { Files.unsub(); } catch (e) { } } Files.unsub = null; Files.heads = []; Files.ready = false; });

/* ───────── الحفظ ───────── */
function b64OfBuf(buf) { var b = new Uint8Array(buf), s = '', CH = 0x8000; for (var i = 0; i < b.length; i += CH) s += String.fromCharCode.apply(null, b.subarray(i, i + CH)); return btoa(s); }
function bufOfB64(b64) { var s = atob(b64), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
function fHash(s) { var h1 = 0x811c9dc5, h2 = 0x1505, step = Math.max(1, Math.floor(s.length / 200000)); for (var i = 0; i < s.length; i += step) { var c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = (h2 * 33 + c) | 0; } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + s.length.toString(36); }
/* name, type, b64, kind → يتحفظ (ولا كيتزاد تاريخ آخر تحميل إلا كان نفس المحتوى) */
Files.saveB64 = function (name, type, b64, kind, size) {
  if (!FB.db || !App.canUp()) return Promise.resolve(null);
  if ((size || b64.length * 0.75) > Files.MAX) { toast('🗂️ ' + L('الملف كبير بزاف باش يتحفظ (أكثر من 10 MB) — التحميل تدار عادي.', 'Fichier trop gros pour être archivé (> 10 Mo).')); return Promise.resolve(null); }
  var hash = fHash(b64), now = new Date().toISOString(), who = App.user.name;
  var same = Files.heads.filter(function (h) { return h.hash === hash && h.name === name; })[0];
  if (same) return Files.col().doc(same.id).update({ last: now, lastBy: who, times: (same.times || 1) + 1 }).then(function () { return same.id; }).catch(function (e) { console.warn('files', e); });
  var id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ops = [], n = Math.ceil(b64.length / Files.PIECE) || 1;
  for (var i = 0; i < n; i++) ops.push({ ref: Files.col().doc(id + '_c' + i), data: { k: 'chunk', fid: id, i: i, d: b64.slice(i * Files.PIECE, (i + 1) * Files.PIECE) } });
  /* الرأس آخراً: وجوده يعني أن كل القطع وصلت */
  return FB.batches(ops).then(function () {
    return Files.col().doc(id).set({ k: 'head', name: name, type: type || '', size: size || Math.round(b64.length * 0.75), kind: kind || 'other', hash: hash, chunks: n, at: now, by: who, last: now, lastBy: who, times: 1 });
  }).then(function () { return id; }).catch(function (e) { console.warn('files save', e); });
};
Files.saveFile = function (file, kind) {
  if (!file || !App.canUp()) return Promise.resolve(null);
  if (file.size > Files.MAX) return Files.saveB64(file.name, file.type, '', kind, file.size);
  return file.arrayBuffer().then(function (buf) { return Files.saveB64(file.name, file.type, b64OfBuf(buf), kind, file.size); });
};
Files.load = function (id) {
  var h = Files.heads.filter(function (x) { return x.id === id; })[0]; if (!h) return Promise.reject(new Error('not found'));
  var ps = []; for (var i = 0; i < (h.chunks || 0); i++) ps.push(Files.col().doc(id + '_c' + i).get());
  return Promise.all(ps).then(function (docs) { var b64 = docs.map(function (d) { return d.exists ? d.data().d : ''; }).join('');
    return { head: h, bytes: bufOfB64(b64) }; });
};

/* كل خانة ملف فالبرنامج: الملف كيتحفظ وحدو (قبل ما يقراه القسم ديالو، بلا ما يأثر عليه) */
document.addEventListener('change', function (e) {
  var el = e.target; if (!el || el.type !== 'file' || !el.files || !el.files.length || Files.replaying) return;
  var kind = FILE_BY_INP[el.dataset.inp || el.id] || 'other';
  if (!App.user || !App.canUp()) return;
  Array.prototype.slice.call(el.files).forEach(function (f) { Files.saveFile(f, kind); });
}, true);
/* الحاسبة (داخل الإطار) كتصيفط الملفات ديالها بنص base64 */
window.rpSaveCalcFile = function (name, type, b64, inputId, size) {
  if (Files.replaying) return; Files.saveB64(name, type, b64, FILE_BY_INP[inputId] || 'other', size);
};

/* ───────── الرجوع للملف: تنزيل ولا إعادة تحميل ───────── */
App.act('fl-dl', function (el) {
  toast('⏳ ' + L('جارٍ التحضير…', 'Préparation…'));
  Files.load(el.dataset.id).then(function (r) {
    var a = document.createElement('a'), url = URL.createObjectURL(new Blob([r.bytes], { type: r.head.type || 'application/octet-stream' }));
    a.href = url; a.download = r.head.name || 'fichier'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }).catch(syncErr);
});
function flPutFile(inp, file, win) {
  var DT = (win && win.DataTransfer) || DataTransfer, dt = new DT(); dt.items.add(file); inp.files = dt.files;
  inp.dispatchEvent(new (win && win.Event || Event)('change', { bubbles: true }));
}
App.act('fl-re', function (el) {
  var h = Files.heads.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!h) return;
  var k = FILE_KINDS[h.kind] || FILE_KINDS.other;
  if (!k[2]) { toast(L('ما نعرفش فين نعاود نحمّل هاد الملف — نزّلو وحمّلو باليد.', 'Destination inconnue : téléchargez-le puis importez-le.'), 'err'); return; }
  if (!confirm(L('غادي نعاود نحمّل «', 'Réimporter « ') + h.name + L('» فـ ', ' » dans ') + fkLabel(h.kind) + ' ?')) return;
  toast('⏳ ' + L('جارٍ التحضير…', 'Préparation…'));
  Files.load(h.id).then(function (r) {
    Files.replaying = true; setTimeout(function () { Files.replaying = false; }, 4000);
    if (/^c-|^calc$/.test(k[2])) {                                         // الحاسبة
      App.go(k[2]);
      var tries = 0; (function put() {
        var fr = $('calc-frame'), w = fr && fr.contentWindow, inp = w && w.document && w.document.getElementById(k[3]);
        if (!inp) { if (++tries < 40) return setTimeout(put, 250); toast(L('ما تحلاتش الحاسبة', 'Calculatrice indisponible'), 'err'); return; }
        try { if (k[2] === 'c-renewals' && w.navTo) w.navTo('renewals'); } catch (x) { }
        flPutFile(inp, new w.File([r.bytes], h.name, { type: h.type || '' }), w);
      })();
      return;
    }
    App.go(k[2]);
    setTimeout(function () {
      var inp = k[4] ? $('file-in') : $(k[3]); if (!inp) { toast(L('ما لقيتش خانة التحميل', 'Champ d\'import introuvable'), 'err'); return; }
      if (k[4]) inp.dataset.inp = k[3];
      flPutFile(inp, new File([r.bytes], h.name, { type: h.type || '' }));
    }, 350);
  }).catch(syncErr);
});
App.act('fl-del', function (el) {
  var h = Files.heads.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!h || !App.user.admin) return;
  if (!confirm(L('حذف «', 'Supprimer « ') + h.name + L('» نهائياً؟', ' » définitivement ?'))) return;
  var ops = [{ del: 1, ref: Files.col().doc(h.id) }]; for (var i = 0; i < (h.chunks || 0); i++) ops.push({ del: 1, ref: Files.col().doc(h.id + '_c' + i) });
  FB.batches(ops).then(function () { toast('🗑️ ' + L('تحذف', 'Supprimé')); }).catch(syncErr);
});
App.act('fl-kind', function (el) { Files.kind = el.dataset.k; App.render(); });
App.input('fl-q', debounce(function (el) { Files.q = el.value; var p = el.selectionStart; App.render(); var i = $('fl-q'); if (i) { i.focus(); try { i.setSelectionRange(p, p); } catch (x) { } } }, 250));

/* ───────── الصفحة ───────── */
function renderFiles(el) {
  if (!Files.unsub) Files.start();
  if (!Files.ready) { el.innerHTML = '<div class="empty">⏳ ' + L('جارٍ التحميل…', 'Chargement…') + '</div>'; return; }
  var all = Files.heads, kinds = {}; all.forEach(function (h) { kinds[h.kind] = (kinds[h.kind] || 0) + 1; });
  var q = String(Files.q || '').toLowerCase().trim();
  var list = all.filter(function (h) { return (Files.kind === 'all' || h.kind === Files.kind) && (!q || String(h.name).toLowerCase().indexOf(q) >= 0 || String(h.by || '').toLowerCase().indexOf(q) >= 0); });
  var groups = [], cur = null;
  list.forEach(function (h) { var d = String(h.last || h.at || '').slice(0, 10); if (!cur || cur.d !== d) { cur = { d: d, rows: [] }; groups.push(cur); } cur.rows.push(h); });
  el.innerHTML = '<div class="page narrow">'
    + '<div class="card"><div class="card-t">🗂️ ' + L('الملفات المحمّلة', 'Fichiers importés') + ' <small class="muted">(' + all.length + ')</small></div>'
      + '<div class="hint" style="margin-bottom:8px">' + L('كل ملف تحمّل فالبرنامج كيتحفظ هنا كما هو. «📥» كينزّلو، «↩️» كيعاود يحمّلو فنفس القسم.', 'Chaque fichier importé est gardé ici tel quel. 📥 télécharger, ↩️ réimporter.') + '</div>'
      + (Files.denied ? '<div class="box red">⚠️ ' + L('مرفوض: انشر قواعد Firestore الجديدة (فيها files).', 'Refusé : publiez les nouvelles règles Firestore (files).') + '</div>' : '')
      + '<div class="search"><span>🔍</span><input id="fl-q" data-inp="fl-q" placeholder="' + L('اسم الملف ولا شكون حمّلو…', 'Nom du fichier ou auteur…') + '" value="' + esc(Files.q) + '"></div>'
      + '<div class="chips"><button class="chip' + (Files.kind === 'all' ? ' on' : '') + '" data-act="fl-kind" data-k="all">' + L('الكل', 'Tous') + ' <b>' + all.length + '</b></button>'
        + Object.keys(kinds).map(function (k) { return '<button class="chip' + (Files.kind === k ? ' on' : '') + '" data-act="fl-kind" data-k="' + esc(k) + '">' + fkLabel(k) + ' <b>' + kinds[k] + '</b></button>'; }).join('') + '</div>'
    + '</div>'
    + (list.length ? groups.map(function (g) {
        return '<div class="sec-t" style="margin:10px 4px 4px">' + (g.d ? fmtD(g.d) : '—') + '</div><div class="card fl-card">' + g.rows.map(function (h) {
          return '<div class="fl-row"><div class="fl-m"><b class="fl-n">' + esc(h.name) + '</b>'
            + '<small>' + fkLabel(h.kind) + ' · ' + fSize(h.size) + ' · ' + (h.by ? '👤 ' + esc(h.by) + ' · ' : '') + fmtDT(h.at)
            + ((h.times || 1) > 1 ? ' · ' + L('تحمّل ', 'importé ') + h.times + L(' مرات (آخر: ', ' fois (dernier : ') + fmtDT(h.last) + (h.lastBy ? ' · ' + esc(h.lastBy) : '') + ')' : '') + '</small></div>'
            + '<div class="fl-a"><button class="btn sm" data-act="fl-dl" data-id="' + esc(h.id) + '" title="' + L('تنزيل', 'Télécharger') + '">📥</button>'
            + (FILE_KINDS[h.kind] && FILE_KINDS[h.kind][2] && App.canUp() ? '<button class="btn sm" data-act="fl-re" data-id="' + esc(h.id) + '" title="' + L('إعادة التحميل', 'Réimporter') + '">↩️</button>' : '')
            + (App.user.admin ? '<button class="x sm" data-act="fl-del" data-id="' + esc(h.id) + '" title="' + L('حذف', 'Supprimer') + '">🗑️</button>' : '') + '</div></div>'; }).join('') + '</div>'; }).join('')
      : '<div class="empty"><div class="empty-ic">🗂️</div><span>' + (all.length ? L('ما كاين حتى ملف مطابق.', 'Aucun fichier correspondant.') : L('مازال ما تحمّل حتى ملف. أي ملف غادي تحمّلو من دابا كيتحفظ هنا.', 'Aucun fichier encore. Chaque import sera gardé ici.')) + '</span></div>')
    + '</div>';
}
App.register({ id: 'files', perm: 'files', icon: '🗂️', title: ['الملفات المحمّلة', 'Fichiers importés'], order: 31, render: renderFiles });
