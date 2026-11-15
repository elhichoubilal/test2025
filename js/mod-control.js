/* ══════════════════════════════════════════════════════════
   RenewPro v6 — mod-control.js   (🎛️ لوحة التحكم — للمدير)
   بلاصة وحدة: الأقسام (الترتيب، يبان/مخبّي) · الصلاحيات · الموظفون · Google Sheets · الإعدادات.
   الأقسام كتبنى وحدها من App.mods: أي قسم جديد كيبان هنا (وفالصلاحيات وفـ Google Sheets) بلا ما نمسو هاد الملف.
══════════════════════════════════════════════════════════ */
'use strict';

var Ctl = { tab: Local.get('ctl_tab', 'mods') };
var CTL_TABS = [
  ['mods', '🧩', ['الأقسام', 'Sections']],
  ['perms', '🛡️', ['الصلاحيات', 'Droits']],
  ['users', '👥', ['الموظفون', 'Agents']],
  ['sheets', '📊', ['Google Sheets', 'Google Sheets']],
  ['settings', '⚙️', ['الإعدادات', 'Paramètres']]
];
/* الإعدادات والصلاحيات كيتحلو من هنا، ماشي من القائمة */
['settings', 'perms'].forEach(function (id) { var m = App.mod(id); if (m) m.nav = false; });

/* صفوف الأقسام: كل قسم بوحدو، والمجموعة (الحاسبة) صف واحد */
function ctlRows() {
  var rows = [], seen = {};
  App.sortedMods().forEach(function (m) {
    if (m.id === 'dash' || m.id === 'control' || m.nav === false) return;
    var k = App.modKey(m); if (seen[k]) { seen[k].mods.push(m); return; }
    var r = { key: k, mods: [m], icon: m.group ? (m.groupIcon || m.icon) : m.icon,
      title: m.group && m.groupTitle ? L(m.groupTitle[0], m.groupTitle[1]) : L(m.title[0], m.title[1]) };
    seen[k] = r; rows.push(r);
  });
  return rows;
}
function ctlSaveOrder(keys) { Meta.save({ modOrder: keys }); App.renderNav(); App.render(); }
App.act('ctl-up', function (el) { var keys = ctlRows().map(function (r) { return r.key; }), i = keys.indexOf(el.dataset.k), j = i + (+el.dataset.d);
  if (i < 0 || j < 0 || j >= keys.length) return; var t = keys[i]; keys[i] = keys[j]; keys[j] = t; ctlSaveOrder(keys); });
App.act('ctl-reset', function () { if (confirm(L('نرجعو الترتيب الأصلي؟', 'Revenir à l\'ordre d\'origine ?'))) { Meta.save({ modOrder: [] }); App.renderNav(); App.render(); } });
App.input('ctl-vis', function (el) {
  var row = ctlRows().filter(function (r) { return r.key === el.dataset.k; })[0]; if (!row) return;
  var off = (Meta.get('modsOff', []) || []).slice();
  row.mods.forEach(function (m) { var p = off.indexOf(m.id); if (el.checked) { if (p >= 0) off.splice(p, 1); } else if (p < 0) off.push(m.id); });
  Meta.save({ modsOff: off }); App.renderNav();
});
App.act('ctl-tab', function (el) { Ctl.tab = el.dataset.t; Local.set('ctl_tab', Ctl.tab); App.render(); });

function ctlModsHTML() {
  var rows = ctlRows(), off = Meta.get('modsOff', []) || [];
  return '<div class="card"><div class="card-t">🧩 ' + L('الأقسام — الترتيب والظهور', 'Sections — ordre et visibilité') + '</div>'
    + '<div class="hint">' + L('الترتيب كيتطبق على القائمة وعلى بطاقات الرئيسية عند الجميع. «يبان للموظفين» كيخبّي القسم على الكل (المدير ديما كيشوفو). الصلاحيات ديال كل موظف فـ «🛡️ الصلاحيات».',
        'L\'ordre s\'applique au menu et aux cartes d\'accueil pour tous. « Visible » masque la section pour tous les agents.') + '</div>'
    + '<div class="ctl-list"><div class="ctl-row ctl-fixed"><span class="ctl-n">·</span><span class="ctl-ic">🏠</span><span class="ctl-t">' + L('الرئيسية', 'Accueil') + ' <small class="muted">' + L('ديما الأولى', 'toujours en premier') + '</small></span></div>'
    + rows.map(function (r, i) {
        var vis = r.mods.some(function (m) { return off.indexOf(m.id) < 0; }), adm = r.mods.every(function (m) { return m.admin; });
        var who = adm ? L('للمدير فقط', 'admin seulement') : (r.mods[0].perm ? (typeof PERM_INFO !== 'undefined' && PERM_INFO[r.mods[0].perm] ? PERM_INFO[r.mods[0].perm][0] + ' ' + L(PERM_INFO[r.mods[0].perm][1][0], PERM_INFO[r.mods[0].perm][1][1]) : r.mods[0].perm) : '');
        return '<div class="ctl-row"><span class="ctl-n">' + (i + 1) + '</span><span class="ctl-ic">' + r.icon + '</span>'
          + '<span class="ctl-t">' + esc(r.title) + (r.mods.length > 1 ? ' <small class="muted">(' + r.mods.length + ')</small>' : '') + '<small class="muted">' + L('الصلاحية: ', 'Droit : ') + who + '</small></span>'
          + (adm ? '' : '<label class="ctl-sw" title="' + L('يبان للموظفين', 'Visible pour les agents') + '"><input type="checkbox" data-inp="ctl-vis" data-k="' + esc(r.key) + '"' + (vis ? ' checked' : '') + '><span>👁</span></label>')
          + '<span class="ctl-mv"><button class="btn sm" data-act="ctl-up" data-k="' + esc(r.key) + '" data-d="-1"' + (i ? '' : ' disabled') + '>▲</button>'
          + '<button class="btn sm" data-act="ctl-up" data-k="' + esc(r.key) + '" data-d="1"' + (i < rows.length - 1 ? '' : ' disabled') + '>▼</button></span></div>';
      }).join('') + '</div>'
    + '<button class="btn sm" data-act="ctl-reset">↺ ' + L('الترتيب الأصلي', 'Ordre d\'origine') + '</button></div>';
}
function ctlUsersHTML() {
  var users = Users.list();
  return '<div class="card"><div class="card-t">👥 ' + L('الموظفون', 'Agents') + '</div>'
    + '<label class="chk"><input type="checkbox" data-inp="ctl-all"' + (Meta.get('agentsSeeAll', false) ? ' checked' : '') + '><span>' + L('الموظف يرى كل الزبناء (لا المسندين إليه فقط)', 'L\'agent voit tous les clients (pas seulement les siens)') + '</span></label>'
    + '<div class="lines">' + (users.length ? users.map(function (u) { var n = Contacts.list.filter(function (c) { return !c.deleted && c.agent === u.name; }).length;
        return '<div class="line"><div><b>' + esc(u.name) + (u.role === 'admin' ? ' ★' : '') + '</b><small class="ltr">' + esc(u.email) + '</small><small> · ' + n + ' ' + L('زبون', 'clients') + '</small></div>'
          + '<button class="x sm" data-act="u-del" data-e="' + esc(u.email) + '">✕</button></div>'; }).join('') : '<div class="muted sm">' + L('لم تُضف موظفين بعد', 'Aucun agent ajouté') + '</div>') + '</div>'
    + '<div class="form u-form"><label class="f"><span>' + L('بريد الموظف (حسابه في Firebase)', 'Email de l\'agent') + '</span><input id="u-email" type="email" dir="ltr"></label>'
      + '<label class="f"><span>' + L('الاسم الظاهر', 'Nom affiché') + '</span><input id="u-name"></label>'
      + '<label class="f"><span>' + L('الدور', 'Rôle') + '</span><select id="u-role" class="inp"><option value="agent">' + L('موظف', 'Agent') + '</option><option value="admin">' + L('مدير', 'Administrateur') + '</option></select></label></div>'
    + '<button class="btn wide" data-act="u-add">➕ ' + L('إضافة / تحديث موظف', 'Ajouter / mettre à jour') + '</button>'
    + '<button class="btn wide" data-act="u-assign">👥 ' + L('إسناد الزبناء المعروضين فالتجديد لموظف', 'Affecter les clients affichés') + '</button>'
    + '<div class="hint">' + L('الحساب نفسه (البريد وكلمة السر) يُنشأ في Firebase ← Authentication. الموظف الجديد كيبدا بلا صلاحيات: حددها فـ «🛡️ الصلاحيات».', 'Le compte se crée dans Firebase ← Authentication. Un nouvel agent commence sans droits.') + '</div></div>';
}
/* لوحة الحالة (فوق): Firebase، الحاسبة، Google Sheets، الملفات */
function ctlStatusHTML() {
  var cm = (typeof CalcStore !== 'undefined' && CalcStore.meta) || {}, sh = Meta.get('sheetsLast', null), files = (typeof Files !== 'undefined') ? Files.heads.length : 0;
  var it = function (ic, t, v, cls) { return '<div class="st6 ' + (cls || '') + '"><span>' + ic + '</span><b>' + v + '</b><small>' + t + '</small></div>'; };
  return '<div class="st6s">'
    + it('🔥', 'Firebase', rulesDenied() ? L('مرفوض', 'Refusé') : L('متصل', 'Connecté'), rulesDenied() ? 'red' : 'green')
    + it('🧮', L('الحاسبة', 'Calculatrice'), cm.migratedAt ? L('القاعدة الوحيدة', 'Base unique') : esc((typeof CalcStore !== 'undefined' && CalcStore.reason()) || L('في الانتظار', 'En attente')), cm.migratedAt ? 'green' : 'red')
    + it('📊', 'Google Sheets', sh ? (sh.ok ? fmtDT(sh.at) : L('خطأ', 'Erreur')) : (Meta.get('sheetsUrl', '') ? L('في الانتظار', 'En attente') : L('غير مربوط', 'Non relié')), sh ? (sh.ok ? 'green' : 'red') : '')
    + it('🗂️', L('الملفات', 'Fichiers'), files, '')
    + '</div>';
}
function renderControl(el) {
  var tab = Ctl.tab, body = '';
  el.innerHTML = '<div class="page ctl6"><div class="ctl-h"><b>🎛️ ' + L('لوحة التحكم', 'Tableau de contrôle') + '</b><small class="muted">v' + esc(App.version) + '</small></div>'
    + ctlStatusHTML()
    + '<div class="chips ctl-tabs">' + CTL_TABS.map(function (t) { return '<button class="chip' + (tab === t[0] ? ' on' : '') + '" data-act="ctl-tab" data-t="' + t[0] + '">' + t[1] + ' ' + esc(L(t[2][0], t[2][1])) + '</button>'; }).join('') + '</div>'
    + '<div id="ctl-body"></div></div>';
  var b = $('ctl-body');
  if (tab === 'mods') b.innerHTML = ctlModsHTML();
  else if (tab === 'users') b.innerHTML = ctlUsersHTML();
  else if (tab === 'sheets') b.innerHTML = (typeof sheetsPanelHTML === 'function') ? sheetsPanelHTML() : '';
  else if (tab === 'perms') { renderPerms(b); }
  else if (tab === 'settings') { renderSettings(b); }
  /* الصفحات اللي داخلة (الصلاحيات/الإعدادات) فيها «page» ديالها: نحيدو الهامش المزدوج */
  Array.prototype.forEach.call(b.querySelectorAll(':scope > .page'), function (p) { p.classList.add('ctl-inner'); });
}
App.register({ id: 'control', icon: '🎛️', title: ['لوحة التحكم', 'Contrôle'], order: 84, render: renderControl, admin: true });
