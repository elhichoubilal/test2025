const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d=>d.accept());
 await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(4500);
 await p.evaluate(()=>{ const i=document.createElement('input'); i.type='file'; i.id='tin'; document.body.appendChild(i); i.onchange=()=>{ pdf7Handle(i.files[0]); i.value=''; }; });
 // CAT op + ristourne via PDF
 await p.setInputFiles('#tin','a2.pdf'); await p.waitForTimeout(6500); await p.fill('#q7-paid','636.67'); await p.dispatchEvent('#q7-paid','input'); await p.click('[data-act="q7-ok"]'); await p.waitForTimeout(2000); await p.evaluate(()=>{Q7.done=null;Modal.close()});
 await p.setInputFiles('#tin','a4.pdf'); await p.waitForTimeout(6500); await p.click('[data-act="q7-ok"]'); await p.waitForTimeout(2000); await p.evaluate(()=>{Q7.done=null;Modal.close()});
 // direct without company → error, then CAT
 const dir = await p.evaluate(async ()=>{ const S=ms=>new Promise(r=>setTimeout(r,ms)); const w=ce7(); App.go('c-new7'); await S(800); if(!w.DIRECT_MODE) w.toggleDirect(); n7set(w,'client','DIRECT TEST'); n7set(w,'direct-desc','Frais'); n7set(w,'direct-amount','50'); w.DIRECT_CIE=''; const r1=Ops.direct(w); w.DIRECT_CIE='cat'; const r2=Ops.direct(w); return {err:r1.err, ins:r2.h&&r2.h.ins, cieAfter:w.DIRECT_CIE}; });
 console.log('direct', JSON.stringify(dir));
 // history tabs
 const hist = await p.evaluate(async ()=>{ const S=ms=>new Promise(r=>setTimeout(r,ms)); App.go('c-hist'); await S(800); H7.f='all'; App.render(); await S(300); const tabs=[...document.querySelectorAll('.h7-tab')].map(t=>t.innerText.replace(/\s+/g,' ')); const out={tabs};
   for (const k of ['cat','rist']) { document.querySelector('.h7-tab.'+k).click(); await S(300); out[k]=[...document.querySelectorAll('.h7-tbl tbody tr')].map(r=>r.cells[2].innerText.replace(/\s+/g,' ')).slice(0,5); }
   document.querySelector('.h7-tab.all').click(); await S(200); return out; });
 console.log('hist', JSON.stringify(hist,null,1));
 await p.evaluate(()=>{ H7.cie='cat'; App.render(); }); await p.waitForTimeout(300); await p.screenshot({path:'h717-cat.png'}); await p.evaluate(()=>{ H7.cie=''; App.render(); });
 // bordereau
 await p.setInputFiles('input[data-inp="h7-bord"]','bord.xlsx'); await p.waitForTimeout(2000);
 const b1 = await p.evaluate(()=>({rows:Bord8.rows&&Bord8.rows.length, st:Bord8.rows&&Bord8.rows.reduce((o,r)=>(o[r.st]=(o[r.st]||0)+1,o),{}), sample:Bord8.rows&&Bord8.rows.slice(0,2).map(r=>[r.police,r.prime,r.ds,r.emis,r.attest].join('|'))}));
 console.log('bord1', JSON.stringify(b1)); await p.screenshot({path:'b717-1.png'});
 const n0 = await p.evaluate(()=>JSON.parse(localStorage.getItem('eurv102_h')).length);
 await p.click('[data-act="b8-add"]'); await p.waitForTimeout(2500);
 const b2 = await p.evaluate(()=>({st:Bord8.rows.reduce((o,r)=>(o[r.st]=(o[r.st]||0)+1,o),{}), n:JSON.parse(localStorage.getItem('eurv102_h')).length, top:(h=>({num:h.num,date:h.date,client:h.client,police:h.police,ins:h.ins,off:h.off,paid:h.paid,diff:h.diff,unpaid:h.unpaid,payMode:h.payMode,ds:h.ds,de:h.de}))(JSON.parse(localStorage.getItem('eurv102_h'))[0]) }));
 console.log('bord2 before', n0, JSON.stringify(b2));
 await p.evaluate(()=>Modal.close());
 // re-import → no duplicates
 await p.setInputFiles('input[data-inp="h7-bord"]','bord.xlsx'); await p.waitForTimeout(2000);
 console.log('bord3', await p.evaluate(()=>JSON.stringify(Bord8.rows.reduce((o,r)=>(o[r.st]=(o[r.st]||0)+1,o),{}))));
 await p.screenshot({path:'b717-2.png'});
 await p.evaluate(()=>Modal.close());
 // pay one imported unpaid via payUnpaid path availability
 console.log('unpaidTab', await p.evaluate(async ()=>{ H7.f='unpaid'; H7.cie=''; App.render(); await new Promise(r=>setTimeout(r,300)); return document.querySelectorAll('[data-act="h7-pay"]').length; }));
 console.log(errs.join('|')||'noerr'); await b.close(); })();
