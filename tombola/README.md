# La Gran Tómbola · web 3D en vivo

Bombo de tómbola de latón construido entero en código (Three.js), dirigido por el scroll. 0 vídeos, 0 modelos descargados, 1 canvas. Hecha con la skill `live-3d-web` (guía de 9 pasos).

## Ver en local
```bash
cd tombola
npm install
npm run dev          # http://localhost:3000
```

## Publicar (sitio estático)
```bash
npm run build        # genera tombola/out/ — súbelo a cualquier hosting estático
BASE_PATH=/subcarpeta npm run build   # si va en una subcarpeta (p. ej. GitHub Pages)
```

## Dónde está cada cosa
- `app/page.tsx` – textos y secciones (premios, pasos, fecha: **contenido de ejemplo, cámbialo**)
- `app/Experience.tsx` – canvas fijo, botón «mantén para girar», «Plano», «Sonido»
- `lib/engine/tombola.ts` – geometría de cada pieza en milímetros
- `lib/engine/materials.ts` – latón, acero, laca, cristal (texturas cepilladas generadas)
- `lib/engine/cues.ts` – guion de cámara por sección
- `lib/engine/sim.ts` – física de las bolas · `sound.ts` – sonido sintetizado
- `lib/engine/Engine.ts` – estudio de luz, despiece, etiquetas, post (bloom/ACES/grano), calidad adaptativa

Depuración: `?debug` muestra fps; `?snap` quita el suavizado de cámara (para capturas).
