// Interfaz: loader, revelados, nav, HUD, estado "abierto ahora", horario, precios, galería, modal.
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- hora de Burgos ---------- */
  function madridNow() {
    const p = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date());
    const get = (t) => p.find((x) => x.type === t)?.value;
    const wd = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].indexOf((get('weekday') || '').replace('.', '').toLowerCase());
    return { day: wd < 0 ? new Date().getDay() : wd, min: +get('hour') * 60 + +get('minute') };
  }
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const OPEN = { 0: ['09:00', '14:00'], 6: ['09:00', '20:00'] };
  for (let d = 1; d <= 5; d++) OPEN[d] = ['07:00', '23:30'];

  /* ---------- loader: 1983 → 2026 ---------- */
  const loader = $('#loader'), ldYear = $('#ldYear'), ldBar = $('#ldBar');
  const y0 = 1983, y1 = 2026, t0 = performance.now(), dur = reduce ? 200 : 1800;
  function ld(now) {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    ldYear.textContent = Math.round(y0 + (y1 - y0) * e);
    ldBar.style.width = e * 100 + '%';
    if (k < 1 || !window.__sceneReady && now - t0 < 6000) requestAnimationFrame(ld);
    else { loader.classList.add('done'); document.body.classList.add('loaded'); }
  }
  requestAnimationFrame(ld);

  /* ---------- reveals ---------- */
  $$('.panel > *:not(.mega), .hg-head > *, .marquee').forEach((el) => el.classList.add('reveal'));
  // Revelados y contadores desde la posición del scroll, no con IntersectionObserver:
  // los observers se saltan beats en frames pesados de GPU (lección 04 de la guía).
  let pendingReveal = $$('.reveal, .mega');
  let pendingCount = reduce ? [] : $$('[data-count]');
  function countUp(el) {
    const to = +el.dataset.count, from = el.hasAttribute('data-plain') ? 1900 : 0, t = performance.now();
    (function step(n) {
      const k = Math.min(1, (n - t) / 1600), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 4)));
      el.textContent = el.hasAttribute('data-plain') ? v : v.toLocaleString('es-ES');
      if (k < 1) requestAnimationFrame(step);
    })(t);
  }
  let revealQueued = false;
  function checkReveals() {
    revealQueued = false;
    const h = innerHeight;
    pendingReveal = pendingReveal.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < h * 0.94 && r.bottom > 0) { el.classList.add('in'); return false; }
      return true;
    });
    pendingCount = pendingCount.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < h * 0.8 && r.bottom > 0) { countUp(el); return false; }
      return true;
    });
  }
  const queueReveal = () => { if (!revealQueued) { revealQueued = true; requestAnimationFrame(checkReveals); } };
  addEventListener('scroll', queueReveal, { passive: true });
  addEventListener('resize', queueReveal);
  // la galería horizontal mueve tarjetas sin cambiar el scroll vertical: repasa también cada 400 ms
  setInterval(checkReveals, 400);
  queueReveal();

  /* ---------- nav, HUD ---------- */
  const nav = $('#nav'), hudNum = $('#hudNum'), hudFill = $('#hudFill'), hudLabel = $('#hudLabel');
  const scenes = $$('[data-scene]');
  $('#hudTot').textContent = String(scenes.length).padStart(2, '0');
  const navLinks = $$('.links a');
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('solid', y > 30);
    hudFill.style.height = (max > 0 ? y / max * 100 : 0) + '%';
    const mid = y + innerHeight * 0.45;
    let cur = scenes[0];
    scenes.forEach((s) => { if (s.offsetTop <= mid) cur = s; });
    hudNum.textContent = String(+cur.dataset.scene + 1).padStart(2, '0');
    hudLabel.textContent = cur.dataset.label;
    navLinks.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + cur.id));
    hgUpdate();
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- menú móvil ---------- */
  const burger = $('#burger'), mm = $('#mmenu');
  burger.addEventListener('click', () => {
    const open = !mm.classList.contains('open');
    mm.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  });
  $$('a', mm).forEach((a) => a.addEventListener('click', () => { mm.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }));

  /* ---------- abierto ahora ---------- */
  const live = $('#liveStatus');
  function liveUpdate() {
    const { day, min } = madridNow();
    const [a, b] = OPEN[day];
    const open = min >= toMin(a) && min < toMin(b);
    live.classList.toggle('open', open);
    live.lastElementChild.textContent = open ? `Abierto · cierra ${b}h` : `Cerrado · abre ${OPEN[(min >= toMin(b)) ? (day + 1) % 7 : day][0]}h`;
    $$('.open-card li').forEach((li) => {
      const d = li.dataset.d;
      li.classList.toggle('today', d === '1-5' ? day >= 1 && day <= 5 : +d === day);
    });
  }
  liveUpdate(); setInterval(liveUpdate, 60000);

  /* ---------- galería horizontal ---------- */
  const hg = $('#galeria'), track = $('#hgTrack');
  function hgUpdate() {
    if (!hg) return;
    const r = hg.getBoundingClientRect();
    const total = hg.offsetHeight - innerHeight;
    const k = Math.min(1, Math.max(0, -r.top / total));
    const dist = track.scrollWidth - innerWidth + 40;
    track.style.transform = `translate3d(${-k * Math.max(0, dist)}px,0,0)`;
    $$('img', track).forEach((img, i) => { img.style.transform = `scale(1.15) translateX(${(k * 2 - 1) * 4 - i * 0.2}%)`; });
  }

  /* ---------- horario ---------- */
  const H = window.HORARIO;
  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const daysEl = $('#days'), list = $('#classes');
  const today = (madridNow().day + 6) % 7; // 0 = lunes
  let group = 'adultos', dsel = today;
  function renderDays() {
    daysEl.innerHTML = DAYS.map((d, i) =>
      `<button role="tab" data-i="${i}" class="${i === dsel ? 'on' : ''}" aria-selected="${i === dsel}">${i === today ? 'Hoy' : d.slice(0, 3)}${i === today ? '<span class="dot"></span>' : ''}</button>`).join('');
  }
  function renderClasses() {
    const evs = (H[group].byday[dsel] || []);
    const { min } = madridNow();
    let nextMarked = false;
    list.innerHTML = evs.length ? evs.map(([a, b, t, d]) => {
      let cls = '', badge = '';
      if (dsel === today) {
        if (min >= toMin(a) && min < toMin(b)) { cls = 'now'; badge = '<span class="badge">Ahora</span>'; }
        else if (min >= toMin(b)) cls = 'past';
        else if (!nextMarked) { nextMarked = true; badge = '<span class="badge next">Próxima</span>'; }
      }
      return `<li class="${cls}"><time>${a}<br>${b}</time><b>${t}</b>${badge || (d ? `<small>${d}</small>` : `<small>${DAYS[dsel]}</small>`)}</li>`;
    }).join('') : '<li class="empty">No hay clases programadas este día.</li>';
  }
  daysEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; dsel = +b.dataset.i; renderDays(); renderClasses(); });
  $$('[data-group]').forEach((b) => b.addEventListener('click', () => {
    group = b.dataset.group;
    $$('[data-group]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    renderClasses();
  }));
  $$('[data-tab]').forEach((a) => a.addEventListener('click', () => { $(`[data-group="${a.dataset.tab}"]`).click(); }));
  renderDays(); renderClasses();
  setInterval(renderClasses, 60000);

  /* ---------- precios ---------- */
  $$('[data-term]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.term;
    $$('[data-term]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    $$('.p-amt').forEach((el) => {
      const v = el.querySelector('b');
      v.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'ease-out' });
      v.textContent = el.dataset[t];
    });
    $$('.p-extra').forEach((el) => { el.textContent = el.dataset[t]; });
  }));

  /* ---------- magnético + tilt + cursor ---------- */
  if (matchMedia('(hover: hover)').matches && !reduce) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    const cur = $('#cursor');
    addEventListener('pointermove', (e) => { cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
  }

  /* ---------- prueba 1 día → WhatsApp ---------- */
  const modal = $('#trial');
  const open = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
  const close = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
  $$('[data-open-trial]').forEach((b) => b.addEventListener('click', open));
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  const dia = $('#tDia');
  dia.min = new Date().toISOString().slice(0, 10);
  $('#trialForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const fecha = new Date(f.get('dia') + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const msg = `¡Hola! Quiero probar Grandgym 1 día gratis.\nNombre: ${f.get('nombre')}\nTeléfono: ${f.get('telefono')}\nDía: ${fecha}\nHora: ${f.get('hora')}`;
    window.open('https://wa.me/34601012775?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    close();
  });

  /* ---------- cookies + analítica ----------
     Ahora la web no instala ninguna cookie, así que el aviso no se muestra.
     Para activar Google Analytics 4, escribe aquí su ID (p. ej. 'G-XXXXXXXXXX'):
     el aviso aparecerá y Analytics solo se cargará si el visitante acepta. */
  const ANALYTICS_ID = '';
  const ck = $('#cookies');
  const store = { get() { try { return localStorage.getItem('gg-consent'); } catch (e) { return null; } },
                  set(v) { try { localStorage.setItem('gg-consent', v); } catch (e) {} } };
  function loadAnalytics() {
    const s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ANALYTICS_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', ANALYTICS_ID, { anonymize_ip: true });
  }
  if (ANALYTICS_ID) {
    const v = store.get();
    if (v === 'yes') loadAnalytics();
    else if (v !== 'no') ck.hidden = false;
    $('#ckYes').addEventListener('click', () => { store.set('yes'); ck.hidden = true; loadAnalytics(); });
    $('#ckNo').addEventListener('click', () => { store.set('no'); ck.hidden = true; });
  }

  onScroll();
})();
