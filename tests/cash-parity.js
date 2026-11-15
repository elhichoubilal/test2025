const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1920,height:1080}})).newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d=>d.accept());
 await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(3800); await p.evaluate(()=>document.querySelector('.demo-tag')&&document.querySelector('.demo-tag').remove());
 const r = await p.evaluate(async ()=>{ const w=ce7(), d=w.document, S=ms=>new Promise(r=>setTimeout(r,ms)); let n=0; const bad=[];
   const cmp=(l,a,b2)=>{ n++; if(a!==b2 && !(typeof a==='number'&&typeof b2==='number'&&Math.abs(a-b2)<1e-9)) { if(bad.length<30) bad.push(l+' old='+JSON.stringify(a)+' new='+JSON.stringify(b2)); } };
   /* بيانات عشوائية: 40 يوم */
   const days=[]; for(let i=0;i<40;i++){ const x=new Date(); x.setDate(x.getDate()-i*3); days.push(x.toLocaleDateString('fr-FR')); }
   const H=JSON.parse(localStorage.getItem('eurv102_h')||'[]'), C=[], M=[]; let k=5000;
   days.forEach((dt,i)=>{ if(i%5!==4) C.push({date:dt,openBal:Math.round(Math.random()*3000*100)/100,openedBy:'x',counted:i%3?Math.round(Math.random()*9000*100)/100:null,closed:i%4===0});
     for(let j=0;j<1+i%4;j++){ const off=Math.round(Math.random()*4000*100)/100, paid=Math.round((off+(Math.random()-.4)*800)*100)/100; H.push({num:'EUR-2026-'+(k++),date:dt,time:String(8+j).padStart(2,'0')+':'+String(10+i%50).padStart(2,'0'),user:'u',client:'C'+(i%9),plate:'',ins:'t',paid:paid,off:off,diff:Math.round((paid-off)*100)/100,payMode:['cash','cheque','tpe','cash','unpaid'][j%5]}); }
     for(let j=0;j<i%3;j++) M.push({id:'M'+(k++),date:dt,time:'1'+j+':00',type:j%2?'in':'out',amount:Math.round(Math.random()*500*100)/100,reason:'r',person:'p'}); });
   localStorage.setItem('eurv102_h',JSON.stringify(H)); localStorage.setItem('eurv102_cash',JSON.stringify(C)); localStorage.setItem('eurv102_cash_moves',JSON.stringify(M));
   days.forEach(dt=>{ cmp('sess '+dt, JSON.stringify(w.getSession(dt)), JSON.stringify(Cash.session(dt))); cmp('rev '+dt, w.getCashRevenueForDate(dt), Cash.revenue(dt)); cmp('net '+dt, w.getMovesNetForDate(dt), Cash.movesNet(dt)); cmp('exp '+dt, w.getExpectedBalance(dt), Cash.expected(dt)); cmp('ops '+dt, w.getAllOpsForDate(dt).length, Cash.allOps(dt).length); });
   /* اليوميات: الرصيد ديال كل سطر من الجدول القديم */
   w.renderJournalPage(); const oldBal=[...d.querySelectorAll('#journal-body tr')].map(tr=>tr.children[4].textContent.trim()); const nw=Cash.journal().map(r=>w.fmt(r.bal)+' DH');
   cmp('journal rows', oldBal.length, nw.length); oldBal.forEach((v,i)=>cmp('journal bal '+i, v, nw[i]));
   /* التقارير: 4 فترات */
   for (const per of ['day','week','month','year']) { w.REP_PERIOD=per; w.renderReportsPage(); const v=[...d.querySelectorAll('#reports-body .cs-v')].map(x=>x.textContent.trim()); const R=Cash.report(per);
     cmp(per+' n', v[0], String(R.n)); cmp(per+' cl', v[1], String(R.clients)); cmp(per+' off', v[2], w.fmt(R.off)+' DH'); cmp(per+' paid', v[3], w.fmt(R.paid)+' DH'); cmp(per+' ref', v[4], w.fmt(R.refund)+' DH'); cmp(per+' net', v[5], w.fmt(R.net)+' DH'); }
   /* الواجهة: الصندوق ديال اليوم ← فتح، حركة، جرد، إغلاق */
   const t=Cash.today(); localStorage.setItem('eurv102_cash',JSON.stringify(C.filter(s=>s.date!==t)));
   App.go('c-caisse'); await S(400); const ui={ native: !document.getElementById('calc-host').classList.contains('on'), openBox: !!document.querySelector('.c8-open') };
   document.getElementById('c8-open').value='500'; App.acts['c8-open'](); await S(200);
   document.getElementById('c8-mamt').value='120.5'; document.getElementById('c8-mrea').value='سلفة'; App.acts['c8-move'](); await S(200);
   App.acts['c8-mt']({dataset:{v:'in'}}); document.getElementById('c8-mamt').value='20'; document.getElementById('c8-mper').value='Ali'; App.acts['c8-move'](); await S(200);
   const exp=Cash.expected(t); cmp('ui exp=old', w.getExpectedBalance(t), exp);
   document.getElementById('c8-count').value=String(exp+10); App.acts['c8-count'](); await S(200);
   ui.status=(document.querySelector('.c8-st')||{}).textContent; App.acts['c8-close'](); await S(200);
   const s=w.getSession(t); ui.sess={open:s.openBal, counted:s.counted, closed:s.closed, by:s.closedBy}; ui.moves=w.getMovesForDate(t).length; ui.locked=!document.getElementById('c8-mamt');
   App.go('c-journal'); await S(300); ui.journal=document.querySelectorAll('.c8-jt tbody tr').length;
   App.go('c-reports'); await S(300); ui.rep=document.querySelectorAll('.c8 .sec-k').length;
   return {n,bad,ui}; });
 console.log('checks', r.n, 'mismatches', r.bad.length); r.bad.forEach(x=>console.log('  ✗',x)); console.log(JSON.stringify(r.ui));
 await p.evaluate(()=>App.go('c-caisse')); await p.waitForTimeout(400); await p.screenshot({path:'/tmp/s7/c8_caisse.png'});
 await p.evaluate(()=>{C8.t=Cash.yesterday(); App.render();}); await p.waitForTimeout(300); await p.screenshot({path:'/tmp/s7/c8_yest.png'});
 await p.evaluate(()=>App.go('c-journal')); await p.waitForTimeout(300); await p.screenshot({path:'/tmp/s7/c8_journal.png'});
 await p.evaluate(()=>App.go('c-reports')); await p.waitForTimeout(300); await p.evaluate(()=>App.acts['c8-rp']({dataset:{v:'month'}})); await p.waitForTimeout(300); await p.screenshot({path:'/tmp/s7/c8_reports.png'});
 console.log(errs.join('|')||'noerr'); await b.close(); })();
