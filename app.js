(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PHONE = '79188317111';

  /* ---------- год в подвале ---------- */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- портрет: если файла нет — показываем рамку-заглушку ---------- */
  var pImg = document.getElementById('portraitImg');
  var pWrap = document.getElementById('portrait');
  if (pImg && pWrap) {
    pImg.addEventListener('error', function () { pWrap.classList.add('no-photo'); });
    if (pImg.complete && pImg.naturalWidth === 0) pWrap.classList.add('no-photo');
  }

  /* ---------- шапка + прогресс прокрутки ---------- */
  var hdr = document.getElementById('hdr');
  var bar = document.getElementById('bar');
  var glow = document.getElementById('glow');
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;

    if (hdr) hdr.classList.toggle('stuck', y > 40);
    if (bar) bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (glow && !reduced && y < window.innerHeight * 1.4) {
      glow.style.transform = 'translate3d(0,' + (y * 0.18) + 'px,0)';
    }
    paintSteps(y);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });

  /* ---------- линия прогресса в блоке «Порядок работы» ---------- */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  var fill = document.getElementById('fill');
  var stepsBox = document.getElementById('steps');

  function paintSteps() {
    if (!stepsBox || !fill || !steps.length) return;
    var anchor = window.innerHeight * 0.55;
    var box = stepsBox.getBoundingClientRect();
    var last = steps[steps.length - 1].getBoundingClientRect();
    var total = (last.top + last.height * 0.5) - (box.top + 14);
    var passed = anchor - (box.top + 14);
    var h = Math.max(0, Math.min(passed, total));
    fill.style.height = h + 'px';

    steps.forEach(function (s) {
      var r = s.getBoundingClientRect();
      s.classList.toggle('on', r.top < anchor + 40);
    });
  }

  /* ---------- появление блоков при прокрутке ---------- */
  var targets = document.querySelectorAll('.rv, .mask');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0 });
    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
  } else {
    Array.prototype.forEach.call(targets, function (t) { t.classList.add('in'); });
  }

  /* герой показываем сразу, не дожидаясь прокрутки */
  window.addEventListener('load', function () {
    document.querySelectorAll('.hero .rv, .hero .mask').forEach(function (el) {
      el.classList.add('in');
    });
    onScroll();
  });
  setTimeout(function () {
    document.querySelectorAll('.hero .rv, .hero .mask').forEach(function (el) {
      el.classList.add('in');
    });
  }, 60);

  /* ---------- мобильное меню ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.classList.toggle('on', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        burger.classList.remove('on');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---------- форма записи ---------- */
  var form = document.getElementById('bookForm');
  if (!form) return;

  var panes = Array.prototype.slice.call(form.querySelectorAll('.pane'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('#dots i'));
  var idx = 0;

  function show(n) {
    idx = Math.max(0, Math.min(n, panes.length - 1));
    panes.forEach(function (p, i) { p.classList.toggle('on', i === idx); });
    dots.forEach(function (d, i) { d.classList.toggle('on', i <= idx && idx < 3); });
    var first = panes[idx].querySelector('input, textarea');
    if (first && idx > 0 && window.innerWidth > 860) {
      try { first.focus({ preventScroll: true }); } catch (e) { /* no-op */ }
    }
  }

  function nudge(pane) {
    pane.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' },
       { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }],
      { duration: 320, easing: 'ease-in-out' }
    );
  }

  form.addEventListener('click', function (e) {
    var next = e.target.closest('[data-next]');
    var prev = e.target.closest('[data-prev]');
    if (next) {
      var group = idx === 0 ? 'stage' : 'urg';
      if (!form.querySelector('input[name="' + group + '"]:checked')) {
        nudge(panes[idx]);
        return;
      }
      show(idx + 1);
    }
    if (prev) show(idx - 1);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = (form.nm.value || '').trim();
    var tel = (form.tel.value || '').trim();
    if (!name || !tel) { nudge(panes[idx]); return; }

    var stage = form.querySelector('input[name="stage"]:checked');
    var urg = form.querySelector('input[name="urg"]:checked');
    var desc = (form.desc.value || '').trim();

    var lines = [
      'Здравствуйте, Ян Эдуардович. Запись на консультацию с сайта.',
      '',
      'Имя: ' + name,
      'Телефон: ' + tel
    ];
    if (stage) lines.push('Стадия: ' + stage.value);
    if (urg) lines.push('Срочность: ' + urg.value);
    if (desc) lines.push('', 'Ситуация: ' + desc);

    var url = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(lines.join('\n'));
    window.open(url, '_blank', 'noopener');
    show(3);
  });
})();
