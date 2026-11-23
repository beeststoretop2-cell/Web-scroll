// Graba el recorrido de la web de Grandgym a vídeo con reloj virtual.
// Cada fotograma avanza exactamente 1/30 s de "tiempo de página" aunque el render headless sea lento,
// así las animaciones (cámara, física de la barra, revelados) salen a velocidad real.
//
// Uso: node tools/grandgym-video.js ordenador|movil  carpeta_frames  [segundos]
// Después: ffmpeg -framerate 30 -i carpeta_frames/%05d.jpg -c:v libx264 -crf 20 -pix_fmt yuv420p salida.mp4
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const [, , MODE = 'ordenador', OUT = 'frames', SECS] = process.argv;
const FPS = 30, DT = 1000 / FPS;
const PRESETS = {
  ordenador: { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, total: 75 },
  movil: { viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, total: 90 },
};
const P = PRESETS[MODE];
const TOTAL = +(SECS || P.total);
fs.mkdirSync(OUT, { recursive: true });

// servidor estático mínimo para grandgym/
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, 'grandgym', decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(path.join(ROOT, 'grandgym'))) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(buf);
  });
}).listen(0);

// reloj virtual: performance.now y requestAnimationFrame avanzan solo cuando lo pedimos
const CLOCK = `(() => {
  let t = 1000; const cbs = new Map(); let id = 0;
  performance.now = () => t;
  window.requestAnimationFrame = (cb) => { cbs.set(++id, cb); return id; };
  window.cancelAnimationFrame = (i) => cbs.delete(i);
  window.__step = (ms) => { t += ms; const list = [...cbs.values()]; cbs.clear(); for (const cb of list) { try { cb(t); } catch (e) { console.error(e); } } };
  // el sonido no se graba: evita crear AudioContext en headless
})();`;

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
  const ctx = await browser.newContext({ ...P, reducedMotion: 'no-preference' });
  await ctx.addInitScript(CLOCK);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Animation.enable');
  await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });

  // deja arrancar la escena (compilación real + loader con el reloj virtual)
  for (let i = 0; i < 4000 && !(await page.evaluate(() => window.__sceneReady)); i++) { await page.evaluate((d) => window.__step(d), DT); await page.waitForTimeout(10); }

  // paradas: el centro de cada sección (como el guion de cámara) y, en las largas, también su final
  const stops = await page.evaluate(() => {
    const h = innerHeight, max = document.documentElement.scrollHeight - h, out = [];
    for (const el of document.querySelectorAll('[data-scene]')) {
      const top = el.getBoundingClientRect().top + scrollY;
      const c = Math.min(max, Math.max(0, top + Math.min(el.offsetHeight, h * 1.4) / 2 - h / 2));
      out.push({ y: c, id: el.id });
      if (el.offsetHeight > h * 1.6) out.push({ y: Math.min(max, top + el.offsetHeight - h * 0.9), id: el.id + '-fin' });
    }
    out.push({ y: max, id: 'final' });
    return out.filter((s, i, a) => i === 0 || s.y > a[i - 1].y + 40);
  });

  // línea de tiempo: intro con «mantén para levantar», luego recorrido con pausas en cada parada
  const INTRO = 8.5, OUTRO = 4, DWELL = 1.6;
  let dist = 0; for (let i = 1; i < stops.length; i++) dist += stops[i].y - stops[i - 1].y;
  const moveTime = TOTAL - INTRO - OUTRO - DWELL * (stops.length - 1);
  const speed = dist / Math.max(10, moveTime); // px/s
  const plan = []; let t = INTRO;
  for (let i = 1; i < stops.length; i++) {
    const d = (stops[i].y - stops[i - 1].y) / speed;
    plan.push({ t0: t, t1: t + Math.max(0.9, d), y0: stops[i - 1].y, y1: stops[i].y }); t += Math.max(0.9, d) + DWELL;
  }
  const end = t + OUTRO;
  const scrollAt = (s) => {
    let y = stops[0].y;
    for (const seg of plan) { if (s >= seg.t1) y = seg.y1; else if (s > seg.t0) { y = seg.y0 + (seg.y1 - seg.y0) * ease((s - seg.t0) / (seg.t1 - seg.t0)); break; } else break; }
    return y;
  };

  const hold = await page.locator('#hold').boundingBox();
  const hx = hold.x + hold.width / 2, hy = hold.y + hold.height / 2;
  const touch = async (type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: hx, y: hy }] });
  const press = async (on) => {
    if (on) console.log('pulsa sobre:', await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('button')?.id || document.elementFromPoint(x, y)?.className, [hx, hy]));
    if (P.hasTouch) await touch(on ? 'touchStart' : 'touchEnd');
    else { await page.mouse.move(hx, hy); on ? await page.mouse.down() : await page.mouse.up(); }
  };
  const events = [
    { at: 3.0, run: () => press(true) },   // mantener… (el loader ya se ha ocultado)
    { at: 6.2, run: () => press(false) },  // …y soltar: cae sobre los bumpers
    { at: end - 3.6, run: () => press(true) },
    { at: end - 1.2, run: () => press(false) },
  ];

  const frames = Math.round(end * FPS);
  console.log(`${MODE}: ${stops.length} paradas, ${end.toFixed(1)} s, ${frames} fotogramas`);
  const t0 = Date.now(); let real = 0;
  for (let f = 0; f < frames; f++) {
    const s = f / FPS;
    for (const e of events) if (!e.done && s >= e.at) { e.done = true; await e.run(); }
    if (!P.hasTouch && !(s > 2.8 && s < 6.4) && !(s > end - 3.8)) {
      // el ratón deriva despacio: el estudio de luz gira con él
      await page.mouse.move(P.viewport.width * (0.55 + 0.25 * Math.sin(s * 0.35)), P.viewport.height * (0.45 + 0.2 * Math.cos(s * 0.27)));
    }
    const fs0 = Date.now();
    await page.evaluate(([y, d]) => { window.scrollTo({ top: y, behavior: 'instant' }); window.__step(d); }, [scrollAt(s), DT]);
    // las transiciones CSS corren en tiempo real: se frenan para que vayan al ritmo del reloj virtual
    if (f % 15 === 0 && f) await cdp.send('Animation.setPlaybackRate', { playbackRate: Math.min(1, DT / Math.max(DT, real)) });
    await page.screenshot({ path: path.join(OUT, String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 90 });
    real = real ? real * 0.9 + (Date.now() - fs0) * 0.1 : Date.now() - fs0;
    if (f % 150 === 0) console.log(`fotograma ${f}/${frames} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  await browser.close(); server.close();
  console.log('listo');
})();
