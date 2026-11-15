const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d=>d.accept());
 await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(4500);
 const r = await p.evaluate(async ()=>{ const S=ms=>new Promise(r=>setTimeout(r,ms)), o={}, w=ce7();
   const cloud = k => CalcStore.get(k).then(j=>j==null?null:JSON.parse(j));
   o.state = JSON.stringify(Store8.state()); o.frameDelegated = w.fbSet.toString().indexOf('ST.set')>=0; o.frameSynced = w.RP_SYNCED;
   /* 1) عملية من «عملية جديدة» ← السحابة */
   const h0 = (await cloud('history')||[]).length, c0 = await cloud('counters/rec');
   App.go('c-new7'); await S(800); w.document.getElementById('client').value='STORE8 TEST'; w.document.getElementById('paid').value='2000'; App.render(); await S(200);
   App.acts['n7-ok'](); await S(1500);
   const H = await cloud('history'); o.cloudHist = (H||[]).length - h0; o.cloudTop = H && H[0] && H[0].client; o.counter = [c0, await cloud('counters/rec')].join('→');
   /* 2) الصندوق من الصفحة الأصلية ← السحابة */
   const t = Cash.today(); localStorage.setItem('eurv102_cash', JSON.stringify((JSON.parse(localStorage.getItem('eurv102_cash')||'[]')).filter(s=>s.date!==t)));
   App.go('c-caisse'); await S(300); document.getElementById('c8-open').value='321'; App.acts['c8-open'](); await S(1200);
   const C = await cloud('cash'); o.cloudCash = !!(C||[]).find(s=>s.date===t && s.openBal===321);
   /* 3) جهاز آخر كيزيد عملية ← كتوصل للجهاز (localStorage + الإطار + الصفحة) */
   const other = (await cloud('history')).slice(); other.unshift({num:'EUR-2026-9999',date:t,time:'23:59',user:'other',client:'FROM OTHER DEVICE',paid:100,off:100,diff:0,payMode:'cash',ins:'x'});
   await CalcStore.set('history', JSON.stringify(other)); await S(1200);
   o.remoteLocal = JSON.parse(localStorage.getItem('eurv102_h'))[0].client; o.remoteFrame = w.HIST[0] && w.HIST[0].client;
   /* 4) الدمج: جوج أجهزة كتبو فنفس الوقت ← ما كيضيعش حتى واحد */
   const mine = JSON.parse(localStorage.getItem('eurv102_h')); mine.unshift({num:'EUR-2026-9001',date:t,time:'10:00',user:'me',client:'MINE',paid:1,off:1,diff:0,payMode:'cash',ins:'x'});
   const theirs = (await cloud('history')).slice(); theirs.unshift({num:'EUR-2026-9002',date:t,time:'10:01',user:'them',client:'THEIRS',paid:1,off:1,diff:0,payMode:'cash',ins:'x'});
   await CalcStore.set('history', JSON.stringify(theirs)); /* السحابة تبدلات قبل ما يوصل الخبر */
   localStorage.setItem('eurv102_h', JSON.stringify(mine)); await Store8.set('history', mine); await S(1200);
   const M = await cloud('history'); o.merge = ['MINE','THEIRS','FROM OTHER DEVICE','STORE8 TEST'].map(n=>n+':'+!!M.find(h=>h.client===n)).join(',');
   /* 5) الأسعار من صفحة الأسعار ← السحابة */
   App.go('c-prices'); await S(300); const e1=document.querySelector('[data-inp="p8-v"][data-k="e1"]'); e1.value='2333.33'; App.inputs['p8-v'](e1); App.acts['p8-save'](); await S(1200);
   o.cloudPrice = (await cloud('prices')||{}).e1;
   return o; });
 console.log(JSON.stringify(r,null,0)); console.log(errs.join('|')||'noerr'); await b.close(); })();
