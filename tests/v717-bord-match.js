const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d=>d.accept());
 await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(4500);
 // manual op matching the bordereau rows: by police without leading zero, by attest, by plate; one with different price
 await p.evaluate(()=>{ const H=JSON.parse(localStorage.getItem('eurv102_h'));
   H.unshift({num:'EUR-2026-9001',date:'03/10/2026',time:'10:00',user:'tsptanger20',client:'X1',plate:'',police:'9/214907175',attest:'',ins:'t',ds:'2026-10-03',de:'',paid:1630.59,off:1630.59,diff:0,payMode:'cash'});
   H.unshift({num:'EUR-2026-9002',date:'03/10/2026',time:'10:05',user:'tsptanger20',client:'X2',plate:'',police:'',attest:'215609173',ins:'t',ds:'',de:'',paid:400,off:450,diff:-50,payMode:'cash'});
   H.unshift({num:'EUR-2026-9003',date:'04/10/2026',time:'10:05',user:'tsptanger20',client:'X3',plate:'17585 A 50',police:'',attest:'',ins:'t',ds:'',de:'',paid:0,off:1606.2,diff:-1606.2,payMode:'unpaid',unpaid:true});
   Store8.save('history',H); });
 await p.evaluate(()=>{ App.go('c-hist'); }); await p.waitForTimeout(1200);
 await p.setInputFiles('input[data-inp="h7-bord"]','bord.xlsx'); await p.waitForTimeout(2000);
 console.log(await p.evaluate(()=>JSON.stringify({st:Bord8.rows.reduce((o,r)=>(o[r.st]=(o[r.st]||0)+1,o),{}), m:Bord8.rows.slice(0,3).map(r=>r.st+':'+(r.h&&r.h.num)), sel:Object.keys(Bord8.sel).filter(k=>Bord8.sel[k]).length})));
 await p.screenshot({path:'b717-3.png'});
 console.log(errs.join('|')||'noerr'); await b.close(); })();
