/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-sin-quick.js   (🚗 حادثة من PDF ← إرسال للخبير · 7.8)
   PDF ديال التصريح فأي صفحة (من غير «الحوادث») ← نافذة فالوسط: ملخص المقروء (كيتبدل)
   ← «📧 إرسال للخبير»: كيسجل الملف (نفس «ملف جديد»: sinSave) ومن بعد كيحل نافذة الخبير اللي كاينة (sm-open).
   «💾 حفظ بلا إرسال» · «✏️ فتح كامل» (الفورم القديم معمّر). الموجود ديجا ← ما كيتعاودش، إرسال على داك الملف.
   طلبات CAT/requête، والـ PDF داخل «الحوادث»: بحال قبل.
══════════════════════════════════════════════════════════ */
'use strict';
var S7Q = { row: null, filled: [], file: '', twin: null, note: '', busy: false };
(function () {
  if (typeof pdf7ToSin !== 'function') return;
  var full = pdf7ToSin;
  pdf7ToSin = function (file) {
    if (typeof sinReadPdf !== 'function' || typeof sinParseDeclaration !== 'function') return full(file);
    if (!pdf7Can('sin')) { toast(L('ما عندكش الإذن ديال الحوادث', 'Pas d\'accès aux sinistres'), 'err'); return; }
    toast('⏳ ' + L('كنقرا التصريح…', 'Lecture de la déclaration…'));
    /* CAT / requête ← بحال قبل */
    var isCat = typeof scReadPos === 'function' && typeof scIsCat === 'function'
      ? scReadPos(file).then(function (it) { return scIsCat(scLines(it)); }, function () { return false; }) : Promise.resolve(false);
    isCat.then(function (cat) {
      if (cat) return full(file);
      return sinReadPdf(file).then(function (items) {
        if (items.join('').trim().length < 30) return full(file);
        var d = sinParseDeclaration(items);
        if (!d.refCie && !d.police && !d.assure) return full(file);
        var twin = d.refCie && Sin.rows.filter(function (r) { return sinDigits(r.refCie) === sinDigits(d.refCie); })[0];
        var row = sinBlank(), filled = [], put = function (k, v) { if (v) { row[k] = v; filled.push(k); } };
        put('refCie', d.refCie); put('advSinistre', d.refCie); put('police', d.police); put('assure', d.assure); put('dateSin', d.dateSin);
        put('advCie', d.advCie); put('advPolice', d.advPolice); if (d.dateRecep) put('dateRecep', d.dateRecep);
        ['plate', 'tel', 'expert', 'lieu'].forEach(function (k) { if (d[k]) { row[k] = d[k]; filled.push('x-' + k); } });
        S7Q.row = row; S7Q.filled = filled; S7Q.file = file.name; S7Q.twin = twin || null; S7Q.busy = false;
        S7Q.note = L('بيانات مقروءة من ', 'Données lues depuis ') + file.name + (d.tiers ? ' — ' + L('الطرف الآخر: ', 'tiers : ') + d.tiers : '');
        s7qOpen();
      });
    }).catch(function (err) { console.error(err); full(file); });
  };
})();

var S7Q_F = [['assure', 'المؤمَّن', 'Assuré', 0], ['x-plate', 'الماتريكول', 'Immatriculation', 1], ['x-tel', 'الهاتف', 'Téléphone', 1], ['police', 'البوليصة', 'Police', 1],
  ['refCie', 'مرجع الشركة', 'Réf. compagnie', 1], ['dateSin', 'تاريخ الحادثة', 'Date du sinistre', 1], ['x-lieu', 'المكان', 'Lieu', 0], ['x-expert', 'الخبير (من التصريح)', 'Expert (déclaration)', 0]];
function s7qKey(k) { return k.replace(/^x-/, ''); }
function s7qOpen() {
  var r = S7Q.row, t = S7Q.twin;
  if (t) {
    Modal.open(Modal.head('🚗 ' + L('حادثة من PDF', 'Sinistre depuis PDF'))
      + '<div class="q7"><div class="q7-file">📎 <span class="ltr">' + esc(S7Q.file) + '</span></div>'
      + '<div class="box">⚠️ ' + L('هاد التصريح موجود ديجا تحت الرقم ', 'Déclaration déjà enregistrée sous le N° ') + '<b class="ltr">' + esc(t.ordre || '') + '</b> · ' + esc(t.assure || '') + '. ' + L('ما تصاوبش ملف جديد.', 'Aucun nouveau dossier.') + '</div>'
      + '<div class="q7-acts"><button class="btn pri q7-go" data-act="s7q-send-twin">📧 ' + L('إرسال للخبير', 'Envoyer à l\'expert') + '</button><button class="btn" data-act="s7q-open-twin">📂 ' + L('فتح الملف', 'Ouvrir le dossier') + '</button></div></div>', 'small q7m');
    return;
  }
  var fld = function (f) { var k = s7qKey(f[0]), v = r[k] || '';
    return '<label class="f' + (f[0] === 'assure' || f[0] === 'x-expert' ? ' w2' : '') + '"><span>' + L(f[1], f[2]) + '</span><input data-inp="s7q-in" data-k="' + k + '"' + (f[3] ? ' dir="ltr"' : '') + ' value="' + esc(v) + '"' + (v ? '' : ' class="q7-miss"') + ' autocomplete="off"></label>'; };
  Modal.open(Modal.head('🚗 ' + L('حادثة من PDF', 'Sinistre depuis PDF'))
    + '<div class="q7"><div class="q7-file">📎 <span class="ltr">' + esc(S7Q.file) + '</span> · ' + L('ملف جديد N° ', 'Nouveau dossier N° ') + '<b class="ltr">' + esc(r.ordre) + '</b></div>'
    + '<div class="q7-g s7q-g">' + S7Q_F.map(fld).join('') + '</div>'
    + (r.advCie ? '<div class="q7-dt"><span>🚙</span><span>' + L('الشركة ديال الطرف الآخر: ', 'Compagnie adverse : ') + '<b>' + esc(r.advCie) + '</b>' + (r.advPolice ? ' · <span class="ltr">' + esc(r.advPolice) + '</span>' : '') + '</span></div>' : '')
    + '<div class="q7-acts"><button class="btn pri q7-go" data-act="s7q-send"' + (S7Q.busy ? ' disabled' : '') + '>📧 ' + L('إرسال للخبير', 'Envoyer à l\'expert') + '</button>'
      + '<button class="btn" data-act="s7q-save"' + (S7Q.busy ? ' disabled' : '') + '>💾 ' + L('حفظ بلا إرسال', 'Enregistrer') + '</button><button class="btn" data-act="s7q-full">✏️ ' + L('فتح كامل', 'Écran complet') + '</button></div>'
    + '<div class="hint">' + L('«إرسال للخبير» كيسجل الملف أولاً، ومن بعد كيحل نافذة الخبير (Gmail / واتساب) بحال العادة.', '« Envoyer » enregistre le dossier puis ouvre la fenêtre expert (Gmail / WhatsApp).') + '</div></div>', 'small q7m s7qm');
}
App.input('s7q-in', function (el) { var r = S7Q.row; if (!r) return; var k = el.dataset.k, v = (k === 'plate') ? el.value.toUpperCase() : el.value; if (v !== el.value) { var p = el.selectionStart; el.value = v; try { el.setSelectionRange(p, p); } catch (e) { } } r[k] = v; el.classList.toggle('q7-miss', !v); });
function s7qSave() {
  var r = S7Q.row; if (!r) return Promise.reject(new Error('no row'));
  var data = sinClean(r); SIN_EXTRA.forEach(function (x) { data[x[0]] = sinTidy(r[x[0]] || ''); });
  ['dateSin', 'dateRecep', 'dateOp'].forEach(function (k) { if (data[k]) data[k] = sinTidyDate(data[k]); });
  Object.keys(data).forEach(function (k) { if (typeof data[k] === 'string' && k !== 'statut') data[k] = sinTidy(data[k]); });
  if (!data.ordre && !data.assure) return Promise.reject(new Error(L('خاص على الأقل اسم المؤمَّن', 'Assuré requis')));
  S7Q.busy = true;
  return sinSave(null, data, true).then(function (ref) { toast('💾 ' + L('حُفظ الملف ', 'Dossier enregistré ') + data.ordre); return ref && ref.id; });
}
function s7qWaitRow(id, cb) { var n = 0; (function w() { var r = Sin.rows.filter(function (x) { return x.id === id; })[0]; if (r || ++n > 40) return cb(r); setTimeout(w, 100); })(); }
App.act('s7q-send', function () {
  s7qSave().then(function (id) {
    if (!id) { Modal.close(); return; }
    s7qWaitRow(id, function (r) { S7Q.row = null; if (r) App.acts['sm-open']({ dataset: { id: id } }); else { Modal.close(); toast(L('الملف تحفظ. صيفط للخبير من «الحوادث».', 'Dossier enregistré. Envoyez depuis « Sinistres ».')); } });
  }).catch(function (e) { S7Q.busy = false; toast((e && e.message) || String(e), 'err'); });
});
App.act('s7q-save', function () { s7qSave().then(function () { S7Q.row = null; Modal.close(); }).catch(function (e) { S7Q.busy = false; toast((e && e.message) || String(e), 'err'); }); });
App.act('s7q-full', function () { var r = S7Q.row, f = S7Q.filled, n = S7Q.note; Modal.close(); S7Q.row = null; App.go('sin'); setTimeout(function () { sinOpen(r, { isNew: true, fromPdf: f, note: n }); }, 120); });
App.act('s7q-send-twin', function () { var t = S7Q.twin; if (t) App.acts['sm-open']({ dataset: { id: t.id } }); });
App.act('s7q-open-twin', function () { var t = S7Q.twin; Modal.close(); App.go('sin'); setTimeout(function () { if (t) sinOpen(t); }, 120); });
