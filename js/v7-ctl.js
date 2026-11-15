/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-ctl.js   (🎛️ لوحة التحكم بالشكل الجديد · 7.6.1)
   غير الشكل: نفس الأزرار (data-act / data-inp)، نفس الحفظ (Meta: modOrder، modsOff، users…).
   الرأس + بطاقات الحالة + تبويبات + جدول الأقسام + الموظفون.
══════════════════════════════════════════════════════════ */
'use strict';
function ctl7Card(ic, cls, t, v, s, act) { return '<' + (act ? 'button data-act="nav" data-id="' + act + '"' : 'div') + ' class="sec-k ctl7-k"><div class="sec-kt"><span>' + t + '</span><b class="' + cls + '">' + v + '</b><small>' + s + '</small></div><i class="sec-ki ' + cls + '">' + ic + '</i></' + (act ? 'button' : 'div') + '>'; }

/* بطاقات الحالة (نفس المعلومات ديال القديمة) */
ctlStatusHTML = function () {
  var cm = (typeof CalcStore !== 'undefined' && CalcStore.meta) || {}, sh = Meta.get('sheetsLast', null), files = (typeof Files !== 'undefined') ? Files.heads.length : 0, den = rulesDenied();
  var shOn = !!Meta.get('sheetsUrl', '');
  return '<div class="sec-kpis">'
    + ctl7Card('fire', den ? 'err' : 'fire', 'Firebase', den ? L('مرفوض', 'Refusé') : L('متصل', 'Connecté'), den ? L('انشر القواعد (الإعدادات)', 'Publiez les règles') : L('القواعد مزيانة', 'Règles OK'))
    + ctl7Card('calc', cm.migratedAt ? 'ok' : 'warn', L('الحاسبة', 'Calculatrice'), cm.migratedAt ? L('القاعدة الوحيدة', 'Base unique') : L('في الانتظار', 'En attente'), cm.migratedAt ? L('منذ ', 'depuis ') + fmtD(String(cm.migratedAt).slice(0, 10)) : esc((typeof CalcStore !== 'undefined' && CalcStore.reason()) || ''))
    + ctl7Card('sheets', sh ? (sh.ok ? 'ok' : 'err') : 'off', 'Google Sheets', sh ? (sh.ok ? L('خدام', 'Actif') : L('خطأ', 'Erreur')) : shOn ? L('في الانتظار', 'En attente') : L('غير مربوط', 'Non relié'), sh && sh.at ? L('آخر نسخ: ', 'Dernière copie : ') + fmtDT(sh.at) : '—')
    + ctl7Card('folder', 'blue', L('الملفات المحمّلة', 'Fichiers'), files, L('ملفات الإنتاج والأرشيف', 'production et archives'))
    + '</div>';
};

/* الأقسام: جدول نقي + زر تشغيل + المجموعة ديال القائمة */
function ctl7Grp(m) { if (typeof NAV7 === 'undefined') return ''; var g = NAV7.filter(function (x) { return x.ids.indexOf(m.id) >= 0; })[0]; return g ? L(g.t[0], g.t[1]) : L('أخرى', 'Autres'); }
ctlModsHTML = function () {
  var rows = ctlRows(), off = Meta.get('modsOff', []) || [];
  var nOn = rows.filter(function (r) { return r.mods.some(function (m) { return off.indexOf(m.id) < 0; }); }).length;
  return '<section class="sec-box"><div class="sec-bh"><span>🧩</span><b>' + L('الأقسام — الترتيب والظهور', 'Sections — ordre et visibilité') + '</b><span class="sp"></span><small>' + nOn + ' / ' + rows.length + ' ' + L('ظاهرين للموظفين', 'visibles') + '</small>'
      + '<button class="btn sm" data-act="ctl-reset">↺ ' + L('الترتيب الأصلي', 'Ordre d\'origine') + '</button></div>'
    + '<div class="hint ctl7-hint">' + L('الترتيب كيتطبق على القائمة الجانبية (داخل كل مجموعة) وعلى الرئيسية عند الجميع. الزر كيخبّي القسم على الموظفين (المدير ديما كيشوفو). الصلاحيات ديال كل موظف فـ «🛡️ الصلاحيات».',
        'L\'ordre s\'applique au menu (dans chaque groupe) et à l\'accueil. L\'interrupteur masque la section pour les agents.') + '</div>'
    + '<div class="ctl7-t"><div class="ctl7-r hd"><span>#</span><span>' + L('القسم', 'Section') + '</span><span>' + L('المجموعة', 'Groupe') + '</span><span>' + L('الصلاحية', 'Droit') + '</span><span>' + L('للموظفين', 'Agents') + '</span><span>' + L('الترتيب', 'Ordre') + '</span></div>'
    + '<div class="ctl7-r fx"><span>·</span><span class="ctl7-n"><i>🏠</i><b>' + L('الرئيسية', 'Accueil') + '</b></span><span class="ctl7-g">' + L('العمل اليومي', 'Travail du jour') + '</span><span class="muted">' + L('ديما الأولى', 'toujours en premier') + '</span><span></span><span></span></div>'
    + rows.map(function (r, i) {
        var vis = r.mods.some(function (m) { return off.indexOf(m.id) < 0; }), adm = r.mods.every(function (m) { return m.admin; }), p = r.mods[0].perm;
        var who = adm ? '<span class="sec-p mute">🔒 ' + L('المدير', 'Gérant') + '</span>' : p && typeof PERM_INFO !== 'undefined' && PERM_INFO[p] ? '<span class="sec-p ok">' + PERM_INFO[p][0] + ' ' + esc(L(PERM_INFO[p][1][0], PERM_INFO[p][1][1])) + '</span>' : (p ? '<span class="sec-p">' + esc(p) + '</span>' : '');
        return '<div class="ctl7-r' + (vis || adm ? '' : ' hid') + '"><span class="ctl7-i">' + (i + 1) + '</span>'
          + '<span class="ctl7-n"><i>' + r.icon + '</i><b>' + esc(r.title) + (r.mods.length > 1 ? ' <small class="muted">(' + r.mods.length + ')</small>' : '') + '</b></span>'
          + '<span class="ctl7-g">' + esc(ctl7Grp(r.mods[0])) + '</span><span>' + who + '</span>'
          + '<span>' + (adm ? '' : '<label class="ctl7-sw" title="' + L('يبان للموظفين', 'Visible pour les agents') + '"><input type="checkbox" data-inp="ctl-vis" data-k="' + esc(r.key) + '"' + (vis ? ' checked' : '') + '><i><b></b></i></label>') + '</span>'
          + '<span class="ctl7-mv"><button class="btn sm ic" data-act="ctl-up" data-k="' + esc(r.key) + '" data-d="-1"' + (i ? '' : ' disabled') + ' aria-label="up">▲</button><button class="btn sm ic" data-act="ctl-up" data-k="' + esc(r.key) + '" data-d="1"' + (i < rows.length - 1 ? '' : ' disabled') + ' aria-label="down">▼</button></span></div>';
      }).join('') + '</div></section>';
};
/* الزر كيبدّل الشكل ديال السطر فالحين (الحفظ هو نفسو) */
document.addEventListener('change', function (e) { var t = e.target; if (t && t.matches && t.matches('.ctl7-sw input')) { var r = t.closest('.ctl7-r'); if (r) r.classList.toggle('hid', !t.checked); } }, true);

/* الموظفون */
ctlUsersHTML = function () {
  var users = Users.list(), ini = function (n) { return esc(String(n || '?').trim().slice(0, 1).toUpperCase()); };
  return '<div class="ctl7-2"><section class="sec-box"><div class="sec-bh"><span>👥</span><b>' + L('الموظفون', 'Agents') + '</b><span class="sp"></span><small>' + users.length + '</small></div>'
    + '<label class="ctl7-opt"><span class="ctl7-sw"><input type="checkbox" data-inp="ctl-all"' + (Meta.get('agentsSeeAll', false) ? ' checked' : '') + '><i><b></b></i></span><span>' + L('الموظف يرى كل الزبناء (ماشي غير المسندين ليه)', 'L\'agent voit tous les clients') + '</span></label>'
    + (users.length ? '<div class="ctl7-us">' + users.map(function (u) {
        var n = Contacts.list.filter(function (c) { return !c.deleted && c.agent === u.name; }).length;
        var todayDmy = new Date().toLocaleDateString('fr-FR'), opsToday = 0, callsToday = 0;
        try { var hAll = JSON.parse(localStorage.getItem('eurv102_h') || '[]') || []; opsToday = hAll.filter(function (h) { return h && h.date === todayDmy && h.user === u.name; }).length; } catch (e) { }
        Contacts.list.forEach(function (c) { if (!c.deleted) (c.callHistory || []).forEach(function (ch) { if (sameDay(ch.date) && ch.user === u.name) callsToday++; }); });
        return '<div class="ctl7-u"><span class="ctl7-av">' + ini(u.name) + '</span><div><b>' + esc(u.name) + '</b><small class="ltr">' + esc(u.email) + '</small></div><span class="sp"></span>'
          + '<span class="sec-p ' + (u.role === 'admin' ? 'warn' : 'mute') + '">' + (u.role === 'admin' ? '★ ' + L('مدير', 'Admin') : L('موظف', 'Agent')) + '</span><span class="sec-p blue">' + n + ' ' + L('زبون', 'clients') + '</span>'
          + (opsToday || callsToday ? '<span class="sec-p ok" title="' + L('نشاط اليوم', 'Activité du jour') + '">🧮 ' + opsToday + ' · 📞 ' + callsToday + '</span>' : '')
          + '<button class="btn sm ic red-o" data-act="u-del" data-e="' + esc(u.email) + '" title="' + L('حذف', 'Supprimer') + '">✕</button></div>'; }).join('') + '</div>'
      : '<div class="empty">' + L('ما زال ما زدتي حتى موظف', 'Aucun agent ajouté') + '</div>')
    + '<button class="btn wide" data-act="u-assign">👥 ' + L('إسناد الزبناء المعروضين فالتجديد لموظف', 'Affecter les clients affichés') + '</button></section>'
    + '<section class="sec-box"><div class="sec-bh"><span>➕</span><b>' + L('إضافة / تحديث موظف', 'Ajouter / mettre à jour') + '</b></div>'
    + '<div class="form u-form"><label class="f"><span>' + L('بريد الموظف (حسابه في Firebase)', 'Email de l\'agent') + '</span><input id="u-email" type="email" dir="ltr"></label>'
      + '<label class="f"><span>' + L('الاسم الظاهر', 'Nom affiché') + '</span><input id="u-name"></label>'
      + '<label class="f"><span>' + L('الدور', 'Rôle') + '</span><select id="u-role" class="inp"><option value="agent">' + L('موظف', 'Agent') + '</option><option value="admin">' + L('مدير', 'Administrateur') + '</option></select></label></div>'
    + '<button class="btn pri wide" data-act="u-add">➕ ' + L('إضافة / تحديث', 'Ajouter / mettre à jour') + '</button>'
    + '<div class="hint">' + L('الحساب نفسه (البريد وكلمة السر) كيتصاوب فـ Firebase ← Authentication. الموظف الجديد كيبدا بلا صلاحيات: حددها فـ «🛡️ الصلاحيات».', 'Le compte se crée dans Firebase ← Authentication. Un nouvel agent commence sans droits.') + '</div></section></div>';
};

/* الرأس والتبويبات: كنبدلو الشكل من بعد الرسم (نفس الأزرار) */
App.on('login', function () {
  var m = App.mod('control'); if (!m || m._ctl7) return; m._ctl7 = 1;
  var r = m.render;
  m.render = function (el) {
    r.apply(this, arguments);
    var pg = el.querySelector('.ctl6'); if (!pg) return; pg.classList.add('ctl7', 'sec7');
    var h = pg.querySelector('.ctl-h');
    if (h) h.outerHTML = '<div class="sec-hd"><span class="sec-hic">' + (typeof secI === 'function' ? secI('sliders') : '🎛️') + '</span><div><h1>' + L('لوحة التحكم', 'Tableau de contrôle') + '</h1><small>' + L('الأقسام، القفل، الصلاحيات، الموظفون، Google Sheets والإعدادات', 'Sections, verrouillage, droits, agents, Google Sheets et paramètres') + '</small></div><span class="sp"></span>'
      + (App.mod('sec') ? '<button class="btn" data-act="nav" data-id="sec">🛡️ ' + L('مركز الأمان', 'Sécurité') + '</button>' : '') + '<span class="sec-ver ltr">v' + esc(App.version) + '</span></div>';
    var t = pg.querySelector('.ctl-tabs'); if (t) { t.className = 'ctl7-tabs'; Array.prototype.forEach.call(t.children, function (b) { b.className = b.className.replace('chip', 'ctl7-tab'); }); }
    var lk = pg.querySelector('#ctl-body > .lk7-card'); if (lk) { var w = document.createElement('div'); w.className = 'ctl7-2'; lk.parentNode.insertBefore(w, lk); w.appendChild(lk); var hp = pg.querySelector('#ctl-body > .lk7-help'); if (hp) w.appendChild(hp); }
  };
});
