/* ══════════════════════════════════════════════════════════
   RenewPro v4 — mod-perms.js   (🛡️ الصلاحيات — للمدير فقط)
   جدول: الموظفون × الصلاحيات. كل موظف يرى فقط ما تعطيه له. الموظف الجديد يبدأ بلا شيء.
   الصلاحيات تُبنى وحدها من الأقسام (perm في App.register): أي قسم جديد يظهر هنا عموداً جديداً، مقفلاً على الجميع.
   الحفظ: rp_meta/users ← {مفتاح الموظف: {email, name, role, perms:{renew:true, …}}}
══════════════════════════════════════════════════════════ */
'use strict';

var PERM_INFO = {
  renew: ['🔄', ['التجديد', 'Renouvellement']],
  debts: ['💰', ['الديون', 'Dettes']],
  calc:  ['🧮', ['الحاسبة', 'Calculatrice']],
  tasks: ['🔔', ['الإشعارات', 'Notifications']],
  sin:   ['🚗', ['الحوادث', 'Sinistres']],
  files: ['📥', ['تحميل الملفات', 'Import de fichiers']],
  bank:  ['🏦', ['البنك', 'Banque']]
};
/* كل الصلاحيات الموجودة الآن (حسب الأقسام المسجّلة) مع الأقسام التي تفتحها */
function permList() {
  var by = {}, order = [];
  App.mods.forEach(function (m) { if (!m.perm || m.admin) return; if (!by[m.perm]) { by[m.perm] = { id: m.perm, mods: [] }; order.push(m.perm); } by[m.perm].mods.push(m); });
  return order.map(function (p) { var x = by[p], info = PERM_INFO[p];
    x.icon = info ? info[0] : x.mods[0].icon; x.title = info ? info[1] : x.mods[0].title; return x; });
}
function permTitle(x) { return L(x.title[0], x.title[1]); }
function userPerms(u) { return u.perms || null; }               // null = موظف قديم: يرى كل شيء حتى تحدّد
function permSave(u, perms) {
  var p = {}; p[uKey(u.email)] = { email: u.email, name: u.name || u.email.split('@')[0], role: u.role === 'admin' ? 'admin' : 'agent', perms: perms };
  return Meta.col().doc('users').set(p, { merge: true }).catch(syncErr);
}

App.input('pm-ck', function (el) {
  var u = Users.map[el.dataset.u]; if (!u || !App.user.admin) return;
  var all = permList(), cur = userPerms(u), perms = {};
  all.forEach(function (x) { perms[x.id] = cur ? !!cur[x.id] : true; });     // موظف قديم: نبدأ من «كل شيء» ثم نطبّق التغيير
  perms[el.dataset.p] = el.checked;
  permSave(u, perms).then(function () { toast('🛡️ ' + L('حُفظت صلاحيات ', 'Droits enregistrés : ') + (u.name || u.email)); });
});
App.act('pm-all', function (el) {
  var u = Users.map[el.dataset.u]; if (!u) return; var on = el.dataset.v === '1', perms = {};
  permList().forEach(function (x) { perms[x.id] = on; }); permSave(u, perms);
});
App.act('pm-copy', function () {
  var from = Users.map[$('pm-from').value], to = Users.map[$('pm-to').value];
  if (!from || !to || from === to) { toast(L('اختر موظفين مختلفين', 'Choisissez deux agents différents'), 'err'); return; }
  var src = userPerms(from), perms = {}; permList().forEach(function (x) { perms[x.id] = src ? !!src[x.id] : true; });
  permSave(to, perms).then(function () { toast('📋 ' + L('نُسخت الصلاحيات إلى ', 'Droits copiés vers ') + (to.name || to.email)); });
});
App.act('pm-add', function () {
  var em = $('pm-email').value.trim().toLowerCase(), nm = $('pm-name').value.trim();
  if (!/.+@.+\..+/.test(em) || !nm) { toast(L('أدخل البريد والاسم', 'Email et nom requis'), 'err'); return; }
  Users.save(em, nm, 'agent'); $('pm-email').value = ''; $('pm-name').value = '';
  toast(L('👥 أُضيف — بلا صلاحيات حتى تحدّدها', '👥 Ajouté — sans droits pour l\'instant'));
});

function renderPerms(el) {
  var perms = permList(), users = Users.list(), me = App.user.email;
  var keyOf = function (u) { return uKey(u.email); };
  var head = '<tr><th>' + L('الموظف', 'Agent') + '</th>' + perms.map(function (x) {
      return '<th title="' + esc(x.mods.map(function (m) { return L(m.title[0], m.title[1]); }).join('، ')) + '">' + x.icon + '<br>' + esc(permTitle(x)) + '</th>'; }).join('') + '<th></th></tr>';
  var rows = users.map(function (u) {
    var k = keyOf(u), adm = u.role === 'admin' || u.email === ADMIN_EMAIL, cur = userPerms(u);
    return '<tr><td><b>' + esc(u.name || '—') + (adm ? ' ★' : '') + '</b><small class="ltr muted">' + esc(u.email) + '</small>'
      + (!adm && !cur ? '<small class="amber-t">' + L('قديم: يرى كل شيء حتى تحدّد', 'Ancien : voit tout jusqu\'à réglage') + '</small>' : '') + '</td>'
      + perms.map(function (x) {
          if (adm) return '<td class="c">✅</td>';
          var on = cur ? !!cur[x.id] : true;
          return '<td class="c"><input type="checkbox" class="pm-ck" data-inp="pm-ck" data-u="' + esc(k) + '" data-p="' + esc(x.id) + '"' + (on ? ' checked' : '') + '></td>'; }).join('')
      + '<td class="c">' + (adm ? '<small class="muted">' + L('مدير', 'Admin') + '</small>' : '<button class="btn sm" data-act="pm-all" data-u="' + esc(k) + '" data-v="1">' + L('الكل', 'Tout') + '</button> '
          + '<button class="btn sm" data-act="pm-all" data-u="' + esc(k) + '" data-v="0">' + L('لا شيء', 'Rien') + '</button>') + '</td></tr>';
  }).join('');
  var opts = users.filter(function (u) { return u.role !== 'admin'; }).map(function (u) { return '<option value="' + esc(keyOf(u)) + '">' + esc(u.name || u.email) + '</option>'; }).join('');
  el.innerHTML = '<div class="page">'
    + '<div class="card"><div class="card-t">🛡️ ' + L('الصلاحيات', 'Droits d\'accès') + '</div>'
      + '<div class="hint" style="margin-bottom:8px">' + L('علّم ما يراه كل موظف. ما لا يملكه لا يظهر له في القائمة ولا في الرئيسية ولا في بطاقة الزبون. الموظف الجديد يبدأ بلا شيء. أي قسم يُضاف للبرنامج لاحقاً يظهر هنا عموداً جديداً مقفلاً على الجميع.',
          'Cochez ce que chaque agent voit. Un nouvel agent commence sans droits. Toute nouvelle section apparaît ici comme une nouvelle colonne, fermée pour tous.') + '</div>'
      + (users.length ? '<div class="tbl-wrap"><table class="tbl pm-tbl"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>'
          : '<div class="empty"><span>' + L('لا موظفين بعد. أضف موظفاً أسفله.', 'Aucun agent. Ajoutez-en un ci-dessous.') + '</span></div>')
      + '<div class="hint">' + perms.map(function (x) { return x.icon + ' <b>' + esc(permTitle(x)) + '</b>: ' + esc(x.mods.map(function (m) { return L(m.title[0], m.title[1]); }).join('، ')); }).join(' · ') + '</div>'
      + '<div class="hint">' + L('📥 تحميل الملفات: لائحة التجديد، الديون، قاعدة الأرقام، ملفات الإنتاج، استيراد الحوادث، البوردورو… وكتشوف «🗂️ الملفات المحمّلة». الحذف ديال الملفات المحفوظة للمدير فقط.', '📥 Import : listes, dettes, numéros, production, sinistres, bordereau… La suppression des fichiers enregistrés reste à l\'admin.') + '</div>'
      + '<div class="hint">' + L('للمدير دائماً: الإعدادات، الصلاحيات، الأسعار، قوالب PDF، مستخدمو الحاسبة.', 'Toujours réservé à l\'admin : paramètres, droits, prix, modèles PDF, utilisateurs calc.') + '</div>'
    + '</div>'
    + (opts ? '<div class="card"><div class="card-t">📋 ' + L('نسخ الصلاحيات', 'Copier les droits') + '</div><div class="grid2">'
        + '<label class="f"><span>' + L('من', 'De') + '</span><select id="pm-from" class="inp">' + opts + '</select></label>'
        + '<label class="f"><span>' + L('إلى', 'Vers') + '</span><select id="pm-to" class="inp">' + opts + '</select></label></div>'
        + '<button class="btn wide" data-act="pm-copy">📋 ' + L('نسخ', 'Copier') + '</button></div>' : '')
    + '<div class="card"><div class="card-t">➕ ' + L('إضافة موظف', 'Ajouter un agent') + '</div>'
      + '<div class="grid2"><label class="f"><span>' + L('البريد (حسابه في Firebase)', 'Email (compte Firebase)') + '</span><input id="pm-email" type="email" dir="ltr"></label>'
      + '<label class="f"><span>' + L('الاسم', 'Nom') + '</span><input id="pm-name"></label></div>'
      + '<button class="btn pri wide" data-act="pm-add">➕ ' + L('إضافة', 'Ajouter') + '</button>'
      + '<div class="hint">' + L('الحساب نفسه (البريد وكلمة السر) يُنشأ في Firebase ← Authentication ← Add user. المدراء والأدوار في الرئيسية ← التحكم.', 'Le compte se crée dans Firebase ← Authentication ← Add user.') + '</div></div>'
    + '</div>';
}
App.register({ id: 'perms', icon: '🛡️', title: ['الصلاحيات', 'Droits'], order: 85, render: renderPerms, admin: true });
