/* مقارنة المحرك الجديد (Eng) مع الحاسبة القديمة فكل التركيبات */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(3800);
  const res = await p.evaluate(async () => {
    const w = ce7(), d = w.document, S = ms => new Promise(r => setTimeout(r, ms));
    const v = id => (d.getElementById(id) || {}).value;
    let n = 0, bad = [];
    const cmp = (label, a, b2) => { n++; if (a !== b2 && !(typeof a === 'number' && typeof b2 === 'number' && Math.abs(a - b2) < 1e-9)) { if (bad.length < 40) bad.push(label + ' old=' + JSON.stringify(a) + ' new=' + JSON.stringify(b2)); } };
    const mt = d.getElementById('man-tog'); if (mt.checked) { mt.checked = false; w.togMan(); }
    if (w.INSTALL_SHOWN) w.toggleInstallView();
    const cvVals = gid => Array.from(d.querySelectorAll('#' + gid + ' [data-v]')).map(x => parseInt(x.dataset.v));
    const setCv = (g, i, x) => w.setCVVal(g, i, x, cvVals(g));
    /* حالة المحرك الجديد من خانات القديمة */
    const st = (extra) => Object.assign({ tarif: v('tarif'), type: v('ins-type'), cv: v('cv'), fuel: v('fuel'), commCv: v('comm-cv'), motoCat: v('moto-cat'), camTon: v('cam-ton'), dur: v('dur'), bm: w.BM,
      tpvType: v('tpv-type'), tpvDur: v('tpv-dur'), taxiDur: v('taxi-dur'), taxiMethod: v('taxi-method'), taxiHt: v('taxi-ht'), taxiTax: v('taxi-tax'), taxiHt2: v('taxi-ht2'),
      autreCat: v('autre-cat'), autreDur: v('autre-dur'), man: d.getElementById('man-tog').checked, manPrice: v('man-price'), ds: v('date-s'), instShown: w.INSTALL_SHOWN, instSel: w.INSTALL_SELECTED, prevBal: w.PREV_BAL, paid: v('paid') }, extra || {});
    const check = (lbl) => { const s = st(); cmp(lbl + ' off', w.getOff(), Eng.off(s)); cmp(lbl + ' desc', w.getDesc(), Eng.desc(s)); const e = Eng.endDate(s); if (e !== null) cmp(lbl + ' de', v('date-e'), e); };

    /* 1) Wafa: كل الأنواع × المدد × البونوس */
    w.setTarif('wafa');
    for (const dur of [1, 3, 6, 12]) { w.setDur(dur);
      for (const bm of ['none', 'bonus', 'm20', 'm30']) { w.setBM(bm);
        w.setType('voiture'); for (const f of ['e', 'd']) { w.setFuel(f); for (const cv of cvVals('cv-grid')) { setCv('cv-grid', 'cv', cv); check('V ' + cv + f + ' ' + dur + ' ' + bm); } }
        w.setType('moto'); for (const mc of ['le50', 'mid', 'ge126']) { w.setMotoCat(mc); check('M ' + mc + ' ' + dur + ' ' + bm); }
        w.setType('commercial'); for (const cv of cvVals('comm-cv-grid')) { setCv('comm-cv-grid', 'comm-cv', cv); check('C ' + cv + ' ' + dur + ' ' + bm); }
        w.setType('camion'); for (const t of ['t35', 't12', 't14']) { w.setCamTon(t); check('T ' + t + ' ' + dur + ' ' + bm); }
      } }
    const nWafa = n;
    /* 2) التواريخ الصعيبة (آخر الشهر، فبراير، 29 فبراير) × كل المدد */
    w.setType('voiture'); w.setBM('none');
    for (const ds of ['2026-01-31', '2026-02-28', '2026-03-31', '2026-05-31', '2026-08-30', '2026-08-31', '2026-10-31', '2026-12-31', '2024-02-29', '2027-01-29', '2026-11-01']) {
      d.getElementById('date-s').value = ds;
      w.setTarif('wafa'); for (const dur of [1, 3, 6, 12]) { w.setDur(dur); check('D wafa ' + ds + ' ' + dur); }
      w.setTarif('tpv'); for (const tp of ['camion', 'remorque', 'tourisme']) { w.setTpvType(tp); for (const b of d.querySelectorAll('#tpv-dur-grid [data-v]')) { w.setTpvDur(b.dataset.v); check('D tpv ' + tp + ' ' + b.dataset.v + ' ' + ds); } }
      w.setTpvType('taxi'); for (const td of ['3m', '6m', '1a']) { w.setTaxiDur(td); check('D taxi ' + td + ' ' + ds); }
    }
    d.getElementById('date-s').value = '2026-11-01';
    /* 3) TPV + الطاكسي (جوج طرق) */
    w.setTarif('tpv');
    for (const tp of ['camion', 'remorque', 'tourisme']) { w.setTpvType(tp); for (const b of d.querySelectorAll('#tpv-dur-grid [data-v]')) { w.setTpvDur(b.dataset.v); check('TPV ' + tp + ' ' + b.dataset.v); } }
    w.setTpvType('taxi');
    for (const td of ['3m', '6m', '1a']) { w.setTaxiDur(td);
      w.setTaxiMethod(1); for (const [ht, tx] of [['0', '0'], ['250', '37.5'], ['312.45', '46.87'], ['1000.01', '0.99']]) { d.getElementById('taxi-ht').value = ht; d.getElementById('taxi-tax').value = tx; check('TAXI1 ' + td + ' ' + ht + '/' + tx); }
      w.setTaxiMethod(2); for (const ht of ['0', '250', '312.45', '987.65']) { d.getElementById('taxi-ht2').value = ht; check('TAXI2 ' + td + ' ' + ht); } }
    /* 4) Autre: فئات تجريبية */
    const autreBak = localStorage.getItem('eurv102_autre');
    localStorage.setItem('eurv102_autre', JSON.stringify([{ id: 'ca', name: 'Bateau', durations: [{ id: 'a1', label: '15j', price: 320.5, days: 15 }, { id: 'a2', label: '1 an', price: '1999.99', days: 365 }, { id: 'a3', label: 'sans', price: 100, days: '' }] }, { id: 'cb', name: 'Quad', durations: [{ id: 'b1', label: '3 mois', price: 750, days: 90 }] }]));
    w.setTarif('autre');
    for (const c of ['ca', 'cb']) { w.setAutreCat(c); for (const b of d.querySelectorAll('#autre-dur-grid [data-id]')) { w.setAutreDur(b.dataset.id); check('AUTRE ' + c + ' ' + b.dataset.id); } }
    if (autreBak === null) localStorage.removeItem('eurv102_autre'); else localStorage.setItem('eurv102_autre', autreBak);
    /* 5) السعر اليدوي */
    w.setTarif('wafa'); mt.checked = true; w.togMan(); for (const mp of ['0', '835.76', '1604.6', '12345.678']) { d.getElementById('man-price').value = mp; w.updMan(); check('MAN ' + mp); } mt.checked = false; w.togMan();
    /* 6) التقسيط × القسط المختار × الباقي السابق × المبلغ ← الفرق */
    w.setTarif('wafa'); w.setType('voiture'); w.setFuel('d'); setCv('cv-grid', 'cv', 6);
    for (const dur of [3, 6, 12]) { w.setDur(dur);
      for (const bm of ['none', 'bonus', 'm30']) { w.setBM(bm);
        if (!w.INSTALL_SHOWN) w.toggleInstallView();
        const ins = Eng.install(st()); cmp('INST amounts ' + dur + bm, JSON.stringify(w.INSTALL_AMOUNTS), JSON.stringify(ins.amounts));
        cmp('INST total ' + dur + bm, (d.getElementById('install-total') || {}).textContent, w.fmt(ins.total));
        for (const sel of [-1, 0, 1, ins.count - 1]) {
          if (w.INSTALL_SELECTED !== sel) { if (sel === -1) w.selectInstallment(w.INSTALL_SELECTED); else w.selectInstallment(sel); }
          for (const [po, pp] of [['', ''], ['1000', '1200'], ['1500.5', '900']]) {
            const pt = d.getElementById('prev-tog'); if (!pt.checked) { pt.checked = true; w.togPrev(); }
            d.getElementById('prev-off').value = po; d.getElementById('prev-paid').value = pp; w.calcPrev();
            cmp('PREV ' + po + '/' + pp, w.PREV_BAL, Eng.prevBal(po, pp));
            for (const paid of ['500', '752', '2000', '3008.5']) {
              d.getElementById('paid').value = paid; w.LAST = { paid: 0, off: 0, diff: 0 }; w.doCalc(true);
              const c = Eng.compare(st()); cmp('CMP ' + dur + bm + ' sel' + sel + ' prev' + po + ' paid' + paid + ' off', w.LAST.off, c.cmp); cmp('CMP diff ' + dur + bm + sel + po + paid, w.LAST.diff, c.diff); cmp('EFF', w.getEffOff(), c.eff);
            } } } } }
    if (w.INSTALL_SHOWN) w.toggleInstallView(); const pt = d.getElementById('prev-tog'); if (pt.checked) { pt.checked = false; w.togPrev(); }
    /* 7) أسعار مبدلة (بحال إلا بدلها المدير): كنعاودو Wafa كامل */
    const keys = Object.keys(Eng.DEF), bak = {}; keys.forEach(k => { bak[k] = localStorage.getItem('eurv102_p_' + k); localStorage.setItem('eurv102_p_' + k, String(Math.round((100 + Math.random() * 9000) * 100) / 100)); });
    w.setTarif('wafa'); d.getElementById('paid').value = '';
    for (const dur of [1, 3, 6, 12]) { w.setDur(dur); for (const bm of ['none', 'bonus', 'm20']) { w.setBM(bm);
      w.setType('voiture'); for (const f of ['e', 'd']) { w.setFuel(f); for (const cv of cvVals('cv-grid')) { setCv('cv-grid', 'cv', cv); check('P V ' + cv + f + dur + bm); } }
      w.setType('moto'); for (const mc of ['le50', 'mid', 'ge126']) { w.setMotoCat(mc); check('P M ' + mc + dur + bm); }
      w.setType('commercial'); check('P C ' + dur + bm); w.setType('camion'); for (const t of ['t35', 't12', 't14']) { w.setCamTon(t); check('P T ' + t + dur + bm); } } }
    w.setTarif('tpv'); for (const tp of ['camion', 'remorque', 'tourisme']) { w.setTpvType(tp); for (const b of d.querySelectorAll('#tpv-dur-grid [data-v]')) { w.setTpvDur(b.dataset.v); check('P TPV ' + tp + b.dataset.v); } }
    w.setTpvType('taxi'); w.setTaxiMethod(2); d.getElementById('taxi-ht2').value = '412.3'; for (const td of ['3m', '6m', '1a']) { w.setTaxiDur(td); check('P TAXI2 ' + td); }
    w.setTarif('wafa'); w.setDur(12); if (!w.INSTALL_SHOWN) w.toggleInstallView(); cmp('P INST', JSON.stringify(w.INSTALL_AMOUNTS), JSON.stringify(Eng.install(st()).amounts)); w.toggleInstallView();
    keys.forEach(k => { if (bak[k] === null) localStorage.removeItem('eurv102_p_' + k); else localStorage.setItem('eurv102_p_' + k, bak[k]); });
    /* 8) شكل العملية: valider القديم ↔ Eng.entry */
    w.setTarif('wafa'); w.setType('voiture'); w.setFuel('e'); setCv('cv-grid', 'cv', 8); w.setDur(12); w.setBM('bonus'); w.setUsage('Taxi'); w.setPayMode('cheque');
    d.getElementById('cheque-num').value = 'CHQ-77'; d.getElementById('client').value = ' ENGINE TEST '; d.getElementById('plate').value = '777-A-7'; d.getElementById('police-num').value = ' 8/123 '; d.getElementById('attest-num').value = '555'; d.getElementById('location').value = 'Tanger';
    d.getElementById('paid').value = '3000'; w.doCalc(true);
    const sNow = st({ usage: w.USAGE, payMode: w.PAY_MODE, chequeNum: 'CHQ-77', client: ' ENGINE TEST ', plate: '777-A-7', police: ' 8/123 ', attest: '555', location: 'Tanger', de: v('date-e') });
    w.ldH(); const before = w.HIST.length; w.valider(); w.ldH(); const h = w.HIST[0];
    const e = Eng.entry(sNow, { num: h.num, user: h.user, av: h.av, now: new Date() });
    const fields = Object.keys(h); cmp('ENTRY keys', JSON.stringify(fields), JSON.stringify(Object.keys(e)));
    fields.filter(k => k !== 'time' && k !== 'date').forEach(k => cmp('ENTRY ' + k, h[k], e[k]));
    cmp('ENTRY saved', w.HIST.length, before + 1);
    return { n, nWafa, bad };
  });
  console.log('checks:', res.n, '(wafa:', res.nWafa + ')', 'mismatches:', res.bad.length); res.bad.forEach(x => console.log('  ✗', x));
  console.log(errs.join(' | ') || 'noerr'); await b.close();
})();
