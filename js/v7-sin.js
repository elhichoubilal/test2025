/* ══════════════════════════════════════════════════════════
   RenewPro 7 — v7-sin.js   (الحوادث: الأزرار فالسطر + بطاقات فالهاتف)
   الحاسوب: فأول خانة (N° d'ordre، ديما باينة) ← 📧 طلب الخبرة · 💬 المحادثة · 📝 Accord forfait.
   الهاتف: بطاقة لكل ملف + [📞 الخبير] (الرقم من دليل الخبراء؛ إلا كانو بزاف كيسولك).
   نفس الأفعال ديال الملف (sm-open / sm-conv / sf-open)، ما تبدّل والو فالمنطق.
══════════════════════════════════════════════════════════ */
'use strict';
function sin7Row(id) { return Sin.rows.filter(function (x) { return x.id === id; })[0]; }
function sin7Acts(r) {
  return '<span class="sin7-ra">'
    + '<button class="sin7-b" data-act="sm-open" data-id="' + esc(r.id) + '" title="' + esc(L('طلب الخبرة (Gmail)', 'Demande d\'expertise')) + '">📧</button>'
    + (r.expSentAt ? '<a class="sin7-b" target="_blank" rel="noopener" href="' + esc(smConvUrl(r)) + '" data-act="sm-conv" data-id="' + esc(r.id) + '" title="' + esc(L('المحادثة مع الخبير', 'Conversation avec l\'expert')) + '">💬</a>' : '<span class="sin7-b off">💬</span>')
    + '<button class="sin7-b' + (r.forfait ? ' done' : '') + '" data-act="sf-open" data-id="' + esc(r.id) + '" title="Accord forfait (WAFA)">📝</button>'
    + '</span>';
}
/* الخبير ديال الملف والأرقام ديالو */
function sin7Expert(r) {
  if (typeof smChoose !== 'function') return null;
  var info = { plate: r.plate || (typeof smPlateOf === 'function' ? smPlateOf(r).v : ''), expert: r.expert, expBy: r.expBy, police: r.police };
  var ch = smChoose(info); return ch && ch.e ? ch.e : null;
}
App.act('sin7-call', function (el) {
  var r = sin7Row(el.dataset.id); if (!r) return;
  var e = sin7Expert(r);
  if (!e) { toast(L('ما عرفتش الخبير ديال هاد الملف. حل الملف ولا دليل الخبراء.', 'Expert non identifié pour ce dossier.'), 'err'); return; }
  var ps = smPhones(e);
  if (!ps.length) { toast(L('ما كاينش رقم ديال ', 'Pas de numéro pour ') + e.cab, 'err'); return; }
  if (ps.length === 1) { location.href = telHref(ps[0].n); return; }
  Modal.open(Modal.head('📞 ' + esc(e.cab)) + (e.exp ? '<div class="hint">👤 ' + esc(e.exp) + '</div>' : '') + smPhoneHTML(e), 'small');
});
function sin7Card(r) {
  var st = (typeof SIN_STATUTS !== 'undefined' ? SIN_STATUTS : []).filter(function (s) { return s.k === (r.statut || 'en_cours'); })[0];
  return '<div class="sin7-card s-' + esc(r.statut || 'en_cours') + '" data-act="sin-open" data-id="' + esc(r.id) + '">'
    + '<div class="sin7-l1"><b class="ltr">' + esc(r.ordre || '') + '</b><span class="sin7-as">' + esc(r.assure || '—') + '</span>'
      + (st ? '<span class="sin7-st"><i class="sin-dot" style="background:' + st.css + '"></i>' + esc(st.label) + '</span>' : '') + '</div>'
    + '<div class="sin7-l2">' + (r.plate ? ltr(r.plate) + ' · ' : '') + (r.dateSin ? ltr(r.dateSin) + ' · ' : '') + esc(r.expert || L('بلا خبير', 'sans expert')) + '</div>'
    + '<div class="sin7-l3"><button class="btn sm call sin7-call" data-act="sin7-call" data-id="' + esc(r.id) + '">📞 ' + L('الخبير', 'Expert') + '</button>' + sin7Acts(r) + '</div>'
    + '</div>';
}
(function () {
  if (typeof sinTableHTML !== 'function') return;
  var orig = sinTableHTML;
  sinTableHTML = function () {
    if (!isDesktop()) {
      var pool = Sin.rows.filter(function (r) { return sinMatches(r, false); }), list = Sin.desc ? pool.slice().reverse() : pool;
      if (!list.length) return orig();
      return '<div class="sin7-cards">' + list.slice(0, Sin.limit).map(sin7Card).join('') + '</div>'
        + (list.length > Sin.limit ? '<button class="btn wide" data-act="sin-more">' + L('عرض المزيد', 'Afficher plus') + ' (' + (list.length - Sin.limit) + ')</button>' : '');
    }
    /* الحاسوب: نزيدو الأزرار فأول خانة ديال كل سطر */
    var html = orig(), byId = {};
    Sin.rows.forEach(function (r) { byId[r.id] = r; });
    return html.replace(/(<tr class="s-[^"]*" data-act="sin-open" data-id="([^"]+)"><td>)/g, function (m0, pre, id) {
      var r = byId[id.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")]; return r ? pre + sin7Acts(r) : pre; });
  };
})();
