# Pizzería Tómbola · rediseño 3D (`tombola/`)

Propuesta de rediseño de pizzeriatombolaburgos.com con su contenido real: textos del obrador, el sabor y el equipo, la carta completa (33 pizzas con precios), bebidas, dirección, teléfono, horario y Glovo. Las fotos son las de su web.

Ver en local: dentro de esta carpeta, `python3 -m http.server` → http://localhost:8000/

Archivos: `index.html` (contenido), `styles.css` (diseño), `main.js` (escenas 3D y cámara), `ui.js` (carta, pedido, tómbola, reloj de la masa, horario), `img/` (fotos de su web), `fonts/` y `vendor/three` (todo en local, sin depender de servicios externos).

**Recorrido 3D** (la cámara vuela entre escenas al hacer scroll): horno rojo con fuego y pizzas girando dentro → bolas de masa que crecen con el reloj de 48 h → ingredientes orbitando una porción → pizza en porciones con bolas de tómbola numeradas → galería del equipo → copa de vino, botella y caña → neón "Viva la pizza" y caja para llevar que se abre.

**Interacción para que la visita dure más:** reloj de fermentación (0–48 h) que hace crecer la masa en 3D, carta con filtros, "Gira la tómbola" (elige una pizza al azar), pedido con total que termina en llamada o Glovo, estado "abierto ahora" con el horario real.

**Breakthrough Advertising (Schwartz) aplicado al texto:**
- *Deseo de masas:* no se crea el antojo, se canaliza ("Esta noche, pizza").
- *Sofisticación del mercado:* todas las pizzerías dicen "artesana", así que la web enseña el *mecanismo*: 48 h de fermentación, pizza romana, horno de leña.
- *Gradualización:* el orden de las escenas construye la creencia paso a paso: masa → ingredientes → carta → equipo → pedido.
- *Intensificación:* el reloj de la masa y el horno hacen ver y casi oler el producto.
- *Identificación:* "Una es la tuya", la tómbola, los quesos de Burgos (Sasamón, Hinestrosa).

**Pendiente de confirmar con el dueño:** el enlace directo de Tómbola en Glovo y la cuenta de Instagram (marcados con `TODO` en `index.html`), y fotos nuevas en buena calidad (ahora solo hay 3 en su web).
