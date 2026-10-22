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
    // сначала все замеры, потом все изменения: иначе браузер
    // пересчитывает вёрстку по нескольку раз за один кадр
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var vh = window.innerHeight;
    var h = document.documentElement.scrollHeight - vh;
    var st = measureSteps(vh);
    var mf = measureManifesto(vh);

    if (hdr) hdr.classList.toggle('stuck', y > 40);
    // transform, а не width: полоска двигается без пересчёта вёрстки
    if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0).toFixed(4) + ')';
    if (!reduced && y < vh * 1.4) {
      if (glow) glow.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
      if (heroSeal) heroSeal.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)';
    }
    applySteps(st);
    applyManifesto(mf);
    ticking = false;
  }

  function requestPaint() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }

  /* ---------- плавная инерционная прокрутка ---------- */
  // Колесо мыши двигает страницу скачками примерно по 100 px, и вместе
  // с ней скачут все эффекты, привязанные к прокрутке. Lenis превращает
  // скачки в плавное движение с инерцией. На сенсорных экранах прокрутка
  // остаётся родной — у неё своя инерция, трогать её не нужно.
  var lenis = null;
  if (window.Lenis && !reduced && window.matchMedia('(pointer: fine)').matches) {
    lenis = new window.Lenis({
      autoRaf: true,
      lerp: 0.085,          // мягкость: чем меньше, тем дольше страница «доплывает»
      smoothWheel: true,
      wheelMultiplier: 1
    });
    // эффекты пересчитываются в том же кадре, что и прокрутка, —
    // без отставания на кадр, поэтому параллакс не дрожит
    lenis.on('scroll', onScroll);

    // Переходы по меню. Встроенная обработка ссылок в Lenis не отменяет
    // обычный переход браузера — страница прыгала к разделу мгновенно.
    // Здесь прыжок отменяется, и страница плывёт к разделу с мягким
    // разгоном и торможением. Отступ под шапку Lenis берёт из стилей.
    // Ссылку «перейти к содержанию» не трогаем: ей важно перевести фокус.
    var easeInOutCubic = function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.classList.contains('skip')) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.3, easing: easeInOutCubic });
      if (window.history && history.replaceState) history.replaceState(null, '', id);
    });
  } else {
    window.addEventListener('scroll', requestPaint, { passive: true });
  }
  window.addEventListener('resize', requestPaint, { passive: true });

  /* ---------- линия прогресса в блоке «Порядок работы» ---------- */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  var fill = document.getElementById('fill');
  var stepsBox = document.getElementById('steps');

  function measureSteps(vh) {
    if (!stepsBox || !fill || !steps.length) return null;
    var box = stepsBox.getBoundingClientRect();
    if (box.bottom < -vh || box.top > vh * 2) return null; // далеко от экрана — не считаем
    var anchor = vh * 0.55;
    var rects = steps.map(function (s) { return s.getBoundingClientRect(); });
    var last = rects[rects.length - 1];
    var track = box.height - 28;
    var total = (last.top + last.height * 0.5) - (box.top + 14);
    var h = Math.max(0, Math.min(anchor - (box.top + 14), total));
    return {
      scale: track > 0 ? h / track : 0,
      on: rects.map(function (r) { return r.top < anchor + 40; })
    };
  }

  function applySteps(st) {
    if (!st) return;
    // линия растягивается масштабом, а не высотой — без пересчёта вёрстки
    fill.style.transform = 'scaleY(' + st.scale.toFixed(4) + ')';
    for (var i = 0; i < steps.length; i++) steps[i].classList.toggle('on', st.on[i]);
  }

  /* ---------- манифест: слова загораются по мере чтения ---------- */
  var man = document.getElementById('manifesto');
  var mText = man && man.querySelector('.m-text');
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

  // Текст больше не закрепляется на экране: раньше страница почти
  // тысячу пикселей прокрутки стояла на месте и казалась зависшей.
  // Теперь абзац едет вместе со страницей, а слова загораются, пока он
  // проходит зону чтения — от 85% высоты экрана до 40%.
  var lastDraw = -1;

  function measureManifesto(vh) {
    if (!mText || !words.length) return null;
    var r = mText.getBoundingClientRect();
    if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return null;
    var start = vh * 0.85;
    var end = vh * 0.4;
    var p = (start - r.top) / ((start - end) + r.height);
    // эмблема стоит примерно на 144 px выше абзаца и прорисовывается раньше
    var draw = (vh * 0.95 - (r.top - 144)) / (vh * 0.3);
    return {
      p: Math.min(1, Math.max(0, p)),
      draw: Math.min(1, Math.max(0, draw))
    };
  }

  function applyManifesto(mf) {
    if (!mf) return;
    if (Math.abs(mf.draw - lastDraw) > 0.004) {
      man.style.setProperty('--draw', mf.draw.toFixed(3));
      lastDraw = mf.draw;
    }
    var n = Math.round(Math.min(1, Math.max(0, (mf.p - 0.04) / 0.9)) * words.length);
    if (n !== litCount) {
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
      litCount = n;
      man.classList.toggle('lit', n === words.length);
    }
  }

  /* ---------- вечные анимации обложки спят, когда её не видно ---------- */
  var heroEl = document.querySelector('.hero');
  if (heroEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { heroEl.classList.toggle('hero-off', !e.isIntersecting); });
    }).observe(heroEl);
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
    }, { rootMargin: '0px 0px 8% 0px', threshold: 0 });
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
      if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        burger.classList.remove('on');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        if (lenis) lenis.start();
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
