/* ══════════════════════════════════════════════════════════
   RenewPro 7 Pro — v7-home.js   (الرئيسية الجديدة)
   نفس الأرقام ديال الرئيسية القديمة، مرتبة: الأرقام الكبار، ثم «شنو خاصك تدير اليوم»
   (من جميع الأقسام عبر dash.cards)، ثم عمل اليوم والأدوات.
══════════════════════════════════════════════════════════ */
'use strict';
(function () {
  var dashMod = App.mod('dash'); if (!dashMod) return;
  var oldRender = dashMod.render;
  var RANK = { red: 0, amber: 1, green: 3 };
  function hello() { var h = new Date().getHours(); return h < 12 ? L('صباح الخير', 'Bonjour') : h < 18 ? L('نهارك سعيد', 'Bon après-midi') : L('مساء الخير', 'Bonsoir'); }
  function dayName() {
    var d = new Date(), ar = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], fr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return (App.lang === 'fr' ? fr : ar)[d.getDay()] + ' ' + fmtD(todayISO());
  }
  function tile(o) {
    return '<button class="h7-k ' + (o.cls || '') + '" data-act="dash-go" data-go="' + esc(o.go) + '"><span>' + esc(o.label) + '</span><b>' + o.value + '</b>' + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</button>';
  }
  function todoRow(o) {
    var act = o.go ? ' data-act="dash-go" data-go="' + esc(o.go) + '"' : (o.mod ? ' data-act="nav" data-id="' + esc(o.mod) + '"' : '');
    return '<button class="h7-todo ' + (o.cls || '') + '"' + act + '><i></i><span class="tx"><b>' + esc(o.label) + '</b>' + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</span><span class="n">' + o.value + '</span><span class="ar">‹</span></button>';
  }
  function hasVal(v) { if (typeof v === 'number') return v > 0; var t = String(v == null ? '' : v).replace(/<[^>]+>/g, '').replace(/[\s ]/g, ''); return !!t && !/^0+(,0+)?$/.test(t); }
  function qa(act, ic, ar, fr, cls) { return '<button class="btn ' + (cls || '') + '" data-act="' + act + '">' + (ic || '') + esc(L(ar, fr)) + '</button>'; }

  dashMod.render = function (el) {
    if (!App.can('renew') || !Contacts.ready) return oldRender(el);
    var live = renewBase().filter(function (c) { return !isStale(c); }), todo = live.filter(function (c) { return !isOut(c); });
    var cnt = function (fn) { return todo.filter(fn).length; }, all = function (fn) { return live.filter(fn).length; }, dl = function (c) { return daysLeft(c.dateE); };
    var calls = todayCalls(), by = {}; calls.forEach(function (x) { by[x.h.result] = (by[x.h.result] || 0) + 1; });
    var handledToday = live.filter(function (c) { return c.handled && isToday(c.handled); }).length;
    var nExp = cnt(function (c) { return !c.renewed && dl(c) !== null && dl(c) < 0; }), nToday = cnt(function (c) { return !c.renewed && dl(c) === 0; });
    var n3 = cnt(function (c) { return !c.renewed && dl(c) !== null && dl(c) >= 0 && dl(c) <= 3; }), n7 = cnt(function (c) { return !c.renewed && dl(c) !== null && dl(c) >= 0 && dl(c) <= 7; });
    var nConf = all(confirmedDue), nConfAll = all(function (c) { return c.renewConfirmed && !c.renewed; }), nFollow = all(followDue);
    var canCalc = App.visibleMods().some(function (m) { return m.id === 'c-new7'; });

    /* «شنو خاصك تدير اليوم»: التجديد + جميع الأقسام، اللي فيها شي حاجة فقط، الأحمر أولاً */
    var items = [
      { label: L('متابعة اليوم (عاود الاتصال)', 'Rappels du jour'), value: nFollow, cls: nFollow ? 'amber' : '', go: 'renew:fdue' },
      { label: L('كيساليو خلال 3 أيام', 'Échéance sous 3 jours'), value: n3, cls: n3 ? 'amber' : '', go: 'renew:d3', sub: L('اليوم: ', 'auj. : ') + nToday },
      { label: L('منتهيين وما تجددوش', 'Expirés non renouvelés'), value: nExp, cls: 'red', go: 'renew:expired' }
    ].concat(App.runList('dash.cards')).filter(function (o) { return hasVal(o.value); });
    items.sort(function (a, b) { var ra = RANK[a.cls] != null ? RANK[a.cls] : 2, rb = RANK[b.cls] != null ? RANK[b.cls] : 2; return ra - rb; });

    var resKeys = ['ans', 'no', 'busy', 'later', 'wa', 'sms', 'off', 'bv', 'hz', 'dead'].filter(function (k) { return by[k]; });
    var adm = App.user.admin;
    var tool = function (act, ic, ar, fr) { return '<button data-act="' + act + '"><span>' + ic + '</span>' + esc(L(ar, fr)) + '</button>'; };

    el.innerHTML = '<div class="page"><div class="h7">'
      + rulesBoxHTML()
      + '<div class="h7-hd"><div><small>' + esc(dayName()) + (Meta.get('listName', '') ? ' · ' + esc(Meta.get('listName', '')) : '') + '</small><h1>' + esc(hello()) + '، ' + esc(App.user.name) + '</h1></div>'
        + '<div class="h7-qa">'
          + (canCalc ? qa('fab7', IC7.plus, 'عملية جديدة', 'Nouvelle opération', 'pri') : '')
          + ((canCalc || App.can('sin')) ? qa('pdf7-pick', '📄 ', 'PDF', 'PDF') : '')
          + qa('dash-session', IC7.phone, 'جلسة اتصال', 'Session d\'appels')
          + qa('r-range', '', 'حسب التاريخ', 'Par date', 'd-only')
          + (App.canUp() ? qa('r-import', IC7.upload, 'لائحة جديدة', 'Nouvelle liste', 'd-only') : '')
        + '</div></div>'
      + '<div class="h7-kpis">'
        + tile({ label: L('منتهي', 'Expirés'), value: nExp, cls: nExp ? 'red' : '', go: 'renew:expired', sub: L('خاصهم اتصال', 'à appeler') })
        + tile({ label: L('كيسالي اليوم', 'Échéance aujourd\'hui'), value: nToday, cls: nToday ? 'amber' : '', go: 'renew:today' })
        + tile({ label: L('خلال 7 أيام', 'Sous 7 jours'), value: n7, go: 'renew:d7', sub: L('خلال 3 أيام: ', 'sous 3 j : ') + n3 })
        + tile({ label: L('مؤكد، حان موعده', 'Confirmés à relancer'), value: nConf, cls: 'green', go: 'renew:confirmed', sub: L('من ' + nConfAll + ' مؤكد', 'sur ' + nConfAll + ' confirmés') })
      + '</div>'
      + '<div class="h7-cols">'
        + '<section class="h7-box"><div class="h7-bh">' + L('شنو خاصك تدير اليوم', 'À faire aujourd\'hui') + '<span class="sp"></span><small>' + items.length + '</small></div>'
          + (items.length ? items.map(todoRow).join('') : '<div class="h7-none">' + L('ما كاين والو مستعجل اليوم.', 'Rien d\'urgent aujourd\'hui.') + '</div>') + '</section>'
        + '<div style="display:flex;flex-direction:column;gap:16px;min-width:0">'
          + '<section class="h7-box"><div class="h7-bh">' + L('عمل اليوم', 'Activité du jour') + '<span class="sp"></span>'
            + '<button class="btn sm" data-act="t-today" title="' + L('ملاحظات اليوم (Excel)', 'Notes du jour (Excel)') + '">Excel</button><button class="btn sm" data-act="t-print">' + L('طباعة', 'Imprimer') + '</button></div>'
            + '<div class="h7-day"><div class="kv"><span>' + L('مكالمات ورسائل', 'Appels et messages') + '</span><b>' + calls.length + '</b></div>'
            + '<div class="kv"><span>' + L('زبناء تعاملتي معاهم', 'Clients traités') + '</span><b>' + handledToday + '</b></div>'
            + '<div class="kv"><span>' + L('تم الاتصال بهم (اللائحة)', 'Contactés (liste)') + '</span><b>' + (live.length - todo.length) + ' / ' + live.length + '</b></div>'
            + (resKeys.length ? '<div class="res-line">' + resKeys.map(function (k) { return '<span style="--c:' + CS[k].color + '">' + csLabel(k) + ' <b>' + by[k] + '</b></span>'; }).join('') + '</div>' : '')
            + agentStatsHTML(calls) + '</div></section>'
          + '<section class="h7-box"><div class="h7-bh">' + L('الأدوات', 'Outils') + '</div><div class="h7-tools">'
            + tool('h-open', '✔', 'تم الاتصال بهم', 'Contactés')
            + tool('b-start', '📨', 'إرسال جماعي', 'Envoi groupé')
            + tool('t-export-notes', '📝', 'تصدير الملاحظات', 'Exporter notes')
            + tool('t-import-notes', '📝', 'استيراد ملاحظات', 'Importer notes')
            + tool('t-trash', '🗑️', 'السلة', 'Corbeille')
            + (App.canUp() && typeof debtOn === 'function' && debtOn() ? tool('d-import', '💰', 'ملف الديون', 'Fichier dettes') : '')
            + (adm ? tool('u-assign', '👥', 'إسناد الزبناء', 'Affecter') + tool('t-backup', '💾', 'نسخة احتياطية', 'Sauvegarde') : '')
          + '</div></section>'
        + '</div>'
      + '</div>'
    + '</div></div>';
  };
})();
