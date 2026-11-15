const vm=require('vm'),fs=require('fs');const ctx={console};vm.createContext(ctx);
const R='/home/claude/work/RenewPro-v717/calc/js/';
vm.runInContext(fs.readFileSync(R+'14-pdf-client-import.js','utf8'),ctx);vm.runInContext(fs.readFileSync(R+'14b-pdf-docs.js','utf8'),ctx);
const d=require('./pdfitems.json');
for(const k of ['a0','a1','a2','a3','a4','a5']){ ctx.items=d[k]; vm.runInContext(`var lines=buildPageLines(items);var f=extractInsuranceFieldsFromLines(lines);var f2=extractTemplate2Fields(items,lines);['client','police','attest','ds','de','price','plate'].forEach(function(k){if(!f[k]&&f2[k])f[k]=f2[k];});var before=JSON.stringify(f);f=pdfRefine(items,lines,f);`,ctx);
 console.log(k,'BEFORE',vm.runInContext('before',ctx)); console.log(k,'AFTER ',JSON.stringify(ctx.f),'\n   DOC',JSON.stringify(ctx.PDF_DOC)); }
