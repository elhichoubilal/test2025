/* ═══ EUR assurance — date-fix.js ═══
   حقول التاريخ الفارغة: بعض المتصفحات بالعربية تعرض «يوم/شهر/سنة» بحروف مقلوبة («موي / رهش / ةنس»).
   نخفي نص المتصفح حين يكون الحقل فارغاً ونعرض مكانه نصاً سليماً. عند وجود تاريخ يظهر كالعادة. */
(function () {
  function ph() { return (typeof LANG !== 'undefined' && LANG === 'fr') ? 'jj/mm/aaaa' : 'يوم/شهر/سنة'; }
  function sync() {
    var l = document.querySelectorAll('input[type="date"]'), p = ph();
    for (var i = 0; i < l.length; i++) { var e = l[i], empty = !e.value;
      if (e.classList.contains('dt-empty') !== empty) e.classList.toggle('dt-empty', empty);
      if (e.getAttribute('data-ph') !== p) e.setAttribute('data-ph', p); }
  }
  document.addEventListener('input', sync, true); document.addEventListener('change', sync, true);
  document.addEventListener('DOMContentLoaded', sync); setInterval(sync, 600);
})();
