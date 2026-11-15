/* ══════════════════════════════════════════════════════════
   RenewPro 2 — mod-settings.js   (الإعدادات)
   الحساب، اللغة، المظهر، نصوص الرسائل، لائحة التجديد.
   الأقسام الأخرى تضيف فقراتها هنا عبر:  App.hook('settings.blocks', fn)
══════════════════════════════════════════════════════════ */
'use strict';

/* نص قواعد Firestore (نفسه في ملف firestore.rules) — يُنسخ بضغطة من داخل البرنامج */
var RULES_TEXT = "// RenewPro v5 — قواعد Firestore\n// ضعها في: Firebase Console ← Firestore Database ← Rules ثم «Publish».\n// أضف بريد كل مدير في لائحة admins() أسفله.\nrules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n\n    function signedIn() { return request.auth != null; }\n    function admins()   { return ['tsptanger20@gmail.com']; }          // ← بريد المدير (أضف غيره بفاصلة)\n    // مفتاح الموظف = بريده بحروف صغيرة وكل رمز «_»\n    function ukey()     { return request.auth.token.email.lower().replace('[^a-z0-9]', '_'); }\n    function isAdmin()  {\n      return signedIn() && (request.auth.token.email in admins() ||\n        get(/databases/$(database)/documents/rp_meta/users).data.get(ukey(), {}).get('role', '') == 'admin');\n    }\n    // صلاحية «📥 تحميل الملفات» (من جدول الصلاحيات فالبرنامج)\n    function canFiles() {\n      return isAdmin() || (signedIn() &&\n        get(/databases/$(database)/documents/rp_meta/users).data.get(ukey(), {}).get('perms', {}).get('files', false) == true);\n    }\n    // صلاحية «🏦 البنك»: خاصها تتعطى صراحة فجدول الصلاحيات\n    function canBank() {\n      return isAdmin() || (signedIn() &&\n        get(/databases/$(database)/documents/rp_meta/users).data.get(ukey(), {}).get('perms', {}).get('bank', false) == true);\n    }\n\n    // لائحة التجديد: الكل يقرأ ويعدّل ويضيف، والحذف (ومنه تحميل لائحة جديدة) للمدير ولمن عندو «تحميل الملفات»\n    match /contacts/{id} {\n      allow read, create, update: if signedIn();\n      allow delete: if canFiles();\n    }\n\n    // الديون: لائحة الديون وخريطة الربط (x_...) يكتبها المدير ومن عندو «تحميل الملفات»؛ متابعة كل سطر يكتبها الجميع\n    match /debts/{id} {\n      allow read: if signedIn();\n      allow write: if canFiles() || (signedIn() && !id.matches('x_.*'));\n    }\n\n    // المهام المشتركة: الكل يقرأ ويضيف ويعدّل (إنجاز)، والحذف لصاحب المهمة أو المدير\n    match /tasks/{id} {\n      allow read, create, update: if signedIn();\n      allow delete: if isAdmin() || (signedIn() && resource.data.byEmail == request.auth.token.email);\n    }\n\n    // سجل الحوادث: كل من له حساب يقرأ ويضيف ويعدّل (الصلاحية تُضبط في البرنامج)، والحذف للمدير\n    match /sinistres/{id} {\n      allow read, create, update: if signedIn();\n      allow delete: if isAdmin();\n    }\n\n    // الحاسبة (v5): السجل، الصندوق، الزبناء، الأسعار… الكل يقرأ ويكتب، و«_meta» (حالة النقل) للمدير فقط\n    match /calc/{id} {\n      allow read: if signedIn();\n      allow write: if signedIn() && (id != '_meta' || isAdmin());\n    }\n\n    // 🗂️ الملفات المحمّلة: الكل يقرأ، والإضافة لمن عندو «تحميل الملفات»، والحذف للمدير فقط\n    match /files/{id} {\n      allow read: if signedIn();\n      allow create, update: if canFiles();\n      allow delete: if isAdmin();\n    }\n\n    // 🏦 البنك (v6.3): غير المدير ومن عندو «البنك» يقرا ويكتب، والحذف للمدير\n    match /bank/{id} {\n      allow read, create, update: if canBank();\n      allow delete: if isAdmin();\n    }\n\n    // 🐞 سجل الأخطاء (v7.0.4): أي واحد مسجّل يقدر يزيد خطأ ولا بلاغ، والمدير وحدو يقرا ويمسح\n    match /logs/{id} {\n      allow create: if signedIn();\n      allow read, delete: if isAdmin();\n    }\n\n    // 🛡️ الجلسات (v7.6): كل جهاز كيكتب السطر ديالو (بلا ما يمسّ «kick»)، والمدير كيقرا الكل وكيحط «kick» باش يسدّ جلسة\n    match /sessions/{id} {\n      allow read: if isAdmin() || (signedIn() && resource.data.uid == request.auth.uid);\n      allow create: if signedIn() && request.resource.data.uid == request.auth.uid && !('kick' in request.resource.data);\n      allow update: if isAdmin() || (signedIn() && resource.data.uid == request.auth.uid && request.resource.data.uid == request.auth.uid\n        && request.resource.data.get('kick', null) == resource.data.get('kick', null));\n      allow delete: if isAdmin() || (signedIn() && resource.data.uid == request.auth.uid);\n    }\n\n    // الإعدادات المشتركة، الموظفون، الأرشيف: المدير يكتب، الجميع يقرأ. دفتر الهواتف يكتبه الجميع.\n    // «تحميل الملفات»: أرشيف اللوائح (archh/archc)، قاعدة الأرقام (pbk)، واسم اللائحة فالإعدادات.\n    match /rp_meta/{id} {\n      allow read: if signedIn();\n      allow write: if isAdmin() || (signedIn() && id == 'phones')\n        || (canFiles() && (id == 'settings' || id.matches('archh_.*') || id.matches('archc_.*') || id.matches('pbk_.*')));\n    }\n  }\n}\n";
function rulesDenied() { return !!(Meta.denied || (typeof Debts !== 'undefined' && Debts.denied) || (typeof Archive !== 'undefined' && Archive.denied) || Contacts.denied); }
/* تنبيه واضح للمدير بدل رسالة حمراء عابرة: ما المرفوض وكيف يُصلَح */
function rulesBoxHTML() {
  if (!App.user || !rulesDenied()) return '';
  var what = [];
  if (Contacts.denied) what.push(L('لائحة التجديد', 'la liste de renouvellement'));
  if (typeof Debts !== 'undefined' && Debts.denied) what.push(L('الديون', 'les dettes'));
  if (Meta.denied || (typeof Archive !== 'undefined' && Archive.denied)) what.push(L('الأرشيف، الموظفون، دفتر الهواتف، الإعدادات المشتركة', 'archives, agents, répertoire, paramètres partagés'));
  return '<div class="box red rules-box"><b>⚠️ ' + L('قاعدة البيانات ترفض: ', 'La base refuse : ') + what.join(L('، ', ', ')) + '</b>'
    + '<div style="margin:6px 0">' + L('السبب: قواعد Firestore الحالية لا تسمح بها. الحل مرة واحدة:', 'Cause : les règles Firestore actuelles ne les autorisent pas. Solution, une seule fois :') + '</div>'
    + '<ol><li>' + L('اضغط «نسخ القواعد» أسفله.', 'Cliquez « Copier les règles » ci-dessous.') + '</li>'
    + '<li>' + L('افتح ', 'Ouvrez ') + '<span class="ltr">console.firebase.google.com</span> ← <span class="ltr">renewpro-c857f</span> ← Firestore Database ← Rules.</li>'
    + '<li>' + L('امسح الموجود، الصق، ثم Publish.', 'Effacez, collez, puis Publish.') + '</li>'
    + '<li>' + L('ارجع هنا وحدّث الصفحة.', 'Revenez ici et actualisez la page.') + '</li></ol>'
    + (App.user.admin ? '<button class="btn pri wide" data-act="st-copyrules">📋 ' + L('نسخ القواعد', 'Copier les règles') + '</button>' : '<div class="hint">' + L('هذا يقوم به المدير.', 'À faire par l\'administrateur.') + '</div>') + '</div>';
}
App.act('st-copyrules', function () {
  var done = function () { toast(L('📋 نُسخت القواعد — الصقها في Firebase', '📋 Règles copiées — collez-les dans Firebase')); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(RULES_TEXT).then(done, function () { Modal.open(Modal.head('firestore.rules') + '<textarea rows="16" dir="ltr" readonly>' + esc(RULES_TEXT) + '</textarea>'); });
  else Modal.open(Modal.head('firestore.rules') + '<textarea rows="16" dir="ltr" readonly>' + esc(RULES_TEXT) + '</textarea>');
});
function renderSettings(el) {
  var adm = App.user.admin, ml = msgLang();
  var loaded = Meta.get('listLoadedAt', '');
  var seg = function (act, cur, opts) { return '<div class="seg">' + opts.map(function (o) { return '<button class="' + (cur === o[0] ? 'on' : '') + '" data-act="' + act + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
  el.innerHTML = '<div class="page narrow">'
    + '<div class="card"><div class="card-t">👤 ' + L('الحساب', 'Compte') + '</div>'
      + '<div class="kv"><span>' + L('البريد', 'Email') + '</span><b class="ltr">' + esc(App.user.email) + '</b></div>'
      + '<div class="kv"><span>' + L('الصلاحية', 'Rôle') + '</span><b>' + (adm ? L('مدير', 'Administrateur') : L('موظف', 'Agent')) + '</b></div>'
      + '<button class="btn danger wide" data-act="st-logout">🚪 ' + L('تسجيل الخروج', 'Se déconnecter') + '</button></div>'

    + '<div class="card"><div class="card-t">📋 ' + L('لائحة التجديد', 'Liste de renouvellement') + '</div>'
      + '<div class="kv"><span>' + L('الملف', 'Fichier') + '</span><b>' + esc(Meta.get('listName', '—')) + '</b></div>'
      + '<div class="kv"><span>' + L('حُمّل يوم', 'Chargé le') + '</span><b>' + (loaded ? fmtDT(loaded) : '—') + '</b></div>'
      + '<div class="kv"><span>' + L('عدد الزبناء', 'Clients') + '</span><b>' + Contacts.list.filter(function (c) { return !c.deleted; }).length + '</b></div>'
      + (adm ? '<button class="btn pri wide" data-act="r-import">📥 ' + L('تحميل لائحة جديدة (القديمة تُؤرشف)', 'Importer une nouvelle liste (l\'ancienne est archivée)') + '</button>'
             + '<label class="f inline"><span>' + L('إخفاء من انتهى عقده منذ أكثر من (يوم)', 'Masquer les expirés depuis plus de (jours)') + '</span><input id="st-stale" type="number" min="1" dir="ltr" value="' + staleDays() + '" data-inp="st-stale"></label>' : '')
    + '</div>'

    + '<div class="card"><div class="card-t">💬 ' + L('الرسائل', 'Messages') + '</div>'
      + '<div class="lbl">' + L('لغة الرسائل المرسلة للزبون', 'Langue des messages') + '</div>'
      + seg('st-msglang', ml, [['ar', 'العربية'], ['fr', 'Français']])
      + '<div class="lbl">' + L('رسالة تذكير التجديد', 'Message de rappel') + ' (' + ml.toUpperCase() + ')</div>'
      + '<textarea id="st-t-renew" rows="7"' + (adm ? '' : ' readonly') + '>' + esc(tmplGet('renew')) + '</textarea>'
      + '<div class="hint">[الاسم] [اللوحة] [الماركة] [نوع_المركبة] [تاريخ_الانتهاء] [البوليصة] [المدينة]</div>'
      + '<div class="lbl">' + L('رسالة تأكيد التجديد الهاتفي', 'Message de confirmation') + ' (' + ml.toUpperCase() + ')</div>'
      + '<textarea id="st-t-confirm" rows="7"' + (adm ? '' : ' readonly') + '>' + esc(tmplGet('confirm')) + '</textarea>'
      + '<div class="hint">[الاسم] [اللوحة] [التاريخ] [المدة] [المبلغ]</div>'
      + (adm ? '<div class="acts2"><button class="btn pri" data-act="st-savetmpl">💾 ' + L('حفظ النصوص', 'Enregistrer') + '</button>'
             + '<button class="btn" data-act="st-resettmpl">↺ ' + L('النص الافتراضي', 'Texte par défaut') + '</button></div>'
             : '<div class="hint">' + L('تعديل النصوص للمدير فقط.', 'Modification réservée à l\'administrateur.') + '</div>')
    + '</div>'

    + App.run('settings.blocks')

    + '<div class="card"><div class="card-t">🎨 ' + L('العرض', 'Affichage') + '</div>'
      + '<div class="lbl">' + L('لغة البرنامج', 'Langue de l\'application') + '</div>' + seg('st-lang', App.lang, [['ar', 'العربية'], ['fr', 'Français']])
      + '<div class="lbl">' + L('المظهر', 'Thème') + '</div>' + seg('st-theme', Local.get('theme', 'light'), [['dark', '🌙 ' + L('ليلي', 'Sombre')], ['light', '☀️ ' + L('فاتح', 'Clair')]])
      + '<div class="lbl">' + L('التطبيق', 'Application') + '</div>'
      + (App.isStandalone() ? '<div class="dbox ok">✅ ' + L('مثبَّت ويعمل كتطبيق', 'Installée et lancée comme application') + '</div>' : '<button class="btn wide" data-act="pwa-install">📲 ' + L('تثبيت كتطبيق على هذا الجهاز', 'Installer comme application') + '</button>')
    + '</div>'

    + rulesBoxHTML()
    + '<div class="muted sm center">RenewPro ' + App.version + '</div></div>';
}
App.act('st-logout', function () { if (confirm(L('تسجيل الخروج؟', 'Se déconnecter ?'))) FB.logout(); });
App.act('st-lang', function (el) { App.setLang(el.dataset.v); });
App.act('st-theme', function (el) { App.setTheme(el.dataset.v); App.render(); });
App.act('st-msglang', function (el) { Local.set('msglang', el.dataset.v); App.render(); });
App.act('st-savetmpl', function () {
  if (!App.user.admin) return; var ml = msgLang(), p = {};
  p['tmpl_renew_' + ml] = $('st-t-renew').value; p['tmpl_confirm_' + ml] = $('st-t-confirm').value;
  Meta.save(p); toast(L('💾 حُفظت النصوص', '💾 Textes enregistrés'));
});
App.act('st-resettmpl', function () {
  if (!App.user.admin) return; var ml = msgLang(), p = {};
  p['tmpl_renew_' + ml] = ''; p['tmpl_confirm_' + ml] = ''; Meta.save(p); App.render();
});
App.input('st-stale', debounce(function (el) { var v = parseInt(el.value, 10); if (v > 0 && App.user.admin) Meta.save({ staleDays: v }); }, 500));

App.register({ id: 'settings', icon: '⚙️', title: ['الإعدادات', 'Paramètres'], order: 90, render: renderSettings, admin: true });
