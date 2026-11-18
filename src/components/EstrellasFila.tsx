// Cinco estrellas amarillas (decorativas: el texto que las acompaña dice la calificación). Estilos .lp-estrellas-fila en globals.css.
export default function EstrellasFila({ tam = 18 }: { tam?: number }) {
  return (
    <span className="lp-estrellas-fila" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width={tam} height={tam}><path d="M12 2.5l2.94 6.26 6.86.8-5.07 4.7 1.34 6.78L12 17.6l-6.07 3.44 1.34-6.78-5.07-4.7 6.86-.8z" fill="currentColor" /></svg>
      ))}
    </span>
  );
}
