const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d=>d.accept());
 await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(4500);
 const r = await p.evaluate(async ()=>{ const S=ms=>new Promise(r=>setTimeout(r,ms)), w=ce7(), o={}, bad=[]; const cloud=k=>CalcStore.get(k).then(j=>JSON.parse(j||'null'));
   const strip=x=>{ const y=Object.assign({},x); ['openedAt','countedAt','closedAt','id','time','createdAt'].forEach(k=>delete y[k]); return y; };
   /* القديم ← يوم A، الجديد ← يوم B، بنفس الخطوات */
   const A='01/02/2026', B='02/02/2026';
   w.openCaisse(500,A); w.addCashMove('out',120.5,'r1','p1',false,false,A); w.addCashMove('in',20,'r2','',false,false,A); w.doInventory(410,A); w.closeCaisseDay(A);
   CashW.open(500,B); CashW.addMove('out',120.5,'r1','p1',B); CashW.addMove('in',20,'r2','',B); CashW.inventory(410,B); CashW.close(B);
   const C=JSON.parse(localStorage.getItem('eurv102_cash')), M=JSON.parse(localStorage.getItem('eurv102_cash_moves'));
   const sa=strip(C.find(s=>s.date===A)), sb=strip(C.find(s=>s.date===B)); sa.date=sb.date='X'; o.session = JSON.stringify(sa)===JSON.stringify(sb) || [JSON.stringify(sa),JSON.stringify(sb)];
   const ma=M.filter(m=>m.date===A).map(strip).map(m=>(m.date='X',m)), mb=M.filter(m=>m.date===B).map(strip).map(m=>(m.date='X',m)); o.moves = JSON.stringify(ma)===JSON.stringify(mb) || [JSON.stringify(ma),JSON.stringify(mb)];
   o.keysMove = JSON.stringify(Object.keys(M.find(m=>m.date===A)))===JSON.stringify(Object.keys(M.find(m=>m.date===B)));
   const id=M.find(m=>m.date===B).id; CashW.delMove(id); o.del=!JSON.parse(localStorage.getItem('eurv102_cash_moves')).find(m=>m.id===id);
   await S(800); const cc=await cloud('cash'); o.cloudCash=!!cc.find(s=>s.date===B&&s.closed); const cm=await cloud('cashMoves'); o.cloudMoves=cm.filter(m=>m.date===B).length;
   o.frameCash = !!(w.CASH||[]).find(s=>s.date===B);
   /* المتابعة */
   App.go('c-renewals'); await S(300); App.acts['r8-add'](); await S(100); document.getElementById('r8-name').value='W815'; App.acts['r8-add-ok'](); await S(300);
   const R=JSON.parse(localStorage.getItem('eurv102_renewals')); const n=R.find(c=>c.name==='W815'); o.renewAdd=!!n && /^rt/.test(n.id) && n.status==='active';
   App.acts['r8-done']({dataset:{id:n.id}}); await S(200); o.renewDone=JSON.parse(localStorage.getItem('eurv102_renewals')).find(c=>c.id===n.id).doneDate===w.rtToday();
   App.acts['r8-delall']({dataset:{s:'done'}}); await S(200); o.delDone=!JSON.parse(localStorage.getItem('eurv102_renewals')).find(c=>c.status==='done');
   await S(800); o.cloudRenew = (await cloud('renewals')).length===JSON.parse(localStorage.getItem('eurv102_renewals')).length;
   return o; });
 console.log(JSON.stringify(r)); console.log(errs.join('|')||'noerr'); await b.close(); })();
