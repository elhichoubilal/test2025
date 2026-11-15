/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-wa.js   (💬 7.16: الواتساب فنافذة صغيرة والبرنامج كيبقى مفتوح)
   الحاسوب: web.whatsapp.com كيتحل فنافذة صغيرة على الجنب (نفس النافذة كتعاود تستعمل).
   التيليفون: wa.me كيحل تطبيق الواتساب بحال قبل.
   ملي ترجع للبرنامج: «صيفطتي؟» ← ✓ صيفطت (كيتسجل) · ✗ ما صيفطتش (ما كيتسجل والو) · 🔁 عاود حلها.
   التسجيل: نفس سجل المكالمات ديال الزبون (Contacts.pushCall، result 'wa') — بلا Collection جديدة وبلا خانات جديدة.
   السؤال كيبان غير فين كاين شي حاجة تتسجل (زبون التجديد، المتابعة إلا تعرف الزبون بالبوليصة/الماتريكول، الدين).
══════════════════════════════════════════════════════════ */
'use strict';
var WA = (function () {
  var P = null, poll = null, KEY = 'rp7_wa_pend';
  function isMob() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') || (window.matchMedia && matchMedia('(pointer:coarse)').matches && window.innerWidth < 1000); }
  function url(phone, text) {
    var p = phone ? phIntl(phone) : '';
    if (isMob()) return 'https://wa.me/' + p + (text ? '?text=' + encodeURIComponent(text) : '');
    return 'https://web.whatsapp.com/send?' + (p ? 'phone=' + p + '&' : '') + 'text=' + encodeURIComponent(text || '');
  }
  function ss(v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (v === null) sessionStorage.removeItem(KEY); else sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { return null; } }
  function asks(o) { return !!(o.cid || o.onYes); }

  /* فتح الواتساب */
  function open(phone, text, o) {
    o = o || {}; var u = url(phone, text), win = null;
    if (isMob()) win = window.open(u, '_blank');
    else {
      var W = 500, H = Math.min(800, (screen.availHeight || 800) - 60), X = (screen.availLeft || 0) + 16, Y = (screen.availTop || 0) + 24;
      win = window.open(u, 'rp7wa', 'popup=yes,width=' + W + ',height=' + H + ',left=' + X + ',top=' + Y);
      if (!win) win = window.open(u, '_blank');
      try { if (win) win.focus(); } catch (e) { }
    }
    if (!asks(o)) return;
    P = { phone: phone, text: text, o: o, win: win, t: Date.now(), away: false, asked: false };
    if (o.cid) ss({ cid: o.cid, label: o.label || '', phone: phone || '', name: o.name || '', t: P.t });
    banner();
    clearInterval(poll);
    if (win && !isMob()) poll = setInterval(function () { try { if (P && P.win && P.win.closed) { clearInterval(poll); ask(); } } catch (e) { } }, 600);
  }
  /* الشريط الصغير ملي الواتساب محلول */
  function banner() {
    var b = document.getElementById('wa7-ban'); if (!P) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'wa7-ban'; document.body.appendChild(b); }
    b.innerHTML = '<span>🟢 ' + L('الواتساب محلول مع ', 'WhatsApp ouvert avec ') + '<b>' + esc(P.o.name || ltrPh(P.phone)) + '</b>… ' + L('صيفط وسد النافذة', 'envoyez puis fermez la fenêtre') + '</span>'
      + '<button class="btn sm" data-act="wa7-ask">' + L('رجعت', 'Fait') + '</button>';
  }
  function ltrPh(p) { return p ? String(p) : ''; }
  /* السؤال */
  function ask() {
    if (!P || P.asked) return; P.asked = true; clearInterval(poll);
    var b = document.getElementById('wa7-ban'); if (b) b.remove();
    var q = document.getElementById('wa7-q'); if (!q) { q = document.createElement('div'); q.id = 'wa7-q'; document.body.appendChild(q); }
    q.innerHTML = '<div class="wa7-box" role="dialog"><b class="wa7-t">💬 ' + L('صيفطتي الرسالة لـ ', 'Message envoyé à ') + esc(P.o.name || '') + L('؟', ' ?') + '</b>'
      + '<div class="wa7-s">' + [P.o.label, P.phone ? '<span class="ltr">' + esc(P.phone) + '</span>' : ''].filter(Boolean).join(' · ') + '</div>'
      + '<div class="wa7-b"><button class="btn wa7-ok" data-act="wa7-yes">✓ ' + L('صيفطت', 'Envoyé') + '</button>'
      + '<button class="btn" data-act="wa7-no">✗ ' + L('ما صيفطتش', 'Pas envoyé') + '</button>'
      + (P.text != null ? '<button class="btn" data-act="wa7-again">🔁 ' + L('عاود حلها', 'Rouvrir') + '</button>' : '') + '</div></div>';
    q.classList.add('on');
    setTimeout(function () { var y = q.querySelector('.wa7-ok'); if (y) y.focus(); }, 50);
  }
  function closeQ() { var q = document.getElementById('wa7-q'); if (q) q.classList.remove('on'); }
  function logContact(cid, label, phone) {
    var c = Contacts.get(cid); if (!c) return null; var now = new Date().toISOString();
    Contacts.pushCall(cid, { date: now, result: 'wa', note: label || '', user: App.user.name, phone: phone || '' }, { waSent: now, followDate: Contacts.unset() });
    return c;
  }
  function yes() {
    var p = P; P = null; closeQ(); ss(null); if (!p) return;
    var c = p.o.cid ? logContact(p.o.cid, p.o.label, p.phone) : null;
    if (p.o.onYes) { try { p.o.onYes(); } catch (e) { console.error(e); } }
    toast('🟢 WhatsApp — ' + (p.o.name || (c && c.name) || '') + ' ✓');
  }
  function no() { var p = P; P = null; closeQ(); ss(null); if (p) toast(L('ما تسجل والو', 'Rien enregistré')); }
  function again() { var p = P; P = null; closeQ(); if (p) open(p.phone, p.text, p.o); }

  App.act('wa7-yes', yes); App.act('wa7-no', no); App.act('wa7-again', again); App.act('wa7-ask', function () { ask(); });
  /* الرجوع للبرنامج */
  window.addEventListener('blur', function () { if (P && !P.asked) P.away = true; });
  window.addEventListener('focus', function () { if (P && !P.asked && P.away && Date.now() - P.t > 1200) setTimeout(ask, 250); });
  document.addEventListener('visibilitychange', function () { if (!P || P.asked) return; if (document.hidden) P.away = true; else if (P.away) setTimeout(ask, 300); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && P && P.asked) { e.stopPropagation(); no(); } }, true);
  /* التيليفون: إلا البرنامج تعاود تحمل وهو فالواتساب، السؤال كيبان من بعد الدخول */
  App.on('login', function () {
    var s = ss(); if (!s || !s.cid || Date.now() - s.t > 3 * 3600000) { ss(null); return; }
    var n = 0, t = setInterval(function () {
      if (++n > 40) { clearInterval(t); return; }
      if (!Contacts.get(s.cid)) return; clearInterval(t);
      P = { phone: s.phone, text: null, o: { cid: s.cid, label: s.label, name: s.name }, win: null, t: s.t, away: true, asked: false }; ask();
    }, 750);
  });
  return { open: open, url: url, isMob: isMob, _P: function () { return P; } };
})();

/* ───── التجديدات: sendMsg (نفس الدالة، غير الواتساب ولا كيتسجل من بعد ✓) ───── */
if (typeof sendMsg === 'function') (function () {
  var sendMsg0 = sendMsg;
  sendMsg = function (c, ch, text, label, phone, onSent) {
    if (ch !== 'wa') return sendMsg0(c, ch, text, label, phone, onSent);
    if (!c.phone && !phone) { toast(L('لا يوجد رقم هاتف', 'Pas de numéro'), 'err'); return; }
    if (!phone && hasTwo(c)) {
      Modal.open(Modal.head('💬 ' + L('اختر الرقم', 'Choisir le numéro'))
        + '<div class="menu">' + [c.phone, c.phone2].map(function (p, i) { return '<button class="menu-i" data-act="m-pick" data-i="' + i + '">' + ltr(p) + '</button>'; }).join('') + '</div>', 'small');
      sendMsg._p = { c: c, ch: ch, text: text, label: label, onSent: onSent }; return;
    }
    phone = phone || c.phone;
    WA.open(phone, text, { cid: c.id, name: c.name || '', label: label || '', onYes: function () {
      if (onSent) { try { onSent('wa'); } catch (e) { console.error(e); } }
      App.emit('msg.sent', c, { ch: 'wa', label: label });
      if (Session.on) setTimeout(function () { Session.render(); }, 300);
    } });
  };
  /* الإرسال الجماعي: الزبون كيتحسب «تصيفط» غير ملي تقول ✓ */
  var bSend0 = App.acts['b-send'];
  App.act('b-send', function () {
    if (Bulk.ch !== 'wa') return bSend0 && bSend0.apply(this, arguments);
    var c = Contacts.get(Bulk.queue[Bulk.pos]), k = c && bulkKind(c); if (!c || !k) return;
    sendMsg(c, 'wa', k.text(), k.label, c.phone, function (ch) { if (k.onSent) k.onSent(ch); Session.handled(c.id); Bulk.sent++; if (Bulk.pos >= Bulk.queue.length && Modal.isOpen()) bulkRender(); });
    Bulk.pos++; bulkRender();
  });
})();

/* ───── الديون: الدين كيتعلم «تصيفط» غير ملي تقول ✓ ───── */
if (typeof debtSend === 'function') (function () {
  var debtSend0 = debtSend;
  debtSend = function (g, ch) {
    if (ch !== 'wa') return debtSend0(g, ch);
    var lines = debtOpen(g); if (!lines.length) { toast(L('لا دين متبقٍّ', 'Aucune dette restante'), 'err'); return false; }
    if (!g.phone) { toast(L('أدخل رقم الهاتف أولاً', 'Saisissez le téléphone'), 'err'); return false; }
    WA.open(g.phone, debtText(g.name, lines), { name: g.name, label: L('رسالة الدين', 'Message dette'), onYes: function () { markSent(lines); if (typeof DSession !== 'undefined' && DSession.on) DSession.render(); } });
    return true;
  };
})();

/* ───── كاع روابط wa.me الأخرى (الهواتف، المتابعة، الخبير، الحوادث) ───── */
document.addEventListener('click', function (ev) {
  var a = ev.target && ev.target.closest && ev.target.closest('a[href*="wa.me/"]'); if (!a || ev.defaultPrevented) return;
  var m = String(a.getAttribute('href')).match(/wa\.me\/(\d*)(?:\?text=([^#]*))?/); if (!m) return;
  ev.preventDefault(); ev.stopPropagation();
  var phone = m[1] || '', text = ''; try { text = decodeURIComponent(m[2] || ''); } catch (e) { }
  var o = { label: L('واتساب', 'WhatsApp') };
  try {
    var sh = a.closest('#sheet');
    if (sh && typeof Renew !== 'undefined' && Renew.openId && Contacts.get(Renew.openId)) { var c = Contacts.get(Renew.openId); o.cid = c.id; o.name = c.name || ''; }
    var row = !o.cid && a.closest('.r8-r');
    if (row) {
      var b = row.querySelector('[data-id]'), id = b && b.dataset.id, R = JSON.parse(localStorage.getItem('eurv102_renewals') || '[]'), r = R.filter(function (x) { return x.id === id; })[0];
      if (r) { o.name = r.name || ''; var k = typeof calcFindContact === 'function' ? calcFindContact({ police: r.police, plate: r.matricule }) : null; if (k) { o.cid = k.id; o.label = L('متابعة الحاسبة', 'Suivi calculatrice'); } }
    }
  } catch (e) { console.error(e); }
  WA.open(phone, text, o);
}, true);
