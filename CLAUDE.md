# Web-scroll

Webs 3D con scroll en Three.js: LUMBRA en la raíz (Three.js r160 local en `vendor/three`) y Grandgym en `grandgym/` (rehecha con la skill: barra olímpica procedural, Three r187 local en `grandgym/vendor/three`).

Para cualquier trabajo 3D/scroll en este repo, sigue la skill `live-3d-web` (`.claude/skills/live-3d-web/`):
cero vídeo y cero modelos descargados, geometría procedural en mm reales con bisel de 0.05 mm, materiales
físicos cara/borde, estudio PMREM, cámara por lista de cues con encuadre por tamaño, vista explosionada,
Web Audio sintetizado, post (bloom/ACES/grano) y calidad adaptativa. Reglas clave:
- `overflow-x: clip`, nunca `hidden`, en el contenedor de la página.
- Revelados de texto desde la posición del scroll, no con IntersectionObserver.
- Captura cada sección con Playwright y corrige; el movimiento se valida en un móvil real.
