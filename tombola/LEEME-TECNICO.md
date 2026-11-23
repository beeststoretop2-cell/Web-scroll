# Web de Pizzería Tómbola · instrucciones para quien la publique y mantenga

## Qué es
Web estática de una sola página (HTML, CSS y JavaScript). No necesita base de datos, PHP ni Node: basta con servir los archivos tal cual.

## Archivos
- `index.html` · contenido y textos, horario visible, datos para Google (JSON-LD), enlaces de teléfono, Glovo e Instagram.
- `styles.css` · diseño.
- `main.js` · escena 3D (Three.js) y cámara que avanza con el scroll.
- `ui.js` · carta completa con precios (lista `const MENU`), filtros, pedido, tómbola, reloj de la masa y estado «Abierto ahora» (horario en `const NIGHT`, `LATE`, `LUNCH` y `const OPEN`).
- `img/` · fotos (las de la web actual) y logo.
- `fonts/` · tipografías, alojadas en local.
- `vendor/three/` · Three.js 0.160 en local. La web no carga nada de servicios externos.

## Requisitos del alojamiento
- Servir los archivos estáticos con HTTPS.
- Mantener la estructura de carpetas tal cual (las rutas son relativas).
- Tipos MIME correctos: `.js` como `text/javascript` y `.woff2` como `font/woff2`. Los navegadores rechazan los módulos JavaScript servidos con otro tipo.
- No funciona abriendo `index.html` con doble clic (`file://`), porque los módulos JavaScript necesitan un servidor. Para probarla en local: `python3 -m http.server` dentro de esta carpeta.
- Un creador de webs por plantillas normalmente no admite esta web. Hace falta un hosting que permita subir archivos (FTP o panel de archivos) o un servicio estático como Netlify, Cloudflare Pages o GitHub Pages.

## Antes de publicar (pendiente)
1. Sustituir el enlace genérico de Glovo (`https://glovoapp.com/es/es/burgos/`, aparece 2 veces en `index.html`) por el enlace directo de Tómbola.
2. Confirmar la cuenta de Instagram (`instagram.com/pizzeriatombolaburgos`).
3. Añadir aviso legal, política de privacidad y política de cookies, y enlazarlas en el pie. La web no instala cookies ni analítica; si se añade analítica, hará falta también un aviso de consentimiento.
4. Al cambiar el DNS del dominio, no tocar los registros MX (correo).

## Mantenimiento habitual
- Precio, nombre o ingredientes de una pizza: `ui.js`, lista `MENU`. Formato de cada línea: `['familia', número, 'Nombre', 'Ingredientes', precio]`. Familias: `clasicas`, `especiales`, `gourmet`, `sugerencias`, `dulces`.
- Horario: tres sitios: lista visible `#hoursList` en `index.html`, cálculo de «Abierto ahora» en `ui.js` y `openingHoursSpecification` en `index.html`.
- Teléfono: buscar `947` en `index.html` (enlaces `tel:` y textos).
- Fotos: sustituir en `img/` con el mismo nombre (JPG, unos 1.600 px de ancho y menos de 300 KB).

## Compatibilidad
Navegadores actuales en ordenador y móvil, con WebGL. Si un dispositivo no admite WebGL, la página se muestra con una foto de fondo en lugar del 3D y el resto funciona igual. Respeta la preferencia de «reducir movimiento» del sistema.
