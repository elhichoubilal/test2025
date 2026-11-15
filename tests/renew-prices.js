const { chromium } = require('playwright'); const fs=require('fs');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({viewport:{width:1920,height:1080}})).newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d=>d.accept());
 await p.goto('file:///home/claude/work/_t/d7a.html'); await p.waitForTimeout(3800); await p.evaluate(()=>document.querySelector('.demo-tag')&&document.querySelector('.demo-tag').remove());
 const r = await p.evaluate(async ()=>{ const w=ce7(), S=ms=>new Promise(r=>setTimeout(r,ms)), o={};
   const day=n=>{const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10);};
   w.RT_CLIENTS=[ {id:'a1',name:'URGENT ONE',phone:'0661000001',police:'8/111',attest:'123456',attestType:'def',matricule:'11111-A-1',price:1604.6,type:'renew',requestDate:day(10),status:'active'},
     {id:'a2',name:'WARN TWO',phone:'',police:'8/222',attest:'',attestType:'',matricule:'22222-B-2',price:900,type:'prorog',requestDate:day(4),status:'active'},
     {id:'a3',name:'NEW THREE',phone:'0661000003',police:'8/333',attest:'777',attestType:'prov',price:0,type:'new',requestDate:day(0),status:'active'},
     {id:'a4',name:'DONE FOUR',police:'8/444',price:500,type:'renew',requestDate:day(20),status:'done',doneDate:day(1)} ]; w.svRenewals();
   App.go('c-renewals'); await S(500);
   o.native=!document.getElementById('calc-host').classList.contains('on'); o.groups=[...document.querySelectorAll('.r8-g')].map(g=>g.className.replace('sec-box r8-g ','')+':'+g.querySelectorAll('.r8-r').length).join(',');
   o.kpi=[...document.querySelectorAll('.r8 .sec-k b')].map(x=>x.textContent).join('|');
   App.acts['r8-done']({dataset:{id:'a2'}}); await S(200); o.afterDone=w.RT_CLIENTS.find(c=>c.id==='a2').status;
   App.acts['r8-undo']({dataset:{id:'a2'}}); await S(200); o.afterUndo=JSON.parse(localStorage.getItem('eurv102_renewals')).find(c=>c.id==='a2').status;
   R8.q='three'; App.render(); await S(100); o.search=document.querySelectorAll('.r8-r').length; R8.q=''; App.render();
   // pay -> c-new7 -> confirm -> moves to done
   App.acts['r8-pay']({dataset:{id:'a1'}}); await S(1800);
   o.payPage=App.page; o.payClient=(document.getElementById('n7-client')||{}).value; o.payPrice=n7Off(w);
   document.getElementById('n7-paid').value='2000'; App.inputs['n7-paid'](document.getElementById('n7-paid')); App.acts['n7-ok'](); await S(700);
   o.paidStatus=JSON.parse(localStorage.getItem('eurv102_renewals')).find(c=>c.id==='a1').status;
   // add + edit + delete
   App.go('c-renewals'); await S(300); App.acts['r8-add'](); await S(100); document.getElementById('r8-name').value='MANUAL ADD'; document.getElementById('r8-price').value='750'; App.acts['r8-add-ok'](); await S(200);
   const m=JSON.parse(localStorage.getItem('eurv102_renewals')).find(c=>c.name==='MANUAL ADD'); o.added=!!m&&m.status==='active'&&m.price===750;
   App.acts['r8-edit']({dataset:{id:m.id}}); await S(100); document.getElementById('r8-name').value='MANUAL EDIT'; App.acts['r8-edit-ok']({dataset:{id:m.id}}); await S(200);
   o.edited=!!JSON.parse(localStorage.getItem('eurv102_renewals')).find(c=>c.name==='MANUAL EDIT');
   App.acts['r8-del']({dataset:{id:m.id}}); await S(200); o.deleted=!JSON.parse(localStorage.getItem('eurv102_renewals')).find(c=>c.id===m.id);
   return o; });
 console.log(JSON.stringify(r));
 await p.evaluate(()=>App.go('c-renewals')); await p.waitForTimeout(400); await p.screenshot({path:'/tmp/s7/r8.png'});
 // import Excel
 const b64=fs.readFileSync('/home/claude/work/_t/bord.xlsx').toString('base64');
 await p.evaluate(([b64])=>{ const bin=atob(b64),u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i); window.__X=new File([u],'bord.xlsx'); const w=ce7(); if(!w.XLSX&&window.XLSX) w.XLSX=window.XLSX; },[b64]);
 const hasX = await p.evaluate(()=>!!(window.XLSX||ce7().XLSX));
 if (hasX) { const n0=await p.evaluate(()=>JSON.parse(localStorage.getItem('eurv102_renewals')).length); await p.evaluate(()=>r8Import(window.__X)); await p.waitForTimeout(1500);
   const im = await p.evaluate(()=>({modal:!!document.querySelector('.r8-imp'), rows:document.querySelectorAll('.r8-ir').length, checked:document.querySelectorAll('.r8-ir input:checked').length}));
   await p.screenshot({path:'/tmp/s7/r8_imp.png'}); await p.evaluate(()=>App.acts['r8-imp-ok']()); await p.waitForTimeout(500);
   console.log('import', JSON.stringify(im), 'added', await p.evaluate(n0=>JSON.parse(localStorage.getItem('eurv102_renewals')).length-n0, n0)); } else console.log('no XLSX in sandbox');
 // prices
 const pr = await p.evaluate(async ()=>{ const w=ce7(), S=ms=>new Promise(r=>setTimeout(r,ms)); App.go('c-prices'); await S(400); const o={native:!document.getElementById('calc-host').classList.contains('on'), fields:document.querySelectorAll('[data-inp="p8-v"]').length};
   const e1=document.querySelector('[data-inp="p8-v"][data-k="e1"]'); e1.value='2300'; App.inputs['p8-v'](e1); o.dirty=Object.keys(P8.dirty).join(); App.acts['p8-save'](); await S(300);
   o.stored=localStorage.getItem('eurv102_p_e1'); o.engNew=Eng.gp('e1'); w.setTarif('wafa'); w.setType('voiture'); w.setFuel('e'); w.setCVVal('cv-grid','cv',6,[4,5,6,7,8,9,10,11,12,13,14]); w.setDur(12); w.setBM('none'); o.oldOff=w.getOff(); o.newOff=Eng.off(n8St(w));
   localStorage.removeItem('eurv102_p_e1'); return o; });
 console.log('prices', JSON.stringify(pr)); await p.evaluate(()=>App.go('c-prices')); await p.waitForTimeout(300); await p.screenshot({path:'/tmp/s7/p8.png'});
 console.log(errs.join('|')||'noerr'); await b.close(); })();
