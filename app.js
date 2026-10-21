(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PHONE = '79188317111';
  document.documentElement.classList.add('js');

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
  var heroSeal = document.getElementById('heroSeal');
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;

    if (hdr) hdr.classList.toggle('stuck', y > 40);
    if (bar) bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (!reduced && y < window.innerHeight * 1.4) {
      if (glow) glow.style.transform = 'translate3d(0,' + (y * 0.18) + 'px,0)';
      if (heroSeal) heroSeal.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)';
    }
    paintSteps(y);
    paintManifesto();
    ticking = false;
  }

  function requestPaint() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }
  window.addEventListener('scroll', requestPaint, { passive: true });
  window.addEventListener('resize', requestPaint, { passive: true });

  /* ---------- линия прогресса в блоке «Порядок работы» ---------- */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  var fill = document.getElementById('fill');
  var stepsBox = document.getElementById('steps');

  function paintSteps() {
    if (!stepsBox || !fill || !steps.length) return;
    // сначала все замеры, потом все изменения: иначе браузер
    // пересчитывает раскладку по нескольку раз за кадр
    var anchor = window.innerHeight * 0.55;
    var box = stepsBox.getBoundingClientRect();
    var rects = steps.map(function (s) { return s.getBoundingClientRect(); });
    var last = rects[rects.length - 1];
    var total = (last.top + last.height * 0.5) - (box.top + 14);
    var h = Math.max(0, Math.min(anchor - (box.top + 14), total));

    fill.style.height = h + 'px';
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.toggle('on', rects[i].top < anchor + 40);
    }
  }

  /* ---------- манифест: слова загораются по мере чтения ---------- */
  var man = document.getElementById('manifesto');
  var mText = man && man.querySelector('.m-text');
  var mStage = man && man.querySelector('.m-stage');
  var words = [];
  var litCount = -1;

  if (mText && !reduced) {
    // каждое слово — в свой span; неразрывные пробелы не трогаем,
    // поэтому предлог загорается вместе со своим словом
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.nodeValue.split(/([ \t\r\n]+)/).forEach(function (part) {
            if (!part) return;
            if (/^[ \t\r\n]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'w';
            w.textContent = part;
            frag.appendChild(w);
            words.push(w);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1) {
          wrap(c);
        }
      });
    })(mText);
  }

  function paintManifesto() {
    if (!mStage || !words.length) return;
    var r = mStage.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    var span = r.height - window.innerHeight;
    var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
    man.style.setProperty('--draw', Math.min(1, p / 0.12).toFixed(3));
    var t = Math.min(1, Math.max(0, (p - 0.1) / 0.72));
    var n = Math.round(t * words.length);
    if (n !== litCount) {
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
      litCount = n;
      man.classList.toggle('lit', n === words.length);
    }
  }

  /* ---------- настольная лампа: свет идёт за курсором с лёгкой инерцией ---------- */
  var lamp = document.getElementById('lamp');
  if (lamp && !reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var lx = 0, ly = 0, tx = 0, ty = 0, lampRaf = 0;
    var lampStep = function () {
      lx += (tx - lx) * 0.12;
      ly += (ty - ly) * 0.12;
      lamp.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0)';
      lampRaf = (Math.abs(tx - lx) > 0.4 || Math.abs(ty - ly) > 0.4) ? window.requestAnimationFrame(lampStep) : 0;
    };
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!lamp.classList.contains('on')) { lx = tx; ly = ty; lamp.classList.add('on'); }
      if (!lampRaf) lampRaf = window.requestAnimationFrame(lampStep);
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { lamp.classList.remove('on'); });
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
