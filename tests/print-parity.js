const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({args:['--allow-file-access-from-files']}); const p = await (await b.newContext({viewport:{width:1400,height:900}})).newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d=>d.accept()); p.on('popup', pp=>pp.close());
 await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(4500);
 const r = await p.evaluate(async ()=>{ const S=ms=>new Promise(r=>setTimeout(r,ms)), w=ce7(), o={}; const bad=[];
   localStorage.setItem('eurv102_ci', JSON.stringify({name:'EUR-ASSURANCES SARL',phone:'0539 00 00 00',addr:'Av. X',addr2:'Ksar Sghir',city:'Ksar Sghir',ice:'001234567000089',piecestart:'59766'}));
   const pw = await Print8.load(); o.loaded = !!(pw && pw.fillReceipt);
   const H = JSON.parse(localStorage.getItem('eurv102_h'));
   const cases = [ Object.assign({}, H[0]), {num:'EUR-2026-0042',date:'01/11/2026',time:'10:05',user:'tsptanger20',av:'',client:'TEST RÉCEPTION',plate:'12345-A-6',police:'8/0172675290',attest:'212287762',usage:'Taxi',tarif:'wafa',ins:'6CV Die 3M',ds:'2026-09-04',de:'2026-12-03',paid:2000,off:835.76,diff:1164.24,payMode:'cheque',payRef:'CHQ-9'},
     {num:'EUR-2026-0043',date:'01/11/2026',time:'11:00',user:'u',client:'DEBT',ins:'Moto ≤50CC 3M',ds:'',de:'',paid:300,off:414.71,diff:-114.71,payMode:'cash',payRef:''} ];
   for (const lang of ['ar','fr']) { App.lang=lang; w.setLang && w.setLang(lang); pw.p8Lang(lang);
     for (const h of cases) {
       w.buildRecFromHist(h); const oldR = w.document.querySelector('#receipt .rcwrap').innerHTML; w.document.getElementById('receipt').classList.remove('show');
       pw.CUR={n:'x'}; pw.buildRecFromHist(h); const newR = pw.document.querySelector('#receipt .rcwrap').innerHTML; pw.document.getElementById('receipt').classList.remove('show');
       if (oldR!==newR) bad.push('rec '+lang+' '+h.num);
       const hp=Object.assign({},h,{pieceNum:'0059800'}); w.buildPieceReceiptFromHist(hp); const oldP=w.document.getElementById('piece-wrap').innerHTML; w.document.getElementById('receipt-piece').classList.remove('show');
       pw.buildPieceReceiptFromHist(Object.assign({},hp)); const newP=pw.document.getElementById('piece-wrap').innerHTML; pw.document.getElementById('receipt-piece').classList.remove('show');
       if (oldP!==newP) bad.push('piece '+lang+' '+h.num);
       const oldT=(w.buildRecFromHist(h), w.buildShareTxt()); const newT=(pw.buildRecFromHist(h), pw.buildShareTxt()); if (oldT!==newT) bad.push('share '+lang+' '+h.num);
     } }
   App.lang='ar'; w.setLang && w.setLang('ar');
   /* رقم الـ Pièce: أول مرة كيتعطى ويتحفظ فالعملية، والمرة الثانية نفس الرقم */
   const h0 = JSON.parse(localStorage.getItem('eurv102_h')).find(x=>!x.pieceNum); const before=localStorage.getItem('eurv102_piece');
   await Print8.piece(h0); await S(200); const saved=JSON.parse(localStorage.getItem('eurv102_h')).find(x=>x.num===h0.num); o.pieceAssigned = saved.pieceNum; o.counter=[before, localStorage.getItem('eurv102_piece')].join('→');
   Print8.hide(); await Print8.piece(saved); await S(100); o.pieceStable = pw.document.querySelector('.piece-num').textContent===saved.pieceNum;
   o.overlay = document.getElementById('print8').classList.contains('on'); pw.p8Close(); await S(50); o.closed = !document.getElementById('print8').classList.contains('on');
   return {o, bad}; });
 console.log(JSON.stringify(r));
 await p.evaluate(()=>{ const h=JSON.parse(localStorage.getItem('eurv102_h'))[0]; return Print8.rec(h); }); await p.waitForTimeout(600); await p.screenshot({path:'/tmp/s7/p8_rec_new.png'});
 await p.evaluate(()=>{ Print8.hide(); const w=ce7(), h=JSON.parse(localStorage.getItem('eurv102_h'))[0]; w.buildRecFromHist(h); ce7Overlay(['receipt']); }); await p.waitForTimeout(600); await p.screenshot({path:'/tmp/s7/p8_rec_old.png'});
 console.log(errs.join('|')||'noerr'); await b.close(); })();
