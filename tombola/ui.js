// Interfaz: precarga, revelados, nav, contador de escena, abierto ahora, reloj de la masa, carta, tómbola, pedido, galería, micro-interacciones.
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- carta real de Tómbola (33 cm, IVA incluido) ---------- */
  const MENU = [
    ['clasicas', 1, 'Margarita', 'Tomate, mozzarella y albahaca', 13],
    ['clasicas', 2, 'Prosciutto', 'Tomate, mozzarella y jamón cocido', 15],
    ['clasicas', 3, 'Bacon', 'Tomate, mozzarella y bacon ahumado', 15],
    ['clasicas', 4, 'Hawaiana', 'Tomate, mozzarella, jamón cocido y carpaccio de piña natural', 16],
    ['clasicas', 5, 'Barbacoa', 'Tomate, mozzarella, carne picada, bacon, cebolla crujiente y salsa barbacoa', 16],
    ['clasicas', 6, 'Carbonara', 'Nata, mozzarella, cebolla, champiñón fresco y panceta arrotolata', 16],
    ['clasicas', 7, 'Cuatro quesos', 'Nata, mozzarella, gorgonzola, emmental y parmesano', 16],
    ['clasicas', 8, 'Prosciutto e funghi', 'Tomate, mozzarella, jamón cocido, champiñón fresco y huevo', 17],
    ['especiales', 9, 'Olivia', 'Crema de alcachofa, mozzarella, champiñón fresco, cebolla y pimiento tricolor, con aceite de ajo y perejil', 17],
    ['especiales', 10, 'Popeye', 'Espinacas, mozzarella, nata, queso de cabra y queso ricotta italiano con aceite de ajo y perejil', 17],
    ['especiales', 11, 'Vegana', 'Crema de trigueros, calabacín, alcachofa, pimiento tricolor y espárragos', 17],
    ['especiales', 12, 'Picantona', 'Tomate, mozzarella, cebolla, salami pepperoni y jalapeños', 17],
    ['especiales', 13, 'Gambas', 'Tomate, mozzarella y gambas maceradas en aceite de ajo y perejil', 17],
    ['especiales', 14, 'Alba', 'Cebolla, mozzarella, gorgonzola, emmental, bacon y huevo. Aceite de ajo y perejil', 17],
    ['gourmet', 15, 'Salmonete', 'Tomate natural, mozzarella, mascarpone al eneldo, ricotta, guacamole, salmón y bacalao ahumado', 20],
    ['gourmet', 16, 'Ibérica', 'Tomate natural, mozzarella, paletilla ibérica, tomate semiseco y cherry, reducción de vino, salmorejo y rúcula', 19],
    ['gourmet', 17, 'Burratina', 'Tomate natural, mozzarella, burrata, bresaola, rúcula, tomate semiseco y cherry', 20],
    ['gourmet', 18, 'Tómbola', 'Tomate, mozzarella, bacon, chorizo, huevos de codorniz, lardo toscano, tomate cherry, reducción de vino y rúcula', 19],
    ['gourmet', 19, 'Tartufata', 'Salsa tartufata, mozzarella, parmesano, setas baby, boletus y lardo toscano. Aceite de trufa', 19],
    ['gourmet', 20, 'Seis quesos', 'Sasamón curado, Hinestrosa semicurado, mozzarella, nata, gorgonzola, ricotta, parmesano y virutas de ajo negro', 20],
    ['dulces', 21, 'Nutella', 'Nutella, nata y mozzarella', 10],
    ['dulces', 22, 'Nutella con piña', 'Nutella, nata, mozzarella y piña', 11],
    ['sugerencias', 23, 'Tuna', 'Tomate, mozzarella, cebolla, pimiento tricolor, atún y aceitunas negras', 18],
    ['sugerencias', 24, 'Tomatina', 'Tomate natural, triturado, semiseco y cherry, mozzarella, burrata, gorgonzola, parmesano y albahaca', 19],
    ['sugerencias', 25, 'Caperucita', 'Tomate, mozzarella, gorgonzola, chorizo y pimiento tricolor', 17],
    ['sugerencias', 26, 'Chicken', 'Pollo, nata, mozzarella, champiñones, cebolla, pimiento tricolor y curry', 18],
    ['sugerencias', 27, 'Porky', 'Tomate, mozzarella, jamón de York, bacon y chorizo', 18],
    ['sugerencias', 28, '4 Stagione', 'Tomate, mozzarella, jamón de York, champiñones, alcachofas y aceitunas negras', 18],
    ['sugerencias', 29, 'Vegetal', 'Tomate natural, cebolla, champiñones, pimiento tricolor y calabacín. Aceite de ajo y perejil', 16],
    ['sugerencias', 30, 'Papamoscas', 'Nata, mozzarella, chorizo, bacon, gorgonzola y parmesano', 18],
    ['sugerencias', 31, 'La secreta', '4 quesos, gambas, nata, aceite de ajo y perejil', 19],
    ['sugerencias', 32, 'Revoltosa', 'Tomate, mozarella, bacon, chorizo, champiñón y huevo', 18],
    ['sugerencias', 33, 'Marquesita', 'Nata, albahaca, mozzarella, tomate seco, burrata, parmesano y pesto', 18],
  ];
  const CAT = { clasicas: 'Clásica', especiales: 'Especial', gourmet: 'Gourmet', sugerencias: 'Sugerencia', dulces: 'Dulce' };
  // Fotos reales de cada pizza (Instagram de Tómbola, serie «30 pizzas»)
  const PHOTO = { 1: 'margarita', 2: 'prosciutto-glovo', 15: 'salmonete', 4: 'hawaiana', 5: 'barbacoa', 6: 'carbonara', 7: 'cuatroquesos', 8: 'funghi-horno',
    9: 'olivia', 10: 'popeye', 11: 'vegana', 12: 'picantona', 13: 'gambas', 14: 'alba-horno', 16: 'iberica', 17: 'burratina', 18: 'tombola',
    19: 'brindis', 21: 'nutella', 23: 'tuna', 24: 'tomatina', 25: 'caperucita', 26: 'chicken', 27: 'porky-maps', 28: 'stagione-recoger',
    29: 'vegetal', 30: 'papamoscas', 32: 'revoltosa' };
  const VEG = new Set([1, 7, 9, 10, 11, 24, 29, 33, 21, 22, 20]);

  /* ---------- hora de Burgos y horario ---------- */
  function madridNow() {
    const p = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => p.find((x) => x.type === t)?.value;
    const wd = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].indexOf((get('weekday') || '').replace('.', '').toLowerCase());
    return { day: wd < 0 ? new Date().getDay() : wd, min: +get('hour') * 60 + +get('minute') };
  }
  const m = (s) => { const [h, mm] = s.split(':').map(Number); return h * 60 + mm; };
  const NIGHT = ['19:30', '23:00'], LATE = ['19:30', '24:00'], LUNCH = ['13:30', '16:00'];
  const OPEN = { 1: [NIGHT], 2: [NIGHT], 3: [NIGHT], 4: [NIGHT], 5: [LATE], 6: [LUNCH, LATE], 0: [LUNCH, NIGHT] };
  function status() {
    const { day, min } = madridNow();
    for (const [a, b] of OPEN[day]) if (min >= m(a) && min < m(b)) return { open: true, text: `Abierto · cierra a las ${b === '24:00' ? '00:00' : b}` };
    const next = OPEN[day].find(([a]) => min < m(a));
    if (next) return { open: false, text: `Cerrado · abre hoy a las ${next[0]}` };
    const tomorrow = OPEN[(day + 1) % 7][0][0];
    return { open: false, text: `Cerrado · abre mañana a las ${tomorrow}` };
  }
  function liveUpdate() {
    const s = status();
    ['#liveStatus', '#liveStatus2'].forEach((id) => {
      const el = $(id); if (!el) return;
      el.classList.toggle('open', s.open); el.lastElementChild.textContent = s.text;
    });
    const { day } = madridNow();
    $$('#hoursList li').forEach((li) => li.classList.toggle('today', +li.dataset.d === day));
  }
  liveUpdate(); setInterval(liveUpdate, 60000);

  /* ---------- precarga: 0 → 48 h ---------- */
  const loader = $('#loader'), ldNum = $('#ldNum'), ldBar = $('#ldBar');
  const t0 = performance.now(), dur = reduce ? 200 : 1900;
  function ld(now) {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    ldNum.textContent = Math.round(48 * e);
    ldBar.style.width = e * 100 + '%';
    if (k < 1 || (!window.__sceneReady && now - t0 < 7000)) requestAnimationFrame(ld);
    else { loader.classList.add('done'); document.body.classList.add('loaded'); }
  }
  requestAnimationFrame(ld);

  /* ---------- carta ---------- */
  const grid = $('#menuGrid');
  grid.innerHTML = MENU.map(([cat, n, name, desc, price]) => `
    <article class="dish tilt has-photo" data-cat="${cat}" data-n="${n}" id="pizza-${n}">
      ${PHOTO[n] ? `<div class="d-img"><img src="img/real/${PHOTO[n]}-card.jpg" alt="Pizza ${name} de Tómbola" loading="lazy" width="560" height="420"></div>` : `<div class="d-img d-ph" aria-hidden="true"><b>${name}</b><span>Pizza ${String(n).padStart(2, '0')} · 33 cm</span></div>`}
      <div class="d-top"><span class="d-num mono">${String(n).padStart(2, '0')}</span><span class="d-cat mono">${CAT[cat]}${VEG.has(n) ? ' · sin carne' : ''}</span></div>
      <h3>${name}</h3>
      <p>${desc}</p>
      <div class="d-foot"><b>${price} €</b><button class="d-add" data-add="${n}" aria-label="Añadir ${name} al pedido"><span>+</span> Añadir</button></div>
    </article>`).join('');
  const tabs = $$('#tabs [role=tab]');
  tabs.forEach((b) => b.addEventListener('click', () => {
    tabs.forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    const c = b.dataset.cat;
    $$('.dish', grid).forEach((d, i) => {
      const show = c === 'all' || d.dataset.cat === c;
      d.hidden = !show;
      if (show && !reduce) d.animate([{ opacity: 0, transform: 'translateY(14px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 420, delay: Math.min(i, 12) * 22, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    });
  }));
  // flechas para moverse entre pestañas
  $('#tabs').addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement); if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; tabs[j].focus(); tabs[j].click(); e.preventDefault(); }
  });

  /* ---------- pedido ---------- */
  const order = new Map();
  const pill = $('#orderPill'), panel = $('#orderPanel'), list = $('#orderList');
  const fmt = (v) => v.toLocaleString('es-ES') + ' €';
  function renderOrder() {
    let count = 0, total = 0;
    list.innerHTML = [...order.entries()].map(([n, q]) => {
      const it = MENU.find((x) => x[1] === n); count += q; total += q * it[4];
      return `<li><span class="mono">${String(n).padStart(2, '0')}</span><b>${it[2]}</b><div class="qty"><button data-dec="${n}" aria-label="Quitar una ${it[2]}">−</button><output>${q}</output><button data-inc="${n}" aria-label="Añadir otra ${it[2]}">+</button></div><em>${fmt(q * it[4])}</em></li>`;
    }).join('') || '<li class="empty">Aún no has añadido ninguna pizza.</li>';
    $('#orderCount').textContent = count; $('#orderTotal').textContent = fmt(total); $('#orderTotal2').textContent = fmt(total);
    pill.hidden = count === 0;
  }
  function add(n, from) {
    order.set(n, (order.get(n) || 0) + 1); renderOrder();
    if (!reduce) pill.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.3,1.6,.5,1)' });
    if (from && !reduce) {
      const r = from.getBoundingClientRect(), p = pill.getBoundingClientRect();
      const dot = document.createElement('i'); dot.className = 'fly'; document.body.appendChild(dot);
      dot.animate([{ transform: `translate(${r.left + r.width / 2}px,${r.top + r.height / 2}px) scale(1)`, opacity: 1 },
        { transform: `translate(${p.left + p.width / 2}px,${p.top + p.height / 2}px) scale(.4)`, opacity: 0.4 }], { duration: 650, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => dot.remove();
    }
  }
  grid.addEventListener('click', (e) => { const b = e.target.closest('[data-add]'); if (!b) return; add(+b.dataset.add, b); b.classList.add('added'); setTimeout(() => b.classList.remove('added'), 700); });
  list.addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
    if (inc) add(+inc.dataset.inc);
    if (dec) { const n = +dec.dataset.dec, q = (order.get(n) || 0) - 1; q > 0 ? order.set(n, q) : order.delete(n); renderOrder(); if (!order.size) closeOrder(); }
  });
  let lastFocus = null;
  function openOrder() { lastFocus = document.activeElement; panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); pill.setAttribute('aria-expanded', 'true'); $('.op-x', panel).focus(); }
  function closeOrder() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); pill.setAttribute('aria-expanded', 'false'); lastFocus?.focus?.(); }
  pill.addEventListener('click', openOrder);
  panel.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeOrder(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) closeOrder(); });
  renderOrder();

  /* ---------- la tómbola: elige una pizza al azar ---------- */
  const spin = $('#spin'), result = $('#tombolaResult');
  let spinning = false;
  spin.addEventListener('click', () => {
    if (spinning) return; spinning = true;
    $('[data-cat="all"]').click();
    const pool = MENU.filter((x) => x[0] !== 'dulces');
    const pick = pool[Math.floor(Math.random() * pool.length)];
    result.hidden = false;
    const steps = reduce ? 1 : 22; let i = 0;
    (function tick() {
      const it = i < steps - 1 ? pool[Math.floor(Math.random() * pool.length)] : pick;
      const fin = i >= steps - 1 && PHOTO[it[1]];
      result.innerHTML = `${fin ? `<img class="t-photo" src="img/real/${PHOTO[it[1]]}-card.jpg" alt="Pizza ${it[2]}">` : ''}<span class="ball mono">${String(it[1]).padStart(2, '0')}</span><div><span class="mono">${i < steps - 1 ? 'E.T. está girando la tómbola…' : 'E.T. ha elegido por ti'}</span><b>${it[2]}</b>${i < steps - 1 ? '' : `<small>${it[3]} · ${it[4]} €</small>`}</div>${i < steps - 1 ? '' : `<button class="btn btn-sm" data-add="${it[1]}"><span>Añadir al pedido</span></button>`}`;
      i++;
      if (i < steps) setTimeout(tick, 40 + i * i * 0.55);
      else {
        spinning = false;
        const card = $('#pizza-' + pick[1]);
        $$('.dish.won').forEach((d) => d.classList.remove('won')); card.classList.add('won');
        card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
    })();
  });
  result.addEventListener('click', (e) => { const b = e.target.closest('[data-add]'); if (b) add(+b.dataset.add, b); });

  /* ---------- reloj de la masa ---------- */
  const range = $('#fRange'), out = $('#fOut'), stage = $('#fStage');
  const STAGES = [[0, 'Amasamos a diario. Empieza el reposo.'], [12, 'Fermentación lenta: aparecen las primeras burbujas.'], [24, 'La masa gana volumen y elasticidad.'],
    [36, 'Se desarrollan el aroma y el sabor.'], [48, 'Lista para el horno: ligera y con sabor propio.']];
  function setHour(h, fromUser) {
    window.__doughHour = h; out.textContent = h + ' h'; range.value = h;
    range.style.setProperty('--k', h / 48);
    stage.textContent = STAGES.filter(([x]) => h >= x).pop()[1];
    if (fromUser) autoplayed = true;
  }
  let autoplayed = false;
  range.addEventListener('input', () => setHour(+range.value, true));
  setHour(48);
  const fio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting || autoplayed) return; autoplayed = true; fio.disconnect();
    if (reduce) return;
    const t = performance.now();
    setHour(0);
    (function step(n) { const k = Math.min(1, (n - t) / 3600); setHour(Math.round(48 * (1 - Math.pow(1 - k, 2)))); if (k < 1) requestAnimationFrame(step); })(t + 500);
  }), { threshold: 0.6 });
  fio.observe($('#ferment'));

  /* ---------- revelados con desenfoque ---------- */
  $$('.panel > *, .carta-head > *, .hs-head > *, .carta-note, .foot > *').forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------- contadores ---------- */
  const cio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, t = performance.now();
    (function step(n) { const k = Math.min(1, (n - t) / 1500); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); })(t);
  }), { threshold: 0.6 });
  if (!reduce) $$('[data-count]').forEach((el) => cio.observe(el));

  /* ---------- nav, contador de escena, galería horizontal ---------- */
  const nav = $('#nav'), hudNum = $('#hudNum'), hudFill = $('#hudFill'), hudLabel = $('#hudLabel');
  const scenes = $$('[data-scene]');
  $('#hudTot').textContent = String(scenes.length).padStart(2, '0');
  const navLinks = $$('.links a');
  const hs = $('#equipo'), track = $('#hsTrack');
  function hsUpdate() {
    const r = hs.getBoundingClientRect(), total = hs.offsetHeight - innerHeight;
    const k = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
    const dist = track.scrollWidth - track.clientWidth;
    track.style.transform = `translate3d(${-k * Math.max(0, dist)}px,0,0)`;
  }
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('solid', y > 30);
    hudFill.style.height = (max > 0 ? (y / max) * 100 : 0) + '%';
    const mid = y + innerHeight * 0.45; let cur = scenes[0];
    scenes.forEach((s) => { if (s.offsetTop <= mid) cur = s; });
    hudNum.textContent = String(+cur.dataset.scene + 1).padStart(2, '0');
    if (hudLabel.textContent !== cur.dataset.label) { hudLabel.textContent = cur.dataset.label; if (!reduce) hudLabel.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300 }); }
    navLinks.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + cur.id));
    hsUpdate();
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- menú móvil ---------- */
  const burger = $('#burger'), mm = $('#mmenu');
  burger.addEventListener('click', () => {
    const open = !mm.classList.contains('open');
    mm.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.classList.toggle('menu-open', open);
  });
  $$('a', mm).forEach((a) => a.addEventListener('click', () => { mm.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menú'); document.body.classList.remove('menu-open'); }));

  /* ---------- botones magnéticos, tarjetas 3D, luz que sigue al cursor ---------- */
  if (fine && !reduce) {
    document.addEventListener('pointermove', (e) => {
      const b = e.target.closest?.('.magnetic');
      if (b) {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px,${(e.clientY - r.top - r.height / 2) * 0.32}px)`;
        b.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      }
      const t = e.target.closest?.('.tilt');
      if (t) {
        const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        t.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-2px)`;
        t.style.setProperty('--gx', (x + 0.5) * 100 + '%'); t.style.setProperty('--gy', (y + 0.5) * 100 + '%');
      }
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const b = e.target.closest?.('.magnetic'); if (b && !b.contains(e.relatedTarget)) b.style.transform = '';
      const t = e.target.closest?.('.tilt'); if (t && !t.contains(e.relatedTarget)) t.style.transform = '';
    });
    const cur = $('#cursor');
    addEventListener('pointermove', (e) => { cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
  }

  onScroll();
})();
