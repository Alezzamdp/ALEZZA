"use client";

// Si una página falla, el visitante ve esto en lugar de una pantalla rota. No se muestra el detalle del error.
export default function ErrorDePagina({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="lp lp-pantalla">
      <div className="lp-wrap lp-main" style={{ justifyItems: "start" }}>
        <section>
          <p className="lp-kicker">ALEZZA</p>
          <h1>Algo no cargó bien.</h1>
          <p className="lp-lead">Probá de nuevo. Si sigue igual, escribinos y lo resolvemos.</p>
          <div className="lp-acciones">
            <button type="button" onClick={reset} className="lp-btn">Reintentar</button>
            <a href="/contacto" className="lp-btn lp-btn-linea">Contacto</a>
          </div>
        </section>
      </div>
    </main>
  );
}
