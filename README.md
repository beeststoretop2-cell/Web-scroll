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

Rediseño 3D con scroll de la web del Gimnasio Grandmontagne (Burgos), con el contenido real de grandmontagne.es: textos, tarifas, horario completo de adultos e infantil, centro de estética, Club de Judo, reseñas y contacto.

Ver en local: `python3 -m http.server` → http://localhost:8000/grandgym/

---

# Pizzería Tómbola · rediseño 3D (`tombola/`)

Propuesta de rediseño de pizzeriatombolaburgos.com con su contenido real: textos del obrador, el sabor y el equipo, la carta completa (33 pizzas con precios), bebidas, dirección, teléfono, horario y Glovo. Las fotos son las de su web.

Ver en local: `python3 -m http.server` → http://localhost:8000/tombola/

**Recorrido 3D** (la cámara vuela entre escenas al hacer scroll): horno rojo con fuego y pizzas girando dentro → bolas de masa que crecen con el reloj de 48 h → ingredientes orbitando una porción → pizza en porciones con bolas de tómbola numeradas → galería del equipo → copa de vino, botella y caña → neón "Viva la pizza" y caja para llevar que se abre.

**Interacción para que la visita dure más:** reloj de fermentación (0–48 h) que hace crecer la masa en 3D, carta con filtros, "Gira la tómbola" (elige una pizza al azar), pedido con total que termina en llamada o Glovo, estado "abierto ahora" con el horario real.

**Breakthrough Advertising (Schwartz) aplicado al texto:**
- *Deseo de masas:* no se crea el antojo, se canaliza ("Esta noche, pizza").
- *Sofisticación del mercado:* todas las pizzerías dicen "artesana", así que la web enseña el *mecanismo*: 48 h de fermentación, pizza romana, horno de leña.
- *Gradualización:* el orden de las escenas construye la creencia paso a paso: masa → ingredientes → carta → equipo → pedido.
- *Intensificación:* el reloj de la masa y el horno hacen ver y casi oler el producto.
- *Identificación:* "Una es la tuya", la tómbola, los quesos de Burgos (Sasamón, Hinestrosa).

**Pendiente de confirmar con el dueño:** el enlace directo de Tómbola en Glovo y la cuenta de Instagram (marcados con `TODO` en `index.html`), y fotos nuevas en buena calidad (ahora solo hay 3 en su web).
