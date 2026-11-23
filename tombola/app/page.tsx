import Experience from "./Experience";

const PRIZES = [
  ["1.º", "Cesta gourmet de la comarca"],
  ["2.º", "Cena para dos personas"],
  ["3.º", "Lote de productos locales"],
  ["+20", "Premios directos al momento"],
];

const STEPS = [
  ["01", "Consigue tu papeleta", "2 € en cualquier puesto de la feria o aquí mismo."],
  ["02", "Guarda tu número", "Del 1 al 48. Cada número tiene su bola en el bombo."],
  ["03", "Sorteo en directo", "Giramos el bombo delante de todos. Sin trampa ni cartón."],
];

export default function Page() {
  return (
    <main className="page" id="top">
      <Experience />
      <div className="story">
        <section data-cue="hero" className="sec hero">
          <div className="copy left">
            <p className="eyebrow" data-reveal>
              <i /> Sorteo en directo · Edición 2026
            </p>
            <h1 data-reveal>
              Cada número,
              <em>a la vista.</em>
            </h1>
            <p className="lead" data-reveal>
              Un bombo de latón construido entero en código. Sin vídeos, sin trucos: mantén pulsado para
              girarlo y saca tu bola.
            </p>
            <div className="tags" data-reveal>
              <span className="tag hot">48 bolas</span>
              <span className="tag">Latón pulido</span>
              <span className="tag">En directo</span>
            </div>
          </div>
        </section>

        <section data-cue="close" className="sec tall">
          <div className="sticky">
            <div className="copy right">
              <p className="eyebrow" data-reveal>
                <i /> 01 · Sin trampa
              </p>
              <h2 data-reveal>
                48 bolas.
                <em>Ninguna escondida.</em>
              </h2>
              <p className="lead" data-reveal>
                A cámara lenta, cada bola rueda, choca y cae por pura física. Nada está grabado: lo que ves se
                calcula ahora mismo, en tu pantalla.
              </p>
            </div>
          </div>
        </section>

        <section data-cue="apart" className="sec taller">
          <div className="sticky bottom">
            <div className="copy center small">
              <p className="eyebrow" data-reveal>
                <i /> 02 · Pieza a pieza
              </p>
              <h2 data-reveal>
                Desmontado <em>ante tus ojos.</em>
              </h2>
              <p className="lead" data-reveal>
                Aros de latón, varillas, eje templado y una manivela pulida. Pulsa «Plano» para ver solo la
                geometría.
              </p>
            </div>
          </div>
        </section>

        <section data-cue="around" className="sec tall">
          <div className="sticky">
            <div className="copy right">
              <p className="eyebrow" data-reveal>
                <i /> 03 · Premios
              </p>
              <h2 data-reveal>
                Lo que puede
                <em>tocarte.</em>
              </h2>
              <ul className="list" data-reveal>
                {PRIZES.map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section data-cue="rebuild" className="sec tall">
          <div className="sticky">
            <div className="copy left">
              <p className="eyebrow" data-reveal>
                <i /> 04 · Cómo participar
              </p>
              <h2 data-reveal>
                Tres pasos.
                <em>Una bola.</em>
              </h2>
              <ol className="steps" data-reveal>
                {STEPS.map(([n, t, d]) => (
                  <li key={n}>
                    <span>{n}</span>
                    <div>
                      <b>{t}</b>
                      <p>{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section data-cue="outro" className="sec outro">
          <div className="copy center">
            <p className="eyebrow" data-reveal>
              <i /> Sábado 20 de diciembre · 19:00 · Plaza Mayor
            </p>
            <h2 className="big" data-reveal>
              Tu número
              <em>está dentro.</em>
            </h2>
            <a className="cta" href="#top" data-reveal>
              Comprar papeleta
            </a>
          </div>
          <footer className="foot">
            <span>La Gran Tómbola</span>
            <span>0 vídeos · 1 canvas · todo en código</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
