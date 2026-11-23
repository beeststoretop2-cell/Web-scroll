---
name: live-3d-web
description: Método para construir webs 3D "en vivo" con scroll (Three.js, sin vídeos ni modelos descargados) — objeto procedural en milímetros reales, materiales físicos de metal/cristal, estudio de luz PMREM, cámara dirigida por una lista de cues de scroll, vista explosionada, sonido sintetizado con Web Audio y post-procesado de cine. Úsala SIEMPRE que se cree, rediseñe o mejore una landing/web 3D, una escena Three.js, un hero 3D, animaciones ligadas al scroll o un "recorrido" de producto en este repo (LUMBRA, Grandgym o nuevos proyectos).
---

# Webs 3D que corren en vivo

Principio: **cero metraje**. Nada de vídeo de fondo ni .glb descargados. El objeto es código, iluminado como en un estudio de foto y dirigido por el scroll. Se renderiza cada frame en el dispositivo del visitante, así que **reacciona** (cursor, inclinación, scroll, toque) y pesa ~320 kB en vez de 20 MB+.

Cuatro capas, de abajo arriba:
1. **Geometría**: cada pieza construida con código.
2. **Materiales**: metal y cristal físicos.
3. **Luz**: un estudio dentro de la escena.
4. **Dirección**: el scroll mueve la cámara.

Código de referencia listo para adaptar: [reference.md](reference.md).

---

## Paso 01 · Un objeto, un verbo
- El **objeto** es la estrella: muchas piezas, metal/cristal/piedra, algo que apetezca tener en la mano (objetivo de cámara, auriculares, sintetizador, motor, frasco de perfume, mechero…).
- El **verbo** es lo que el visitante le hace: físico, con un pulgar, y que cambie el objeto (*mantener para encender*, girar, abrir, separar, inclinar hacia la luz).
- Antes de escribir código:
  - A. Lista cada pieza con su **tamaño real en milímetros** (1 unidad = 1 mm).
  - B. Decide **el frame** que capturarías como miniatura.
  - C. Escribe la historia del scroll en 5 tiempos: **hero → close-up → apart (separado) → around (alrededor) → back together (montado)**.

## Paso 02 · Un canvas detrás, la historia delante
- Un único `<canvas>` fijo a pantalla completa (`position: fixed; inset: 0; z-index: 0`) y las secciones HTML normales por encima (`position: relative; z-index: 10`).
- Una sola clase *engine* que controlas tú entera. **Modo exacto de la guía (por defecto en proyectos nuevos):** Next.js (`npx create-next-app@latest`, export estático) + `npm i three` + `npm i -D @types/three`. Implementación de referencia completa: `tombola/` (engine en `tombola/lib/engine/`). LUMBRA y Grandgym usan `vendor/three` r160 sin Next.js.
- **REGLA: `overflow-x: clip`, nunca `hidden`**, en el contenedor de la página. `hidden` convierte la página en una caja de scroll y todo `position: sticky` deja de pegarse.

## Paso 03 · Cada pieza desde código
- Dibuja cada pieza plana con formas simples (círculos, cápsulas, rectángulos) como **SDF 2D**, fúndelas con *smooth union* (radio de fillet en mm), **traza el contorno** con marching squares y **extrúyelo** con `ExtrudeGeometry` con bisel.
- Piezas redondas: `LatheGeometry`.
- **REGLA: bisel de 0.05 mm.** Es la diferencia entre CAD y lujo: los bordes son donde vive la luz.

## Paso 04 · El metal es un espejo; el acabado es la marca
- `MeshPhysicalMaterial`, `metalness: 1`. En metal, `color` solo tiñe el reflejo; `roughness` decide pulido (≈0.05–0.15) o satinado (≈0.3).
- Acabados cepillados: genera **texturas de dirección al arrancar** (circular, radial, rayado) y úsalas como `anisotropyMap` con `anisotropy` ≈ 0.8.
- Superficies especiales: `iridescence` para acero templado/tornasolado, `clearcoat` para lacados, `ior` + `transmission` para gemas/cristal.
- **REGLA: dos materiales por pieza**, cara plana y borde (`mesh.material = [satin, polished]` — ExtrudeGeometry usa el grupo 0 para tapas y el 1 para laterales/bisel). Ese contraste es lo que se lee como caro.

## Paso 05 · Ilumina como un fotógrafo
- El metal solo es tan bueno como lo que refleja. Construye un **mini estudio** (habitación oscura + 1 softbox clave fuera de eje + 2 tiras laterales de luz que dibujan la línea del borde) y **hornéalo** con `PMREMGenerator.fromScene(studio)` en `scene.environment`.
- Rota el entorno con el cursor: `scene.environmentRotation.set(y * .45, -x * .8, 0)` (Three ≥ r162; con npm ya lo tienes. En `vendor/three` r160 no existe, ver reference.md).
- **REGLA: el cristal refleja solo el estudio.** Sin luces directas sobre él, o aparece un punto caliente falso.

## Paso 06 · Que el scroll dirija la cámara
- Escribe un **guion de cámara**: lista de *cues* anclados a secciones (`at` = progreso 0–1 del scroll) con un *shot* (`frame`, `polar`, `azimuth`, `offsetX`, `explode`, `timeScale`…).
- El engine interpola entre los dos cues vecinos y luego **suaviza (damp) hacia el resultado cada frame**.
- **REGLA: encuadra por tamaño, no por distancia**: "que quepan 52 mm en pantalla". La distancia se calcula desde el FOV y el aspect, así el mismo cue funciona en móvil y en monitor.

## Paso 07 · Desmóntalo ante la cámara
- La vista explosionada es el plano estrella. Cada pieza tiene `base`, `lift` (vector) y `order` (0–1): **las de arriba salen primero y vuelven las últimas** (retardo `(1 - order) * .42`, duración `.58`).
- **Etiquetas**: proyecta puntos 3D a pantalla cada frame y apila las etiquetas en **dos columnas limpias** con líneas guía (no flotando sobre la pieza).
- **Modo blueprint**: un toggle cambia todas las superficies por sus aristas (`EdgesGeometry` + `LineSegments`). Prueba instantánea de que es geometría, no vídeo.

## Paso 08 · Dale pulso
- No hagas keyframes: **simula**. Un solo reloj mueve todas las piezas: `time += dt * timeScale; pose(time)`. Así nada se desincroniza.
- Los eventos se disparan en el beat (`if (beat !== lastBeat) sound.tick()`).
- **Sonido sintetizado** con Web Audio: ráfagas de ruido filtrado = clics y toques. Cero archivos de audio.
- **Interacción "mantener para [VERBO]"** con anillo de progreso. Ese mismo gesto desbloquea el audio y la inclinación del móvil (DeviceOrientation), que el navegador exige tras un gesto.
- Cámara lenta real: `timeScale = 1/12` en el close-up.

## Paso 09 · Acabado de cine, envío ligero
- Cadena de post corta: **Scene → MSAA HDR (HalfFloat, samples 4) → Bloom (umbral alto, solo destellos) → ACES Filmic → Grano**.
- **Calidad adaptativa**: `pixelRatio` máx. **1.75 en móvil**; si los fps bajan de 40, baja resolución y después apaga el bloom.
- **Sin tirones**: `renderer.compileAsync(scene, camera)` de todos los shaders detrás del loader; construye los extras pesados cuando la página esté idle (`requestIdleCallback`).
- Objetivo: **~320 kB toda la web, 0 vídeos, 1 canvas.**

---

## Cinco bugs que cuestan horas (evítalos de entrada)
1. **Los sticky dejan de pegarse** → `overflow-x: clip` en el wrapper; `hidden` rompe `position: sticky`.
2. **Piezas redondas renderizadas del revés** → dibuja los perfiles de `LatheGeometry` en sentido antihorario; las caras miran a la derecha del trazado.
3. **Punto caliente en mitad del cristal** → el cristal refleja solo el entorno, mezclado en aditivo por encima (sin luces directas).
4. **Revelados de texto que fallan al azar** → conduce los revelados desde la posición del scroll, no con IntersectionObserver (se salta beats en frames pesados de GPU).
5. **Las capturas mienten** → los navegadores headless renderizan 3D a ~1 fps. Usa capturas para composición/encuadre, pero el movimiento se juzga en un móvil real (díselo al usuario).

## Lecciones de la tómbola (aplícalas)
- **Escala del bisel**: 0.05 mm es para un objeto de ~50 mm. Escálalo con el objeto (~0.5 mm para uno de 500 mm) o el borde no captura luz.
- `ExtrudeGeometry` sale con normales planas: pásala por `toCreasedNormals(geo, 35°)` (BufferGeometryUtils) para paredes curvas suaves sin perder la arista cara/borde.
- Une los segmentos de marching squares por **identidad de arista de la rejilla**, no por coordenadas en coma flotante (los contornos se rompen).
- Piezas hijas de un grupo que gira (rotor): convierte su `lift` con la rotación inversa del rotor para que salgan "hacia arriba" en el mundo.
- Las tiras de luz del estudio queman fácilmente las caras anisotrópicas → empezar con intensidades ~2.5 y bloom 0.4 / umbral 0.98.
- **Tailwind v4**: no uses clases `.ring`, `.shadow`, `.border`… para tu propio CSS; chocan con utilidades (el `.ring` dibujó un marco cuadrado).
- Las etiquetas/callouts solo en el plano de despiece (campo `labels` en el cue); en otras secciones chocan con el texto.
- Copia encima del render: un *scrim* radial suave detrás de cada bloque de texto.
- Móvil vertical: sin `offsetX`; objeto arriba (`setViewOffset` con y ≈ 0.2·alto) y encuadre ×1.2; texto abajo.
- Capturas headless: añade un modo `?snap` que quite el damping de cámara; un ciclo de "mantener" tarda ~1 min en headless.

## Flujo de trabajo obligatorio
1. Confirma **[OBJETO]** y **[VERBO]** (si el usuario no los da, propón y sigue), tabla de piezas en mm, frame miniatura y los 5 tiempos.
2. Estructura: canvas fijo + secciones; `overflow-x: clip`.
3. Geometría procedural (SDF → traza → extrude con bisel 0.05 mm / lathe antihorario).
4. Materiales dobles cara/borde, texturas anisotrópicas generadas.
5. Estudio PMREM + rotación con el cursor; nada de luces directas en el cristal.
6. Cues de scroll con encuadre por tamaño + damping.
7. Explode con orden, etiquetas en dos columnas, toggle blueprint.
8. Reloj único, Web Audio sintetizado, mantener-para-[VERBO], slow-mo 1/12.
9. Post (bloom/ACES/grano), calidad adaptativa, compileAsync, presupuesto de peso.
10. **Captura cada sección (Playwright) y arregla lo que se vea mal.** Comprueba también el peso total.

### Prompt base (del brief original)
> Build a page with one fixed three.js canvas behind the content. The hero is a [OBJECT], built entirely from procedural geometry: 2D signed-distance shapes, traced and extruded with 0.05 mm polished bevels, in real millimetres. Materials: MeshPhysicalMaterial, metalness 1, anisotropic finishes generated as textures, satin faces with polished edges. Light it with a PMREM studio: dark room, one off-axis softbox, two strip lights. Rotate the environment with the cursor. Drive the camera from a scroll cue list. Add a staggered exploded view, two-column callouts, a blueprint toggle, a hold-to-[VERB] interaction with Web Audio sound, and post: bloom, ACES, grain. Screenshot every section and fix what looks off.
