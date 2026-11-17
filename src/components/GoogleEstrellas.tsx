import { externo } from "@/lib/contacto";
import { TALLER } from "@/lib/turnos";

// Solo las cinco estrellas de Google, para dar confianza: sin puntaje ni cantidad de reseñas.
// Enlaza a la ficha del taller en Google Maps, donde se ven las opiniones.
export default function GoogleEstrellas({ className = "" }: { className?: string }) {
  return (
    <a href={TALLER.maps} {...externo} className={`lp-estrellas ${className}`} aria-label="Clientes que nos calificaron con 5 estrellas en Google">
      <span className="lp-estrellas-fila" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} viewBox="0 0 24 24" width="18" height="18"><path d="M12 2.5l2.94 6.26 6.86.8-5.07 4.7 1.34 6.78L12 17.6l-6.07 3.44 1.34-6.78-5.07-4.7 6.86-.8z" fill="currentColor" /></svg>
        ))}
      </span>
      <span>Clientes de ALEZZA en Google</span>
    </a>
  );
}
