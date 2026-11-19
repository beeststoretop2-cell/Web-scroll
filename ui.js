// UI: reveals, nav, rail, buy bar, checkout modal. Independent of the 3D layer.
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Loader fallback (if WebGL / CDN fails, never block the page)
  const loader = $('#loader');
  let pct = 0;
  const pctEl = $('#loadPct');
  const tick = setInterval(() => {
    pct = Math.min(pct + Math.random() * 9, window.__sceneReady ? 100 : 92);
    pctEl.textContent = Math.floor(pct);
    if (pct >= 100) { clearInterval(tick); loader.classList.add('done'); }
  }, 60);
  setTimeout(() => { clearInterval(tick); loader.classList.add('done'); }, 7000);

  // Reveal panels
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.18 });
  $$('.panel').forEach((p) => io.observe(p));

  // Nav + rail + buy bar
  const nav = $('.nav');
  const railFill = $('#railFill');
  const railNum = $('#railNum');
  const buybar = $('#buybar');
  const scenes = $$('.scene');
  $('#railTotal').textContent = String(scenes.length).padStart(2, '0');
  const packs = $('#packs');

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('scrolled', y > 40);
    railFill.style.height = (max > 0 ? (y / max) * 100 : 0) + '%';
    const mid = y + innerHeight / 2;
    let idx = 0;
    scenes.forEach((s, i) => { if (s.offsetTop <= mid) idx = i; });
    railNum.textContent = String(idx + 1).padStart(2, '0');
    const pr = packs.getBoundingClientRect();
    const overPacks = pr.top < innerHeight * 0.7 && pr.bottom > innerHeight * 0.3;
    buybar.classList.toggle('show', y > innerHeight * 0.6 && !overPacks);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Checkout modal
  const PACKS = {
    1: { name: 'Individual', qty: '1 cinturón', price: 34.99 },
    2: { name: 'Pack Dúo', qty: '2 cinturones', price: 59.99 },
    3: { name: 'Pack Familia', qty: '3 cinturones', price: 79.99 },
  };
  const fmt = (n) => n.toFixed(2).replace('.', ',') + '€';
  const modal = $('#modal');
  const mPacks = $('#mPacks');
  const mTotal = $('#mTotal');
  let selected = 2;

  mPacks.innerHTML = Object.entries(PACKS).map(([k, p]) =>
    `<div class="m-pack" data-k="${k}" role="radio" tabindex="0"><div><b>${p.name}</b><small>${p.qty}</small></div><b>${fmt(p.price)}</b></div>`
  ).join('');

  function select(k) {
    selected = +k;
    $$('.m-pack', mPacks).forEach((el) => {
      const on = +el.dataset.k === selected;
      el.classList.toggle('sel', on);
      el.setAttribute('aria-checked', on);
    });
    mTotal.textContent = fmt(PACKS[selected].price);
  }
  mPacks.addEventListener('click', (e) => { const el = e.target.closest('.m-pack'); if (el) select(el.dataset.k); });
  mPacks.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const el = e.target.closest('.m-pack'); if (el) { e.preventDefault(); select(el.dataset.k); } } });

  function open(k) {
    select(k);
    $('#orderForm').hidden = false;
    $('#orderOk').hidden = true;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  $$('.buy').forEach((b) => b.addEventListener('click', () => open(b.dataset.pack)));
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.pack = PACKS[selected].name;
    data.total = PACKS[selected].price;
    // TODO: enviar `data` a tu backend / Dropi / Shopify / Google Sheets aquí.
    console.log('Pedido:', data);
    e.target.reset();
    $('#orderForm').hidden = true;
    $('#orderOk').hidden = false;
  });
})();
