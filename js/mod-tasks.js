/* ══════════════════════════════════════════════════════════
   RenewPro v4 — mod-tasks.js   (المهام والتقويم)
   • مهام مشتركة بين كل الموظفين (Firestore: tasks) — من أضافها، لمن هي، من أنجزها.
   • تقويم يوم / أسبوع / شهر يجمع كل مواعيد البرنامج:
       المهام · مواعيد متابعة الزبائن · وعود دفع الديون · آخر أجل الإلغاء (10 أيام) في الحاسبة · تواريخ الانتهاء
   • تذكير بإشعار Windows في ساعة المهمة — يكفي أن يبقى البرنامج مفتوحاً ومصغّراً.
   لا يغيّر شيئاً في الأقسام الأخرى: يقرأ بياناتها فقط.
══════════════════════════════════════════════════════════ */
'use strict';

var Tasks = { list: [], ready: false, denied: false, unsub: null, view: 'day', day: null, mine: false,
  show: { task: 1, follow: 1, debt: 1, cancel: 1, exp: 1 } };
(function () { try { var s = JSON.parse(localStorage.getItem('rp4_tasks_ui') || 'null'); if (s) { Tasks.view = s.view || 'day'; Tasks.mine = !!s.mine; if (s.show) Tasks.show = s.show; } } catch (e) { } })();
function tasksSaveUI() { try { localStorage.setItem('rp4_tasks_ui', JSON.stringify({ view: Tasks.view, mine: Tasks.mine, show: Tasks.show })); } catch (e) { } }
Tasks.col = function () { return FB.db.collection('tasks'); };
Tasks.start = function () {
  if (Tasks.unsub || !FB.db) return;
  Tasks.unsub = Tasks.col().onSnapshot(function (snap) {
    var a = []; snap.forEach(function (d) { var t = d.data() || {}; t.id = d.id; a.push(t); });
    Tasks.list = a; Tasks.ready = true; Tasks.denied = false; App.refresh(); taskTick();
  }, function (e) { console.warn('tasks', e); Tasks.denied = true; Tasks.ready = true; App.refresh(); });
};
App.on('login', function () { Tasks.day = todayISO(); Tasks.start(); notifyStart(); });
App.on('logout', function () { if (Tasks.unsub) { try { Tasks.unsub(); } catch (e) { } } Tasks.unsub = null; Tasks.list = []; Tasks.ready = false; });

function meEmail() { return App.user ? App.user.email : ''; }
function userName(email) { if (!email) return L('الجميع', 'Tous'); var u = (typeof Users !== 'undefined' && Users.map) ? Users.map[uKey(email)] : null; return (u && u.name) || String(email).split('@')[0]; }
function taskForMe(t) { return !t.assignee || t.assignee === meEmail(); }
function taskVisible(t) { return !Tasks.mine || taskForMe(t) || t.byEmail === meEmail(); }

/* ───────── كل مواعيد يوم واحد (أو مجال) من كل الأقسام ───────── */
function calEvents(from, to) {
  var ev = [], inR = function (d) { return d && d >= from && d <= to; };
  if (Tasks.show.task) Tasks.list.forEach(function (t) {
    if (!inR(t.date) || !taskVisible(t)) return;
    ev.push({ kind: 'task', date: t.date, time: t.time || '', title: t.title, done: !!t.done, id: t.id, t: t });
  });
  var cs = (typeof renewBase === 'function' && App.can('renew')) ? renewBase() : [];
  if (Tasks.show.follow) cs.forEach(function (c) {
    if (c.followDate && !c.renewed && inR(c.followDate)) ev.push({ kind: 'follow', date: c.followDate, time: '', title: c.name || '—', cid: c.id });
  });
  if (Tasks.show.exp) {
    var byDay = {}; cs.forEach(function (c) { if (c.dateE && !c.renewed && inR(c.dateE)) byDay[c.dateE] = (byDay[c.dateE] || 0) + 1; });
    Object.keys(byDay).forEach(function (d) { ev.push({ kind: 'exp', date: d, time: '', title: byDay[d] + ' ' + L('عقد ينتهي', 'échéance(s)'), n: byDay[d] }); });
  }
  if (Tasks.show.debt && typeof debtGroups === 'function' && typeof debtOn === 'function' && debtOn() && Debts.rows.length) {
    try { debtGroups().forEach(function (g) { if (g.promise && g.total > 0.005 && inR(g.promise)) ev.push({ kind: 'debt', date: g.promise, time: '', title: (g.name || '—') + ' · ' + money(g.total) + ' DH', gid: g.gid }); }); } catch (e) { }
  }
  if (Tasks.show.cancel && App.can('calc')) {
    var rt = []; try { rt = JSON.parse(localStorage.getItem('eurv102_renewals') || '[]') || []; } catch (e) { }
    rt.forEach(function (c) { if (!c || c.status === 'done' || !c.requestDate) return; var d = addDays(c.requestDate, 10);
      if (inR(d)) ev.push({ kind: 'cancel', date: d, time: '', title: c.name || '—' }); });
  }
  var ord = { task: 1, follow: 2, debt: 3, cancel: 4, exp: 5 };
  return ev.sort(function (a, b) { return String(a.date).localeCompare(b.date) || (!a.time - !b.time) || String(a.time).localeCompare(b.time) || ord[a.kind] - ord[b.kind]; });
}
var EV_IC = { task: '✅', follow: '⏰', debt: '🤝', cancel: '⏳', exp: '📅' };
function evLabel(k) { return { task: L('المهام', 'Tâches'), follow: L('متابعة الزبائن', 'Rappels clients'), debt: L('وعود الدين', 'Promesses'), cancel: L('أجل الإلغاء', 'Délai annulation'), exp: L('الانتهاء', 'Échéances') }[k]; }
function overdueTasks() { var td = todayISO(); return Tasks.list.filter(function (t) { return !t.done && t.date && t.date < td && taskVisible(t); }).sort(function (a, b) { return a.date.localeCompare(b.date); }); }

function evHTML(e, compact) {
  var att = e.kind === 'task' ? 'data-act="tk-open" data-id="' + esc(e.id) + '"' : e.kind === 'follow' ? 'data-act="tk-cust" data-id="' + esc(e.cid) + '"'
    : e.kind === 'debt' ? 'data-act="tk-debt" data-id="' + esc(e.gid) + '"' : e.kind === 'cancel' ? 'data-act="tk-cancel"' : 'data-act="tk-exp" data-d="' + esc(e.date) + '"';
  if (compact) return '<div class="ev ev-' + e.kind + (e.done ? ' done' : '') + '" ' + att + '>' + (e.time ? '<span class="ltr">' + esc(e.time) + '</span> ' : '') + esc(e.title) + '</div>';
  var t = e.t, who = '';
  if (t) who = '<small>' + (t.assignee ? '👤 ' + esc(userName(t.assignee)) : '👥 ' + L('للجميع', 'Pour tous')) + ' · ' + L('من ', 'par ') + esc(t.by || '') + (t.done ? ' · ✓ ' + esc(t.doneBy || '') : '') + '</small>';
  return '<div class="ev-row ev-' + e.kind + (e.done ? ' done' : '') + '">'
    + (e.kind === 'task' ? '<button class="tk-chk' + (e.done ? ' on' : '') + '" data-act="tk-done" data-id="' + esc(e.id) + '">' + (e.done ? '✓' : '') + '</button>' : '<span class="ev-ic">' + EV_IC[e.kind] + '</span>')
    + '<div class="ev-m" ' + att + '><b>' + esc(e.title) + '</b>' + who + (t && t.note ? '<small class="muted">' + esc(t.note) + '</small>' : '') + '</div>'
    + (e.time ? '<span class="ev-t ltr">' + esc(e.time) + '</span>' : '') + '</div>';
}

/* ───────── الصفحة ───────── */
var DAY_AR = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'], DAY_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
var MON_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'],
    MON_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
function dow(iso) { var d = parseISO(iso); return (d.getDay() + 6) % 7; }            // 0 = الإثنين
function dayName(iso) { var i = dow(iso); return L(DAY_AR[i], DAY_FR[i]); }
function weekStart(iso) { return addDays(iso, -dow(iso)); }
function monthStart(iso) { return iso.slice(0, 8) + '01'; }
function monthName(iso) { var m = +iso.slice(5, 7) - 1; return L(MON_AR[m], MON_FR[m]) + ' ' + iso.slice(0, 4); }

function renderTasks(el) {
  if (!Tasks.day) Tasks.day = todayISO();
  var d = Tasks.day, td = todayISO(), body = '';
  if (Tasks.view === 'day') {
    var ev = calEvents(d, d), od = d === td ? overdueTasks() : [];
    body = (od.length ? '<div class="sec-t red-t">⚠️ ' + L('مهام متأخرة', 'Tâches en retard') + ' (' + od.length + ')</div><div class="evs">' + od.map(function (t) {
          return evHTML({ kind: 'task', date: t.date, time: t.time, title: t.title + ' · ' + fmtD(t.date).slice(0, 5), done: false, id: t.id, t: t }); }).join('') + '</div>' : '')
      + (ev.length ? '<div class="evs">' + ev.map(function (e) { return evHTML(e); }).join('') + '</div>' : '<div class="empty"><span>' + L('لا شيء في هذا اليوم', 'Rien ce jour') + '</span></div>');
  } else if (Tasks.view === 'week') {
    var ws = weekStart(d), all = calEvents(ws, addDays(ws, 6));
    body = '<div class="wk">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { var x = addDays(ws, i), e = all.filter(function (v) { return v.date === x; });
      return '<div class="wk-d' + (x === td ? ' today' : '') + '"><div class="wk-h" data-act="tk-day" data-d="' + x + '">' + dayName(x) + ' <b class="ltr">' + fmtD(x).slice(0, 5) + '</b></div>'
        + e.map(function (v) { return evHTML(v, true); }).join('') + '</div>'; }).join('') + '</div>';
  } else {
    var ms = monthStart(d), gs = weekStart(ms), mAll = calEvents(gs, addDays(gs, 41));
    body = '<div class="mo">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<div class="mo-h">' + L(['إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت', 'أحد'][i], DAY_FR[i]) + '</div>'; }).join('')
      + Array.apply(null, Array(42)).map(function (_, i) { var x = addDays(gs, i), e = mAll.filter(function (v) { return v.date === x; }), out = x.slice(0, 7) !== d.slice(0, 7);
        return '<div class="mo-d' + (out ? ' out' : '') + (x === td ? ' today' : '') + '" data-act="tk-day" data-d="' + x + '"><span class="mo-n">' + (+x.slice(8)) + '</span>'
          + e.slice(0, 3).map(function (v) { return '<i class="dot ev-' + v.kind + (v.done ? ' done' : '') + '">' + EV_IC[v.kind] + ' ' + esc(v.title) + '</i>'; }).join('')
          + (e.length > 3 ? '<i class="more">+' + (e.length - 3) + '</i>' : '') + '</div>'; }).join('') + '</div>';
  }
  var title = Tasks.view === 'month' ? monthName(d) : Tasks.view === 'week' ? fmtD(weekStart(d)).slice(0, 5) + ' ← ' + fmtD(addDays(weekStart(d), 6)).slice(0, 5) : dayName(d) + ' ' + fmtD(d);
  var perm = ('Notification' in window) ? Notification.permission : 'na';
  el.innerHTML = '<div class="page tk-page">'
    + (Tasks.denied ? '<div class="box red">⚠️ ' + L('المهام غير مفعّلة في السحابة: انشر قواعد Firestore الجديدة (فيها tasks). انظر الإعدادات.', 'Tâches non activées : publiez les nouvelles règles Firestore (tasks).') + '</div>' : '')
    + (perm === 'default' || perm === 'denied' ? '<div class="box">🔔 ' + (perm === 'denied' ? L('الإشعارات ممنوعة في المتصفح. فعّلها من القفل 🔒 بجانب الرابط.', 'Notifications bloquées : autorisez-les via le cadenas 🔒.')
        : L('فعّل الإشعارات باش يوصلك التذكير فساعة المهمة.', 'Activez les notifications pour les rappels.') + ' <button class="btn sm pri" data-act="tk-perm">' + L('تفعيل', 'Activer') + '</button>')
        + '<div class="hint">' + L('خلّي البرنامج مفتوح ومصغّر (ما تسدّوش) باش تبقى التذكيرات خدامة.', 'Laissez l\'application ouverte (réduite) pour recevoir les rappels.') + '</div></div>' : '')
    + '<div class="bar tk-bar"><button class="btn pri" data-act="tk-new">➕ ' + L('مهمة', 'Tâche') + '</button>'
      + '<div class="seg">' + [['day', L('يوم', 'Jour')], ['week', L('أسبوع', 'Semaine')], ['month', L('شهر', 'Mois')]].map(function (v) { return '<button class="' + (Tasks.view === v[0] ? 'on' : '') + '" data-act="tk-view" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div></div>'
    + '<div class="bar tk-nav"><button class="btn ic" data-act="tk-move" data-n="-1">›</button><button class="btn" data-act="tk-today">' + L('اليوم', 'Aujourd\'hui') + '</button>'
      + '<b class="tk-title">' + esc(title) + '</b><button class="btn ic" data-act="tk-move" data-n="1">‹</button></div>'
    + '<div class="chips">' + '<button class="chip' + (Tasks.mine ? ' on' : '') + '" data-act="tk-mine">👤 ' + L('مهامي', 'Mes tâches') + '</button>'
      + Object.keys(EV_IC).map(function (k) { return '<button class="chip' + (Tasks.show[k] ? ' on' : '') + '" data-act="tk-src" data-k="' + k + '">' + EV_IC[k] + ' ' + evLabel(k) + '</button>'; }).join('') + '</div>'
    + body + '</div>';
}
App.act('tk-view', function (el) { Tasks.view = el.dataset.v; tasksSaveUI(); App.render(); });
App.act('tk-today', function () { Tasks.day = todayISO(); App.render(); });
App.act('tk-day', function (el) { Tasks.day = el.dataset.d; Tasks.view = 'day'; tasksSaveUI(); App.render(); });
App.act('tk-move', function (el) { var n = +el.dataset.n, d = Tasks.day || todayISO();
  if (Tasks.view === 'day') d = addDays(d, n); else if (Tasks.view === 'week') d = addDays(d, 7 * n);
  else { var y = +d.slice(0, 4), m = +d.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; d = y + '-' + pad2(m + 1) + '-01'; }
  Tasks.day = d; App.render(); });
App.act('tk-mine', function () { Tasks.mine = !Tasks.mine; tasksSaveUI(); App.render(); });
App.act('tk-src', function (el) { var k = el.dataset.k; Tasks.show[k] = Tasks.show[k] ? 0 : 1; tasksSaveUI(); App.render(); });
App.act('tk-cust', function (el) { App.go('renew'); Sheet.open(el.dataset.id); });
App.act('tk-debt', function (el) { App.go('debts'); openDebtSheet({ gid: el.dataset.id }); });
App.act('tk-cancel', function () { App.go('c-renewals'); });
App.act('tk-exp', function (el) { var d = el.dataset.d; Renew.from = d; Renew.to = d; Renew.filter = 'range'; App.go('renew'); });
App.on('go.tasks', function () { Tasks.day = todayISO(); Tasks.view = 'day'; App.render(); });

/* ───────── إضافة / تعديل مهمة ───────── */
function taskForm(t) {
  t = t || { date: Tasks.day || todayISO(), time: '', assignee: '', title: '', note: '' };
  var us = (typeof Users !== 'undefined' ? Users.list() : []).slice(), me = meEmail();
  if (me && !us.some(function (u) { return u.email === me; })) us.unshift({ email: me, name: App.user.name });
  var canDel = t.id && (App.user.admin || t.byEmail === me);
  Modal.open(Modal.head(t.id ? '✏️ ' + L('تعديل المهمة', 'Modifier la tâche') : '➕ ' + L('مهمة جديدة', 'Nouvelle tâche'))
    + '<label class="f"><span>' + L('المهمة', 'Tâche') + '</span><input id="tk-title" value="' + esc(t.title) + '" placeholder="' + L('مثلاً: نعيط لفلان، نمشي للبنك…', 'Ex. : appeler X, aller à la banque…') + '"></label>'
    + '<div class="grid2" style="margin-top:8px"><label class="f"><span>' + L('النهار', 'Date') + '</span><input id="tk-date" type="date" dir="ltr" value="' + esc(t.date || '') + '"></label>'
      + '<label class="f"><span>' + L('الساعة (للتذكير)', 'Heure (rappel)') + '</span><input id="tk-time" type="time" dir="ltr" value="' + esc(t.time || '') + '"></label></div>'
    + '<label class="f inline"><span>' + L('لمن', 'Pour') + '</span><select id="tk-who" class="inp"><option value="">👥 ' + L('الجميع', 'Tous') + '</option>'
      + us.map(function (u) { return '<option value="' + esc(u.email) + '"' + (t.assignee === u.email ? ' selected' : '') + '>👤 ' + esc(u.name || u.email) + (u.email === me ? ' (' + L('أنا', 'moi') + ')' : '') + '</option>'; }).join('') + '</select></label>'
    + '<label class="f inline"><span>' + L('ملاحظة', 'Note') + '</span><textarea id="tk-note" rows="2">' + esc(t.note || '') + '</textarea></label>'
    + '<button class="btn pri wide" data-act="tk-save" data-id="' + esc(t.id || '') + '">💾 ' + L('حفظ', 'Enregistrer') + '</button>'
    + (t.id ? '<button class="btn wide" data-act="tk-done" data-id="' + esc(t.id) + '">' + (t.done ? '↩ ' + L('إرجاعها غير منجزة', 'Marquer non faite') : '✓ ' + L('تمت', 'Faite')) + '</button>' : '')
    + (canDel ? '<button class="btn danger wide" data-act="tk-del" data-id="' + esc(t.id) + '">🗑️ ' + L('حذف', 'Supprimer') + '</button>' : '')
    + (t.id ? '<div class="hint">' + L('أضافها: ', 'Ajoutée par : ') + esc(t.by || '') + (t.done ? ' · ' + L('أنجزها: ', 'Faite par : ') + esc(t.doneBy || '') : '') + '</div>' : ''));
  setTimeout(function () { var i = $('tk-title'); if (i && !t.id) i.focus(); }, 50);
}
App.act('tk-new', function () { taskForm(); });
App.act('tk-open', function (el) { var t = Tasks.list.filter(function (x) { return x.id === el.dataset.id; })[0]; if (t) taskForm(t); });
App.act('tk-save', function (el) {
  var title = $('tk-title').value.trim(); if (!title) { $('tk-title').focus(); return; }
  var who = $('tk-who').value, data = { title: title, date: $('tk-date').value || todayISO(), time: $('tk-time').value || '', assignee: who, assigneeName: who ? userName(who) : '', note: $('tk-note').value.trim() };
  var id = el.dataset.id, p;
  if (id) { var old = Tasks.list.filter(function (x) { return x.id === id; })[0] || {}; if (old.date !== data.date || old.time !== data.time) data.notified = ''; p = Tasks.col().doc(id).update(data); }
  else p = Tasks.col().add(Object.assign(data, { by: App.user.name, byEmail: meEmail(), created: new Date().toISOString(), done: false }));
  Modal.close(); Tasks.day = data.date;
  p.then(function () { toast('💾 ' + L('حُفظت المهمة', 'Tâche enregistrée')); }).catch(syncErr);
});
App.act('tk-done', function (el) {
  var t = Tasks.list.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!t) return;
  var on = !t.done; Modal.close();
  Tasks.col().doc(t.id).update(on ? { done: true, doneBy: App.user.name, doneAt: new Date().toISOString() } : { done: false, doneBy: '', doneAt: '' }).catch(syncErr);
});
App.act('tk-del', function (el) {
  if (!confirm(L('حذف هذه المهمة؟', 'Supprimer cette tâche ?'))) return;
  Modal.close(); Tasks.col().doc(el.dataset.id).delete().catch(syncErr);
});

/* ───────── التذكير: إشعار Windows في ساعة المهمة (البرنامج مفتوح أو مصغّر) ───────── */
var NOTI_KEY = 'rp4_notified';
function notiSeen() { try { return JSON.parse(localStorage.getItem(NOTI_KEY) || '{}') || {}; } catch (e) { return {}; } }
function notiMark(k) { var s = notiSeen(), lim = addDays(todayISO(), -3); s[k] = todayISO(); Object.keys(s).forEach(function (x) { if (s[x] < lim) delete s[x]; }); try { localStorage.setItem(NOTI_KEY, JSON.stringify(s)); } catch (e) { } }
function notify(title, body, tag, onClick) {
  toast('🔔 ' + title + (body ? ' — ' + body : ''));
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { var n = new Notification(title, { body: body || '', tag: tag, icon: 'icons/icon-192.png', requireInteraction: true });
    n.onclick = function () { try { window.focus(); } catch (e) { } if (onClick) onClick(); n.close(); }; } catch (e) { }
}
function taskTick() {
  if (!App.user || !Tasks.ready || !App.can('tasks')) return;
  var now = new Date(), td = todayISO(), hm = pad2(now.getHours()) + ':' + pad2(now.getMinutes()), seen = notiSeen();
  Tasks.list.forEach(function (t) {
    if (t.done || !taskForMe(t) || t.date !== td || !t.time || t.time > hm) return;
    var k = t.id + '@' + t.date + 'T' + t.time; if (seen[k]) return;
    var late = (now - new Date(t.date + 'T' + t.time)) / 60000; notiMark(k);
    if (late > 180) return;                                    // فات عليها أكثر من 3 ساعات (البرنامج كان مسدود): تظهر في «المتأخرة» فقط
    notify('⏰ ' + t.title, (t.time ? t.time + ' · ' : '') + (t.note || ''), 'tk-' + t.id, function () { App.go('tasks'); taskForm(t); });
  });
  /* ملخص الصباح مرة في اليوم */
  var sk = 'sum@' + td;
  if (!seen[sk] && now.getHours() >= 8) {
    notiMark(sk);
    var n = Tasks.list.filter(function (t) { return !t.done && taskForMe(t) && t.date && t.date <= td; }).length;
    var f = (typeof renewBase === 'function' && App.can('renew')) ? renewBase().filter(function (c) { return c.followDate === td && !c.renewed; }).length : 0;
    if (n || f) notify('📅 ' + L('برنامج اليوم', 'Programme du jour'), (n ? n + ' ' + L('مهمة', 'tâche(s)') : '') + (n && f ? ' · ' : '') + (f ? f + ' ' + L('متابعة زبون', 'rappel(s) client') : ''), 'tk-sum', function () { App.go('tasks'); });
  }
}
var notiTimer = null;
function notifyStart() { if (notiTimer) return; notiTimer = setInterval(taskTick, 30000); setTimeout(taskTick, 5000); }
App.act('tk-perm', function () { if (!('Notification' in window)) return;
  Notification.requestPermission().then(function (p) { if (p === 'granted') notify('✅ ' + L('الإشعارات مفعّلة', 'Notifications activées'), L('غادي يوصلك التذكير فساعة كل مهمة.', 'Vous recevrez un rappel à l\'heure de chaque tâche.'), 'tk-test'); App.render(); }); });

/* ───────── لوحة الرئيسية والشارة ───────── */
function tasksDueCount() { var td = todayISO(); return Tasks.list.filter(function (t) { return !t.done && taskForMe(t) && t.date && t.date <= td; }).length; }
App.hook('dash.cards', function () { if (!Tasks.ready || Tasks.denied || !App.can('tasks')) return [];
  var td = todayISO(), today = Tasks.list.filter(function (t) { return !t.done && taskForMe(t) && t.date === td; }).length, late = overdueTasks().filter(taskForMe).length;
  return [{ ic: '📅', label: L('مهام اليوم', 'Tâches du jour'), value: today, cls: late ? 'red' : today ? 'amber' : '', go: 'tasks:today', mod: 'tasks', sub: late ? L('متأخرة: ', 'en retard : ') + late : '' }]; });
App.register({ id: 'tasks', perm: 'tasks', icon: '📅', title: ['المهام', 'Tâches'], order: 15, render: renderTasks,
  badge: function () { var n = tasksDueCount(); return n ? String(n) : ''; } });
