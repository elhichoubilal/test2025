/* ══════════════════════════════════════════════════════════
   RenewPro 8 — v8-prices.js   (💰 الأسعار · صفحة أصلية · المرحلة 4)
   للمدير ديال RenewPro (بلا كلمة سر ثانية). نفس البيانات: eurv102_p_* ↔ Firestore calc/prices،
   Autre ↔ calc/autreTarifs، معلومات الوكالة ↔ calc/agencyInfo. الحفظ عبر fbSet ديال الحاسبة (نفس المزامنة).
   الحاسبة القديمة عند الزملاء كتشوف نفس الأسعار.
══════════════════════════════════════════════════════════ */
'use strict';
var P8 = { dirty: {}, autre: null, ci: null };
if (typeof SEC_EV !== 'undefined') SEC_EV.prices = ['doc', 'تبديل الأسعار', 'Prix modifiés', 'warn'];
CE7.native['c-prices'] = true;
var P8_SEC = [
  ['🚗 ' + 'Essence — 1 an', [['e1', '≤6 CV'], ['e2', '7-8 CV'], ['e3', '9-10 CV'], ['e4', '11+ CV']]],
  ['🚗 ' + 'Diesel — 1 an', [['d1', '≤5 CV'], ['d2', '6-7 CV'], ['d3', '8+ CV']]],
  ['🏍️ Moto — 1 an', [['m_le50', '≤50 CC'], ['m_mid', '51—125 CC'], ['m_ge126', '126+ CC']]],
  ['🚐 Commercial · 🚛 Camion — 1 an', [['comm', 'Commercial'], ['t35', '−3.5 T'], ['t12', '12 T'], ['t14', '14 T']]],
  ['🧾 ' + 'Timbre · échelonnement', [['timbre', 'Timbre fiscal'], ['instfee', 'Frais d\'échelonnement (par versement)']]],
  ['🚛 TPV — Camion', [['tpv_camion_5j', '5j'], ['tpv_camion_10j', '10j'], ['tpv_camion_3m', '3 mois'], ['tpv_camion_6m', '6 mois'], ['tpv_camion_1a', '1 an']]],
  ['🚛 TPV — Camion + remorque', [['tpv_remorque_5j', '5j'], ['tpv_remorque_10j', '10j'], ['tpv_remorque_3m', '3 mois'], ['tpv_remorque_6m', '6 mois'], ['tpv_remorque_1a', '1 an']]],
  ['🚙 TPV — Tourisme', [['tpv_tourisme_5j', '5j'], ['tpv_tourisme_10j', '10j'], ['tpv_tourisme_1m', '1 mois'], ['tpv_tourisme_3m', '3 mois'], ['tpv_tourisme_6m', '6 mois'], ['tpv_tourisme_1a', '1 an']]],
  ['🚕 Taxi', [['cnpac', 'CNPAC (par tranche)'], ['taxi2_tax', 'Méthode 2 — Tax %'], ['taxi2_para', 'Méthode 2 — Taxe parafiscale %']]]
];
var P8_CI = [['name', 'اسم الوكالة', 'Nom de l\'agence'], ['phone', 'الهاتف', 'Téléphone'], ['addr', 'العنوان', 'Adresse'], ['addr2', 'العنوان 2', 'Adresse 2'], ['city', 'المدينة', 'Ville'], ['ice', 'ICE', 'ICE'], ['piecestart', 'أول رقم ديال Pièce', 'N° départ Pièce']];
function p8Ci() { try { return JSON.parse(localStorage.getItem('eurv102_ci') || '{}') || {}; } catch (e) { return {}; } }
function renderPrices8(el) {
  if (!App.user || !App.user.admin) { el.innerHTML = '<div class="page"><div class="empty">🔒 ' + L('للمدير فقط', 'Réservé au gérant') + '</div></div>'; return; }
  if (!P8.autre) P8.autre = JSON.parse(JSON.stringify(Eng.autre()));
  if (!P8.ci) P8.ci = p8Ci();
  var nd = Object.keys(P8.dirty).length + (P8.autreDirty ? 1 : 0) + (P8.ciDirty ? 1 : 0);
  var val = function (k) { return P8.dirty[k] != null ? P8.dirty[k] : Eng.gp(k); };
  var secs = P8_SEC.map(function (s) {
    return '<section class="sec-box p8-s"><div class="sec-bh"><b>' + esc(s[0]) + '</b></div><div class="p8-g">' + s[1].map(function (f) {
      var ch = P8.dirty[f[0]] != null, def = Eng.DEF[f[0]];
      return '<label class="f p8-f' + (ch ? ' ch' : '') + '"><span>' + esc(f[1]) + '</span><input type="number" step="0.01" inputmode="decimal" dir="ltr" data-inp="p8-v" data-k="' + f[0] + '" value="' + esc(val(f[0])) + '"><small>' + L('الأصل: ', 'défaut : ') + esc(def) + '</small></label>'; }).join('') + '</div></section>';
  }).join('');
  var au = P8.autre.map(function (c, ci) {
    return '<div class="p8-ac"><div class="p8-ar"><input class="inp" data-inp="p8-an" data-c="' + ci + '" value="' + esc(c.name) + '"><button class="btn sm ic red-o" data-act="p8-adel" data-c="' + ci + '">🗑️</button></div>'
      + c.durations.map(function (d, di) { return '<div class="p8-ad"><input class="inp" data-inp="p8-dl" data-c="' + ci + '" data-d="' + di + '" value="' + esc(d.label) + '" placeholder="' + L('المدة', 'Durée') + '"><input class="inp" type="number" step="0.01" dir="ltr" data-inp="p8-dp" data-c="' + ci + '" data-d="' + di + '" value="' + esc(d.price) + '" placeholder="DH"><input class="inp" type="number" dir="ltr" data-inp="p8-dd" data-c="' + ci + '" data-d="' + di + '" value="' + esc(d.days || '') + '" placeholder="' + L('أيام', 'jours') + '"><button class="btn sm ic" data-act="p8-ddel" data-c="' + ci + '" data-d="' + di + '">✕</button></div>'; }).join('')
      + '<button class="sec-more" data-act="p8-dadd" data-c="' + ci + '">➕ ' + L('زيد مدة', 'Ajouter une durée') + '</button></div>';
  }).join('');
  el.innerHTML = '<div class="page sec7 c8 p8">'
    + c8Hd('💰', L('الأسعار', 'Prix'), L('التعرفة ديال الحاسبة · كتبان حتى عند الزملاء', 'Tarifs de la calculatrice · partagés'),
      '<div class="c8-hr">' + (nd ? '<span class="sec-p warn">' + nd + ' ' + L('تبديل ما تحفظش', 'modif. non enregistrée(s)') + '</span>' : '') + '<button class="btn" data-act="p8-reset"' + (nd ? '' : ' disabled') + '>↺ ' + L('إلغاء', 'Annuler') + '</button><button class="btn pri" data-act="p8-save"' + (nd ? '' : ' disabled') + '>💾 ' + L('حفظ', 'Enregistrer') + '</button></div>')
    + '<div class="box">ℹ️ ' + L('الثمن ديال Wafa = الثمن السنوي × (1 شهر 9% · 3 أشهر 27% · 6 أشهر 54% · سنة 100%) ± البونوس + الطابع.', 'Wafa = prix annuel × (1 m 9 % · 3 m 27 % · 6 m 54 % · 1 an 100 %) ± bonus/malus + timbre.') + '</div>'
    + '<div class="p8-cols">' + secs + '</div>'
    + '<section class="sec-box"><div class="sec-bh"><b>🧩 Autre</b><small>' + L('فئات ومدد كتصاوبهم بيدك', 'catégories personnalisées') + '</small><span class="sp"></span><button class="btn sm" data-act="p8-aadd">➕ ' + L('فئة', 'Catégorie') + '</button></div>' + (au || '<div class="empty">' + L('ما كاين حتى فئة', 'Aucune catégorie') + '</div>') + '</section>'
    + '<section class="sec-box"><div class="sec-bh"><b>🏢 ' + L('معلومات الوكالة (كتبان فالوصل)', 'Infos agence (sur les reçus)') + '</b></div><div class="p8-g">' + P8_CI.map(function (f) { return '<label class="f"><span>' + L(f[1], f[2]) + '</span><input data-inp="p8-ci" data-k="' + f[0] + '"' + (f[0] === 'phone' || f[0] === 'ice' || f[0] === 'piecestart' ? ' dir="ltr"' : '') + ' value="' + esc(P8.ci[f[0]] || '') + '"></label>'; }).join('') + '</div></section>'
    + '</div>';
}
var p8Mark = function () { var b = document.querySelector('[data-act="p8-save"]'); if (b) { App.render(); } };
App.input('p8-v', function (el) { var k = el.dataset.k, v = el.value; if (String(parseFloat(v)) === String(Eng.gp(k)) || v === String(Eng.gp(k))) delete P8.dirty[k]; else P8.dirty[k] = v; el.closest('.p8-f').classList.toggle('ch', P8.dirty[k] != null); p8Bar(); });
function p8Bar() { var nd = Object.keys(P8.dirty).length + (P8.autreDirty ? 1 : 0) + (P8.ciDirty ? 1 : 0), s = document.querySelector('[data-act="p8-save"]'), r = document.querySelector('[data-act="p8-reset"]'); if (s) s.disabled = !nd; if (r) r.disabled = !nd; }
App.input('p8-an', function (el) { P8.autre[+el.dataset.c].name = el.value; P8.autreDirty = true; p8Bar(); });
App.input('p8-dl', function (el) { P8.autre[+el.dataset.c].durations[+el.dataset.d].label = el.value; P8.autreDirty = true; p8Bar(); });
App.input('p8-dp', function (el) { P8.autre[+el.dataset.c].durations[+el.dataset.d].price = parseFloat(el.value) || 0; P8.autreDirty = true; p8Bar(); });
App.input('p8-dd', function (el) { P8.autre[+el.dataset.c].durations[+el.dataset.d].days = el.value; P8.autreDirty = true; p8Bar(); });
App.act('p8-aadd', function () { P8.autre.push({ id: 'c' + Date.now(), name: L('فئة جديدة', 'Nouvelle catégorie'), durations: [] }); P8.autreDirty = true; App.render(); });
App.act('p8-adel', function (el) { if (!confirm(L('نمسحو هاد الفئة؟', 'Supprimer cette catégorie ?'))) return; P8.autre.splice(+el.dataset.c, 1); P8.autreDirty = true; App.render(); });
App.act('p8-dadd', function (el) { P8.autre[+el.dataset.c].durations.push({ id: 'd' + Date.now(), label: L('مدة جديدة', 'Nouvelle durée'), price: 0, days: '' }); P8.autreDirty = true; App.render(); });
App.act('p8-ddel', function (el) { P8.autre[+el.dataset.c].durations.splice(+el.dataset.d, 1); P8.autreDirty = true; App.render(); });
App.input('p8-ci', function (el) { P8.ci[el.dataset.k] = el.value; P8.ciDirty = true; p8Bar(); });
App.act('p8-reset', function () { P8.dirty = {}; P8.autre = null; P8.ci = null; P8.autreDirty = P8.ciDirty = false; App.render(); });
App.act('p8-save', function () {
  if (!App.user || !App.user.admin) return;
  var w = ce7();
  var bad = Object.keys(P8.dirty).filter(function (k) { return isNaN(parseFloat(P8.dirty[k])) || parseFloat(P8.dirty[k]) < 0; });
  if (bad.length) { toast(L('ثمن غير صحيح: ', 'Prix invalide : ') + bad.join(', '), 'err'); return; }
  var ch = Object.keys(P8.dirty).map(function (k) { return k + ': ' + Eng.gp(k) + ' → ' + P8.dirty[k]; });
  if (ch.length && !confirm(L('تأكيد تبديل الأسعار؟\n', 'Confirmer les nouveaux prix ?\n') + ch.join('\n'))) return;
  try {
    if (ch.length) {
      Object.keys(P8.dirty).forEach(function (k) { localStorage.setItem('eurv102_p_' + k, String(parseFloat(P8.dirty[k]))); });
      if (typeof Store8 !== 'undefined') Store8.set('prices', Eng.prices());
      else if (w && w.fbSet) w.fbSet('prices', w.collectPrices());
      if (w && w.fillP) try { w.fillP(); } catch (e) { }
    }
    if (P8.autreDirty) {
      if (typeof Store8 !== 'undefined') Store8.save('autreTarifs', P8.autre);
      if (w && w.svAutre) try { w.svAutre(P8.autre); } catch (e) { }
    }
    if (P8.ciDirty) {
      if (typeof Store8 !== 'undefined') Store8.save('agencyInfo', P8.ci);
      else { localStorage.setItem('eurv102_ci', JSON.stringify(P8.ci)); if (w && w.fbSet) w.fbSet('agencyInfo', P8.ci); }
      if (w && w.ldCI) try { w.ldCI(); } catch (e) { }
    }
    if (typeof secLog === 'function' && (ch.length || P8.autreDirty)) secLog('prices', L('الأسعار تبدلات: ', 'Prix modifiés : ') + (ch.join(' · ') || 'Autre').slice(0, 280));
    P8.dirty = {}; P8.autre = null; P8.ci = null; P8.autreDirty = P8.ciDirty = false;
    toast('💾 ' + L('تحفظات الأسعار', 'Prix enregistrés')); App.render();
  } catch (e) { console.error(e); toast(String(e.message || e), 'err'); }
});
(function () { var put = function () { var m = App.mod('c-prices'); if (m && m.render !== renderPrices8) m.render = renderPrices8; }; put(); App.on('login', put); })();
