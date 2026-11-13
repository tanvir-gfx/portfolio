(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* i18n */
  function detect() {
    let s = null;
    try { s = localStorage.getItem('lang'); } catch (e) {}
    if (s === 'bn' || s === 'en') return s;
    const n = (navigator.language || '').toLowerCase();
    return n && !n.startsWith('bn') ? 'en' : 'bn';
  }
  let lang = detect();
  const t = key => key.split('.').reduce((o, k) => (o ? o[k] : undefined), translations[lang]) ?? key;

  function applyLanguage(l) {
    lang = l;
    document.documentElement.lang = l;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-ph]').forEach(el => { el.placeholder = t(el.dataset.ph); });
    const b = $('#langToggle');
    b.textContent = l === 'bn' ? 'EN' : 'বাং';
    b.setAttribute('aria-label', l === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন');
    renderCards();
  }
  $('#langToggle').addEventListener('click', () => {
    const n = lang === 'bn' ? 'en' : 'bn';
    try { localStorage.setItem('lang', n); } catch (e) {}
    applyLanguage(n);
  });

  /* Header, menu, tools dropdown */
  const header = $('#header'), menuBtn = $('#menuBtn'), menuIcon = $('#menuIcon');
  function setMenu(open) {
    header.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuIcon.setAttribute('href', open ? '#i-x' : '#i-menu');
  }
  menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('open')));
  $$('#nav a[href^="#"]').forEach(a => a.addEventListener('click', () => setMenu(false)));
  const sub = $('.has-sub'), toolsBtn = $('#toolsBtn');
  toolsBtn.addEventListener('click', e => {
    e.stopPropagation();
    const o = sub.classList.toggle('open');
    toolsBtn.setAttribute('aria-expanded', String(o));
  });
  document.addEventListener('click', e => { if (!sub.contains(e.target)) { sub.classList.remove('open'); toolsBtn.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); sub.classList.remove('open'); } });

  const toTop = $('#toTop');
  function onScroll() {
    header.classList.toggle('scrolled', scrollY > 30);
    toTop.classList.toggle('show', scrollY > 500);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* Active link + reveal + skill bars */
  const links = $$('[data-link]');
  if ('IntersectionObserver' in window) {
    const secObs = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) links.forEach(a => a.classList.toggle('active', a.dataset.link === en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(s => secObs.observe(s));

    const revObs = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      $$('.bar i', en.target).forEach(i => { i.style.width = i.dataset.level + '%'; });
      revObs.unobserve(en.target);
    }), { threshold: 0.15 });
    $$('.reveal').forEach(el => revObs.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
    $$('.bar i').forEach(i => { i.style.width = i.dataset.level + '%'; });
  }

  /* Projects carousel */
  const track = $('#track'), viewport = $('#viewport'), dotsEl = $('#dots');
  let idx = 0, max = 0, step = 0, timer;
  const perView = () => (innerWidth >= 1000 ? 3 : innerWidth >= 700 ? 2 : 1);

  function renderCards() {
    track.innerHTML = '';
    PROJECTS.forEach(p => {
      const a = document.createElement('a');
      a.className = 'card'; a.href = p.link; a.target = '_blank'; a.rel = 'noopener';
      const wrap = document.createElement('div'); wrap.className = 'card-img';
      const img = document.createElement('img');
      img.src = p.image; img.alt = p.title[lang]; img.loading = 'lazy'; img.width = 400; img.height = 300;
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = t('cat.' + p.cat);
      const h = document.createElement('h3'); h.textContent = p.title[lang];
      wrap.append(img, tag); a.append(wrap, h); track.appendChild(a);
    });
    layout();
  }
  function layout() {
    const pv = perView(), gap = 24;
    const w = (viewport.clientWidth - gap * (pv - 1)) / pv;
    $$('.card', track).forEach(c => { c.style.flex = '0 0 ' + w + 'px'; });
    step = w + gap;
    max = Math.max(0, PROJECTS.length - pv);
    dotsEl.innerHTML = '';
    for (let i = 0; i <= max; i++) {
      const d = document.createElement('button');
      d.type = 'button'; d.className = 'dot'; d.setAttribute('aria-label', 'Slide ' + (i + 1));
      d.addEventListener('click', () => { go(i); restart(); });
      dotsEl.appendChild(d);
    }
    go(Math.min(idx, max));
  }
  function go(i) {
    idx = i < 0 ? max : i > max ? 0 : i;
    track.style.transform = 'translateX(' + (-idx * step) + 'px)';
    $$('.dot', dotsEl).forEach((d, n) => d.classList.toggle('active', n === idx));
  }
  function restart() {
    clearInterval(timer);
    if (!reduce) timer = setInterval(() => go(idx + 1), 5000);
  }
  $('#prev').addEventListener('click', () => { go(idx - 1); restart(); });
  $('#next').addEventListener('click', () => { go(idx + 1); restart(); });
  const car = $('.carousel');
  car.addEventListener('mouseenter', () => clearInterval(timer));
  car.addEventListener('mouseleave', restart);
  let sx = null;
  viewport.addEventListener('touchstart', e => { sx = e.touches[0].clientX; clearInterval(timer); }, { passive: true });
  viewport.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
    sx = null; restart();
  });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });

  /* Contact form */
  const form = $('#contactForm'), btn = $('#submitBtn'), toast = $('#toast');
  let tt;
  function showToast(msg, err) {
    toast.textContent = msg;
    toast.className = 'toast show' + (err ? ' error' : '');
    clearTimeout(tt);
    tt = setTimeout(() => toast.classList.remove('show'), 5000);
  }
  const rules = {
    name: v => v.trim().length >= 2,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    _subject: v => v.trim().length >= 2,
    message: v => v.trim().length >= 5
  };
  form.addEventListener('input', e => e.target.classList.remove('invalid'));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;
    Object.keys(rules).forEach(n => {
      const f = form.elements[n], v = rules[n](f.value);
      f.classList.toggle('invalid', !v);
      f.setAttribute('aria-invalid', String(!v));
      if (!v) ok = false;
    });
    if (!ok) { showToast(t('form.invalid'), true); return; }
    const label = btn.firstElementChild;
    btn.disabled = true; label.textContent = t('form.sending');
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (res.ok) { showToast(t('form.ok')); form.reset(); } else showToast(t('form.fail'), true);
    } catch (err) {
      showToast(t('form.fail'), true);
    } finally {
      btn.disabled = false; label.textContent = t('contact.send');
    }
  });

  applyLanguage(lang);
  restart();
})();
