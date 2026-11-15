/* ══════════════════════════════════════════════════════════
   RenewPro v4 — dropzone.js   (السحب والإفلات)
   اسحب ملفاً من سطح المكتب أو من مجلد وأفلته فوق البرنامج: يُحمَّل في قسم الصفحة المفتوحة،
   تماماً كأنك ضغطت «تحميل» واخترته. زر الاختيار يبقى كما هو (للهاتف).
   أقسام الحاسبة لها سحبها الخاص داخل calc/embed.js.
   لإضافة قسم: سطر في DROP_TARGETS = { معرّف القسم: { inp: اسم App.input، ... } }
══════════════════════════════════════════════════════════ */
'use strict';

var DROP_TARGETS = {
  prod:  { inp: 'p-file', multi: true, ext: /\.(xlsx|xls|csv)$/i, label: ['ملفات الإنتاج (يمكن عدة ملفات)', 'Fichiers de production (plusieurs possibles)'] },
  renew: { inp: 'r-file', admin: true, ext: /\.(xlsx|xls|csv)$/i, label: ['لائحة التجديد الجديدة', 'Nouvelle liste de renouvellement'] },
  debts: { inp: 'd-file', admin: true, ext: /\.(xlsx|xls|csv)$/i, label: ['ملف الديون', 'Fichier des dettes'] },
  dash:  { inp: 't-notes-file', admin: true, ext: /\.(xlsx|xls|csv)$/i, label: ['استيراد الملاحظات', 'Import des notes'] }
};
function dropTarget() {
  var t = App.user && DROP_TARGETS[App.page]; if (!t) return null;
  if (t.admin && !App.canUp()) return null;
  return App.inputs[t.inp] ? t : null;
}
function hasFiles(e) { var dt = e.dataTransfer; return !!dt && Array.prototype.indexOf.call(dt.types || [], 'Files') >= 0; }
function dropOverlay(show, t) {
  var o = $('drop-ov');
  if (!o) { o = document.createElement('div'); o.id = 'drop-ov'; o.className = 'drop-ov'; document.body.appendChild(o); }
  if (show) o.innerHTML = '<div class="drop-box' + (t ? '' : ' no') + '"><span>' + (t ? '📥' : '🚫') + '</span><b>'
    + (t ? L('أفلت الملف هنا', 'Déposez le fichier ici') : L('لا يوجد تحميل ملف في هذا القسم', 'Pas d\'import dans cette section')) + '</b>'
    + (t ? '<small>' + esc(L(t.label[0], t.label[1])) + '</small>' : '') + '</div>';
  o.classList.toggle('on', !!show);
}
(function () {
  var depth = 0;
  document.addEventListener('dragenter', function (e) { if (!hasFiles(e) || !App.user) return; depth++; dropOverlay(true, dropTarget()); });
  document.addEventListener('dragleave', function (e) { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) dropOverlay(false); });
  /* يمنع المتصفح من فتح الملف مكان البرنامج إن أُفلت في مكان خاطئ */
  document.addEventListener('dragover', function (e) { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = dropTarget() ? 'copy' : 'none'; });
  document.addEventListener('drop', function (e) {
    if (!hasFiles(e)) return; e.preventDefault(); depth = 0; dropOverlay(false);
    var t = dropTarget(); if (!t) return;
    var files = Array.prototype.slice.call(e.dataTransfer.files || []).filter(function (f) { return !t.ext || t.ext.test(f.name); });
    if (!files.length) { toast(L('نوع الملف غير مناسب لهذا القسم', 'Type de fichier non adapté'), 'err'); return; }
    if (!t.multi) files = files.slice(0, 1);
    Modal.close();
    App.inputs[t.inp]({ files: files, value: '', dataset: {} });
  });
})();
