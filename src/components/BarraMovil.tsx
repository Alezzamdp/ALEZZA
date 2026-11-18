import Link from "next/link";
import { contacto } from "@/lib/contacto";

// Barra fija abajo, solo en celular: las dos acciones principales siempre a mano mientras se recorre la página.
// En pantallas anchas no se ve (estilos .lp-barra en globals.css). La página que la usa lleva la clase lp-con-barra.
export default function BarraMovil() {
  return (
    <div className="lp-barra" role="region" aria-label="Acciones rápidas">
      <Link href={contacto("agencia")} className="lp-btn">Soy agencia</Link>
      <Link href="/turnos" className="lp-btn lp-btn-linea">Solicitar turno</Link>
    </div>
  );
}
