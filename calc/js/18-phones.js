/* ═══ EUR assurance — 18-phones.js ═══  (v5)
   📞 رقم الزبون من كاع مصادر RenewPro (لائحة التجديد، قاعدة الأرقام، الديون، الأرشيف) بالبوليصة ولا الماتريكول.
   كيتعرض فقط (فالسجل ومتابعة التجديدات)؛ ما كيبدل والو فالبيانات ولا فالحساب. */
var RP_PH_CACHE = {};
function rpPhone(police, plate) {
  var k = String(police || '') + '|' + String(plate || ''); if (k === '|') return null;
  if (RP_PH_CACHE[k] !== undefined) return RP_PH_CACHE[k];
  var r = null;
  try { var P = window.parent; if (P && P !== window && typeof P.pfFindJSON === 'function') { var o = JSON.parse(P.pfFindJSON(police, plate) || '{}'); if (o && o.p1) r = o; } } catch (e) { r = null; }
  RP_PH_CACHE[k] = r; setTimeout(function () { delete RP_PH_CACHE[k]; }, 60000);
  return r;
}
function rpPhoneChip(police, plate, cls) {
  var r = rpPhone(police, plate); if (!r) return '';
  var p = String(r.p1), wa = p.replace(/[^0-9]/g, ''); if (wa.charAt(0) === '0') wa = '212' + wa.slice(1);
  return '<span class="' + (cls || 'hrow-ph') + '">📞 <a href="tel:' + escHtml(p) + '" onclick="event.stopPropagation()">' + escHtml(p) + '</a>'
    + ' <a href="https://wa.me/' + wa + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬</a></span>';
}
document.addEventListener('DOMContentLoaded', function () {
  var st = document.createElement('style');
  st.textContent = '.hrow-ph{direction:ltr;unicode-bidi:isolate;font-size:.78rem;color:var(--text2);white-space:nowrap}.hrow-ph a{color:inherit;text-decoration:none;font-weight:700}';
  document.head.appendChild(st);
});
