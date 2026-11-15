const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d=>d.accept());
 await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(4500);
 const r = await p.evaluate(async ()=>{ const S=ms=>new Promise(r=>setTimeout(r,ms)), w=ce7(), d=w.document, o={}, bad=[]; let n=0;
   const cmp=(l,a,b2)=>{ n++; if(JSON.stringify(a)!==JSON.stringify(b2)) bad.push(l+' old='+JSON.stringify(a)+' new='+JSON.stringify(b2)); };
   const cloud=k=>CalcStore.get(k).then(j=>JSON.parse(j||'null'));
   App.go('c-new7'); await S(800);
   const fill = (cfg) => { w.setTarif(cfg.tarif||'wafa'); if(cfg.tarif==='tpv'){ w.setTpvType('tourisme'); w.setTpvDur('10j'); } else { w.setType(cfg.type||'voiture'); w.setFuel(cfg.fuel||'d'); w.setCVVal('cv-grid','cv',cfg.cv||6,[4,5,6,7,8,9,10,11,12,13,14]); w.setDur(cfg.dur||6); w.setBM(cfg.bm||'none'); }
     w.setUsage(cfg.usage||'Personnel'); w.setPayMode(cfg.pm||'cash');
     const set=(id,v)=>{ const e=d.getElementById(id); if(e) e.value=v; }; set('client',cfg.client); set('plate',cfg.plate||''); set('police-num',cfg.police||''); set('attest-num',cfg.attest||''); set('location',cfg.loc||''); set('cheque-num',cfg.chq||''); set('tpe-ref',cfg.tpe||''); set('date-s',cfg.ds||'2026-11-01'); w.calcEnd();
     if(cfg.inst!=null){ if(!w.INSTALL_SHOWN) w.toggleInstallView(); w.selectInstallment(cfg.inst); }
     if(cfg.prev){ const pt=d.getElementById('prev-tog'); if(!pt.checked){pt.checked=true; w.togPrev();} set('prev-off',cfg.prev[0]); set('prev-paid',cfg.prev[1]); w.calcPrev(); }
     if(cfg.man){ const mt=d.getElementById('man-tog'); if(!mt.checked){mt.checked=true; w.togMan();} set('man-price',cfg.man); w.updMan(); }
     set('paid',cfg.paid||''); w.autoCalc(); };
   const strip=h=>{ const x=Object.assign({},h); delete x.num; delete x.time; delete x.date; return x; };
   const CASES=[ {client:'A  ONE ',plate:'111-A-1',police:'8/1',attest:'11',loc:'Tanger',paid:'2000'},
     {client:'B TWO',type:'voiture',fuel:'e',cv:9,dur:12,bm:'bonus',usage:'Taxi',pm:'cheque',chq:'CHQ9',paid:'2500'},
     {client:'C THREE',dur:12,inst:1,paid:'800',pm:'tpe',tpe:'T77'}, {client:'D FOUR',dur:3,prev:['1000','1200'],paid:'300'},
     {client:'E FIVE',man:'835.76',paid:'1000'}, {client:'F SIX',tarif:'tpv',paid:'300'} ];
   for (const cfg of CASES) {
     fill(cfg); w.ldH(); w.doCalc(true); w.valider(); await S(100); w.ldH(); const oldH=w.HIST[0]; await S(3700);
     Ops.reset(w); fill(cfg); const rr=Ops.valider(w); if(rr.err){ bad.push('err '+cfg.client+' '+rr.err); continue; } const newH=JSON.parse(localStorage.getItem('eurv102_h'))[0];
     cmp('keys '+cfg.client, Object.keys(oldH), Object.keys(newH)); cmp('entry '+cfg.client, strip(oldH), strip(newH));
     cmp('num+1 '+cfg.client, +oldH.num.slice(-4)+1, +newH.num.slice(-4));
     Ops.reset(w); }
   /* لم يدفع */
   fill({client:'U UNPAID',plate:'U-1',dur:6}); w.ldH(); w.markUnpaid(); await S(100); w.ldH(); const ou=w.HIST[0]; await S(3700); Ops.reset(w);
   fill({client:'U UNPAID',plate:'U-1',dur:6}); const ru=Ops.unpaid(w); const nu=JSON.parse(localStorage.getItem('eurv102_h'))[0]; cmp('unpaid keys',Object.keys(ou),Object.keys(nu)); cmp('unpaid',strip(ou),strip(nu)); Ops.reset(w);
   /* دفع مباشر */
   w.toggleDirect(); d.getElementById('client').value='DIR'; d.getElementById('direct-desc').value='Carte grise'; d.getElementById('direct-amount').value='150'; w.ldH(); w.validerDirect(); w.ldH(); const od=w.HIST[0]; await S(200);
   if(!w.DIRECT_MODE) w.toggleDirect(); d.getElementById('client').value='DIR'; d.getElementById('direct-desc').value='Carte grise'; d.getElementById('direct-amount').value='150'; Ops.direct(w); const nd=JSON.parse(localStorage.getItem('eurv102_h'))[0];
   cmp('direct',strip(od),strip(nd)); if (w.DIRECT_MODE) w.toggleDirect(); Ops.reset(w);
   /* خلاص «لم يدفع» (من السجل) */
   const H=JSON.parse(localStorage.getItem('eurv102_h')); const k=(w.upKey?w.upKey(nu):null);
   w.HIST=H; const idx=H.findIndex(h=>h.num===nu.num); w.payUnpaid(k||nu.num); await S(400);
   d.getElementById('paid').value='1700'; w.autoCalc(); const rp=Ops.valider(w); const after=JSON.parse(localStorage.getItem('eurv102_h')).find(h=>h.num===nu.num);
   o.payUnpaid = { err: rp.err||'', unpaid: after.unpaid, paid: after.paid, diff: after.diff, paidBy: after.paidBy, samecount: JSON.parse(localStorage.getItem('eurv102_h')).length===H.length };
   /* السحابة والعداد */
   await S(800); const ch=await cloud('history'); o.cloudTop=ch[0].client; o.cloudCounter=await cloud('counters/rec'); o.localCounter=localStorage.getItem('eurv102_rec');
   /* «للحساب» من المتابعة ← أدّى بوحدو */
   w.RT_CLIENTS=[{id:'z1',name:'RT PAY',police:'8/77',price:500,type:'renew',requestDate:'2026-10-20',status:'active'}]; w.svRenewals(); await S(200);
   w.payRenewal('z1'); await S(400); d.getElementById('paid').value='500'; w.autoCalc(); const rr2=Ops.valider(w);
   o.rtDone = JSON.parse(localStorage.getItem('eurv102_renewals')).find(c=>c.id==='z1').status;
   o.clientsSaved = !!JSON.parse(localStorage.getItem('eurv102_c')).find(c=>c.n==='A  ONE'.trim()||c.n==='A  ONE');
   o.formReset = d.getElementById('client').value==='' && d.getElementById('paid').value==='';
   return {n, bad, o}; });
 console.log('checks', r.n, 'mismatches', r.bad.length); r.bad.forEach(x=>console.log('  ✗', x.slice(0,400))); console.log(JSON.stringify(r.o));
 console.log(errs.join('|')||'noerr'); await b.close(); })();
