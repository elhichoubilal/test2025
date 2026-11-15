/* ══════════════════════════════════════════════════════════
   RenewPro 8 — v8-engine.js   (🧮 محرك الحاسبة الجديد · المرحلة 1)
   دوال نقية (بلا شاشة، بلا DOM): الثمن، الوصف، تاريخ النهاية، التقسيط، الفرق، شكل العملية.
   • الأسعار كتتقرا من نفس البلاصة ديال الحاسبة القديمة (localStorage «eurv102_p_*» اللي كيتزامن مع Firestore «calc/prices»)،
     و«Autre» من «eurv102_autre» (calc/autreTarifs). يعني أي تبديل فالأسعار كيبان فجوج.
   • الحساب منقول حرفياً من 08-tarif-calc.js و06-installments.js و09-valider-receipts.js (نفس التقريب، نفس التواريخ).
   • ما كيكتب والو: الحفظ والترقيم كيجيو فالمرحلة 2 (بنفس الشكل ونفس العدّاد، باش النسخة ديال الزملاء تبقى تقرا).
   الحالة (s): { tarif:'wafa'|'tpv'|'autre',
     type:'voiture'|'moto'|'commercial'|'camion', cv, fuel:'e'|'d', commCv, motoCat:'le50'|'mid'|'ge126', camTon:'t35'|'t12'|'t14',
     dur:1|3|6|12, bm:'none'|'bonus'|'m20'|'m30',
     tpvType:'camion'|'remorque'|'tourisme'|'taxi', tpvDur:'5j'|'10j'|'1m'|'3m'|'6m'|'1a', taxiDur:'3m'|'6m'|'1a', taxiMethod:1|2, taxiHt, taxiTax, taxiHt2,
     autreCat, autreDur, man:bool, manPrice, ds:'YYYY-MM-DD',
     instShown:bool, instSel:-1|i, prevBal:number, paid:number, usage, payMode, payRef, client, plate, police, attest, location }
══════════════════════════════════════════════════════════ */
'use strict';
var Eng = (function () {
  var DEF = { e1: 2227.18, e2: 2710.74, e3: 2940.13, e4: 4224.38, d1: 2710.74, d2: 2940, d3: 4224.38, m_le50: 1473, m_mid: 2000, m_ge126: 2683, comm: 5024, t35: 3950, t12: 7000, t14: 8000, timbre: 17,
    tpv_camion_5j: 400, tpv_camion_10j: 700, tpv_camion_3m: 0, tpv_camion_6m: 0, tpv_camion_1a: 0,
    tpv_remorque_5j: 500, tpv_remorque_10j: 850, tpv_remorque_3m: 0, tpv_remorque_6m: 0, tpv_remorque_1a: 0,
    tpv_tourisme_5j: 150, tpv_tourisme_10j: 250, tpv_tourisme_1m: 450, tpv_tourisme_3m: 1100, tpv_tourisme_6m: 0, tpv_tourisme_1a: 0,
    cnpac: 17, instfee: 17, taxi2_tax: 15, taxi2_para: 1.5 };
  var INSTALL_COUNTS = { 3: 2, 6: 3, 12: 4 };
  var CV_VOITURE = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  var num = function (v) { return parseFloat(v) || 0; };

  /* ── الأسعار (نفس gp ديال القديمة) ── */
  var over = null;                                         /* للتجارب فقط: أسعار مفروضة */
  function gp(k) { if (over && over[k] != null) return parseFloat(over[k]) || 0; var s = null; try { s = localStorage.getItem('eurv102_p_' + k); } catch (e) { } return parseFloat(s !== null ? s : DEF[k]) || 0; }
  function prices() { var o = {}; Object.keys(DEF).forEach(function (k) { o[k] = gp(k); }); return o; }
  var AUTRE_DEFAULT = [{ id: 'cat_ex', name: 'فئة تجريبية', durations: [{ id: 'dur_ex', label: 'شهر', price: 0, days: 30 }] }];
  function autre() { try { var v = JSON.parse(localStorage.getItem('eurv102_autre') || 'null'); return (v && v.length) ? v : JSON.parse(JSON.stringify(AUTRE_DEFAULT)); } catch (e) { return JSON.parse(JSON.stringify(AUTRE_DEFAULT)); } }
  function autrePick(s) { var cat = autre().filter(function (c) { return c.id === s.autreCat; })[0], d = cat && cat.durations.filter(function (x) { return x.id === s.autreDur; })[0]; return { cat: cat, d: d }; }

  /* ── الثمن الرسمي (getOff) ── */
  function offWafa(s) {
    var tp = s.type || 'voiture', dur = parseInt(s.dur) || 6, m = dur === 1 ? 0.09 : dur === 3 ? 0.27 : dur === 6 ? 0.54 : 1, base = 0;
    if (tp === 'voiture') { var cv = parseInt(s.cv), f = s.fuel; base = f === 'e' ? (cv <= 6 ? gp('e1') : cv <= 8 ? gp('e2') : cv <= 10 ? gp('e3') : gp('e4')) : (cv <= 5 ? gp('d1') : cv <= 7 ? gp('d2') : gp('d3')); }
    else if (tp === 'moto') { var mc = s.motoCat; base = mc === 'le50' ? gp('m_le50') : mc === 'mid' ? gp('m_mid') : gp('m_ge126'); }
    else if (tp === 'commercial') base = gp('comm');
    else if (tp === 'camion') { var tn = s.camTon; base = tn === 't35' ? gp('t35') : tn === 't12' ? gp('t12') : gp('t14'); }
    var pb = base * m, bm = s.bm === 'bonus' ? -pb * .1 : s.bm === 'm20' ? pb * .2 : s.bm === 'm30' ? pb * .3 : 0;
    return r2(pb + bm + gp('timbre'));
  }
  function taxiCnpac(s) { var td = s.taxiDur, units = td === '3m' ? 2 : td === '6m' ? 3 : 4, u = gp('cnpac'); return { units: units, unit: u, total: r2(u * units) }; }
  function offTpv(s) {
    var tp = s.tpvType;
    if (tp === 'taxi') {
      var td = s.taxiDur, mult = td === '3m' ? 3 : td === '6m' ? 6 : 10, cn = taxiCnpac(s).total;
      if (String(s.taxiMethod) === '2') { var htT = r2(num(s.taxiHt2) * mult), taxA = r2(htT * gp('taxi2_tax') / 100), paraA = r2(htT * gp('taxi2_para') / 100); return r2(htT + taxA + paraA + cn); }
      return r2(num(s.taxiHt) * mult + num(s.taxiTax) * mult + cn);
    }
    return gp('tpv_' + tp + '_' + s.tpvDur) || 0;
  }
  function offAutre(s) { var p = autrePick(s); return p.d ? (parseFloat(p.d.price) || 0) : 0; }
  function off(s) { if (s.man) return num(s.manPrice); return s.tarif === 'tpv' ? offTpv(s) : s.tarif === 'autre' ? offAutre(s) : offWafa(s); }

  /* ── الوصف (getDesc) ── */
  function desc(s) {
    if (s.tarif === 'tpv') {
      var labels = { camion: 'Camion TPV', remorque: 'Camion+remorque TPV', tourisme: 'Tourisme TPV', taxi: 'Taxi TPV' };
      if (s.tpvType === 'taxi') return labels.taxi + ' ' + ({ '3m': '3mois', '6m': '6mois', '1a': '1an' }[s.taxiDur] || '');
      return labels[s.tpvType] + ' ' + ({ '5j': '5j', '10j': '10j', '1m': '1mois', '3m': '3mois', '6m': '6mois', '1a': '1an' }[s.tpvDur] || '');
    }
    if (s.tarif === 'autre') { var p = autrePick(s); return (p.cat ? p.cat.name : 'Autre') + (p.d ? ' ' + p.d.label : ''); }
    var tp = s.type || 'voiture', bm = s.bm === 'bonus' ? ' [B-10%]' : s.bm === 'm20' ? ' [M+20%]' : s.bm === 'm30' ? ' [M+30%]' : '', dm = { '1': '1M', '3': '3M', '6': '6M', '12': '1an' }[String(s.dur)];
    var motoLbl = { le50: '≤50CC', mid: '51-125CC', ge126: '126+CC' };
    if (tp === 'voiture') return s.cv + 'CV ' + (s.fuel === 'e' ? 'Ess' : 'Die') + ' ' + dm + bm;
    if (tp === 'moto') return 'Moto ' + motoLbl[s.motoCat] + ' ' + dm + bm;
    if (tp === 'commercial') return 'Comm ' + s.commCv + 'CV ' + dm + bm;
    return 'Camion ' + (s.camTon === 't35' ? '-3.5T' : s.camTon === 't12' ? '12T' : '14T') + ' ' + dm + bm;
  }

  /* ── تاريخ النهاية (calcEnd) ── نفس منطق Date ديال القديمة بالضبط */
  function endDate(s) {
    if (!s.ds) return null;                                 /* null = ما كيتبدلش */
    var d = new Date(s.ds), addM = function (n) { d.setMonth(d.getMonth() + n); d.setDate(d.getDate() - 1); };
    if (s.tarif === 'tpv') {
      if (s.tpvType === 'taxi') addM(s.taxiDur === '3m' ? 3 : s.taxiDur === '6m' ? 6 : 12);
      else { var dd = s.tpvDur; if (dd === '5j') d.setDate(d.getDate() + 4); else if (dd === '10j') d.setDate(d.getDate() + 9); else if (dd === '1m') addM(1); else if (dd === '3m') addM(3); else if (dd === '6m') addM(6); else if (dd === '1a') { d.setFullYear(d.getFullYear() + 1); d.setDate(d.getDate() - 1); } }
    } else if (s.tarif === 'autre') { var p = autrePick(s); if (p.d && p.d.days) d.setDate(d.getDate() + parseInt(p.d.days) - 1); else return ''; }
    else addM(parseInt(s.dur) || 6);
    return d.toISOString().split('T')[0];
  }

  /* ── التقسيط (renderInstallments) ── */
  function equalSplitPcts(count) { var base = Math.floor(100 / count), p = []; for (var i = 0; i < count - 1; i++) p.push(base); p.push(100 - base * (count - 1)); return p; }
  function install(s) {
    if (s.tarif !== 'wafa' || s.man) return null;
    var count = INSTALL_COUNTS[parseInt(s.dur) || 0]; if (!count) return null;
    var o = off(s); if (!o) return { count: count, amounts: [] };
    var pcts = equalSplitPcts(count), fee = gp('instfee'), feeTotal = r2(fee * (count - 1)), total = r2(o + feeTotal);
    return { count: count, pcts: pcts, fee: fee, feeTotal: feeTotal, total: total, amounts: pcts.map(function (p) { return r2(total * p / 100); }) };
  }

  /* ── الفرق (getCompareOff / getEffOff / doCalc) ── */
  function compare(s) {
    var o = off(s), cmp = o;
    if (s.tarif === 'wafa' && s.instShown && s.instSel >= 0) { var ins = install(s); if (ins && ins.amounts[s.instSel] != null) cmp = ins.amounts[s.instSel]; }
    var eff = r2(cmp - num(s.prevBal)), paid = num(s.paid);
    return { off: o, cmp: cmp, eff: eff, paid: paid, diff: paid ? paid - eff : 0, ok: !!(paid && cmp), low: !!(paid && cmp && paid < cmp * 0.5) };
  }
  /* الباقي السابق (calcPrev): الرسمي ديال المرة اللي فاتت ← شنو عطا */
  function prevBal(prevOff, prevPaid) { var po = num(prevOff), pp = num(prevPaid); return (!po || !pp) ? 0 : pp - po; }

  /* ── شكل العملية فالسجل (نفس الخانات ونفس الترتيب ديال valider) ── */
  function payRef(s) { return s.payMode === 'cheque' ? (s.chequeNum || '') : s.payMode === 'tpe' ? (s.tpeRef || '') : ''; }
  function entry(s, ctx) {
    var c = compare(s), now = ctx.now || new Date();
    return { num: ctx.num, date: now.toLocaleDateString('fr-FR'), time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), user: ctx.user, av: ctx.av,
      client: String(s.client || '').trim(), plate: s.plate || '', police: String(s.police || '').trim(), attest: String(s.attest || '').trim(), usage: s.usage || 'Personnel', tarif: s.tarif || 'wafa',
      ins: desc(s), location: String(s.location || '').trim(), ds: s.ds || '', de: s.de != null ? s.de : (endDate(s) || ''), paid: c.paid, off: c.cmp, diff: c.diff, payMode: s.payMode || 'cash', payRef: payRef(s) };
  }
  /* الترقيم (قراية فقط فالمرحلة 1): نفس العداد «eurv102_rec» */
  function curNum() { var n = 999; try { n = parseInt(localStorage.getItem('eurv102_rec') || '999'); } catch (e) { } return 'EUR-' + new Date().getFullYear() + '-' + String(n + 1).padStart(4, '0'); }

  return { DEF: DEF, gp: gp, prices: prices, autre: autre, off: off, desc: desc, endDate: endDate, install: install, compare: compare, prevBal: prevBal, entry: entry, payRef: payRef, curNum: curNum,
    equalSplitPcts: equalSplitPcts, taxiCnpac: taxiCnpac, CV_VOITURE: CV_VOITURE, INSTALL_COUNTS: INSTALL_COUNTS, _over: function (o) { over = o; } };
})();
