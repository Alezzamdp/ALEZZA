import AntesDespues, { type TrabajoPublico } from "@/components/AntesDespues";
import Carrusel from "@/components/Carrusel";

// Trabajos marcados en el Taller para mostrar en la web: antes y después, con un divisor para comparar.
export default function Catalogo({ items }: { items: TrabajoPublico[] }) {
  if (!items.length) return null;
  return (
    <section className="lp-wrap lp-seccion">
      <p className="lp-kicker">Trabajos reales del taller</p>
      <h2>Antes y después</h2>
      {items.length === 1
        ? <AntesDespues {...items[0]} className="ad-solo" />
        : (
          <Carrusel etiqueta="Trabajos antes y después" ancho="min(86%, 440px)">
            {items.map((t) => <AntesDespues key={t.id} {...t} />)}
          </Carrusel>
        )}
    </section>
  );
}
