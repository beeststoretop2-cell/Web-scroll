# LUMBRA · Landing 3D del cinturón lumbar térmico

Landing de una sola página con Three.js: la cámara vuela por 10 escenas en 3D mientras haces scroll.

- `index.html` – contenido y textos
- `styles.css` – diseño
- `main.js` – escenas 3D y recorrido de la cámara
- `ui.js` – packs, formulario contra reembolso, animaciones de la interfaz
- `vendor/three` – Three.js 0.160 incluido en local (no depende de CDN)
- `assets/` – fotos del producto

Ver en local: `python3 -m http.server` → http://localhost:8000

Para recibir pedidos, conecta el `TODO` del formulario en `ui.js` a tu backend, Dropi, Shopify o Google Sheets.

---

# Grandgym · rediseño futurista (`grandgym/`)

Rediseño 3D con scroll de la web del Gimnasio Grandmontagne. El 3D sigue la skill `live-3d-web`: una barra olímpica de 130 kg construida en código (mm reales), estudio de luz, cámara por secciones, despiece con etiquetas, modo «Plano» y «Mantén para levantar» con sonido sintetizado (Three.js r187 local en `grandgym/vendor/three`).

Rediseño (Burgos), con el contenido real de grandmontagne.es: textos, tarifas, horario completo de adultos e infantil, centro de estética, Club de Judo, reseñas y contacto.

Ver en local: `python3 -m http.server` → http://localhost:8000/grandgym/
